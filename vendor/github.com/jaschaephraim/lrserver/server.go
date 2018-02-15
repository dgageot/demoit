package lrserver

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"context"

	"github.com/gorilla/websocket"
)

// Server contains a single lrserver instance's data
type Server struct {
	name      string
	port      uint16
	server    *http.Server
	connSet   *connSet
	js        string
	statusLog *log.Logger
	liveCSS   bool
}

// New creates a new Server instance
func New(name string, port uint16) *Server {
	// Create router
	router := http.NewServeMux()

	logPrefix := "[" + name + "] "

	// Create server
	s := &Server{
		name: name,
		server: &http.Server{
			Handler:  router,
			ErrorLog: log.New(os.Stderr, logPrefix, 0),
		},
		connSet:   &connSet{conns: make(map[*conn]struct{})},
		statusLog: log.New(os.Stdout, logPrefix, 0),
		liveCSS:   true,
	}
	s.setPort(port)

	// Handle JS
	router.HandleFunc("/livereload.js", jsHandler(s))

	// Handle reload requests
	router.HandleFunc("/livereload", webSocketHandler(s))

	return s
}

func (s *Server) Close() error {
	if s.server != nil {
		return s.server.Close()
	}
	return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
	if s.server != nil {
		return s.server.Shutdown(ctx)
	}
	return nil
}

func (s *Server) ListenAndServe() error {
	// Create listener
	l, err := net.Listen("tcp", makeAddr(s.port))
	if err != nil {
		return err
	}

	// Set assigned port if necessary
	if s.port == 0 {
		port, err := makePort(l.Addr().String())
		if err != nil {
			return err
		}

		s.setPort(port)
	}

	s.logStatus("listening on " + s.server.Addr)
	return s.server.Serve(l)
}

// Reload sends a reload message to the client
func (s *Server) Reload(file string) {
	s.logStatus("requesting reload: " + file)
	for conn := range s.connSet.conns {
		conn.reloadChan <- file
	}
}

// Alert sends an alert message to the client
func (s *Server) Alert(msg string) {
	s.logStatus("requesting alert: " + msg)
	for conn := range s.connSet.conns {
		conn.alertChan <- msg
	}
}

// Name gets the server name
func (s *Server) Name() string {
	return s.name
}

// Port gets the port that the server is listening on
func (s *Server) Port() uint16 {
	return s.port
}

// LiveCSS gets the live CSS preference
func (s *Server) LiveCSS() bool {
	return s.liveCSS
}

// StatusLog gets the server's status logger,
// which writes to os.Stdout by default
func (s *Server) StatusLog() *log.Logger {
	return s.statusLog
}

// ErrorLog gets the server's error logger,
// which writes to os.Stderr by default
func (s *Server) ErrorLog() *log.Logger {
	return s.server.ErrorLog
}

// SetLiveCSS sets the live CSS preference
func (s *Server) SetLiveCSS(n bool) {
	s.liveCSS = n
}

// SetStatusLog sets the server's status logger,
// which can be set to nil
func (s *Server) SetStatusLog(l *log.Logger) {
	s.statusLog = l
}

// SetErrorLog sets the server's error logger,
// which can be set to nil
func (s *Server) SetErrorLog(l *log.Logger) {
	s.server.ErrorLog = l
}

func (s *Server) setPort(port uint16) {
	s.port = port
	s.server.Addr = makeAddr(port)

	if port != 0 {
		s.js = fmt.Sprintf(js, s.port)
	}
}

func (s *Server) newConn(wsConn *websocket.Conn) {
	c := &conn{
		conn: wsConn,

		server:    s,
		handshake: false,

		reloadChan: make(chan string),
		alertChan:  make(chan string),
		closeChan:  make(chan closeSignal),
	}
	s.connSet.add(c)
	go c.start()
}

func (s *Server) logStatus(msg ...interface{}) {
	if s.statusLog != nil {
		s.statusLog.Println(msg...)
	}
}

func (s *Server) logError(msg ...interface{}) {
	if s.server.ErrorLog != nil {
		s.server.ErrorLog.Println(msg...)
	}
}

// makeAddr converts uint16(x) to ":x"
func makeAddr(port uint16) string {
	return fmt.Sprintf(":%d", port)
}

// makePort converts ":x" to uint16(x)
func makePort(addr string) (uint16, error) {
	_, portString, err := net.SplitHostPort(addr)
	if err != nil {
		return 0, err
	}

	port64, err := strconv.ParseUint(portString, 10, 16)
	if err != nil {
		return 0, err
	}
	return uint16(port64), nil
}
