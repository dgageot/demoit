package handlers

import (
	"net/http"
	"path/filepath"

	"github.com/dgageot/demoit/files"
)

// Static renders static files.
func Static(w http.ResponseWriter, r *http.Request) {
	fs := http.Dir(filepath.Join(files.Root, ".demoit"))

	http.FileServer(fs).ServeHTTP(w, r)
}
