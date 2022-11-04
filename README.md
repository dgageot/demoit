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
 + Another is a web browser view that auto refreses itself.
 + Another is a code viewer with highlighing and tabs that look like a real IDE,

## How do I use Demoit?

Documentation is really sparse right now. **The best one can do is install the tool
using the following instructions and learn from the sample.**

Basically, the idea is to:

 + Add a `demoit.html` at the root of the project. This file contains all the html slides separated with `---`.
 + Add images, fonts and scripts in a `.demoit` folder at the root of the project.
 + Customize the style sheet in `.demoit/style.css`.
 + [sample/demoit.html](sample/demoit.html) demonstrates how to use the web components.

See [Run Demo](#run-demo) for setting up and running a demo to get started with your first presentation.

## Install

### Install with Go 1.18+

```bash
go install github.com/dgageot/demoit@latest
```

*Make sure `$HOME/go/bin/` directory is in your `$PATH`.*

### Build from sources

```bash
git clone https://github.com/dgageot/demoit.git
cd demoit
go install
```

*This requires Go 1.18 or later.*

### Add shell font

To have a correct display in the web terminal, you have to install the font `Inconsolata for Powerline` on your computer.
This font can be found [here](https://github.com/powerline/fonts/tree/master/Inconsolata).

## Run Demo

```bash
cd $HOME; mkdir my_demoit_presentations; cd $HOME/my_demoit_presentations
cp -r $HOME/go/src/github.com/dgageot/demoit/sample .
demoit sample
```

Then, browse to http://localhost:8888

*Pro tip:* Run `demoit -dev sample` instead and enjoy live reload each time you change the content of the slides.

