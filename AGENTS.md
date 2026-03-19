# AGENTS.md — DemoIt

Go CLI tool for live-coding presentations. Serves an HTML slide deck with web terminals, syntax-highlighted code, QR codes, and live reload. Slides defined in `demoit.html` separated by `---`.

## Commands

```bash
go install                                # build and install
go build -o demoit                        # build locally
./demoit                                  # run on http://localhost:8888
./demoit -dev                             # live reload mode
./demoit -port 9000 -host 0.0.0.0        # custom bind
golangci-lint run -c golangci.yml ./...   # lint
docker buildx bake                        # cross-compile (darwin/linux, amd64/arm64)
# No tests exist in this project.
```

## Architecture

```
main.go            CLI flags, gorilla/mux router, starts shell + web servers
├── files/         File I/O helpers rooted at configurable Root path
├── flags/         Global CLI flag variables
├── handlers/      HTTP handlers (all routes)
│   ├── step.go        Slide parsing/rendering; VerifyConfiguration() validates setup
│   ├── code.go        Syntax-highlighted source viewer (chroma)
│   ├── shell.go       GoTTY terminal redirect with custom .bashrc/.bash_history
│   ├── static.go      Static files from .demoit/
│   ├── ping.go        HTTP HEAD proxy
│   ├── qrcode.go      QR code generation
│   ├── speakernotes.go  Speaker notes (BroadcastChannel sync)
│   ├── grid.go        Grid view of all slides
│   └── resources/     Embedded HTML templates (//go:embed)
├── livereload/    WebSocket live reload (LiveReload protocol)
├── shell/         GoTTY wrapper for browser terminals
```

## Code Conventions

- **Go 1.19**, no generics. Dependencies **vendored** (`go mod vendor` after changes).
- Templates embedded via `//go:embed`. Global state: `files.Root`, `flags.*`.
- Error handling: `http.Error()` in handlers, `log.Fatal()` at startup, `fmt.Errorf("…: %w", err)` for wrapping.
- Apache 2.0 license headers on all source files. Standard Go naming; no interfaces or DI.

## Important Notes

- GoTTY shell runs on separate port (default 9999), reverse-proxied via `/tty`.
- Presentations need `demoit.html` + `.demoit/` dir (with `style.css`, `js/demoit.js`; optional: `.bashrc`, `.bash_history`, `fonts/`, `images/`).
