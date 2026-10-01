'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

const html = fs.readFileSync(new URL('./resources/terminal.html', `file://${__dirname}/`), 'utf8');
const hook = html.match(/term\.attachCustomWheelEventHandler\(\(event\) => \{[\s\S]*?\n        \}\);/)[0];

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
