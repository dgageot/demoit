package handlers

import (
	"net/http"
	"path/filepath"
	"sync"

	"github.com/dgageot/demoit/files"
)

var (
	staticOnce   sync.Once
	staticServer http.Handler
)

// Static renders static files.
func Static(w http.ResponseWriter, r *http.Request) {
	staticOnce.Do(func() {
		staticServer = http.FileServer(http.Dir(filepath.Join(files.Root, ".demoit")))
	})

	staticServer.ServeHTTP(w, r)
}
