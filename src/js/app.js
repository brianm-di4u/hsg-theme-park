// App-level state shared by the UI modules (not part of the saved sim state), storage and messages.
export const G = {
  S: null, scene: 'title', paused: true, speed: 1,
  tool: 'inspect', placeType: null, listing: null, rot: 0, drag: null, sel: null,
  panel: null, panelArg: null, helpTab: 'basics', histEra: 'all', cursor: null, follow: false,
  dirty: true, trans: 0, lastMsg: 0, prevScene: 'title', confirm: null, testRun: null,
  settings: { sound: true, vol: 0.4, reduced: null, text: 1, grid: false },
  progress: { stars: {}, cards: [], best: {} },
  storageOk: true,
  hooks: {},  // filled by main.js: refresh(), redraw()
};

// localStorage wrapped in try/catch with an in-memory fallback (storage can be blocked).
const mem = new Map();
export const store = {
  get(k) {
    try { const v = localStorage.getItem(k); return v == null ? (mem.has(k) ? mem.get(k) : null) : v; }
    catch (e) { G.storageOk = false; return mem.has(k) ? mem.get(k) : null; }
  },
  set(k, v) {
    mem.set(k, v);
    try { localStorage.setItem(k, v); return true; } catch (e) { G.storageOk = false; return false; }
  },
  del(k) { mem.delete(k); try { localStorage.removeItem(k); } catch (e) { G.storageOk = false; } },
};
export function loadJSON(k, def) { try { const v = store.get(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
export function saveSettings() { store.set('sct-settings', JSON.stringify(G.settings)); }
export function saveProgress() { store.set('sct-progress', JSON.stringify(G.progress)); }

let liveT = 0;
export function announce(text) {
  const el = document.getElementById('live');
  if (!el) return;
  clearTimeout(liveT);
  el.textContent = '';
  liveT = setTimeout(() => { el.textContent = text; }, 30);
}
export function toast(text, kind = 'info') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = text;
  box.appendChild(t);
  const max = window.innerWidth < 700 ? 1 : 3;
  while (box.children.length > max) box.removeChild(box.firstChild);
  G.trans = Math.max(G.trans, performance.now() + 260);
  setTimeout(() => t.remove(), window.innerWidth < 700 ? 2600 : 3800);
  announce(text);
}
export const money = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
