/*
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

// Lot's of inspiration from https://github.com/jaschaephraim/lrserver.
package livereload

var supportedProtocols = []string{
	"http://livereload.com/protocols/official-7",
	"http://livereload.com/protocols/official-8",
	"http://livereload.com/protocols/official-9",
	"http://livereload.com/protocols/2.x-origin-version-negotiation",
	"http://livereload.com/protocols/2.x-remote-control",
}

type clientHello struct {
	Command   string   `json:"command"`
	Protocols []string `json:"protocols"`
}

func validateHello(hello clientHello) bool {
	if hello.Command != "hello" {
		return false
	}

	for _, protocol := range hello.Protocols {
		for _, supported := range supportedProtocols {
			if protocol == supported {
				return true
			}
		}
	}

	return false
}

type serverHello struct {
	Command    string   `json:"command"`
	Protocols  []string `json:"protocols"`
	ServerName string   `json:"serverName"`
}

func newServerHello() serverHello {
	return serverHello{
		Command:    "hello",
		Protocols:  supportedProtocols,
		ServerName: "LiveReload",
	}
}

type serverReload struct {
	Command string `json:"command"`
	Path    string `json:"path"`
	LiveCSS bool   `json:"liveCSS"`
}

func newServerReload(file string) serverReload {
	return serverReload{
		Command: "reload",
		Path:    file,
		LiveCSS: true,
	}
}
