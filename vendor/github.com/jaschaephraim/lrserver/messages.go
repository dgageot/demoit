package lrserver

var protocols = []string{
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

func validateHello(hello *clientHello) bool {
	if hello.Command != "hello" {
		return false
	}
	for _, c := range hello.Protocols {
		for _, s := range protocols {
			if c == s {
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

func makeServerHello(name string) *serverHello {
	return &serverHello{
		"hello",
		protocols,
		name,
	}
}

type serverReload struct {
	Command string `json:"command"`
	Path    string `json:"path"`
	LiveCSS bool   `json:"liveCSS"`
}

func makeServerReload(file string, liveCSS bool) *serverReload {
	return &serverReload{
		Command: "reload",
		Path:    file,
		LiveCSS: liveCSS,
	}
}

type serverAlert struct {
	Command string `json:"command"`
	Message string `json:"message"`
}

func makeServerAlert(msg string) *serverAlert {
	return &serverAlert{
		Command: "alert",
		Message: msg,
	}
}
