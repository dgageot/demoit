package handlers

import (
	_ "embed"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/dgageot/demoit/files"
	"github.com/dgageot/demoit/shell"
	"github.com/gorilla/mux"
)

//go:embed resources/terminal.html
var terminalHTML []byte

// Shell serves an HTML page with a ghostty-web terminal connected via WebSocket.
func Shell(w http.ResponseWriter, r *http.Request) {
	folder := mux.Vars(r)["folder"]

	path := files.Root
	if folder != "." {
		path += "/" + folder
	}

	// Redirect to the terminal page with the shell command as a query parameter.
	commands, err := shellCommands(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	redirectURL := "/terminal?cmd=" + url.QueryEscape(strings.Join(commands, ";"))
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// TerminalPage serves the ghostty-web terminal HTML page.
func TerminalPage(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	if _, err := w.Write(terminalHTML); err != nil {
		http.Error(w, "Unable to serve terminal page", http.StatusInternalServerError)
	}
}

// TerminalWebSocket upgrades to WebSocket and bridges to a PTY.
func TerminalWebSocket(w http.ResponseWriter, r *http.Request) {
	cmd := r.URL.Query().Get("cmd")
	if cmd == "" {
		http.Error(w, "Missing cmd parameter", http.StatusBadRequest)
		return
	}

	shell.HandleWebSocket(w, r, cmd)
}

func shellCommands(path string) ([]string, error) {
	commands := []string{"cd " + path + ">/dev/null"}

	shellBin, found := os.LookupEnv("SHELL")
	if !found {
		shellBin = "bash"
	}
	fmt.Println("Using shell", shellBin)

	// Resolve custom .bashrc path.
	bashRc := resolveDemoitFile(".bashrc")
	if bashRc != "" {
		fmt.Println("Using bashrc file", bashRc)
	}

	// Copy history file (converting to zsh format if needed).
	historyFile, err := copyHistoryFile(shellBin)
	if err != nil {
		return nil, err
	}
	if historyFile != "" {
		fmt.Println("Using history", historyFile)
	}

	// Build shell-specific exec command. Using a wrapper init file
	// ensures HISTFILE is set after the shell's own startup files,
	// which prevents the user's real history from overriding the demo history.
	execCmd, err := shellExecCommand(shellBin, bashRc, historyFile)
	if err != nil {
		return nil, err
	}
	commands = append(commands, execCmd)

	return commands, nil
}

// resolveDemoitFile returns the absolute path to a file in .demoit/,
// or an empty string if it doesn't exist.
func resolveDemoitFile(name string) string {
	path, err := filepath.Abs(filepath.Join(files.Root, ".demoit", name))
	if err != nil {
		return ""
	}
	if _, err := os.Stat(path); err != nil {
		return ""
	}
	return path
}

// shellExecCommand builds the exec command for the given shell, including
// wrapper init files when needed to ensure HISTFILE survives shell startup.
func shellExecCommand(shellBin, bashRc, historyFile string) (string, error) {
	switch filepath.Base(shellBin) {
	case "bash":
		return bashExecCommand(shellBin, bashRc, historyFile)
	case "zsh":
		return zshExecCommand(shellBin, bashRc, historyFile)
	default:
		return defaultExecCommand(shellBin, bashRc, historyFile), nil
	}
}

// bashExecCommand creates a temp --rcfile that sources the user's .bashrc,
// then demoit's .bashrc, then sets HISTFILE and reloads history.
// This ensures HISTFILE is set after the user's startup files.
func bashExecCommand(shellBin, bashRc, historyFile string) (string, error) {
	if bashRc == "" && historyFile == "" {
		return "exec " + shellBin, nil
	}

	var rc strings.Builder
	rc.WriteString("[ -f \"$HOME/.bashrc\" ] && source \"$HOME/.bashrc\"\n")
	if bashRc != "" {
		fmt.Fprintf(&rc, "source %q\n", bashRc)
	}
	if historyFile != "" {
		fmt.Fprintf(&rc, "export HISTFILE=%q\n", historyFile)
		rc.WriteString("history -r \"$HISTFILE\"\n")
	}

	rcFile, err := writeTempFile("demoit-bashrc-*", rc.String())
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("exec %s --rcfile %s", shellBin, rcFile), nil
}

// zshExecCommand creates a temp ZDOTDIR with .zshenv and .zshrc wrappers
// that source the user's real startup files, then set HISTFILE.
// This ensures HISTFILE is set after the user's startup files.
func zshExecCommand(shellBin, bashRc, historyFile string) (string, error) {
	if bashRc == "" && historyFile == "" {
		return "exec " + shellBin, nil
	}

	zdotdir, err := os.MkdirTemp("", "demoit-zdotdir-*")
	if err != nil {
		return "", fmt.Errorf("unable to create temp zdotdir: %w", err)
	}

	// .zshenv wrapper: source the user's real .zshenv.
	zshenv := "[ -f \"$HOME/.zshenv\" ] && source \"$HOME/.zshenv\"\n"
	if err := os.WriteFile(filepath.Join(zdotdir, ".zshenv"), []byte(zshenv), 0o600); err != nil {
		return "", fmt.Errorf("unable to write .zshenv: %w", err)
	}

	// .zshrc wrapper: reset ZDOTDIR, source user's .zshrc, then demoit's, then set HISTFILE.
	var zshrc strings.Builder
	zshrc.WriteString("unset ZDOTDIR\n")
	zshrc.WriteString("[ -f \"$HOME/.zshrc\" ] && source \"$HOME/.zshrc\"\n")
	if bashRc != "" {
		fmt.Fprintf(&zshrc, "source %q\n", bashRc)
	}
	if historyFile != "" {
		fmt.Fprintf(&zshrc, "export HISTFILE=%q\n", historyFile)
		zshrc.WriteString("fc -R \"$HISTFILE\"\n")
	}

	if err := os.WriteFile(filepath.Join(zdotdir, ".zshrc"), []byte(zshrc.String()), 0o600); err != nil {
		return "", fmt.Errorf("unable to write .zshrc: %w", err)
	}

	return fmt.Sprintf("ZDOTDIR=%s exec %s", zdotdir, shellBin), nil
}

// defaultExecCommand builds a fallback exec command for unknown shells.
// HISTFILE is set as an environment variable before exec, which may be
// overridden by the shell's startup files.
func defaultExecCommand(shellBin, bashRc, historyFile string) string {
	var parts []string
	if bashRc != "" {
		parts = append(parts, "source "+bashRc)
	}
	if historyFile != "" {
		parts = append(parts, fmt.Sprintf("HISTFILE=%s exec %s", historyFile, shellBin))
	} else {
		parts = append(parts, "exec "+shellBin)
	}
	return strings.Join(parts, ";")
}

// copyHistoryFile reads .demoit/.bash_history, converts it to zsh format
// if the shell is zsh, and writes it to a temporary file.
func copyHistoryFile(shellBin string) (string, error) {
	content, err := files.Read(".demoit", ".bash_history")
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil
		}
		return "", fmt.Errorf("unable to read file .bash_history: %w", err)
	}

	// Convert bash history to zsh extended history format if needed.
	if filepath.Base(shellBin) == "zsh" {
		content = convertToZshHistory(content)
	}

	tmpFile, err := os.CreateTemp("", "demoit")
	if err != nil {
		return "", fmt.Errorf("unable to create temp file: %w", err)
	}
	defer tmpFile.Close()

	_, err = tmpFile.Write(content)
	if err != nil {
		return "", fmt.Errorf("unable to write file: %w", err)
	}

	return tmpFile.Name(), nil
}

// convertToZshHistory converts bash history (one command per line) to
// zsh extended history format (`: timestamp:0;command` per line).
func convertToZshHistory(content []byte) []byte {
	lines := strings.Split(string(content), "\n")
	var buf strings.Builder
	for _, line := range lines {
		if line == "" {
			continue
		}
		fmt.Fprintf(&buf, ": 0:0;%s\n", line)
	}
	return []byte(buf.String())
}

// writeTempFile creates a temp file with the given content and returns its path.
func writeTempFile(pattern, content string) (string, error) {
	f, err := os.CreateTemp("", pattern)
	if err != nil {
		return "", fmt.Errorf("unable to create temp file: %w", err)
	}
	if _, err := f.WriteString(content); err != nil {
		return "", fmt.Errorf("unable to write temp file: %w", err)
	}
	if err := f.Close(); err != nil {
		return "", fmt.Errorf("unable to close temp file: %w", err)
	}
	return f.Name(), nil
}
