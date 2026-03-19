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
