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
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/dgageot/demoit/files"
	"github.com/gorilla/mux"
	"github.com/pkg/errors"
)

// Shell redirects to the url of a shell running in the given folder.
func Shell(w http.ResponseWriter, r *http.Request) {
	folder := mux.Vars(r)["folder"]

	path := files.Root
	if folder != "." {
		path += "/" + folder
	}

	commands := []string{"cd " + path}

	shell, found := os.LookupEnv("SHELL")
	if !found {
		shell = "bash"
	}
	fmt.Println("Using shell", shell)

	bashHistory, err := getBashHistoryCopy()
	if err != nil {
		fmt.Println(err)
		http.Error(w, err.Error(), 500)
		return
	}
	if bashHistory != "" {
		fmt.Println("Using history", bashHistory)

		commands = append(commands, fmt.Sprintf("HISTFILE=%s exec %s", bashHistory, shell))
	} else {
		commands = append(commands, fmt.Sprintf("exec %s", shell))
	}

	parameters := url.Values{}
	parameters.Set("arg", strings.Join(commands, ";"))

	domain := "localhost"
	if referer := r.Header.Get("Referer"); referer != "" {
		if refererURL, err := url.Parse(referer); err == nil {
			domain = strings.Split(refererURL.Host, ":")[0]
		}
	}

	url := fmt.Sprintf("http://%s:%d/?%s", domain, *flags.ShellPort, parameters.Encode())
	http.Redirect(w, r, url, 303)
}

func getBashHistoryCopy() (string, error) {
	if !files.Exists(".demoit", ".bash_history") {
		return "", nil
	}

	tmpFile, err := ioutil.TempFile("", "demoit")
	if err != nil {
		return "", errors.Wrap(err, "Unable to create temp file for bash history")
	}

	history, err := files.Read(".demoit", ".bash_history")
	if err != nil {
		return "", errors.Wrap(err, "Unable to read bash history")
	}

	_, err = tmpFile.Write(history)
	if err != nil {
		return "", errors.Wrap(err, "Unable to write bash history")
	}

	return tmpFile.Name(), nil
}
