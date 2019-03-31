/*
Copyright 2019 Google LLC

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
	"html/template"
	"net/http"

	"github.com/dgageot/demoit/files"
)

// Grid displays a grid view of all steps as iframes.
//
// This has the nice side-effect of warming the browser cache with all
// necessary resources. Otherwise the speaker and their audience may
// experience a lag between each step, while image resources are loading,
// especially if the DemoIt server is remote (not localhost).
func Grid(w http.ResponseWriter, r *http.Request) {
	steps, err := readSteps(files.Root)
	if err != nil {
		http.Error(w, fmt.Sprintf("Unable to read steps: %v", err), http.StatusInternalServerError)
		return
	}

	gridTemplate, err := template.New("grid").Parse(gridTmpl)
	if err != nil {
		http.Error(w, "Unable to parse grid page", http.StatusInternalServerError)
		return
	}
	var html bytes.Buffer
	err = gridTemplate.Execute(&html, steps)
	if err != nil {
		http.Error(w, "Unable to render grid view", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	html.WriteTo(w)
}

const gridTmpl = `
<!DOCTYPE html>
<html>
	<head>
		<link rel="stylesheet" href="/style.css">
        <style>
			.cell {
				display: inline-block;
				overflow: hidden;
				margin: 1rem;
				width: 480px;
				/*
				height: 270px;
				*/
			}
			.thumb {
				overflow: hidden;
				display: inline-block;
				position: relative;
				width: 480px;
				height: 270px;
				border: 1px solid #BBB;
			}
            .thumb iframe {
				width: 1920px;
				height: 1080px;
				transform: scale(0.25);
				transform-origin: 0 0;
            }
        </style>
    </head>
<body>
<title>DemoIt grid view</title>

<h2><a href="/">Start presentation</a></h2>

{{range $i, $step := .}}
	<div class="cell">
		<a href="/{{$i}}">Step {{$i}}</a>
		<div class="thumb">
			<iframe src="/{{$i}}"></iframe>
		</div>
	</div>
{{end}}

</body>
</html>
`
