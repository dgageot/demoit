package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/dgageot/demoit/files"
	"github.com/gorilla/mux"
)

// Shell redirects to the url of a shell running in the given folder.
func Shell(w http.ResponseWriter, r *http.Request) {
	folder := mux.Vars(r)["folder"]

	path := files.Root
	if folder != "." {
		path += "/" + folder
	}

	commands, err := commands(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	redirectURL := "/tty?arg=" + url.QueryEscape(strings.Join(commands, ";"))
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

func commands(path string) ([]string, error) {
	commands := []string{"cd " + path + ">/dev/null"}

	shell, found := os.LookupEnv("SHELL")
	if !found {
		shell = "bash"
	}
	fmt.Println("Using shell", shell)

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
		commands = append(commands, fmt.Sprintf("HISTFILE=%s exec %s", bashHistory, shell))
	} else {
		commands = append(commands, "exec "+shell)
	}

	return commands, nil
}

func copyFile(file string) (string, error) {
	content, err := files.Read(".demoit", file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			// Ignore silently.
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
