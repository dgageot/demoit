/*
Copyright 2018 Google LLC
Copyright 2022 David Gageot

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
	"github.com/dgageot/demoit/flags"
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
		fmt.Println(err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	url := localURL(r, *flags.ShellPort, map[string]string{
		"arg": strings.Join(commands, ";"),
	})

	http.Redirect(w, r, url, http.StatusSeeOther)
}

func commands(path string) ([]string, error) {
	commands := []string{"cd " + path}

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
		commands = append(commands, fmt.Sprintf("source %s", bashRc))
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
		commands = append(commands, fmt.Sprintf("exec %s", shell))
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

func localURL(r *http.Request, port int, params map[string]string) string {
	domain := localhost(r)
	localhost := fmt.Sprintf("http://%s:%d", domain, port)

	if len(params) > 0 {
		parameters := url.Values{}
		for k, v := range params {
			parameters.Set(k, v)
		}
		localhost += "?" + parameters.Encode()
	}

	return localhost
}

func localhost(r *http.Request) string {
	if referer := r.Header.Get("Referer"); referer != "" {
		if refererURL, err := url.Parse(referer); err == nil {
			return strings.Split(refererURL.Host, ":")[0]
		}
	}

	return "localhost"
}
