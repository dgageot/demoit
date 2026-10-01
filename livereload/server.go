// Package livereload serves the LiveReload protocol and browser client.
package livereload

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

//go:embed livereload.js
var js []byte

const (
	writeTimeout     = 5 * time.Second
	handshakeTimeout = 5 * time.Second
	pongTimeout      = 60 * time.Second
	pingInterval     = 30 * time.Second
	fullReloadPath   = "demoit.html"
)

type connTimeouts struct {
	write     time.Duration
	handshake time.Duration
	pong      time.Duration
	ping      time.Duration
}

type Server struct {
	script   []byte
	connSet  sync.Map
	upgrader websocket.Upgrader
	timeouts connTimeouts
}

func New(port int) *Server {
	return &Server{
		timeouts: connTimeouts{write: writeTimeout, handshake: handshakeTimeout, pong: pongTimeout, ping: pingInterval},
		script:   bytes.ReplaceAll(js, []byte("35729"), []byte(strconv.Itoa(port))),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (s *Server) RegisterHandlers(router *mux.Router) {
	router.HandleFunc("/livereload.js", s.js)
	router.HandleFunc("/livereload", s.webSocket)
}

// Reload queues a change without waiting for any browser's network connection.
func (s *Server) Reload(file string) {
	s.connSet.Range(func(k, _ any) bool {
		if c, ok := k.(*conn); ok {
			c.enqueue(file)
		}
		return true
	})
}

func (s *Server) js(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/javascript")
	if _, err := w.Write(s.script); err != nil {
		http.Error(w, "Unable to serve livereload javascript", http.StatusInternalServerError)
	}
}

func (s *Server) webSocket(rw http.ResponseWriter, req *http.Request) {
	wsConn, err := s.upgrader.Upgrade(rw, req, nil)
	if err != nil {
		log.Println(err)
		return
	}

	c := s.newConn(wsConn)
	c.start()
}

func (s *Server) newConn(wsConn *websocket.Conn) *conn {
	c := &conn{
		conn:       wsConn,
		timeouts:   s.timeouts,
		reloadChan: make(chan struct{}, 1),
		done:       make(chan struct{}),
		removeSelf: func(self *conn) { s.connSet.Delete(self) },
	}
	s.connSet.Store(c, true)
	return c
}

type conn struct {
	timeouts   connTimeouts
	conn       *websocket.Conn
	removeSelf func(*conn)
	reloadChan chan struct{}
	done       chan struct{}
	closeOnce  sync.Once
	pendingMu  sync.Mutex
	pending    string
}

func (c *conn) enqueue(file string) {
	select {
	case <-c.done:
		return
	default:
	}

	c.pendingMu.Lock()
	c.pending = mergeReload(c.pending, file)
	c.pendingMu.Unlock()
	select {
	case c.reloadChan <- struct{}{}:
	default:
	}
}

// Different assets need a page refresh so coalescing never loses a change.
func mergeReload(pending, file string) string {
	if pending == "" || pending == file {
		return file
	}
	return fullReloadPath
}

func (c *conn) start() {
	defer c.close(websocket.CloseNormalClosure)
	c.conn.SetReadLimit(64 * 1024)
	if err := c.conn.SetReadDeadline(time.Now().Add(c.timeouts.handshake)); err != nil {
		return
	}
	if err := c.write(newServerHello()); err != nil {
		return
	}

	msgType, reader, err := c.conn.NextReader()
	if err != nil {
		return
	}
	if msgType != websocket.TextMessage {
		c.close(websocket.CloseUnsupportedData)
		return
	}
	var hello clientHello
	if err := json.NewDecoder(reader).Decode(&hello); err != nil || !validateHello(hello) {
		c.close(websocket.ClosePolicyViolation)
		return
	}

	if err := c.conn.SetReadDeadline(time.Now().Add(c.timeouts.pong)); err != nil {
		return
	}
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(c.timeouts.pong))
	})
	readerDone := make(chan struct{})
	go func() {
		defer close(readerDone)
		c.receive()
	}()
	c.transmit()
	c.close(websocket.CloseNormalClosure)
	<-readerDone
}

func (c *conn) receive() {
	defer c.close(websocket.CloseNormalClosure)
	for {
		var message clientHello
		if err := c.conn.ReadJSON(&message); err != nil {
			return
		}
	}
}

func (c *conn) transmit() {
	ping := time.NewTicker(c.timeouts.ping)
	defer ping.Stop()
	for {
		select {
		case <-c.done:
			return
		case <-c.reloadChan:
			c.pendingMu.Lock()
			file := c.pending
			c.pending = ""
			c.pendingMu.Unlock()
			if file != "" {
				if err := c.write(newServerReload(file)); err != nil {
					return
				}
			}
		case <-ping.C:
			if err := c.conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(c.timeouts.write)); err != nil {
				return
			}
		}
	}
}

func (c *conn) write(message any) error {
	if err := c.conn.SetWriteDeadline(time.Now().Add(c.timeouts.write)); err != nil {
		return err
	}
	return c.conn.WriteJSON(message)
}

func (c *conn) close(code int) {
	c.closeOnce.Do(func() {
		close(c.done)
		c.removeSelf(c)
		_ = c.conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(code, ""), time.Now().Add(time.Second))
		_ = c.conn.Close()
	})
}
