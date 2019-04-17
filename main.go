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

package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/dgageot/demoit/files"
	"github.com/dgageot/demoit/flags"
	"github.com/dgageot/demoit/handlers"
	"github.com/dgageot/demoit/shell"
	"github.com/gorilla/mux"
)

func main() {
	flags.DevMode = flag.Bool("dev", false, "dev mode with live reload")
	flags.WebServerPort = flag.Int("port", 8888, "presentation port")
	flags.WebServerHost = flag.String("host", "localhost", "host to bind the presentation server")
	flags.ShellPort = flag.Int("shellport", 9999, "shell server port (terminal)")
	flags.ShellHost = flag.String("shellhost", "localhost", "host to bind the the shell server (terminal)")
	flag.Parse()
	if len(flag.Args()) > 0 {
		files.Root = flag.Args()[0]
	}

	r := mux.NewRouter()
	r.HandleFunc("/{id:[0-9]*}", handlers.Step).Methods("GET")
	r.HandleFunc("/last", handlers.LastStep).Methods("GET")
	r.PathPrefix("/sourceCode/").HandlerFunc(handlers.Code).Methods("GET")
	r.HandleFunc("/shell/", handlers.Shell).Methods("GET")
	r.HandleFunc("/shell/{folder}", handlers.Shell).Methods("GET")
	r.PathPrefix("/ping").HandlerFunc(handlers.Ping).Methods("HEAD", "GET")
	r.PathPrefix("/js/").HandlerFunc(handlers.Static).Methods("GET")
	r.PathPrefix("/fonts/").HandlerFunc(handlers.Static).Methods("GET")
	r.PathPrefix("/images/").HandlerFunc(handlers.Static).Methods("GET")
	r.HandleFunc("/style.css", handlers.Static).Methods("GET")
	r.HandleFunc("/favicon.ico", handlers.Static).Methods("GET")

	// Fail fast, in case we're not in a cromulent directory
	if err := handlers.VerifyStepsFile(); err != nil {
		log.Fatalln(err)
	}

	go startWebServer(r)
	if *flags.DevMode {
		go startFileWatch(files.Root)
	}

	startShellServer(files.Root)
}

func startFileWatch(root string) {
	log.Fatal(files.Watch(root))
}

func startWebServer(r http.Handler) {
	addr := flags.WebServerAddress()

	log.Printf("Welcome to DemoIt. Please, open %s", "http://"+addr)
	if !*flags.DevMode {
		log.Printf("\"Dev Mode\" to live reload your slides can be enabled with '--dev'")
	}

	log.Fatal(http.ListenAndServe(addr, r))
}

func startShellServer(root string) {
	port := *flags.ShellPort
	host := *flags.ShellHost

	log.Fatal(shell.ListenAndServe(root, port, host, "sh", "-c"))
}
