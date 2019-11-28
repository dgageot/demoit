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
	"fmt"
	"net/http"

	"github.com/dgageot/demoit/files"
)

// SpeakerNotes provides the presenter view, which depends on the main window to
// be able to display the "current" slide with notes.
func SpeakerNotes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, speakerNotesPage)
}

// This is a static page.
// By having it in the Go source code, we don't need to ship it in every
// presentation's .demoit folder.
var speakerNotesPage = `
<!doctype html>
<head>
	<meta charset="utf-8">
	<title>Notes</title>
	<link rel="stylesheet" href="/style.css?hash=` + hash("style.css") + `">
</head>
<body>
	<div id="speaker-notes-progress"></div>
	<div id="current-slide-title"></div>
	<div id="speaker-notes">
		<div id="speaker-notes-contents">
			No <a href="/" target="_blank">presentation window</a> is currently shown.
		</div>
	<div>
</body>
<script>
	const viewer = document.getElementById("speaker-notes-contents");
	const progress = document.getElementById("speaker-notes-progress");
	const title = document.getElementById("current-slide-title");
	let currentSlideId;
	let stepCount;
	const channel = new BroadcastChannel("demoit_nav");

	// The Speaker Notes pages doesn't know yet which slide is current.
	// Its asks the "main presentation window".
	console.debug("Asking for slide ID");
	channel.postMessage("ask");

	channel.onmessage = function(e) {
		console.debug("Received ", e.data);
		if(e.data.hasOwnProperty("currentSlideId") ) {
			currentSlideId = e.data.currentSlideId;
			if(e.data.stepCount) {
				stepCount = e.data.stepCount;
				progress.innerText = currentSlideId + " / " + stepCount;
			} else {
				progress.innerText = currentSlideId;
			}
		}
		if(e.data.hasOwnProperty("currentSlideTitle") ) {
			title.innerHTML = e.data.currentSlideTitle;
		}
		
		if(e.data.speakerNotes) {
			viewer.innerHTML = e.data.speakerNotes;
			viewer.style.fontSize = fontSizeFor(viewer.innerHTML);
		}else{
			viewer.innerHTML = "";
		}
	}

	// Capture keydown events, and notify main tab accordingly
	document.addEventListener('keydown', event => {
		switch (event.key) {
			case 'ArrowRight':
			case 'PageDown':
			case ' ':
				currentSlideId = Math.min(currentSlideId+1, stepCount);
				console.debug("BroadcastChannel post [" + currentSlideId + "]");
				channel.postMessage({destinationSlideId: currentSlideId});
				break;
			case 'ArrowLeft':
			case 'PageUp':
				currentSlideId = Math.max(0, currentSlideId-1);
				console.debug("BroadcastChannel post [" + currentSlideId + "]");
				channel.postMessage({destinationSlideId: currentSlideId});
				break;
			default:
				return;
		}
	});

	// Big font for short speaker notes,
	// small font for long speaker notes.
	function fontSizeFor(html) {
		// Note that the number of character of text is not the same
		// as the HTML source length.
		let x = 2.5;
		if(html.length < 500)
			x = 3.5;
		if(html.length < 300)
			x = 5;
		if(html.length < 200)
			x = 6;
		if(html.length < 120)
			x = 8;
		if(html.length < 60)
			x = 12;
		if(html.length < 30)
			x = 15;
		return x + "vw";
	}
</script>
`

// Ignore errors and return empty string if an error occurs.
func hash(path string) string {
	h, err := files.Sha256(path)
	if err != nil {
		return ""
	}
	return h[:10]
}
