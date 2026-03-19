package handlers

import "net/http"

// Ping does http HEAD on a URL and returns its status.
func Ping(w http.ResponseWriter, r *http.Request) {
	pingURL := r.FormValue("url")

	req, err := http.NewRequestWithContext(r.Context(), http.MethodHead, pingURL, http.NoBody)
	if err != nil {
		http.Error(w, "Unable to ping", http.StatusBadRequest)
		return
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		w.WriteHeader(http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(resp.StatusCode)
}
