package lrserver

import (
	"net/http"

	"github.com/gorilla/websocket"
)

func jsHandler(s *Server) http.HandlerFunc {
	return func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set("Content-Type", "application/javascript")
		_, err := rw.Write([]byte(s.js))
		if err != nil {
			s.logError(err)
		}
	}
}

func webSocketHandler(s *Server) http.HandlerFunc {
	// Do not check origin
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	return func(rw http.ResponseWriter, req *http.Request) {
		conn, err := upgrader.Upgrade(rw, req, nil)
		if err != nil {
			s.logError(err)
			return
		}
		s.newConn(conn)
	}
}
