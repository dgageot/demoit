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

package templates

import "github.com/dgageot/demoit/files"

// Index is the template for the index page.
func Index(content []byte) string {
	return `<!doctype html>
    <html lang=en>
      <head>
        <meta charset="utf-8">
        <title>Demo {{ .CurrentStep }}/{{ .StepCount }}</title>
        <link rel="stylesheet" href="/style.css?hash=` + hash("style.css") + `">
        <script>
            const CurrentStep = {{ .CurrentStep }};
            const StepCount = {{ .StepCount }};
            const NextURL = '{{ .NextURL }}';
            const PrevURL = '{{ .PrevURL }}';
        </script>
      </head>
      <body>
      <div id="top">` + string(content) + `
      <nav-arrows previous="{{ .PrevURL }}" next="{{ .NextURL }}"></nav-arrows>
      </div>
      <div id="progression" style="width: calc(100vw * {{ .CurrentStep }} / {{ .StepCount }})"></div>
      </body>
      <script src="/js/demoit.js?hash=` + hash("js/demoit.js") + `"></script>
      {{ if .DevMode }}<script src="http://localhost:35729/livereload.js"></script>{{ end }}
    </html>`
}

// Ignore errors and return empty string if an error occurs.
func hash(path string) string {
	h, err := files.Sha256(path)
	if err != nil {
		return ""
	}
	return h[:10]
}
