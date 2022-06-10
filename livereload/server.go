/*
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

// Lot's of inspiration from https://github.com/jaschaephraim/lrserver.
package livereload

import (
	_ "embed"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

//go:embed livereload.js
var js []byte

type Server struct {
	connSet  sync.Map
	upgrader websocket.Upgrader
}

func New() *Server {
	return &Server{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (s *Server) ListenAndServe() error {
	router := http.NewServeMux()
	router.HandleFunc("/livereload.js", s.js)
	router.HandleFunc("/livereload", s.webSocket)
	return http.ListenAndServe(":35729", router)
}

func (s *Server) Reload(file string) {
	s.connSet.Range(func(k, _ any) bool {
		k.(*conn).reloadChan <- file
		return true
	})
}

func (s *Server) js(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/javascript")
	if _, err := w.Write(js); err != nil {
		http.Error(w, "Unable to server livereload javascript", http.StatusInternalServerError)
	}
}

func (s *Server) webSocket(rw http.ResponseWriter, req *http.Request) {
	wsConn, err := s.upgrader.Upgrade(rw, req, nil)
	if err != nil {
		log.Println(err)
	}

	c := s.newConn(wsConn)
	go c.start()
}

func (s *Server) newConn(wsConn *websocket.Conn) *conn {
	c := &conn{
		conn:       wsConn,
		reloadChan: make(chan string),
		closeChan:  make(chan bool),
		handshake:  false,
		removeSelf: func(self *conn) { s.connSet.Delete(self) },
	}
	s.connSet.Store(c, true)
	return c
}

type conn struct {
	conn       *websocket.Conn
	removeSelf func(*conn)
	reloadChan chan string
	closeChan  chan bool
	handshake  bool
}

func (c *conn) start() {
	go c.receive()
	go c.transmit()

	if err := c.conn.WriteJSON(newServerHello()); err != nil {
		c.close(websocket.CloseInternalServerErr, err)
	}

	<-c.closeChan
}

func (c *conn) receive() {
	for {
		msgType, reader, err := c.conn.NextReader()
		if err != nil {
			c.close(websocket.CloseInternalServerErr, err)
			return
		}

		if msgType == websocket.BinaryMessage {
			c.close(websocket.CloseUnsupportedData, nil)
			return
		}

		var hello clientHello
		if err := json.NewDecoder(reader).Decode(&hello); err != nil {
			c.close(websocket.ClosePolicyViolation, err)
			return
		}

		if c.handshake {
			continue
		}

		if !validateHello(hello) {
			c.close(websocket.ClosePolicyViolation, websocket.ErrBadHandshake)
			return
		}
		c.handshake = true
	}
}

func (c *conn) transmit() {
	for {
		file := <-c.reloadChan
		if !c.handshake {
			c.close(websocket.ClosePolicyViolation, websocket.ErrBadHandshake)
			return
		}

		if err := c.conn.WriteJSON(newServerReload(file)); err != nil {
			c.close(websocket.CloseInternalServerErr, err)
			return
		}
	}
}

func (c *conn) close(code int, err error) {
	var errMsg string
	if err != nil {
		errMsg = err.Error()
	}

	c.conn.WriteControl(
		websocket.CloseMessage,
		websocket.FormatCloseMessage(code, errMsg),
		time.Now().Add(time.Second),
	)

	c.closeChan <- true
	c.removeSelf(c)
}
