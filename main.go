package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/dgageot/demoit/files"
	"github.com/dgageot/demoit/flags"
	"github.com/dgageot/demoit/handlers"
	"github.com/dgageot/demoit/livereload"
	"github.com/gorilla/mux"
	"github.com/rjeczalik/notify"
)

func main() {
	flags.DevMode = flag.Bool("dev", false, "dev mode with live reload")
	flags.WebServerPort = flag.Int("port", 8888, "presentation port")
	flags.WebServerHost = flag.String("host", "localhost", "host to bind the presentation server")
	flag.Parse()
	if args := flag.Args(); len(args) > 0 {
		files.Root = args[0]
	}

	if err := handlers.VerifyConfiguration(); err != nil {
		log.Fatal(err)
	}

	r := mux.NewRouter()
	r.HandleFunc("/{id:[0-9]*}", handlers.Step).Methods("GET")
	r.HandleFunc("/last", handlers.LastStep).Methods("GET")
	r.PathPrefix("/sourceCode/").HandlerFunc(handlers.Code).Methods("GET")
	r.HandleFunc("/shell/", handlers.Shell).Methods("GET")
	r.HandleFunc("/shell/{folder}", handlers.Shell).Methods("GET")
	r.HandleFunc("/terminal", handlers.TerminalPage).Methods("GET")
	r.HandleFunc("/ws/terminal", handlers.TerminalWebSocket)
	r.PathPrefix("/ping").HandlerFunc(handlers.Ping).Methods("HEAD", "GET")
	r.PathPrefix("/js/").HandlerFunc(handlers.Static).Methods("GET")
	r.PathPrefix("/fonts/").HandlerFunc(handlers.Static).Methods("GET")
	r.PathPrefix("/images/").HandlerFunc(handlers.Static).Methods("GET")
	r.PathPrefix("/media/").HandlerFunc(handlers.Static).Methods("GET")
	r.HandleFunc("/style.css", handlers.Static).Methods("GET")
	r.HandleFunc("/favicon.ico", handlers.Static).Methods("GET")
	r.HandleFunc("/qrcode", handlers.QRCode).Methods("GET")
	r.HandleFunc("/speakernotes", handlers.SpeakerNotes).Methods("GET")
	r.HandleFunc("/grid", handlers.Grid).Methods("GET")

	// Live Reload Server.
	if *flags.DevMode {
		lr := livereload.New(*flags.WebServerPort)
		lr.RegisterHandlers(r)

		events := make(chan notify.EventInfo, 1)
		if err := notify.Watch(files.Root+"/...", events, notify.All); err != nil {
			log.Fatal(err)
		}

		go func() {
			for event := range events {
				// TODO: Ignore files under .git
				// TODO: Debounce
				fmt.Println(event)
				lr.Reload(event.Path())
			}
		}()
	} else {
		fmt.Println(`"Dev Mode" to live reload your slides can be enabled with '--dev'`)
	}

	addr := flags.WebServerAddress()
	fmt.Println("Welcome to DemoIt. Please, open http://" + addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
