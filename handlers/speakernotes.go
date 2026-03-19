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
