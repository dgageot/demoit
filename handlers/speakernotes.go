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
	"html/template"
	"net/http"
)

//go:embed resources/speakernotes.tmpl.html
var speakerNotesHTML string
var speakerNotesTemplate = template.Must(template.New("speakerNotes").Funcs(template.FuncMap{"hash": hash}).Parse(speakerNotesHTML))

// SpeakerNotes provides the presenter view, which depends on the main window to
// be able to display the "current" slide with notes.
func SpeakerNotes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")

	if err := speakerNotesTemplate.Execute(w, nil); err != nil {
		http.Error(w, "Unable to render speaker notes", http.StatusInternalServerError)
		return
	}
}
