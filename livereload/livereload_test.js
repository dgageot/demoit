'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

// Load the bundled modules without bootstrapping a real browser page.
const bundle = fs.readFileSync(new URL('./livereload.js', `file://${__dirname}/`), 'utf8')
  .replace(/\[110\]\);\s*$/, '[]);');
const protocol = 'http://livereload.com/protocols/official-7';

function browser(pageURL) {
  let reloads = 0;
  const sockets = [];
  const timers = new Map();
  let timerID = 0;
  class WebSocket {
    static OPEN = 1;
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.sent = [];
      sockets.push(this);
    }
    send(message) { this.sent.push(JSON.parse(message)); }
    close() {
      this.readyState = 3;
      this.onclose({});
    }
    open() {
      this.readyState = WebSocket.OPEN;
      this.onopen({});
    }
    hello() {
      this.onmessage({ data: JSON.stringify({ command: 'hello', protocols: [protocol] }) });
    }
  }
  const src = new URL('/livereload.js?port=', pageURL).href;
  const document = {
    getElementsByTagName: () => [{ src, getAttribute: () => '/livereload.js?port=' }],
  };
  const window = {
    WebSocket, document, console,
    location: { href: pageURL, reload: () => { reloads++; } },
  };
  document.location = window.location;
  const load = vm.runInNewContext(bundle, {
    console,
    setTimeout: (callback) => { timers.set(++timerID, callback); return timerID; },
    clearTimeout: (id) => timers.delete(id),
  });
  const { LiveReload } = load(106);
  const client = new LiveReload(window);
  function reconnect() {
    assert.equal(timers.size, 1);
    const [id, callback] = timers.entries().next().value;
    timers.delete(id);
    callback();
    return sockets.at(-1);
  }
  return { client, sockets, reconnect, reloads: () => reloads };
}

for (const [page, socketURL] of [
  ['http://localhost:8888/', 'ws://localhost:8888/livereload'],
  ['http://slides.example/', 'ws://slides.example/livereload'],
  ['https://slides.example/', 'wss://slides.example/livereload'],
  ['https://slides.example:9443/', 'wss://slides.example:9443/livereload'],
  ['http://[::1]:9000/', 'ws://[::1]:9000/livereload'],
]) {
  test(`uses the external script origin: ${page}`, () => {
    const { sockets } = browser(page);
    assert.equal(sockets[0].url, socketURL);
  });
}

test('initial connection does not reload; reconnection catches missed edits', () => {
  const b = browser('http://localhost:8888/');
  b.sockets[0].open();
  b.sockets[0].hello();
  assert.equal(b.reloads(), 0);
  assert.equal(b.sockets[0].sent[1].command, 'info');
  b.sockets[0].close();
  const socket = b.reconnect();
  socket.open();
  socket.hello();
  assert.equal(b.reloads(), 1);
});

test('recovery after an initial connection failure refreshes stale content', () => {
  const b = browser('https://slides.example/');
  b.sockets[0].close();
  const socket = b.reconnect();
  socket.open();
  socket.hello();
  assert.equal(b.reloads(), 1);
});
