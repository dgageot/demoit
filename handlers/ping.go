package handlers

import (
	"net/http"
	"net/url"
)

// Ping does http HEAD on a URL and returns its status.
func Ping(w http.ResponseWriter, r *http.Request) {
	// No need to ping when in grid view mode.
	if isGridView(r.Referer()) {
		return
	}

	pingURL := r.FormValue("url")

	resp, err := http.Head(pingURL)
	if err != nil {
		http.Error(w, "Unable to ping", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(resp.StatusCode)
}

func isGridView(referer string) bool {
	refererURL, err := url.Parse(referer)
	if err != nil {
		return false // Silently ignore
	}

	return refererURL.Query().Get("grid") == "true"
}
