package lrserver

import (
	"encoding/json"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type conn struct {
	conn *websocket.Conn

	server    *Server
	handshake bool

	reloadChan chan string
	alertChan  chan string
	closeChan  chan closeSignal
}

func (c *conn) start() {
	go c.receive()
	go c.transmit()

	// Say hello
	err := c.conn.WriteJSON(makeServerHello(c.server.Name()))
	if err != nil {
		c.close(websocket.CloseInternalServerErr, err)
	}

	// Block until close signal is sent
	<-c.closeChan
}

func (c *conn) receive() {
	for {
		// Get next message
		msgType, reader, err := c.conn.NextReader()
		if err != nil {
			c.close(0, err)
			return
		}

		// Close if binary instead of text
		if msgType == websocket.BinaryMessage {
			c.close(websocket.CloseUnsupportedData, nil)
			return
		}

		// Close if it's not JSON
		hello := new(clientHello)
		err = json.NewDecoder(reader).Decode(hello)
		if err != nil {
			c.close(websocket.ClosePolicyViolation, err)
			return
		}

		// Close if missing a command field
		if hello.Command == "" {
			c.close(websocket.ClosePolicyViolation, nil)
		}

		// Validate handshake
		if !c.handshake {
			if !validateHello(hello) {
				c.badHandshake()
				return
			}
			c.handshake = true
			c.server.logStatus("connected")
		}
	}
}

func (c *conn) transmit() {
	for {
		var resp interface{}
		select {

		// Reload
		case file := <-c.reloadChan:
			if !c.handshake {
				c.badHandshake()
				return
			}
			resp = makeServerReload(file, c.server.LiveCSS())

		// Alert
		case msg := <-c.alertChan:
			if !c.handshake {
				c.badHandshake()
				return
			}
			resp = makeServerAlert(msg)
		}

		err := c.conn.WriteJSON(resp)
		if err != nil {
			c.close(websocket.CloseInternalServerErr, err)
			return
		}
	}
}

func (c *conn) badHandshake() {
	c.close(websocket.ClosePolicyViolation, websocket.ErrBadHandshake)
}

func (c *conn) close(closeCode int, closeErr error) error {
	var err error
	var errMsg string

	if closeErr != nil {
		errMsg = closeErr.Error()
		c.server.logError(closeErr)

		// Attempt to set close code from error message
		errMsgLen := len(errMsg)
		if errMsgLen >= 21 && errMsg[:17] == "websocket: close " {
			closeCode, _ = strconv.Atoi(errMsg[17:21])
			if errMsgLen > 21 {
				errMsg = errMsg[22:]
			}
		}
	}

	// Default close code
	if closeCode == 0 {
		closeCode = websocket.CloseNoStatusReceived
	}

	// Send close message
	closeMessage := websocket.FormatCloseMessage(closeCode, errMsg)
	deadline := time.Now().Add(time.Second)
	err = c.conn.WriteControl(websocket.CloseMessage, closeMessage, deadline)

	// Kill and remove connection
	c.closeChan <- closeSignal{}
	c.server.connSet.remove(c)
	return err
}

type connSet struct {
	conns map[*conn]struct{}
	m     sync.Mutex
}

func (cs *connSet) add(c *conn) {
	cs.m.Lock()
	cs.conns[c] = struct{}{}
	cs.m.Unlock()
}

func (cs *connSet) remove(c *conn) {
	cs.m.Lock()
	delete(cs.conns, c)
	cs.m.Unlock()
}

type closeSignal struct{}
