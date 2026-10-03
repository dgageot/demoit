package livereload

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"syscall"
	"testing"
	"time"

	"github.com/rjeczalik/notify"
	"github.com/stretchr/testify/require"
)

type testEvent string

func (e testEvent) Path() string        { return string(e) }
func (e testEvent) Event() notify.Event { return notify.Write }
func (e testEvent) Sys() any            { return nil }

func writeFile(t *testing.T, root, path, content string) {
	t.Helper()
	name := filepath.Join(root, path)
	require.NoError(t, os.MkdirAll(filepath.Dir(name), 0o700))
	require.NoError(t, os.WriteFile(name, []byte(content), 0o600))
}

func replaceFile(t *testing.T, root, path, content string, modTime time.Time) {
	t.Helper()
	// Stage outside the watched root so a scan sees only complete replacements.
	replacement := filepath.Join(t.TempDir(), "replacement")
	require.NoError(t, os.WriteFile(replacement, []byte(content), 0o600))
	require.NoError(t, os.Chtimes(replacement, modTime, modTime))
	require.NoError(t, os.Rename(replacement, filepath.Join(root, path)))
}

func TestScanChanges(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "demoit.html", "one")
	writeFile(t, root, testStylePath, "css")
	writeFile(t, root, ".git/index", "ignored")
	writeFile(t, root, ".DS_Store", "ignored")
	before, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	require.Len(t, before, 2)

	// A same-length write with preserved timestamps must still be detected.
	writeFile(t, root, "demoit.html", "two")
	stamp := before["demoit.html"]
	require.NoError(t, os.Chtimes(filepath.Join(root, "demoit.html"), stamp.modTime, stamp.modTime))
	after, err := scanFiles(t.Context(), root, before, true)
	require.NoError(t, err)
	require.Equal(t, "demoit.html", changedFile(before, after))

	writeFile(t, root, testStylePath, "changed css")
	after, err = scanFiles(t.Context(), root, before, true)
	require.NoError(t, err)
	require.Equal(t, fullReloadPath, changedFile(before, after))

	require.NoError(t, os.Remove(filepath.Join(root, ".demoit", "style.css")))
	after, err = scanFiles(t.Context(), root, after, true)
	require.NoError(t, err)
	require.Equal(t, testStylePath, changedFile(map[string]fileStamp{
		"demoit.html": after["demoit.html"], testStylePath: {},
	}, after))
}

func TestScanUnreadableSubtree(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "locked/file", "hidden")
	writeFile(t, root, "demoit.html", "old")
	before, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	require.NoError(t, os.Chmod(filepath.Join(root, "locked"), 0))
	// Restore directory access so TempDir cleanup can remove its contents.
	t.Cleanup(func() {
		_ = os.Chmod(filepath.Join(root, "locked"), 0o700) //nolint:gosec // Directories require search permission.
	})
	if _, err := os.ReadDir(filepath.Join(root, "locked")); err == nil {
		t.Skip("user can read permission-restricted directories")
	}
	writeFile(t, root, "demoit.html", "new")
	after, err := scanFiles(t.Context(), root, before, true)
	require.Error(t, err)
	require.Equal(t, before["locked/file"], after["locked/file"])
	require.Equal(t, "demoit.html", changedFile(before, after))
}

func testWatcher(t *testing.T, setup ...func(string)) (string, *conn, chan notify.EventInfo) {
	t.Helper()
	root, err := filepath.EvalSymlinks(t.TempDir())
	require.NoError(t, err)
	writeFile(t, root, "demoit.html", "slides")
	for _, prepare := range setup {
		prepare(root)
	}
	snapshot, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	s := New(8888)
	c := s.newConn(nil)
	events := make(chan notify.EventInfo, watchBuffer)
	ctx, cancel := context.WithCancel(t.Context())
	finished := make(chan struct{})
	go func() {
		s.watch(ctx, root, events, snapshot)
		close(finished)
	}()
	t.Cleanup(func() {
		cancel()
		waitFinished(t, finished)
	})
	return root, c, events
}

func takeReload(t *testing.T, c *conn) string {
	t.Helper()
	select {
	case <-c.reloadChan:
	case <-time.After(2*pollInterval + time.Second):
		t.Fatal("watcher did not reload")
	}
	c.pendingMu.Lock()
	defer c.pendingMu.Unlock()
	file := c.pending
	c.pending = ""
	return file
}

func TestWatcherCoalescesEvents(t *testing.T) {
	root, c, events := testWatcher(t)
	writeFile(t, root, testStylePath, "css")
	for range 100 {
		events <- testEvent(filepath.Join(root, ".demoit", "style.css"))
	}
	require.Equal(t, testStylePath, takeReload(t, c))
	writeFile(t, root, testStylePath, "updated css")
	writeFile(t, root, "demoit.html", "updated slides")
	writeFile(t, root, ".demoit/js/demoit.js", "updated js")
	for _, path := range []string{testStylePath, "demoit.html", ".demoit/js/demoit.js"} {
		events <- testEvent(filepath.Join(root, path))
	}
	require.Equal(t, fullReloadPath, takeReload(t, c))
}

func TestWatcherReconcilesWithoutEvents(t *testing.T) {
	root, c, _ := testWatcher(t)
	info, err := os.Stat(filepath.Join(root, "demoit.html"))
	require.NoError(t, err)
	replaceFile(t, root, "demoit.html", "SLIDES", info.ModTime())
	require.Equal(t, "demoit.html", takeReload(t, c))
	writeFile(t, root, testStylePath, "new asset")
	require.Equal(t, testStylePath, takeReload(t, c))
	require.NoError(t, os.Remove(filepath.Join(root, ".demoit", "style.css")))
	require.Equal(t, testStylePath, takeReload(t, c))
}

func TestWatcherIgnoresGit(t *testing.T) {
	root, c, events := testWatcher(t)
	writeFile(t, root, ".git/index", "git activity")
	events <- testEvent(filepath.Join(root, ".git", "index"))
	select {
	case <-c.reloadChan:
		t.Fatal("git activity triggered reload")
	case <-time.After(pollInterval + watchDelay):
	}
}

func TestWatcherIgnoresGitIgnoredFiles(t *testing.T) {
	root, c, events := testWatcher(t, func(root string) {
		initGitRepository(t, root)
		writeFile(t, root, ".gitignore", "*.log\nbuild/\n")
		writeFile(t, root, testIgnoredLog, "old output")
		writeFile(t, root, "build/output", "old output")
	})
	writeFile(t, root, testIgnoredLog, "changed output")
	writeFile(t, root, "build/output", "changed output")
	writeFile(t, root, "created.log", "new output")
	writeFile(t, root, "build/new", "new output")
	require.NoError(t, os.Remove(filepath.Join(root, testIgnoredLog)))
	for _, path := range []string{testIgnoredLog, "created.log", "build/output", "build/new"} {
		events <- testEvent(filepath.Join(root, path))
	}
	select {
	case <-c.reloadChan:
		t.Fatal("Git-ignored files triggered reload")
	case <-time.After(pollInterval + 2*watchDelay):
	}
	// Ignored events must not turn a single asset reload into a full refresh.
	writeFile(t, root, testStylePath, "css")
	events <- testEvent(filepath.Join(root, "created.log"))
	events <- testEvent(filepath.Join(root, ".demoit", "style.css"))
	require.Equal(t, testStylePath, takeReload(t, c))
}

func TestWatcherIgnoresRemovedDirectory(t *testing.T) {
	root, c, events := testWatcher(t, func(root string) {
		initGitRepository(t, root)
		writeFile(t, root, ".gitignore", "build/\n")
		writeFile(t, root, "build/output", "ignored")
	})
	// Use real notifications to preserve the platform's directory identity.
	root, err := filepath.EvalSymlinks(root)
	require.NoError(t, err)
	require.NoError(t, notify.Watch(filepath.Join(root, "..."), events, notify.All))
	require.NoError(t, os.RemoveAll(filepath.Join(root, "build")))
	select {
	case <-c.reloadChan:
		t.Fatal("removed Git-ignored directory triggered reload")
	case <-time.After(2*pollInterval + watchDelay):
	}
}

func TestWatcherReloadsTrackedIgnoredFile(t *testing.T) {
	root, c, events := testWatcher(t, func(root string) {
		initGitRepository(t, root)
		writeFile(t, root, ".gitignore", "*.log\n")
		writeFile(t, root, "tracked.log", "content")
		gitCommand(t, root, "add", "-f", "tracked.log")
	})
	writeFile(t, root, "tracked.log", "updated content")
	events <- testEvent(filepath.Join(root, "tracked.log"))
	require.Equal(t, "tracked.log", takeReload(t, c))
}

func TestWatch(t *testing.T) {
	s, url, connections, finished := testServer(t)
	ws := dialClient(t, url)
	<-connections
	sendHello(t, ws)
	root := t.TempDir()
	writeFile(t, root, "demoit.html", "slides")
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	require.NoError(t, s.Watch(ctx, root))
	writeFile(t, root, "demoit.html", "new slides")
	readReload(t, ws, fullReloadPath)
	require.NoError(t, ws.Close())
	waitFinished(t, finished)
	require.Error(t, s.Watch(t.Context(), filepath.Join(root, "missing")))
}

func TestMergeReload(t *testing.T) {
	require.Equal(t, "style.css", mergeReload("", "style.css"))
	require.Equal(t, "style.css", mergeReload("style.css", "style.css"))
	require.Equal(t, fullReloadPath, mergeReload("style.css", "js/demoit.js"))
	require.Equal(t, fullReloadPath, mergeReload(fullReloadPath, "style.css"))
}

func TestStampRejectsReplacementWithFIFO(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "file", "content")
	entries, err := os.ReadDir(root)
	require.NoError(t, err)
	// Cache the original regular-file metadata, then substitute a FIFO.
	info, err := entries[0].Info()
	require.NoError(t, err)
	entry := fixedInfoEntry{DirEntry: entries[0], info: info}
	path := filepath.Join(root, "file")
	require.NoError(t, os.Remove(path))
	require.NoError(t, syscall.Mkfifo(path, 0o600))
	done := make(chan error, 1)
	go func() { _, err := stampFile(t.Context(), path, entry, true); done <- err }()
	select {
	case err := <-done:
		require.Error(t, err)
	case <-time.After(time.Second):
		t.Fatal("replacement FIFO blocked scan")
	}
}

type fixedInfoEntry struct {
	fs.DirEntry
	info fs.FileInfo
}

func (e fixedInfoEntry) Info() (fs.FileInfo, error) { return e.info, nil }

func TestCancelledScan(t *testing.T) {
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	_, err := scanFiles(ctx, t.TempDir(), nil, true)
	require.ErrorIs(t, err, context.Canceled)
}

func TestContinuousEventsHaveBoundedDelivery(t *testing.T) {
	root, c, events := testWatcher(t)
	writeFile(t, root, "style.css", "css")
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		ticker := time.NewTicker(5 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				events <- testEvent(filepath.Join(root, "style.css"))
			}
		}
	}()
	require.Equal(t, "style.css", takeReload(t, c))
	cancel()
	<-stopped
}

func TestEventAndScanShareDebounce(t *testing.T) {
	root, c, events := testWatcher(t)
	// Save after the initial scan so reconciliation happens in a later window.
	time.Sleep(2 * watchDelay)
	writeFile(t, root, fullReloadPath, "updated")
	events <- testEvent(filepath.Join(root, fullReloadPath))
	require.Equal(t, fullReloadPath, takeReload(t, c))
	select {
	case <-c.reloadChan:
		t.Fatal("event and later scan reloaded the same save twice")
	case <-time.After(2*pollInterval + watchDelay):
	}
}

func TestDelayedEventDoesNotRepeatScanReload(t *testing.T) {
	root, c, events := testWatcher(t)
	writeFile(t, root, fullReloadPath, "updated")
	require.Equal(t, fullReloadPath, takeReload(t, c))
	events <- testEvent(filepath.Join(root, ".demoit.html.tmp-123"))
	events <- testEvent(filepath.Join(root, fullReloadPath))
	select {
	case <-c.reloadChan:
		t.Fatal("delayed event repeated the scan reload")
	case <-time.After(2 * watchDelay):
	}
}

func TestWatchDoesNotReloadUnchangedFiles(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, fullReloadPath, "slides")
	s := New(8888)
	c := s.newConn(nil)
	require.NoError(t, s.Watch(t.Context(), root))
	select {
	case <-c.reloadChan:
		t.Fatal("initial content scan reloaded unchanged files")
	case <-time.After(pollInterval + 2*watchDelay):
	}
}

func TestReconciliationDoesNotSuppressLaterEdit(t *testing.T) {
	root, c, events := testWatcher(t)
	// Wait until the initial background scan is finished.
	time.Sleep(2 * watchDelay)
	writeFile(t, root, fullReloadPath, "edit B")
	events <- testEvent(filepath.Join(root, fullReloadPath))
	require.Equal(t, fullReloadPath, takeReload(t, c))
	info, err := os.Stat(filepath.Join(root, fullReloadPath))
	require.NoError(t, err)
	// A later edit to the same path has no delivered event and preserves metadata.
	replaceFile(t, root, fullReloadPath, "edit C", info.ModTime())
	require.Equal(t, fullReloadPath, takeReload(t, c))
}

func TestIgnoreRuleSaveDoesNotReloadTwice(t *testing.T) {
	root, c, events := testWatcher(t, func(root string) {
		initGitRepository(t, root)
		writeFile(t, root, ".gitignore", "")
		writeFile(t, root, "debug.log", "output")
	})
	for _, rules := range []string{"*.log\n", ""} {
		writeFile(t, root, ".gitignore", rules)
		events <- testEvent(filepath.Join(root, ".gitignore"))
		require.Equal(t, fullReloadPath, takeReload(t, c))
		select {
		case <-c.reloadChan:
			t.Fatal("ignore rule save reloaded again during reconciliation")
		case <-time.After(pollInterval + 2*watchDelay):
		}
	}
}

func TestMergeScanRetainsNewerEventRevisions(t *testing.T) {
	const (
		edited  = "edit"
		created = "create"
		polled  = "poll"
	)
	a := fileStamp{size: 1}
	b := fileStamp{size: 2}
	c := fileStamp{size: 3}
	before := map[string]fileStamp{edited: a, "delete": a, polled: a}
	current := map[string]fileStamp{edited: b, created: b, polled: a}
	after := map[string]fileStamp{edited: c, "delete": c, created: c, polled: c, "new": c}
	merged := mergeScan(current, before, after, nil)
	require.Equal(t, map[string]fileStamp{edited: b, created: b, polled: c, "new": c}, merged)
	// Neither input may be modified: the background scan still owns its baseline.
	require.Equal(t, a, before[edited])
	require.Equal(t, a, current[polled])
	// A temporary file created and deleted during the scan must stay absent,
	// even though its current state matches the scan's original baseline.
	delete(current, created)
	delete(before, created)
	merged = mergeScan(current, before, after, map[string]bool{created: true})
	require.NotContains(t, merged, created)
}

func TestEventObserverDoesNotWaitForPeriodicScan(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, fullReloadPath, "slides")
	before, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	// Stall periodic Git enumeration while event-specific Git checks remain fast.
	bin := t.TempDir()
	marker := filepath.Join(t.TempDir(), "scanning")
	writeFile(t, bin, "git", "#!/bin/sh\ncase \"$*\" in\n  *ls-files*) touch \"$DEMOIT_SCAN_MARKER\"; sleep 3;;\nesac\nexit 1\n")
	require.NoError(t, os.Chmod(filepath.Join(bin, "git"), 0o700)) //nolint:gosec // Test executable.
	t.Setenv("PATH", bin+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("DEMOIT_SCAN_MARKER", marker)
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	requests := make(chan []string)
	results := make(chan observedChange)
	finished := make(chan struct{})
	go func() {
		defer close(finished)
		reconcileFiles(ctx, root, before, requests, results)
	}()
	t.Cleanup(func() {
		cancel()
		waitFinished(t, finished)
	})
	require.Eventually(t, func() bool {
		_, err := os.Stat(marker)
		return err == nil
	}, time.Second, 10*time.Millisecond)
	writeFile(t, root, fullReloadPath, "updated")
	requests <- []string{fullReloadPath}
	select {
	case change := <-results:
		require.Equal(t, observedChange{file: fullReloadPath, event: true}, change)
	case <-time.After(time.Second):
		t.Fatal("event observation waited for the periodic scan")
	}
}
