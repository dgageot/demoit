package livereload

import (
	"bufio"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"
)

func testServer(t *testing.T) (*Server, string, <-chan *conn, <-chan struct{}) {
	t.Helper()
	return testServerWith(t, New(8888))
}

func testServerWith(t *testing.T, s *Server) (*Server, string, <-chan *conn, <-chan struct{}) {
	t.Helper()
	connections := make(chan *conn, 32)
	finished := make(chan struct{}, 32)
	h := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ws, err := s.upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		c := s.newConn(ws)
		connections <- c
		c.start()
		finished <- struct{}{}
	}))
	t.Cleanup(h.Close)
	return s, "ws" + strings.TrimPrefix(h.URL, "http"), connections, finished
}

func dialClient(t *testing.T, url string) *websocket.Conn {
	t.Helper()
	ws, response, err := websocket.DefaultDialer.DialContext(t.Context(), url, nil)
	if response != nil {
		_ = response.Body.Close()
	}
	require.NoError(t, err)
	t.Cleanup(func() { _ = ws.Close() })
	require.NoError(t, ws.SetReadDeadline(time.Now().Add(3*time.Second)))
	var hello serverHello
	require.NoError(t, ws.ReadJSON(&hello))
	require.Equal(t, newServerHello(), hello)
	return ws
}

func sendHello(t *testing.T, ws *websocket.Conn) {
	t.Helper()
	require.NoError(t, ws.WriteJSON(clientHello{Command: "hello", Protocols: supportedProtocols}))
}

func readReload(t *testing.T, ws *websocket.Conn, path string) {
	t.Helper()
	require.NoError(t, ws.SetReadDeadline(time.Now().Add(3*time.Second)))
	var message serverReload
	require.NoError(t, ws.ReadJSON(&message))
	require.Equal(t, newServerReload(path), message)
}

func waitFinished(t *testing.T, finished <-chan struct{}) {
	t.Helper()
	select {
	case <-finished:
	case <-time.After(3 * time.Second):
		t.Fatal("connection goroutines did not stop")
	}
}

func TestReloadDuringHandshake(t *testing.T) {
	s, url, connections, finished := testServer(t)
	ws := dialClient(t, url)
	c := <-connections
	s.Reload("style.css")
	s.Reload("js/demoit.js")
	sendHello(t, ws)
	readReload(t, ws, fullReloadPath)

	// Later messages from the browser must not reset the handshake.
	require.NoError(t, ws.WriteJSON(map[string]string{"command": "info", "url": url}))
	s.Reload("style.css")
	readReload(t, ws, "style.css")
	require.NoError(t, ws.Close())
	waitFinished(t, finished)
	_, exists := s.connSet.Load(c)
	require.False(t, exists)
}

func TestReloadDoesNotWaitForClients(t *testing.T) {
	s := New(8888)
	stalled := s.newConn(nil)
	done := make(chan struct{})
	go func() {
		for range 10000 {
			s.Reload("style.css")
			s.Reload("demoit.html")
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("broadcast waited for a stalled client")
	}
	require.Equal(t, fullReloadPath, stalled.pending)
	close(stalled.done)
	s.connSet.Delete(stalled)
	stalled.enqueue("ignored.css")
	require.Equal(t, fullReloadPath, stalled.pending)
}

func TestStalledHandshakeDoesNotBlockHealthyClient(t *testing.T) {
	s, url, connections, finished := testServer(t)
	stalled := dialClient(t, url)
	<-connections
	healthy := dialClient(t, url)
	<-connections
	sendHello(t, healthy)
	s.Reload("style.css")
	readReload(t, healthy, "style.css")
	require.NoError(t, healthy.Close())
	require.NoError(t, stalled.Close())
	waitFinished(t, finished)
	waitFinished(t, finished)
}

type failWrites struct {
	net.Conn
	fail bool
}

func (c *failWrites) Write(data []byte) (int, error) {
	if c.fail {
		return 0, errors.New("injected write failure")
	}
	return c.Conn.Write(data)
}

type failingHijacker struct {
	http.ResponseWriter
	connection *failWrites
}

func (w *failingHijacker) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("hijacking unavailable")
	}
	conn, buffer, err := hijacker.Hijack()
	w.connection = &failWrites{Conn: conn}
	return w.connection, buffer, err
}

func TestFailedHelloWriteStopsConnection(t *testing.T) {
	s := New(8888)
	connections := make(chan *conn, 1)
	finished := make(chan struct{}, 1)
	h := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		failing := &failingHijacker{ResponseWriter: w}
		ws, err := s.upgrader.Upgrade(failing, r, nil)
		if err != nil {
			return
		}
		// Deadline setup succeeds; the initial server hello specifically fails.
		failing.connection.fail = true
		c := s.newConn(ws)
		connections <- c
		c.start()
		finished <- struct{}{}
	}))
	defer h.Close()
	ws, response, err := websocket.DefaultDialer.DialContext(t.Context(), "ws"+strings.TrimPrefix(h.URL, "http"), nil)
	if response != nil {
		_ = response.Body.Close()
	}
	require.NoError(t, err)
	defer ws.Close()
	c := <-connections
	waitFinished(t, finished)
	_, exists := s.connSet.Load(c)
	require.False(t, exists)
	s.Reload("demoit.html")
}

func TestInvalidHelloStopsConnection(t *testing.T) {
	for _, command := range []string{"info", "hello"} {
		t.Run(command, func(t *testing.T) {
			_, url, connections, finished := testServer(t)
			ws := dialClient(t, url)
			<-connections
			require.NoError(t, ws.WriteJSON(clientHello{Command: command, Protocols: []string{"unsupported"}}))
			_, _, err := ws.ReadMessage()
			require.True(t, websocket.IsCloseError(err, websocket.ClosePolicyViolation), "%v", err)
			waitFinished(t, finished)
		})
	}
}

func TestConcurrentReloadAndDisconnect(t *testing.T) {
	s, url, connections, finished := testServer(t)
	var broadcasts sync.WaitGroup
	for range 4 {
		broadcasts.Go(func() {
			for range 1000 {
				s.Reload("demoit.html")
			}
		})
	}
	for range 10 {
		ws := dialClient(t, url)
		<-connections
		sendHello(t, ws)
		s.Reload("demoit.html")
		readReload(t, ws, "demoit.html")
		require.NoError(t, ws.Close())
		waitFinished(t, finished)
	}
	broadcasts.Wait()
	s.connSet.Range(func(_, _ any) bool {
		t.Error("disconnected connection still registered")
		return true
	})
}

func TestRegisterHandlers(t *testing.T) {
	s := New(9000)
	router := mux.NewRouter()
	s.RegisterHandlers(router)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/livereload.js?port=", nil))
	require.Equal(t, http.StatusOK, response.Code)
	require.Equal(t, "application/javascript", response.Header().Get("Content-Type"))
	require.Contains(t, response.Body.String(), "var port = 9000;")
}

func TestConnectionReadTimeouts(t *testing.T) {
	for _, handshaken := range []bool{false, true} {
		name := "handshake"
		if handshaken {
			name = "pong"
		}
		t.Run(name, func(t *testing.T) {
			s := New(8888)
			s.timeouts.handshake = 100 * time.Millisecond
			s.timeouts.pong = 100 * time.Millisecond
			s.timeouts.ping = 20 * time.Millisecond
			_, url, connections, finished := testServerWith(t, s)
			ws := dialClient(t, url)
			c := <-connections
			if handshaken {
				sendHello(t, ws)
			}
			// Do not read after the hello: this also prevents answering pings.
			waitFinished(t, finished)
			_, exists := s.connSet.Load(c)
			require.False(t, exists)
		})
	}
}

func TestSlowWriterDoesNotBlockHealthyClient(t *testing.T) {
	s := New(8888)
	s.timeouts.write = 100 * time.Millisecond
	_, url, connections, finished := testServerWith(t, s)
	stalled := dialClient(t, url)
	slow := <-connections
	sendHello(t, stalled)
	healthy := dialClient(t, url)
	fast := <-connections
	sendHello(t, healthy)
	// A large reload saturates the non-reading connection's network buffers.
	// Queue it only for that client so the healthy client keeps small messages.
	slow.enqueue(strings.Repeat("x", 16<<20))
	fast.enqueue("style.css")
	readReload(t, healthy, "style.css")
	waitFinished(t, finished)
	_, exists := s.connSet.Load(slow)
	require.False(t, exists)
	require.NoError(t, healthy.Close())
	waitFinished(t, finished)
}
