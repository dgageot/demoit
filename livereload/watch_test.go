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
	// Delivered events must not depend on a metadata change being visible.
	for range 100 {
		events <- testEvent(filepath.Join(root, ".demoit", "style.css"))
	}
	require.Equal(t, testStylePath, takeReload(t, c))
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
	writeFile(t, root, "demoit.html", "updated")
	events <- testEvent(filepath.Join(root, "demoit.html"))
	require.Equal(t, "demoit.html", takeReload(t, c))
	select {
	case <-c.reloadChan:
		t.Fatal("overlapping event and scan were not coalesced")
	case <-time.After(2 * watchDelay):
	}
}

func TestReconciliationDoesNotSuppressLaterEdit(t *testing.T) {
	root, c, events := testWatcher(t)
	// Wait until the initial background scan is finished.
	time.Sleep(2 * watchDelay)
	info, err := os.Stat(filepath.Join(root, "demoit.html"))
	require.NoError(t, err)
	writeFile(t, root, "demoit.html", "edit B")
	events <- testEvent(filepath.Join(root, "demoit.html"))
	require.Equal(t, "demoit.html", takeReload(t, c))
	// A later edit to the same path has no delivered event and preserves metadata.
	replaceFile(t, root, "demoit.html", "edit C", info.ModTime())
	require.Equal(t, "demoit.html", takeReload(t, c))
}
