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
	"fmt"
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
	flags.ShellPort = flag.Int("shellport", 9999, "shell server port (terminal)")
	flag.Parse()
	if len(flag.Args()) > 0 {
		files.Root = flag.Args()[0]
	}

	r := mux.NewRouter()
	r.HandleFunc("/{id:[0-9]*}", handlers.Step).Methods("GET")
	r.PathPrefix("/sourceCode/").HandlerFunc(handlers.Code).Methods("GET")
	r.HandleFunc("/shell/", handlers.Shell).Methods("GET")
	r.HandleFunc("/shell/{folder}", handlers.Shell).Methods("GET")
	r.PathPrefix("/ping").HandlerFunc(handlers.Ping).Methods("HEAD", "GET")
	r.PathPrefix("/js/").HandlerFunc(handlers.Static).Methods("GET")
	r.PathPrefix("/fonts/").HandlerFunc(handlers.Static).Methods("GET")
	r.PathPrefix("/images/").HandlerFunc(handlers.Static).Methods("GET")
	r.HandleFunc("/style.css", handlers.Static).Methods("GET")

	go startWebServer(*flags.WebServerPort, r)
	if *flags.DevMode {
		go startFileWatch(files.Root)
	}

	startShellServer(*flags.ShellPort, files.Root)
}

func startFileWatch(root string) {
	log.Fatal(files.Watch(root))
}

func startWebServer(port int, r http.Handler) {
	log.Printf("Welcome to DemoIt. Please, open http://localhost:%d", port)
	if !*flags.DevMode {
		log.Printf("\"Dev Mode\" to live reload your slides can be enabled with '--dev'")
	}
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), r))
}

func startShellServer(port int, root string) {
	log.Fatal(shell.ListenAndServe(root, port, "sh", "-c"))
}
