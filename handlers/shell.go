/*
Copyright 2018 Google LLC

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
	"io/ioutil"
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

	if err := r.ParseForm(); err != nil {
		fmt.Println(err)
		http.Error(w, err.Error(), 500)
		return
	}

	args, err := args(path, r.Form["userCommand"])
	if err != nil {
		fmt.Println(err)
		http.Error(w, err.Error(), 500)
		return
	}

	domain := "localhost"
	if referer := r.Header.Get("Referer"); referer != "" {
		if refererURL, err := url.Parse(referer); err == nil {
			domain = strings.Split(refererURL.Host, ":")[0]
		}
	}

	parameters := url.Values{}
	parameters.Set("arg", strings.Join(args, ";"))
	url := fmt.Sprintf("http://%s:%d/?%s", domain, *flags.ShellPort, parameters.Encode())

	http.Redirect(w, r, url, 303)
}

func args(path string, userCommands []string) ([]string, error) {
	args := []string{"cd " + path}

	shell, found := os.LookupEnv("SHELL")
	if !found {
		shell = "bash"
	}
	fmt.Println("Using shell", shell)

	// Source custom .bashrc
	bashRc, err := filepath.Abs(filepath.Join(files.Root, ".demoit", ".bashrc"))
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(bashRc); err == nil {
		fmt.Println("Using bashrc file", bashRc)
		args = append(args, fmt.Sprintf("source %s", bashRc))
	}

	for _, userCommand := range userCommands {
		args = append(args, fmt.Sprintf("%s -c '%s'", shell, userCommand))
	}

	// Bash history needs to be copied because it's going to be
	// modified by the shell.
	bashHistory, err := copyFile(".bash_history")
	if err != nil {
		return nil, err
	}
	if bashHistory != "" {
		fmt.Println("Using history", bashHistory)
		args = append(args, fmt.Sprintf("HISTFILE=%s exec %s", bashHistory, shell))
	} else {
		args = append(args, fmt.Sprintf("exec %s", shell))
	}

	return args, nil
}

func copyFile(file string) (string, error) {
	content, err := files.Read(".demoit", file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			// Ignore silently
			return "", nil
		}
		return "", fmt.Errorf("Unable to read file %s: %w", file, err)
	}

	tmpFile, err := ioutil.TempFile("", "demoit")
	if err != nil {
		return "", fmt.Errorf("Unable to create temp file: %w", err)
	}

	_, err = tmpFile.Write(content)
	if err != nil {
		return "", fmt.Errorf("Unable to write file: %w", err)
	}

	return tmpFile.Name(), nil
}
