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

package shell

import (
	"context"
	"strconv"

	"github.com/sorenisanerd/gotty/backend/localcommand"
	"github.com/sorenisanerd/gotty/server"
)

// ListenAndServe starts a server for a browser based shell.
func ListenAndServe(port int, command string, args ...string) error {
	factory, err := localcommand.NewFactory(command, args, &localcommand.Options{})
	if err != nil {
		return err
	}

	options := &server.Options{
		Port:            strconv.Itoa(port),
		Address:         "127.0.0.1",
		Path:            "/tty/",
		PermitWrite:     true,
		PermitArguments: true,
	}
	srv, err := server.New(factory, options)
	if err != nil {
		return err
	}

	return srv.Run(context.Background())
}
