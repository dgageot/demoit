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
	"net/http"
	"path"
	"time"

	"github.com/dgageot/demoit/vscode"
	"github.com/gorilla/mux"
)

// VSCode redirects to the url of a VSCode session running
// with https://github.com/cdr/code-server.
func VSCode(w http.ResponseWriter, r *http.Request) {
	vscode.Start()

	// Wait for vscode to start as much as we can.
	// Don't error out if it can't be started.
	for try := 10; try > 0; try-- {
		_, err := http.Head("http://localhost:18080/")
		if err == nil {
			break
		}

		time.Sleep(500 * time.Millisecond)
	}

	folder := mux.Vars(r)["folder"]

	url := localURL(r, 18080, map[string]string{
		"folder": path.Join("/app", folder),
	})

	http.Redirect(w, r, url, 303)
}
