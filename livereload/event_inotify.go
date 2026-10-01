//go:build linux

package livereload

import (
	"github.com/rjeczalik/notify"
	"golang.org/x/sys/unix"
)

func eventIsDir(event notify.EventInfo) bool {
	info, ok := event.Sys().(*unix.InotifyEvent)
	// Recursive watches are on directories; self-events omit IN_ISDIR.
	return ok && info.Mask&(unix.IN_ISDIR|unix.IN_DELETE_SELF|unix.IN_MOVE_SELF) != 0
}
