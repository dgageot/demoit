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
