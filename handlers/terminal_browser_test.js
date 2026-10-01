'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const chrome = process.env.CHROME_BIN || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
].find(file => fs.existsSync(file));

// Exercise the shipped module and WASM in an iframe, not a mock emulator.
test('terminal mouse, wheel, selection, and scrollback in Chromium', {
  skip: !chrome || typeof WebSocket === 'undefined', timeout: 30000,
}, async t => {
  const html = fs.readFileSync(path.join(__dirname, 'resources/terminal.html'), 'utf8')
    .replace('<script type="module">', `<script>
      window.WebSocket = class {
        static OPEN = 1;
        constructor() {
          this.readyState = 1;
          this.sent = [];
          window.socket = this;
          setTimeout(() => this.onopen(), 0);
        }
        send(data) { this.sent.push(data); }
      };
    </script><script type="module">`)
    .replace('term.open(container);', 'window.term = term; term.open(container);');
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/terminal-assets/')) {
      const name = path.basename(req.url);
      if (!['ghostty-web.js', 'ghostty-vt.wasm'].includes(name)) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
      res.end(fs.readFileSync(path.join(__dirname, 'resources/ghostty-web', name)));
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(req.url.startsWith('/terminal') ? html :
        '<button id="other" autofocus>Other control</button>' +
        '<iframe src="/terminal" style="width:800px;height:500px"></iframe>' +
        '<iframe src="/terminal" style="width:800px;height:500px"></iframe>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const profile = await mkdtemp(path.join(os.tmpdir(), 'demoit-terminal-browser-'));
  const browser = spawn(chrome, [
    '--headless', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  t.after(async () => {
    if (browser.pid && browser.exitCode === null && browser.signalCode === null) {
      await new Promise(resolve => {
        browser.once('exit', resolve);
        browser.kill();
      });
    }
    await rm(profile, { recursive: true, force: true });
  });
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = '';
    browser.once('error', reject);
    browser.once('exit', code => reject(new Error(`Chromium exited ${code}: ${stderr}`)));
    browser.stderr.on('data', chunk => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
  });
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  t.after(() => socket.close());
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const targets = await send('Target.getTargets');
  const targetId = targets.targetInfos.find(target => target.type === 'page').targetId;
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` }, sessionId);
  await evaluate(`new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const frames = [...document.querySelectorAll('iframe')];
      if (frames.length && frames.every(frame => frame.contentWindow.socket?.sent.length)) {
        clearInterval(timer); resolve();
      }
      else if (Date.now() - start > 10000) { clearInterval(timer); reject(new Error('Terminal did not initialize')); }
    }, 20);
  })`);
  assert.equal(await evaluate(`document.activeElement.id`), 'other');
  // Native input also exercises focus transitions between distinct iframes.
  for (const index of [1, 0]) {
    const point = await evaluate(`(() => {
      const frames = [...document.querySelectorAll('iframe')];
      for (const frame of frames) frame.contentWindow.socket.sent.length = 0;
      const frame = frames[${index}];
      frame.scrollIntoView();
      const rect = frame.getBoundingClientRect();
      return { x: rect.left + frame.clientLeft + 20, y: rect.top + frame.clientTop + 20 };
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }, sessionId);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }, sessionId);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', text: 'a' }, sessionId);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA' }, sessionId);
    const focus = await evaluate(`(() => {
      const frames = [...document.querySelectorAll('iframe')];
      return { active: frames.indexOf(document.activeElement),
        input: frames.map(frame => frame.contentWindow.socket.sent.filter(data => data === 'a')) };
    })()`);
    assert.equal(focus.active, index);
    assert.deepEqual(focus.input[index], ['a']);
    assert.deepEqual(focus.input[1 - index], []);
  }
  const wheelPoint = await evaluate(`(() => {
    const frame = document.querySelector('iframe');
    frame.scrollIntoView();
    document.getElementById('other').focus();
    const rect = frame.getBoundingClientRect();
    return { x: rect.left + frame.clientLeft + 20, y: rect.top + frame.clientTop + 20 };
  })()`);
  await send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', deltaX: 0, deltaY: 100, ...wheelPoint,
  }, sessionId);
  assert.equal(await evaluate(`new Promise(resolve => setTimeout(() => {
    const frame = document.querySelector('iframe');
    resolve(document.activeElement === frame &&
      frame.contentDocument.activeElement === frame.contentWindow.term.textarea);
  }, 100))`), true);
  assert.equal(await evaluate(`new Promise(resolve => setTimeout(() => {
    const frame = document.querySelector('iframe');
    resolve(document.activeElement === frame &&
      frame.contentDocument.activeElement === frame.contentWindow.term.textarea);
  }, 150))`), true);
  const results = await evaluate(`(async () => {
    const frame = document.querySelector('iframe');
    const w = frame.contentWindow;
    const term = w.term;
    const sent = w.socket.sent;
    const canvas = term.renderer.getCanvas();
    const wait = () => new Promise(resolve => setTimeout(resolve, 150));
    function mouse(type, col, row, options = {}) {
      const rect = canvas.getBoundingClientRect();
      const metrics = term.renderer.getMetrics();
      canvas.dispatchEvent(new w.MouseEvent(type, {
        bubbles: true, cancelable: true, button: 0,
        clientX: rect.left + (col - 0.5) * metrics.width,
        clientY: rect.top + (row - 0.5) * metrics.height,
        ...options,
      }));
    }
    function wheel(deltaY, options = {}) {
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new w.WheelEvent('wheel', {
        bubbles: true, cancelable: true, clientX: rect.left + 1, clientY: rect.top + 1,
        deltaY, ...options,
      }));
    }
    term.write('hello world');
    term.write('\\x1b[?1049h\\x1b[?1003h\\x1b[?1006h');
    await wait();
    sent.length = 0;
    mouse('mousedown', 5, 3, { buttons: 1 });
    mouse('mousemove', 7, 4, { buttons: 1 });
    mouse('mouseup', 7, 4);
    const clicks = sent.splice(0);
    wheel(100);
    const down = sent.splice(0);
    wheel(-100);
    const up = sent.splice(0);
    const pixelStep = term.renderer.getMetrics().height * 3 / 10;
    for (let i = 0; i < 10; i++) wheel(pixelStep);
    const trackpad = sent.splice(0);
    wheel(0, { deltaX: 100 });
    const horizontal = sent.splice(0);
    sent.length = 0;
    term.write('\\x1b[?1049l\\x1b[?1003l\\x1b[?1006l');
    await wait();
    mouse('mousedown', 1, 1, { buttons: 1, shiftKey: true });
    mouse('mousemove', 6, 1, { buttons: 1, shiftKey: true });
    mouse('mouseup', 6, 1, { shiftKey: true });
    const selected = term.getSelection();
    const selectionInput = sent.splice(0);
    for (let i = 0; i < 100; i++) term.write('line ' + i + '\\r\\n');
    await wait();
    wheel(-300);
    await wait();
    const scrolled = term.getViewportY() > 0;
    wheel(100000);
    await wait();
    return { clicks, down, up, trackpad, horizontal, selected, selectionInput,
      scrolled, bottom: term.getViewportY() };
  })()`);
  assert.deepEqual(results.clicks, ['\x1b[<0;5;3M', '\x1b[<32;7;4M', '\x1b[<0;7;4m']);
  assert.deepEqual(results.down, ['\x1b[<65;1;1M']);
  assert.deepEqual(results.up, ['\x1b[<64;1;1M']);
  assert.deepEqual(results.trackpad, ['\x1b[<65;1;1M']);
  assert.deepEqual(results.horizontal, []);
  assert.equal(results.selected, 'hello ');
  assert.deepEqual(results.selectionInput, []);
  assert.equal(results.scrolled, true);
  assert.equal(results.bottom, 0);
  assert.equal(await evaluate(`new Promise((resolve, reject) => {
    document.getElementById('other').focus();
    const frame = document.createElement('iframe');
    frame.src = '/terminal?autofocus=1';
    document.body.appendChild(frame);
    const start = Date.now();
    const timer = setInterval(() => {
      if (frame.contentWindow.socket?.sent.length) {
        clearInterval(timer);
        setTimeout(() => resolve(document.activeElement === frame &&
          frame.contentDocument.activeElement === frame.contentWindow.term.textarea), 150);
      } else if (Date.now() - start > 10000) {
        clearInterval(timer); reject(new Error('Autofocus terminal did not initialize'));
      }
    }, 20);
  })`), true);
});
