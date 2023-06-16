# DemoIt

**DemoIt** is a tool that helps you create beautiful live-coding demonstrations.

## Why?

I'm doing lots of live-coding during conferences and I like tools like
[reveal.js](https://revealjs.com/) to create slides. What I wanted was a
tool that has some of the properties of reveal.js but with
capabilities to code and run commands in front of the audience.

Two things are really important to me:
 + For a given presentation, the slides should live in the same repository as the code.
 + The tool should allow context-switching-less live coding demos.
Attendees don't want to watch me switching between a browser, an IDE and a
terminal all the time.

This is how I came up with **DemoIt**.

## How?

**DemoIt** is a small command line tool written in Go. It serves
rich web content composed of text, images and smart web components.

Those web components make most of the *magic*.

 + One component displays multi-tab ttys that can be used to run any command.
 + Another is a web browser view that auto refreshes itself.
 + Another is a code viewer with highlighing and tabs that looks like a real IDE,

## Install

### Download binary from GitHub

```bash
curl -L -odemoit https://github.com/dgageot/demoit/releases/download/v1.0/demoit-`uname -s | tr '[:upper:]' '[:lower:]'`-`uname -m`
sudo install demoit /usr/local/bin/demoit
```

### Add shell font

To have a correct display in the web terminal, it's better to install the font `Inconsolata for Powerline` on your computer.
This font can be found [here](https://github.com/powerline/fonts/tree/master/Inconsolata).

## Get started from a Sample

```bash
# Create an empty directory
cd $HOME; mkdir my-demoit-presentation; cd $HOME/my-demoit-presentation
# Download a sample demo
curl -L https://github.com/dgageot/demoit/archive/master.tar.gz | tar xvf - --strip-components=2 demoit-master/sample
# Run demoit
demoit
```

Then, browse to http://localhost:8888

*Pro tip:* Run `demoit -dev` instead and enjoy live reload each time you change the content of the slides.

### How do I customize my presentation then?

Basically, the idea is to:

 + Write content in `demoit.html` at the root of the project. This file contains all the html slides separated with `---`.
 + Add images, fonts and scripts in the `.demoit` folder at the root of the project.
 + Customize the style sheet in `.demoit/style.css`.

## Contribute

### Build from sources

```bash

git clone https://github.com/dgageot/demoit.git
cd demoit
go install
```

*This requires Go 1.19 or later.*

