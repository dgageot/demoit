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

package shell

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"github.com/yudai/gotty/backend/localcommand"
	"github.com/yudai/gotty/server"
)

func strPtr(v string) *string {
	return &v
}

// ListenAndServe starts a server for a browser based shell.
func ListenAndServe(workingDir string, port int, host string, command string, args ...string) error {
	appOptions := &server.Options{
		Port:            strconv.Itoa(port),
		Address:         host,
		PermitWrite:     true,
		Term:            "hterm",
		PermitArguments: true,
		Preferences: &server.HtermPrefernces{
			FontSize:        20,
			FontFamily:      "Inconsolata for Powerline, monaco",
			BackgroundColor: "rgb(11,40,50)",
			// ForegroundColor: "rgb(131,148,150)",
			ForegroundColor: "rgb(255, 255, 255)",
			ColorPaletteOverrides: []*string{
				strPtr("#073642"), // 30 Black
				strPtr("#dc322f"), // 31 Red
				strPtr("#859900"), // 32 Green
				strPtr("#b58900"), // 33 Yellow
				strPtr("#268bd2"), // 34 Blue
				strPtr("#d33682"), // 35 Magenta
				strPtr("#2aa198"), // 36 Cyan
				strPtr("#eee8d5"), // 37 White
				strPtr("#002b36"), // Bright Black
				strPtr("#cb4b16"), // Bright Red
				strPtr("#586e75"), // Bright Green
				strPtr("#657b83"), // Bright Yellow
				strPtr("#839496"), // Bright Blue
				strPtr("#6c71c4"), // Bright Magenta
				strPtr("#93a1a1"), // Bright Cyan
				strPtr("#fdf6e3"), // Bright White
			},
		},
	}

	backendOptions := &localcommand.Options{}
	factory, err := localcommand.NewFactory(command, args, backendOptions)
	if err != nil {
		return err
	}

	srv, err := server.New(factory, appOptions)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(context.Background())
	gCtx, gCancel := context.WithCancel(context.Background())

	errs := make(chan error, 1)
	go func() {
		errs <- srv.Run(ctx, server.WithGracefullContext(gCtx))
	}()

	err = waitSignals(errs, cancel, gCancel)
	if err != nil && err != context.Canceled {
		log.Println(err)
		os.Exit(8)
	}

	return nil
}

func waitSignals(errs chan error, cancel context.CancelFunc, gracefullCancel context.CancelFunc) error {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(
		sigChan,
		syscall.SIGINT,
		syscall.SIGTERM,
	)

	select {
	case err := <-errs:
		return err

	case s := <-sigChan:
		switch s {
		case syscall.SIGINT:
			gracefullCancel()
			fmt.Println("C-C to force close")
			select {
			case err := <-errs:
				return err
			case <-sigChan:
				fmt.Println("Force closing...")
				cancel()
				return <-errs
			}
		default:
			cancel()
			return <-errs
		}
	}
}
