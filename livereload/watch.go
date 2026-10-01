package livereload

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/rjeczalik/notify"
)

const (
	watchBuffer  = 1024
	watchDelay   = 100 * time.Millisecond
	pollInterval = 2 * time.Second
)

type fileStamp struct {
	size    int64
	modTime time.Time
	mode    fs.FileMode
	digest  [sha256.Size]byte
	hashed  bool
}

// Watch coalesces saves and periodically scans for changes missed by the watcher.
func (s *Server) Watch(ctx context.Context, root string) error {
	root, err := filepath.Abs(root)
	if err != nil {
		return fmt.Errorf("resolve watch root: %w", err)
	}
	root, err = filepath.EvalSymlinks(root)
	if err != nil {
		return fmt.Errorf("resolve watch symlinks: %w", err)
	}
	events := make(chan notify.EventInfo, watchBuffer)
	if err := notify.Watch(filepath.Join(root, "..."), events, notify.All); err != nil {
		return fmt.Errorf("watch presentation: %w", err)
	}
	snapshot, err := scanFiles(ctx, root, nil, false)
	if err != nil {
		log.Printf("Live reload scan: %v", err)
	}
	go s.watch(ctx, root, events, snapshot)
	return nil
}

func (s *Server) watch(ctx context.Context, root string, events chan notify.EventInfo, snapshot map[string]fileStamp) {
	ctx, cancel := context.WithCancel(ctx)
	results := make(chan map[string]fileStamp)
	workerDone := make(chan struct{})
	go func() {
		defer close(workerDone)
		reconcileFiles(ctx, root, snapshot, results)
	}()
	defer func() {
		cancel()
		notify.Stop(events)
		<-workerDone
	}()
	debounce := time.NewTimer(watchDelay)
	debounce.Stop()
	defer debounce.Stop()
	var pending <-chan time.Time
	var eventFile string

	flush := func() {
		if eventFile == "" {
			return
		}
		s.Reload(eventFile)
		eventFile = ""
	}
	for {
		select {
		case <-ctx.Done():
			return
		case event := <-events:
			rel, err := filepath.Rel(root, event.Path())
			if err != nil || ignoredPath(rel) {
				continue
			}
			rel = filepath.ToSlash(rel)
			eventFile = mergeReload(eventFile, rel)
			// Bound the delay even under a continuous stream of events.
			if pending == nil {
				debounce.Reset(watchDelay)
				pending = debounce.C
			}
		case <-pending:
			pending = nil
			flush()
		case current := <-results:
			// Share the debounce window, but never suppress later edits to a path.
			if file := changedFile(snapshot, current); file != "" {
				eventFile = mergeReload(eventFile, file)
				if pending == nil {
					debounce.Reset(watchDelay)
					pending = debounce.C
				}
			}
			snapshot = current
		}
	}
}

// Hashing runs independently of event delivery, with a pause between scans.
func reconcileFiles(ctx context.Context, root string, snapshot map[string]fileStamp, results chan<- map[string]fileStamp) {
	timer := time.NewTimer(0)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
		}
		current, err := scanFiles(ctx, root, snapshot, true)
		if ctx.Err() != nil {
			return
		}
		if err != nil {
			log.Printf("Live reload scan: %v", err)
		}
		select {
		case <-ctx.Done():
			return
		case results <- current:
		}
		snapshot = current
		timer.Reset(pollInterval)
	}
}

func ignoredPath(path string) bool {
	for part := range strings.SplitSeq(filepath.ToSlash(path), "/") {
		if part == ".git" || part == ".DS_Store" {
			return true
		}
	}
	return false
}

// Failed paths retain their old stamps so unrelated changes can still reload.
func scanFiles(ctx context.Context, root string, previous map[string]fileStamp, hashContent bool) (map[string]fileStamp, error) {
	files := make(map[string]fileStamp)
	var scanErr error
	retain := func(rel string, err error) {
		scanErr = errors.Join(scanErr, err)
		rel = filepath.ToSlash(rel)
		for file, stamp := range previous {
			if rel == "." || file == rel || strings.HasPrefix(file, rel+"/") {
				files[file] = stamp
			}
		}
	}
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		if ignoredPath(rel) {
			if entry != nil && entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if walkErr != nil {
			if !errors.Is(walkErr, os.ErrNotExist) {
				retain(rel, walkErr)
			}
			return nil
		}
		if entry.IsDir() {
			return nil
		}
		stamp, err := stampFile(ctx, path, entry, hashContent)
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				retain(rel, err)
			}
			return nil
		}
		files[filepath.ToSlash(rel)] = stamp
		return nil
	})
	return files, errors.Join(scanErr, err)
}

func stampFile(ctx context.Context, path string, entry fs.DirEntry, hashContent bool) (fileStamp, error) {
	info, err := entry.Info()
	if err != nil {
		return fileStamp{}, err
	}
	stamp := fileStamp{size: info.Size(), modTime: info.ModTime(), mode: info.Mode()}
	if !hashContent || !info.Mode().IsRegular() {
		return stamp, nil
	}
	// Content catches overflowed events even if a tool preserves size and mtime.
	// Nonblocking open prevents a concurrently substituted FIFO from hanging.
	file, err := os.OpenFile(path, os.O_RDONLY|syscall.O_NONBLOCK|syscall.O_NOFOLLOW, 0)
	if err != nil {
		return fileStamp{}, err
	}
	defer file.Close()
	stop := context.AfterFunc(ctx, func() { _ = file.Close() })
	defer stop()
	info, err = file.Stat()
	if err != nil {
		return fileStamp{}, err
	}
	if !info.Mode().IsRegular() {
		return fileStamp{}, fmt.Errorf("not a regular file: %s", path)
	}
	stamp = fileStamp{size: info.Size(), modTime: info.ModTime(), mode: info.Mode(), hashed: true}
	hash := sha256.New()
	if _, err := io.Copy(hash, io.NewSectionReader(file, 0, info.Size())); err != nil {
		return fileStamp{}, err
	}
	copy(stamp.digest[:], hash.Sum(nil))
	return stamp, nil
}

func changedFile(before, after map[string]fileStamp) string {
	var changed string
	for file, stamp := range after {
		// The first content scan also reconciles edits since the metadata baseline.
		if previous, exists := before[file]; !exists || previous != stamp {
			changed = mergeReload(changed, file)
		}
	}
	for file := range before {
		if _, exists := after[file]; !exists {
			changed = mergeReload(changed, file)
		}
	}
	return changed
}
