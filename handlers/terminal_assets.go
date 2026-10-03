package handlers

import (
	"bytes"
	"embed"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

//go:embed resources/ghostty-web
var terminalAssets embed.FS

// TerminalAsset serves the pinned terminal emulator independently of presentation files.
func TerminalAsset(w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["file"]
	switch name {
	case "ghostty-web.js":
		w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	case "ghostty-vt.wasm":
		w.Header().Set("Content-Type", "application/wasm")
	default:
		http.NotFound(w, r)
		return
	}

	data, err := terminalAssets.ReadFile("resources/ghostty-web/" + name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	// Asset bytes are pinned; changes must use a new versioned route.
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(data))
}
