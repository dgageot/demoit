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
	"bytes"
	_ "embed"
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/dgageot/demoit/files"
	"github.com/dgageot/demoit/flags"
	"github.com/gorilla/mux"
)

//go:embed resources/index.tmpl.html
var indexHTML string
var indexTemplate = template.Must(template.New("index").Funcs(template.FuncMap{"hash": hash}).Parse(indexHTML))

// Page describes a page of the demo.
type Page struct {
	WorkingDir  string
	HTML        template.HTML
	URL         string
	PrevURL     string
	NextURL     string
	CurrentStep int
	StepCount   int
	DevMode     bool
}

// Step renders a given page.
func Step(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	steps, err := readSteps(files.Root)
	if err != nil {
		http.Error(w, fmt.Sprintf("Unable to read steps: %v", err), http.StatusInternalServerError)
		return
	}

	id := 0
	if vars["id"] != "" {
		id, err = strconv.Atoi(vars["id"])
		if err != nil || id >= len(steps) {
			http.NotFound(w, r)
			return
		}
	}

	w.Header().Set("Content-Type", "text/html")
	if err := indexTemplate.Execute(w, steps[id]); err != nil {
		http.Error(w, "Unable to render page", http.StatusInternalServerError)
		return
	}
}

// LastStep redirects to the latest page.
func LastStep(w http.ResponseWriter, r *http.Request) {
	steps, err := readSteps(files.Root)
	if err != nil {
		http.Error(w, fmt.Sprintf("Unable to read steps: %v", err), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/%d", len(steps)-1), http.StatusSeeOther)
}

func readSteps(folder string) ([]Page, error) {
	var steps []Page

	content, err := os.ReadFile(filepath.Join(folder, "demoit.html"))
	if err != nil {
		return nil, err
	}

	parts := bytes.Split(content, []byte("---"))
	for i, part := range parts {
		var url string
		if i == 0 {
			url = "/"
		} else {
			url = fmt.Sprintf("/%d", i)
		}

		steps = append(steps, Page{
			WorkingDir:  folder,
			HTML:        template.HTML(part),
			DevMode:     *flags.DevMode,
			CurrentStep: i,
			URL:         url,
		})
	}

	for i := range steps {
		steps[i].StepCount = len(steps) - 1
		if i > 0 {
			steps[i].PrevURL = steps[i-1].URL
		}
		if i < len(steps)-1 {
			steps[i].NextURL = steps[i+1].URL
		}
	}

	return steps, nil
}

// VerifyConfiguration runs a couple of verifications on the configuration.
func VerifyConfiguration() error {
	if _, err := readSteps(files.Root); err != nil {
		return err
	}

	info, err := os.Stat(filepath.Join(files.Root, ".demoit"))
	if os.IsNotExist(err) {
		return errors.New(`mandatory resource folder ".demoit" doesn't exist`)
	}

	if err != nil {
		return err
	}

	if !info.IsDir() {
		return errors.New(`mandatory resource folder ".demoit" is not a folder`)
	}

	return nil
}

// Ignore errors and return empty string if an error occurs.
func hash(path string) string {
	h, err := files.Sha256(path)
	if err != nil {
		return ""
	}

	return h[:10]
}
