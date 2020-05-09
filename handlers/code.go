/*
Copyright 2018 Google LLC

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
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/alecthomas/chroma"
	"github.com/alecthomas/chroma/formatters/html"
	"github.com/alecthomas/chroma/lexers"
	"github.com/alecthomas/chroma/styles"
	"github.com/dgageot/demoit/files"
	"gopkg.in/src-d/go-git.v4"
	"gopkg.in/src-d/go-git.v4/plumbing"
	"gopkg.in/src-d/go-git.v4/plumbing/object"
)

// Code returns the content of a source file.
func Code(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/sourceCode/")
	hash := r.FormValue("hash")

	var contents []byte

	if len(hash) > 0 {

		repoPath, insidePath, err := findRepositoryOfFile(filename)
		if err != nil {
			http.NotFound(w, r)
			return
		}

		repo, err := git.PlainOpen(repoPath)
		if err != nil {
			http.Error(w, "Unable to open repo "+repoPath, 500)
			return
		}

		h, err := repo.ResolveRevision(plumbing.Revision(hash))
		if err != nil {
			http.Error(w, "Unable to resolve revision "+hash, 500)
			return
		}
		if h == nil {
			http.Error(w, "Resolved nil hash "+hash, 500)
		}

		obj, err := repo.Object(plumbing.AnyObject, *h)
		if err != nil {
			http.Error(w, "Unable to create an object for "+hash, 500)
			return
		}

		blob, err := resolve(obj, insidePath)
		if err != nil {
			http.Error(w, "Unable to resolve "+insidePath, 500)
			return
		}

		r, err := blob.Reader()
		if err != nil {
			http.Error(w, "Unable to create a reader for "+insidePath, 500)
			return
		}
		defer r.Close()

		contents, err = ioutil.ReadAll(r)
		if err != nil {
			http.Error(w, "Unable to read "+filename, 500)
			return
		}

	} else {
		if !files.Exists(filename) {
			http.NotFound(w, r)
			return
		}
		var err error
		contents, err = files.Read(filename)
		if err != nil {
			http.Error(w, "Unable to read "+filename, 500)
			return
		}

	}

	lexer := lexer(filename)
	style := style(r.FormValue("style"))
	lines := highligtedLines(r)
	formatter := html.New(html.Standalone(), html.WithLineNumbers(), html.HighlightLines(lines), html.WithClasses())

	iterator, err := lexer.Tokenise(nil, string(contents))
	if err != nil {
		http.Error(w, "Unable to tokenize "+filename, 500)
		return
	}

	var buffer bytes.Buffer
	err = formatter.Format(&buffer, style, iterator)
	if err != nil {
		http.Error(w, "Unable to format source code", 500)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	buffer.WriteTo(w)
}

type nonDefaultYAMLLexer struct {
	chroma.Lexer
}

func (n *nonDefaultYAMLLexer) Tokenise(options *chroma.TokeniseOptions, text string) (chroma.Iterator, error) {
	iterator, err := n.Lexer.Tokenise(nil, text)
	if err != nil {
		return nil, err
	}

	updated := iterator.Tokens()

	for i, token := range updated {
		if token.Type == chroma.Text {
			if token.Value == "-" {
				continue
			}

			if i+1 >= len(updated) {
				continue
			}

			next := updated[i+1]
			if next.Type == chroma.Punctuation && next.Value == ":" {
				continue
			}

			token.Type = chroma.LiteralStringSingle
			updated[i] = token
		}
	}

	return chroma.Literator(updated...), nil
}

func lexer(file string) chroma.Lexer {
	lexer := lexers.Match(file)
	if lexer != nil {
		if strings.HasSuffix(file, ".yaml") || strings.HasSuffix(file, ".yml") {
			fmt.Println("Using non default YAML Lexer")
			return &nonDefaultYAMLLexer{lexers.Get(".yaml")}
		}
		return lexer
	}

	return lexers.Fallback
}

func style(name string) *chroma.Style {
	if name != "" {
		style := styles.Get(name)
		if style != nil {
			return style
		}
	}

	return styles.GitHub
}

func highligtedLines(r *http.Request) [][2]int {
	lines := [][2]int{}

	startLines := strings.Split(r.FormValue("startLine"), ",")
	endLines := strings.Split(r.FormValue("endLine"), ",")

	for i := range startLines {
		startLine, _ := strconv.Atoi(startLines[i])
		endLine, _ := strconv.Atoi(endLines[i])

		lines = append(lines, [2]int{startLine, endLine})
	}

	return lines
}

// findRepositoryOfFile finds the git repository containing file
// and returns the path of the repository and the path of the file inside the repository
func findRepositoryOfFile(file string) (repoPath string, filePath string, err error) {
	dir, filename := filepath.Split(file)
	dirParts := strings.Split(filepath.Clean(dir), string(os.PathSeparator))
	if dirParts[0] != "." {
		dirParts = append([]string{"."}, dirParts...)
	}

	var i int
	for i = range dirParts {
		repoPath = filepath.Join(dirParts[:len(dirParts)-i]...)
		_, err = os.Stat(filepath.Join(repoPath, git.GitDirName))
		if err == nil {
			break
		}
	}
	if err != nil {
		return
	}
	filePath = filepath.Join(append(dirParts[len(dirParts)-i:], filename)...)
	return
}

func resolve(obj object.Object, path string) (*object.Blob, error) {
	switch o := obj.(type) {
	case *object.Commit:
		t, err := o.Tree()
		if err != nil {
			return nil, err
		}
		return resolve(t, path)
	case *object.Tag:
		target, err := o.Object()
		if err != nil {
			return nil, err
		}
		return resolve(target, path)
	case *object.Tree:
		file, err := o.File(path)
		if err != nil {
			return nil, err
		}
		return &file.Blob, nil
	case *object.Blob:
		return o, nil
	default:
		return nil, object.ErrUnsupportedObject
	}
}
