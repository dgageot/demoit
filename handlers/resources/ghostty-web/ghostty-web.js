const Mt = "" + new URL("ghostty-vt.wasm", import.meta.url).href, it = 36, Pt = 64 * 1024, Wt = [
  "fresh-line",
  "fresh-line-new-prompt",
  "new-command",
  "prompt-start",
  "end-prompt-start-input",
  "end-prompt-start-input-terminate-eol",
  "end-input-start-output",
  "end-command"
], zt = [
  "remove",
  "set",
  "error",
  "indeterminate",
  "pause"
], Gt = ["osc-9", "osc-777"], bt = ["bold", "underline", "blink", "reverse", "italic"], Vt = /* @__PURE__ */ new Map([
  [10, { kind: "dynamic", name: "foreground" }],
  [11, { kind: "dynamic", name: "background" }],
  [12, { kind: "dynamic", name: "cursor" }],
  [13, { kind: "dynamic", name: "pointer-foreground" }],
  [14, { kind: "dynamic", name: "pointer-background" }],
  [15, { kind: "dynamic", name: "tektronix-foreground" }],
  [16, { kind: "dynamic", name: "tektronix-background" }],
  [17, { kind: "dynamic", name: "highlight-background" }],
  [18, { kind: "dynamic", name: "tektronix-cursor" }],
  [19, { kind: "dynamic", name: "highlight-foreground" }]
]);
function $t(i, t) {
  return i === 1 && t >= 0 && t <= 255 ? { kind: "palette", index: t } : i === 2 && t >= 0 && t < bt.length ? { kind: "special", name: bt[t] } : i === 3 ? Vt.get(t) ?? null : null;
}
function Xt(i, t, e, s) {
  if (i === 3) return { type: "reset-palette" };
  if (i === 4) return { type: "reset-special" };
  const r = $t(t, e);
  if (!r) return null;
  if (i === 0) {
    const n = {
      r: s >>> 16 & 255,
      g: s >>> 8 & 255,
      b: s & 255
    };
    return { type: "set", target: r, color: n };
  }
  return i === 1 ? { type: "query", target: r } : i === 2 ? { type: "reset", target: r } : null;
}
function qt(i) {
  if (i.byteLength < it || i.byteLength > Pt)
    return null;
  const t = new DataView(i.buffer, i.byteOffset, i.byteLength);
  if (t.getUint8(0) !== 1) return null;
  const e = t.getUint8(1), s = t.getUint8(2), r = t.getUint8(3), n = t.getUint32(4, !0), o = t.getUint32(8, !0), l = t.getUint32(12, !0), a = t.getInt32(16, !0), h = t.getInt32(20, !0), c = t.getUint32(24, !0), u = t.getUint32(28, !0), p = t.getUint32(32, !0);
  if (it + u + p !== i.byteLength) return null;
  const m = new TextDecoder(), f = it, g = f + u, b = m.decode(i.subarray(f, g)), S = m.decode(i.subarray(g));
  switch (e) {
    case 1:
      return { type: "title", title: b };
    case 2:
      return { type: "working-directory", uri: b };
    case 3:
      return { type: "bell" };
    case 4: {
      const v = Gt[s];
      return v ? { type: "notification", source: v, title: b, body: S } : null;
    }
    case 5: {
      const v = zt[s];
      return !v || a < -1 || a > 100 ? null : a < 0 ? { type: "progress", state: v } : { type: "progress", state: v, progress: a };
    }
    case 6: {
      const v = Wt[s];
      return !v || o === 0 || r > 1 ? null : {
        type: "semantic",
        action: v,
        options: b,
        provenance: Object.freeze({
          id: o,
          screen: r === 1 ? "alternate" : "normal",
          row: n,
          column: l
        })
      };
    }
    case 7: {
      const v = Xt(s, r, h, c);
      return v ? { type: "palette", operation: a, request: v } : null;
    }
    case 8: {
      if (a < 0 || a > 255) return null;
      const v = String.fromCharCode(a);
      return s === 0 ? { type: "clipboard", operation: "read", selection: v } : s === 1 ? { type: "clipboard", operation: "write", selection: v, data: b } : null;
    }
    case 9:
      return r <= 1 ? { type: "buffer-change", active: r === 1 ? "alternate" : "normal" } : null;
    default:
      return null;
  }
}
class I {
  constructor() {
    this.listeners = [], this.event = (t) => {
      const e = { listener: t, disposed: !1 };
      return this.listeners.push(e), {
        dispose: () => {
          if (e.disposed) return;
          e.disposed = !0;
          const s = this.listeners.indexOf(e);
          s >= 0 && this.listeners.splice(s, 1);
        }
      };
    };
  }
  fire(t) {
    for (const e of [...this.listeners])
      e.listener(t);
  }
  dispose() {
    this.listeners = [];
  }
}
var Dt = /* @__PURE__ */ ((i) => (i[i.DISABLED = 0] = "DISABLED", i[i.DISAMBIGUATE = 1] = "DISAMBIGUATE", i[i.REPORT_EVENTS = 2] = "REPORT_EVENTS", i[i.REPORT_ALTERNATES = 4] = "REPORT_ALTERNATES", i[i.REPORT_ALL = 8] = "REPORT_ALL", i[i.REPORT_ASSOCIATED = 16] = "REPORT_ASSOCIATED", i[i.ALL = 31] = "ALL", i))(Dt || {}), j = /* @__PURE__ */ ((i) => (i[i.CURSOR_KEY_APPLICATION = 0] = "CURSOR_KEY_APPLICATION", i[i.KEYPAD_KEY_APPLICATION = 1] = "KEYPAD_KEY_APPLICATION", i[i.IGNORE_KEYPAD_WITH_NUMLOCK = 2] = "IGNORE_KEYPAD_WITH_NUMLOCK", i[i.ALT_ESC_PREFIX = 3] = "ALT_ESC_PREFIX", i[i.MODIFY_OTHER_KEYS_STATE_2 = 4] = "MODIFY_OTHER_KEYS_STATE_2", i[i.KITTY_KEYBOARD_FLAGS = 5] = "KITTY_KEYBOARD_FLAGS", i))(j || {}), lt = /* @__PURE__ */ ((i) => (i[i.RELEASE = 0] = "RELEASE", i[i.PRESS = 1] = "PRESS", i[i.REPEAT = 2] = "REPEAT", i))(lt || {}), d = /* @__PURE__ */ ((i) => (i[i.UNIDENTIFIED = 0] = "UNIDENTIFIED", i[i.GRAVE = 1] = "GRAVE", i[i.BACKSLASH = 2] = "BACKSLASH", i[i.BRACKET_LEFT = 3] = "BRACKET_LEFT", i[i.BRACKET_RIGHT = 4] = "BRACKET_RIGHT", i[i.COMMA = 5] = "COMMA", i[i.ZERO = 6] = "ZERO", i[i.ONE = 7] = "ONE", i[i.TWO = 8] = "TWO", i[i.THREE = 9] = "THREE", i[i.FOUR = 10] = "FOUR", i[i.FIVE = 11] = "FIVE", i[i.SIX = 12] = "SIX", i[i.SEVEN = 13] = "SEVEN", i[i.EIGHT = 14] = "EIGHT", i[i.NINE = 15] = "NINE", i[i.EQUAL = 16] = "EQUAL", i[i.INTL_BACKSLASH = 17] = "INTL_BACKSLASH", i[i.INTL_RO = 18] = "INTL_RO", i[i.INTL_YEN = 19] = "INTL_YEN", i[i.A = 20] = "A", i[i.B = 21] = "B", i[i.C = 22] = "C", i[i.D = 23] = "D", i[i.E = 24] = "E", i[i.F = 25] = "F", i[i.G = 26] = "G", i[i.H = 27] = "H", i[i.I = 28] = "I", i[i.J = 29] = "J", i[i.K = 30] = "K", i[i.L = 31] = "L", i[i.M = 32] = "M", i[i.N = 33] = "N", i[i.O = 34] = "O", i[i.P = 35] = "P", i[i.Q = 36] = "Q", i[i.R = 37] = "R", i[i.S = 38] = "S", i[i.T = 39] = "T", i[i.U = 40] = "U", i[i.V = 41] = "V", i[i.W = 42] = "W", i[i.X = 43] = "X", i[i.Y = 44] = "Y", i[i.Z = 45] = "Z", i[i.MINUS = 46] = "MINUS", i[i.PERIOD = 47] = "PERIOD", i[i.QUOTE = 48] = "QUOTE", i[i.SEMICOLON = 49] = "SEMICOLON", i[i.SLASH = 50] = "SLASH", i[i.ALT_LEFT = 51] = "ALT_LEFT", i[i.ALT_RIGHT = 52] = "ALT_RIGHT", i[i.BACKSPACE = 53] = "BACKSPACE", i[i.CAPS_LOCK = 54] = "CAPS_LOCK", i[i.CONTEXT_MENU = 55] = "CONTEXT_MENU", i[i.CONTROL_LEFT = 56] = "CONTROL_LEFT", i[i.CONTROL_RIGHT = 57] = "CONTROL_RIGHT", i[i.ENTER = 58] = "ENTER", i[i.META_LEFT = 59] = "META_LEFT", i[i.META_RIGHT = 60] = "META_RIGHT", i[i.SHIFT_LEFT = 61] = "SHIFT_LEFT", i[i.SHIFT_RIGHT = 62] = "SHIFT_RIGHT", i[i.SPACE = 63] = "SPACE", i[i.TAB = 64] = "TAB", i[i.CONVERT = 65] = "CONVERT", i[i.KANA_MODE = 66] = "KANA_MODE", i[i.NON_CONVERT = 67] = "NON_CONVERT", i[i.DELETE = 68] = "DELETE", i[i.END = 69] = "END", i[i.HELP = 70] = "HELP", i[i.HOME = 71] = "HOME", i[i.INSERT = 72] = "INSERT", i[i.PAGE_DOWN = 73] = "PAGE_DOWN", i[i.PAGE_UP = 74] = "PAGE_UP", i[i.DOWN = 75] = "DOWN", i[i.LEFT = 76] = "LEFT", i[i.RIGHT = 77] = "RIGHT", i[i.UP = 78] = "UP", i[i.NUM_LOCK = 79] = "NUM_LOCK", i[i.KP_0 = 80] = "KP_0", i[i.KP_1 = 81] = "KP_1", i[i.KP_2 = 82] = "KP_2", i[i.KP_3 = 83] = "KP_3", i[i.KP_4 = 84] = "KP_4", i[i.KP_5 = 85] = "KP_5", i[i.KP_6 = 86] = "KP_6", i[i.KP_7 = 87] = "KP_7", i[i.KP_8 = 88] = "KP_8", i[i.KP_9 = 89] = "KP_9", i[i.KP_PLUS = 90] = "KP_PLUS", i[i.KP_BACKSPACE = 91] = "KP_BACKSPACE", i[i.KP_CLEAR = 92] = "KP_CLEAR", i[i.KP_CLEAR_ENTRY = 93] = "KP_CLEAR_ENTRY", i[i.KP_COMMA = 94] = "KP_COMMA", i[i.KP_PERIOD = 95] = "KP_PERIOD", i[i.KP_DIVIDE = 96] = "KP_DIVIDE", i[i.KP_ENTER = 97] = "KP_ENTER", i[i.KP_EQUAL = 98] = "KP_EQUAL", i[i.KP_MEMORY_ADD = 99] = "KP_MEMORY_ADD", i[i.KP_MEMORY_CLEAR = 100] = "KP_MEMORY_CLEAR", i[i.KP_MEMORY_RECALL = 101] = "KP_MEMORY_RECALL", i[i.KP_MEMORY_STORE = 102] = "KP_MEMORY_STORE", i[i.KP_MEMORY_SUBTRACT = 103] = "KP_MEMORY_SUBTRACT", i[i.KP_MULTIPLY = 104] = "KP_MULTIPLY", i[i.KP_PAREN_LEFT = 105] = "KP_PAREN_LEFT", i[i.KP_PAREN_RIGHT = 106] = "KP_PAREN_RIGHT", i[i.KP_MINUS = 107] = "KP_MINUS", i[i.KP_SEPARATOR = 108] = "KP_SEPARATOR", i[i.NUMPAD_UP = 109] = "NUMPAD_UP", i[i.NUMPAD_DOWN = 110] = "NUMPAD_DOWN", i[i.NUMPAD_RIGHT = 111] = "NUMPAD_RIGHT", i[i.NUMPAD_LEFT = 112] = "NUMPAD_LEFT", i[i.NUMPAD_BEGIN = 113] = "NUMPAD_BEGIN", i[i.NUMPAD_HOME = 114] = "NUMPAD_HOME", i[i.NUMPAD_END = 115] = "NUMPAD_END", i[i.NUMPAD_INSERT = 116] = "NUMPAD_INSERT", i[i.NUMPAD_DELETE = 117] = "NUMPAD_DELETE", i[i.NUMPAD_PAGE_UP = 118] = "NUMPAD_PAGE_UP", i[i.NUMPAD_PAGE_DOWN = 119] = "NUMPAD_PAGE_DOWN", i[i.ESCAPE = 120] = "ESCAPE", i[i.F1 = 121] = "F1", i[i.F2 = 122] = "F2", i[i.F3 = 123] = "F3", i[i.F4 = 124] = "F4", i[i.F5 = 125] = "F5", i[i.F6 = 126] = "F6", i[i.F7 = 127] = "F7", i[i.F8 = 128] = "F8", i[i.F9 = 129] = "F9", i[i.F10 = 130] = "F10", i[i.F11 = 131] = "F11", i[i.F12 = 132] = "F12", i[i.F13 = 133] = "F13", i[i.F14 = 134] = "F14", i[i.F15 = 135] = "F15", i[i.F16 = 136] = "F16", i[i.F17 = 137] = "F17", i[i.F18 = 138] = "F18", i[i.F19 = 139] = "F19", i[i.F20 = 140] = "F20", i[i.F21 = 141] = "F21", i[i.F22 = 142] = "F22", i[i.F23 = 143] = "F23", i[i.F24 = 144] = "F24", i[i.F25 = 145] = "F25", i[i.FN_LOCK = 146] = "FN_LOCK", i[i.PRINT_SCREEN = 147] = "PRINT_SCREEN", i[i.SCROLL_LOCK = 148] = "SCROLL_LOCK", i[i.PAUSE = 149] = "PAUSE", i[i.BROWSER_BACK = 150] = "BROWSER_BACK", i[i.BROWSER_FAVORITES = 151] = "BROWSER_FAVORITES", i[i.BROWSER_FORWARD = 152] = "BROWSER_FORWARD", i[i.BROWSER_HOME = 153] = "BROWSER_HOME", i[i.BROWSER_REFRESH = 154] = "BROWSER_REFRESH", i[i.BROWSER_SEARCH = 155] = "BROWSER_SEARCH", i[i.BROWSER_STOP = 156] = "BROWSER_STOP", i[i.EJECT = 157] = "EJECT", i[i.LAUNCH_APP_1 = 158] = "LAUNCH_APP_1", i[i.LAUNCH_APP_2 = 159] = "LAUNCH_APP_2", i[i.LAUNCH_MAIL = 160] = "LAUNCH_MAIL", i[i.MEDIA_PLAY_PAUSE = 161] = "MEDIA_PLAY_PAUSE", i[i.MEDIA_SELECT = 162] = "MEDIA_SELECT", i[i.MEDIA_STOP = 163] = "MEDIA_STOP", i[i.MEDIA_TRACK_NEXT = 164] = "MEDIA_TRACK_NEXT", i[i.MEDIA_TRACK_PREVIOUS = 165] = "MEDIA_TRACK_PREVIOUS", i[i.POWER = 166] = "POWER", i[i.SLEEP = 167] = "SLEEP", i[i.AUDIO_VOLUME_DOWN = 168] = "AUDIO_VOLUME_DOWN", i[i.AUDIO_VOLUME_MUTE = 169] = "AUDIO_VOLUME_MUTE", i[i.AUDIO_VOLUME_UP = 170] = "AUDIO_VOLUME_UP", i[i.WAKE_UP = 171] = "WAKE_UP", i[i.COPY = 172] = "COPY", i[i.CUT = 173] = "CUT", i[i.PASTE = 174] = "PASTE", i))(d || {}), H = /* @__PURE__ */ ((i) => (i[i.NONE = 0] = "NONE", i[i.SHIFT = 1] = "SHIFT", i[i.CTRL = 2] = "CTRL", i[i.ALT = 4] = "ALT", i[i.SUPER = 8] = "SUPER", i[i.CAPSLOCK = 16] = "CAPSLOCK", i[i.NUMLOCK = 32] = "NUMLOCK", i))(H || {}), K = /* @__PURE__ */ ((i) => (i[i.NONE = 0] = "NONE", i[i.PARTIAL = 1] = "PARTIAL", i[i.FULL = 2] = "FULL", i))(K || {});
const St = 88, vt = 80;
var L = /* @__PURE__ */ ((i) => (i[i.BOLD = 1] = "BOLD", i[i.ITALIC = 2] = "ITALIC", i[i.UNDERLINE = 4] = "UNDERLINE", i[i.STRIKETHROUGH = 8] = "STRIKETHROUGH", i[i.INVERSE = 16] = "INVERSE", i[i.INVISIBLE = 32] = "INVISIBLE", i[i.BLINK = 64] = "BLINK", i[i.FAINT = 128] = "FAINT", i))(L || {});
const _t = 64 * 1024, Jt = 1, Qt = 2, Zt = 4, jt = 8, Kt = {
  block: 0,
  block_hollow: 1,
  bar: 2,
  underline: 3
};
function te(i) {
  return i instanceof URL ? i.protocol === "file:" : i.startsWith("file:") || /^[A-Za-z]:[\\/]/.test(i) ? !0 : !/^[A-Za-z][A-Za-z\d+.-]*:/.test(i);
}
function Bt(i) {
  return Kt[i ?? "block"];
}
function It(i) {
  return i === "terminal" ? 0 : i ?? !1 ? 1 : 2;
}
function ee(i, t, e) {
  return i.setUint8(t, Bt(e.cursorStyle)), i.setUint8(t + 1, It(e.cursorBlink)), i.setUint8(t + 2, e.scrollbackBytes === void 0 ? 0 : 1), i.setUint8(t + 3, 0), t + 4;
}
function se(i) {
  if (i.scrollbackLimit !== void 0 && i.scrollbackBytes !== void 0)
    throw new TypeError("scrollbackLimit and scrollbackBytes are mutually exclusive");
  if (i.scrollbackBytes !== void 0) {
    if (!Number.isInteger(i.scrollbackBytes) || i.scrollbackBytes < 0 || i.scrollbackBytes >= 4294967295)
      throw new TypeError("scrollbackBytes must be an integer from 0 to 4294967294");
    return i.scrollbackBytes;
  }
  return i.scrollbackLimit ?? 1e4;
}
function q(i, t) {
  if (i === void 0) return 0;
  if (!Number.isInteger(i) || i < 0 || i > 16777215)
    throw new TypeError(`${t} must be an integer from 0x000000 to 0xffffff`);
  return i;
}
function Et(i, t, e) {
  var r, n;
  if (e.palette && e.palette.length > 16)
    throw new TypeError("palette must contain at most 16 colors");
  let s = 0;
  e.fgColor !== void 0 && (s |= Jt), e.bgColor !== void 0 && (s |= Qt), e.cursorColor !== void 0 && (s |= Zt);
  for (let o = 0; o < 16; o++)
    ((r = e.palette) == null ? void 0 : r[o]) !== void 0 && (s |= 1 << jt + o);
  i.setUint32(t, s, !0), t += 4, i.setUint32(t, q(e.fgColor, "fgColor"), !0), t += 4, i.setUint32(t, q(e.bgColor, "bgColor"), !0), t += 4, i.setUint32(t, q(e.cursorColor, "cursorColor"), !0), t += 4;
  for (let o = 0; o < 16; o++)
    i.setUint32(t, q((n = e.palette) == null ? void 0 : n[o], `palette[${o}]`), !0), t += 4;
  return t;
}
class tt {
  constructor(t) {
    this.exports = t.exports, this.memory = this.exports.memory;
  }
  createKeyEncoder() {
    return new ie(this.exports);
  }
  createTerminal(t = 80, e = 24, s) {
    return new ht(this.exports, this.memory, t, e, s);
  }
  static async load(t = Mt) {
    if (t === "")
      throw new TypeError("Ghostty WASM path must not be empty.");
    try {
      return await tt.loadFromPath(t);
    } catch (e) {
      const s = e instanceof Error ? e.message : String(e), r = new Error(`Failed to load Ghostty WASM from ${String(t)}: ${s}`);
      throw Object.defineProperty(r, "cause", { configurable: !0, value: e }), r;
    }
  }
  static async loadFromPath(t) {
    var o;
    let e, s;
    if (typeof Bun < "u" && typeof Bun.file == "function")
      try {
        const l = Bun.file(t);
        await l.exists() && (e = await l.arrayBuffer());
      } catch {
      }
    if (!e && typeof process < "u" && ((o = process.versions) != null && o.node))
      try {
        const a = await import(["node", "fs/promises"].join(":")), h = typeof t == "string" && t.startsWith("file:") ? new URL(t) : t, c = await a.readFile(h);
        e = c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength);
      } catch (l) {
        s = l;
      }
    if (!e && s && te(t))
      throw s;
    if (!e) {
      const l = await fetch(t);
      if (!l.ok)
        throw new Error(`Failed to fetch WASM: ${l.status} ${l.statusText}`);
      if (e = await l.arrayBuffer(), e.byteLength === 0)
        throw new Error(`WASM file is empty (0 bytes). Check path: ${t}`);
    }
    if (!e)
      throw new Error(`Could not load WASM from path: ${t}`);
    const r = await WebAssembly.compile(e), n = await WebAssembly.instantiate(r, {
      env: {
        log: (l, a) => {
          const h = new Uint8Array(
            n.exports.memory.buffer,
            l,
            a
          );
          console.log("[ghostty-vt]", new TextDecoder().decode(h));
        }
      }
    });
    return new tt(n);
  }
}
class ie {
  constructor(t) {
    this.encoder = 0, this.exports = t;
    const e = this.exports.ghostty_wasm_alloc_opaque();
    try {
      const s = this.exports.ghostty_key_encoder_new(0, e);
      if (s !== 0) throw new Error(`Failed to create key encoder: ${s}`);
      const r = new DataView(this.exports.memory.buffer);
      this.encoder = r.getUint32(e, !0);
    } finally {
      this.exports.ghostty_wasm_free_opaque(e);
    }
  }
  setOption(t, e) {
    const s = this.exports.ghostty_wasm_alloc_u8();
    new DataView(this.exports.memory.buffer).setUint8(s, typeof e == "boolean" ? e ? 1 : 0 : e), this.exports.ghostty_key_encoder_setopt(this.encoder, t, s), this.exports.ghostty_wasm_free_u8(s);
  }
  setKittyFlags(t) {
    this.setOption(j.KITTY_KEYBOARD_FLAGS, t);
  }
  encode(t) {
    const e = [], s = (n) => {
      let o = !1, l;
      for (let a = e.length - 1; a >= 0; a--)
        try {
          e[a]();
        } catch (h) {
          o || (o = !0, l = h);
        }
      if (!n && o) throw l;
    };
    let r = !0;
    try {
      const n = this.exports.ghostty_wasm_alloc_opaque();
      e.push(() => this.exports.ghostty_wasm_free_opaque(n));
      const o = this.exports.ghostty_key_event_new(0, n);
      if (o !== 0) throw new Error(`Failed to create key event: ${o}`);
      const l = new DataView(this.exports.memory.buffer).getUint32(n, !0);
      if (e.push(() => this.exports.ghostty_key_event_free(l)), this.exports.ghostty_key_event_set_action(l, t.action), this.exports.ghostty_key_event_set_key(l, t.key), this.exports.ghostty_key_event_set_mods(l, t.mods), t.unshiftedCodepoint !== void 0 && this.exports.ghostty_key_event_set_unshifted_codepoint(l, t.unshiftedCodepoint), t.utf8) {
        const f = new TextEncoder().encode(t.utf8), g = this.exports.ghostty_wasm_alloc_u8_array(f.length);
        e.push(() => this.exports.ghostty_wasm_free_u8_array(g, f.length)), new Uint8Array(this.exports.memory.buffer).set(f, g), this.exports.ghostty_key_event_set_utf8(l, g, f.length);
      }
      const a = 32, h = this.exports.ghostty_wasm_alloc_u8_array(a);
      e.push(() => this.exports.ghostty_wasm_free_u8_array(h, a));
      const c = this.exports.ghostty_wasm_alloc_usize();
      e.push(() => this.exports.ghostty_wasm_free_usize(c));
      const u = this.exports.ghostty_key_encoder_encode(
        this.encoder,
        l,
        h,
        a,
        c
      );
      if (u !== 0) throw new Error(`Failed to encode key: ${u}`);
      const p = new DataView(this.exports.memory.buffer).getUint32(c, !0), m = new Uint8Array(this.exports.memory.buffer, h, p).slice();
      return r = !1, m;
    } finally {
      s(r);
    }
  }
  dispose() {
    this.encoder && (this.exports.ghostty_key_encoder_free(this.encoder), this.encoder = 0);
  }
}
const M = class M {
  constructor(t, e, s = 80, r = 24, n) {
    if (this.provenanceIdentities = /* @__PURE__ */ new WeakMap(), this.viewportBufferPtr = 0, this.viewportBufferSize = 0, this.bufferInfoPtr = 0, this.cellPool = [], this.scrollbackViewportCellPool = [], this.scrollbackViewportRows = [], this.graphemeBuffer = null, this.graphemeBufferPtr = 0, this.exports = t, this.memory = e, this._cols = s, this._rows = r, n) {
      const o = this.exports.ghostty_wasm_alloc_u8_array(St);
      if (o === 0)
        throw new Error("Failed to allocate config (out of memory)");
      try {
        const l = new DataView(this.memory.buffer);
        let a = o;
        l.setUint32(a, se(n), !0), a += 4, a = Et(l, a, n), ee(l, a, n), this.handle = this.exports.ghostty_terminal_new_with_config(s, r, o);
      } finally {
        this.exports.ghostty_wasm_free_u8_array(o, St);
      }
    } else
      this.handle = this.exports.ghostty_terminal_new(s, r);
    if (!this.handle) throw new Error("Failed to create terminal");
    this.initCellPool();
  }
  get cols() {
    return this._cols;
  }
  get rows() {
    return this._rows;
  }
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  write(t) {
    const e = typeof t == "string" ? new TextEncoder().encode(t) : t, s = this.exports.ghostty_wasm_alloc_u8_array(e.length);
    new Uint8Array(this.memory.buffer).set(e, s), this.exports.ghostty_terminal_write(this.handle, s, e.length), this.exports.ghostty_wasm_free_u8_array(s, e.length);
  }
  resize(t, e) {
    t === this._cols && e === this._rows || (this._cols = t, this._rows = e, this.exports.ghostty_terminal_resize(this.handle, t, e), this.invalidateBuffers(), this.initCellPool());
  }
  /** Change configured base colors while preserving contents and app overrides. */
  setColorConfig(t) {
    if (!this.handle) return !1;
    const e = this.exports.ghostty_wasm_alloc_u8_array(vt);
    if (e === 0) return !1;
    try {
      return Et(new DataView(this.memory.buffer), e, t), this.exports.ghostty_terminal_set_color_config(this.handle, e);
    } finally {
      this.exports.ghostty_wasm_free_u8_array(e, vt);
    }
  }
  /** Change configured cursor defaults without replacing terminal or presentation state. */
  setCursorConfig(t) {
    return this.handle ? this.exports.ghostty_terminal_set_cursor_config(
      this.handle,
      Bt(t.cursorStyle),
      It(t.cursorBlink)
    ) : !1;
  }
  free() {
    this.invalidateBuffers(), this.handle && (this.exports.ghostty_terminal_free(this.handle), this.handle = 0);
  }
  // ========================================================================
  // Retained normal-buffer search
  // ========================================================================
  createRetainedSearch(t, e) {
    if (!this.handle || t.length === 0 || t.length > _t) return 0;
    const s = new TextEncoder().encode(t);
    if (s.length === 0 || s.length > _t) return 0;
    const r = this.exports.ghostty_wasm_alloc_u8_array(s.length);
    if (r === 0) return 0;
    try {
      return new Uint8Array(this.memory.buffer).set(s, r), this.exports.ghostty_terminal_retained_search_create(
        this.handle,
        r,
        s.length,
        e
      ) >>> 0;
    } finally {
      this.exports.ghostty_wasm_free_u8_array(r, s.length);
    }
  }
  stepRetainedSearch(t) {
    return !this.handle || t === 0 ? -1 : this.exports.ghostty_terminal_retained_search_step(this.handle, t);
  }
  cancelRetainedSearch(t) {
    !this.handle || t === 0 || this.exports.ghostty_terminal_retained_search_cancel(this.handle, t);
  }
  refreshRetainedSearch(t) {
    return !!this.handle && this.exports.ghostty_terminal_retained_search_refresh(this.handle, t);
  }
  getRetainedSearchMatchId(t, e) {
    return this.handle ? this.exports.ghostty_terminal_retained_search_match_id(this.handle, t, e) >>> 0 : 0;
  }
  getRetainedSearchMatchCount(t) {
    return !this.handle || t === 0 ? -1 : this.exports.ghostty_terminal_retained_search_match_count(this.handle, t);
  }
  getRetainedSearchMatchRange(t, e) {
    if (!this.handle || t === 0) return null;
    const s = 4 * Uint32Array.BYTES_PER_ELEMENT, r = this.exports.ghostty_wasm_alloc_u8_array(s);
    if (r === 0) return null;
    try {
      if (this.exports.ghostty_terminal_retained_search_match_range(
        this.handle,
        t,
        e,
        r,
        4
      ) !== 4) return null;
      const o = new Uint32Array(this.memory.buffer, r, 4);
      return {
        startRow: o[0],
        startColumn: o[1],
        endRow: o[2],
        endColumn: o[3]
      };
    } finally {
      this.exports.ghostty_wasm_free_u8_array(r, s);
    }
  }
  getRetainedSearchMatchText(t, e) {
    if (!this.handle || t === 0) return null;
    const s = this.exports.ghostty_terminal_retained_search_match_text(
      this.handle,
      t,
      e,
      0,
      0
    );
    if (s < 0) return null;
    if (s === 0) return "";
    const r = this.exports.ghostty_wasm_alloc_u8_array(s);
    if (r === 0) return null;
    try {
      const n = this.exports.ghostty_terminal_retained_search_match_text(
        this.handle,
        t,
        e,
        r,
        s
      );
      return n !== s ? null : new TextDecoder().decode(new Uint8Array(this.memory.buffer, r, n).slice());
    } finally {
      this.exports.ghostty_wasm_free_u8_array(r, s);
    }
  }
  getPrimaryScreenGeneration() {
    return this.handle ? this.exports.ghostty_terminal_get_primary_screen_generation(this.handle) >>> 0 : 0;
  }
  getAlternateScreenGeneration() {
    return this.handle ? this.exports.ghostty_terminal_get_alternate_screen_generation(this.handle) >>> 0 : 0;
  }
  captureRetainedBufferBoundary() {
    if (!this.handle) return null;
    const t = 4 * Uint32Array.BYTES_PER_ELEMENT, e = this.exports.ghostty_wasm_alloc_u8_array(t);
    if (e === 0) return null;
    try {
      if (this.exports.ghostty_terminal_capture_retained_buffer_boundary(
        this.handle,
        e,
        4
      ) !== 4) return null;
      const r = new Uint32Array(this.memory.buffer, e, 4), n = Object.freeze({
        id: r[0],
        screen: r[1] === 1 ? "alternate" : "normal",
        row: r[2],
        column: r[3]
      });
      return this.rememberProvenance(n), n;
    } finally {
      this.exports.ghostty_wasm_free_u8_array(e, t);
    }
  }
  /** Track one absolute cell on the active screen across scrollback trimming. */
  captureRetainedBufferPosition(t, e) {
    if (!this.handle || !Number.isInteger(t) || !Number.isInteger(e) || t < 0 || e < 0 || t > 4294967295 || e > 4294967295)
      return null;
    const s = 4 * Uint32Array.BYTES_PER_ELEMENT, r = this.exports.ghostty_wasm_alloc_u8_array(s);
    if (r === 0) return null;
    try {
      if (this.exports.ghostty_terminal_capture_retained_buffer_position(
        this.handle,
        t,
        e,
        r,
        4
      ) !== 4) return null;
      const o = new Uint32Array(this.memory.buffer, r, 4), l = Object.freeze({
        id: o[0],
        screen: o[1] === 1 ? "alternate" : "normal",
        row: o[2],
        column: o[3]
      });
      return this.rememberProvenance(l), l;
    } finally {
      this.exports.ghostty_wasm_free_u8_array(r, s);
    }
  }
  /** Release a short-lived tracked boundary without waiting for registry eviction. */
  releaseRetainedBufferBoundary(t) {
    !this.handle || !this.ownsProvenance(t) || this.exports.ghostty_terminal_release_retained_buffer_boundary(
      this.handle,
      t.id,
      t.screen === "alternate"
    );
  }
  createRetainedRange(t, e) {
    return !this.handle || t.screen !== e.screen || !this.ownsProvenance(t) || !this.ownsProvenance(e) ? 0 : this.exports.ghostty_terminal_retained_range_create(
      this.handle,
      t.id,
      e.id,
      t.screen === "alternate"
    ) >>> 0;
  }
  stepRetainedRange(t) {
    return !this.handle || t === 0 ? -1 : this.exports.ghostty_terminal_retained_range_step(this.handle, t);
  }
  cancelRetainedRange(t) {
    !this.handle || t === 0 || this.exports.ghostty_terminal_retained_range_cancel(this.handle, t);
  }
  getRetainedRangeText(t) {
    if (!this.handle || t === 0) return null;
    const e = this.exports.ghostty_terminal_retained_range_text(
      this.handle,
      t,
      0,
      0
    );
    if (e < 0) return null;
    if (e === 0) return "";
    const s = this.exports.ghostty_wasm_alloc_u8_array(e);
    if (s === 0) return null;
    try {
      const r = this.exports.ghostty_terminal_retained_range_text(
        this.handle,
        t,
        s,
        e
      );
      return r !== e ? null : new TextDecoder().decode(new Uint8Array(this.memory.buffer, s, r).slice());
    } finally {
      this.exports.ghostty_wasm_free_u8_array(s, e);
    }
  }
  // ========================================================================
  // Structured terminal events
  // ========================================================================
  /** Drain all complete parser events currently queued by Ghostty. */
  readEvents() {
    const t = [];
    for (; this.handle; ) {
      const e = this.exports.ghostty_terminal_peek_event_size(this.handle);
      if (e === 0 || e < 0 || e > Pt) break;
      const s = this.exports.ghostty_wasm_alloc_u8_array(e);
      if (s === 0) break;
      try {
        const r = this.exports.ghostty_terminal_read_event(
          this.handle,
          s,
          e
        );
        if (r !== e) break;
        const n = new Uint8Array(this.memory.buffer, s, r).slice(), o = qt(n);
        o && (o.type === "semantic" && this.rememberProvenance(o.provenance), t.push(o));
      } finally {
        this.exports.ghostty_wasm_free_u8_array(s, e);
      }
    }
    return t;
  }
  /** Resolve a semantic marker to its current retained row, or null after expiry. */
  resolveEventProvenance(t) {
    var e;
    return ((e = this.resolveEventBoundary(t)) == null ? void 0 : e.row) ?? null;
  }
  /** Resolve an authenticated semantic marker to exact retained coordinates. */
  resolveEventBoundary(t) {
    if (!this.handle || !this.ownsProvenance(t)) return null;
    const e = 2 * Uint32Array.BYTES_PER_ELEMENT, s = this.exports.ghostty_wasm_alloc_u8_array(e);
    if (s === 0) return null;
    try {
      if (this.exports.ghostty_terminal_resolve_event_boundary(
        this.handle,
        t.id,
        t.screen === "alternate",
        s,
        2
      ) !== 2) return null;
      const n = new Uint32Array(this.memory.buffer, s, 2);
      return { row: n[0], column: n[1] };
    } finally {
      this.exports.ghostty_wasm_free_u8_array(s, e);
    }
  }
  rememberProvenance(t) {
    this.provenanceIdentities.set(t, {
      id: t.id,
      screen: t.screen
    });
  }
  ownsProvenance(t) {
    const e = this.provenanceIdentities.get(t);
    return !!e && e.id === t.id && e.screen === t.screen && t.id > 0;
  }
  // ==========================================================================
  // RenderState API - The key performance optimization
  // ==========================================================================
  /**
   * Update render state from terminal.
   *
   * This syncs the RenderState with the current Terminal state.
   * The dirty state (full/partial/none) is stored in the WASM RenderState
   * and can be queried via isRowDirty(). When dirty==full, isRowDirty()
   * returns true for ALL rows.
   *
   * The WASM layer automatically detects screen switches (normal <-> alternate)
   * and returns FULL dirty state when switching screens (e.g., vim exit).
   *
   * Safe to call multiple times - dirty state persists until markClean().
   */
  update() {
    return this.exports.ghostty_render_state_update(this.handle);
  }
  /**
   * Get cursor state from render state.
   * Ensures render state is fresh by calling update().
   */
  getCursor() {
    return this.update(), this.readCursor();
  }
  /** Refresh once and collect every Canvas frame-level presentation value. */
  getRenderState() {
    return {
      dirty: this.update(),
      cursor: this.readCursor(),
      colors: this.readColors(),
      dimensions: this.getDimensions()
    };
  }
  /**
   * Get effective colors from render state.
   */
  getColors() {
    return this.update(), this.readColors();
  }
  readCursor() {
    return {
      x: this.exports.ghostty_render_state_get_cursor_x(this.handle),
      y: this.exports.ghostty_render_state_get_cursor_y(this.handle),
      viewportX: this.exports.ghostty_render_state_get_cursor_x(this.handle),
      viewportY: this.exports.ghostty_render_state_get_cursor_y(this.handle),
      visible: !!this.exports.ghostty_render_state_get_cursor_visible(this.handle),
      blinking: !!this.exports.ghostty_render_state_get_cursor_blinking(this.handle),
      style: this.decodeCursorStyle(
        this.exports.ghostty_render_state_get_cursor_style(this.handle)
      ),
      default: !!this.exports.ghostty_render_state_get_cursor_default(this.handle)
    };
  }
  decodeCursorStyle(t) {
    switch (t) {
      case 1:
        return "block_hollow";
      case 2:
        return "bar";
      case 3:
        return "underline";
      default:
        return "block";
    }
  }
  readColors() {
    const t = this.exports.ghostty_render_state_get_bg_color(this.handle), e = this.exports.ghostty_render_state_get_fg_color(this.handle), s = this.exports.ghostty_render_state_get_cursor_color(this.handle), r = (n) => ({
      r: n >> 16 & 255,
      g: n >> 8 & 255,
      b: n & 255
    });
    return {
      background: r(t),
      foreground: r(e),
      cursor: r(s),
      palette: Array.from(
        { length: 16 },
        (n, o) => r(this.exports.ghostty_render_state_get_palette_color(this.handle, o))
      )
    };
  }
  /**
   * Check if a specific row is dirty
   */
  isRowDirty(t) {
    return this.exports.ghostty_render_state_is_row_dirty(this.handle, t);
  }
  /**
   * Mark render state as clean (call after rendering)
   */
  markClean() {
    this.exports.ghostty_render_state_mark_clean(this.handle);
  }
  /**
   * Get ALL viewport cells in ONE WASM call - the key performance optimization!
   * Returns a reusable cell array (zero allocation after warmup).
   */
  getViewport(t = !0) {
    t && this.update();
    const e = this._cols * this._rows, s = e * M.CELL_SIZE;
    return (!this.viewportBufferPtr || this.viewportBufferSize < s) && (this.viewportBufferPtr && this.exports.ghostty_wasm_free_u8_array(this.viewportBufferPtr, this.viewportBufferSize), this.viewportBufferPtr = this.exports.ghostty_wasm_alloc_u8_array(s), this.viewportBufferSize = s), this.exports.ghostty_render_state_get_viewport(
      this.handle,
      this.viewportBufferPtr,
      e
    ) < 0 ? this.cellPool : (this.parseCellsIntoPool(this.viewportBufferPtr, e), this.cellPool);
  }
  // ==========================================================================
  // Compatibility methods (delegate to render state)
  // ==========================================================================
  /**
   * Get line - for compatibility, extracts from viewport.
   * Ensures render state is fresh by calling update().
   * Returns a COPY of the cells to avoid pool reference issues.
   */
  getLine(t) {
    if (t < 0 || t >= this._rows) return null;
    this.update();
    const e = this.getViewport(!1), s = t * this._cols;
    return e.slice(s, s + this._cols).map((r) => ({ ...r }));
  }
  /** For compatibility with old API */
  isDirty() {
    return this.update() !== K.NONE;
  }
  /**
   * Check if a full redraw is needed (screen change, resize, etc.)
   * Note: This calls update() to ensure fresh state. Safe to call multiple times.
   */
  needsFullRedraw() {
    return this.update() === K.FULL;
  }
  /** Mark render state as clean after rendering */
  clearDirty() {
    this.markClean();
  }
  // ==========================================================================
  // Terminal modes
  // ==========================================================================
  isAlternateScreen() {
    return !!this.exports.ghostty_terminal_is_alternate_screen(this.handle);
  }
  /** Read metadata for either Ghostty screen without activating it. */
  getBufferInfo(t) {
    if (!this.handle) return null;
    const e = 5 * Uint32Array.BYTES_PER_ELEMENT;
    if (!this.bufferInfoPtr && (this.bufferInfoPtr = this.exports.ghostty_wasm_alloc_u8_array(e), !this.bufferInfoPtr) || this.exports.ghostty_terminal_get_buffer_info(
      this.handle,
      t === "alternate",
      this.bufferInfoPtr,
      5
    ) !== 5) return null;
    const r = new Uint32Array(this.memory.buffer, this.bufferInfoPtr, 5);
    return {
      scrollbackLength: r[0],
      cursorX: r[1],
      cursorY: r[2],
      rows: r[3],
      cols: r[4]
    };
  }
  /** Copy an absolute retained row from either screen without activating it. */
  getBufferLine(t, e, s = !0) {
    if (!this.handle || e < 0) return null;
    const r = this._cols * M.CELL_SIZE;
    if ((!this.viewportBufferPtr || this.viewportBufferSize < r) && (this.viewportBufferPtr && this.exports.ghostty_wasm_free_u8_array(this.viewportBufferPtr, this.viewportBufferSize), this.viewportBufferPtr = this.exports.ghostty_wasm_alloc_u8_array(r), this.viewportBufferSize = r), !this.viewportBufferPtr) return null;
    s && this.update();
    const n = this.exports.ghostty_terminal_get_buffer_line(
      this.handle,
      t === "alternate",
      e,
      this.viewportBufferPtr,
      this._cols
    );
    return n < 0 ? null : this.parseCells(this.viewportBufferPtr, n);
  }
  /** Read every codepoint for a cell in either named screen. */
  getBufferGrapheme(t, e, s) {
    if (!this.handle || e < 0 || s < 0) return null;
    if (!this.graphemeBufferPtr) {
      if (this.graphemeBufferPtr = this.exports.ghostty_wasm_alloc_u8_array(64), !this.graphemeBufferPtr) return null;
      this.graphemeBuffer = new Uint32Array(this.memory.buffer, this.graphemeBufferPtr, 16);
    }
    const r = this.exports.ghostty_terminal_get_buffer_grapheme(
      this.handle,
      t === "alternate",
      e,
      s,
      this.graphemeBufferPtr,
      16
    );
    return r < 0 ? null : Array.from(new Uint32Array(this.memory.buffer, this.graphemeBufferPtr, r));
  }
  /** Whether an absolute retained row in a named screen continues a soft wrap. */
  isBufferRowWrapped(t, e) {
    return !!this.handle && !!this.exports.ghostty_terminal_is_buffer_row_wrapped(this.handle, t === "alternate", e);
  }
  hasBracketedPaste() {
    return this.getMode(2004, !1);
  }
  hasFocusEvents() {
    return this.getMode(1004, !1);
  }
  hasMouseTracking() {
    return this.exports.ghostty_terminal_has_mouse_tracking(this.handle) !== 0;
  }
  /** Whether Ghostty's parser-owned synchronized-output mode is active. */
  isSynchronizedOutput() {
    return this.getMode(2026, !1);
  }
  /** Changes for every parsed synchronized-output enable, including repeats. */
  getSynchronizedOutputGeneration() {
    return this.exports.ghostty_terminal_get_synchronized_output_generation(this.handle) >>> 0;
  }
  /** Clear abandoned synchronized output without injecting synthetic PTY bytes. */
  resetSynchronizedOutput() {
    this.exports.ghostty_terminal_reset_synchronized_output(this.handle);
  }
  // ==========================================================================
  // Extended API (scrollback, modes, etc.)
  // ==========================================================================
  /** Get dimensions - for compatibility */
  getDimensions() {
    return { cols: this._cols, rows: this._rows };
  }
  /** Get number of scrollback lines (history, not including active screen) */
  getScrollbackLength() {
    return this.exports.ghostty_terminal_get_scrollback_length(this.handle);
  }
  /** Generation changed when eviction or clearing remaps retained row offsets. */
  getScrollbackGeneration() {
    return this.exports.ghostty_terminal_get_scrollback_generation(this.handle) >>> 0;
  }
  /** Get the configured native page-list byte limit; 0 means unlimited. */
  getScrollbackByteLimit() {
    return this.exports.ghostty_terminal_get_scrollback_limit_bytes(this.handle) >>> 0;
  }
  /**
   * Get a line from the scrollback buffer.
   * Ensures render state is fresh by calling update().
   * @param offset 0 = oldest line, (length-1) = most recent scrollback line
   */
  getScrollbackLine(t) {
    const e = this._cols * M.CELL_SIZE;
    (!this.viewportBufferPtr || this.viewportBufferSize < e) && (this.viewportBufferPtr && this.exports.ghostty_wasm_free_u8_array(this.viewportBufferPtr, this.viewportBufferSize), this.viewportBufferPtr = this.exports.ghostty_wasm_alloc_u8_array(e), this.viewportBufferSize = e), this.update();
    const s = this.exports.ghostty_terminal_get_scrollback_line(
      this.handle,
      t,
      this.viewportBufferPtr,
      this._cols
    );
    if (s < 0) return null;
    const r = [], n = this.memory.buffer, o = new Uint8Array(n, this.viewportBufferPtr, s * M.CELL_SIZE), l = new DataView(n, this.viewportBufferPtr, s * M.CELL_SIZE);
    for (let a = 0; a < s; a++) {
      const h = a * M.CELL_SIZE;
      r.push({
        codepoint: l.getUint32(h, !0),
        fg_r: o[h + 4],
        fg_g: o[h + 5],
        fg_b: o[h + 6],
        bg_r: o[h + 7],
        bg_g: o[h + 8],
        bg_b: o[h + 9],
        flags: o[h + 10],
        width: o[h + 11],
        hyperlink_id: l.getUint16(h + 12, !0),
        grapheme_len: o[h + 14]
      });
    }
    return r;
  }
  /**
   * Copy one visible retained-history slice in a single WASM call. The result
   * is bounded to the active viewport height and reuses its row/cell objects.
   */
  getScrollbackViewport(t, e) {
    if (!this.handle || !Number.isInteger(t) || !Number.isInteger(e) || t < 0 || e < 0 || e > this._rows)
      return null;
    if (e === 0) return [];
    const s = e * this._cols, r = s * M.CELL_SIZE;
    if ((!this.viewportBufferPtr || this.viewportBufferSize < r) && (this.viewportBufferPtr && this.exports.ghostty_wasm_free_u8_array(this.viewportBufferPtr, this.viewportBufferSize), this.viewportBufferPtr = this.exports.ghostty_wasm_alloc_u8_array(r), this.viewportBufferSize = r), !this.viewportBufferPtr) return null;
    this.update();
    const n = this.exports.ghostty_terminal_get_scrollback_viewport(
      this.handle,
      t,
      e,
      this.viewportBufferPtr,
      s
    );
    if (n !== s) return null;
    this.ensureCellPool(this.scrollbackViewportCellPool, n), this.parseCellsInto(this.viewportBufferPtr, n, this.scrollbackViewportCellPool), this.scrollbackViewportRows.length = e;
    for (let o = 0; o < e; o++) {
      let l = this.scrollbackViewportRows[o];
      (!l || l.length !== this._cols) && (l = new Array(this._cols), this.scrollbackViewportRows[o] = l);
      const a = o * this._cols;
      for (let h = 0; h < this._cols; h++)
        l[h] = this.scrollbackViewportCellPool[a + h];
    }
    return this.scrollbackViewportRows;
  }
  /** Check if a row in the active screen is wrapped (soft-wrapped to next line) */
  isRowWrapped(t) {
    return this.exports.ghostty_terminal_is_row_wrapped(this.handle, t) !== 0;
  }
  /**
   * Get the hyperlink URI for a cell at the given position.
   * @param row Row index (0-based, in active viewport)
   * @param col Column index (0-based)
   * @returns The URI string, or null if no hyperlink at that position
   */
  getHyperlinkUri(t, e) {
    if (!this.exports.ghostty_terminal_get_hyperlink_uri)
      return null;
    const s = [2048, 8192, 32768];
    for (const r of s) {
      const n = this.exports.ghostty_wasm_alloc_u8_array(r);
      try {
        const o = this.exports.ghostty_terminal_get_hyperlink_uri(
          this.handle,
          t,
          e,
          n,
          r
        );
        if (o === 0) return null;
        if (o === -1) continue;
        if (o < 0) return null;
        const l = new Uint8Array(this.memory.buffer, n, o);
        return new TextDecoder().decode(l.slice());
      } finally {
        this.exports.ghostty_wasm_free_u8_array(n, r);
      }
    }
    return null;
  }
  /**
   * Get the hyperlink URI for a cell in the scrollback buffer.
   * @param offset Scrollback line offset (0 = oldest, scrollback_len-1 = newest)
   * @param col Column index (0-based)
   * @returns The URI string, or null if no hyperlink at that position
   */
  getScrollbackHyperlinkUri(t, e) {
    if (!this.exports.ghostty_terminal_get_scrollback_hyperlink_uri)
      return null;
    const s = [2048, 8192, 32768];
    for (const r of s) {
      const n = this.exports.ghostty_wasm_alloc_u8_array(r);
      try {
        const o = this.exports.ghostty_terminal_get_scrollback_hyperlink_uri(
          this.handle,
          t,
          e,
          n,
          r
        );
        if (o === 0) return null;
        if (o === -1) continue;
        if (o < 0) return null;
        const l = new Uint8Array(this.memory.buffer, n, o);
        return new TextDecoder().decode(l.slice());
      } finally {
        this.exports.ghostty_wasm_free_u8_array(n, r);
      }
    }
    return null;
  }
  /**
   * Check if there are pending responses from the terminal.
   * Responses are generated by escape sequences like DSR (Device Status Report).
   */
  hasResponse() {
    return this.exports.ghostty_terminal_has_response(this.handle);
  }
  /**
   * Read pending responses from the terminal.
   * Returns the response string, or null if no responses pending.
   *
   * Responses are generated by escape sequences that require replies:
   * - DSR 6 (cursor position): Returns \x1b[row;colR
   * - DSR 5 (operating status): Returns \x1b[0n
   */
  readResponse() {
    if (!this.hasResponse()) return null;
    const t = 256, e = this.exports.ghostty_wasm_alloc_u8_array(t);
    try {
      const s = this.exports.ghostty_terminal_read_response(this.handle, e, t);
      if (s <= 0) return null;
      const r = new Uint8Array(this.memory.buffer, e, s);
      return new TextDecoder().decode(r.slice());
    } finally {
      this.exports.ghostty_wasm_free_u8_array(e, t);
    }
  }
  /**
   * Query arbitrary terminal mode by number
   * @param mode Mode number (e.g., 25 for cursor visibility, 2004 for bracketed paste)
   * @param isAnsi True for ANSI modes, false for DEC modes (default: false)
   */
  getMode(t, e = !1) {
    return this.exports.ghostty_terminal_get_mode(this.handle, t, e) !== 0;
  }
  getKittyKeyboardFlags() {
    return this.exports.ghostty_terminal_get_kitty_keyboard_flags(this.handle);
  }
  hasModifyOtherKeysState2() {
    return this.exports.ghostty_terminal_has_modify_other_keys_state_2(this.handle) !== 0;
  }
  // ==========================================================================
  // Private helpers
  // ==========================================================================
  initCellPool() {
    const t = this._cols * this._rows;
    this.ensureCellPool(this.cellPool, t);
  }
  ensureCellPool(t, e) {
    if (t.length < e)
      for (let s = t.length; s < e; s++)
        t.push({
          codepoint: 0,
          fg_r: 204,
          fg_g: 204,
          fg_b: 204,
          bg_r: 0,
          bg_g: 0,
          bg_b: 0,
          flags: 0,
          width: 1,
          hyperlink_id: 0,
          grapheme_len: 0
        });
  }
  parseCellsIntoPool(t, e) {
    this.parseCellsInto(t, e, this.cellPool);
  }
  parseCellsInto(t, e, s) {
    const r = this.memory.buffer, n = new Uint8Array(r, t, e * M.CELL_SIZE), o = new DataView(r, t, e * M.CELL_SIZE);
    for (let l = 0; l < e; l++) {
      const a = l * M.CELL_SIZE, h = s[l];
      h.codepoint = o.getUint32(a, !0), h.fg_r = n[a + 4], h.fg_g = n[a + 5], h.fg_b = n[a + 6], h.bg_r = n[a + 7], h.bg_g = n[a + 8], h.bg_b = n[a + 9], h.flags = n[a + 10], h.width = n[a + 11], h.hyperlink_id = o.getUint16(a + 12, !0), h.grapheme_len = n[a + 14];
    }
  }
  parseCells(t, e) {
    const s = this.memory.buffer, r = new Uint8Array(s, t, e * M.CELL_SIZE), n = new DataView(s, t, e * M.CELL_SIZE), o = [];
    for (let l = 0; l < e; l++) {
      const a = l * M.CELL_SIZE;
      o.push({
        codepoint: n.getUint32(a, !0),
        fg_r: r[a + 4],
        fg_g: r[a + 5],
        fg_b: r[a + 6],
        bg_r: r[a + 7],
        bg_g: r[a + 8],
        bg_b: r[a + 9],
        flags: r[a + 10],
        width: r[a + 11],
        hyperlink_id: n.getUint16(a + 12, !0),
        grapheme_len: r[a + 14]
      });
    }
    return o;
  }
  /**
   * Get all codepoints for a grapheme cluster at the given position.
   * For most cells this returns a single codepoint, but for complex scripts
   * (Hindi, emoji with ZWJ, etc.) it returns multiple codepoints.
   * @returns Array of codepoints, or null on error
   */
  getGrapheme(t, e, s = !0) {
    this.graphemeBuffer || (this.graphemeBufferPtr = this.exports.ghostty_wasm_alloc_u8_array(64), this.graphemeBuffer = new Uint32Array(this.memory.buffer, this.graphemeBufferPtr, 16)), s && this.update();
    const r = this.exports.ghostty_render_state_get_grapheme(
      this.handle,
      t,
      e,
      this.graphemeBufferPtr,
      16
    );
    if (r < 0) return null;
    const n = new Uint32Array(this.memory.buffer, this.graphemeBufferPtr, r);
    return Array.from(n);
  }
  /**
   * Get a string representation of the grapheme at the given position.
   * This properly handles complex scripts like Hindi, emoji with ZWJ, etc.
   */
  getGraphemeString(t, e, s = !0) {
    const r = this.getGrapheme(t, e, s);
    return !r || r.length === 0 ? " " : String.fromCodePoint(...r);
  }
  /**
   * Get all codepoints for a grapheme cluster in the scrollback buffer.
   * @param offset Scrollback line offset (0 = oldest)
   * @param col Column index
   * @returns Array of codepoints, or null on error
   */
  getScrollbackGrapheme(t, e) {
    this.graphemeBuffer || (this.graphemeBufferPtr = this.exports.ghostty_wasm_alloc_u8_array(64), this.graphemeBuffer = new Uint32Array(this.memory.buffer, this.graphemeBufferPtr, 16));
    const s = this.exports.ghostty_terminal_get_scrollback_grapheme(
      this.handle,
      t,
      e,
      this.graphemeBufferPtr,
      16
    );
    if (s < 0) return null;
    const r = new Uint32Array(this.memory.buffer, this.graphemeBufferPtr, s);
    return Array.from(r);
  }
  /**
   * Get a string representation of a grapheme in the scrollback buffer.
   */
  getScrollbackGraphemeString(t, e) {
    const s = this.getScrollbackGrapheme(t, e);
    return !s || s.length === 0 ? " " : String.fromCodePoint(...s);
  }
  invalidateBuffers() {
    this.viewportBufferPtr && (this.exports.ghostty_wasm_free_u8_array(this.viewportBufferPtr, this.viewportBufferSize), this.viewportBufferPtr = 0, this.viewportBufferSize = 0), this.graphemeBufferPtr && (this.exports.ghostty_wasm_free_u8_array(this.graphemeBufferPtr, 64), this.graphemeBufferPtr = 0), this.bufferInfoPtr && (this.exports.ghostty_wasm_free_u8_array(
      this.bufferInfoPtr,
      5 * Uint32Array.BYTES_PER_ELEMENT
    ), this.bufferInfoPtr = 0), this.graphemeBuffer = null;
  }
};
M.CELL_SIZE = 16;
let ht = M;
class Ze {
  constructor(t = {}) {
    this.generation = 0, this.observing = !1, this.suspended = !1, this.resizing = !1;
    const e = t.resizeDebounceMs;
    this.delay = typeof e == "number" && Number.isFinite(e) && e >= 0 ? e : 100;
  }
  activate(t) {
    this.terminal = t, this.suspended = !1;
  }
  /** Initial manual fitting remains available before observation starts. */
  fit() {
    this.fitCurrentGeometry();
  }
  /** True only after current geometry is measurable, including an unchanged grid. */
  fitCurrentGeometry() {
    var e, s;
    if (!this.terminal || this.suspended) return !1;
    if (this.resizing)
      return this.schedule(), !1;
    const t = this.proposeDimensions();
    if (!t) return !1;
    if (t.cols === this.terminal.cols && t.rows === this.terminal.rows)
      return !0;
    this.resizing = !0;
    try {
      (s = (e = this.terminal).resize) == null || s.call(e, t.cols, t.rows);
    } finally {
      this.resizing = !1;
    }
    return !0;
  }
  proposeDimensions() {
    var o, l, a;
    const t = (o = this.terminal) == null ? void 0 : o.element, e = (a = (l = this.terminal) == null ? void 0 : l.renderer) == null ? void 0 : a.getMetrics();
    if (!t || !e) return;
    const s = window.getComputedStyle(t), r = t.clientWidth - J(s.paddingLeft) - J(s.paddingRight), n = t.clientHeight - J(s.paddingTop) - J(s.paddingBottom);
    if ([r, n, e.width, e.height].every(
      (h) => Number.isFinite(h) && h > 0
    ))
      return {
        cols: Math.max(2, Math.floor(r / e.width)),
        rows: Math.max(1, Math.floor(n / e.height))
      };
  }
  observeResize() {
    this.resume();
  }
  /** Notify after a measurable settled fit; keep completion pending while geometry is invalid. */
  resume(t) {
    if (this.terminal) {
      if (this.suspended = !1, this.observing = !0, t && (this.completion = t), !this.observer && this.terminal.element) {
        const e = new ResizeObserver(() => {
          this.observer === e && this.schedule();
        });
        this.observer = e, e.observe(this.terminal.element);
      }
      this.schedule();
    }
  }
  suspend() {
    var t;
    this.suspended = !0, this.observing = !1, this.generation++, (t = this.observer) == null || t.disconnect(), this.observer = void 0, this.cancel(), this.completion = void 0;
  }
  onDevicePixelRatioChange() {
    this.onCellMetricsChange();
  }
  onCellMetricsChange() {
    !this.terminal || this.suspended || (this.observing ? this.schedule() : this.fit());
  }
  dispose() {
    this.suspend(), this.terminal = void 0;
  }
  cancel() {
    this.timer !== void 0 && clearTimeout(this.timer), this.frame !== void 0 && cancelAnimationFrame(this.frame), this.timer = void 0, this.frame = void 0;
  }
  schedule() {
    if (!this.observing || this.suspended || !this.terminal) return;
    this.cancel();
    const t = ++this.generation;
    this.timer = setTimeout(() => {
      this.current(t) && (this.timer = void 0, this.frame = requestAnimationFrame(() => {
        if (!this.current(t) || (this.frame = void 0, !this.fitCurrentGeometry() || !this.current(t))) return;
        const e = this.completion;
        this.completion = void 0, e == null || e();
      }));
    }, this.delay);
  }
  current(t) {
    return !!this.terminal && this.observing && !this.suspended && t === this.generation;
  }
}
function J(i) {
  return Number.parseFloat(i) || 0;
}
const re = /* @__PURE__ */ new Set([
  0,
  // NUL
  3,
  // VINTR (Ctrl+C)
  4,
  // EOT
  5,
  // ENQ
  8,
  // BS
  15,
  // VDISCARD (Ctrl+O)
  17,
  // VSTART (Ctrl+Q)
  18,
  // VREPRINT (Ctrl+R)
  19,
  // VSTOP (Ctrl+S)
  21,
  // VKILL (Ctrl+U)
  22,
  // VLNEXT (Ctrl+V)
  23,
  // VWERASE (Ctrl+W)
  26,
  // VSUSP (Ctrl+Z)
  27,
  // ESC
  28,
  // VQUIT (Ctrl+\)
  127
  // DEL
]);
function ne(i) {
  let t = "";
  for (const e of i)
    t += re.has(e.charCodeAt(0)) ? " " : e;
  return t;
}
function Ot(i, t) {
  const e = ne(i);
  return t ? `\x1B[200~${e}\x1B[201~` : e;
}
class oe {
  constructor() {
    this.remainder = 0;
  }
  reset() {
    this.route = void 0, this.remainder = 0;
  }
  consume(t, e, s, r = {}) {
    if (!Number.isFinite(t.deltaY) || t.deltaY === 0) return 0;
    s !== this.route && (this.reset(), this.route = s);
    const n = rt(r.linesPerStep, 3), o = rt(e, 16), l = t.deltaMode === 2 ? t.deltaY : t.deltaY / (t.deltaMode === 1 ? n : o * n);
    if (!Number.isFinite(l)) return 0;
    this.remainder !== 0 && Math.sign(this.remainder) !== Math.sign(l) && (this.remainder = 0);
    const a = this.remainder + l, h = Number.EPSILON * 8, c = Math.trunc(a + Math.sign(a) * h);
    if (this.remainder = a - c, Math.abs(this.remainder) < h && (this.remainder = 0), c === 0) return 0;
    const u = Math.max(
      1,
      Math.min(
        100,
        Math.trunc(
          rt(
            s === "mouse" ? r.maxMouseReports : r.maxFallbackKeys,
            s === "mouse" ? 1 : 5
          )
        )
      )
    );
    return Math.max(-u, Math.min(c, u));
  }
}
function rt(i, t) {
  return i !== void 0 && Number.isFinite(i) && i > 0 ? i : t;
}
const ae = {
  // Letters
  KeyA: d.A,
  KeyB: d.B,
  KeyC: d.C,
  KeyD: d.D,
  KeyE: d.E,
  KeyF: d.F,
  KeyG: d.G,
  KeyH: d.H,
  KeyI: d.I,
  KeyJ: d.J,
  KeyK: d.K,
  KeyL: d.L,
  KeyM: d.M,
  KeyN: d.N,
  KeyO: d.O,
  KeyP: d.P,
  KeyQ: d.Q,
  KeyR: d.R,
  KeyS: d.S,
  KeyT: d.T,
  KeyU: d.U,
  KeyV: d.V,
  KeyW: d.W,
  KeyX: d.X,
  KeyY: d.Y,
  KeyZ: d.Z,
  // Numbers
  Digit1: d.ONE,
  Digit2: d.TWO,
  Digit3: d.THREE,
  Digit4: d.FOUR,
  Digit5: d.FIVE,
  Digit6: d.SIX,
  Digit7: d.SEVEN,
  Digit8: d.EIGHT,
  Digit9: d.NINE,
  Digit0: d.ZERO,
  // Special keys
  Enter: d.ENTER,
  Escape: d.ESCAPE,
  Backspace: d.BACKSPACE,
  Tab: d.TAB,
  Space: d.SPACE,
  // Punctuation
  Minus: d.MINUS,
  Equal: d.EQUAL,
  BracketLeft: d.BRACKET_LEFT,
  BracketRight: d.BRACKET_RIGHT,
  Backslash: d.BACKSLASH,
  Semicolon: d.SEMICOLON,
  Quote: d.QUOTE,
  Backquote: d.GRAVE,
  Comma: d.COMMA,
  Period: d.PERIOD,
  Slash: d.SLASH,
  // Function keys
  CapsLock: d.CAPS_LOCK,
  F1: d.F1,
  F2: d.F2,
  F3: d.F3,
  F4: d.F4,
  F5: d.F5,
  F6: d.F6,
  F7: d.F7,
  F8: d.F8,
  F9: d.F9,
  F10: d.F10,
  F11: d.F11,
  F12: d.F12,
  // Special function keys
  PrintScreen: d.PRINT_SCREEN,
  ScrollLock: d.SCROLL_LOCK,
  Pause: d.PAUSE,
  Insert: d.INSERT,
  Home: d.HOME,
  PageUp: d.PAGE_UP,
  Delete: d.DELETE,
  End: d.END,
  PageDown: d.PAGE_DOWN,
  // Arrow keys
  ArrowRight: d.RIGHT,
  ArrowLeft: d.LEFT,
  ArrowDown: d.DOWN,
  ArrowUp: d.UP,
  // Keypad
  NumLock: d.NUM_LOCK,
  NumpadDivide: d.KP_DIVIDE,
  NumpadMultiply: d.KP_MULTIPLY,
  NumpadSubtract: d.KP_MINUS,
  NumpadAdd: d.KP_PLUS,
  NumpadEnter: d.KP_ENTER,
  Numpad1: d.KP_1,
  Numpad2: d.KP_2,
  Numpad3: d.KP_3,
  Numpad4: d.KP_4,
  Numpad5: d.KP_5,
  Numpad6: d.KP_6,
  Numpad7: d.KP_7,
  Numpad8: d.KP_8,
  Numpad9: d.KP_9,
  Numpad0: d.KP_0,
  NumpadDecimal: d.KP_PERIOD,
  // International
  IntlBackslash: d.INTL_BACKSLASH,
  ContextMenu: d.CONTEXT_MENU,
  // Additional function keys
  F13: d.F13,
  F14: d.F14,
  F15: d.F15,
  F16: d.F16,
  F17: d.F17,
  F18: d.F18,
  F19: d.F19,
  F20: d.F20,
  F21: d.F21,
  F22: d.F22,
  F23: d.F23,
  F24: d.F24
}, le = {
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Comma: ",",
  Period: ".",
  Slash: "/"
};
function he(i) {
  if (i.code.startsWith("Key"))
    return i.code.substring(3).toLowerCase().codePointAt(0) ?? 0;
  if (i.code.startsWith("Digit"))
    return i.code.substring(5).codePointAt(0) ?? 0;
  if (i.code === "Space") return " ".codePointAt(0) ?? 0;
  const t = le[i.code];
  return t ? t.codePointAt(0) ?? 0 : i.key.codePointAt(0) ?? 0;
}
function ce(i) {
  var r;
  if (!i.altKey || i.ctrlKey || i.metaKey || typeof navigator > "u")
    return null;
  const t = (r = navigator.userAgentData) == null ? void 0 : r.platform, e = t || navigator.platform || "";
  if (t !== "macOS" && !e.startsWith("Mac")) return null;
  const s = /^Key([A-Z])$/.exec(i.code);
  return s ? i.shiftKey ? s[1] : s[1].toLowerCase() : null;
}
const st = class st {
  /**
   * Create a new InputHandler
   * @param ghostty - Ghostty instance (for creating KeyEncoder)
   * @param container - DOM element to attach listeners to
   * @param onData - Callback for terminal data (escape sequences to send to PTY)
   * @param onBell - Callback for bell/beep event
   * @param onKey - Optional callback for raw key events
   * @param customKeyEventHandler - Optional custom key event handler
   * @param getMode - Optional callback to query terminal mode state (for application cursor mode)
   * @param onCopy - Optional callback to handle copy (Cmd+C/Ctrl+C with selection)
   * @param inputElement - Optional input element for beforeinput events
   * @param mouseConfig - Optional mouse tracking configuration
   * @param getKeyboardProtocolState - Optional callback for negotiated keyboard protocol state
   * @param resolveClipboardFilePaste - Optional capability that maps one native clipboard file paste to text
   */
  constructor(t, e, s, r, n, o, l, a, h, c, u, p) {
    this.keydownListener = null, this.keypressListener = null, this.pasteListener = null, this.beforeInputListener = null, this.compositionStartListener = null, this.compositionUpdateListener = null, this.compositionEndListener = null, this.mousedownListener = null, this.mouseupListener = null, this.mousemoveListener = null, this.wheelListener = null, this.isComposing = !1, this.isDisposed = !1, this.wheelGesture = new oe(), this.mouseButtonsPressed = 0, this.locallyOwnedMouseButtons = 0, this.lastKeyDownData = null, this.lastPasteData = null, this.lastPasteTime = 0, this.lastPasteSource = null, this.lastBeforeInputData = null, this.compositionTransaction = null, this.encoder = t.createKeyEncoder(), this.container = e, this.inputElement = h, this.onDataCallback = s, this.onBellCallback = r, this.onKeyCallback = n, this.customKeyEventHandler = o, this.getModeCallback = l, this.onCopyCallback = a, this.mouseConfig = c, this.getKeyboardProtocolStateCallback = u, this.resolveClipboardFilePasteCallback = p;
    try {
      this.attach();
    } catch (m) {
      throw this.dispose(), m;
    }
  }
  /**
   * Set custom key event handler (for runtime updates)
   */
  setCustomKeyEventHandler(t) {
    this.customKeyEventHandler = t;
  }
  /**
   * Emit synthesized arrow presses through Ghostty's negotiated key encoder.
   * Used by alternate-screen wheel fallback so cursor and keyboard modes stay authoritative.
   */
  sendArrowKeys(t, e) {
    var s;
    if (!(this.isDisposed || e <= 0))
      try {
        const r = (s = this.getKeyboardProtocolStateCallback) == null ? void 0 : s.call(this);
        this.syncEncoderOptions(r);
        const n = this.encoder.encode({
          action: lt.PRESS,
          key: t === "up" ? d.UP : d.DOWN,
          mods: H.NONE
        }), o = new TextDecoder().decode(n);
        if (o.length > 0)
          for (let l = 0; l < e; l++) this.onDataCallback(o);
      } catch (r) {
        console.warn(`Failed to encode ${t} arrow wheel fallback:`, r);
      }
  }
  /** Called by the terminal capture route when local or custom input takes ownership. */
  resetWheelGesture() {
    this.wheelGesture.reset();
  }
  sendAlternateWheel(t) {
    var r, n, o;
    if (this.isDisposed) return;
    const e = (n = (r = this.mouseConfig) == null ? void 0 : r.getWheelOptions) == null ? void 0 : n.call(r);
    if (!e) {
      this.resetWheelGesture(), Number.isFinite(t.deltaY) && this.sendArrowKeys(
        t.deltaY < 0 ? "up" : "down",
        Math.min(Math.abs(Math.round(t.deltaY / 33)), 5)
      );
      return;
    }
    const s = this.wheelGesture.consume(
      t,
      ((o = this.mouseConfig) == null ? void 0 : o.getCellDimensions().height) ?? 16,
      "fallback",
      e
    );
    if (s !== 0)
      if ((e == null ? void 0 : e.alternateScreenFallback) === "page")
        for (let l = 0; l < Math.abs(s); l++)
          this.onDataCallback(s < 0 ? "\x1B[5~" : "\x1B[6~");
      else
        this.sendArrowKeys(s < 0 ? "up" : "down", Math.abs(s));
  }
  syncEncoderOptions(t) {
    this.getModeCallback && this.encoder.setOption(j.CURSOR_KEY_APPLICATION, this.getModeCallback(1)), t && (this.encoder.setKittyFlags(t.kittyFlags), this.encoder.setOption(
      j.MODIFY_OTHER_KEYS_STATE_2,
      t.modifyOtherKeysState2
    ));
  }
  /**
   * Attach keyboard event listeners to container
   */
  attach() {
    this.keydownListener = this.handleKeyDown.bind(this), this.container.addEventListener("keydown", this.keydownListener), this.pasteListener = this.handlePaste.bind(this), this.container.addEventListener("paste", this.pasteListener), this.inputElement && this.inputElement !== this.container && this.inputElement.addEventListener("paste", this.pasteListener), this.inputElement && (this.beforeInputListener = this.handleBeforeInput.bind(this), this.inputElement.addEventListener("beforeinput", this.beforeInputListener)), this.compositionStartListener = this.handleCompositionStart.bind(this), this.container.addEventListener("compositionstart", this.compositionStartListener), this.compositionUpdateListener = this.handleCompositionUpdate.bind(this), this.container.addEventListener("compositionupdate", this.compositionUpdateListener), this.compositionEndListener = this.handleCompositionEnd.bind(this), this.container.addEventListener("compositionend", this.compositionEndListener), this.mousedownListener = this.handleMouseDown.bind(this), this.container.addEventListener("mousedown", this.mousedownListener), this.mouseupListener = this.handleMouseUp.bind(this), this.container.addEventListener("mouseup", this.mouseupListener), this.mousemoveListener = this.handleMouseMove.bind(this), this.container.addEventListener("mousemove", this.mousemoveListener), this.wheelListener = this.handleWheel.bind(this), this.container.addEventListener("wheel", this.wheelListener, { passive: !1 });
  }
  /**
   * Map KeyboardEvent.code to USB HID Key enum value
   * @param code - KeyboardEvent.code value
   * @returns Key enum value or null if unmapped
   */
  mapKeyCode(t) {
    return ae[t] ?? null;
  }
  /**
   * Extract modifier flags from KeyboardEvent
   * @param event - KeyboardEvent
   * @returns Mods flags
   */
  extractModifiers(t) {
    let e = H.NONE;
    return t.shiftKey && (e |= H.SHIFT), t.ctrlKey && (e |= H.CTRL), t.altKey && (e |= H.ALT), t.metaKey && (e |= H.SUPER), e;
  }
  /**
   * Check if this is a printable character with no special modifiers
   * @param event - KeyboardEvent
   * @returns true if printable character
   */
  isPrintableCharacter(t) {
    return t.ctrlKey && !t.altKey || t.altKey && !t.ctrlKey || t.metaKey ? !1 : t.key.length === 1;
  }
  /**
   * Handle keydown event
   * @param event - KeyboardEvent
   */
  handleKeyDown(t) {
    var a, h;
    if (this.isDisposed || this.isComposing || t.isComposing || t.keyCode === 229)
      return;
    if (this.onKeyCallback && this.onKeyCallback({ key: t.key, domEvent: t }), this.customKeyEventHandler && this.customKeyEventHandler(t)) {
      t.preventDefault();
      return;
    }
    if ((t.ctrlKey || t.metaKey) && t.code === "KeyV")
      return;
    if (t.metaKey && t.code === "KeyC") {
      this.onCopyCallback && this.onCopyCallback() && t.preventDefault();
      return;
    }
    if (t.ctrlKey && t.shiftKey && !t.altKey && !t.metaKey && t.code === "KeyC") {
      (a = this.onCopyCallback) == null || a.call(this), t.preventDefault(), t.stopPropagation();
      return;
    }
    if (this.isPrintableCharacter(t)) {
      t.preventDefault(), this.onDataCallback(t.key), this.recordKeyDownData(t.key);
      return;
    }
    const e = this.mapKeyCode(t.code);
    if (e === null)
      return;
    const s = this.extractModifiers(t), r = (h = this.getKeyboardProtocolStateCallback) == null ? void 0 : h.call(this), n = r !== void 0 && (r.kittyFlags !== Dt.DISABLED || r.modifyOtherKeysState2), o = ce(t);
    if (o !== null && !n) {
      const c = `\x1B${o}`;
      t.preventDefault(), t.stopPropagation(), this.onDataCallback(c), this.recordKeyDownData(c);
      return;
    }
    if ((s === H.NONE || s === H.SHIFT) && !n) {
      let c = null;
      switch (e) {
        case d.ENTER:
          c = "\r";
          break;
        case d.TAB:
          s === H.SHIFT ? c = "\x1B[Z" : c = "	";
          break;
        case d.BACKSPACE:
          c = "";
          break;
        case d.ESCAPE:
          c = "\x1B";
          break;
        // Arrow keys are handled by the encoder (respects application cursor mode)
        // Navigation keys
        case d.HOME:
          c = "\x1B[H";
          break;
        case d.END:
          c = "\x1B[F";
          break;
        case d.INSERT:
          c = "\x1B[2~";
          break;
        case d.DELETE:
          c = "\x1B[3~";
          break;
        case d.PAGE_UP:
          c = "\x1B[5~";
          break;
        case d.PAGE_DOWN:
          c = "\x1B[6~";
          break;
        // Function keys
        case d.F1:
          c = "\x1BOP";
          break;
        case d.F2:
          c = "\x1BOQ";
          break;
        case d.F3:
          c = "\x1BOR";
          break;
        case d.F4:
          c = "\x1BOS";
          break;
        case d.F5:
          c = "\x1B[15~";
          break;
        case d.F6:
          c = "\x1B[17~";
          break;
        case d.F7:
          c = "\x1B[18~";
          break;
        case d.F8:
          c = "\x1B[19~";
          break;
        case d.F9:
          c = "\x1B[20~";
          break;
        case d.F10:
          c = "\x1B[21~";
          break;
        case d.F11:
          c = "\x1B[23~";
          break;
        case d.F12:
          c = "\x1B[24~";
          break;
      }
      if (c !== null) {
        t.preventDefault(), this.onDataCallback(c), this.recordKeyDownData(c);
        return;
      }
    }
    const l = lt.PRESS;
    try {
      this.syncEncoderOptions(r);
      const c = t.key.length === 1 && t.key.charCodeAt(0) < 128 ? t.key.toLowerCase() : void 0, u = this.encoder.encode({
        action: l,
        key: e,
        mods: s,
        utf8: c,
        unshiftedCodepoint: he(t)
      }), m = new TextDecoder().decode(u);
      t.preventDefault(), t.stopPropagation(), m.length > 0 && (this.onDataCallback(m), this.recordKeyDownData(m));
    } catch (c) {
      console.warn("Failed to encode key:", t.code, c);
    }
  }
  /**
   * Handle paste event from clipboard
   * @param event - ClipboardEvent
   */
  handlePaste(t) {
    if (this.isDisposed) return;
    t.preventDefault(), t.stopPropagation();
    const e = t.clipboardData;
    if (!e) {
      console.warn("No clipboard data available");
      return;
    }
    const s = e.getData("text/plain");
    if (s) {
      this.acceptPasteText(s);
      return;
    }
    if (e.files.length > 1 || !this.resolveClipboardFilePasteCallback) {
      console.warn("No text in clipboard");
      return;
    }
    const r = e.files.length === 1 ? e.files.item(0) : void 0;
    if (e.files.length === 1 && !r) {
      console.warn("No text in clipboard");
      return;
    }
    try {
      const n = this.resolveClipboardFilePasteCallback(r ?? void 0);
      if (typeof n != "string" && n !== void 0) {
        n.then(
          (o) => this.acceptResolvedClipboardFilePaste(o),
          () => console.warn("Clipboard file paste resolver failed")
        );
        return;
      }
      this.acceptResolvedClipboardFilePaste(n);
    } catch {
      console.warn("Clipboard file paste resolver failed");
    }
  }
  acceptResolvedClipboardFilePaste(t) {
    if (!this.isDisposed) {
      if (!t) {
        console.warn("No text in clipboard");
        return;
      }
      this.acceptPasteText(t);
    }
  }
  acceptPasteText(t) {
    this.shouldIgnorePasteEvent(t, "paste") || (this.emitPasteData(t), this.recordPasteData(t, "paste"));
  }
  /**
   * Handle beforeinput event (mobile/IME input)
   * @param event - InputEvent
   */
  handleBeforeInput(t) {
    if (this.isDisposed || t.isComposing)
      return;
    const e = t.inputType, s = t.data ?? "";
    let r = null;
    switch (e) {
      case "insertText":
      case "insertReplacementText":
      case "insertFromComposition":
        r = s.length > 0 ? s.replace(/\n/g, "\r") : null;
        break;
      case "insertLineBreak":
      case "insertParagraph":
        r = "\r";
        break;
      case "deleteContentBackward":
        r = "";
        break;
      case "deleteContentForward":
        r = "\x1B[3~";
        break;
      case "insertFromPaste":
        if (!s)
          return;
        if (this.shouldIgnorePasteEvent(s, "beforeinput")) {
          t.preventDefault(), t.stopPropagation(), this.scheduleInputStateReset();
          return;
        }
        t.preventDefault(), t.stopPropagation(), this.emitPasteData(s), this.recordPasteData(s, "beforeinput"), this.scheduleInputStateReset();
        return;
      default:
        return;
    }
    if (!r)
      return;
    const n = this.compositionTransaction, o = e === "insertText" || e === "insertReplacementText" || e === "insertFromComposition";
    if ((n == null ? void 0 : n.phase) === "active" && o) {
      t.stopPropagation(), this.onDataCallback(r), n.emittedData = r, this.scheduleInputStateReset();
      return;
    }
    if ((n == null ? void 0 : n.phase) !== "active") {
      if ((n == null ? void 0 : n.phase) === "ended") {
        if (n.emittedData === r) {
          t.stopPropagation(), this.compositionTransaction = null, this.scheduleInputStateReset();
          return;
        }
        this.compositionTransaction = null;
      }
      if (this.shouldIgnoreBeforeInput(r)) {
        t.preventDefault(), t.stopPropagation(), this.scheduleInputStateReset();
        return;
      }
      t.preventDefault(), t.stopPropagation(), this.onDataCallback(r), s && (this.lastBeforeInputData = r), this.scheduleInputStateReset();
    }
  }
  /**
   * Handle compositionstart event
   */
  handleCompositionStart(t) {
    this.isDisposed || (this.cancelInputStateReset(), this.resetTextarea(), this.clearTransientInputState(), this.isComposing = !0, this.compositionTransaction = { phase: "active", emittedData: null });
  }
  /**
   * Handle compositionupdate event
   */
  handleCompositionUpdate(t) {
    this.isDisposed;
  }
  /**
   * Handle compositionend event
   */
  handleCompositionEnd(t) {
    var r;
    if (this.isDisposed) return;
    this.isComposing = !1;
    const e = ((r = t.data) == null ? void 0 : r.replace(/\n/g, "\r")) ?? "", s = this.compositionTransaction ?? {
      phase: "active",
      emittedData: null
    };
    e && e.length > 0 && (s.emittedData === null && this.lastBeforeInputData === e ? (s.emittedData = e, this.lastBeforeInputData = null) : (s.emittedData === null && this.onDataCallback(e), s.emittedData = e)), s.phase = "ended", this.compositionTransaction = s, this.cleanupCompositionTextNodes(), this.scheduleInputStateReset();
  }
  /**
   * Cleanup text nodes in container after composition
   */
  cleanupCompositionTextNodes() {
    if (this.container && this.container.childNodes)
      for (let t = this.container.childNodes.length - 1; t >= 0; t--) {
        const e = this.container.childNodes[t];
        e.nodeType === 3 && this.container.removeChild(e);
      }
  }
  // ==========================================================================
  // Mouse Event Handling (for terminal mouse tracking)
  // ==========================================================================
  /**
   * Convert pixel coordinates to terminal cell coordinates
   */
  pixelToCell(t) {
    var a, h, c, u;
    if (!this.mouseConfig) return null;
    const e = this.mouseConfig.getCellDimensions(), s = this.mouseConfig.getCanvasOffset();
    if (!Number.isFinite(e.width) || !Number.isFinite(e.height) || e.width <= 0 || e.height <= 0)
      return null;
    const r = Number.isFinite(t.clientX) ? t.clientX - s.left : 0, n = Number.isFinite(t.clientY) ? t.clientY - s.top : 0, o = Math.floor(r / e.width) + 1, l = Math.floor(n / e.height) + 1;
    return {
      col: Math.max(1, Math.min(o, ((h = (a = this.mouseConfig).getGridDimensions) == null ? void 0 : h.call(a).cols) ?? o)),
      row: Math.max(1, Math.min(l, ((u = (c = this.mouseConfig).getGridDimensions) == null ? void 0 : u.call(c).rows) ?? l))
    };
  }
  /**
   * Get modifier flags for mouse event
   */
  getMouseModifiers(t) {
    let e = 0;
    return t.shiftKey && (e |= 4), (t.altKey || t.metaKey) && (e |= 8), t.ctrlKey && (e |= 16), e;
  }
  /**
   * Encode mouse event as SGR sequence
   * SGR format: \x1b[<Btn;Col;RowM (press/motion) or \x1b[<Btn;Col;Rowm (release)
   */
  encodeMouseSGR(t, e, s, r, n) {
    return `\x1B[<${t + n};${e};${s}${r ? "m" : "M"}`;
  }
  /**
   * Encode mouse event as X10/normal sequence (legacy format)
   * Format: \x1b[M<Btn+32><Col+32><Row+32>
   */
  encodeMouseX10(t, e, s, r) {
    const n = t + r + 32, o = String.fromCharCode(Math.min(e + 32, 255)), l = String.fromCharCode(Math.min(s + 32, 255));
    return `\x1B[M${String.fromCharCode(n)}${o}${l}`;
  }
  /**
   * Send mouse event to terminal
   */
  sendMouseEvent(t, e, s, r, n) {
    var h, c;
    const o = this.getMouseModifiers(n), l = ((c = (h = this.mouseConfig) == null ? void 0 : h.hasSgrMouseMode) == null ? void 0 : c.call(h)) ?? !0;
    let a;
    if (l)
      a = this.encodeMouseSGR(t, e, s, r, o);
    else {
      const u = r ? 3 : t;
      a = this.encodeMouseX10(u, e, s, o);
    }
    this.onDataCallback(a);
  }
  /**
   * Handle mousedown event
   */
  handleMouseDown(t) {
    var n, o, l, a, h;
    if (this.isDisposed || ((o = (n = this.mouseConfig) == null ? void 0 : n.shouldReportButton) == null ? void 0 : o.call(n, t.button)) === !1) return;
    const e = 1 << t.button;
    if (!((l = this.mouseConfig) != null && l.hasMouseTracking())) {
      this.locallyOwnedMouseButtons &= ~e;
      return;
    }
    if (((h = (a = this.mouseConfig).shouldReportEvent) == null ? void 0 : h.call(a, t)) === !1) {
      this.locallyOwnedMouseButtons |= e, this.mouseButtonsPressed &= ~e;
      return;
    }
    const s = this.pixelToCell(t);
    if (!s) return;
    const r = t.button;
    this.locallyOwnedMouseButtons &= ~e, this.mouseButtonsPressed |= e, this.sendMouseEvent(r, s.col, s.row, !1, t);
  }
  /**
   * Handle mouseup event
   */
  handleMouseUp(t) {
    var o, l, a, h, c;
    if (this.isDisposed || ((l = (o = this.mouseConfig) == null ? void 0 : o.shouldReportButton) == null ? void 0 : l.call(o, t.button)) === !1) return;
    const e = 1 << t.button;
    if ((this.locallyOwnedMouseButtons & e) !== 0) {
      this.locallyOwnedMouseButtons &= ~e;
      return;
    }
    if (!((a = this.mouseConfig) != null && a.hasMouseTracking())) {
      this.mouseButtonsPressed &= ~e;
      return;
    }
    if (!((this.mouseButtonsPressed & e) !== 0) && ((c = (h = this.mouseConfig).shouldReportEvent) == null ? void 0 : c.call(h, t)) === !1) return;
    const r = this.pixelToCell(t);
    if (!r) return;
    const n = t.button;
    this.mouseButtonsPressed &= ~e, this.sendMouseEvent(n, r.col, r.row, !0, t);
  }
  /**
   * Handle mousemove event
   */
  handleMouseMove(t) {
    var o, l, a, h, c;
    if (this.isDisposed || !((o = this.mouseConfig) != null && o.hasMouseTracking()) || (t.buttons === 0 && (this.locallyOwnedMouseButtons = 0, this.mouseButtonsPressed = 0), this.locallyOwnedMouseButtons !== 0) || ((a = (l = this.mouseConfig).shouldReportEvent) == null ? void 0 : a.call(l, t)) === !1) return;
    const e = ((h = this.getModeCallback) == null ? void 0 : h.call(this, 1002)) ?? !1, s = ((c = this.getModeCallback) == null ? void 0 : c.call(this, 1003)) ?? !1;
    if (!e && !s || e && !s && this.mouseButtonsPressed === 0) return;
    const r = this.pixelToCell(t);
    if (!r) return;
    let n = 32;
    this.mouseButtonsPressed & 1 ? n += 0 : this.mouseButtonsPressed & 2 ? n += 1 : this.mouseButtonsPressed & 4 && (n += 2), this.sendMouseEvent(n, r.col, r.row, !1, t);
  }
  /**
   * Handle wheel event (scroll)
   */
  handleWheel(t) {
    var o, l, a, h, c;
    if (this.isDisposed || !((o = this.mouseConfig) != null && o.hasMouseTracking()) || ((a = (l = this.mouseConfig).shouldReportEvent) == null ? void 0 : a.call(l, t)) === !1) return;
    t.preventDefault(), t.stopPropagation();
    const e = (c = (h = this.mouseConfig).getWheelOptions) == null ? void 0 : c.call(h);
    if ((e == null ? void 0 : e.mouseEncoding) === "sgr" && !this.mouseConfig.hasSgrMouseMode()) {
      this.resetWheelGesture();
      return;
    }
    const s = this.wheelGesture.consume(
      t,
      this.mouseConfig.getCellDimensions().height,
      "mouse",
      e
    );
    if (s === 0) return;
    const r = this.pixelToCell(t);
    if (!r) return;
    const n = s < 0 ? 64 : 65;
    for (let u = 0; u < Math.abs(s); u++)
      this.sendMouseEvent(n, r.col, r.row, !1, t);
  }
  /**
   * Emit paste data with bracketed paste support
   */
  emitPasteData(t) {
    var s;
    const e = ((s = this.getModeCallback) == null ? void 0 : s.call(this, 2004)) ?? !1;
    this.onDataCallback(Ot(t, e));
  }
  /**
   * Record keydown data for beforeinput de-duplication
   */
  recordKeyDownData(t) {
    this.lastKeyDownData = t, this.scheduleInputStateReset();
  }
  /**
   * Record paste data for beforeinput de-duplication
   */
  recordPasteData(t, e) {
    this.lastPasteData = t, this.lastPasteTime = this.getNow(), this.lastPasteSource = e;
  }
  /**
   * Check if beforeinput should be ignored due to a recent keydown
   */
  shouldIgnoreBeforeInput(t) {
    const e = this.lastKeyDownData === t;
    return this.lastKeyDownData = null, e;
  }
  /**
   * Schedule cleanup after the browser finishes the current native input event
   * chain. In particular, compositionend can run before the browser commits the
   * final value to a textarea, so clearing synchronously leaves committed text
   * behind on several engines.
   */
  scheduleInputStateReset() {
    this.cancelInputStateReset(), this.inputStateResetTimeout = setTimeout(() => {
      this.inputStateResetTimeout = void 0, !(this.isDisposed || this.isComposing) && (this.resetTextarea(), this.clearTransientInputState());
    }, 0);
  }
  cancelInputStateReset() {
    this.inputStateResetTimeout !== void 0 && (clearTimeout(this.inputStateResetTimeout), this.inputStateResetTimeout = void 0);
  }
  resetTextarea() {
    var e, s;
    if (((s = (e = this.inputElement) == null ? void 0 : e.tagName) == null ? void 0 : s.toLowerCase()) !== "textarea") return;
    const t = this.inputElement;
    t.value === "" && t.selectionStart === 0 && t.selectionEnd === 0 || (t.value = "", t.setSelectionRange(0, 0));
  }
  clearTransientInputState() {
    this.lastKeyDownData = null, this.lastBeforeInputData = null, this.compositionTransaction = null;
  }
  /**
   * Check if paste should be ignored due to a recent paste event from another source
   */
  shouldIgnorePasteEvent(t, e) {
    if (!this.lastPasteData || this.lastPasteSource === e)
      return !1;
    const r = this.getNow() - this.lastPasteTime < st.BEFORE_INPUT_IGNORE_MS && this.lastPasteData === t;
    return r && (this.lastPasteData = null, this.lastPasteSource = null), r;
  }
  /**
   * Get current time in milliseconds
   */
  getNow() {
    return typeof performance < "u" && typeof performance.now == "function" ? performance.now() : Date.now();
  }
  /**
   * Dispose the InputHandler and remove event listeners
   */
  dispose() {
    this.isDisposed || (this.isDisposed = !0, this.cancelInputStateReset(), this.resetTextarea(), this.clearTransientInputState(), this.isComposing = !1, this.keydownListener && (this.container.removeEventListener("keydown", this.keydownListener), this.keydownListener = null), this.keypressListener && (this.container.removeEventListener("keypress", this.keypressListener), this.keypressListener = null), this.pasteListener && (this.container.removeEventListener("paste", this.pasteListener), this.inputElement && this.inputElement !== this.container && this.inputElement.removeEventListener("paste", this.pasteListener), this.pasteListener = null), this.beforeInputListener && this.inputElement && (this.inputElement.removeEventListener("beforeinput", this.beforeInputListener), this.beforeInputListener = null), this.compositionStartListener && (this.container.removeEventListener("compositionstart", this.compositionStartListener), this.compositionStartListener = null), this.compositionUpdateListener && (this.container.removeEventListener("compositionupdate", this.compositionUpdateListener), this.compositionUpdateListener = null), this.compositionEndListener && (this.container.removeEventListener("compositionend", this.compositionEndListener), this.compositionEndListener = null), this.mousedownListener && (this.container.removeEventListener("mousedown", this.mousedownListener), this.mousedownListener = null), this.mouseupListener && (this.container.removeEventListener("mouseup", this.mouseupListener), this.mouseupListener = null), this.mousemoveListener && (this.container.removeEventListener("mousemove", this.mousemoveListener), this.mousemoveListener = null), this.wheelListener && (this.container.removeEventListener("wheel", this.wheelListener), this.wheelListener = null), this.mouseButtonsPressed = 0, this.locallyOwnedMouseButtons = 0, this.resetWheelGesture(), this.encoder.dispose());
  }
  /**
   * Check if handler is disposed
   */
  isActive() {
    return !this.isDisposed;
  }
};
st.BEFORE_INPUT_IGNORE_MS = 100;
let ct = st;
const Rt = Symbol("scan-revoked");
class ue {
  // Terminal instance for buffer access
  constructor(t, e) {
    this.terminal = t, this.onInvalidate = e, this.providers = [], this.linkCache = /* @__PURE__ */ new Map(), this.scannedRows = /* @__PURE__ */ new Set(), this.inFlightScans = /* @__PURE__ */ new Map(), this.generation = 0, this.disposed = !1;
  }
  /**
   * Register a link provider. Normal providers retain registration order;
   * high-priority providers are prepended, so the newest high-priority
   * registration takes precedence over existing providers.
   */
  registerProvider(t, e = !1) {
    var s;
    if (this.disposed) {
      (s = t.dispose) == null || s.call(t);
      return;
    }
    e ? this.providers.unshift(t) : this.providers.push(t), this.invalidateCache();
  }
  /**
   * Get link at the specified buffer position
   * @param col Column (0-based)
   * @param row Absolute row in buffer (0-based)
   * @returns Link at position, or undefined if none
   */
  async getLinkAt(t, e) {
    if (this.disposed) return;
    const s = this.terminal.buffer.active.getLine(e);
    if (!s || t < 0 || t >= s.length || !s.getCell(t))
      return;
    const n = this.generation, o = this.findCachedLink(t, e);
    if (o) return o;
    if (this.scannedRows.has(e) || await this.scanRow(e), !!this.isGenerationCurrent(n))
      return this.findCachedLink(t, e);
  }
  /**
   * Return every link intersecting one current buffer row.
   *
   * This shares the same provider scan and generation guards as point lookup,
   * allowing bounded non-visual consumers to expose a row without probing each
   * cell independently.
   */
  async getLinksForRow(t) {
    if (this.disposed || !this.terminal.buffer.active.getLine(t)) return [];
    const e = this.generation;
    return this.scannedRows.has(t) || await this.scanRow(t), this.isGenerationCurrent(e) ? [...this.linkCache.values()].filter(
      (s) => s.range.start.y <= t && s.range.end.y >= t
    ) : [];
  }
  /** Capture the cache generation for asynchronous UI result validation. */
  getGeneration() {
    return this.generation;
  }
  /** Check whether content and providers still match a captured generation. */
  isGenerationCurrent(t) {
    return !this.disposed && t === this.generation;
  }
  findCachedLink(t, e) {
    for (const s of this.linkCache.values())
      if (this.isPositionInLink(t, e, s))
        return s;
  }
  /**
   * Scan a row for links using all registered providers
   */
  async scanRow(t) {
    const e = this.generation, s = this.inFlightScans.get(t);
    if ((s == null ? void 0 : s.generation) === e) return s.promise;
    let r;
    const n = new Promise((a) => {
      r = () => a(Rt);
    });
    let o;
    const l = this.scanProviders(t, e, n).finally(() => {
      this.inFlightScans.get(t) === o && this.inFlightScans.delete(t);
    });
    return o = { generation: e, promise: l, revoke: r }, this.inFlightScans.set(t, o), l;
  }
  async scanProviders(t, e, s) {
    const r = [...this.providers], n = [];
    for (const o of r) {
      const l = await Promise.race([
        new Promise((a) => {
          o.provideLinks(t, a);
        }),
        s
      ]);
      if (l === Rt || !this.isGenerationCurrent(e)) return;
      l && n.push(...l);
    }
    if (this.isGenerationCurrent(e)) {
      for (const o of n)
        this.cacheLink(o);
      this.scannedRows.add(t);
    }
  }
  /**
   * Cache a link for fast lookup
   *
   * Note: We cache by position range, not hyperlink_id, because the WASM
   * returns hyperlink_id as a boolean (0 or 1), not a unique identifier.
   * The actual unique identifier is the URI which is retrieved separately.
   */
  cacheLink(t) {
    const { start: e, end: s } = t.range, r = `r${e.y}:${e.x}-${s.x}`;
    this.linkCache.has(r) || this.linkCache.set(r, t);
  }
  /**
   * Check if a position is within a link's range
   */
  isPositionInLink(t, e, s) {
    const { start: r, end: n } = s.range;
    return e < r.y || e > n.y ? !1 : r.y === n.y ? t >= r.x && t <= n.x : e === r.y ? t >= r.x : e === n.y ? t <= n.x : !0;
  }
  /**
   * Invalidate cache when terminal content changes
   * Should be called on terminal write, resize, or clear
   */
  invalidateCache() {
    this.revokePendingScans(), this.linkCache.clear(), this.scannedRows.clear();
  }
  /**
   * Invalidate cache for specific rows
   * Used when only part of the terminal changed
   */
  invalidateRows(t, e) {
    this.revokePendingScans();
    for (let r = t; r <= e; r++)
      this.scannedRows.delete(r);
    const s = [];
    for (const [r, n] of this.linkCache.entries()) {
      const { start: o, end: l } = n.range;
      (o.y >= t && o.y <= e || l.y >= t && l.y <= e || o.y < t && l.y > e) && s.push(r);
    }
    for (const r of s)
      this.linkCache.delete(r);
  }
  /**
   * Dispose and cleanup
   */
  dispose() {
    var t;
    if (!this.disposed) {
      this.disposed = !0, this.revokePendingScans(), this.linkCache.clear(), this.scannedRows.clear();
      for (const e of this.providers)
        (t = e.dispose) == null || t.call(e);
      this.providers = [];
    }
  }
  revokePendingScans() {
    var t;
    this.generation++;
    for (const e of this.inFlightScans.values()) e.revoke();
    this.inFlightScans.clear(), (t = this.onInvalidate) == null || t.call(this);
  }
}
const de = /* @__PURE__ */ new Set(["http:", "https:"]), fe = /* @__PURE__ */ new Set(["blob:", "data:", "filesystem:", "javascript:", "vbscript:"]), me = /[\u0000-\u0020\u007f]/;
function mt(i, t = null) {
  if (typeof i != "string" || i.length === 0 || me.test(i))
    return !1;
  let e;
  try {
    e = new URL(i);
  } catch {
    return !1;
  }
  return fe.has(e.protocol) ? !1 : de.has(e.protocol) || (t == null ? void 0 : t.allowNonHttpProtocols) === !0;
}
function Ht(i, t, e, s = null) {
  if (!(!i.ctrlKey && !i.metaKey || !mt(t, s))) {
    if (s) {
      s.activate(i, t, e);
      return;
    }
    window.open(t, "_blank", "noopener,noreferrer");
  }
}
class pe {
  constructor(t, e = () => null) {
    this.terminal = t, this.getLinkHandler = e;
  }
  /**
   * Provide all OSC 8 links on the given row
   * Note: This may return links that span multiple rows
   */
  provideLinks(t, e) {
    const s = [], r = /* @__PURE__ */ new Set(), n = this.terminal.buffer.active.getLine(t);
    if (!n) {
      e(void 0);
      return;
    }
    for (let o = 0; o < n.length; o++) {
      if (r.has(o)) continue;
      const l = n.getCell(o);
      if (!l || l.getHyperlinkId() === 0 || !this.terminal.wasmTerm) continue;
      const h = this.terminal.wasmTerm.getScrollbackLength(), c = t - h;
      let u;
      if (c < 0 ? u = this.terminal.wasmTerm.getScrollbackHyperlinkUri(t, o) : u = this.terminal.wasmTerm.getHyperlinkUri(c, o), u && mt(u, this.getLinkHandler())) {
        let p = o;
        for (let f = o + 1; f < n.length; f++) {
          const g = n.getCell(f);
          if (!g || g.getHyperlinkId() === 0 || (c < 0 ? this.terminal.wasmTerm.getScrollbackHyperlinkUri(t, f) : this.terminal.wasmTerm.getHyperlinkUri(c, f)) !== u) break;
          p = f;
        }
        for (let f = o; f <= p; f++)
          r.add(f);
        const m = {
          start: { x: o, y: t },
          end: { x: p, y: t }
        };
        s.push({
          text: u,
          range: m,
          activate: (f) => {
            Ht(f, u, m, this.getLinkHandler());
          }
        });
      }
    }
    e(s.length > 0 ? s : void 0);
  }
  /**
   * Find the full extent of a link by scanning for contiguous cells
   * with the same hyperlink_id. Handles multi-line links.
   */
  findLinkRange(t, e, s) {
    const r = this.terminal.buffer.active;
    let n = e, o = s;
    for (; o > 0; ) {
      const c = r.getLine(n);
      if (!c) break;
      const u = c.getCell(o - 1);
      if (!u || u.getHyperlinkId() !== t) break;
      o--;
    }
    if (o === 0 && n > 0) {
      let c = n - 1;
      for (; c >= 0; ) {
        const u = r.getLine(c);
        if (!u || u.length === 0) break;
        const p = u.getCell(u.length - 1);
        if (!p || p.getHyperlinkId() !== t) break;
        n = c, o = 0;
        for (let m = u.length - 1; m >= 0; m--) {
          const f = u.getCell(m);
          if (!f || f.getHyperlinkId() !== t) {
            o = m + 1;
            break;
          }
        }
        if (o === 0)
          c--;
        else
          break;
      }
    }
    let l = e, a = s;
    const h = r.getLine(l);
    if (h) {
      for (; a < h.length - 1; ) {
        const c = h.getCell(a + 1);
        if (!c || c.getHyperlinkId() !== t) break;
        a++;
      }
      if (a === h.length - 1) {
        let c = l + 1;
        const u = r.length;
        for (; c < u; ) {
          const p = r.getLine(c);
          if (!p || p.length === 0) break;
          const m = p.getCell(0);
          if (!m || m.getHyperlinkId() !== t) break;
          l = c, a = 0;
          for (let f = 0; f < p.length; f++) {
            const g = p.getCell(f);
            if (!g) break;
            if (g.getHyperlinkId() !== t) {
              a = f - 1;
              break;
            }
            a = f;
          }
          if (a === p.length - 1)
            c++;
          else
            break;
        }
      }
    }
    return {
      start: { x: o, y: n },
      end: { x: a, y: l }
    };
  }
  dispose() {
  }
}
const F = class F {
  constructor(t, e = () => null) {
    this.terminal = t, this.getLinkHandler = e;
  }
  /**
   * Provide all regex-detected URLs on the given row
   */
  provideLinks(t, e) {
    const s = [], r = this.terminal.buffer.active.getLine(t);
    if (!r) {
      e(void 0);
      return;
    }
    const n = this.lineToText(r);
    F.URL_REGEX.lastIndex = 0;
    let o = F.URL_REGEX.exec(n);
    for (; o !== null; ) {
      let l = o[0];
      const a = o.index;
      let h = o.index + l.length - 1;
      const c = l.replace(F.TRAILING_PUNCTUATION, "");
      if (c.length < l.length && (l = c, h = a + l.length - 1), l.length > 8 && mt(l, this.getLinkHandler())) {
        const u = {
          start: { x: a, y: t },
          end: { x: h, y: t }
        };
        s.push({
          text: l,
          range: u,
          activate: (p) => {
            Ht(p, l, u, this.getLinkHandler());
          }
        });
      }
      o = F.URL_REGEX.exec(n);
    }
    e(s.length > 0 ? s : void 0);
  }
  /**
   * Convert a buffer line to plain text string
   */
  lineToText(t) {
    const e = [];
    for (let s = 0; s < t.length; s++) {
      const r = t.getCell(s);
      if (!r) {
        e.push(" ");
        continue;
      }
      const n = r.getCodepoint();
      n === 0 || n < 32 ? e.push(" ") : e.push(String.fromCodePoint(n));
    }
    return e.join("");
  }
  dispose() {
  }
};
F.URL_REGEX = /(?:https?:\/\/|mailto:|ftp:\/\/|ssh:\/\/|git:\/\/|tel:|magnet:|gemini:\/\/|gopher:\/\/|news:)[\w\-.~:\/?#@!$&*+,;=%]+/gi, F.TRAILING_PUNCTUATION = /[.,;!?)\]]+$/;
let ut = F;
const Ft = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite"
], pt = Object.freeze({
  foreground: "#d4d4d4",
  background: "#1e1e1e",
  cursor: "#ffffff",
  cursorAccent: "#1e1e1e",
  selectionBackground: "#d4d4d4",
  selectionForeground: "#1e1e1e",
  black: "#000000",
  red: "#cd3131",
  green: "#0dbc79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
  brightBlack: "#666666",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#ffffff"
}), ge = Object.keys(pt), we = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, be = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
function W(i) {
  if (we.test(i)) {
    const e = i.slice(1), s = e.length === 3 ? `${e[0]}${e[0]}${e[1]}${e[1]}${e[2]}${e[2]}` : e;
    return Number.parseInt(s, 16);
  }
  const t = be.exec(i);
  if (t) {
    const e = t.slice(1).map((s) => Number.parseInt(s, 10));
    if (e.every((s) => s <= 255))
      return e[0] << 16 | e[1] << 8 | e[2];
  }
  throw new TypeError(`Unsupported terminal palette color: ${i}`);
}
function Se(i) {
  return `#${W(i).toString(16).padStart(6, "0")}`;
}
function V(i = {}) {
  const t = { ...pt, ...i }, e = {};
  for (const s of ge) {
    const r = t[s];
    if (typeof r != "string")
      throw new TypeError(`Terminal palette color ${s} must be a string`);
    e[s] = Se(r);
  }
  return Object.freeze(e);
}
function Ct(i, t) {
  return {
    scrollbackLimit: t,
    fgColor: W(i.foreground),
    bgColor: W(i.background),
    cursorColor: W(i.cursor),
    palette: Ft.map((e) => W(i[e]))
  };
}
class ve {
  constructor(t, e, s) {
    var n;
    this.sourceCanvas = t, this.resolveRange = e, this.style = s, this.disposed = !1, this.canvas = document.createElement("canvas");
    const r = this.canvas.getContext("2d");
    if (!r) throw new Error("Unable to create retained-range highlight surface");
    this.context = r, this.canvas.setAttribute("aria-hidden", "true"), this.canvas.dataset.ghosttyRetainedRangeHighlight = "", Object.assign(this.canvas.style, {
      position: "absolute",
      pointerEvents: "none",
      visibility: "hidden",
      color: s.fill,
      borderColor: s.border
    }), (n = t.parentElement) == null || n.append(this.canvas);
  }
  hide() {
    this.canvas.style.visibility = "hidden", this.lastPaintKey = void 0;
  }
  paint(t, e = !1) {
    if (this.disposed) return !1;
    const s = this.resolveRange();
    if (!s) return !1;
    if (t.alternateScreen)
      return this.hide(), !0;
    const r = this.sourceCanvas.style.width, n = this.sourceCanvas.style.height, o = [
      s.start.row,
      s.start.column,
      s.end.row,
      s.end.column,
      t.cols,
      t.rows,
      t.firstVisibleRow,
      t.cellWidth,
      t.cellHeight,
      t.devicePixelRatio,
      this.sourceCanvas.width,
      this.sourceCanvas.height,
      r,
      n
    ].join(":");
    if (!e && this.lastPaintKey === o) return !0;
    const l = `${this.sourceCanvas.offsetLeft}px`, a = `${this.sourceCanvas.offsetTop}px`, h = getComputedStyle(this.canvas), c = h.color, u = h.borderTopColor;
    this.canvas.width !== this.sourceCanvas.width && (this.canvas.width = this.sourceCanvas.width), this.canvas.height !== this.sourceCanvas.height && (this.canvas.height = this.sourceCanvas.height), this.canvas.style.left !== l && (this.canvas.style.left = l), this.canvas.style.top !== a && (this.canvas.style.top = a), this.canvas.style.width !== r && (this.canvas.style.width = r), this.canvas.style.height !== n && (this.canvas.style.height = n), this.canvas.style.visibility !== "" && (this.canvas.style.visibility = "");
    const p = this.context;
    p.setTransform(1, 0, 0, 1, 0, 0), p.clearRect(0, 0, this.canvas.width, this.canvas.height), p.setTransform(t.devicePixelRatio, 0, 0, t.devicePixelRatio, 0, 0), p.fillStyle = c, p.strokeStyle = u, p.lineWidth = this.style.borderWidth;
    const m = t.firstVisibleRow + t.rows - 1, f = Math.max(s.start.row, t.firstVisibleRow), g = Math.min(s.end.row, m);
    for (let b = f; b <= g; b++) {
      const S = b === s.start.row ? s.start.column : 0, v = b === s.end.row ? s.end.column + Math.max(1, t.endCellWidth(b, s.end.column)) : t.cols, x = Math.max(0, S) * t.cellWidth, P = (b - t.firstVisibleRow) * t.cellHeight, E = (Math.min(t.cols, v) - Math.max(0, S)) * t.cellWidth;
      if (E <= 0) continue;
      p.fillRect(x, P, E, t.cellHeight);
      const k = Math.min(this.style.borderWidth, E, t.cellHeight) / 2;
      k > 0 && p.strokeRect(x + k, P + k, E - k * 2, t.cellHeight - k * 2);
    }
    return this.lastPaintKey = o, !0;
  }
  dispose() {
    this.disposed || (this.disposed = !0, this.canvas.remove());
  }
}
const _e = 64, Ee = 512, xt = 0.01, Re = 57520, Ce = 57527, R = 1, T = 2, y = 4, C = 8, xe = /* @__PURE__ */ new Map([
  [9472, { directions: C | T, physicalStrokeWidth: 1 }],
  // ─
  [9473, { directions: C | T, physicalStrokeWidth: 3 }],
  // ━
  [9474, { directions: R | y, physicalStrokeWidth: 1 }],
  // │
  [9475, { directions: R | y, physicalStrokeWidth: 3 }],
  // ┃
  [9484, { directions: T | y, physicalStrokeWidth: 1 }],
  // ┌
  [9487, { directions: T | y, physicalStrokeWidth: 3 }],
  // ┏
  [9488, { directions: C | y, physicalStrokeWidth: 1 }],
  // ┐
  [9491, { directions: C | y, physicalStrokeWidth: 3 }],
  // ┓
  [9492, { directions: R | T, physicalStrokeWidth: 1 }],
  // └
  [9495, { directions: R | T, physicalStrokeWidth: 3 }],
  // ┗
  [9496, { directions: R | C, physicalStrokeWidth: 1 }],
  // ┘
  [9499, { directions: R | C, physicalStrokeWidth: 3 }],
  // ┛
  [9500, { directions: R | T | y, physicalStrokeWidth: 1 }],
  // ├
  [9507, { directions: R | T | y, physicalStrokeWidth: 3 }],
  // ┣
  [9508, { directions: R | C | y, physicalStrokeWidth: 1 }],
  // ┤
  [9515, { directions: R | C | y, physicalStrokeWidth: 3 }],
  // ┫
  [9516, { directions: C | T | y, physicalStrokeWidth: 1 }],
  // ┬
  [9523, { directions: C | T | y, physicalStrokeWidth: 3 }],
  // ┳
  [9524, { directions: R | C | T, physicalStrokeWidth: 1 }],
  // ┴
  [9531, { directions: R | C | T, physicalStrokeWidth: 3 }],
  // ┻
  [9532, { directions: R | T | y | C, physicalStrokeWidth: 1 }],
  // ┼
  [9547, { directions: R | T | y | C, physicalStrokeWidth: 3 }],
  // ╋
  [9581, { directions: T | y, physicalStrokeWidth: 1, rounded: !0 }],
  // ╭
  [9582, { directions: C | y, physicalStrokeWidth: 1, rounded: !0 }],
  // ╮
  [9583, { directions: R | C, physicalStrokeWidth: 1, rounded: !0 }],
  // ╯
  [9584, { directions: R | T, physicalStrokeWidth: 1, rounded: !0 }]
  // ╰
]), Tt = {
  renderedRows: 0,
  materializedRows: 0,
  materializedCells: 0,
  textRuns: 0,
  textMeasurements: 0,
  shapedRuns: 0,
  shapedCells: 0,
  maxRunCells: 0
};
function Q(i) {
  const t = W(i);
  return { r: t >> 16 & 255, g: t >> 8 & 255, b: t & 255 };
}
function Te(i) {
  return i.grapheme_len === 0 && i.codepoint >= Re && i.codepoint <= Ce;
}
function ye(i) {
  return i.grapheme_len === 0 ? xe.get(i.codepoint) : void 0;
}
function Z(i, t) {
  return i.r === t.r && i.g === t.g && i.b === t.b;
}
function Le(i, t) {
  return Z(i.background, t.background) && Z(i.foreground, t.foreground) && Z(i.cursor, t.cursor) && i.palette.length === t.palette.length && i.palette.every((e, s) => Z(e, t.palette[s]));
}
function ke(i) {
  return {
    background: { ...i.background },
    foreground: { ...i.foreground },
    cursor: { ...i.cursor },
    palette: i.palette.map((t) => ({ ...t }))
  };
}
class Ae {
  constructor(t, e = {}) {
    this.resolutionMediaQueryUsesLegacyListener = !1, this.disposed = !1, this.renderPaused = !1, this.frameStats = { ...Tt }, this.renderedRowRanges = [], this.glyphAdvanceCache = /* @__PURE__ */ new Map(), this.cursorVisible = !0, this.lastCursorPosition = { x: 0, y: 0 }, this.lastScrollbackStart = 0, this.lastHistoricalRows = 0, this.currentBuffer = null, this.currentSelectionCoords = null, this.hoveredHyperlinkId = 0, this.previousHoveredHyperlinkId = 0, this.hoveredLinkRange = null, this.previousHoveredLinkRange = null, this.handleDevicePixelRatioSignal = () => {
      this.disposed || this.readWindowDevicePixelRatio() === this.devicePixelRatio || this.requestRender(!0);
    }, this.canvas = t;
    const s = t.getContext("2d", { alpha: !0 });
    if (!s)
      throw new Error("Failed to get 2D rendering context");
    this.ctx = s, this.requestRender = e.requestRender ?? (() => {
    }), this.onDevicePixelRatioChange = e.onDevicePixelRatioChange ?? (() => {
    }), this.fontSize = e.fontSize ?? 15, this.fontFamily = e.fontFamily ?? "monospace", this.fontLigatures = e.fontLigatures ?? !0, this.cursorBlink = !1, this.theme = V(e.theme), this.effectiveColors = {
      foreground: Q(this.theme.foreground),
      background: Q(this.theme.background),
      cursor: Q(this.theme.cursor),
      palette: Ft.map((r) => Q(this.theme[r]))
    }, this.tracksWindowDevicePixelRatio = e.devicePixelRatio === void 0, this.devicePixelRatio = this.normalizeDevicePixelRatio(
      e.devicePixelRatio ?? window.devicePixelRatio
    ), this.metrics = this.measureFont(), this.tracksWindowDevicePixelRatio && (window.addEventListener("resize", this.handleDevicePixelRatioSignal), this.watchCurrentResolution());
  }
  // ==========================================================================
  // Font Metrics Measurement
  // ==========================================================================
  measureFont() {
    const e = document.createElement("canvas").getContext("2d");
    e.font = `${this.fontSize}px ${this.fontFamily}`;
    const s = e.measureText("M"), r = s.actualBoundingBoxAscent || this.fontSize * 0.8, n = s.actualBoundingBoxDescent || this.fontSize * 0.2, o = (c) => Math.ceil(c * this.devicePixelRatio) / this.devicePixelRatio, l = o(Math.ceil(s.width)), a = o(Math.ceil(r + n) + 2), h = o(Math.ceil(r) + 1);
    return { width: l, height: a, baseline: h };
  }
  /**
   * Remeasure font metrics (call after font loads or changes)
   */
  remeasureFont() {
    this.glyphAdvanceCache.clear(), this.metrics = this.measureFont(), this.requestRender();
  }
  normalizeDevicePixelRatio(t) {
    return typeof t == "number" && Number.isFinite(t) && t > 0 ? t : 1;
  }
  readWindowDevicePixelRatio() {
    return this.normalizeDevicePixelRatio(window.devicePixelRatio);
  }
  /**
   * A resolution media query reports zoom and cross-display transitions even
   * when the window's CSS dimensions do not change. The resize listener is a
   * fallback for engines that do not dispatch resolution-query changes.
   */
  watchCurrentResolution() {
    if (this.unwatchCurrentResolution(), !(this.disposed || typeof window.matchMedia != "function")) {
      if (this.resolutionMediaQuery = window.matchMedia(`(resolution: ${this.devicePixelRatio}dppx)`), typeof this.resolutionMediaQuery.addEventListener == "function") {
        this.resolutionMediaQuery.addEventListener("change", this.handleDevicePixelRatioSignal);
        return;
      }
      if (typeof this.resolutionMediaQuery.addListener == "function") {
        this.resolutionMediaQuery.addListener(this.handleDevicePixelRatioSignal), this.resolutionMediaQueryUsesLegacyListener = !0;
        return;
      }
      this.resolutionMediaQuery = void 0;
    }
  }
  unwatchCurrentResolution() {
    var t, e, s, r;
    this.resolutionMediaQueryUsesLegacyListener ? (e = (t = this.resolutionMediaQuery) == null ? void 0 : t.removeListener) == null || e.call(t, this.handleDevicePixelRatioSignal) : (r = (s = this.resolutionMediaQuery) == null ? void 0 : s.removeEventListener) == null || r.call(s, "change", this.handleDevicePixelRatioSignal), this.resolutionMediaQuery = void 0, this.resolutionMediaQueryUsesLegacyListener = !1;
  }
  /** Apply a pending browser DPR transition at the start of a Canvas frame. */
  refreshDevicePixelRatio() {
    if (!this.tracksWindowDevicePixelRatio) return !1;
    const t = this.readWindowDevicePixelRatio();
    return t === this.devicePixelRatio ? !1 : (this.devicePixelRatio = t, this.glyphAdvanceCache.clear(), this.metrics = this.measureFont(), this.watchCurrentResolution(), this.onDevicePixelRatioChange(), !0);
  }
  // ==========================================================================
  // Color Conversion
  // ==========================================================================
  rgbToCSS(t, e, s) {
    return `rgb(${t}, ${e}, ${s})`;
  }
  // ==========================================================================
  // Canvas Sizing
  // ==========================================================================
  /**
   * Resize canvas to fit terminal dimensions
   */
  resize(t, e) {
    this.glyphAdvanceCache.clear();
    const s = t * this.metrics.width, r = e * this.metrics.height;
    this.canvas.style.width = `${s}px`, this.canvas.style.height = `${r}px`, this.canvas.width = this.toDevicePixels(s), this.canvas.height = this.toDevicePixels(r), this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio), this.ctx.textBaseline = "alphabetic", this.ctx.textAlign = "left", this.ctx.fillStyle = this.rgbToCSS(
      this.effectiveColors.background.r,
      this.effectiveColors.background.g,
      this.effectiveColors.background.b
    ), this.ctx.fillRect(0, 0, s, r);
  }
  toDevicePixels(t) {
    return Math.round(t * this.devicePixelRatio);
  }
  // ==========================================================================
  // Main Rendering
  // ==========================================================================
  /**
   * Render the terminal buffer to canvas
   */
  render(t, e = !1, s = 0, r, n = 1) {
    var gt, wt;
    const o = this.refreshDevicePixelRatio();
    o && (e = !0), this.frameStats = { ...Tt }, this.renderedRowRanges = [], this.currentBuffer = t;
    const l = t.getRenderState(), a = l.cursor;
    this.reconcileCursorBlink(a.blinking);
    const h = !this.lastEffectiveColors || !Le(this.lastEffectiveColors, l.colors);
    h && (this.lastEffectiveColors = ke(l.colors)), this.effectiveColors = l.colors;
    const c = l.dimensions, u = r ? r.getScrollbackLength() : 0;
    (o || this.canvas.width !== this.toDevicePixels(c.cols * this.metrics.width) || this.canvas.height !== this.toDevicePixels(c.rows * this.metrics.height)) && (this.resize(c.cols, c.rows), e = !0);
    const m = Math.max(0, Math.floor(s)), f = Math.min(c.rows, m), g = Math.max(0, u - m);
    (h || l.dirty === K.FULL && f === 0) && (e = !0);
    const b = (gt = r == null ? void 0 : r.getScrollbackGeneration) == null ? void 0 : gt.call(r);
    b !== void 0 ? (this.lastScrollbackGeneration !== void 0 && b !== this.lastScrollbackGeneration && f > 0 && (e = !0), this.lastScrollbackGeneration = b) : this.lastScrollbackGeneration = void 0, (g !== this.lastScrollbackStart || f !== this.lastHistoricalRows) && (e = !0, this.lastScrollbackStart = g, this.lastHistoricalRows = f);
    let S, v;
    const x = (w) => {
      if (!r || w < 0 || w >= f) return null;
      if (S === void 0 && r.getScrollbackViewport && (S = r.getScrollbackViewport(
        g,
        f
      ), S && (this.frameStats.materializedRows += S.length, this.frameStats.materializedCells += S.reduce(
        (A, B) => A + B.length,
        0
      ))), S) return S[w] ?? null;
      if (v ?? (v = []), w in v)
        return v[w] ?? null;
      const _ = r.getScrollbackLine(g + w);
      return v[w] = _, _ && (this.frameStats.materializedRows++, this.frameStats.materializedCells += _.length), _;
    }, P = a.x !== this.lastCursorPosition.x || a.y !== this.lastCursorPosition.y, E = !this.lastCursorState || a.visible !== this.lastCursorState.visible || a.blinking !== this.lastCursorState.blinking || a.style !== this.lastCursorState.style || a.default !== this.lastCursorState.default, k = /* @__PURE__ */ new Set(), z = f === 0;
    z && (P || E || a.blinking) && (k.add(a.y), (P || E) && k.add(this.lastCursorPosition.y));
    const $ = this.selectionManager && this.selectionManager.hasSelection(), Y = /* @__PURE__ */ new Set();
    if (this.currentSelectionCoords = $ ? this.selectionManager.getSelectionCoords() : null, this.currentSelectionCoords) {
      const w = this.currentSelectionCoords;
      for (let _ = w.startRow; _ <= w.endRow; _++)
        Y.add(_);
    }
    if (this.selectionManager) {
      const w = this.selectionManager.getDirtySelectionRows();
      if (w.size > 0) {
        for (const _ of w)
          Y.add(_);
        this.selectionManager.clearDirtySelectionRows();
      }
    }
    const U = /* @__PURE__ */ new Set(), Ut = this.hoveredHyperlinkId !== this.previousHoveredHyperlinkId, Yt = JSON.stringify(this.hoveredLinkRange) !== JSON.stringify(this.previousHoveredLinkRange);
    if (Ut) {
      for (let w = 0; w < c.rows; w++) {
        let _ = null;
        if (m > 0)
          if (w < f)
            _ = x(w);
          else {
            const A = w - f;
            _ = t.getLine(A);
          }
        else
          _ = t.getLine(w);
        if (_) {
          for (const A of _)
            if (A.hyperlink_id === this.hoveredHyperlinkId || A.hyperlink_id === this.previousHoveredHyperlinkId) {
              U.add(w);
              break;
            }
        }
      }
      this.previousHoveredHyperlinkId = this.hoveredHyperlinkId;
    }
    if (Yt) {
      if (this.previousHoveredLinkRange)
        for (let w = this.previousHoveredLinkRange.startY; w <= this.previousHoveredLinkRange.endY; w++)
          U.add(w);
      if (this.hoveredLinkRange)
        for (let w = this.hoveredLinkRange.startY; w <= this.hoveredLinkRange.endY; w++)
          U.add(w);
      this.previousHoveredLinkRange = this.hoveredLinkRange;
    }
    const X = /* @__PURE__ */ new Set();
    for (let w = 0; w < c.rows; w++) {
      const _ = w - f;
      (e || _ >= 0 && t.isRowDirty(_) || k.has(w) || Y.has(w) || U.has(w)) && (X.add(w), w > 0 && X.add(w - 1), w < c.rows - 1 && X.add(w + 1));
    }
    for (let w = 0; w < c.rows; w++) {
      if (!X.has(w))
        continue;
      let _ = null, A;
      if (m > 0)
        if (w < f && r) {
          const B = g + w;
          _ = x(w), r.getScrollbackGraphemeString && (A = (O) => r.getScrollbackGraphemeString(B, O));
        } else {
          const B = w - f;
          _ = t.getLine(B), t.getGraphemeString && (A = (O) => t.getGraphemeString(B, O, !1));
        }
      else
        _ = t.getLine(w), t.getGraphemeString && (A = (B) => t.getGraphemeString(w, B, !1));
      if (_) {
        const B = z && a.y === w && a.visible ? a.x : null;
        this.renderLine(_, w, c.cols, B, A), this.frameStats.renderedRows++;
        const O = this.renderedRowRanges[this.renderedRowRanges.length - 1];
        (O == null ? void 0 : O.end) === w - 1 ? O.end = w : this.renderedRowRanges.push({ start: w, end: w });
      }
    }
    return this.retainedRangeHighlight && !this.retainedRangeHighlight.paint(
      {
        cols: c.cols,
        rows: c.rows,
        cellWidth: this.metrics.width,
        cellHeight: this.metrics.height,
        devicePixelRatio: this.devicePixelRatio,
        firstVisibleRow: u - m,
        alternateScreen: ((wt = t.isAlternateScreen) == null ? void 0 : wt.call(t)) ?? !1,
        endCellWidth: (w, _) => {
          var O;
          const A = w - (u - m), B = A < f ? x(A) : t.getLine(A - f);
          return ((O = B == null ? void 0 : B[_]) == null ? void 0 : O.width) ?? 1;
        }
      },
      e
    ) && this.clearRetainedRangeHighlight(), z && a.visible && this.cursorVisible && this.renderCursor(a.x, a.y, a.style), r && n > 0 && this.renderScrollbar(s, u, c.rows, n), this.lastCursorPosition = { x: a.x, y: a.y }, this.lastCursorState = { ...a }, t.clearDirty(), a;
  }
  /**
   * Render a single line using two-pass approach:
   * 1. First pass: Draw all cell backgrounds
   * 2. Second pass: Draw all cell text and decorations
   *
   * This two-pass approach is necessary for proper rendering of complex scripts
   * like Devanagari where diacritics (like vowel sign ि) can extend LEFT of the
   * base character into the previous cell's visual area. If we draw backgrounds
   * and text in a single pass (cell by cell), the background of cell N would
   * cover any left-extending portions of graphemes from cell N-1.
   */
  renderLine(t, e, s, r, n) {
    const o = e * this.metrics.height, l = s * this.metrics.width;
    this.ctx.clearRect(0, o, l, this.metrics.height), this.ctx.fillStyle = this.rgbToCSS(
      this.effectiveColors.background.r,
      this.effectiveColors.background.g,
      this.effectiveColors.background.b
    ), this.ctx.fillRect(0, o, l, this.metrics.height);
    for (let h = 0; h < t.length; h++) {
      const c = t[h];
      c.width !== 0 && this.renderCellBackground(c, h, e);
    }
    const a = [];
    for (let h = 0; h < t.length; h++) {
      const c = t[h];
      if (c.width === 0) continue;
      const u = this.prepareTextRunCell(c, h, e, r, n);
      u && a.push(u);
    }
    for (const h of this.buildTextRuns(a))
      this.renderTextRun(h, e), this.frameStats.textRuns++, this.frameStats.maxRunCells = Math.max(this.frameStats.maxRunCells, h.cells.length), this.fontLigatures && h.cells.length > 1 && (this.frameStats.shapedRuns++, this.frameStats.shapedCells += h.cells.length);
    for (const h of a)
      this.renderCellDecorations(h, e);
  }
  prepareTextRunCell(t, e, s, r, n, o) {
    if (t.flags & L.INVISIBLE) return null;
    const l = this.isInSelection(e, s), h = `${`${t.flags & L.ITALIC ? "italic " : ""}${t.flags & L.BOLD ? "bold " : ""}`}${this.fontSize}px ${this.fontFamily}`;
    let c;
    if (o)
      c = o;
    else if (l)
      c = this.theme.selectionForeground;
    else {
      const x = (t.flags & L.INVERSE) !== 0;
      c = this.rgbToCSS(
        x ? t.bg_r : t.fg_r,
        x ? t.bg_g : t.fg_g,
        x ? t.bg_b : t.fg_b
      );
    }
    const u = t.grapheme_len > 0 && n ? n(e) : String.fromCodePoint(t.codepoint || 32), p = t.codepoint >= 32 && t.codepoint <= 126, m = r === e, f = this.fontLigatures && !m && t.width === 1 && t.grapheme_len === 0 && p ? this.getGlyphAdvance(h, u) : null, g = f !== null && Number.isFinite(f), b = this.isInHoveredLinkRange(e, s), S = t.flags & L.FAINT ? 0.5 : 1, v = [
      t.flags,
      h,
      c,
      t.fg_r,
      t.fg_g,
      t.fg_b,
      t.bg_r,
      t.bg_g,
      t.bg_b,
      S,
      l,
      t.hyperlink_id,
      b,
      t.width,
      m ? `cursor:${e}` : "no-cursor",
      p ? "ascii" : `fallback:${t.codepoint}`
    ].join("|");
    return { cell: t, column: e, text: u, font: h, fillStyle: c, alpha: S, styleKey: v, joinable: g, advance: f };
  }
  getGlyphAdvance(t, e) {
    const s = `${t}\0${e}`, r = this.glyphAdvanceCache.get(s);
    if (r !== void 0) return r;
    this.ctx.font = t;
    const n = this.ctx.measureText(e).width;
    return this.frameStats.textMeasurements++, !Number.isFinite(n) || n <= 0 ? null : (this.glyphAdvanceCache.size >= Ee && this.glyphAdvanceCache.clear(), this.glyphAdvanceCache.set(s, n), n);
  }
  measureRunWidth(t, e) {
    this.ctx.font = t;
    const s = this.ctx.measureText(e).width;
    return this.frameStats.textMeasurements++, Number.isFinite(s) && s > 0 ? s : null;
  }
  advancesMatch(t, e) {
    return t !== null && e !== null && Math.abs(t - e) <= xt;
  }
  buildTextRuns(t) {
    const e = [];
    for (const s of t) {
      const r = e[e.length - 1], n = r == null ? void 0 : r.cells[r.cells.length - 1];
      if (s.joinable && r !== void 0 && (n == null ? void 0 : n.joinable) && r.cells[0].styleKey === s.styleKey && r.endColumn === s.column && r.cells.length < _e && this.advancesMatch(n.advance, s.advance)) {
        const l = r.text + s.text, a = this.measureRunWidth(s.font, l), h = r.expectedWidth + (s.advance ?? 0);
        if (a !== null && Math.abs(a - h) <= xt) {
          r.cells.push(s), r.endColumn = s.column + s.cell.width, r.text = l, r.measuredWidth = a, r.expectedWidth = h;
          continue;
        }
      }
      e.push({
        cells: [s],
        startColumn: s.column,
        endColumn: s.column + s.cell.width,
        text: s.text,
        measuredWidth: s.advance,
        expectedWidth: s.advance ?? 0
      });
    }
    return e;
  }
  renderTextRun(t, e) {
    const s = t.cells[0], r = t.startColumn * this.metrics.width, n = (t.endColumn - t.startColumn) * this.metrics.width, o = this.canvas.height / this.devicePixelRatio, l = e * this.metrics.height, a = t.cells.length === 1 && Te(s.cell) ? s.cell.codepoint : null, h = t.cells.length === 1 ? ye(s.cell) : void 0, c = a !== null || h !== void 0;
    this.ctx.save(), this.ctx.beginPath(), c ? this.ctx.rect(r, l, n, this.metrics.height) : this.ctx.rect(r, 0, n, o), this.ctx.clip(), this.ctx.font = s.font, this.ctx.fillStyle = s.fillStyle, this.ctx.globalAlpha = s.alpha, a !== null ? this.drawPowerlineSeparator(a, r, l, n) : h ? this.drawBoxDrawingGlyph(h, r, l, n) : t.cells.length > 1 && t.measuredWidth !== null ? (this.ctx.translate(r, 0), this.ctx.scale(n / t.measuredWidth, 1), this.ctx.fillText(t.text, 0, l + this.metrics.baseline)) : this.ctx.fillText(t.text, r, l + this.metrics.baseline), this.ctx.restore();
  }
  /** Draw a focused set of uniform light/heavy box glyphs on the device-pixel grid. */
  drawBoxDrawingGlyph(t, e, s, r) {
    const n = this.metrics.height, o = e + r, l = s + n, a = this.snapStrokeCenter(e + r / 2), h = this.snapStrokeCenter(s + n / 2), c = t.physicalStrokeWidth / this.devicePixelRatio, u = c / 2, { directions: p } = t;
    if (t.rounded) {
      const m = (p & R) !== 0, f = (p & C) !== 0, g = Math.min(r, n) / 4;
      this.ctx.beginPath(), this.ctx.moveTo(a, m ? s : l), this.ctx.lineTo(a, h + (m ? -g : g)), this.ctx.quadraticCurveTo(
        a,
        h,
        a + (f ? -g : g),
        h
      ), this.ctx.lineTo(f ? e : o, h), this.ctx.strokeStyle = this.ctx.fillStyle, this.ctx.lineWidth = c, this.ctx.lineCap = "butt", this.ctx.lineJoin = "round", this.ctx.stroke();
      return;
    }
    if (this.ctx.beginPath(), p & (C | T)) {
      const m = p & C ? e : a - u, f = p & T ? o : a + u;
      this.ctx.rect(m, h - u, f - m, c);
    }
    if (p & (R | y)) {
      const m = p & R ? s : h - u, f = p & y ? l : h + u;
      this.ctx.rect(a - u, m, c, f - m);
    }
    this.ctx.fill();
  }
  snapStrokeCenter(t) {
    return (Math.floor(t * this.devicePixelRatio) + 0.5) / this.devicePixelRatio;
  }
  /** Draw the canonical Powerline separators as cell-sized vector geometry. */
  drawPowerlineSeparator(t, e, s, r) {
    const n = this.metrics.height, o = e + r, l = s + n, a = s + n / 2;
    switch (this.ctx.beginPath(), t) {
      case 57520:
      // Solid right-pointing triangle
      case 57521:
        this.ctx.moveTo(e, s), this.ctx.lineTo(o, a), this.ctx.lineTo(e, l);
        break;
      case 57522:
      // Solid left-pointing triangle
      case 57523:
        this.ctx.moveTo(o, s), this.ctx.lineTo(e, a), this.ctx.lineTo(o, l);
        break;
      case 57524:
      // Solid right half-circle
      case 57525:
        this.ctx.moveTo(e, s), this.ctx.ellipse(e, a, r, n / 2, 0, -Math.PI / 2, Math.PI / 2);
        break;
      case 57526:
      // Solid left half-circle
      case 57527:
        this.ctx.moveTo(o, l), this.ctx.ellipse(o, a, r, n / 2, 0, Math.PI / 2, Math.PI * 1.5);
        break;
    }
    if ((t & 1) === 0) {
      this.ctx.closePath(), this.ctx.fill();
      return;
    }
    this.ctx.strokeStyle = this.ctx.fillStyle, this.ctx.lineWidth = 1 / this.devicePixelRatio, this.ctx.lineCap = "butt", this.ctx.lineJoin = "miter", this.ctx.stroke();
  }
  renderCellDecorations(t, e) {
    const { cell: s, column: r, fillStyle: n } = t, o = r * this.metrics.width, l = e * this.metrics.height, a = this.metrics.width * s.width;
    if (this.ctx.strokeStyle = n, this.ctx.lineWidth = 1, s.flags & L.UNDERLINE) {
      const c = l + this.metrics.baseline + 2;
      this.ctx.beginPath(), this.ctx.moveTo(o, c), this.ctx.lineTo(o + a, c), this.ctx.stroke();
    }
    if (s.flags & L.STRIKETHROUGH) {
      const c = l + this.metrics.height / 2;
      this.ctx.beginPath(), this.ctx.moveTo(o, c), this.ctx.lineTo(o + a, c), this.ctx.stroke();
    }
    if (s.hyperlink_id > 0 && s.hyperlink_id === this.hoveredHyperlinkId || this.isInHoveredLinkRange(r, e)) {
      const c = l + this.metrics.baseline + 2;
      this.ctx.strokeStyle = "#4A90E2", this.ctx.beginPath(), this.ctx.moveTo(o, c), this.ctx.lineTo(o + a, c), this.ctx.stroke();
    }
  }
  /**
   * Render a cell's background only (Pass 1 of two-pass rendering)
   * Selection highlighting is integrated here to avoid z-order issues with
   * complex glyphs (like Devanagari) that extend outside their cell bounds.
   */
  renderCellBackground(t, e, s) {
    const r = e * this.metrics.width, n = s * this.metrics.height, o = this.metrics.width * t.width;
    if (this.isInSelection(e, s)) {
      this.ctx.fillStyle = this.theme.selectionBackground, this.ctx.fillRect(r, n, o, this.metrics.height);
      return;
    }
    let a = t.bg_r, h = t.bg_g, c = t.bg_b;
    t.flags & L.INVERSE && (a = t.fg_r, h = t.fg_g, c = t.fg_b);
    const u = this.effectiveColors.background;
    a === u.r && h === u.g && c === u.b || (this.ctx.fillStyle = this.rgbToCSS(a, h, c), this.ctx.fillRect(r, n, o, this.metrics.height));
  }
  /**
   * Render a cell's text and decorations (Pass 2 of two-pass rendering)
   * Selection foreground color is applied here to match the selection background.
   */
  renderCellText(t, e, s, r) {
    var o;
    const n = this.prepareTextRunCell(
      t,
      e,
      s,
      e,
      (o = this.currentBuffer) != null && o.getGraphemeString ? (l) => this.currentBuffer.getGraphemeString(s, l) : void 0,
      r
    );
    n && (this.renderTextRun(
      {
        cells: [n],
        startColumn: e,
        endColumn: e + t.width,
        text: n.text,
        measuredWidth: n.advance,
        expectedWidth: n.advance ?? 0
      },
      s
    ), this.frameStats.textRuns++, this.frameStats.maxRunCells = Math.max(this.frameStats.maxRunCells, 1), this.renderCellDecorations(n, s));
  }
  /**
   * Render cursor
   */
  renderCursor(t, e, s) {
    var o;
    const r = t * this.metrics.width, n = e * this.metrics.height;
    switch (this.ctx.fillStyle = this.rgbToCSS(
      this.effectiveColors.cursor.r,
      this.effectiveColors.cursor.g,
      this.effectiveColors.cursor.b
    ), s) {
      case "block":
        this.ctx.fillRect(r, n, this.metrics.width, this.metrics.height);
        {
          const h = (o = this.currentBuffer) == null ? void 0 : o.getLine(e);
          h != null && h[t] && (this.ctx.save(), this.ctx.beginPath(), this.ctx.rect(r, n, this.metrics.width, this.metrics.height), this.ctx.clip(), this.renderCellText(h[t], t, e, this.theme.cursorAccent), this.ctx.restore());
        }
        break;
      case "block_hollow":
        this.ctx.strokeStyle = this.ctx.fillStyle, this.ctx.lineWidth = 1, this.ctx.strokeRect(
          r + 0.5,
          n + 0.5,
          Math.max(0, this.metrics.width - 1),
          Math.max(0, this.metrics.height - 1)
        );
        break;
      case "underline":
        const l = Math.max(2, Math.floor(this.metrics.height * 0.15));
        this.ctx.fillRect(
          r,
          n + this.metrics.height - l,
          this.metrics.width,
          l
        );
        break;
      case "bar":
        const a = Math.max(2, Math.floor(this.metrics.width * 0.15));
        this.ctx.fillRect(r, n, a, this.metrics.height);
        break;
    }
  }
  // ==========================================================================
  // Cursor Blinking
  // ==========================================================================
  startCursorBlink() {
    this.cursorBlinkInterval = window.setInterval(() => {
      this.cursorVisible = !this.cursorVisible, this.requestRender();
    }, 530);
  }
  stopCursorBlink() {
    this.cursorBlinkInterval !== void 0 && (clearInterval(this.cursorBlinkInterval), this.cursorBlinkInterval = void 0), this.cursorVisible = !0;
  }
  /** Reconcile animation ownership from the current native RenderState snapshot. */
  reconcileCursorBlink(t) {
    if (t === this.cursorBlink) {
      t && !this.renderPaused && this.cursorBlinkInterval === void 0 && this.startCursorBlink();
      return;
    }
    this.cursorBlink = t, t ? (this.cursorVisible = !0, this.renderPaused || this.startCursorBlink()) : this.stopCursorBlink();
  }
  /** Make a blinking cursor visible now and restart its idle cadence. */
  resetCursorBlink() {
    !this.cursorBlink || this.renderPaused || (this.stopCursorBlink(), this.startCursorBlink(), this.requestRender());
  }
  // ==========================================================================
  // Public API
  // ==========================================================================
  /**
   * Update theme colors
   */
  setTheme(t) {
    this.theme = V(t), this.requestRender();
  }
  /**
   * Update font size
   */
  setFontSize(t) {
    this.fontSize = t, this.glyphAdvanceCache.clear(), this.metrics = this.measureFont(), this.requestRender();
  }
  /**
   * Update font family
   */
  setFontFamily(t) {
    this.fontFamily = t, this.glyphAdvanceCache.clear(), this.metrics = this.measureFont(), this.requestRender();
  }
  /** Enable bounded same-style shaping or retain isolated cell glyph draws. */
  setFontLigatures(t) {
    this.fontLigatures !== t && (this.fontLigatures = t, this.requestRender(!0));
  }
  /** Suspend or resume cursor presentation timing with terminal rendering. */
  setRenderPaused(t) {
    var e;
    this.renderPaused !== t && (this.renderPaused = t, t && ((e = this.retainedRangeHighlight) == null || e.hide(), this.stopCursorBlink()));
  }
  /**
   * Get current font metrics
   */
  /**
   * Render scrollbar (Phase 2)
   * Shows scroll position and allows click/drag interaction
   * @param opacity Opacity level (0-1) for fade in/out effect
   */
  renderScrollbar(t, e, s, r = 1) {
    const n = this.ctx, o = this.canvas.height / this.devicePixelRatio, l = this.canvas.width / this.devicePixelRatio, a = 8, h = l - a - 4, c = 4, u = o - c * 2;
    if (n.clearRect(h - 2, 0, a + 6, o), n.fillStyle = this.rgbToCSS(
      this.effectiveColors.background.r,
      this.effectiveColors.background.g,
      this.effectiveColors.background.b
    ), n.fillRect(h - 2, 0, a + 6, o), r <= 0 || e === 0) return;
    const p = e + s, m = Math.max(20, s / p * u), f = t / e, g = c + (u - m) * (1 - f);
    n.fillStyle = `rgba(128, 128, 128, ${0.1 * r})`, n.fillRect(h, c, a, u);
    const S = t > 0 ? 0.5 : 0.3;
    n.fillStyle = `rgba(128, 128, 128, ${S * r})`, n.fillRect(h, g, a, m);
  }
  getMetrics() {
    return { ...this.metrics };
  }
  /**
   * Get canvas element (needed by SelectionManager)
   */
  getCanvas() {
    return this.canvas;
  }
  /**
   * Set selection manager (for rendering selection)
   */
  setSelectionManager(t) {
    this.selectionManager = t;
  }
  /**
   * Check if a cell at (x, y) is within the current selection.
   * Uses cached selection coordinates for performance.
   */
  isInSelection(t, e) {
    const s = this.currentSelectionCoords;
    if (!s) return !1;
    const { startCol: r, startRow: n, endCol: o, endRow: l } = s;
    return n === l ? e === n && t >= r && t <= o : e === n ? t >= r : e === l ? t <= o : e > n && e < l;
  }
  isInHoveredLinkRange(t, e) {
    const s = this.hoveredLinkRange;
    return s ? e === s.startY && t >= s.startX && (e < s.endY || t <= s.endX) || e > s.startY && e < s.endY || e === s.endY && t <= s.endX && (e > s.startY || t >= s.startX) : !1;
  }
  /**
   * Set the currently hovered hyperlink ID for rendering underlines
   */
  setHoveredHyperlinkId(t) {
    this.hoveredHyperlinkId = t, this.requestRender();
  }
  /**
   * Set the currently hovered link range for rendering underlines (for regex-detected URLs)
   * Pass null to clear the hover state
   */
  setHoveredLinkRange(t) {
    this.hoveredLinkRange = t, this.requestRender();
  }
  /** Current cursor presentation state, exposed through terminal diagnostics. */
  getCursorVisible() {
    return this.cursorVisible;
  }
  getFrameStats() {
    return { ...this.frameStats };
  }
  /** Contiguous viewport-row ranges actually painted by the most recent frame. */
  getRenderedRowRanges() {
    return this.renderedRowRanges.map((t) => ({ ...t }));
  }
  /**
   * Get character cell width (for coordinate conversion)
   */
  get charWidth() {
    return this.metrics.width;
  }
  /**
   * Get character cell height (for coordinate conversion)
   */
  get charHeight() {
    return this.metrics.height;
  }
  /**
   * Clear entire canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.ctx.fillStyle = this.rgbToCSS(
      this.effectiveColors.background.r,
      this.effectiveColors.background.g,
      this.effectiveColors.background.b
    ), this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  /**
   * Cleanup resources
   */
  dispose() {
    this.disposed || (this.disposed = !0, this.clearRetainedRangeHighlight(), window.removeEventListener("resize", this.handleDevicePixelRatioSignal), this.unwatchCurrentResolution(), this.stopCursorBlink());
  }
  showRetainedRangeHighlight(t, e) {
    this.clearRetainedRangeHighlight();
    const s = new ve(
      this.canvas,
      t,
      Object.freeze({ ...e })
    );
    return this.retainedRangeHighlight = s, this.requestRender(), {
      dispose: () => {
        s.dispose(), this.retainedRangeHighlight === s && (this.retainedRangeHighlight = void 0);
      }
    };
  }
  clearRetainedRangeHighlight() {
    var t;
    (t = this.retainedRangeHighlight) == null || t.dispose(), this.retainedRangeHighlight = void 0;
  }
}
class Nt extends Error {
  constructor(t, e, s) {
    super(e), this.code = t, this.name = s != null && s.abort ? "AbortError" : "RetainedBufferExtractionError";
  }
}
function D(i, t, e = !1) {
  return new Nt(i, t, { abort: e });
}
class Me {
  constructor(t) {
    this.getTerminal = t, this.disposed = !1;
  }
  extract(t, e, s = {}) {
    var o;
    if (this.disposed)
      return Promise.reject(D("disposed", "Retained-buffer extraction is disposed"));
    if (this.cancelCurrent(D("cancelled", "Retained-buffer extraction was replaced")), (o = s.signal) != null && o.aborted)
      return Promise.reject(
        D("cancelled", "Retained-buffer extraction was aborted", !0)
      );
    const r = this.getTerminal();
    if (!r)
      return Promise.reject(D("not-open", "Terminal is not open"));
    const n = r.createRetainedRange(t, e);
    return n === 0 ? Promise.reject(
      D(
        "invalid-boundary",
        "Retained-buffer boundaries are stale, reversed, foreign, or cross-screen"
      )
    ) : new Promise((l, a) => {
      const h = {
        terminal: r,
        rangeId: n,
        screen: t.screen,
        signal: s.signal,
        resolve: l,
        reject: a,
        settled: !1
      };
      s.signal && (h.abortListener = () => {
        this.currentJob === h && this.cancelJob(
          h,
          D("cancelled", "Retained-buffer extraction was aborted", !0)
        );
      }, s.signal.addEventListener("abort", h.abortListener, { once: !0 })), this.currentJob = h, this.schedule(h);
    });
  }
  /** Revoke only work for the parser screen affected by a write. */
  noteWrite(t) {
    const e = this.currentJob;
    !this.disposed && (e == null ? void 0 : e.screen) === t && this.cancelJob(e, D("stale", "Terminal changed during retained extraction"));
  }
  invalidateAll() {
    this.disposed || this.cancelCurrent(
      D("stale", "Terminal buffer identity changed during retained extraction")
    );
  }
  cancel() {
    this.cancelCurrent(D("cancelled", "Retained-buffer extraction was cancelled"));
  }
  dispose() {
    this.disposed || (this.cancelCurrent(D("disposed", "Retained-buffer extraction was disposed")), this.disposed = !0);
  }
  schedule(t) {
    t.timer = setTimeout(() => {
      t.timer = void 0, this.run(t);
    }, 0);
  }
  run(t) {
    var r;
    if (this.currentJob !== t || t.settled) return;
    if ((r = t.signal) != null && r.aborted) {
      this.cancelJob(
        t,
        D("cancelled", "Retained-buffer extraction was aborted", !0)
      );
      return;
    }
    if (this.getTerminal() !== t.terminal) {
      this.cancelJob(t, D("stale", "Terminal was replaced during extraction"));
      return;
    }
    const e = t.terminal.stepRetainedRange(t.rangeId);
    if (e === 0) {
      this.schedule(t);
      return;
    }
    if (e === -2) {
      this.failJob(
        t,
        D("too-large", "Retained-buffer extraction exceeds the 4 MiB limit")
      );
      return;
    }
    if (e < 0) {
      this.failJob(t, D("stale", "Retained-buffer extraction became stale"));
      return;
    }
    const s = t.terminal.getRetainedRangeText(t.rangeId);
    if (s === null) {
      this.failJob(t, D("failed", "Unable to copy retained-buffer text"));
      return;
    }
    this.cleanupJob(t), t.terminal.cancelRetainedRange(t.rangeId), t.settled = !0, this.currentJob = void 0, t.resolve(s);
  }
  cancelCurrent(t) {
    this.currentJob && this.cancelJob(this.currentJob, t);
  }
  cancelJob(t, e) {
    this.failJob(t, e);
  }
  failJob(t, e) {
    t.settled || (this.cleanupJob(t), t.terminal.cancelRetainedRange(t.rangeId), t.settled = !0, this.currentJob === t && (this.currentJob = void 0), t.reject(e));
  }
  cleanupJob(t) {
    t.timer !== void 0 && (clearTimeout(t.timer), t.timer = void 0), t.signal && t.abortListener && (t.signal.removeEventListener("abort", t.abortListener), t.abortListener = void 0);
  }
}
const N = class N {
  // ms between scroll steps
  constructor(t, e, s, r, n = !0, o = () => !0, l = () => r.focus({ preventScroll: !0 })) {
    this.selectionStart = null, this.selectionEnd = null, this.isSelecting = !1, this.mouseDownX = 0, this.mouseDownY = 0, this.dragThresholdMet = !1, this.mouseDownTarget = null, this.dirtySelectionRows = /* @__PURE__ */ new Set(), this.selectionChangedEmitter = new I(), this.boundMouseUpHandler = null, this.boundContextMenuHandler = null, this.boundContextMenuResetHandler = null, this.contextMenuResetTimeout = null, this.boundClickHandler = null, this.boundDocumentMouseMoveHandler = null, this.boundDocumentMouseDownHandler = null, this.boundCanvasMouseDownHandler = null, this.boundCanvasMouseMoveHandler = null, this.boundCanvasMouseLeaveHandler = null, this.boundCanvasMouseEnterHandler = null, this.boundCanvasClickHandler = null, this.isDisposed = !1, this.autoScrollInterval = null, this.autoScrollDirection = 0, this.terminal = t, this.renderer = e, this.wasmTerm = s, this.textarea = r, this.shouldUseLocalMouse = o, this.focusInputTarget = l;
    try {
      this.attachEventListeners(n);
    } catch (a) {
      throw this.dispose(), a;
    }
  }
  // pixels from edge to trigger scroll
  /**
   * Get current viewport Y position (how many lines scrolled into history)
   */
  getViewportY() {
    const t = typeof this.terminal.getViewportY == "function" ? this.terminal.getViewportY() : this.terminal.viewportY || 0;
    return Math.max(0, Math.floor(t));
  }
  /**
   * Convert viewport row to absolute buffer row
   * Absolute row is an index into combined buffer: scrollback (0 to len-1) + screen (len to len+rows-1)
   */
  viewportRowToAbsolute(t) {
    const e = this.wasmTerm.getScrollbackLength(), s = this.getViewportY();
    return e + t - s;
  }
  /**
   * Convert absolute buffer row to viewport row (may be outside visible range)
   */
  absoluteRowToViewport(t) {
    const e = this.wasmTerm.getScrollbackLength(), s = this.getViewportY();
    return t - e + s;
  }
  // ==========================================================================
  // Public API
  // ==========================================================================
  /**
   * Get the selected text as a string
   */
  getSelection() {
    const t = this.normalizeBufferSelection();
    if (!t) return "";
    const e = this.wasmTerm.isAlternateScreen() ? "alternate" : "normal";
    if (!this.wasmTerm.getBufferInfo(e)) return "";
    const { startRow: r, endRow: n } = t;
    let o = "", l = !0;
    for (let a = r; a <= n; a++) {
      const h = this.wasmTerm.getBufferLine(e, a, l);
      if (l = !1, !h) continue;
      let c = a === r ? t.startCol : 0, u = a === n ? t.endCol : h.length - 1;
      c = this.normalizeWideEndpoint(h, c), u = this.normalizeWideEndpoint(h, u);
      let p = "", m = 0;
      for (let f = c; f <= u; f++) {
        const g = h[f];
        if (!g || g.width === 0) continue;
        if (g.codepoint === 0) {
          p += " ";
          continue;
        }
        const b = g.grapheme_len > 0 ? this.wasmTerm.getBufferGrapheme(e, a, f) : null;
        p += b != null && b.length ? String.fromCodePoint(...b) : String.fromCodePoint(g.codepoint), m = p.length;
      }
      o += p.substring(0, m), a < n && !this.wasmTerm.isBufferRowWrapped(e, a + 1) && (o += `
`);
    }
    return o;
  }
  /** Map a wide glyph's continuation column back to its authoritative head cell. */
  normalizeWideEndpoint(t, e) {
    var r, n;
    const s = Math.max(0, Math.min(Math.trunc(e), t.length - 1));
    return s > 0 && ((r = t[s]) == null ? void 0 : r.width) === 0 && ((n = t[s - 1]) == null ? void 0 : n.width) === 2 ? s - 1 : s;
  }
  /**
   * Check if there's an active selection
   */
  hasSelection() {
    return !(!this.selectionStart || !this.selectionEnd || this.isSelecting && !this.dragThresholdMet);
  }
  /**
   * Copy the current selection to clipboard
   * @returns true if there was text to copy, false otherwise
   */
  copySelection() {
    if (!this.hasSelection()) return !1;
    const t = this.getSelection();
    return t ? (this.copyToClipboard(t), !0) : !1;
  }
  /**
   * Clear the selection
   */
  clearSelection() {
    this.transitionSelection(() => {
      this.selectionStart = null, this.selectionEnd = null, this.isSelecting = !1, this.dragThresholdMet = !1;
    });
  }
  /**
   * Select all text in the terminal
   */
  selectAll() {
    const t = this.wasmTerm.getDimensions(), e = this.wasmTerm.getScrollbackLength();
    this.transitionSelection(() => {
      this.selectionStart = { col: 0, absoluteRow: 0 }, this.selectionEnd = {
        col: t.cols - 1,
        absoluteRow: e + t.rows - 1
      }, this.isSelecting = !1, this.dragThresholdMet = !1;
    });
  }
  /** Replace the parser state owned by the same public Terminal instance. */
  replaceTerminal(t) {
    this.wasmTerm = t;
  }
  /** Capture native pins so retained rows can be resolved after one parser write. */
  captureWriteAnchors() {
    return !this.selectionStart || !this.selectionEnd ? null : {
      start: this.wasmTerm.captureRetainedBufferPosition(
        this.selectionStart.absoluteRow,
        this.selectionStart.col
      ),
      end: this.wasmTerm.captureRetainedBufferPosition(
        this.selectionEnd.absoluteRow,
        this.selectionEnd.col
      )
    };
  }
  /** Rebase a selection after output, or fail closed if either retained row expired. */
  reconcileWriteAnchors(t, e) {
    if (t)
      try {
        if (!this.selectionStart || !this.selectionEnd) return;
        if (e || !t.start || !t.end) {
          this.clearSelection();
          return;
        }
        const s = this.wasmTerm.resolveEventBoundary(t.start), r = this.wasmTerm.resolveEventBoundary(t.end);
        if (!s || !r) {
          this.clearSelection();
          return;
        }
        if (s.row === this.selectionStart.absoluteRow && s.column === this.selectionStart.col && r.row === this.selectionEnd.absoluteRow && r.column === this.selectionEnd.col)
          return;
        this.transitionSelection(() => {
          this.selectionStart = { col: s.column, absoluteRow: s.row }, this.selectionEnd = { col: r.column, absoluteRow: r.row };
        });
      } finally {
        t.start && this.wasmTerm.releaseRetainedBufferBoundary(t.start), t.end && this.wasmTerm.releaseRetainedBufferBoundary(t.end);
      }
  }
  /**
   * Select text at specific column and row with length
   * xterm.js compatible API
   */
  select(t, e, s) {
    const r = this.wasmTerm.getDimensions(), n = this.wasmTerm.getScrollbackLength() + r.rows;
    if (s <= 0 || n <= 0 || r.cols <= 0) {
      this.clearSelection();
      return;
    }
    e = Math.max(0, Math.min(Math.trunc(e), n - 1)), t = Math.max(0, Math.min(Math.trunc(t), r.cols - 1));
    const o = e * r.cols + t, l = n * r.cols - 1, a = Math.min(o + Math.trunc(s) - 1, l), h = Math.floor(a / r.cols), c = a % r.cols;
    this.transitionSelection(() => {
      this.selectionStart = { col: t, absoluteRow: e }, this.selectionEnd = { col: c, absoluteRow: h }, this.isSelecting = !1, this.dragThresholdMet = !1;
    });
  }
  /**
   * Select entire lines from start to end
   * xterm.js compatible API
   */
  selectLines(t, e) {
    const s = this.wasmTerm.getDimensions(), r = this.wasmTerm.getScrollbackLength() + s.rows;
    if (r <= 0 || s.cols <= 0) {
      this.clearSelection();
      return;
    }
    t = Math.max(0, Math.min(Math.trunc(t), r - 1)), e = Math.max(0, Math.min(Math.trunc(e), r - 1)), t > e && ([t, e] = [e, t]), this.transitionSelection(() => {
      this.selectionStart = { col: 0, absoluteRow: t }, this.selectionEnd = { col: s.cols - 1, absoluteRow: e }, this.isSelecting = !1, this.dragThresholdMet = !1;
    });
  }
  /**
   * Get selection position as buffer range
   * xterm.js compatible API
   */
  getSelectionPosition() {
    const t = this.normalizeBufferSelection();
    if (t)
      return {
        start: { x: t.startCol, y: t.startRow },
        end: { x: t.endCol, y: t.endRow }
      };
  }
  /**
   * Deselect all text
   * xterm.js compatible API
   */
  deselect() {
    this.clearSelection();
  }
  /**
   * Focus the terminal (make it receive keyboard input)
   */
  focus() {
    this.focusInputTarget();
  }
  /**
   * Get current selection coordinates (for rendering)
   */
  getSelectionCoords() {
    return this.normalizeSelection();
  }
  /**
   * Get dirty selection rows that need redraw (for clearing old highlight)
   */
  getDirtySelectionRows() {
    return this.dirtySelectionRows;
  }
  /**
   * Clear the dirty selection rows tracking (after redraw)
   */
  clearDirtySelectionRows() {
    this.dirtySelectionRows.clear();
  }
  /**
   * Get selection change event accessor
   */
  get onSelectionChange() {
    return this.selectionChangedEmitter.event;
  }
  /**
   * Cleanup resources
   */
  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = !0, this.restoreContextMenuTextarea(), this.selectionChangedEmitter.dispose(), this.stopAutoScroll(), this.boundMouseUpHandler && (document.removeEventListener("mouseup", this.boundMouseUpHandler), this.boundMouseUpHandler = null), this.boundDocumentMouseMoveHandler && (document.removeEventListener("mousemove", this.boundDocumentMouseMoveHandler), this.boundDocumentMouseMoveHandler = null), this.boundDocumentMouseDownHandler && (document.removeEventListener("mousedown", this.boundDocumentMouseDownHandler), this.boundDocumentMouseDownHandler = null);
    const t = this.renderer.getCanvas();
    this.boundCanvasMouseDownHandler && (t.removeEventListener("mousedown", this.boundCanvasMouseDownHandler), this.boundCanvasMouseDownHandler = null), this.boundCanvasMouseMoveHandler && (t.removeEventListener("mousemove", this.boundCanvasMouseMoveHandler), this.boundCanvasMouseMoveHandler = null), this.boundCanvasMouseLeaveHandler && (t.removeEventListener("mouseleave", this.boundCanvasMouseLeaveHandler), this.boundCanvasMouseLeaveHandler = null), this.boundCanvasMouseEnterHandler && (t.removeEventListener("mouseenter", this.boundCanvasMouseEnterHandler), this.boundCanvasMouseEnterHandler = null), this.boundCanvasClickHandler && (t.removeEventListener("click", this.boundCanvasClickHandler), this.boundCanvasClickHandler = null), this.boundContextMenuHandler && (t.removeEventListener("contextmenu", this.boundContextMenuHandler), this.boundContextMenuHandler = null), this.boundClickHandler && (document.removeEventListener("click", this.boundClickHandler), this.boundClickHandler = null);
  }
  // ==========================================================================
  // Private Methods
  // ==========================================================================
  /**
   * Attach mouse event listeners to canvas
   */
  attachEventListeners(t) {
    const e = this.renderer.getCanvas(), s = (h) => {
      if (h.button === 0) {
        if (this.focusInputTarget(), !this.shouldUseLocalMouse(h)) return;
        const c = this.pixelToCell(h.offsetX, h.offsetY), u = this.viewportRowToAbsolute(c.row);
        this.transitionSelection(() => {
          this.selectionStart = { col: c.col, absoluteRow: u }, this.selectionEnd = { col: c.col, absoluteRow: u }, this.isSelecting = !0, this.dragThresholdMet = !1;
        }), this.mouseDownX = h.offsetX, this.mouseDownY = h.offsetY;
      }
    };
    e.addEventListener("mousedown", s), this.boundCanvasMouseDownHandler = s;
    const r = (h) => {
      if (this.isSelecting) {
        if (!this.dragThresholdMet) {
          const p = h.offsetX - this.mouseDownX, m = h.offsetY - this.mouseDownY, f = this.renderer.getMetrics().width * 0.5;
          if (p * p + m * m < f * f)
            return;
        }
        const c = this.pixelToCell(h.offsetX, h.offsetY), u = this.viewportRowToAbsolute(c.row);
        this.transitionSelection(() => {
          this.dragThresholdMet = !0, this.selectionEnd = { col: c.col, absoluteRow: u };
        }), this.updateAutoScroll(h.offsetY, e.clientHeight);
      }
    };
    e.addEventListener("mousemove", r), this.boundCanvasMouseMoveHandler = r;
    const n = (h) => {
      if (this.isSelecting) {
        const c = e.getBoundingClientRect();
        h.clientY < c.top ? this.startAutoScroll(-1) : h.clientY > c.bottom && this.startAutoScroll(1);
      }
    };
    e.addEventListener("mouseleave", n), this.boundCanvasMouseLeaveHandler = n;
    const o = () => {
      this.isSelecting && this.stopAutoScroll();
    };
    e.addEventListener("mouseenter", o), this.boundCanvasMouseEnterHandler = o, this.boundDocumentMouseMoveHandler = (h) => {
      if (this.isSelecting) {
        if (!this.dragThresholdMet) {
          const g = h.clientX - (e.getBoundingClientRect().left + this.mouseDownX), b = h.clientY - (e.getBoundingClientRect().top + this.mouseDownY), S = this.renderer.getMetrics().width * 0.5;
          if (g * g + b * b < S * S)
            return;
        }
        const c = e.getBoundingClientRect(), u = Math.max(c.left, Math.min(h.clientX, c.right)), p = Math.max(c.top, Math.min(h.clientY, c.bottom)), m = u - c.left, f = p - c.top;
        if ((h.clientX < c.left || h.clientX > c.right || h.clientY < c.top || h.clientY > c.bottom) && (h.clientY < c.top ? this.startAutoScroll(-1) : h.clientY > c.bottom ? this.startAutoScroll(1) : this.stopAutoScroll(), this.autoScrollDirection === 0)) {
          const g = this.pixelToCell(m, f), b = this.viewportRowToAbsolute(g.row);
          this.transitionSelection(() => {
            this.dragThresholdMet = !0, this.selectionEnd = { col: g.col, absoluteRow: b };
          });
        }
      }
    }, document.addEventListener("mousemove", this.boundDocumentMouseMoveHandler);
    const l = (h) => {
      this.mouseDownTarget = h.target;
    };
    document.addEventListener("mousedown", l), this.boundDocumentMouseDownHandler = l, this.boundMouseUpHandler = (h) => {
      if (this.isSelecting) {
        if (this.stopAutoScroll(), !this.dragThresholdMet) {
          this.clearSelection();
          return;
        }
        if (this.transitionSelection(() => {
          this.isSelecting = !1;
        }), this.hasSelection()) {
          const c = this.getSelection();
          c && this.copyToClipboard(c);
        }
      }
    }, document.addEventListener("mouseup", this.boundMouseUpHandler);
    const a = (h) => {
      if (this.shouldUseLocalMouse(h)) {
        if (h.detail === 2) {
          const c = this.pixelToCell(h.offsetX, h.offsetY), u = this.getWordAtCell(c.col, c.row);
          if (u) {
            const p = this.viewportRowToAbsolute(c.row);
            this.transitionSelection(() => {
              this.selectionStart = { col: u.startCol, absoluteRow: p }, this.selectionEnd = { col: u.endCol, absoluteRow: p }, this.isSelecting = !1, this.dragThresholdMet = !1;
            });
            const m = this.getSelection();
            m && this.copyToClipboard(m);
          }
        } else if (h.detail >= 3) {
          const c = this.pixelToCell(h.offsetX, h.offsetY), u = this.viewportRowToAbsolute(c.row), p = this.wasmTerm.getScrollbackLength();
          let m = null;
          if (u < p)
            m = this.wasmTerm.getScrollbackLine(u);
          else {
            const g = u - p;
            m = this.wasmTerm.getLine(g);
          }
          let f = -1;
          if (m) {
            for (let g = m.length - 1; g >= 0; g--)
              if (m[g] && m[g].codepoint !== 0 && m[g].codepoint !== 32) {
                f = g;
                break;
              }
          }
          if (f >= 0) {
            this.transitionSelection(() => {
              this.selectionStart = { col: 0, absoluteRow: u }, this.selectionEnd = { col: f, absoluteRow: u }, this.isSelecting = !1, this.dragThresholdMet = !1;
            });
            const g = this.getSelection();
            g && this.copyToClipboard(g);
          }
        }
      }
    };
    e.addEventListener("click", a), this.boundCanvasClickHandler = a, t && (this.boundContextMenuHandler = (h) => {
      if (this.restoreContextMenuTextarea(), this.renderer.getCanvas().getBoundingClientRect(), this.textarea.style.position = "fixed", this.textarea.style.left = `${h.clientX}px`, this.textarea.style.top = `${h.clientY}px`, this.textarea.style.width = "1px", this.textarea.style.height = "1px", this.textarea.style.zIndex = "1000", this.textarea.style.opacity = "0", this.textarea.style.pointerEvents = "auto", this.hasSelection()) {
        const u = this.getSelection();
        this.textarea.value = u, this.textarea.select(), this.textarea.setSelectionRange(0, u.length);
      } else
        this.textarea.value = "";
      this.focusInputTarget(), this.contextMenuResetTimeout = window.setTimeout(() => {
        this.contextMenuResetTimeout = null, this.boundContextMenuResetHandler = () => this.restoreContextMenuTextarea(), document.addEventListener("click", this.boundContextMenuResetHandler, { once: !0 }), document.addEventListener("contextmenu", this.boundContextMenuResetHandler, {
          once: !0
        }), this.textarea.addEventListener("blur", this.boundContextMenuResetHandler, { once: !0 });
      }, 10);
    }, e.addEventListener("contextmenu", this.boundContextMenuHandler)), this.boundClickHandler = (h) => {
      if (this.isSelecting || this.mouseDownTarget && e.contains(this.mouseDownTarget))
        return;
      const u = h.target;
      e.contains(u) || this.hasSelection() && this.clearSelection();
    }, document.addEventListener("click", this.boundClickHandler);
  }
  /** Restore the input element and revoke transient menu-close work. */
  restoreContextMenuTextarea() {
    this.contextMenuResetTimeout !== null && (window.clearTimeout(this.contextMenuResetTimeout), this.contextMenuResetTimeout = null), this.boundContextMenuResetHandler && (document.removeEventListener("click", this.boundContextMenuResetHandler), document.removeEventListener("contextmenu", this.boundContextMenuResetHandler), this.textarea.removeEventListener("blur", this.boundContextMenuResetHandler), this.boundContextMenuResetHandler = null), this.textarea.style.pointerEvents = "none", this.textarea.style.zIndex = "-10", this.textarea.style.width = "0", this.textarea.style.height = "0", this.textarea.style.left = "0", this.textarea.style.top = "0", this.textarea.value = "";
  }
  /**
   * Apply one selection mutation and publish exactly one visible transition.
   * Pending click candidates remain private until the drag threshold is met.
   */
  transitionSelection(t) {
    const e = this.getVisibleSelectionState(), s = e ? this.normalizeSelection() : null;
    t();
    const r = this.getVisibleSelectionState();
    if (!this.selectionStatesEqual(e, r)) {
      if (s)
        for (let n = s.startRow; n <= s.endRow; n++)
          this.dirtySelectionRows.add(n);
      this.requestRender(), this.selectionChangedEmitter.fire();
    }
  }
  getVisibleSelectionState() {
    return this.hasSelection() ? this.normalizeBufferSelection() : null;
  }
  selectionStatesEqual(t, e) {
    return t === e || t !== null && e !== null && t.startCol === e.startCol && t.startRow === e.startRow && t.endCol === e.endCol && t.endRow === e.endRow;
  }
  /**
   * Update auto-scroll based on mouse Y position within canvas
   */
  updateAutoScroll(t, e) {
    const s = N.AUTO_SCROLL_EDGE_SIZE;
    t < s ? this.startAutoScroll(-1) : t > e - s ? this.startAutoScroll(1) : this.stopAutoScroll();
  }
  /**
   * Start auto-scrolling in the given direction
   */
  startAutoScroll(t) {
    this.autoScrollInterval !== null && this.autoScrollDirection === t || (this.stopAutoScroll(), this.autoScrollDirection = t, this.autoScrollInterval = setInterval(() => {
      if (!this.isSelecting) {
        this.stopAutoScroll();
        return;
      }
      const e = N.AUTO_SCROLL_SPEED * this.autoScrollDirection;
      if (this.terminal.scrollLines(e), this.selectionEnd) {
        const s = this.wasmTerm.getDimensions();
        if (this.autoScrollDirection < 0) {
          const r = this.viewportRowToAbsolute(0);
          r < this.selectionEnd.absoluteRow && this.transitionSelection(() => {
            this.selectionEnd = { col: 0, absoluteRow: r };
          });
        } else {
          const r = this.viewportRowToAbsolute(s.rows - 1);
          r > this.selectionEnd.absoluteRow && this.transitionSelection(() => {
            this.selectionEnd = { col: s.cols - 1, absoluteRow: r };
          });
        }
      }
    }, N.AUTO_SCROLL_INTERVAL));
  }
  /**
   * Stop auto-scrolling
   */
  stopAutoScroll() {
    this.autoScrollInterval !== null && (clearInterval(this.autoScrollInterval), this.autoScrollInterval = null), this.autoScrollDirection = 0;
  }
  /**
   * Convert pixel coordinates to terminal cell coordinates
   */
  pixelToCell(t, e) {
    const s = this.renderer.getMetrics(), r = Math.floor(t / s.width), n = Math.floor(e / s.height);
    return {
      col: Math.max(0, Math.min(r, this.terminal.cols - 1)),
      row: Math.max(0, Math.min(n, this.terminal.rows - 1))
    };
  }
  /**
   * Normalize selection coordinates (handle backward selection)
   * Returns coordinates in VIEWPORT space for rendering, clamped to visible area
   */
  normalizeSelection() {
    const t = this.normalizeBufferSelection();
    if (!t) return null;
    let { startCol: e, startRow: s, endCol: r, endRow: n } = t, o = this.absoluteRowToViewport(s), l = this.absoluteRowToViewport(n);
    const a = this.wasmTerm.getDimensions(), h = a.rows - 1;
    return l < 0 || o > h ? null : (o < 0 && (o = 0, e = 0), l > h && (l = h, r = a.cols - 1), { startCol: e, startRow: o, endCol: r, endRow: l });
  }
  /** Normalize endpoints without converting away from public buffer coordinates. */
  normalizeBufferSelection() {
    if (!this.selectionStart || !this.selectionEnd) return null;
    let { col: t, absoluteRow: e } = this.selectionStart, { col: s, absoluteRow: r } = this.selectionEnd;
    return (e > r || e === r && t > s) && ([t, s] = [s, t], [e, r] = [r, e]), { startCol: t, startRow: e, endCol: s, endRow: r };
  }
  /**
   * Get word boundaries at a cell position
   */
  getWordAtCell(t, e) {
    const s = this.viewportRowToAbsolute(e), r = this.wasmTerm.getScrollbackLength();
    let n;
    if (s < r)
      n = this.wasmTerm.getScrollbackLine(s);
    else {
      const h = s - r;
      n = this.wasmTerm.getLine(h);
    }
    if (!n) return null;
    const o = (h) => {
      if (!h || h.codepoint === 0) return !1;
      const c = String.fromCodePoint(h.codepoint);
      return /[\w\-./~@+]/.test(c);
    };
    if (!o(n[t])) return null;
    let l = t;
    for (; l > 0 && o(n[l - 1]); )
      l--;
    let a = t;
    for (; a < n.length - 1 && o(n[a + 1]); )
      a++;
    return { startCol: l, endCol: a };
  }
  /**
   * Copy text to clipboard
   *
   * Strategy (modern APIs first):
   * 1. Try ClipboardItem API (works in Safari and modern browsers)
   *    - Safari requires the ClipboardItem to be created synchronously within user gesture
   * 2. Try navigator.clipboard.writeText (modern async API, may fail in Safari)
   * 3. Fall back to execCommand (legacy, for older browsers)
   */
  copyToClipboard(t) {
    if (navigator.clipboard && typeof ClipboardItem < "u")
      try {
        const e = new Blob([t], { type: "text/plain" }), s = new ClipboardItem({
          "text/plain": e
        });
        navigator.clipboard.write([s]).catch((r) => {
          console.warn("ClipboardItem write failed, trying writeText:", r), this.copyWithWriteText(t);
        });
        return;
      } catch {
      }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch((e) => {
        console.warn("Clipboard writeText failed, trying execCommand:", e), this.copyWithExecCommand(t);
      });
      return;
    }
    this.copyWithExecCommand(t);
  }
  /**
   * Copy using navigator.clipboard.writeText
   */
  copyWithWriteText(t) {
    navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t).catch((e) => {
      console.warn("Clipboard writeText failed, trying execCommand:", e), this.copyWithExecCommand(t);
    }) : this.copyWithExecCommand(t);
  }
  /**
   * Copy using legacy execCommand (fallback for older browsers)
   */
  copyWithExecCommand(t) {
    const e = document.activeElement;
    try {
      const s = this.textarea;
      s.value = t, s.style.position = "fixed", s.style.left = "-9999px", s.style.top = "0", s.style.width = "1px", s.style.height = "1px", s.style.opacity = "0", s.focus(), s.select(), s.setSelectionRange(0, t.length);
      const r = document.execCommand("copy");
      e && e.focus(), r || console.warn("execCommand copy failed");
    } catch (s) {
      console.warn("execCommand copy threw:", s), e && e.focus();
    }
  }
  /**
   * Request a render update (triggers selection overlay redraw)
   */
  requestRender() {
    this.terminal.requestRender();
  }
};
N.AUTO_SCROLL_EDGE_SIZE = 30, N.AUTO_SCROLL_SPEED = 3, N.AUTO_SCROLL_INTERVAL = 50;
let dt = N;
const nt = 512, Pe = 16, De = 512, yt = 3;
let Be = 1;
function Ie(i, t) {
  return i === t || i !== void 0 && t !== void 0 && i.start.x === t.start.x && i.start.y === t.start.y && i.end.x === t.end.x && i.end.y === t.end.y;
}
function Oe(i, t) {
  return i.length !== t.length ? !1 : i.every(
    (e, s) => e.column === t[s].column && e.width === t[s].width && e.text === t[s].text
  );
}
function He(i, t) {
  return i !== null && i.screen === t.screen && i.absoluteRow === t.absoluteRow && i.setSize === t.setSize && i.text === t.text && i.cursorColumn === t.cursorColumn && i.selectionContinuesAbove === t.selectionContinuesAbove && i.selectionContinuesBelow === t.selectionContinuesBelow && Ie(i.selection, t.selection) && Oe(i.cells, t.cells);
}
function Fe(i, t, e) {
  const { start: s, end: r } = e.range;
  return t < s.y || t > r.y ? !1 : s.y === r.y ? i >= s.x && i <= r.x : t === s.y ? i >= s.x : t === r.y ? i <= r.x : !0;
}
function Ne(i) {
  return i.map(
    (t) => `${t.range.start.y}:${t.range.start.x}-${t.range.end.y}:${t.range.end.x}:${t.text}`
  ).join("\0");
}
class Ue {
  constructor(t, e, s, r) {
    this.terminal = t, this.input = e, this.linkDetector = s, this.rowElements = [], this.rowStates = [], this.rowRevisions = [], this.disposed = !1, this.lastSelectionContext = "", this.lastCursorContext = "";
    const n = Be++;
    this.root = document.createElement("div"), this.rowContainer = document.createElement("div"), this.cursorContext = document.createElement("div"), this.selectionContext = document.createElement("div"), this.liveRegion = document.createElement("div"), this.originalControls = e.getAttribute("aria-controls"), this.originalDescribedBy = e.getAttribute("aria-describedby");
    const o = `ghostty-screen-${n}`, l = `ghostty-cursor-${n}`, a = `ghostty-selection-${n}`;
    try {
      this.root.dataset.ghosttyAccessibility = "", this.root.setAttribute("contenteditable", "false"), this.root.style.position = "absolute", this.root.style.width = "1px", this.root.style.height = "1px", this.root.style.padding = "0", this.root.style.margin = "-1px", this.root.style.overflow = "hidden", this.root.style.clipPath = "inset(50%)", this.root.style.whiteSpace = "nowrap", this.root.style.border = "0", this.rowContainer.id = o, this.rowContainer.dataset.ghosttyAccessibilityRows = "", this.rowContainer.setAttribute("role", "list"), this.rowContainer.setAttribute("aria-label", "Terminal screen"), this.rowContainer.setAttribute("aria-live", "off"), this.cursorContext.id = l, this.cursorContext.dataset.ghosttyAccessibilityCursor = "", this.cursorContext.setAttribute("aria-live", "off"), this.selectionContext.id = a, this.selectionContext.dataset.ghosttyAccessibilitySelection = "", this.selectionContext.setAttribute("aria-live", "off"), this.liveRegion.dataset.ghosttyAccessibilityLive = "", this.liveRegion.setAttribute("aria-live", "polite"), this.liveRegion.setAttribute("aria-atomic", "true"), this.liveRegion.setAttribute("aria-relevant", "additions text"), this.root.append(
        this.rowContainer,
        this.cursorContext,
        this.selectionContext,
        this.liveRegion
      ), this.ensureRowCount(), r.appendChild(this.root), e.setAttribute(
        "aria-controls",
        this.appendIdReference(this.originalControls, o)
      ), e.setAttribute(
        "aria-describedby",
        this.appendIdReference(this.originalDescribedBy, l, a)
      );
    } catch (h) {
      throw this.root.remove(), this.restoreInputAssociations(), h;
    }
  }
  /** Update the mirror from one completed Canvas presentation frame. */
  updateFrame(t, e) {
    var s, r;
    if (!this.disposed)
      try {
        this.ensureRowCount();
        const n = this.terminal.buffer.active, o = n.type, l = n.viewportY, h = o !== this.lastScreen || l !== this.lastViewportTop ? this.allViewportRows() : this.rowsInRanges(t), c = this.terminal.getSelectionPosition(), u = n.baseY + e.y, p = /* @__PURE__ */ new Map();
        for (const f of this.rowStates)
          ((s = f.base) == null ? void 0 : s.screen) === o && p.set(f.base.absoluteRow, f.base.text);
        const m = /* @__PURE__ */ new Set();
        for (const f of h) {
          this.updateRow(f, n, o, l, e, c);
          const g = (r = this.rowStates[f]) == null ? void 0 : r.base;
          g && (p.has(g.absoluteRow) ? p.get(g.absoluteRow) !== g.text : g.text.length > 0) && m.add(g.absoluteRow);
        }
        this.updateContexts(n, e, u, c), this.updateAnnouncement(n, o, u, m), this.lastScreen = o, this.lastViewportTop = l, this.presentedState = { screen: o, cursorAbsoluteRow: u };
      } catch (n) {
        console.error("Terminal accessibility update failed:", n);
      }
  }
  dispose() {
    if (!this.disposed) {
      this.disposed = !0;
      for (let t = 0; t < this.rowRevisions.length; t++)
        this.rowRevisions[t]++;
      this.restoreInputAssociations(), this.root.remove(), this.rowElements.length = 0, this.rowStates.length = 0, this.rowRevisions.length = 0;
    }
  }
  appendIdReference(t, ...e) {
    return [.../* @__PURE__ */ new Set([...(t == null ? void 0 : t.split(/\s+/).filter(Boolean)) ?? [], ...e])].join(" ");
  }
  restoreInputAssociations() {
    this.originalControls === null ? this.input.removeAttribute("aria-controls") : this.input.setAttribute("aria-controls", this.originalControls), this.originalDescribedBy === null ? this.input.removeAttribute("aria-describedby") : this.input.setAttribute("aria-describedby", this.originalDescribedBy);
  }
  ensureRowCount() {
    var t;
    for (; this.rowElements.length < this.terminal.rows; ) {
      const e = document.createElement("div");
      e.setAttribute("role", "listitem"), e.setAttribute("tabindex", "-1"), e.dataset.ghosttyAccessibilityRow = `${this.rowElements.length}`, e.textContent = " ", this.rowContainer.appendChild(e), this.rowElements.push(e), this.rowStates.push({ base: null, links: [], linkSignature: "", linkGeneration: -1 }), this.rowRevisions.push(0);
    }
    for (; this.rowElements.length > this.terminal.rows; )
      this.rowRevisions[this.rowRevisions.length - 1]++, (t = this.rowElements.pop()) == null || t.remove(), this.rowStates.pop(), this.rowRevisions.pop();
  }
  allViewportRows() {
    return Array.from({ length: this.terminal.rows }, (t, e) => e);
  }
  rowsInRanges(t) {
    const e = /* @__PURE__ */ new Set();
    for (const s of t) {
      const r = Math.max(0, Math.trunc(s.start)), n = Math.min(this.terminal.rows - 1, Math.trunc(s.end));
      for (let o = r; o <= n; o++) e.add(o);
    }
    return [...e].sort((s, r) => s - r);
  }
  updateRow(t, e, s, r, n, o) {
    const l = this.rowElements[t], a = this.rowStates[t];
    if (!l || !a) return;
    const h = r + t, c = e.getLine(h), u = this.extractCells(c), p = u.map((P) => P.text).join(""), m = n.visible && h === e.baseY + n.y ? n.x : null, f = this.selectionForRow(o, h, c), g = {
      screen: s,
      absoluteRow: h,
      setSize: e.length,
      text: p,
      cells: u,
      cursorColumn: m,
      selection: f,
      selectionContinuesAbove: t === 0 && o !== void 0 && o.start.y < h,
      selectionContinuesBelow: t === this.terminal.rows - 1 && o !== void 0 && o.end.y > h
    }, b = !He(a.base, g), S = this.linkDetector.getGeneration(), v = a.linkGeneration !== S;
    if (a.base = g, !b && !v) return;
    const x = ++this.rowRevisions[t];
    (b || v) && (a.links = [], a.linkSignature = "", a.linkGeneration = S, this.renderRow(l, g, a.links)), this.linkDetector.getLinksForRow(h).then((P) => {
      if (this.disposed || x !== this.rowRevisions[t] || !this.linkDetector.isGenerationCurrent(S))
        return;
      const E = this.rowStates[t];
      if (!(E != null && E.base) || E.base.screen !== s || E.base.absoluteRow !== h)
        return;
      const k = Ne(P);
      k !== E.linkSignature && (E.links = P, E.linkSignature = k, this.renderRow(l, E.base, P));
    });
  }
  extractCells(t) {
    var s;
    if (!t) return [];
    const e = [];
    for (let r = 0; r < t.length; r++) {
      const n = t.getCell(r);
      if (!n || n.getWidth() === 0) continue;
      const o = n.getChars();
      e.push({
        column: r,
        width: Math.max(1, n.getWidth()),
        text: o || " ",
        nullPadding: n.getCode() === 0
      });
    }
    for (; (s = e[e.length - 1]) != null && s.nullPadding; ) e.pop();
    return e.map(({ column: r, width: n, text: o }) => ({ column: r, width: n, text: o }));
  }
  normalizeColumn(t, e) {
    var r;
    const s = Math.max(0, Math.min(Math.trunc(e), this.terminal.cols - 1));
    if (s > 0 && ((r = t == null ? void 0 : t.getCell(s)) == null ? void 0 : r.getWidth()) === 0) {
      const n = t.getCell(s - 1);
      if ((n == null ? void 0 : n.getWidth()) === 2) return s - 1;
    }
    return s;
  }
  selectionForRow(t, e, s) {
    if (!(!t || e < t.start.y || e > t.end.y))
      return {
        start: {
          x: e === t.start.y ? this.normalizeColumn(s, t.start.x) : 0,
          y: e
        },
        end: {
          x: e === t.end.y ? this.normalizeColumn(s, t.end.x) : this.terminal.cols - 1,
          y: e
        }
      };
  }
  renderRow(t, e, s) {
    var m, f;
    t.setAttribute("aria-posinset", `${e.absoluteRow + 1}`), t.setAttribute("aria-setsize", `${e.setSize}`), e.cursorColumn === null ? t.removeAttribute("aria-current") : t.setAttribute("aria-current", "true");
    const r = document.createDocumentFragment();
    let n, o, l = !1, a = !1, h = !1;
    const c = (g) => {
      (o ?? r).appendChild(document.createTextNode(g));
    }, u = (g, b) => {
      const S = document.createElement("span");
      S.dataset.ghosttyAccessibilityMarker = g, S.textContent = b, (o ?? r).appendChild(S);
    }, p = (g) => {
      g !== n && (n = g, o = g ? this.createLinkElement(g) : void 0, o && r.appendChild(o));
    };
    e.selectionContinuesAbove && u("selection-continues-above", "Selection continues from above. ");
    for (const g of e.cells) {
      const b = s.find(
        (S) => Fe(g.column, e.absoluteRow, S)
      );
      p(b), ((m = e.selection) == null ? void 0 : m.start.x) === g.column && (u("selection-start", "Selection start. "), a = !0), e.cursorColumn === g.column && (u("cursor", "Cursor. "), l = !0), c(g.text), ((f = e.selection) == null ? void 0 : f.end.x) === g.column && (u("selection-end", " Selection end."), h = !0);
    }
    p(void 0), e.cursorColumn !== null && !l && (u("cursor", " Cursor."), l = !0), e.selection && !a && u("selection-start", "Selection start. "), e.selection && !h && u("selection-end", "Selection end."), e.selectionContinuesBelow && u("selection-continues-below", " Selection continues below."), r.hasChildNodes() || r.appendChild(document.createTextNode(" ")), t.replaceChildren(r);
  }
  createLinkElement(t) {
    const e = document.createElement("span");
    return e.setAttribute("role", "link"), e.setAttribute("aria-label", t.text), e.setAttribute("tabindex", "-1"), e.dataset.ghosttyAccessibilityLink = t.text, e.addEventListener("click", (s) => {
      s.preventDefault(), s.stopPropagation(), t.activate(
        new MouseEvent("click", {
          ctrlKey: !0,
          bubbles: !1,
          cancelable: !0,
          detail: s.detail
        })
      );
    }), e.addEventListener("keydown", (s) => {
      s.key === "Enter" && (s.preventDefault(), s.stopPropagation(), e.click());
    }), e;
  }
  updateContexts(t, e, s, r) {
    const n = this.extractCells(t.getLine(s)).map((a) => a.text).join(""), o = e.visible ? `Cursor row ${s + 1}, column ${e.x + 1}${n ? `: ${n}` : ""}` : "Terminal cursor hidden";
    o !== this.lastCursorContext && (this.cursorContext.textContent = o, this.lastCursorContext = o);
    const l = r ? this.buildSelectionContext(t, r) : "";
    l !== this.lastSelectionContext && (this.selectionContext.textContent = l, this.lastSelectionContext = l);
  }
  buildSelectionContext(t, e) {
    const s = `Selection from row ${e.start.y + 1}, column ${e.start.x + 1} to row ${e.end.y + 1}, column ${e.end.x + 1}`;
    let r = "", n = !1, o = 0;
    for (let l = e.start.y; l <= e.end.y && o < Pe; l++, o++) {
      const a = this.extractCells(t.getLine(l)), h = l === e.start.y ? e.start.x : 0, c = l === e.end.y ? e.end.x : this.terminal.cols - 1, u = a.filter((m) => m.column >= h && m.column <= c).map((m) => m.text).join(""), p = r && u ? `
` : "";
      if (r.length + p.length + u.length > nt) {
        r += `${p}${u.slice(
          0,
          nt - r.length - p.length
        )}`, n = !0;
        break;
      }
      if (r += `${p}${u}`, r.length >= nt && l < e.end.y) {
        n = !0;
        break;
      }
    }
    return e.end.y - e.start.y + 1 > o && (n = !0), `${s}.${r ? ` Preview: ${r}${n ? "…" : ""}` : ""}`;
  }
  updateAnnouncement(t, e, s, r) {
    const n = [], o = this.presentedState;
    if (o && o.screen !== e)
      n.push(e === "alternate" ? "Alternate screen." : "Main screen.");
    else if ((o == null ? void 0 : o.screen) === "normal" && e === "normal" && this.terminal.getViewportY() === 0 && s > o.cursorAbsoluteRow && [...r].some(
      (h) => h >= o.cursorAbsoluteRow && h <= s
    )) {
      const h = Math.max(
        o.cursorAbsoluteRow,
        s - yt
      );
      for (let c = h; c < s; c++) {
        const u = this.extractCells(t.getLine(c)).map((p) => p.text).join("").trimEnd();
        u && n.push(u);
      }
      s - o.cursorAbsoluteRow > yt && n.unshift("Additional terminal output available.");
    }
    if (n.length === 0) return;
    const l = n.join(`
`).slice(0, De), a = document.createElement("div");
    a.textContent = l, this.liveRegion.replaceChildren(a);
  }
}
class Ye {
  constructor(t) {
    this.bufferChangeEmitter = new I(), this.terminal = t;
  }
  get active() {
    const t = this.terminal.wasmTerm;
    return t ? t.isAlternateScreen() ? this.alternate : this.normal : this.normal;
  }
  get normal() {
    return this._normalBuffer || (this._normalBuffer = new Lt(this.terminal, "normal")), this._normalBuffer;
  }
  get alternate() {
    return this._alternateBuffer || (this._alternateBuffer = new Lt(this.terminal, "alternate")), this._alternateBuffer;
  }
  get onBufferChange() {
    return this.bufferChangeEmitter.event;
  }
  /**
   * Internal: Fire buffer change event when screen switches
   * Should be called by Terminal when detecting screen change
   */
  _fireBufferChange(t) {
    this.bufferChangeEmitter.fire(t);
  }
  _dispose() {
    this.bufferChangeEmitter.dispose();
  }
}
class Lt {
  constructor(t, e) {
    this.terminal = t, this.bufferType = e;
    const s = {
      codepoint: 0,
      fg_r: 204,
      fg_g: 204,
      fg_b: 204,
      bg_r: 0,
      bg_g: 0,
      bg_b: 0,
      flags: 0,
      width: 1,
      hyperlink_id: 0,
      grapheme_len: 0
    };
    this.nullCell = new ft(s);
  }
  get type() {
    return this.bufferType;
  }
  get cursorX() {
    var t;
    return ((t = this.getInfo()) == null ? void 0 : t.cursorX) ?? 0;
  }
  get cursorY() {
    var t;
    return ((t = this.getInfo()) == null ? void 0 : t.cursorY) ?? 0;
  }
  get viewportY() {
    if (this.bufferType === "alternate") return 0;
    const t = this.baseY;
    return Math.max(0, t - Math.floor(this.terminal.viewportY));
  }
  get baseY() {
    var t;
    return this.bufferType === "normal" ? ((t = this.getInfo()) == null ? void 0 : t.scrollbackLength) ?? 0 : 0;
  }
  get length() {
    const t = this.getWasmTerm();
    if (!t) return 0;
    const e = this.getInfo();
    return e ? e.scrollbackLength + e.rows : this.bufferType === "alternate" ? t.rows : 0;
  }
  getLine(t) {
    const e = this.getWasmTerm();
    if (!e) return;
    const s = this.getInfo(), r = s ? s.scrollbackLength + s.rows : this.bufferType === "alternate" ? e.rows : 0;
    if (t < 0 || t >= r)
      return;
    if (!s) return new kt([], !1, e.cols);
    const n = e.getBufferLine(this.bufferType, t);
    if (!n)
      return;
    const o = [];
    for (let l = 0; l < n.length; l++) {
      if (n[l].grapheme_len === 0) continue;
      const a = e.getBufferGrapheme(this.bufferType, t, l);
      a != null && a.length && (o[l] = String.fromCodePoint(...a));
    }
    return new kt(
      n,
      e.isBufferRowWrapped(this.bufferType, t),
      s.cols,
      o
    );
  }
  getNullCell() {
    return this.nullCell;
  }
  getWasmTerm() {
    return this.terminal.wasmTerm;
  }
  getInfo() {
    var t;
    return ((t = this.getWasmTerm()) == null ? void 0 : t.getBufferInfo(this.bufferType)) ?? null;
  }
}
class kt {
  constructor(t, e, s, r = []) {
    this.cells = t, this._isWrapped = e, this._length = s, this.graphemes = r;
  }
  get length() {
    return this._length;
  }
  get isWrapped() {
    return this._isWrapped;
  }
  getCell(t) {
    if (!(t < 0 || t >= this._length))
      return t >= this.cells.length ? new ft({
        codepoint: 0,
        fg_r: 204,
        fg_g: 204,
        fg_b: 204,
        bg_r: 0,
        bg_g: 0,
        bg_b: 0,
        flags: 0,
        width: 1,
        hyperlink_id: 0,
        grapheme_len: 0
      }) : new ft(this.cells[t], this.graphemes[t]);
  }
  translateToString(t = !1, e = 0, s = this._length) {
    const r = Math.max(0, Math.min(e, this._length)), n = Math.max(r, Math.min(s, this._length));
    let o = "";
    for (let l = r; l < n; l++) {
      const a = this.getCell(l);
      if (a) {
        const h = a.getChars();
        o += h;
      }
    }
    return t && (o = o.trimEnd()), o;
  }
}
class ft {
  constructor(t, e) {
    this.cell = t, this.chars = e;
  }
  getChars() {
    if (this.chars !== void 0) return this.chars;
    const t = this.cell.codepoint;
    return t === 0 ? "" : t < 0 || t > 1114111 || t >= 55296 && t <= 57343 ? "�" : String.fromCodePoint(t);
  }
  getCode() {
    return this.cell.codepoint;
  }
  getWidth() {
    return this.cell.width;
  }
  getFgColorMode() {
    return -1;
  }
  getBgColorMode() {
    return -1;
  }
  getFgColor() {
    return this.cell.fg_r << 16 | this.cell.fg_g << 8 | this.cell.fg_b;
  }
  getBgColor() {
    return this.cell.bg_r << 16 | this.cell.bg_g << 8 | this.cell.bg_b;
  }
  isBold() {
    return (this.cell.flags & L.BOLD) !== 0 ? 1 : 0;
  }
  isItalic() {
    return (this.cell.flags & L.ITALIC) !== 0 ? 1 : 0;
  }
  isUnderline() {
    return (this.cell.flags & L.UNDERLINE) !== 0 ? 1 : 0;
  }
  isStrikethrough() {
    return (this.cell.flags & L.STRIKETHROUGH) !== 0 ? 1 : 0;
  }
  isBlink() {
    return (this.cell.flags & L.BLINK) !== 0 ? 1 : 0;
  }
  isInverse() {
    return (this.cell.flags & L.INVERSE) !== 0 ? 1 : 0;
  }
  isInvisible() {
    return (this.cell.flags & L.INVISIBLE) !== 0 ? 1 : 0;
  }
  isFaint() {
    return (this.cell.flags & L.FAINT) !== 0 ? 1 : 0;
  }
  /**
   * Get hyperlink ID for this cell (0 = no link)
   * Used by link detection system
   */
  getHyperlinkId() {
    return this.cell.hyperlink_id;
  }
  /**
   * Get the Unicode codepoint for this cell
   * Used by link detection system
   */
  getCodepoint() {
    return this.cell.codepoint;
  }
  /**
   * Check if cell has dim/faint attribute
   * Added for IBufferCell compatibility
   */
  isDim() {
    return (this.cell.flags & L.FAINT) !== 0;
  }
}
const We = 4, ze = 128, Ge = 75;
class Ve {
  constructor(t, e, s, r, n, o) {
    this.owner = t, this.query = e, this.caseSensitive = s, this.sessionId = r, this.terminal = n, this.signal = o, this.matches = Object.freeze([]), this.pending = !0, this.invalidated = !1, this.disposed = !1, this.dirty = !1, this.ranges = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set(), this.abort = () => this.owner.cancel();
  }
  onUpdate(t) {
    return this.disposed ? { dispose: () => {
    } } : (this.listeners.add(t), { dispose: () => this.listeners.delete(t) });
  }
  publish() {
    for (const t of [...this.listeners]) t();
  }
  revoke() {
    const t = [...this.listeners];
    this.invalidated = !0, this.pending = !1, this.matches = Object.freeze([]), this.owner.releaseResult(this);
    for (const e of t) e();
  }
  clearListeners() {
    this.listeners.clear();
  }
  extract(t) {
    return this.owner.extract(this, t);
  }
  resolve(t) {
    return this.owner.resolve(this, t);
  }
  dispose() {
    this.owner.releaseResult(this);
  }
}
function ot(i) {
  const t = new Error(i);
  return t.name = "AbortError", t;
}
class $e {
  constructor(t, e = () => {
  }) {
    this.getTerminal = t, this.onInvalidate = e, this.identities = /* @__PURE__ */ new WeakMap(), this.disposed = !1;
  }
  search(t, e) {
    var o, l;
    if (this.disposed) return Promise.reject(new Error("Terminal search is disposed"));
    if (this.cancel(), (o = e.signal) != null && o.aborted)
      return Promise.reject(ot("Retained-buffer search was aborted"));
    const s = this.getTerminal();
    if (!s) return Promise.reject(new Error("Terminal is not open"));
    const r = t.length === 0 ? 0 : s.createRetainedSearch(t, e.caseSensitive);
    if (t.length > 0 && r === 0)
      return Promise.reject(new Error("Unable to create retained-buffer search"));
    const n = new Ve(
      this,
      t,
      e.caseSensitive,
      r,
      s,
      e.signal
    );
    return this.currentResult = n, (l = e.signal) == null || l.addEventListener("abort", n.abort, { once: !0 }), r === 0 ? (n.pending = !1, Promise.resolve(n)) : new Promise((a, h) => {
      const c = {
        terminal: s,
        result: n,
        phase: "search",
        matchCount: 0,
        nextMatch: 0,
        ranges: [],
        rangesById: /* @__PURE__ */ new Map(),
        resolve: a,
        reject: h
      };
      this.currentJob = c, this.schedule(c);
    });
  }
  noteWrite() {
    var e;
    const t = this.currentResult;
    if (!(!t || t.disposed || t.sessionId === 0)) {
      if (this.getTerminal() !== t.terminal) {
        this.invalidateAll();
        return;
      }
      if (t.dirty = !0, ((e = this.getTerminal()) == null ? void 0 : e.getRetainedSearchMatchCount(t.sessionId)) === -1 && !this.currentJob) {
        this.invalidateAll();
        return;
      }
      t.publish(), this.scheduleRefresh(t);
    }
  }
  invalidateAll() {
    const t = this.currentResult;
    t && !t.disposed && t.revoke();
  }
  cancel() {
    var e;
    const t = this.currentJob;
    this.currentJob = void 0, (t == null ? void 0 : t.timer) !== void 0 && clearTimeout(t.timer), (e = t == null ? void 0 : t.reject) == null || e.call(t, ot("Retained-buffer search was revoked")), this.currentResult && this.releaseResult(this.currentResult);
  }
  identity(t, e) {
    if (this.disposed || t.disposed || t.invalidated || this.currentResult !== t || this.getTerminal() !== t.terminal)
      return;
    const s = this.identities.get(e);
    return (s == null ? void 0 : s.sessionId) === t.sessionId ? s : void 0;
  }
  extract(t, e) {
    const s = this.identity(t, e);
    return s ? t.terminal.getRetainedSearchMatchText(s.sessionId, s.occurrenceId) ?? void 0 : void 0;
  }
  resolve(t, e) {
    const s = this.identity(t, e);
    if (!s) return;
    const r = t.terminal.getRetainedSearchMatchRange(
      s.sessionId,
      s.occurrenceId
    );
    if (!r) return;
    const n = Object.freeze({
      id: s.occurrenceId,
      start: Object.freeze({ row: r.startRow, column: r.startColumn }),
      end: Object.freeze({ row: r.endRow, column: r.endColumn })
    });
    return this.identities.set(n, s), n;
  }
  extractCurrent(t) {
    return this.currentResult ? this.extract(this.currentResult, t) : void 0;
  }
  /** Authenticate one current range without extracting its text. */
  resolveRange(t) {
    return this.currentResult ? this.resolve(this.currentResult, t) : void 0;
  }
  releaseResult(t) {
    var s, r;
    if (t.disposed) return;
    t.disposed = !0, t.invalidated = !0, t.pending = !1, t.matches = Object.freeze([]), t.refreshTimer !== void 0 && clearTimeout(t.refreshTimer), (s = t.signal) == null || s.removeEventListener("abort", t.abort), t.clearListeners(), t.ranges.clear(), t.sessionId !== 0 && t.terminal.cancelRetainedSearch(t.sessionId), this.currentResult === t && (this.currentResult = void 0, this.onInvalidate());
    const e = this.currentJob;
    (e == null ? void 0 : e.result) === t && (this.currentJob = void 0, e.timer !== void 0 && clearTimeout(e.timer), (r = e.reject) == null || r.call(e, ot("Retained-buffer search was disposed")));
  }
  dispose() {
    this.disposed || (this.disposed = !0, this.invalidateAll());
  }
  schedule(t) {
    t.timer = setTimeout(() => {
      t.timer = void 0, this.run(t);
    }, 0);
  }
  scheduleRefresh(t) {
    this.currentResult !== t || t.disposed || this.currentJob || t.refreshTimer !== void 0 || !t.dirty || (t.refreshTimer = setTimeout(() => {
      if (t.refreshTimer = void 0, this.currentResult !== t || t.disposed) return;
      const e = this.getTerminal();
      if (!e || e !== t.terminal || !e.refreshRetainedSearch(t.sessionId)) {
        this.invalidateAll();
        return;
      }
      t.dirty = !1, t.pending = !0;
      const s = {
        terminal: e,
        result: t,
        phase: "search",
        matchCount: 0,
        nextMatch: 0,
        ranges: [],
        rangesById: /* @__PURE__ */ new Map()
      };
      this.currentJob = s, t.publish(), this.currentJob === s && !t.disposed && this.schedule(s);
    }, Ge));
  }
  run(t) {
    var r, n, o;
    if (this.currentJob !== t || t.result.disposed) return;
    if (this.getTerminal() !== t.terminal) {
      this.invalidateAll();
      return;
    }
    if ((r = t.result.signal) != null && r.aborted) {
      this.cancel();
      return;
    }
    const e = performance.now() + We;
    if (t.phase === "search") {
      do {
        const l = t.terminal.stepRetainedSearch(t.result.sessionId);
        if (l < 0) {
          (n = t.reject) == null || n.call(t, new Error("Retained-buffer search failed")), this.invalidateAll();
          return;
        }
        if (l === 1) {
          t.matchCount = t.terminal.getRetainedSearchMatchCount(t.result.sessionId), t.phase = "ranges";
          break;
        }
      } while (performance.now() < e);
      if (t.phase === "search") {
        this.schedule(t);
        return;
      }
    }
    let s = 0;
    for (; t.nextMatch < t.matchCount && s < ze && performance.now() < e; ) {
      const l = t.terminal.getRetainedSearchMatchId(t.result.sessionId, t.nextMatch++);
      s++;
      const a = t.terminal.getRetainedSearchMatchRange(t.result.sessionId, l);
      if (!a) continue;
      let h = t.result.ranges.get(l);
      h || (h = Object.freeze({
        id: l,
        start: Object.freeze({ row: a.startRow, column: a.startColumn }),
        end: Object.freeze({ row: a.endRow, column: a.endColumn })
      }), this.identities.set(h, { sessionId: t.result.sessionId, occurrenceId: l })), t.ranges.push(h), t.rangesById.set(h.id, h);
    }
    if (t.nextMatch < t.matchCount) {
      this.schedule(t);
      return;
    }
    this.currentJob = void 0, t.result.ranges = t.rangesById, t.result.matches = Object.freeze(t.ranges), t.result.pending = !1, (o = t.resolve) == null || o.call(t, t.result), t.result.publish(), this.scheduleRefresh(t.result);
  }
}
class Xe {
  constructor() {
    this.emitter = new I(), this.pending = [], this.delivering = !1, this.disposed = !1, this.onData = (t) => this.subscribe((e) => t(e.data)), this.onDataWithSource = (t) => this.subscribe(t);
  }
  emit(t, e) {
    if (this.disposed || (this.pending.push(Object.freeze({ data: t, source: e })), this.delivering)) return;
    this.delivering = !0;
    try {
      for (let r = 0; r < this.pending.length; r++)
        this.emitter.fire(this.pending[r]);
    } finally {
      this.pending = [], this.delivering = !1;
    }
    const s = this.deliveryFailure;
    if (this.deliveryFailure = void 0, s) throw s.error;
  }
  dispose() {
    this.disposed || (this.disposed = !0, this.pending = [], this.emitter.dispose());
  }
  subscribe(t) {
    if (this.disposed) return { dispose: () => {
    } };
    let e = !this.disposed;
    const s = this.emitter.event((r) => {
      if (!(!e || this.disposed))
        try {
          t(r);
        } catch (n) {
          this.deliveryFailure ?? (this.deliveryFailure = { error: n });
        }
    });
    return {
      dispose: () => {
        e = !1, s.dispose();
      }
    };
  }
}
const qe = 1e3, Je = 100;
function At(i) {
  return typeof i != "number" || !Number.isFinite(i) ? Je : Math.max(0, i);
}
class je {
  // 200ms fade animation
  constructor(t = {}) {
    var s;
    if (this.unicode = {
      get activeVersion() {
        return "15.1";
      }
    }, this.hostMouseDownListenerAttached = !1, this.hostMouseMoveListenerAttached = !1, this.hostMouseLeaveListenerAttached = !1, this.hostClickListenerAttached = !1, this.hostWheelListenerAttached = !1, this.documentMouseUpListenerAttached = !1, this.linkHoverRequestSerial = 0, this.dataChannel = new Xe(), this.resizeEmitter = new I(), this.bellEmitter = new I(), this.selectionChangeEmitter = new I(), this.keyEmitter = new I(), this.titleChangeEmitter = new I(), this.scrollEmitter = new I(), this.renderEmitter = new I(), this.cursorMoveEmitter = new I(), this.terminalEventEmitter = new I(), this.onData = this.dataChannel.onData, this.onResize = this.resizeEmitter.event, this.onBell = this.bellEmitter.event, this.onSelectionChange = this.selectionChangeEmitter.event, this.onKey = this.keyEmitter.event, this.onTitleChange = this.titleChangeEmitter.event, this.onScroll = this.scrollEmitter.event, this.onRender = this.renderEmitter.event, this.onCursorMove = this.cursorMoveEmitter.event, this.onTerminalEvent = this.terminalEventEmitter.event, this.isOpen = !1, this.isDisposed = !1, this.renderPaused = !1, this.forceFullRender = !1, this.parsedWrites = 0, this.renderRequests = 0, this.renderFrames = 0, this.fullRenderFrames = 0, this.devicePixelRatioChanged = !1, this.writeQueue = [], this.synchronizedOutputActive = !1, this.synchronizedOutputGeneration = 0, this.synchronizedOutputRecoveries = 0, this.rendererScrollbackProvider = {
      getScrollbackLine: (r) => this.getScrollbackLine(r),
      getScrollbackLength: () => this.getScrollbackLength(),
      getScrollbackGeneration: () => {
        var r;
        return ((r = this.wasmTerm) == null ? void 0 : r.getScrollbackGeneration()) ?? 0;
      },
      getScrollbackGraphemeString: (r, n) => {
        var o;
        return ((o = this.wasmTerm) == null ? void 0 : o.getScrollbackGraphemeString(r, n)) ?? " ";
      },
      getScrollbackViewport: (r, n) => {
        var o;
        return ((o = this.wasmTerm) == null ? void 0 : o.getScrollbackViewport(r, n)) ?? null;
      }
    }, this.addons = [], this.currentTitle = "", this.viewportY = 0, this.targetViewportY = 0, this.scrollAnimationStartViewportY = 0, this.scrollAnimationGeneration = 0, this.lastCursorX = 0, this.lastCursorY = 0, this.lastCursorAlternateScreen = !1, this.cursorScreenGeneration = 0, this.lastPresentedCursorScreenGeneration = 0, this.isDraggingScrollbar = !1, this.scrollbarDragStart = null, this.scrollbarDragStartViewportY = 0, this.scrollbarVisible = !1, this.scrollbarOpacity = 0, this.SCROLLBAR_HIDE_DELAY_MS = 1500, this.SCROLLBAR_FADE_DURATION_MS = 200, this.handleMouseMove = (r) => {
      if (!this.canvas || !this.renderer || !this.wasmTerm) return;
      if (this.isDraggingScrollbar) {
        this.processScrollbarDrag(r);
        return;
      }
      if (!this.linkDetector) return;
      this.synchronizeLinkHandlerPolicy();
      const n = ++this.linkHoverRequestSerial;
      if (this.mouseMoveThrottleTimeout !== void 0) {
        this.pendingMouseMove = { event: r, requestSerial: n };
        return;
      }
      this.processMouseMove(r, n), this.mouseMoveThrottleTimeout = window.setTimeout(() => {
        if (this.mouseMoveThrottleTimeout = void 0, this.pendingMouseMove) {
          const o = this.pendingMouseMove;
          this.pendingMouseMove = void 0, this.processMouseMove(o.event, o.requestSerial);
        }
      }, 16);
    }, this.handleMouseLeave = () => {
      this.clearLinkHoverState();
    }, this.handleClick = async (r) => {
      if (!this.canvas || !this.renderer || !this.linkDetector || !this.wasmTerm) return;
      this.synchronizeLinkHandlerPolicy();
      const n = this.getLinkBufferPosition(r);
      if (!n) return;
      const { col: o, bufferRow: l } = n, a = this.linkDetector, h = a.getGeneration(), c = await a.getLinkAt(o, l), u = this.getLinkBufferPosition(r);
      c && !this.isDisposed && this.isOpen && this.linkDetector === a && a.isGenerationCurrent(h) && (u == null ? void 0 : u.col) === o && u.bufferRow === l && (c.activate(r), (r.ctrlKey || r.metaKey) && r.preventDefault());
    }, this.handleWheel = (r) => {
      var o, l, a, h, c, u, p;
      if (r.preventDefault(), this.customWheelEventHandler && this.customWheelEventHandler(r)) {
        (o = this.inputHandler) == null || o.resetWheelGesture(), r.stopPropagation();
        return;
      }
      if ((((l = this.wasmTerm) == null ? void 0 : l.hasMouseTracking()) ?? !1) && !r.shiftKey) return;
      if (r.stopPropagation(), ((a = this.wasmTerm) == null ? void 0 : a.isAlternateScreen()) ?? !1)
        (h = this.inputHandler) == null || h.sendAlternateWheel(r);
      else {
        (c = this.inputHandler) == null || c.resetWheelGesture();
        let m;
        if (r.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
          const f = ((p = (u = this.renderer) == null ? void 0 : u.getMetrics()) == null ? void 0 : p.height) ?? 20;
          m = r.deltaY / f;
        } else r.deltaMode === WheelEvent.DOM_DELTA_LINE ? m = r.deltaY : r.deltaMode === WheelEvent.DOM_DELTA_PAGE ? m = r.deltaY * this.rows : m = r.deltaY / 33;
        if (m !== 0) {
          const f = this.viewportY - m;
          this.smoothScrollTo(f);
        }
      }
    }, this.handleMouseDown = (r) => {
      if (!this.canvas || !this.renderer || !this.wasmTerm) return;
      const n = this.wasmTerm.getScrollbackLength();
      if (n === 0) return;
      const o = this.canvas.getBoundingClientRect(), l = r.clientX - o.left, a = r.clientY - o.top, h = o.width, c = o.height, u = 8, p = h - u - 4, m = 4;
      if (l >= p && l <= p + u) {
        r.preventDefault(), r.stopPropagation(), r.stopImmediatePropagation();
        const f = c - m * 2, g = this.rows, b = n + g, S = Math.max(20, g / b * f), v = this.viewportY / n, x = m + (f - S) * (1 - v);
        if (a >= x && a <= x + S)
          this.isDraggingScrollbar = !0, this.scrollbarDragStart = a, this.scrollbarDragStartViewportY = this.viewportY, this.canvas && (this.canvas.style.userSelect = "none", this.canvas.style.webkitUserSelect = "none");
        else {
          const E = 1 - (a - m) / f, k = Math.round(E * n);
          this.scrollToLine(Math.max(0, Math.min(n, k)));
        }
      }
    }, this.handleMouseUp = () => {
      this.isDraggingScrollbar && (this.isDraggingScrollbar = !1, this.scrollbarDragStart = null, this.canvas && (this.canvas.style.userSelect = "", this.canvas.style.webkitUserSelect = ""), this.scrollbarVisible && this.getScrollbackLength() > 0 && this.showScrollbar());
    }, t.scrollback !== void 0 && t.scrollbackBytes !== void 0)
      throw new TypeError("scrollback and scrollbackBytes are mutually exclusive");
    this.ghostty = t.ghostty ?? Qe();
    const e = {
      cols: t.cols ?? 80,
      rows: t.rows ?? 24,
      cursorBlink: t.cursorBlink ?? !1,
      cursorStyle: t.cursorStyle ?? "block",
      theme: V(t.theme),
      scrollback: t.scrollback ?? (t.scrollbackBytes === void 0 ? 1e4 : void 0),
      scrollbackBytes: t.scrollbackBytes,
      fontSize: t.fontSize ?? 15,
      fontFamily: t.fontFamily ?? "monospace",
      fontLigatures: t.fontLigatures !== !1,
      allowTransparency: t.allowTransparency ?? !1,
      convertEol: t.convertEol ?? !1,
      disableStdin: t.disableStdin ?? !1,
      focusOnOpen: t.focusOnOpen ?? !0,
      disableContextMenu: t.disableContextMenu ?? !1,
      resolveClipboardFilePaste: t.resolveClipboardFilePaste,
      linkHandler: t.linkHandler ?? null,
      smoothScrollDuration: At(t.smoothScrollDuration),
      wheelScroll: t.wheelScroll
    };
    this.options = new Proxy(e, {
      set: (r, n, o) => {
        const l = r[n];
        if (n === "scrollback" && o !== void 0 && r.scrollbackBytes !== void 0 || n === "scrollbackBytes" && o !== void 0 && r.scrollback !== void 0)
          throw new TypeError("scrollback and scrollbackBytes are mutually exclusive");
        if (n === "theme") {
          const a = V(o);
          return this.isOpen && this.applyTheme(a), r[n] = a, !0;
        }
        if (n === "fontLigatures") {
          const a = o !== !1;
          return r[n] = a, this.isOpen && this.handleOptionChange(n, a, l), !0;
        }
        if (n === "smoothScrollDuration") {
          const a = At(o);
          return r[n] = a, this.isOpen && this.handleOptionChange(n, a, l), !0;
        }
        return r[n] = o, this.isOpen && this.handleOptionChange(n, o, l), !0;
      }
    }), this.cols = this.options.cols, this.rows = this.options.rows, this.observedLinkHandler = this.options.linkHandler, this.observedAllowNonHttpProtocols = ((s = this.options.linkHandler) == null ? void 0 : s.allowNonHttpProtocols) === !0, this.buffer = new Ye(this);
  }
  /** PTY-bound data with explicit producer-owned provenance. */
  onDataWithSource(t) {
    return this.dataChannel.onDataWithSource(t);
  }
  // ==========================================================================
  // Option Change Handling (for mutable options)
  // ==========================================================================
  /**
   * Handle runtime option changes (called when options are modified after terminal is open)
   * This enables xterm.js compatibility where options can be changed at runtime
   */
  handleOptionChange(t, e, s) {
    var r, n;
    if (e !== s)
      switch (t) {
        case "disableStdin":
          (r = this.inputHandler) == null || r.resetWheelGesture();
          break;
        case "cursorBlink":
        case "cursorStyle":
          this.applyCursorDefaults();
          break;
        case "fontSize":
          this.renderer && (this.renderer.setFontSize(this.options.fontSize), this.handleFontChange());
          break;
        case "fontFamily":
          this.renderer && (this.renderer.setFontFamily(this.options.fontFamily), this.handleFontChange());
          break;
        case "fontLigatures":
          (n = this.renderer) == null || n.setFontLigatures(this.options.fontLigatures);
          break;
        case "linkHandler":
          this.synchronizeLinkHandlerPolicy();
          break;
        case "smoothScrollDuration":
          this.scrollAnimationStartTime !== void 0 && (e === 0 ? this.finishSmoothScroll() : (this.scrollAnimationStartViewportY = this.viewportY, this.scrollAnimationStartTime = performance.now()));
          break;
        case "cols":
        case "rows":
          this.resize(this.options.cols, this.options.rows);
          break;
      }
  }
  /** Keep cached hit-testing aligned with both handler replacement and policy mutation. */
  synchronizeLinkHandlerPolicy() {
    var s;
    const t = this.options.linkHandler, e = (t == null ? void 0 : t.allowNonHttpProtocols) === !0;
    t === this.observedLinkHandler && e === this.observedAllowNonHttpProtocols || (this.observedLinkHandler = t, this.observedAllowNonHttpProtocols = e, (s = this.linkDetector) == null || s.invalidateCache(), this.requestRender(!0));
  }
  /**
   * Handle font changes (fontSize or fontFamily)
   * Updates canvas size to match new font metrics and forces a full re-render
   */
  handleFontChange() {
    var t;
    if (!(!this.renderer || !this.wasmTerm || !this.canvas)) {
      this.selectionManager && this.selectionManager.clearSelection();
      for (const e of [...this.addons]) {
        if (this.isDisposed || !this.isOpen) break;
        try {
          (t = e.onCellMetricsChange) == null || t.call(e);
        } catch (s) {
          console.error("Addon metric-change handler failed:", s);
        }
      }
      this.requestRender(!0);
    }
  }
  /** Apply one already-validated theme across native and Canvas ownership. */
  applyTheme(t) {
    if (!(!this.wasmTerm || !this.renderer)) {
      if (!this.wasmTerm.setColorConfig(Ct(t)))
        throw new Error("Failed to apply terminal palette");
      this.renderer.setTheme(t), this.updateFocusAppearance(t), this.requestRender(!0);
    }
  }
  /**
   * Reflect the canonical input's native :focus-visible semantics on the
   * visible host. Browsers intentionally treat a focused text-entry control as
   * focus-visible after keyboard, pointer, and touch activation because each
   * interaction can lead to typing.
   */
  updateFocusAppearance(t = this.options.theme) {
    if (!this.hostState || !this.textarea) return;
    (this.textarea.getRootNode().activeElement ?? document.activeElement) === this.textarea ? (this.hostState.element.style.outline = `2px solid ${t.foreground ?? pt.foreground}`, this.hostState.element.style.outlineOffset = "2px") : this.restoreHostOutline();
  }
  restoreHostOutline() {
    this.hostState && (this.hostState.element.style.outline = this.hostState.outline, this.hostState.element.style.outlineOffset = this.hostState.outlineOffset);
  }
  /**
   * Focus the sole browser input target. Keeping this path centralized lets
   * future touch gesture and assistive-input layers decide when to request the
   * mobile keyboard without creating another focus owner.
   */
  focusInputTarget() {
    var t;
    this.isOpen && ((t = this.textarea) == null || t.focus({ preventScroll: !0 }), this.updateFocusAppearance());
  }
  /**
   * Convert terminal options to WASM terminal config.
   */
  buildWasmConfig() {
    const t = this.options.scrollbackBytes === void 0 ? { scrollbackLimit: this.options.scrollback } : { scrollbackBytes: this.options.scrollbackBytes };
    return {
      ...Ct(V(this.options.theme)),
      ...t,
      cursorStyle: this.options.cursorStyle,
      cursorBlink: this.options.cursorBlink
    };
  }
  /** Apply parser-owned cursor defaults without replacing terminal or Canvas state. */
  applyCursorDefaults() {
    if (this.wasmTerm) {
      if (!this.wasmTerm.setCursorConfig({
        cursorStyle: this.options.cursorStyle,
        cursorBlink: this.options.cursorBlink
      }))
        throw new Error("Failed to apply terminal cursor defaults");
      this.requestRender();
    }
  }
  // ==========================================================================
  // Lifecycle Methods
  // ==========================================================================
  /**
   * Open terminal in a parent element
   *
   * Initializes all components and starts rendering.
   * Requires a pre-loaded Ghostty instance passed to the constructor.
   */
  open(t) {
    if (this.isOpen)
      throw new Error("Terminal is already open");
    if (this.isDisposed)
      throw new Error("Terminal has been disposed");
    this.element = t, this.isOpen = !0, this.hostState = {
      element: t,
      attributes: new Map(
        [
          "tabindex",
          "contenteditable",
          "role",
          "aria-label",
          "aria-labelledby",
          "aria-multiline"
        ].map((e) => [e, t.getAttribute(e)])
      ),
      outline: t.style.outline,
      outlineOffset: t.style.outlineOffset,
      cursor: t.style.cursor
    };
    try {
      t.setAttribute("tabindex", "-1"), t.setAttribute("contenteditable", "false"), t.removeAttribute("role"), t.removeAttribute("aria-label"), t.removeAttribute("aria-labelledby"), t.removeAttribute("aria-multiline");
      const e = this.buildWasmConfig();
      this.wasmTerm = this.ghostty.createTerminal(this.cols, this.rows, e), this.canvas = document.createElement("canvas"), this.canvas.style.display = "block", this.canvas.style.cursor = "text", this.canvas.setAttribute("aria-hidden", "true"), t.appendChild(this.canvas), this.textarea = document.createElement("textarea"), this.textarea.setAttribute("autocorrect", "off"), this.textarea.setAttribute("autocapitalize", "off"), this.textarea.setAttribute("spellcheck", "false"), this.textarea.setAttribute("tabindex", "0");
      const s = this.hostState.attributes.get("aria-labelledby");
      s ? this.textarea.setAttribute("aria-labelledby", s) : this.textarea.setAttribute(
        "aria-label",
        this.hostState.attributes.get("aria-label") ?? "Terminal input"
      ), this.textarea.style.position = "absolute", this.textarea.style.left = "0", this.textarea.style.top = "0", this.textarea.style.width = "1px", this.textarea.style.height = "1px", this.textarea.style.padding = "0", this.textarea.style.border = "none", this.textarea.style.margin = "0", this.textarea.style.opacity = "0", this.textarea.style.clipPath = "inset(50%)", this.textarea.style.overflow = "hidden", this.textarea.style.whiteSpace = "nowrap", this.textarea.style.resize = "none", this.textarea.style.pointerEvents = "none", this.textarea.style.zIndex = "-10", t.appendChild(this.textarea);
      const r = () => this.focusInputTarget();
      t.addEventListener("focus", r), this.hostFocusListener = r;
      const n = () => this.updateFocusAppearance(), o = () => this.restoreHostOutline();
      this.textarea.addEventListener("focus", n), this.textarea.addEventListener("blur", o), this.inputFocusListener = n, this.inputBlurListener = o;
      const l = (m) => {
        m.button === 0 && (m.preventDefault(), this.focusInputTarget());
      };
      this.canvas.addEventListener("mousedown", l), this.canvasMouseDownListener = l;
      const a = (m) => {
        m.preventDefault(), this.focusInputTarget();
      };
      this.canvas.addEventListener("touchend", a), this.canvasTouchEndListener = a, this.renderer = new Ae(this.canvas, {
        fontSize: this.options.fontSize,
        fontFamily: this.options.fontFamily,
        fontLigatures: this.options.fontLigatures,
        theme: this.options.theme,
        requestRender: (m = !1) => this.requestRender(m),
        onDevicePixelRatioChange: () => {
          this.devicePixelRatioChanged = !0;
        }
      }), this.renderer.setRenderPaused(this.renderPaused), this.renderer.resize(this.cols, this.rows);
      const h = this.canvas, c = this.renderer, u = this.options.disableContextMenu, p = {
        hasMouseTracking: () => {
          var m;
          return ((m = this.wasmTerm) == null ? void 0 : m.hasMouseTracking()) ?? !1;
        },
        // Shift reserves the complete pointer gesture for local selection/scroll.
        shouldReportEvent: (m) => !m.shiftKey,
        shouldReportButton: (m) => !(u && m === 2),
        hasSgrMouseMode: () => {
          var m;
          return ((m = this.wasmTerm) == null ? void 0 : m.getMode(1006, !1)) ?? !0;
        },
        // SGR extended mode
        getCellDimensions: () => ({
          width: c.charWidth,
          height: c.charHeight
        }),
        getGridDimensions: () => ({ cols: this.cols, rows: this.rows }),
        getWheelOptions: () => this.options.wheelScroll,
        getCanvasOffset: () => {
          const m = h.getBoundingClientRect();
          return { left: m.left, top: m.top };
        }
      };
      this.inputHandler = new ct(
        this.ghostty,
        t,
        (m) => {
          var f;
          this.options.disableStdin || ((f = this.selectionManager) == null || f.clearSelection(), this.dataChannel.emit(m, "user"));
        },
        () => {
          this.bellEmitter.fire();
        },
        (m) => {
          this.keyEmitter.fire(m);
        },
        this.customKeyEventHandler,
        (m) => {
          var f;
          return ((f = this.wasmTerm) == null ? void 0 : f.getMode(m, !1)) ?? !1;
        },
        () => this.copySelection(),
        this.textarea,
        p,
        () => {
          var m, f;
          return {
            kittyFlags: ((m = this.wasmTerm) == null ? void 0 : m.getKittyKeyboardFlags()) ?? 0,
            modifyOtherKeysState2: ((f = this.wasmTerm) == null ? void 0 : f.hasModifyOtherKeysState2()) ?? !1
          };
        },
        this.options.resolveClipboardFilePaste
      ), this.selectionManager = new dt(
        this,
        this.renderer,
        this.wasmTerm,
        this.textarea,
        !u,
        (m) => {
          var f;
          return !(((f = this.wasmTerm) == null ? void 0 : f.hasMouseTracking()) ?? !1) || m.shiftKey;
        },
        () => this.focusInputTarget()
      ), this.renderer.setSelectionManager(this.selectionManager), this.selectionChangeDisposable = this.selectionManager.onSelectionChange(() => {
        this.selectionChangeEmitter.fire();
      }), this.linkDetector = new ue(this, () => this.clearLinkHoverState()), this.linkDetector.registerProvider(
        new pe(this, () => this.options.linkHandler)
      ), this.linkDetector.registerProvider(
        new ut(this, () => this.options.linkHandler)
      ), this.accessibilityManager = new Ue(
        this,
        this.textarea,
        this.linkDetector,
        t
      ), t.addEventListener("mousedown", this.handleMouseDown, { capture: !0 }), this.hostMouseDownListenerAttached = !0, t.addEventListener("mousemove", this.handleMouseMove), this.hostMouseMoveListenerAttached = !0, t.addEventListener("mouseleave", this.handleMouseLeave), this.hostMouseLeaveListenerAttached = !0, t.addEventListener("click", this.handleClick), this.hostClickListenerAttached = !0, document.addEventListener("mouseup", this.handleMouseUp), this.documentMouseUpListenerAttached = !0, t.addEventListener("wheel", this.handleWheel, { passive: !1, capture: !0 }), this.hostWheelListenerAttached = !0, this.requestRender(!0), this.options.focusOnOpen !== !1 && this.focus();
    } catch (e) {
      throw this.isOpen = !1, this.resetSynchronizedOutputTracking(), this.stopPresentationWork(!1), this.writeQueue.length = 0, this.cleanupComponents(), new Error(`Failed to open terminal: ${e}`);
    }
  }
  /**
   * Write data to terminal
   */
  write(t, e) {
    this.assertOpen(), this.options.convertEol && typeof t == "string" && (t = t.replace(/\n/g, `\r
`)), this.writeInternal(t, e);
  }
  /**
   * Internal write implementation (extracted from write())
   */
  writeInternal(t, e) {
    var m, f, g;
    const s = this.viewportY, r = this.wasmTerm.isAlternateScreen(), n = ((m = this.selectionManager) == null ? void 0 : m.captureWriteAnchors()) ?? null, o = s > 0 && !r, l = o ? this.getScrollbackLength() : 0, a = this.scrollAnimationFrame !== void 0 || this.scrollAnimationStartTime !== void 0, h = this.targetViewportY;
    this.parsedWrites++;
    const c = this.writeToWasm(t), u = this.wasmTerm.isAlternateScreen(), p = u !== r;
    if ((f = this.selectionManager) == null || f.reconcileWriteAnchors(n, p), p && this.resetViewport(), this.processTerminalEvents(this.wasmTerm.readEvents()), this.processTerminalResponses(), (g = this.linkDetector) == null || g.invalidateCache(), o && !u) {
      const b = this.getScrollbackLength(), S = Math.max(0, b - l), v = Math.max(
        0,
        Math.min(b, s + S)
      );
      v !== this.viewportY && (this.viewportY = v, this.scrollEmitter.fire(this.viewportY)), a && (this.targetViewportY = h === 0 ? 0 : Math.max(0, Math.min(b, h + S)), this.scrollAnimationStartViewportY = h === 0 && this.scrollAnimationStartViewportY > 0 ? this.scrollAnimationStartViewportY * (v / s) : Math.max(
        0,
        Math.min(b, this.scrollAnimationStartViewportY + S)
      ));
    } else this.viewportY !== 0 && this.scrollToBottom();
    this.requestRender(c), e && requestAnimationFrame(e);
  }
  /**
   * Write data with newline
   */
  writeln(t, e) {
    if (typeof t == "string")
      this.write(t + `\r
`, e);
    else {
      const s = new Uint8Array(t.length + 2);
      s.set(t), s[t.length] = 13, s[t.length + 1] = 10, this.write(s, e);
    }
  }
  /**
   * Paste text into terminal (triggers bracketed paste if supported)
   */
  paste(t) {
    this.assertOpen(), !this.options.disableStdin && this.dataChannel.emit(Ot(t, this.wasmTerm.hasBracketedPaste()), "user");
  }
  /**
   * Input data into terminal (as if typed by user)
   *
   * @param data - Data to input
   * @param wasUserInput - If true, triggers onData event (default: false for compat with some apps)
   */
  input(t, e = !1) {
    this.assertOpen(), !this.options.disableStdin && (e ? this.dataChannel.emit(t, "user") : this.write(t));
  }
  /**
   * Resize terminal
   */
  resize(t, e) {
    var s, r, n;
    if (this.assertOpen(), !(t === this.cols && e === this.rows)) {
      (s = this.selectionManager) == null || s.clearSelection(), this.cancelRenderLoop(), (r = this.retainedBufferExtraction) == null || r.invalidateAll();
      try {
        this.cols = t, this.rows = e, this.wasmTerm.resize(t, e), (n = this.retainedBufferSearch) == null || n.invalidateAll(), this.reconcileSynchronizedOutput(), this.resizeEmitter.fire({ cols: t, rows: e });
      } catch (o) {
        console.error("Terminal resize failed:", o);
      } finally {
        try {
          this.flushWriteQueue();
        } finally {
          this.requestRender(!0);
        }
      }
    }
  }
  /**
   * Clear terminal screen
   */
  clear() {
    var e, s;
    this.assertOpen(), (e = this.selectionManager) == null || e.clearSelection(), this.resetViewport(), (s = this.linkDetector) == null || s.invalidateCache();
    const t = this.writeToWasm("\x1B[3J\x1B[2J\x1B[H");
    this.requestRender(t);
  }
  /**
   * Reset terminal state
   */
  reset() {
    var r, n, o, l, a;
    this.assertOpen();
    const t = this.wasmTerm, e = this.buildWasmConfig(), s = this.ghostty.createTerminal(this.cols, this.rows, e);
    this.cancelRenderLoop(), (r = this.retainedBufferSearch) == null || r.dispose(), this.retainedBufferSearch = void 0, (n = this.retainedBufferExtraction) == null || n.dispose(), this.retainedBufferExtraction = void 0, this.resetSynchronizedOutputTracking(), (o = this.selectionManager) == null || o.clearSelection(), this.resetViewport(), (l = this.linkDetector) == null || l.invalidateCache(), this.wasmTerm = s, (a = this.selectionManager) == null || a.replaceTerminal(s), t.free(), this.renderPaused || this.renderer.clear(), this.currentTitle = "", this.requestRender(!0);
  }
  /**
   * Focus terminal input
   */
  focus() {
    if (this.isOpen && this.textarea) {
      this.focusInputTarget(), this.focusTimeout !== void 0 && window.clearTimeout(this.focusTimeout);
      const t = this.textarea;
      this.focusTimeout = window.setTimeout(() => {
        this.focusTimeout = void 0, this.isOpen && this.textarea === t && this.focusInputTarget();
      }, 0);
    }
  }
  /**
   * Blur terminal (remove focus)
   */
  blur() {
    var t;
    this.focusTimeout !== void 0 && (window.clearTimeout(this.focusTimeout), this.focusTimeout = void 0), this.isOpen && ((t = this.textarea) == null || t.blur());
  }
  /**
   * Load an addon
   */
  loadAddon(t) {
    t.activate(this), this.addons.push(t);
  }
  // ==========================================================================
  // Selection API (xterm.js compatible)
  // ==========================================================================
  /**
   * Get the selected text as a string
   */
  getSelection() {
    var t;
    return ((t = this.selectionManager) == null ? void 0 : t.getSelection()) || "";
  }
  /**
   * Check if there's an active selection
   */
  hasSelection() {
    var t;
    return ((t = this.selectionManager) == null ? void 0 : t.hasSelection()) || !1;
  }
  /**
   * Clear the current selection
   */
  clearSelection() {
    var t;
    (t = this.selectionManager) == null || t.clearSelection();
  }
  /**
   * Copy the current selection to clipboard
   * @returns true if there was text to copy, false otherwise
   */
  copySelection() {
    var t;
    return ((t = this.selectionManager) == null ? void 0 : t.copySelection()) || !1;
  }
  /**
   * Select all text in the terminal
   */
  selectAll() {
    var t;
    (t = this.selectionManager) == null || t.selectAll();
  }
  /**
   * Select text at specific column and row with length
   */
  select(t, e, s) {
    var r;
    (r = this.selectionManager) == null || r.select(t, e, s);
  }
  /**
   * Select entire lines from start to end
   */
  selectLines(t, e) {
    var s;
    (s = this.selectionManager) == null || s.selectLines(t, e);
  }
  /**
   * Get selection position as buffer range
   */
  /**
   * Get the current viewport Y position.
   *
   * This is the number of lines scrolled back from the bottom of the
   * scrollback buffer. It may be fractional during smooth scrolling.
   */
  getViewportY() {
    return this.viewportY;
  }
  getSelectionPosition() {
    var t;
    return (t = this.selectionManager) == null ? void 0 : t.getSelectionPosition();
  }
  /**
   * Search literal text in this terminal's retained normal buffer.
   * Queries larger than 64 KiB of UTF-8 are rejected.
   */
  searchRetainedBuffer(t, e) {
    return this.assertOpen(), this.retainedBufferSearch || (this.retainedBufferSearch = new $e(
      () => this.wasmTerm,
      () => {
        var s;
        return (s = this.renderer) == null ? void 0 : s.clearRetainedRangeHighlight();
      }
    )), this.retainedBufferSearch.search(t, e);
  }
  /** Cancel the current retained-buffer query and release its result state. */
  cancelRetainedBufferSearch() {
    var t;
    (t = this.retainedBufferSearch) == null || t.cancel();
  }
  /** Reveal an authenticated current normal-buffer range without changing selection. */
  revealRetainedBufferRange(t) {
    var s, r;
    if (this.isDisposed || !this.isOpen || (s = this.wasmTerm) != null && s.isAlternateScreen()) return !1;
    const e = (r = this.retainedBufferSearch) == null ? void 0 : r.resolveRange(t);
    return e ? (this.scrollToLine(Math.max(0, this.getScrollbackLength() - e.start.row)), !0) : !1;
  }
  /** Paint one current search range. The returned handle owns only this highlight. */
  highlightRetainedBufferRange(t, e) {
    if (this.isDisposed || !this.isOpen || !this.renderer) return;
    const s = this.retainedBufferSearch;
    if (s != null && s.resolveRange(t)) {
      if (!Number.isFinite(e.borderWidth) || e.borderWidth < 0)
        throw new Error("Invalid highlight border width");
      return this.renderer.showRetainedRangeHighlight(() => s.resolveRange(t), e);
    }
  }
  /** Extract a current, same-terminal search range as exact plain text. */
  extractRetainedBufferText(t) {
    var e;
    return (e = this.retainedBufferSearch) == null ? void 0 : e.extractCurrent(t);
  }
  /** Capture an opaque, parser-owned boundary at the active cursor. */
  captureRetainedBufferBoundary() {
    this.assertOpen();
    const t = this.wasmTerm.captureRetainedBufferBoundary();
    if (!t)
      throw new Nt(
        "failed",
        "Unable to capture retained-buffer boundary"
      );
    return t;
  }
  /** Extract exact plain text for the half-open same-screen range [start,end). */
  extractRetainedBufferRange(t, e, s = {}) {
    return this.assertOpen(), this.retainedBufferExtraction || (this.retainedBufferExtraction = new Me(() => this.wasmTerm)), this.retainedBufferExtraction.extract(t, e, s);
  }
  /** Cancel the current exact retained-range extraction. */
  cancelRetainedBufferExtraction() {
    var t;
    (t = this.retainedBufferExtraction) == null || t.cancel();
  }
  // ==========================================================================
  // Phase 1: Custom Event Handlers
  // ==========================================================================
  /**
   * Attach a custom keyboard event handler
   * Returns true to prevent default handling
   */
  attachCustomKeyEventHandler(t) {
    this.customKeyEventHandler = t, this.inputHandler && this.inputHandler.setCustomKeyEventHandler(t);
  }
  /**
   * Attach a custom wheel event handler (Phase 2)
   * Returns true to prevent default handling
   */
  attachCustomWheelEventHandler(t) {
    this.customWheelEventHandler = t;
  }
  // ==========================================================================
  // Link Detection Methods
  // ==========================================================================
  /**
   * Register a custom link provider
   * Custom providers take precedence over built-ins. When multiple custom
   * providers are registered, the most recently registered provider runs first.
   *
   * @example
   * ```typescript
   * term.registerLinkProvider({
   *   provideLinks(y, callback) {
   *     // Detect URLs, file paths, etc.
   *     callback(detectedLinks);
   *   }
   * });
   * ```
   */
  registerLinkProvider(t) {
    if (!this.linkDetector)
      throw new Error("Terminal must be opened before registering link providers");
    this.linkDetector.registerProvider(t, !0), this.requestRender(!0);
  }
  // ==========================================================================
  // Phase 2: Scrolling Methods
  // ==========================================================================
  /**
   * Scroll viewport by a number of lines
   * @param amount Number of lines to scroll (positive = down, negative = up)
   */
  scrollLines(t) {
    if (!this.wasmTerm)
      throw new Error("Terminal not open");
    this.cancelSmoothScroll();
    const e = this.getScrollbackLength(), r = Math.max(0, Math.min(e, this.viewportY - t));
    r !== this.viewportY && (this.viewportY = r, this.scrollAnimationStartViewportY = r, this.targetViewportY = r, this.scrollEmitter.fire(this.viewportY), e > 0 && this.showScrollbar(), this.requestRender());
  }
  /**
   * Scroll viewport by a number of pages
   * @param amount Number of pages to scroll (positive = down, negative = up)
   */
  scrollPages(t) {
    this.scrollLines(t * this.rows);
  }
  /**
   * Scroll viewport to the top of the scrollback buffer
   */
  scrollToTop() {
    this.cancelSmoothScroll();
    const t = this.getScrollbackLength();
    t > 0 && this.viewportY !== t && (this.viewportY = t, this.scrollAnimationStartViewportY = t, this.targetViewportY = t, this.scrollEmitter.fire(this.viewportY), this.showScrollbar(), this.requestRender());
  }
  /**
   * Scroll viewport to the bottom (current output)
   */
  scrollToBottom() {
    this.cancelSmoothScroll(), this.viewportY !== 0 && (this.viewportY = 0, this.scrollAnimationStartViewportY = 0, this.targetViewportY = 0, this.scrollEmitter.fire(this.viewportY), this.getScrollbackLength() > 0 && this.showScrollbar(), this.requestRender());
  }
  /**
   * Scroll viewport to a specific line in the buffer
   * @param line Line number (0 = top of scrollback, scrollbackLength = bottom)
   */
  scrollToLine(t) {
    this.cancelSmoothScroll();
    const e = this.getScrollbackLength(), s = Math.max(0, Math.min(e, t));
    s !== this.viewportY && (this.viewportY = s, this.scrollAnimationStartViewportY = s, this.targetViewportY = s, this.scrollEmitter.fire(this.viewportY), e > 0 && this.showScrollbar(), this.requestRender());
  }
  /**
   * Smoothly scroll to a target viewport position
   * @param targetY Target viewport Y position (in lines, can be fractional)
   */
  smoothScrollTo(t) {
    if (!this.wasmTerm || !Number.isFinite(t)) return;
    const e = this.getScrollbackLength(), r = Math.max(0, Math.min(e, t)), n = this.options.smoothScrollDuration;
    if (n === 0) {
      const o = this.viewportY !== r;
      if (this.cancelSmoothScroll(), this.viewportY = r, this.targetViewportY = r, this.scrollAnimationStartViewportY = r, !o) return;
      this.scrollEmitter.fire(Math.floor(r)), e > 0 && this.showScrollbar(), this.requestRender();
      return;
    }
    if (r === this.viewportY) {
      this.cancelSmoothScroll();
      return;
    }
    this.targetViewportY = r, this.scrollAnimationFrame === void 0 && (this.scrollAnimationStartViewportY = this.viewportY, this.scrollAnimationStartTime = performance.now(), this.animateScroll(
      this.scrollAnimationStartTime + Math.min(1, n),
      this.scrollAnimationGeneration
    ));
  }
  /**
   * Animation loop for smooth scrolling
   * Uses elapsed time so every finite duration reaches its target exactly.
   */
  animateScroll(t, e) {
    if (e !== this.scrollAnimationGeneration || (this.scrollAnimationFrame = void 0, !this.wasmTerm || this.scrollAnimationStartTime === void 0)) return;
    const s = this.options.smoothScrollDuration, r = Math.max(0, t - this.scrollAnimationStartTime), n = s === 0 || t >= this.scrollAnimationStartTime + s, l = 1 - (1 - (n ? 1 : Math.min(1, r / s))) ** 3;
    if (this.viewportY = this.scrollAnimationStartViewportY + (this.targetViewportY - this.scrollAnimationStartViewportY) * l, n) {
      this.finishSmoothScroll();
      return;
    }
    const a = Math.floor(this.viewportY);
    this.scrollEmitter.fire(a), this.getScrollbackLength() > 0 && this.showScrollbar(), this.requestRender(), !(e !== this.scrollAnimationGeneration || this.scrollAnimationStartTime === void 0) && this.scheduleScrollAnimationFrame();
  }
  scheduleScrollAnimationFrame() {
    const t = this.scrollAnimationGeneration;
    this.scrollAnimationFrame = requestAnimationFrame(
      (e) => this.animateScroll(e, t)
    );
  }
  /** Snap an active animation to its exact destination. */
  finishSmoothScroll() {
    this.scrollAnimationGeneration++, this.scrollAnimationFrame !== void 0 && (cancelAnimationFrame(this.scrollAnimationFrame), this.scrollAnimationFrame = void 0), this.viewportY = this.targetViewportY, this.scrollAnimationStartViewportY = this.viewportY, this.scrollAnimationStartTime = void 0, this.scrollEmitter.fire(Math.floor(this.viewportY)), this.getScrollbackLength() > 0 && this.showScrollbar(), this.requestRender();
  }
  /** Revoke animation callbacks and synchronize their target to the viewport. */
  cancelSmoothScroll() {
    this.scrollAnimationGeneration++, this.scrollAnimationFrame !== void 0 && (cancelAnimationFrame(this.scrollAnimationFrame), this.scrollAnimationFrame = void 0), this.scrollAnimationStartTime = void 0, this.scrollAnimationStartViewportY = this.viewportY, this.targetViewportY = this.viewportY;
  }
  /** Return the viewport to current output and revoke any in-flight scrolling. */
  resetViewport() {
    const t = this.viewportY !== 0 || this.targetViewportY !== 0;
    this.cancelSmoothScroll(), this.viewportY = 0, this.scrollAnimationStartViewportY = 0, this.targetViewportY = 0, this.scrollbarHideTimeout !== void 0 && (window.clearTimeout(this.scrollbarHideTimeout), this.scrollbarHideTimeout = void 0), this.scrollbarVisible = !1, this.scrollbarOpacity = 0, t && this.scrollEmitter.fire(0);
  }
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  /**
   * Dispose terminal and clean up resources
   */
  dispose() {
    var t, e, s;
    if (!this.isDisposed) {
      this.isDisposed = !0, this.isOpen = !1, this.resetSynchronizedOutputTracking(), this.stopPresentationWork(!1), this.writeQueue.length = 0, (t = this.retainedBufferSearch) == null || t.dispose(), this.retainedBufferSearch = void 0, (e = this.retainedBufferExtraction) == null || e.dispose(), this.retainedBufferExtraction = void 0;
      for (const r of this.addons)
        r.dispose();
      this.addons = [], this.cleanupComponents(), this.ghostty = void 0, this.dataChannel.dispose(), this.resizeEmitter.dispose(), this.bellEmitter.dispose(), this.selectionChangeEmitter.dispose(), this.keyEmitter.dispose(), this.titleChangeEmitter.dispose(), this.scrollEmitter.dispose(), this.renderEmitter.dispose(), this.cursorMoveEmitter.dispose(), this.terminalEventEmitter.dispose(), (s = this.buffer) == null || s._dispose();
    }
  }
  /** Request one coalesced presentation frame. */
  requestRender(t = !1) {
    this.isDisposed || (this.renderRequests++, t && (this.forceFullRender = !0), !this.synchronizedOutputActive && !this.renderPaused && this.isOpen && this.animationFrameId === void 0 && this.startRenderLoop());
  }
  /** Pause or resume presentation without pausing terminal parsing. */
  setRenderPaused(t) {
    var e;
    if (!(this.isDisposed || this.renderPaused === t)) {
      if (this.renderPaused = t, !t) {
        (e = this.renderer) == null || e.setRenderPaused(!1), this.requestRender(!0);
        return;
      }
      this.stopPresentationWork(!0);
    }
  }
  /** Make a blinking cursor visible now and restart its idle cadence. */
  resetCursorBlink() {
    var t;
    this.isDisposed || (t = this.renderer) == null || t.resetCursorBlink();
  }
  /** Inspect parser and presentation activity for diagnostics. */
  getRenderStats() {
    var e, s, r;
    const t = ((s = (e = this.renderer) == null ? void 0 : e.getFrameStats) == null ? void 0 : s.call(e)) ?? {
      renderedRows: 0,
      materializedRows: 0,
      materializedCells: 0,
      textRuns: 0,
      textMeasurements: 0,
      shapedRuns: 0,
      shapedCells: 0,
      maxRunCells: 0
    };
    return {
      parsedWrites: this.parsedWrites,
      renderRequests: this.renderRequests,
      renderFrames: this.renderFrames,
      fullRenderFrames: this.fullRenderFrames,
      paused: this.renderPaused,
      pendingFrame: this.animationFrameId !== void 0,
      cursorVisible: ((r = this.renderer) == null ? void 0 : r.getCursorVisible()) ?? !1,
      synchronizedOutput: this.synchronizedOutputActive,
      synchronizedOutputRecoveries: this.synchronizedOutputRecoveries,
      lastFrame: t
    };
  }
  // ==========================================================================
  // Private Methods
  // ==========================================================================
  /**
   * Reconcile the Canvas scheduler with Ghostty's parser-owned mode.
   *
   * The generation distinguishes repeated DECSET 2026 actions so each one
   * restarts the same one-second safety timer as native Ghostty. A generation
   * that begins and ends within one write still forces one complete frame.
   */
  reconcileSynchronizedOutput() {
    if (!this.wasmTerm) return !1;
    const t = this.wasmTerm.isSynchronizedOutput(), e = this.wasmTerm.getSynchronizedOutputGeneration(), s = e !== this.synchronizedOutputGeneration;
    if (this.synchronizedOutputGeneration = e, t)
      return this.synchronizedOutputActive || (this.synchronizedOutputActive = !0, this.cancelRenderLoop()), s && this.armSynchronizedOutputTimeout(e), !1;
    const r = this.synchronizedOutputActive || s;
    return this.synchronizedOutputActive = !1, this.clearSynchronizedOutputTimeout(), r;
  }
  /** Parse once in Ghostty, then immediately reconcile its presentation mode. */
  writeToWasm(t) {
    var r, n, o;
    const e = this.wasmTerm.getPrimaryScreenGeneration(), s = this.wasmTerm.getAlternateScreenGeneration();
    return this.wasmTerm.write(t), this.wasmTerm.getPrimaryScreenGeneration() !== e && ((r = this.retainedBufferSearch) == null || r.noteWrite(), (n = this.retainedBufferExtraction) == null || n.noteWrite("normal")), this.wasmTerm.getAlternateScreenGeneration() !== s && ((o = this.retainedBufferExtraction) == null || o.noteWrite("alternate")), this.reconcileSynchronizedOutput();
  }
  /** Restart the native-compatible abandonment timeout for one enable action. */
  armSynchronizedOutputTimeout(t) {
    this.clearSynchronizedOutputTimeout(), this.synchronizedOutputTimeout = window.setTimeout(() => {
      this.synchronizedOutputTimeout = void 0, !(this.isDisposed || !this.isOpen || !this.wasmTerm) && (this.wasmTerm.getSynchronizedOutputGeneration() !== t || !this.wasmTerm.isSynchronizedOutput() || (this.wasmTerm.resetSynchronizedOutput(), this.synchronizedOutputActive = !1, this.synchronizedOutputRecoveries++, this.requestRender(!0)));
    }, qe);
  }
  clearSynchronizedOutputTimeout() {
    this.synchronizedOutputTimeout !== void 0 && (window.clearTimeout(this.synchronizedOutputTimeout), this.synchronizedOutputTimeout = void 0);
  }
  /** Release lifecycle state without carrying a timer across terminal owners. */
  resetSynchronizedOutputTracking() {
    this.clearSynchronizedOutputTimeout(), this.synchronizedOutputActive = !1, this.synchronizedOutputGeneration = 0;
  }
  /**
   * Cancel the render loop
   */
  cancelRenderLoop() {
    this.animationFrameId !== void 0 && (cancelAnimationFrame(this.animationFrameId), this.animationFrameId = void 0);
  }
  /** Stop transient presentation work owned by both pause and disposal. */
  stopPresentationWork(t) {
    var r, n;
    this.cancelRenderLoop(), (r = this.renderer) == null || r.setRenderPaused(!0);
    const e = this.scrollAnimationFrame !== void 0 || this.scrollAnimationStartTime !== void 0, s = this.targetViewportY;
    if (this.cancelSmoothScroll(), t && e) {
      const o = Math.max(0, Math.floor(s));
      this.viewportY = o, this.scrollAnimationStartViewportY = o, this.targetViewportY = o, this.scrollEmitter.fire(o);
    }
    this.scrollbarHideTimeout !== void 0 && (window.clearTimeout(this.scrollbarHideTimeout), this.scrollbarHideTimeout = void 0), this.mouseMoveThrottleTimeout !== void 0 && (window.clearTimeout(this.mouseMoveThrottleTimeout), this.mouseMoveThrottleTimeout = void 0), this.pendingMouseMove = void 0, (n = this.selectionManager) == null || n.stopAutoScroll(), this.scrollbarVisible = !1, this.scrollbarOpacity = 0;
  }
  /**
   * Flush any writes that were queued during resize
   */
  flushWriteQueue() {
    for (; this.writeQueue.length > 0; ) {
      const t = this.writeQueue.shift();
      this.writeToWasm(t);
    }
  }
  /** Schedule one coalesced presentation frame. */
  startRenderLoop() {
    this.animationFrameId !== void 0 || this.renderPaused || this.synchronizedOutputActive || this.isDisposed || !this.isOpen || (this.animationFrameId = requestAnimationFrame(() => {
      var o, l;
      if (this.animationFrameId = void 0, this.isDisposed || !this.isOpen || this.renderPaused || this.synchronizedOutputActive)
        return;
      const t = this.forceFullRender;
      this.forceFullRender = !1;
      const e = this.renderer.render(
        this.wasmTerm,
        t,
        this.viewportY,
        this.rendererScrollbackProvider,
        this.scrollbarOpacity
      );
      this.renderFrames++, t && this.fullRenderFrames++;
      const s = this.renderer.getRenderedRowRanges(), r = this.wasmTerm.isAlternateScreen(), n = e.x !== this.lastCursorX || e.y !== this.lastCursorY || r !== this.lastCursorAlternateScreen || this.cursorScreenGeneration !== this.lastPresentedCursorScreenGeneration;
      this.lastCursorX = e.x, this.lastCursorY = e.y, this.lastCursorAlternateScreen = r, this.lastPresentedCursorScreenGeneration = this.cursorScreenGeneration, (o = this.accessibilityManager) == null || o.updateFrame(s, e), n && this.cursorMoveEmitter.fire();
      for (const a of s)
        this.renderEmitter.fire(a);
      if (this.devicePixelRatioChanged) {
        this.devicePixelRatioChanged = !1;
        for (const a of [...this.addons]) {
          if (this.isDisposed || !this.isOpen) break;
          try {
            (l = a.onDevicePixelRatioChange) == null || l.call(a);
          } catch (h) {
            console.error("Addon DPR-change handler failed:", h);
          }
        }
      }
    }));
  }
  /**
   * Get a line from native WASM scrollback buffer
   * Implements IScrollbackProvider
   */
  getScrollbackLine(t) {
    return this.wasmTerm ? this.wasmTerm.getScrollbackLine(t) : null;
  }
  /**
   * Get scrollback length from native WASM
   * Implements IScrollbackProvider
   */
  getScrollbackLength() {
    return this.wasmTerm ? this.wasmTerm.getScrollbackLength() : 0;
  }
  /**
   * Get the effective byte limit configured on Ghostty's native page list.
   * Returns 0 for unlimited scrollback. The terminal must be open.
   */
  getScrollbackByteLimit() {
    return this.assertOpen(), this.wasmTerm.getScrollbackByteLimit();
  }
  /**
   * Clean up components (called on dispose or error)
   */
  cleanupComponents() {
    var t, e;
    if ((t = this.accessibilityManager) == null || t.dispose(), this.accessibilityManager = void 0, (e = this.selectionChangeDisposable) == null || e.dispose(), this.selectionChangeDisposable = void 0, this.selectionManager && (this.selectionManager.dispose(), this.selectionManager = void 0), this.inputHandler && (this.inputHandler.dispose(), this.inputHandler = void 0), this.canvas && this.canvasMouseDownListener && this.canvas.removeEventListener("mousedown", this.canvasMouseDownListener), this.canvasMouseDownListener = void 0, this.canvas && this.canvasTouchEndListener && this.canvas.removeEventListener("touchend", this.canvasTouchEndListener), this.canvasTouchEndListener = void 0, this.textarea && this.inputFocusListener && this.textarea.removeEventListener("focus", this.inputFocusListener), this.inputFocusListener = void 0, this.textarea && this.inputBlurListener && this.textarea.removeEventListener("blur", this.inputBlurListener), this.inputBlurListener = void 0, this.renderer && (this.renderer.dispose(), this.renderer = void 0), this.canvas && (this.canvas.remove(), this.canvas = void 0), this.textarea && (this.textarea.remove(), this.textarea = void 0), this.element && (this.hostFocusListener && this.element.removeEventListener("focus", this.hostFocusListener), this.hostWheelListenerAttached && this.element.removeEventListener("wheel", this.handleWheel, { capture: !0 }), this.hostMouseDownListenerAttached && this.element.removeEventListener("mousedown", this.handleMouseDown, { capture: !0 }), this.hostMouseMoveListenerAttached && this.element.removeEventListener("mousemove", this.handleMouseMove), this.hostMouseLeaveListenerAttached && this.element.removeEventListener("mouseleave", this.handleMouseLeave), this.hostClickListenerAttached && this.element.removeEventListener("click", this.handleClick)), this.hostFocusListener = void 0, this.hostWheelListenerAttached = !1, this.hostMouseDownListenerAttached = !1, this.hostMouseMoveListenerAttached = !1, this.hostMouseLeaveListenerAttached = !1, this.hostClickListenerAttached = !1, this.documentMouseUpListenerAttached && typeof document < "u" && document.removeEventListener("mouseup", this.handleMouseUp), this.documentMouseUpListenerAttached = !1, this.focusTimeout !== void 0 && (window.clearTimeout(this.focusTimeout), this.focusTimeout = void 0), this.scrollbarHideTimeout && (window.clearTimeout(this.scrollbarHideTimeout), this.scrollbarHideTimeout = void 0), this.linkDetector && (this.linkDetector.dispose(), this.linkDetector = void 0), this.wasmTerm && (this.wasmTerm.free(), this.wasmTerm = void 0), this.hostState) {
      for (const [s, r] of this.hostState.attributes)
        r === null ? this.hostState.element.removeAttribute(s) : this.hostState.element.setAttribute(s, r);
      this.restoreHostOutline(), this.hostState.element.style.cursor = this.hostState.cursor, this.hostState = void 0;
    }
    this.element = void 0, this.textarea = void 0;
  }
  /**
   * Assert terminal is open (throw if not)
   */
  assertOpen() {
    if (this.isDisposed)
      throw new Error("Terminal has been disposed");
    if (!this.isOpen)
      throw new Error("Terminal must be opened before use. Call terminal.open(parent) first.");
  }
  /**
   * Process mouse move for link detection (internal, called by throttled handler)
   */
  processMouseMove(t, e) {
    if (!this.canvas || !this.renderer || !this.linkDetector || !this.wasmTerm) return;
    if (e === void 0)
      this.synchronizeLinkHandlerPolicy(), e = ++this.linkHoverRequestSerial;
    else if (e !== this.linkHoverRequestSerial)
      return;
    const s = this.getLinkBufferPosition(t);
    if (!s) return;
    const { col: r, viewportRow: n, bufferRow: o } = s;
    this.currentLinkHoverRequest = { requestSerial: e, col: r, row: o };
    let l = 0, a = null;
    const h = this.getViewportY(), c = Math.max(0, Math.floor(h));
    if (c > 0) {
      const f = this.wasmTerm.getScrollbackLength();
      if (n < c) {
        const g = f - c + n;
        a = this.wasmTerm.getScrollbackLine(g);
      } else {
        const g = n - c;
        a = this.wasmTerm.getLine(g);
      }
    } else
      a = this.wasmTerm.getLine(n);
    a && r >= 0 && r < a.length && (l = a[r].hyperlink_id);
    const u = this.renderer.hoveredHyperlinkId || 0;
    l !== u && this.renderer.setHoveredHyperlinkId(l);
    const p = this.linkDetector, m = p.getGeneration();
    p.getLinkAt(r, o).then((f) => {
      var S, v, x, P;
      const g = this.getLinkBufferPosition(t), b = this.currentLinkHoverRequest;
      if (!(this.isDisposed || !this.isOpen || this.linkDetector !== p || !p.isGenerationCurrent(m) || e !== this.linkHoverRequestSerial || (b == null ? void 0 : b.requestSerial) !== e || b.col !== r || b.row !== o || (g == null ? void 0 : g.col) !== r || (g == null ? void 0 : g.bufferRow) !== o) && f !== this.currentHoveredLink) {
        (v = (S = this.currentHoveredLink) == null ? void 0 : S.hover) == null || v.call(S, !1), this.currentHoveredLink = f, (x = f == null ? void 0 : f.hover) == null || x.call(f, !0);
        const E = f ? "pointer" : "text";
        if (this.element && (this.element.style.cursor = E), this.canvas && (this.canvas.style.cursor = E), this.renderer)
          if (f) {
            const k = ((P = this.wasmTerm) == null ? void 0 : P.getScrollbackLength()) || 0, z = this.getViewportY(), $ = Math.max(0, Math.floor(z)), Y = f.range.start.y - k + $, U = f.range.end.y - k + $;
            Y < this.rows && U >= 0 ? this.renderer.setHoveredLinkRange({
              startX: f.range.start.x,
              startY: Math.max(0, Y),
              endX: f.range.end.x,
              endY: Math.min(this.rows - 1, U)
            }) : this.renderer.setHoveredLinkRange(null);
          } else
            this.renderer.setHoveredLinkRange(null);
      }
    }).catch((f) => {
      console.warn("Link detection error:", f);
    });
  }
  /** Map a pointer event to the absolute buffer cell currently under it. */
  getLinkBufferPosition(t) {
    if (!this.canvas || !this.renderer || !this.wasmTerm) return;
    const e = this.canvas.getBoundingClientRect(), s = Math.floor((t.clientX - e.left) / this.renderer.charWidth), r = Math.floor((t.clientY - e.top) / this.renderer.charHeight), n = this.wasmTerm.getScrollbackLength(), o = Math.max(0, Math.floor(this.getViewportY()));
    let l;
    return o > 0 && r < o ? l = n - o + r : o > 0 ? l = n + r - o : l = n + r, { col: s, viewportRow: r, bufferRow: l };
  }
  /** Revoke pending hover work and remove every link-owned visual state. */
  clearLinkHoverState() {
    var e, s, r;
    this.linkHoverRequestSerial++, this.currentLinkHoverRequest = void 0, this.pendingMouseMove = void 0, (e = this.renderer) == null || e.setHoveredHyperlinkId(0), (s = this.renderer) == null || s.setHoveredLinkRange(null);
    const t = this.currentHoveredLink;
    this.currentHoveredLink = void 0;
    try {
      (r = t == null ? void 0 : t.hover) == null || r.call(t, !1);
    } catch (n) {
      console.warn("Link hover cleanup error:", n);
    }
    this.element && (this.element.style.cursor = "text"), this.canvas && (this.canvas.style.cursor = "text");
  }
  /**
   * Process scrollbar drag movement
   */
  processScrollbarDrag(t) {
    if (!this.canvas || !this.renderer || !this.wasmTerm || this.scrollbarDragStart === null)
      return;
    const e = this.wasmTerm.getScrollbackLength();
    if (e === 0) return;
    const s = this.canvas.getBoundingClientRect(), n = t.clientY - s.top - this.scrollbarDragStart, a = s.height - 4 * 2, h = this.rows, c = e + h, u = Math.max(20, h / c * a), p = -n / (a - u), m = Math.round(p * e), f = this.scrollbarDragStartViewportY + m;
    this.scrollToLine(Math.max(0, Math.min(e, f)));
  }
  /**
   * Show scrollbar with fade-in and schedule auto-hide
   */
  showScrollbar() {
    this.renderPaused || (this.scrollbarHideTimeout && (window.clearTimeout(this.scrollbarHideTimeout), this.scrollbarHideTimeout = void 0), this.scrollbarVisible ? this.scrollbarOpacity = 1 : (this.scrollbarVisible = !0, this.scrollbarOpacity = 0, this.fadeInScrollbar()), this.isDraggingScrollbar || (this.scrollbarHideTimeout = window.setTimeout(() => {
      this.hideScrollbar();
    }, this.SCROLLBAR_HIDE_DELAY_MS)));
  }
  /**
   * Hide scrollbar with fade-out
   */
  hideScrollbar() {
    this.scrollbarHideTimeout && (window.clearTimeout(this.scrollbarHideTimeout), this.scrollbarHideTimeout = void 0), this.scrollbarVisible && this.fadeOutScrollbar();
  }
  /**
   * Fade in scrollbar
   */
  fadeInScrollbar() {
    const t = Date.now(), e = () => {
      if (this.isDisposed || this.renderPaused) return;
      const s = Date.now() - t, r = Math.min(s / this.SCROLLBAR_FADE_DURATION_MS, 1);
      this.scrollbarOpacity = r, this.requestRender(), r < 1 && requestAnimationFrame(e);
    };
    e();
  }
  /**
   * Fade out scrollbar
   */
  fadeOutScrollbar() {
    const t = Date.now(), e = this.scrollbarOpacity, s = () => {
      if (this.isDisposed || this.renderPaused) return;
      const r = Date.now() - t, n = Math.min(r / this.SCROLLBAR_FADE_DURATION_MS, 1);
      this.scrollbarOpacity = e * (1 - n);
      const o = n >= 1;
      o && (this.scrollbarVisible = !1, this.scrollbarOpacity = 0), this.requestRender(o), o || requestAnimationFrame(s);
    };
    s();
  }
  /**
   * Process any pending terminal responses and emit them via onData.
   *
   * This handles escape sequences that require the terminal to send a response
   * back to the PTY, such as:
   * - DSR 6 (cursor position): Shell sends \x1b[6n, terminal responds with \x1b[row;colR
   * - DSR 5 (operating status): Shell sends \x1b[5n, terminal responds with \x1b[0n
   *
   * Without this, shells like nushell that rely on cursor position queries
   * will hang waiting for a response that never comes.
   *
   * Note: We loop to read all pending responses, not just one. This is important
   * when multiple queries are processed in a single write() call (e.g., when
   * buffered data is written all at once during terminal initialization).
   */
  processTerminalResponses() {
    var t;
    if (this.wasmTerm)
      for (; ; ) {
        const e = (t = this.wasmTerm) == null ? void 0 : t.readResponse();
        if (e == null) break;
        this.dataChannel.emit(e, "terminal-response");
      }
  }
  /**
   * Emit typed parser events and derive legacy title/bell compatibility events.
   */
  processTerminalEvents(t) {
    let e = !1;
    for (const s of t) {
      if (s.type === "buffer-change") {
        this.cursorScreenGeneration++;
        const r = s.active === "alternate" ? this.buffer.alternate : this.buffer.normal;
        this.buffer._fireBufferChange(r);
        continue;
      }
      this.terminalEventEmitter.fire(s), s.type === "bell" ? e = !0 : s.type === "title" && s.title !== this.currentTitle && (this.currentTitle = s.title, this.titleChangeEmitter.fire(s.title));
    }
    e && this.bellEmitter.fire();
  }
  /** Resolve semantic provenance against the current retained Ghostty screen. */
  resolveEventProvenance(t) {
    if (this.isDisposed || !this.wasmTerm) return null;
    const e = this.wasmTerm.resolveEventBoundary(t);
    return e === null ? null : { screen: t.screen, ...e };
  }
  // ============================================================================
  // Terminal Modes
  // ============================================================================
  /**
   * Query terminal mode state
   *
   * @param mode Mode number (e.g., 2004 for bracketed paste)
   * @param isAnsi True for ANSI modes, false for DEC modes (default: false)
   * @returns true if mode is enabled
   */
  getMode(t, e = !1) {
    return this.assertOpen(), this.wasmTerm.getMode(t, e);
  }
  /**
   * Check if bracketed paste mode is enabled
   */
  hasBracketedPaste() {
    return this.assertOpen(), this.wasmTerm.hasBracketedPaste();
  }
  /**
   * Check if focus event reporting is enabled
   */
  hasFocusEvents() {
    return this.assertOpen(), this.wasmTerm.hasFocusEvents();
  }
  /**
   * Check if mouse tracking is enabled
   */
  hasMouseTracking() {
    return this.assertOpen(), this.wasmTerm.hasMouseTracking();
  }
}
let et = null, G = null, at = null;
async function Ke(i = {}) {
  const t = i.wasmUrl === void 0 ? null : String(i.wasmUrl);
  if (G) {
    if (t !== null && t !== at)
      throw new Error(
        "ghostty-web is already initializing or initialized with a different WASM URL."
      );
    et = await G;
    return;
  }
  at = t ?? Mt;
  const e = tt.load(i.wasmUrl);
  G = e;
  try {
    et = await e;
  } catch (s) {
    throw G === e && (G = null, at = null), s;
  }
}
function Qe() {
  if (!et)
    throw new Error(
      `ghostty-web not initialized. Call init() before creating Terminal instances.
Example:
  import { init, Terminal } from "ghostty-web";
  await init();
  const term = new Terminal();

For tests, pass a Ghostty instance directly:
  import { Ghostty, Terminal } from "ghostty-web";
  const ghostty = await Ghostty.load();
  const term = new Terminal({ ghostty });`
    );
  return et;
}
export {
  Ae as CanvasRenderer,
  L as CellFlags,
  K as DirtyState,
  I as EventEmitter,
  Ze as FitAddon,
  tt as Ghostty,
  ht as GhosttyTerminal,
  ct as InputHandler,
  d as Key,
  lt as KeyAction,
  ie as KeyEncoder,
  j as KeyEncoderOption,
  ue as LinkDetector,
  H as Mods,
  pe as OSC8LinkProvider,
  Nt as RetainedBufferExtractionError,
  dt as SelectionManager,
  je as Terminal,
  ut as UrlRegexProvider,
  Qe as getGhostty,
  Ke as init
};
