// Lot's of inspiration from https://github.com/jaschaephraim/lrserver.
package livereload

import "slices"

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
		if slices.Contains(supportedProtocols, protocol) {
			return true
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
