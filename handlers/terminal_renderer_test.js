'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

// Use the shipped WASM with a recording Canvas, without shells or a browser.
async function setup(cols = 80, rows = 24) {
  const { CanvasRenderer, Ghostty } = await import('./resources/ghostty-web/ghostty-web.js');
  const ghostty = await Ghostty.load(path.join(__dirname, 'resources/ghostty-web/ghostty-vt.wasm'));
  const terminal = ghostty.createTerminal(cols, rows);
  const calls = [];
  const ctx = new Proxy({ measureText: text => ({ width: text.length * 8 }) }, {
    get: (target, key) => target[key] ?? ((...args) => calls.push([key, ...args])),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  global.document = { createElement: () => ({ getContext: () => ctx }) };
  const renderer = new CanvasRenderer({ style: {}, width: 0, height: 0, getContext: () => ctx }, {
    devicePixelRatio: 1,
  });
  let viewportCalls = 0;
  const getViewport = terminal.getViewport.bind(terminal);
  terminal.getViewport = (...args) => { viewportCalls++; return getViewport(...args); };
  const lines = [];
  const renderLine = renderer.renderLine.bind(renderer);
  renderer.renderLine = (cells, row, ...args) => {
    lines.push({ row, cells: structuredClone(cells) });
    return renderLine(cells, row, ...args);
  };
  return { terminal, renderer, calls, lines, reset: () => {
    calls.length = lines.length = 0;
    viewportCalls = 0;
  }, viewportCalls: () => viewportCalls };
}

test('a full redraw reads the native viewport once and preserves every row', async () => {
  const fixture = await setup(160, 60);
  const { terminal, renderer, lines } = fixture;
  try {
    terminal.write('\x1b[?1049h\x1b[2JASCII => !=\x1b[31m red\x1b[0m\r\n界 e\u0301 ┌─┐');
    const expected = Array.from({ length: terminal.rows }, (_, row) => terminal.getLine(row));
    fixture.reset();
    renderer.render(terminal, true);
    assert.equal(fixture.viewportCalls(), 1);
    assert.equal(lines.length, terminal.rows);
    for (const { row, cells } of lines) assert.deepEqual(cells, expected[row]);
    assert.equal(renderer.getFrameStats().materializedCells, (terminal.rows + 1) * terminal.cols);
  } finally { terminal.free(); }
});

test('partial redraws retain row boundaries, refresh snapshots, and survive resize and screen switches', async () => {
  const fixture = await setup();
  const { terminal, renderer, lines } = fixture;
  try {
    terminal.write('\x1b[?25lprimary');
    renderer.render(terminal, true);
    fixture.reset();
    renderer.render(terminal);
    assert.equal(fixture.viewportCalls(), 0);
    assert.equal(lines.length, 0);

    terminal.write('\x1b[10;1Hchanged');
    fixture.reset();
    renderer.render(terminal);
    assert.equal(fixture.viewportCalls(), 1);
    assert.deepEqual(lines.map(line => line.row), [0, 1, 8, 9, 10]);
    assert.deepEqual(lines.find(line => line.row === 9).cells, terminal.getLine(9));

    for (const write of ['\x1b[?1049h\x1b[2Jalternate', '\x1b[?1049l']) {
      terminal.write(write);
      fixture.reset();
      renderer.render(terminal);
      assert.equal(fixture.viewportCalls(), 1);
      assert.deepEqual(lines[0].cells, terminal.getLine(0));
    }
    terminal.resize(100, 30);
    fixture.reset();
    renderer.render(terminal);
    assert.equal(fixture.viewportCalls(), 1);
    assert.equal(lines.length, 30);
    assert.ok(lines.every(line => line.cells.length === 100));
  } finally { terminal.free(); }
});

test('history and viewport rows stay separate, including hyperlink hover and cursor painting', async () => {
  const fixture = await setup(40, 8);
  const { terminal, renderer, lines } = fixture;
  try {
    terminal.write('\x1b]8;;https://example.test\x1b\\link\x1b]8;;\x1b\\\r\n');
    for (let row = 0; row < 20; row++) terminal.write('history ' + row + '\r\n');
    const historyLength = terminal.getScrollbackLength();
    const expected = [terminal.getScrollbackLine(historyLength - 2), terminal.getScrollbackLine(historyLength - 1),
      ...Array.from({ length: 6 }, (_, row) => terminal.getLine(row))];
    fixture.reset();
    renderer.hoveredHyperlinkId = 1;
    renderer.render(terminal, true, 2, terminal);
    assert.equal(fixture.viewportCalls(), 1);
    for (const { row, cells } of lines) assert.deepEqual(cells, expected[row]);
    fixture.reset();
    renderer.render(terminal, true, 0, terminal);
    assert.equal(fixture.viewportCalls(), 1, 'block cursor must reuse the frame snapshot');
    assert.deepEqual(lines[0].cells, terminal.getLine(0));
  } finally { terminal.free(); }
});

test('getLine-only buffers retain their rendering path', async () => {
  const fixture = await setup();
  const { terminal, renderer } = fixture;
  try {
    terminal.write('legacy buffer');
    const legacy = new Proxy(terminal, {
      get: (target, key) => key === 'getViewport' ? undefined :
        typeof target[key] === 'function' ? target[key].bind(target) : target[key],
    });
    renderer.render(legacy, true);
    assert.ok(fixture.viewportCalls() > 1);
  } finally { terminal.free(); }
});

test('clean frames with non-block cursors do not read viewport cells', async () => {
  const fixture = await setup();
  const { terminal, renderer } = fixture;
  try {
    for (const style of [4, 6]) {
      terminal.write('\x1b[' + style + ' q');
      renderer.render(terminal, true);
      fixture.reset();
      renderer.render(terminal);
      assert.equal(fixture.viewportCalls(), 0);
    }
  } finally { terminal.free(); }
});

test('viewport and callback cell mutations cannot contaminate the frame or block cursor', async () => {
  const fixture = await setup();
  const { terminal, renderer } = fixture;
  try {
    terminal.write('A\r\nB\x1b[1;1H');
    const painted = [];
    renderer.renderLine = (cells, row) => {
      painted.push(cells[0].codepoint);
      cells[0].codepoint = 'Z'.codePointAt(0);
      terminal.cellPool.forEach(cell => { cell.codepoint = 'Z'.codePointAt(0); });
    };
    let cursorCell;
    renderer.renderCellText = cell => { cursorCell = cell.codepoint; };
    renderer.render(terminal, true);
    assert.equal(painted[0], 'A'.codePointAt(0));
    assert.equal(painted[1], 'B'.codePointAt(0));
    assert.equal(cursorCell, 'A'.codePointAt(0));
  } finally { terminal.free(); }
});

test('an entirely historical frame does not read the live viewport', async () => {
  const fixture = await setup(40, 8);
  const { terminal, renderer } = fixture;
  try {
    for (let row = 0; row < 24; row++) terminal.write('history ' + row + '\r\n');
    fixture.reset();
    renderer.render(terminal, true, terminal.rows, terminal);
    assert.equal(fixture.viewportCalls(), 0);
    assert.equal(fixture.lines.length, terminal.rows);
  } finally { terminal.free(); }
});

test('retained highlight endpoints and hover-only redraws use current wide cells', async () => {
  const fixture = await setup();
  const { terminal, renderer } = fixture;
  try {
    terminal.write('\x1b]8;;https://example.test\x1b\\界link\x1b]8;;\x1b\\');
    renderer.render(terminal, true);
    fixture.reset();
    let width;
    renderer.retainedRangeHighlight = {
      paint: frame => { width = frame.endCellWidth(0, 0); return true; },
    };
    renderer.hoveredHyperlinkId = terminal.getLine(0)[0].hyperlink_id;
    fixture.reset();
    renderer.render(terminal);
    assert.equal(width, 2);
    assert.equal(fixture.viewportCalls(), 1);
    assert.ok(fixture.lines.some(line => line.row === 0));
    assert.ok(fixture.calls.some(call => call[0] === 'fillText' && call[1] === '界'));
  } finally { terminal.free(); }
});
