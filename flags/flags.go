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

package flags

import "fmt"

// DevMode activates dev mode with live reload.
var DevMode *bool

// WebServerPort is the local port for presentation.
var WebServerPort *int

// WebServerHost is the host to bind the presentation web server.
var WebServerHost *string

// ShellPort is the local port for shell server.
var ShellPort *int

// ShellHost is the host to bind the shell server.
var ShellHost *string

// WebServerAddress is the addresse to bind the presentation web server.
func WebServerAddress() string {
	return fmt.Sprintf("%s:%d", *WebServerHost, *WebServerPort)
}

// ShellAddress is the addresse to bind the shell server.
func ShellAddress() string {
	return fmt.Sprintf("%s:%d", *ShellHost, *ShellPort)
}
