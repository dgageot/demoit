package flags

import "fmt"

// DevMode activates dev mode with live reload.
var DevMode *bool

// WebServerPort is the local port for presentation.
var WebServerPort *int

// WebServerHost is the host to bind the presentation web server.
var WebServerHost *string

// WebServerAddress is the address to bind the presentation web server.
func WebServerAddress() string {
	return fmt.Sprintf("%s:%d", *WebServerHost, *WebServerPort)
}
