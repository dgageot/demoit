'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const html = fs.readFileSync(new URL('./resources/terminal.html', `file://${__dirname}/`), 'utf8');
const hook = html.match(/term\.attachCustomWheelEventHandler\(\(event\) => \{[\s\S]*?\n        \}\);/)[0];

const keyHook = html.match(/term\.attachCustomKeyEventHandler\(\(event\) => \{[\s\S]*?\n        \}\);/)[0];

function key({ frameFocused = true, inputFocused = true, ...options } = {}) {
  const calls = [];
  let handler;
  vm.runInNewContext(keyHook, {
    document: { activeElement: {}, hasFocus: () => frameFocused },
    container: { contains: () => inputFocused },
    term: {
      clear: () => calls.push('clear'),
      input: (data, userInput) => {
        assert.equal(data, '\x0c');
        assert.equal(userInput, true);
        calls.push('redraw');
      },
      attachCustomKeyEventHandler: callback => { handler = callback; },
    },
  });
  const handled = handler({
    key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false,
    preventDefault: () => calls.push('preventDefault'),
    stopPropagation: () => calls.push('stopPropagation'),
    ...options,
  });
  return { handled, calls };
}

test('Command-K clears the focused terminal, requests a redraw, and consumes the shortcut', () => {
  for (const value of ['k', 'K']) {
    assert.deepEqual(key({ key: value }), {
      handled: true, calls: ['preventDefault', 'stopPropagation', 'clear', 'redraw'],
    });
  }
});

test('Command-K does not clear an unfocused terminal', () => {
  assert.deepEqual(key({ frameFocused: false }), { handled: false, calls: [] });
  assert.deepEqual(key({ inputFocused: false }), { handled: false, calls: [] });
});

test('other keys and modified shortcuts keep normal terminal handling', () => {
  for (const options of [
    { metaKey: false }, { metaKey: false, ctrlKey: true },
    { ctrlKey: true }, { altKey: true }, { shiftKey: true }, { key: 'c' },
    { key: 'ArrowLeft' }, { key: 'ArrowRight' },
  ]) {
    assert.deepEqual(key(options), { handled: false, calls: [] });
  }
});

function wheel({ frameFocused = true, inputFocused = false, ctrlKey = false, metaKey = false } = {}) {
  const calls = [];
  let handler;
  vm.runInNewContext(hook, {
    document: { activeElement: {}, hasFocus: () => frameFocused },
    container: { contains: () => inputFocused },
    window: { focus: () => calls.push('frame') },
    term: {
      focus: () => calls.push('terminal'),
      attachCustomWheelEventHandler: callback => { handler = callback; },
    },
  });
  const event = {
    ctrlKey, metaKey,
    preventDefault: () => assert.fail('must preserve emulator wheel handling'),
    stopPropagation: () => assert.fail('must preserve emulator wheel handling'),
  };
  assert.equal(handler(event), false);
  return calls;
}

test('wheel focuses the iframe and terminal when another control has focus', () => {
  assert.deepEqual(wheel(), ['frame', 'terminal']);
});

test('wheel restores focus after switching away from an iframe with retained activeElement', () => {
  assert.deepEqual(wheel({ frameFocused: false, inputFocused: true }), ['frame', 'terminal']);
});

test('wheel does not refocus an already active terminal', () => {
  assert.deepEqual(wheel({ inputFocused: true }), []);
});

test('modifier scrolling does not steal focus', () => {
  assert.deepEqual(wheel({ ctrlKey: true }), []);
  assert.deepEqual(wheel({ metaKey: true }), []);
});
