package shell

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

// resizeMessage is sent by the client to resize the terminal.
type resizeMessage struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(_ *http.Request) bool { return true },
}

// HandleWebSocket upgrades an HTTP connection to a WebSocket and bridges
// it to a PTY running the given shell command.
func HandleWebSocket(w http.ResponseWriter, r *http.Request, shellCommand string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}
	defer conn.Close()

	ctx := r.Context()

	// Start shell in a PTY.
	cmd := exec.CommandContext(ctx, "sh", "-c", shellCommand)
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: 24, Cols: 80})
	if err != nil {
		log.Println("PTY start failed:", err)
		return
	}
	defer func() {
		_ = ptmx.Close()
		_ = cmd.Process.Kill()
		_, _ = cmd.Process.Wait()
	}()

	var once sync.Once
	done := make(chan struct{})
	closeDone := func() { close(done) }

	// PTY → WebSocket.
	go func() {
		buf := make([]byte, 4096)
		for {
			n, readErr := ptmx.Read(buf)
			if n > 0 {
				if writeErr := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); writeErr != nil {
					once.Do(closeDone)
					return
				}
			}
			if readErr != nil {
				once.Do(closeDone)
				return
			}
		}
	}()

	// WebSocket → PTY.
	go func() {
		for {
			_, message, readErr := conn.ReadMessage()
			if readErr != nil {
				once.Do(closeDone)
				return
			}

			// Try to parse as a resize message.
			var resize resizeMessage
			if json.Unmarshal(message, &resize) == nil && resize.Type == "resize" {
				if resize.Cols > 0 && resize.Rows > 0 {
					if err := pty.Setsize(ptmx, &pty.Winsize{Rows: resize.Rows, Cols: resize.Cols}); err != nil {
						fmt.Fprintln(os.Stderr, "resize failed:", err)
					}
				}
				continue
			}

			// Otherwise it's terminal input.
			if _, err := ptmx.Write(message); err != nil {
				once.Do(closeDone)
				return
			}
		}
	}()

	<-done
}
