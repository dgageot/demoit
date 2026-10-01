package livereload

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

const (
	testIgnoredLog = "debug.log"
	testStylePath  = ".demoit/style.css"
)

func gitCommand(t *testing.T, root string, args ...string) {
	t.Helper()
	cmd := exec.CommandContext(t.Context(), "git", args...)
	cmd.Dir = root
	output, err := cmd.CombinedOutput()
	require.NoError(t, err, "%s", output)
}

func initGitRepository(t *testing.T, root string) {
	t.Helper()
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("Git is not installed")
	}
	t.Setenv("GIT_CONFIG_NOSYSTEM", "1")
	t.Setenv("GIT_CONFIG_GLOBAL", filepath.Join(t.TempDir(), "config"))
	gitCommand(t, root, "init", "-q")
}

func TestGitIgnoreRules(t *testing.T) {
	root := t.TempDir()
	initGitRepository(t, root)
	writeFile(t, root, ".gitignore", "*.log\nbuild/\ncache/*\n!cache/keep.txt\n/root-only.txt\n")
	writeFile(t, root, "nested/.gitignore", "local.txt\n!important.log\n")
	writeFile(t, root, ".git/info/exclude", "private.txt\n")
	global := filepath.Join(t.TempDir(), "global-ignore")
	require.NoError(t, os.WriteFile(global, []byte("global.txt\n"), 0o600))
	gitCommand(t, root, "config", "core.excludesFile", global)

	paths := map[string]bool{
		fullReloadPath:         false,
		testStylePath:          false,
		testIgnoredLog:         true,
		"space and\nline.log":  true,
		"build/output.txt":     true,
		"cache/drop.txt":       true,
		"cache/keep.txt":       false,
		"root-only.txt":        true,
		"nested/root-only.txt": false,
		"nested/local.txt":     true,
		"nested/debug.log":     true,
		"nested/important.log": false,
		"private.txt":          true,
		"global.txt":           true,
		"tracked.log":          false,
		"build/tracked.txt":    false,
	}
	var names []string
	for path := range paths {
		writeFile(t, root, path, "content")
		names = append(names, path)
	}
	gitCommand(t, root, "add", "-f", "tracked.log", "build/tracked.txt")

	ignored := gitIgnoredPaths(t.Context(), root, names)
	for path, want := range paths {
		require.Equal(t, want, ignored[path], "event path %q", path)
	}
	for _, hashContent := range []bool{false, true} {
		snapshot, err := scanFiles(t.Context(), root, nil, hashContent)
		require.NoError(t, err)
		for path, want := range paths {
			_, exists := snapshot[path]
			require.Equal(t, !want, exists, "scan path %q", path)
		}
	}

	// Deleted ignored files must still be filtered when their events arrive.
	require.NoError(t, os.Remove(filepath.Join(root, testIgnoredLog)))
	ignored = gitIgnoredPaths(t.Context(), root, []string{testIgnoredLog, "missing.txt"})
	require.True(t, ignored[testIgnoredLog])
	require.False(t, ignored["missing.txt"])
}

func TestScanPrunesIgnoredDirectories(t *testing.T) {
	root := t.TempDir()
	initGitRepository(t, root)
	writeFile(t, root, ".gitignore", "build/\n")
	writeFile(t, root, "build/large/output", "ignored")
	writeFile(t, root, fullReloadPath, "slides")
	ignored := gitIgnoredPaths(t.Context(), root, nil)
	require.True(t, ignored["build/"])
	before, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	require.Len(t, before, 2)

	writeFile(t, root, "build/large/output", "changed")
	writeFile(t, root, "build/new", "created")
	require.NoError(t, os.Remove(filepath.Join(root, "build", "large", "output")))
	after, err := scanFiles(t.Context(), root, before, true)
	require.NoError(t, err)
	require.Empty(t, changedFile(before, after))
}

func TestGitIgnoreFromSubdirectory(t *testing.T) {
	root := t.TempDir()
	initGitRepository(t, root)
	writeFile(t, root, ".gitignore", "*.log\nsub/build/\n")
	writeFile(t, root, "sub/demoit.html", "slides")
	writeFile(t, root, "sub/debug.log", "ignored")
	writeFile(t, root, "sub/build/output", "ignored")
	root = filepath.Join(root, "sub")
	ignored := gitIgnoredPaths(t.Context(), root, []string{testIgnoredLog, "build/output", fullReloadPath})
	require.True(t, ignored[testIgnoredLog])
	require.True(t, ignored["build/output"])
	require.False(t, ignored[fullReloadPath])
	snapshot, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	require.Len(t, snapshot, 1)
	require.Contains(t, snapshot, fullReloadPath)
}

func TestGitIgnoreUpdates(t *testing.T) {
	root := t.TempDir()
	initGitRepository(t, root)
	writeFile(t, root, ".gitignore", "*.log\n")
	writeFile(t, root, testIgnoredLog, "content")
	require.True(t, gitIgnoredPaths(t.Context(), root, []string{testIgnoredLog})[testIgnoredLog])

	writeFile(t, root, ".gitignore", "*.log\n!debug.log\n")
	require.Empty(t, gitIgnoredPaths(t.Context(), root, []string{testIgnoredLog}))
	snapshot, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	require.Contains(t, snapshot, testIgnoredLog)

	writeFile(t, root, ".gitignore", "*.log\n")
	gitCommand(t, root, "add", "-f", testIgnoredLog)
	require.Empty(t, gitIgnoredPaths(t.Context(), root, []string{testIgnoredLog}))
	snapshot, err = scanFiles(t.Context(), root, snapshot, true)
	require.NoError(t, err)
	require.Contains(t, snapshot, testIgnoredLog)
}

func TestGitIgnoreFallback(t *testing.T) {
	for _, test := range []string{"no repository", "no Git"} {
		t.Run(test, func(t *testing.T) {
			root := t.TempDir()
			if test == "no Git" {
				initGitRepository(t, root)
				t.Setenv("PATH", t.TempDir())
			}
			writeFile(t, root, ".gitignore", "*.log\n")
			writeFile(t, root, testIgnoredLog, "content")
			require.Empty(t, gitIgnoredPaths(t.Context(), root, []string{testIgnoredLog}))
			snapshot, err := scanFiles(t.Context(), root, nil, true)
			require.NoError(t, err)
			require.Contains(t, snapshot, testIgnoredLog)
		})
	}
}

func TestGitIgnoreNestedRepositories(t *testing.T) {
	for _, submodule := range []bool{false, true} {
		t.Run(fmt.Sprintf("submodule=%t", submodule), func(t *testing.T) {
			root := t.TempDir()
			initGitRepository(t, root)
			writeFile(t, root, ".gitignore", "*.tmp\n")
			writeFile(t, root, "output.tmp", "ignored")
			writeFile(t, root, "nested/.gitignore", "*.log\n")
			nested := filepath.Join(root, "nested")
			gitCommand(t, nested, "init", "-q")
			writeFile(t, root, "nested/debug.log", "ignored")
			writeFile(t, root, "nested/tracked.log", "tracked")
			gitCommand(t, nested, "add", "-f", "tracked.log")
			if submodule {
				gitCommand(t, nested, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "test")
				cmd := exec.CommandContext(t.Context(), "git", "rev-parse", "HEAD")
				cmd.Dir = nested
				commit, err := cmd.Output()
				require.NoError(t, err)
				gitCommand(t, root, "update-index", "--add", "--cacheinfo", "160000,"+strings.TrimSpace(string(commit))+",nested")
			}
			ignored := ignoredEvents(t.Context(), root, []string{"output.tmp", "nested/debug.log", "nested/tracked.log"})
			require.True(t, ignored["output.tmp"])
			require.True(t, ignored["nested/debug.log"])
			require.False(t, ignored["nested/tracked.log"])
			before, err := scanFiles(t.Context(), root, nil, true)
			require.NoError(t, err)
			require.NotContains(t, before, "nested/debug.log")
			require.Contains(t, before, "nested/tracked.log")
			writeFile(t, root, "nested/debug.log", "changed ignored file")
			after, err := scanFiles(t.Context(), root, before, true)
			require.NoError(t, err)
			require.Empty(t, changedFile(before, after))
		})
	}
}

func TestGitIgnoreDoesNotRunFSMonitor(t *testing.T) {
	root := t.TempDir()
	initGitRepository(t, root)
	writeFile(t, root, ".gitignore", "*.log\n")
	writeFile(t, root, testIgnoredLog, "ignored")
	writeFile(t, root, ".git/fsmonitor", "#!/bin/sh\ntouch \"$0.called\"\n")
	hook := filepath.Join(root, ".git", "fsmonitor")
	require.NoError(t, os.Chmod(hook, 0o700)) //nolint:gosec // Test hook must be executable.
	gitCommand(t, root, "config", "core.fsmonitor", hook)
	require.True(t, gitIgnoredPaths(t.Context(), root, []string{testIgnoredLog})[testIgnoredLog])
	require.True(t, gitIgnoredPaths(t.Context(), root, nil)[testIgnoredLog])
	require.NoFileExists(t, hook+".called")
}

func TestIgnoredEmbeddedRepository(t *testing.T) {
	root := t.TempDir()
	initGitRepository(t, root)
	writeFile(t, root, ".gitignore", "nested/\n")
	writeFile(t, root, "nested/tracked.txt", "content")
	nested := filepath.Join(root, "nested")
	gitCommand(t, nested, "init", "-q")
	gitCommand(t, nested, "add", "tracked.txt")
	ignored := ignoredEvents(t.Context(), root, []string{"nested/tracked.txt"})
	require.True(t, ignored["nested/tracked.txt"])
	snapshot, err := scanFiles(t.Context(), root, nil, true)
	require.NoError(t, err)
	require.NotContains(t, snapshot, "nested/tracked.txt")
}
