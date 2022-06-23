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

package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

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
	flag.Parse()
	if args := flag.Args(); len(args) > 0 {
		files.Root = args[0]
	}

	if err := handlers.VerifyConfiguration(); err != nil {
		log.Fatal(err)
	}

	go startWebServer()
	if *flags.DevMode {
		go startFileWatcher(files.Root)
	} else {
		fmt.Println(`"Dev Mode" to live reload your slides can be enabled with '--dev'`)
	}

	startShellServer(files.Root)
}

func startWebServer() {
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
	r.PathPrefix("/media/").HandlerFunc(handlers.Static).Methods("GET")
	r.HandleFunc("/style.css", handlers.Static).Methods("GET")
	r.HandleFunc("/favicon.ico", handlers.Static).Methods("GET")
	r.HandleFunc("/qrcode", handlers.QRCode).Methods("GET")
	r.HandleFunc("/pdf", handlers.ExportToPDF).Methods("GET")
	r.HandleFunc("/speakernotes", handlers.SpeakerNotes).Methods("GET")
	r.HandleFunc("/grid", handlers.Grid).Methods("GET")
	r.HandleFunc("/beta/vscode/{folder}", handlers.VSCode).Methods("GET")
	proxy := httputil.NewSingleHostReverseProxy(mustParseURL(fmt.Sprintf("http://127.0.0.1:%d", *flags.ShellPort)))
	r.PathPrefix("/tty").HandlerFunc(proxy.ServeHTTP)

	addr := flags.WebServerAddress()
	fmt.Println("Welcome to DemoIt. Please, open http://" + addr)
	log.Fatal(http.ListenAndServe(addr, r))
}

func startFileWatcher(root string) {
	log.Fatal(files.Watch(root))
}

func startShellServer(root string) {
	port := *flags.ShellPort

	log.Fatal(shell.ListenAndServe(port, "sh", "-c"))
}

func mustParseURL(rawURL string) *url.URL {
	url, err := url.Parse(rawURL)
	if err != nil {
		panic(err)
	}
	return url
}
