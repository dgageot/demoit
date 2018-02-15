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
	"net/http"
	"strconv"
	"strings"

	"github.com/alecthomas/chroma"
	"github.com/alecthomas/chroma/formatters/html"
	"github.com/alecthomas/chroma/lexers"
	"github.com/alecthomas/chroma/styles"
	"github.com/dgageot/demoit/files"
)

// Code returns the content of a source file.
func Code(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/sourceCode/")

	if !files.Exists(filename) {
		http.NotFound(w, r)
		return
	}

	lexer := lexer(filename)
	style := style(r.FormValue("style"))
	lines := highligtedLines(r)
	formatter := html.New(html.Standalone(), html.WithLineNumbers(), html.HighlightLines(lines), html.WithClasses())

	contents, err := files.Read(filename)
	if err != nil {
		http.Error(w, "Unable to read "+filename, 500)
		return
	}

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
	var updated []*chroma.Token

	iterator, err := n.Lexer.Tokenise(nil, text)
	if err != nil {
		return nil, err
	}

	for _, token := range iterator.Tokens() {
		if token.Type != chroma.Text {
			updated = append(updated, token)
			continue
		}

		value := token.Value
		position := strings.Index(value, ":")
		if position == -1 {
			updated = append(updated, token)
			continue
		}

		k := value[0 : position+1]
		v := value[position+1:]
		updated = append(updated, &chroma.Token{
			Type:  chroma.Text,
			Value: k,
		})
		updated = append(updated, &chroma.Token{
			Type:  chroma.StringSymbol,
			Value: v,
		})
	}

	return chroma.Literator(updated...), nil
}

func lexer(file string) chroma.Lexer {
	lexer := lexers.Match(file)
	if lexer != nil {
		if strings.HasSuffix(file, ".yaml") || strings.HasSuffix(file, ".yml") {
			fmt.Println("Using non default YAML Lexer")
			return &nonDefaultYAMLLexer{lexers.Fallback}
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
