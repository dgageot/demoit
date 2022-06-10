/*
Copyright 2018 Google LLC
Copyright 2022 David Gageot

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
	"net/http"
	"strconv"
	"strings"

	"github.com/alecthomas/chroma/v2"
	"github.com/alecthomas/chroma/v2/formatters/html"
	"github.com/alecthomas/chroma/v2/lexers"
	"github.com/alecthomas/chroma/v2/styles"
	"github.com/dgageot/demoit/files"
)

// Code returns the content of a source file.
func Code(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/sourceCode/")

	var contents []byte

	if !files.Exists(filename) {
		http.NotFound(w, r)
		return
	}
	var err error
	contents, err = files.Read(filename)
	if err != nil {
		http.Error(w, "Unable to read "+filename, http.StatusInternalServerError)
		return
	}

	lexer := lexer(filename)
	style := style(r.FormValue("style"))
	lines := highligtedLines(r)
	formatter := html.New(html.Standalone(true), html.WithLineNumbers(true), html.HighlightLines(lines), html.WithClasses(true))

	iterator, err := lexer.Tokenise(nil, string(contents))
	if err != nil {
		http.Error(w, "Unable to tokenize "+filename, http.StatusInternalServerError)
		return
	}

	var buffer bytes.Buffer
	if err := formatter.Format(&buffer, style, iterator); err != nil {
		http.Error(w, "Unable to format source code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	if _, err = buffer.WriteTo(w); err != nil {
		http.Error(w, "Unable to write source code", http.StatusInternalServerError)
		return
	}
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
	if lexer := lexers.Match(file); lexer != nil {
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
