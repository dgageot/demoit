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
	"sync"

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

var (
	cachedSteps    []Page
	errCachedSteps error
	cacheStepsOnce sync.Once
)

func readSteps(folder string) ([]Page, error) {
	if !*flags.DevMode {
		cacheStepsOnce.Do(func() {
			cachedSteps, errCachedSteps = parseSteps(folder)
		})
		return cachedSteps, errCachedSteps
	}
	return parseSteps(folder)
}

func parseSteps(folder string) ([]Page, error) {
	content, err := os.ReadFile(filepath.Join(folder, "demoit.html"))
	if err != nil {
		return nil, err
	}

	parts := bytes.Split(content, []byte("---"))
	steps := make([]Page, len(parts))
	for i, part := range parts {
		url := "/"
		if i > 0 {
			url = fmt.Sprintf("/%d", i)
		}

		steps[i] = Page{
			WorkingDir:  folder,
			HTML:        template.HTML(part),
			DevMode:     *flags.DevMode,
			CurrentStep: i,
			URL:         url,
			StepCount:   len(parts) - 1,
		}
	}

	for i := range steps {
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
	if errors.Is(err, os.ErrNotExist) {
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
	h, err := files.Sha256(".demoit", path)
	if err != nil {
		return ""
	}

	return h[:10]
}
