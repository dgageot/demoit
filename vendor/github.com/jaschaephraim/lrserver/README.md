# `lrserver` LiveReload server for Go #

Golang package that implements a simple LiveReload server as described in the [LiveReload protocol](http://feedback.livereload.com/knowledgebase/articles/86174-livereload-protocol).

Using the recommended default port 35729:

- `http://localhost:35729/livereload.js` serves the LiveReload client JavaScript (https://github.com/livereload/livereload-js)

- `ws://localhost:35729/livereload` communicates with the client via web socket.

File watching must be implemented by your own application, and reload/alert
requests sent programmatically.

Multiple servers can be instantiated, and each can support multiple connections.

## Full Documentation: [![GoDoc](https://godoc.org/github.com/jaschaephraim/lrserver?status.svg)](http://godoc.org/github.com/jaschaephraim/lrserver) ##

## Basic Usage ##

### Get Package ###

```bash
go get github.com/jaschaephraim/lrserver
```

### Import Package ###

```go
import "github.com/jaschaephraim/lrserver"
```

### Instantiate Server ###

```go
lr := lrserver.New(lrserver.DefaultName, lrserver.DefaultPort)
```

### Start Server ###

```go
go func() {
    err := lr.ListenAndServe()
    if err != nil {
        // Handle error
    }
}()
```

### Send Messages to the Browser ###

```go
lr.Reload("file")
lr.Alert("message")
```

## Example ##

```go
import (
    "log"
    "net/http"

    "github.com/jaschaephraim/lrserver"
    "gopkg.in/fsnotify.v1"
)

// html includes the client JavaScript
const html = `<!doctype html>
<html>
<head>
  <title>Example</title>
</head>
<body>
  <script src="http://localhost:35729/livereload.js"></script>
</body>
</html>`

func Example() {
    // Create file watcher
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        log.Fatalln(err)
    }
    defer watcher.Close()

    // Add dir to watcher
    err = watcher.Add("/path/to/watched/dir")
    if err != nil {
        log.Fatalln(err)
    }

    // Create and start LiveReload server
    lr := lrserver.New(lrserver.DefaultName, lrserver.DefaultPort)
    go lr.ListenAndServe()

    // Start goroutine that requests reload upon watcher event
    go func() {
        for {
            select {
            case event := <-watcher.Events:
                lr.Reload(event.Name)
            case err := <-watcher.Errors:
                log.Println(err)
            }
        }
    }()

    // Start serving html
    http.HandleFunc("/", func(rw http.ResponseWriter, req *http.Request) {
        rw.Write([]byte(html))
    })
    http.ListenAndServe(":3000", nil)
}
```
