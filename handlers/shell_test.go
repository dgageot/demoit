package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/creack/pty"
	"github.com/stretchr/testify/require"
)

func TestShellRejectsPrefillControls(t *testing.T) {
	for _, command := range []string{"echo one\necho two", "echo\r", "echo\x1b", "echo\x00"} {
		t.Run(url.QueryEscape(command), func(t *testing.T) {
			r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/shell/?command="+url.QueryEscape(command), nil)
			w := httptest.NewRecorder()
			Shell(w, r)
			require.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

func TestShellWithoutPrefill(t *testing.T) {
	command, err := shellExecCommand("/bin/zsh", "", "", "")
	require.NoError(t, err)
	require.Equal(t, "exec /bin/zsh", command)
	command, err = shellExecCommand("/bin/bash", "", "", "")
	require.NoError(t, err)
	require.Equal(t, "exec /bin/bash", command)
}

func TestShellUnsupportedPrefill(t *testing.T) {
	_, err := shellExecCommand("/bin/fish", "", "", "echo hello")
	require.ErrorContains(t, err, "requires zsh")
	command, err := shellExecCommand("/bin/fish", "", "", "")
	require.NoError(t, err)
	require.Equal(t, "exec /bin/fish", command)
}

func TestBashCommandPrefillRejected(t *testing.T) {
	_, err := shellExecCommand("/bin/bash", "", "", "echo hello")
	require.ErrorContains(t, err, "requires zsh")
}

func TestZshCommandPrefill(t *testing.T) {
	testCommandPrefill(t, "zsh")
}

func testCommandPrefill(t *testing.T, name string) {
	t.Helper()
	shell, err := exec.LookPath(name)
	if err != nil {
		t.Skipf("%s is not installed", name)
	}
	home := t.TempDir()
	marker := filepath.Join(home, "ran")
	premature := filepath.Join(home, "early")
	prefill := "printf '%s' \"quoted ' & <text> $(touch " + shellQuote(premature) + ")\" > " + shellQuote(marker)
	initFile := filepath.Join(home, "demo.bashrc")
	require.NoError(t, os.WriteFile(initFile, []byte("bindkey ';' accept-line\n"), 0o600))
	command, err := shellExecCommand(shell, initFile, "", prefill+";")
	require.NoError(t, err)

	process := exec.CommandContext(t.Context(), "sh", "-c", command)
	process.Env = []string{"HOME=" + home, "PATH=" + os.Getenv("PATH"), "TERM=xterm-256color", "PS1=READY> "}
	terminal, err := pty.StartWithSize(process, &pty.Winsize{Rows: 24, Cols: 512})
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = terminal.Close()
		_ = process.Process.Kill()
		_, _ = process.Process.Wait()
	})

	var output bytes.Buffer
	var mu sync.Mutex
	go func() {
		data := make([]byte, 4096)
		for {
			n, readErr := terminal.Read(data)
			mu.Lock()
			output.Write(data[:n])
			mu.Unlock()
			if bytes.Contains(data[:n], []byte("\x1b[5n")) {
				_, _ = terminal.WriteString("\x1b[0n")
			}
			if readErr != nil {
				return
			}
		}
	}()
	require.Eventually(t, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return bytes.Contains(output.Bytes(), []byte(prefill+";"))
	}, 5*time.Second, 10*time.Millisecond)
	require.NoFileExists(t, marker)
	require.NoFileExists(t, premature)

	// Editing the pending line must not execute it either.
	_, err = terminal.WriteString("\x7f")
	require.NoError(t, err)
	require.NoFileExists(t, marker)
	_, err = terminal.WriteString("\r")
	require.NoError(t, err)
	require.Eventually(t, func() bool {
		data, readErr := os.ReadFile(marker)
		return readErr == nil && string(data) == "quoted ' & <text> "
	}, 5*time.Second, 10*time.Millisecond)
	require.FileExists(t, premature)
}
