package livereload

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
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
	snapshot, err := scanFiles(ctx, root, nil, true)
	if err != nil {
		log.Printf("Live reload scan: %v", err)
	}
	go s.watch(ctx, root, events, snapshot)
	return nil
}

type observedChange struct {
	file  string
	event bool
}

func (s *Server) watch(ctx context.Context, root string, events chan notify.EventInfo, snapshot map[string]fileStamp) {
	ctx, cancel := context.WithCancel(ctx)
	requests := make(chan []string, 1)
	results := make(chan observedChange)
	workerDone := make(chan struct{})
	go func() {
		defer close(workerDone)
		reconcileFiles(ctx, root, snapshot, requests, results)
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
	eventPaths := make(map[string]bool)
	observing := false

	flush := func() {
		if len(eventPaths) != 0 && !observing {
			paths := make([]string, 0, len(eventPaths))
			for path := range eventPaths {
				paths = append(paths, path)
			}
			clear(eventPaths)
			observing = true
			requests <- paths
		}
		if observing || eventFile == "" {
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
			if eventIsDir(event) {
				rel += "/"
			}
			eventPaths[rel] = true
			// Bound the delay even under a continuous stream of events.
			if pending == nil {
				debounce.Reset(watchDelay)
				pending = debounce.C
			}
		case <-pending:
			pending = nil
			flush()
		case change := <-results:
			if change.file != "" {
				eventFile = mergeReload(eventFile, change.file)
			}
			if change.event {
				observing = false
				if eventFile != "" {
					s.Reload(eventFile)
					eventFile = ""
				}
			}
			if pending == nil && (eventFile != "" || len(eventPaths) != 0) {
				debounce.Reset(watchDelay)
				pending = debounce.C
			}
		}
	}
}

type scannedFiles struct {
	before map[string]fileStamp
	after  map[string]fileStamp
	err    error
}

// Events and scans acknowledge revisions in one worker; full scans run separately.
func reconcileFiles(ctx context.Context, root string, snapshot map[string]fileStamp, requests <-chan []string, results chan<- observedChange) {
	timer := time.NewTimer(0)
	defer timer.Stop()
	scanned := make(chan scannedFiles)
	var scans sync.WaitGroup
	defer scans.Wait()
	var changedDuringScan map[string]bool
	for {
		var current map[string]fileStamp
		var event bool
		var err error
		select {
		case <-ctx.Done():
			return
		case paths := <-requests:
			event = true
			ignored := ignoredEvents(ctx, root, paths)
			paths = slices.DeleteFunc(paths, func(path string) bool { return ignored[path] })
			current, err = scanEventFiles(ctx, root, snapshot, paths)
		case <-timer.C:
			before := snapshot
			changedDuringScan = make(map[string]bool)
			scans.Go(func() {
				after, err := scanFiles(ctx, root, before, true)
				select {
				case scanned <- scannedFiles{before: before, after: after, err: err}:
				case <-ctx.Done():
				}
			})
			continue
		case scan := <-scanned:
			current = mergeScan(snapshot, scan.before, scan.after, changedDuringScan)
			changedDuringScan = nil
			err = scan.err
			timer.Reset(pollInterval)
		}
		if ctx.Err() != nil {
			return
		}
		if err != nil {
			log.Printf("Live reload scan: %v", err)
		}
		file := changedFile(snapshot, current)
		if event && changedDuringScan != nil {
			for _, path := range changedFiles(snapshot, current) {
				changedDuringScan[path] = true
			}
		}
		snapshot = current
		select {
		case <-ctx.Done():
			return
		case results <- observedChange{file: file, event: event}:
		}
	}
}

// Do not let an in-flight scan overwrite revisions acknowledged by newer events.
func mergeScan(current, before, after map[string]fileStamp, changedDuringScan map[string]bool) map[string]fileStamp {
	merged := maps.Clone(current)
	for _, path := range changedFiles(before, after) {
		if changedDuringScan[path] {
			continue
		}
		stamp, exists := current[path]
		previous, existed := before[path]
		if exists != existed || stamp != previous {
			continue
		}
		if stamp, exists := after[path]; exists {
			merged[path] = stamp
		} else {
			delete(merged, path)
		}
	}
	return merged
}

func scanEventFiles(ctx context.Context, root string, previous map[string]fileStamp, paths []string) (map[string]fileStamp, error) {
	current := maps.Clone(previous)
	var scanErr error
	for _, path := range paths {
		if filepath.Base(path) == ".gitignore" {
			return scanFiles(ctx, root, previous, true)
		}
		name := filepath.Join(root, filepath.FromSlash(path))
		info, err := os.Lstat(name)
		if strings.HasSuffix(path, "/") || (err == nil && info.IsDir()) {
			return scanFiles(ctx, root, previous, true)
		}
		if errors.Is(err, os.ErrNotExist) {
			delete(current, path)
			continue
		}
		if err != nil {
			scanErr = errors.Join(scanErr, err)
			continue
		}
		stamp, err := stampFile(ctx, name, fs.FileInfoToDirEntry(info), true)
		if err != nil {
			scanErr = errors.Join(scanErr, err)
			continue
		}
		current[path] = stamp
	}
	return current, scanErr
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
	ignored := gitIgnoredPaths(ctx, root, nil)
	if ignored == nil {
		ignored = make(map[string]bool)
	}
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
		rel = filepath.ToSlash(rel)
		if ignoredPath(rel) || ignored[rel] || ignored[rel+"/"] {
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
			if rel != "." {
				if _, err := os.Lstat(filepath.Join(path, ".git")); err == nil {
					for file := range gitIgnoredPaths(ctx, path, nil) {
						ignored[rel+"/"+file] = true
					}
				}
			}
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
	for _, file := range changedFiles(before, after) {
		changed = mergeReload(changed, file)
	}
	return changed
}

func changedFiles(before, after map[string]fileStamp) []string {
	var changed []string
	for file, stamp := range after {
		if previous, exists := before[file]; !exists || previous != stamp {
			changed = append(changed, file)
		}
	}
	for file := range before {
		if _, exists := after[file]; !exists {
			changed = append(changed, file)
		}
	}
	return changed
}
