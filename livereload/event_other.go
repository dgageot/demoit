//go:build (darwin && (kqueue || !cgo)) || (!darwin && !linux)

package livereload

import (
	"os"

	"github.com/rjeczalik/notify"
)

func eventIsDir(event notify.EventInfo) bool {
	info, err := os.Lstat(event.Path())
	return err == nil && info.IsDir()
}
