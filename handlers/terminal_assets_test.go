package handlers

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/require"
)

func TestTerminalAssets(t *testing.T) {
	for _, asset := range []struct {
		name        string
		contentType string
		digest      string
	}{
		{"ghostty-web.js", "text/javascript; charset=utf-8", "d22e9af08b6c40600ddb8903aebbcba5101476e1c820123572e84bf2e1792d8b"},
		{"ghostty-vt.wasm", "application/wasm", "6af5b84ea69965745a1a62372a5081dd99a156a88e8d84affa1fd30558e78047"},
	} {
		t.Run(asset.name, func(t *testing.T) {
			r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/terminal-assets/hvir-v0.4.0-20/"+asset.name, nil)
			r = mux.SetURLVars(r, map[string]string{"file": asset.name})
			w := httptest.NewRecorder()
			TerminalAsset(w, r)
			require.Equal(t, http.StatusOK, w.Code)
			require.Equal(t, asset.contentType, w.Header().Get("Content-Type"))
			require.Equal(t, asset.digest, fmt.Sprintf("%x", sha256.Sum256(w.Body.Bytes())))

			r.Method = http.MethodHead
			head := httptest.NewRecorder()
			TerminalAsset(head, r)
			require.Equal(t, http.StatusOK, head.Code)
			require.Equal(t, w.Header().Get("Content-Length"), head.Header().Get("Content-Length"))
			require.Empty(t, head.Body.Bytes())
		})
	}
}

func TestTerminalAssetRejectsOtherFiles(t *testing.T) {
	for _, name := range []string{"missing.js", "LICENSE", "provenance.json", "../terminal.html", "../../shell.go"} {
		t.Run(name, func(t *testing.T) {
			r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/terminal-assets/", nil)
			r = mux.SetURLVars(r, map[string]string{"file": name})
			w := httptest.NewRecorder()
			TerminalAsset(w, r)
			require.Equal(t, http.StatusNotFound, w.Code)
		})
	}
}

func TestTerminalUsesPinnedLocalEmulator(t *testing.T) {
	require.Contains(t, string(terminalHTML), "'/terminal-assets/hvir-v0.4.0-20/ghostty-web.js'")
	require.NotContains(t, string(terminalHTML), "cdn.jsdelivr.net")
}
