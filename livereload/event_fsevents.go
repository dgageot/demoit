//go:build darwin && !kqueue && cgo

package livereload

import "github.com/rjeczalik/notify"

func eventIsDir(event notify.EventInfo) bool {
	info, ok := event.Sys().(*notify.FSEvent)
	return ok && info.Flags&uint32(notify.FSEventsIsDir) != 0
}
