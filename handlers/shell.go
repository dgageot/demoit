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

	// Source custom .bashrc.
	bashRc, err := filepath.Abs(filepath.Join(files.Root, ".demoit", ".bashrc"))
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(bashRc); err == nil {
		fmt.Println("Using bashrc file", bashRc)
		commands = append(commands, "source "+bashRc)
	}

	// Bash history needs to be copied because it's going to be modified by the shell.
	bashHistory, err := copyFile(".bash_history")
	if err != nil {
		return nil, err
	}
	if bashHistory != "" {
		fmt.Println("Using history", bashHistory)
		commands = append(commands, fmt.Sprintf("HISTFILE=%s exec %s", bashHistory, shellBin))
	} else {
		commands = append(commands, "exec "+shellBin)
	}

	return commands, nil
}

func copyFile(file string) (string, error) {
	content, err := files.Read(".demoit", file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil
		}
		return "", fmt.Errorf("unable to read file %s: %w", file, err)
	}

	tmpFile, err := os.CreateTemp("", "demoit")
	if err != nil {
		return "", fmt.Errorf("unable to create temp file: %w", err)
	}

	_, err = tmpFile.Write(content)
	if err != nil {
		return "", fmt.Errorf("unable to write file: %w", err)
	}

	return tmpFile.Name(), nil
}
