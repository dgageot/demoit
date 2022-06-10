/*
Copyright 2019 Google LLC
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
	_ "embed"
	"fmt"
	"html/template"
	"net/http"

	"github.com/dgageot/demoit/files"
)

//go:embed resources/grid.tmpl.html
var gridHTML string
var gridTemplate = template.Must(template.New("grid").Funcs(template.FuncMap{"hash": hash}).Parse(gridHTML))

// Grid displays a grid view of all steps as iframes.
//
// This has the nice side-effect of warming the browser cache with all
// necessary resources. Otherwise the speaker and their audience may
// experience a lag between each step, while image resources are loading,
// especially if the DemoIt server is remote (not localhost).
func Grid(w http.ResponseWriter, r *http.Request) {
	steps, err := readSteps(files.Root)
	if err != nil {
		http.Error(w, fmt.Sprintf("Unable to read steps: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")

	if err := gridTemplate.Execute(w, steps); err != nil {
		http.Error(w, "Unable to render grid view", http.StatusInternalServerError)
		return
	}
}
