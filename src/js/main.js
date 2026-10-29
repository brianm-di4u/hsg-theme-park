// Boot, the fixed-step loop, input (mouse, touch, keyboard), UI actions and window.__game hooks.
import { G, store, loadJSON, saveSettings, saveProgress, toast, announce, money } from './app.js';
import { TPS, HOUR, DAY, serialize, deserialize, idx, objById, guestById } from './state.js';
import { def, kindOf, TRACKS, MONTHS, DOWS } from './catalog.js';
import { view, render, pick, pickGuest, setView, centerOn, worldPx, P } from './render.js';
import { renderHud, renderDock, renderPanel, setPanel, screenHTML, renderTip, reducedOn, clock } from './ui.js';
import { startGame, runTicks, afterTicks, saveTo, loadFrom, loadState, latestSlot, doAct, autosave, collect } from './game.js';
import { sizeOf, placeCheck, pathRun, pathCheck, pathCost, terraformCheck } from './build.js';
import { stationCheck, buildingTrack, addCheck, DIRS, BLUEPRINTS, cellCost } from './track.js';
import { spawnGuest } from './guests.js';
import { goalValue, goalMet, demand, monthlyCosts, rollWeather, tempAt } from './world.js';
import { weatherClosures } from './rides.js';
import { newState } from './scenarios.js';
import { step as simStep } from './sim.js';
import { sfx, setOn, setVolume, ambient } from './audio.js';
import { mainStreet, autoPlace, autoBlueprint, pathOrder } from './plan.js';
import { R3, boot as boot3d, resize as resize3d, draw as draw3d, gfxState, webglAvailable, syncCamera, setQuality, use3d, thumb } from './gfx/r3d.js';

const cv = document.getElementById('cv');
const glc = document.getElementById('gl');
const ctx = cv.getContext('2d', { alpha: true });
const scr = document.getElementById('screen');
let demo = null;

// ---- settings and progress -------------------------------------------------------------
Object.assign(G.settings, loadJSON('sct-settings', {}));
Object.assign(G.progress, loadJSON('sct-progress', {}));
if (!Array.isArray(G.progress.cards)) G.progress.cards = [];
applySettings();
function applySettings() {
  document.documentElement.style.setProperty('--ts', G.settings.text);
  view.reduced = reducedOn();
  document.body.classList.toggle('reduced', view.reduced);
  view.grid = G.settings.grid;
  setOn(G.settings.sound); setVolume(G.settings.vol);
}

// ---- sizing ------------------------------------------------------------------------------
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  setView(W, H, dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resize3d(W, H, dpr);
  G.dirty = true;
}
window.addEventListener('resize', resize);
resize();

// ---- scenes ------------------------------------------------------------------------------
function showScene(name) {
  if (['title', 'campaign', 'sandbox', 'intro', 'help', 'settings', 'history', 'winter', 'win', 'lose'].includes(name)) {
    if (['title', 'campaign', 'sandbox', 'intro'].includes(name)) G.prevScene = 'title';
    if (name !== 'help' && name !== 'settings' && name !== 'history') { G.scene = name; G.overlay = null; }
    else G.overlay = name;
    if (name === 'help' || name === 'settings' || name === 'history') { G.backTo = G.scene; }
    scr.innerHTML = screenHTML(name);
    scr.classList.add('on');
    scr.scrollTop = 0;
    G.trans = performance.now() + 60;
    G.shown = name;
    const h = scr.querySelector('h1, h2, .logo');
    if (h) announce(h.textContent);
    const first = scr.querySelector('button:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  } else if (name === 'park') {
    if (!G.S) startGame({ scenario: 1 });
    G.scene = 'park'; G.overlay = null; G.shown = 'park';
    scr.classList.remove('on'); scr.innerHTML = '';
    G.trans = performance.now() + 60;
    announce(`${G.S.park.name}, ${MONTHS[Math.min(6, G.S.month)]} ${G.S.year}. Paused.`);
  }
  refresh();
}
G.hooks.scene = showScene;
function closeOverlay() {
  G.overlay = null;
  if (G.backTo === 'park' || (G.scene === 'park')) showScene('park');
  else showScene(G.backTo || 'title');
}
export function refresh() {
  renderHud(); renderDock(); renderPanel(); renderTip();
  G.dirty = true;
}
G.hooks.refresh = refresh;

// ---- tools ---------------------------------------------------------------------------------
const PALETTES = ['rides', 'coasters', 'water', 'shops', 'scenery', 'staff', 'park'];
const phone = () => view.W < 700;
function setTool(id) {
  G.cursorPathStart = null;
  if (PALETTES.includes(id)) {
    G.palette = id; G.tool = 'inspect'; G.placeType = null;
    setPanel(G.panel === id ? null : id);
    return;
  }
  G.tool = id; G.palette = id; G.placeType = null; G.listing = null;
  if (id === 'terrain') { G.terraDir = G.terraDir || 1; setPanel('terrain'); }
  else if (id === 'path' || id === 'demolish' || id === 'inspect') setPanel(phone() ? null : id);
  if (id === 'path' && !phone()) toast('Drag to lay paths. Steps of one level become stairs.');
  updateGhost(); refresh();
}
function pickItem(type) {
  G.placeType = type;
  G.tool = kindOf(type) === 'track' ? 'station' : 'place';
  if (phone()) setPanel(null);
  if (!phone()) toast(G.tool === 'station' ? `Place the ${def(type).name} station beside a path. R or ⟳ rotates.` : `Click a spot beside a path to place the ${def(type).name}.`);
  updateGhost(); refresh();
}

// ---- ghost preview ---------------------------------------------------------------------------
function updateGhost() {
  const S = G.S;
  view.ghost = null;
  if (!S || G.scene !== 'park') return;
  const tb = buildingTrack(S);
  if (tb && !tb.complete) {
    const cands = [-1, 0, 1].map((t) => ({ t, r: addCheck(S, tb, G.slope ?? 0, t, !!G.lift) }));
    const tiles = cands.filter((c) => c.r.cell).map((c) => [c.r.cell.x, c.r.cell.y, c.r.cell.h]);
    const ok = cands.some((c) => c.r.ok);
    view.ghost = { tiles: cands.map((c) => { const n = { ...c.r.cell }; return [n.x, n.y, n.h]; }), ok, label: ok ? 'Next cell' : cands[1].r.reason };
    view.ghost.tiles = tiles;
    view.ghostCands = cands;
    G.dirty = true;
    return;
  }
  const T = G.hover;
  if (!T) { G.dirty = true; return; }
  if (G.tool === 'path') {
    const from = G.drag && G.drag.mode === 'path' ? G.drag.tile : (G.cursorPathStart || T);
    const run = pathRun(from.x, from.y, T.x, T.y);
    const ok = run.every(([x, y]) => !pathCheck(S, x, y));
    view.ghost = { tiles: run, ok, label: ok ? money(pathCost(S, run)) : pathCheck(S, ...run.find(([x, y]) => pathCheck(S, x, y))) };
  } else if (G.tool === 'place' || G.tool === 'used') {
    const type = G.tool === 'used' ? S.park.market[G.listing].type : G.placeType;
    if (!type) return;
    const n = sizeOf(type), x0 = T.x - ((n - 1) >> 1), y0 = T.y - ((n - 1) >> 1);
    const c = placeCheck(S, type, x0, y0);
    const tiles = [];
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) tiles.push([x0 + dx, y0 + dy, c.ok ? c.h : undefined]);
    const L = G.tool === 'used' ? S.park.market[G.listing] : null;
    view.ghost = { tiles, ok: c.ok, label: c.ok ? money(L ? L.price + L.reloc + c.grade : c.cost) + (c.grade ? ` (grading ${money(c.grade)})` : '') : c.reason, at: [x0, y0] };
  } else if (G.tool === 'station' || G.tool === 'blueprint' || (G.tool === 'used' && false)) {
    const ttype = G.tool === 'station' ? G.placeType : BLUEPRINTS[G.placeType].ttype;
    const c = stationCheck(S, ttype, T.x, T.y, G.rot);
    const [dx, dy] = DIRS[G.rot];
    view.ghost = { tiles: [0, 1, 2].map((k) => [T.x + dx * k, T.y + dy * k, c.ok ? c.h : undefined]), ok: c.ok, label: c.ok ? (G.tool === 'blueprint' ? 'Place blueprint' : 'Station ' + money(c.cost)) : c.reason };
  } else if (G.tool === 'terrain') {
    const bad = terraformCheck(S, T.x, T.y, G.terraDir || 1);
    view.ghost = { tiles: [[T.x, T.y]], ok: !bad, label: bad || ((G.terraDir || 1) > 0 ? 'Raise $40' : 'Lower $40') };
  } else if (G.tool === 'demolish') {
    view.ghost = { tiles: [[T.x, T.y]], ok: false, label: 'Remove' };
  } else if (G.cursor) {
    view.ghost = { tiles: [[T.x, T.y]], ok: true };
  }
  if (G.tool === 'used' && G.listing != null) {
    const L = S.park.market[G.listing];
    if (L && L.kind === 'track') {
      const c = stationCheck(S, 'wood', T.x, T.y, G.rot); const [dx, dy] = DIRS[G.rot];
      view.ghost = { tiles: [0, 1, 2].map((k) => [T.x + dx * k, T.y + dy * k, c.ok ? c.h : undefined]), ok: c.ok, label: c.ok ? 'Place the used coaster' : c.reason };
    }
  }
  G.dirty = true;
}

// ---- applying a tool at a tile -------------------------------------------------------------
function applyAt(T, fromDrag) {
  const S = G.S;
  if (!T) return;
  const tb = buildingTrack(S);
  if (tb && !tb.complete && view.ghostCands) {
    const c = view.ghostCands.find((c) => c.r.cell && c.r.cell.x === T.x && c.r.cell.y === T.y);
    if (c) { trackAdd(c.t); return; }
  }
  switch (G.tool) {
    case 'path': {
      const from = fromDrag || T;
      const r = doAct('path', from.x, from.y, T.x, T.y);
      if (r.built) { sfx.path(); announce(`Built ${r.built} path tiles for ${money(r.cost)}.`); }
      else if (!r.built && r.failed) sfx.error();
      break;
    }
    case 'place': {
      const n = sizeOf(G.placeType), x0 = T.x - ((n - 1) >> 1), y0 = T.y - ((n - 1) >> 1);
      const r = doAct('place', G.placeType, x0, y0);
      if (r.ok) {
        sfx.build(); announce(`${def(G.placeType).name} built for ${money(r.cost)}.${r.obj.entry < 0 ? ' Its entrance does not touch a path yet.' : ''}`);
        if (r.obj.kind === 'ride' || r.obj.kind === 'special') { G.sel = { kind: 'obj', id: r.id }; view.sel = G.sel; G.tool = 'inspect'; G.placeType = null; setPanel('obj', r.id); }
      } else sfx.error();
      break;
    }
    case 'used': {
      const L = S.park.market[G.listing], n = L.kind === 'track' ? 1 : sizeOf(L.type);
      const x0 = L.kind === 'track' ? T.x : T.x - ((n - 1) >> 1), y0 = L.kind === 'track' ? T.y : T.y - ((n - 1) >> 1);
      const r = doAct('buyUsed', G.listing, x0, y0, G.rot, false);
      const r2 = r.ok ? r : L.kind === 'track' ? doAct('buyUsed', G.listing, x0, y0, G.rot, true) : r;
      if (r2.ok) { sfx.build(); G.tool = 'inspect'; G.listing = null; setPanel('obj', r2.id); }
      break;
    }
    case 'station': {
      const r = doAct('trackStart', G.placeType, T.x, T.y, G.rot);
      if (r.ok) { sfx.build(); G.tool = 'inspect'; G.slope = 0; G.lift = false; setPanel('track'); announce('Station placed. Add track with the direction buttons or the arrow keys.'); }
      break;
    }
    case 'blueprint': {
      let r = doAct('blueprint', G.placeType, T.x, T.y, G.rot, false);
      if (!r.ok) r = doAct('blueprint', G.placeType, T.x, T.y, G.rot, true);
      if (r.ok) { sfx.coaster(); G.tool = 'inspect'; G.placeType = null; setPanel('obj', r.id); announce(`Blueprint built: top speed ${r.stats.vmax} mph.`); }
      break;
    }
    case 'terrain': { const r = doAct('terraform', T.x, T.y, G.terraDir || 1); if (r.ok) sfx.path(); break; }
    case 'demolish': {
      const i = idx(S, T.x, T.y), id = S.map.occ[i];
      const o = id ? objById(S, id) : null;
      if (o && (o.kind === 'ride' || o.kind === 'track' || o.kind === 'special')) { G.sel = { kind: 'obj', id }; view.sel = G.sel; setPanel('obj', id); toast('Use Demolish in the ride window to confirm.'); break; }
      const r = doAct('demolish', T.x, T.y);
      if (r.ok) sfx.path();
      break;
    }
    default: inspectAt(T);
  }
  updateGhost(); refresh();
}
function inspectAt(T, sx, sy) {
  const S = G.S;
  if (sx != null) {
    const g = pickGuest(S, sx, sy);
    if (g) { G.sel = { kind: 'guest', id: g.id }; view.sel = G.sel; setPanel('guest', g.id); return; }
  }
  if (!T) return;
  const id = S.map.occ[idx(S, T.x, T.y)];
  if (id) {
    const o = objById(S, id);
    G.sel = { kind: 'obj', id }; view.sel = G.sel;
    if (o && o.status === 'building' && S.trackBuild && S.trackBuild.id === id) setPanel('track');
    else setPanel('obj', id);
    return;
  }
  G.sel = null; view.sel = null; if (G.panel === 'obj' || G.panel === 'guest') setPanel(null);
}
function trackAdd(turn) {
  const r = doAct('trackAdd', G.slope ?? 0, turn, !!G.lift);
  if (r.ok) { sfx.click(); if (r.closed) { sfx.bell(); announce('Loop closed. Run the test to open it.'); } }
  updateGhost(); renderPanel();
}

// ---- pointer input --------------------------------------------------------------------------
const ptrs = new Map();
let pinch = null;
function tileAt(sx, sy) { return G.S ? pick(G.S, sx, sy) : null; }
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerdown', (e) => {
  if (G.scene !== 'park') return;
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  G.cursor = null;
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, z: view.cam.z };
    G.drag = null; return;
  }
  const T = tileAt(e.clientX, e.clientY);
  let mode = 'tap';
  if (e.button === 1 || e.button === 2) mode = 'pan';
  else if (G.tool === 'inspect') mode = 'maybePan';
  else if (G.tool === 'path') mode = 'path';
  else if (G.tool === 'terrain' || G.tool === 'demolish') mode = 'tap';
  G.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, tile: T, mode };
  G.hover = T; updateGhost();
});
cv.addEventListener('pointermove', (e) => {
  if (G.scene !== 'park') return;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    zoomAt(Math.max(zmin(), Math.min(2, pinch.z * d / pinch.d)), mx, my);
    view.cam.x -= (mx - pinch.mx) / view.cam.z; view.cam.y -= (my - pinch.my) / view.cam.z;
    pinch.mx = mx; pinch.my = my; G.dirty = true; return;
  }
  const D = G.drag;
  if (D && D.id === e.pointerId) {
    if (Math.hypot(e.clientX - D.sx, e.clientY - D.sy) > 6) D.moved = true;
    if (D.mode === 'pan' || (D.mode === 'maybePan' && D.moved)) {
      view.cam.x -= (e.clientX - D.lx) / view.cam.z; view.cam.y -= (e.clientY - D.ly) / view.cam.z;
      G.follow = false; G.dirty = true;
    }
    D.lx = e.clientX; D.ly = e.clientY;
    if (D.mode === 'path' || D.mode === 'tap') { G.hover = tileAt(e.clientX, e.clientY); updateGhost(); }
    if (D.mode === 'tap' && D.moved && (G.tool === 'terrain' || G.tool === 'demolish') && G.hover && (!D.last || D.last.i !== G.hover.i)) {
      if (G.tool === 'terrain') { applyAt(G.hover); D.last = G.hover; }
    }
    return;
  }
  if (e.pointerType === 'mouse') { const T = tileAt(e.clientX, e.clientY); if (!G.hover || !T || T.i !== G.hover.i) { G.hover = T; updateGhost(); } }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (pinch) { if (ptrs.size < 2) pinch = null; G.drag = null; return; }
  const D = G.drag;
  if (!D || D.id !== e.pointerId) return;
  G.drag = null;
  if (e.type === 'pointercancel') return;
  const T = tileAt(e.clientX, e.clientY);
  if (D.mode === 'path') applyAt(T || D.tile, D.tile);
  else if (D.mode === 'maybePan') { if (!D.moved) inspectAt(T, e.clientX, e.clientY); refresh(); }
  else if (D.mode === 'tap') { if (!D.moved || G.tool === 'demolish') applyAt(T); }
  if (e.pointerType !== 'mouse') { G.hover = null; updateGhost(); }
}
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', (e) => {
  if (G.scene !== 'park') return;
  e.preventDefault();
  zoomAt(Math.max(zmin(), Math.min(2, view.cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))), e.clientX, e.clientY);
}, { passive: false });
// the 3D view can pull back further, until the ridges around the park and the sky come into view
function zmin() { return view.g3 ? 0.32 : 0.5; }
function zoomAt(z, sx, sy) {
  const c = view.cam;
  const wx = c.x + (sx - view.W / 2) / c.z, wy = c.y + (sy - view.H / 2) / c.z;
  c.z = z;
  c.x = wx - (sx - view.W / 2) / z; c.y = wy - (sy - view.H / 2) / z;
  G.dirty = true;
}

// ---- keyboard ---------------------------------------------------------------------------------
document.addEventListener('keydown', (e) => {
  const tgt = e.target, inForm = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA');
  const onBtn = tgt && tgt.tagName === 'BUTTON';
  if (e.key === 'Escape') {
    if (G.overlay) { closeOverlay(); e.preventDefault(); return; }
    if (G.scene === 'intro' || G.scene === 'campaign' || G.scene === 'sandbox') { showScene(G.scene === 'intro' ? 'campaign' : 'title'); return; }
    if (G.scene !== 'park') return;
    if (G.tool !== 'inspect') { setTool('inspect'); setPanel(null); }
    else if (G.panel) setPanel(null);
    G.cursor = null; G.cursorPathStart = null; updateGhost(); refresh();
    return;
  }
  if (G.scene !== 'park' || inForm || e.ctrlKey || e.metaKey || e.altKey) return;
  const S = G.S, k = e.key;
  const tb = buildingTrack(S);
  if (tb && !tb.complete && !onBtn) {
    if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'ArrowRight') { trackAdd(k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0); e.preventDefault(); return; }
    if (k === 'PageUp' || k === 'PageDown') { const T = TRACKS[tb.type]; G.slope = Math.max(T.dmin, Math.min(T.dmax, (G.slope ?? 0) + (k === 'PageUp' ? 1 : -1))); renderPanel(); updateGhost(); e.preventDefault(); return; }
    if (k === 'l' || k === 'L') { G.lift = !G.lift; renderPanel(); updateGhost(); return; }
    if (k === 'Backspace') { doAct('trackUndo'); renderPanel(); updateGhost(); e.preventDefault(); return; }
  }
  if (k === ' ' && !onBtn) { togglePause(); e.preventDefault(); return; }
  if (k >= '1' && k <= '4') { setSpeed([1, 2, 4, 8][+k - 1]); return; }
  if (k === '+' || k === '=') { zoomAt(Math.min(2, view.cam.z * 1.15), view.W / 2, view.H / 2); return; }
  if (k === '-' || k === '_') { zoomAt(Math.max(zmin(), view.cam.z / 1.15), view.W / 2, view.H / 2); return; }
  if (k === 'r' || k === 'R') { G.rot = (G.rot + 1) & 3; updateGhost(); return; }
  if (k === 'i' || k === 'I') return setTool('inspect');
  if (k === 'p' || k === 'P') return setTool('path');
  if (k === 'x' || k === 'X') return setTool('demolish');
  if (k === 'b' || k === 'B') return setTool('rides');
  if (k === 'c' || k === 'C') return setTool('coasters');
  const arrows = { ArrowLeft: [-1, 1], ArrowRight: [1, -1], ArrowUp: [-1, -1], ArrowDown: [1, 1] };
  if (arrows[k] && !onBtn) {
    e.preventDefault();
    const building = G.tool !== 'inspect';
    if (building) {
      // move the build cursor one tile (screen-aligned: up = north-west on the diamond)
      const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
      const c = G.cursor || G.hover || gateTile();
      const nc = { x: Math.max(0, Math.min(S.map.w - 1, c.x + step[0])), y: Math.max(0, Math.min(S.map.h - 1, c.y + step[1])) };
      nc.i = idx(S, nc.x, nc.y);
      G.cursor = nc; G.hover = nc;
      const [wx, wy] = worldPx(nc.x + 0.5, nc.y + 0.5, S.map.height[nc.i]);
      if (Math.abs(wx - view.cam.x) * view.cam.z > view.W * 0.3 || Math.abs(wy - view.cam.y) * view.cam.z > view.H * 0.3) { view.cam.x = wx; view.cam.y = wy; }
      updateGhost();
    } else { const [dx, dy] = arrows[k]; view.cam.x += dx * 48 / view.cam.z; view.cam.y += (dy * 24) / view.cam.z; G.dirty = true; }
    return;
  }
  if (k === 'Enter' && !onBtn && G.cursor) {
    e.preventDefault();
    if (G.tool === 'path') {
      if (!G.cursorPathStart) { G.cursorPathStart = { ...G.cursor }; announce('Path start set. Move and press Enter again to build.'); updateGhost(); }
      else { applyAt(G.cursor, G.cursorPathStart); G.cursorPathStart = null; }
    } else applyAt(G.cursor);
  }
});
function gateTile() { const S = G.S, w = S.map.w; return { x: S.map.gate % w, y: Math.floor(S.map.gate / w) - 3, i: S.map.gate - 3 * w }; }
function togglePause() { if (G.S && G.S.pending) return; G.paused = !G.paused; announce(G.paused ? 'Paused' : `Running at ${G.speed}×`); renderHud(); }
function setSpeed(n) { if (G.S && G.S.pending) return; G.speed = n; G.paused = false; renderHud(); }

// ---- UI actions (event delegation) -----------------------------------------------------------
// Touch taps act on pointerup: Chromium can drop the synthesized click after a canvas drag.
let touchDown = null, skipClick = null;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const b = e.target.closest && e.target.closest('[data-act]');
  touchDown = b ? { b, x: e.clientX, y: e.clientY } : null;
}, true);
document.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'touch' || !touchDown) return;
  const b = e.target.closest && e.target.closest('[data-act]');
  const d = touchDown; touchDown = null;
  if (!b || b !== d.b || b.disabled || b.tagName === 'INPUT' || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
  skipClick = { b, until: performance.now() + 800 };
  G.focusPanel = false;
  uiAct(b.dataset.act, b.dataset.arg, b);
}, true);
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || b.tagName === 'INPUT') return;
  if (skipClick && performance.now() < skipClick.until && (skipClick.b === b || !b.isConnected || !skipClick.b.isConnected)) { skipClick = null; return; }
  G.focusPanel = e.detail === 0; // keyboard activation moves focus into new panels
  uiAct(b.dataset.act, b.dataset.arg, b);
});
document.addEventListener('input', (e) => {
  const b = e.target.closest('[data-act="vol"]');
  if (b) { G.settings.vol = +b.value; setVolume(G.settings.vol); saveSettings(); }
});
function uiAct(a, arg, el) {
  const S = G.S;
  sfx.click();
  switch (a) {
    case 'tool': return setTool(arg);
    case 'pick': return pickItem(arg);
    case 'pickBp': G.tool = 'blueprint'; G.placeType = arg; G.rot = G.rot || 0; if (phone()) setPanel(null); updateGhost(); return refresh();
    case 'buyUsed': G.tool = 'used'; G.listing = +arg; if (phone()) setPanel(null); updateGhost(); return refresh();
    case 'closePanel': setPanel(null); if (G.tool === 'inspect') { G.sel = null; view.sel = null; } return refresh();
    case 'panel': return setPanel(arg);
    case 'pause': return togglePause();
    case 'speed': return setSpeed(+arg);
    case 'slope': G.slope = +arg; updateGhost(); return renderPanel();
    case 'lift': G.lift = !G.lift; updateGhost(); return renderPanel();
    case 'trackAdd': return trackAdd(+arg);
    case 'trackUndo': doAct('trackUndo'); updateGhost(); return renderPanel();
    case 'trackAuto': { const r = doAct('trackAuto'); if (r.ok) { sfx.bell(); announce(`Auto-finish added ${r.cells} cells.`); } updateGhost(); return renderPanel(); }
    case 'trackFinish': {
      const id = S.trackBuild && S.trackBuild.id;
      const r = doAct('trackFinish');
      if (r.ok) { sfx.coaster(); G.testRun = { id, t0: performance.now() }; setPanel('obj', id); }
      else renderPanel();
      updateGhost(); return;
    }
    case 'trackCancel': doAct('trackCancel'); setPanel(null); updateGhost(); return refresh();
    case 'editTrack': { S.trackBuild = { id: G.panelArg }; const o = objById(S, G.panelArg); if (o) { o.status = 'building'; o.complete = false; } setPanel('track'); updateGhost(); return; }
    case 'price': { const o = objById(S, G.panelArg); if (o) doAct('setPrice', o.id, o.price + +arg); return renderPanel(); }
    case 'admission': doAct('admission', S.park.admission + +arg); return renderPanel();
    case 'ppr': doAct('payPerRide', !S.park.payPerRide); return renderPanel();
    case 'cooler': doAct('cooler', !S.park.cooler); return renderPanel();
    case 'waterCal': doAct('waterCal', !S.park.waterCal); return renderPanel();
    case 'loan': { const r = doAct('loan', +arg); if (r.ok) sfx.cash(); return refresh(); }
    case 'hire': { const [role, seas] = arg.split(':'); doAct('hire', role, seas === '1'); return refresh(); }
    case 'fire': doAct('fire', +arg); return refresh();
    case 'research': doAct('research', +arg); return renderPanel();
    case 'campaign': { const r = doAct('market', arg); if (r.ok) sfx.cash(); return refresh(); }
    case 'campaignAuto': { const c = S.park.campaigns[arg]; if (c) c.auto = !c.auto; return renderPanel(); }
    case 'book': { const r = doAct('book', arg); if (r.ok) sfx.bell(); return refresh(); }
    case 'refurb': doAct('refurb', G.panelArg); return refresh();
    case 'standing': doAct('leaveStanding', G.panelArg); return refresh();
    case 'rideOpen': { const o = objById(S, G.panelArg); if (o) doAct('rideOpen', o.id, o.status !== 'open'); return refresh(); }
    case 'demolishSel': { doAct('demolishId', G.panelArg); G.sel = null; view.sel = null; setPanel(null); return refresh(); }
    case 'follow': G.follow = !G.follow; return renderPanel();
    case 'save': { const ok = saveTo(arg); toast(ok ? `Saved to slot ${arg}.` : 'Could not save.', ok ? 'good' : 'warn'); return renderPanel(); }
    case 'load': if (loadFrom(arg)) { toast('Game loaded.'); showScene('park'); } return;
    case 'toTitle': autosave(); G.S = null; return goTitle();
    case 'screen': return showScene(arg);
    case 'back': return closeOverlay();
    case 'continue': { const s = latestSlot(); if (s && loadFrom(s)) showScene('park'); return; }
    case 'intro': G.introId = +arg; return showScene('intro');
    case 'play': startGame({ scenario: +arg }); return showScene('park');
    case 'sbx': { const [k, v] = arg.split(':'); G.sandbox[k] = v; return showScene('sandbox'); }
    case 'sbxSeed': G.sandbox.seed = (G.sandbox.seed * 7 + 13) % 997; return showScene('sandbox');
    case 'playSandbox': startGame({ mode: 'sandbox', hills: G.sandbox.hills, cash: G.sandbox.cash, seed: +G.sandbox.seed }); return showScene('park');
    case 'helpTab': G.helpTab = arg; scr.innerHTML = screenHTML('help'); { const t = scr.querySelector(`[data-arg="${arg}"]`); if (t) t.focus(); } return;
    case 'set': {
      if (arg === 'reduced') G.settings.reduced = !reducedOn();
      else G.settings[arg] = !G.settings[arg];
      saveSettings(); applySettings(); scr.innerHTML = screenHTML('settings'); { const t = scr.querySelector(`[data-arg="${arg}"]`); if (t) t.focus(); } return;
    }
    case 'gfx': {
      G.settings.gfx = G.settings.gfx === '2d' ? 'auto' : '2d'; saveSettings();
      const on = G.settings.gfx !== '2d';
      if (on && !R3.ready && !R3.loading && webglAvailable()) start3d(); else { use3d(on); glc.hidden = !view.g3; document.body.classList.toggle('g3', !!view.g3); }
      G.dirty = true; scr.innerHTML = screenHTML('settings'); { const t = scr.querySelector('[data-act="gfx"]'); if (t) t.focus(); } return;
    }
    case 'quality': {
      const order = ['auto', 'high', 'medium', 'low'], cur = G.settings.quality || 'auto';
      G.settings.quality = order[(order.indexOf(cur) + 1) % order.length]; saveSettings();
      if (R3.ready) setQuality(G.settings.quality === 'auto' ? (R3.soft ? 'low' : phone() ? 'medium' : 'high') : G.settings.quality);
      G.dirty = true; scr.innerHTML = screenHTML('settings'); { const t = scr.querySelector('[data-act="quality"]'); if (t) t.focus(); } return;
    }
    case 'text': G.settings.text = +arg; saveSettings(); applySettings(); scr.innerHTML = screenHTML('settings'); return;
    case 'spring': doAct('continue'); return showScene('park');
    case 'keepPlaying': S.pending = null; return showScene('park');
    case 'skipTut': S.tutorial = null; return refresh();
    case 'terra': G.terraDir = +arg; G.tool = 'terrain'; updateGhost(); return renderPanel();
    case 'rotate': G.rot = (G.rot + 1) & 3; updateGhost(); return;
    case 'cancelTool': setTool('inspect'); setPanel(null); G.cursor = null; updateGhost(); return refresh();
  }
}
function goTitle() { G.scene = 'title'; showScene('title'); }

// ---- loop ------------------------------------------------------------------------------------
let last = performance.now(), acc = 0, hudT = 0;
function frame(t) {
  const dt = Math.min(100, t - last); last = t;
  const S = G.S;
  if (G.scene === 'park' && S) {
    view.cine = false;
    if (!G.paused && !S.pending) {
      acc += dt * G.speed * TPS / 1000;
      let n = Math.floor(acc);
      if (n > 12) { n = 12; acc = 0; } else acc -= n;
      if (n) runTicks(n);
      view.frac = acc; G.dirty = true;
    }
    if (G.follow && G.sel && G.sel.kind === 'guest') {
      const g = S.guests.find((x) => x.id === G.sel.id);
      // on phones the sheet covers the lower half, so keep the guest in the upper part
      if (g) { const [wx, wy0] = worldPx(g.x, g.y, g.z); const wy = wy0 + (phone() && G.panel ? view.H * 0.22 / view.cam.z : 0); view.cam.x += (wx - view.cam.x) * (view.reduced ? 1 : 0.2); view.cam.y += (wy - view.cam.y) * (view.reduced ? 1 : 0.2); G.dirty = true; }
      else G.follow = false;
    }
    if (G.testRun) { const p = (performance.now() - G.testRun.t0) / 2500; view.testRun = p < 1 ? { id: G.testRun.id, p } : null; if (p >= 1) G.testRun = null; G.dirty = true; }
    if (view.g3 && G.paused && !window.__TEST__ && !R3.soft && !view.reduced) G.dirty = true;
    if (G.dirty) { view.personScale = 1; render(ctx, S, dt); G.dirty = false; }
    autoQuality(dt);
    if (t - hudT > 200) { hudT = t; renderHud(); if (!G.paused && (G.panel === 'obj' || G.panel === 'guest' || G.panel === 'guests' || G.panel === 'finances' || G.panel === 'goals' || G.panel === 'rating')) renderPanelSafe(); ambient(S.guests.length, S.weather.kind === 'rain' || S.weather.kind === 'storm', !G.paused); }
  } else if (demo && G.dirty) {
    view.cine = !!view.g3; render(ctx, demo, dt); G.dirty = false;
  } else if (demo && !window.__TEST__ && !view.reduced && G.scene === 'title') {
    simStep(demo, 1); view.cam.x += dt * 0.004; view.cine = !!view.g3; render(ctx, demo, dt);
  }
  requestAnimationFrame(frame);
}
// Slow devices: if the running park averages under ~28 fps for a few seconds, step the 3D quality down once per level
// (never on software GL, where every preset is slow, and never over a quality the player picked).
const aq = { n: 0, sum: 0 };
function autoQuality(dt) {
  if (!view.g3 || R3.soft || G.paused || (G.settings.quality && G.settings.quality !== 'auto') || document.hidden) { aq.n = 0; aq.sum = 0; return; }
  aq.n++; aq.sum += dt;
  if (aq.n < 180) return;
  const avg = aq.sum / aq.n; aq.n = 0; aq.sum = 0;
  if (avg > 36 && R3.quality !== 'low') { const q = R3.quality === 'high' ? 'medium' : 'low'; setQuality(q); toast(`Graphics set to ${q} for smoother play (Settings to change).`); }
}
// Re-rendering a panel while the user is pressing one of its buttons would swallow the click.
function renderPanelSafe() {
  const p = document.getElementById('panel');
  if (p.contains(document.activeElement) && document.activeElement !== document.body) return;
  if (G.pressing) return;
  renderPanel();
}
document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('#panel')) G.pressing = true; }, true);
document.addEventListener('pointerup', () => { setTimeout(() => { G.pressing = false; }, 50); }, true);

// ---- test hooks --------------------------------------------------------------------------------
function summary() {
  const S = G.S;
  const base = { gfx: gfxState(), scene: G.shown === 'park' ? 'park' : G.shown || G.scene, paused: G.paused, speed: G.speed, tool: G.tool, placeType: G.placeType, panel: G.panel, zoom: view.cam.z, cards: G.progress.cards.length, stars: G.progress.stars, storageOk: G.storageOk, settings: G.settings };
  if (!S) return base;
  return {
    ...base,
    tick: S.tick, year: S.year, month: S.month, monthName: MONTHS[Math.min(6, S.month)], dow: S.dow, dowName: DOWS[S.dow], time: S.time, hour: 10 + Math.floor(S.time / HOUR), clock: clock(S),
    cash: Math.round(S.finance.cash), loan: S.finance.loan, rating: Math.round(S.park.rating), ratingParts: S.park.ratingParts,
    guests: S.guests.length, guestsToday: S.stats.guestsToday, guestsSeason: S.stats.guestsSeason, guestsTotal: S.stats.guestsTotal, turnedAway: S.stats.turnedAway, peak: S.stats.peak,
    admission: S.park.admission, payPerRide: S.park.payPerRide, cooler: S.park.cooler, open: S.park.open,
    objects: S.objects.map((o) => ({ id: o.id, type: o.type, kind: o.kind, name: o.name, x: o.x, y: o.y, n: o.n, h: o.h, status: o.status, entry: o.entry, riders: o.riders ? o.riders.length : 0, queue: o.queue ? o.queue.length : 0, totalRiders: o.totalRiders || 0, sales: o.sales || 0, price: o.price, int: o.int ?? (def(o.type).int || 0), thrill: o.thrill ?? def(o.type).thrill, broken: o.broken || 0, rel: o.rel, cal: o.cal, wx: o.wx, cells: o.cells ? o.cells.length : 0, complete: o.complete, stats: o.stats || null, failAt: o.failAt, cost: o.cost, age: o.age, income: o.income || 0 })),
    staff: S.staff.map((s) => ({ id: s.id, role: s.role, st: s.st, ti: s.ti, seasonal: s.seasonal, done: s.done })),
    weather: S.weather, scenario: S.scenario && { id: S.scenario.id, title: S.scenario.title, mode: S.scenario.mode, status: S.scenario.status, stars: S.scenario.stars, why: S.scenario.why, goals: (S.scenario.goals || []).map((g) => ({ label: g.label, value: goalValue(S, g), met: goalMet(S, g) })) },
    pending: S.pending && S.pending.kind, tutorial: S.tutorial && S.tutorial.step,
    trackBuild: S.trackBuild && (() => { const o = buildingTrack(S); return o ? { id: o.id, cells: o.cells.length, complete: o.complete } : null; })(),
    msgs: S.msgs.slice(-6).map((m) => m.text), ledger: S.finance.month, season: S.finance.season, months: S.finance.months.length,
    thoughts: Object.fromEntries(Object.entries(S.thoughts).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    paths: S.map.path.reduce((s, v) => s + v, 0), litter: S.map.litter.reduce((s, v) => s + v, 0),
    research: S.park.research, campaigns: Object.keys(S.park.campaigns), concert: S.park.concert, market: S.park.market.map((m) => ({ name: m.name, sold: m.sold })),
    camera: { ...view.cam }, selected: G.sel, follow: G.follow, demand: S.stats.demand,
    sampleGuests: S.guests.slice(0, 8).map((g) => ({ id: g.id, k: g.k, st: g.st, ti: g.ti, happy: Math.round(g.happy), money: g.money, rides: g.rides, lo: g.lo, hi: g.hi, hgt: g.hgt })),
  };
}
function isIdle() {
  // the 3D view counts as busy while it loads (so shots never catch the 2D stand-in) and while a paused frame is queued
  const g3busy = (R3.want && !R3.ready && !R3.failed) || (view.g3 && G.dirty && (G.paused || G.scene !== 'park'));
  return performance.now() >= G.trans && !G.testRun && !G.drag && !pinch && !g3busy;
}
const hooks = {
  seed(n) { G.seed = n | 0; if (G.S) G.S.rng = n | 0; return true; },
  getState(full) { return full ? JSON.parse(serialize(G.S)) : summary(); },
  setState(s) {
    if (s && s.map) { loadState(deserialize(s)); showScene('park'); return summary(); }
    const S = G.S; if (!S || !s) return summary();
    if (s.cash != null) S.finance.cash = s.cash;
    if (s.loan != null) S.finance.loan = s.loan;
    if (s.rating != null) S.park.rating = s.rating;
    if (s.month != null) S.month = s.month;
    if (s.dow != null) S.dow = s.dow;
    if (s.year != null) S.year = s.year;
    if (s.hour != null) S.time = Math.round((s.hour - 10) * HOUR);
    if (s.weather) Object.assign(S.weather, s.weather);
    if (s.hour != null) S.weather.temp = tempAt(S);
    weatherClosures(S);
    if (s.tutorial !== undefined) S.tutorial = s.tutorial;
    if (s.pending !== undefined) S.pending = s.pending;
    G.dirty = true; refresh();
    return summary();
  },
  isIdle,
  step(n = 1) { if (G.S) { runTicks(n); updateGhost(); G.dirty = true; renderHud(); renderPanel(); if (!view.g3) { render(ctx, G.S, 16); G.dirty = false; } } return summary(); },
  pause() { G.paused = true; renderHud(); return true; },
  resume() { G.paused = false; renderHud(); return true; },
  scene(name) { if (name === 'park' && !G.S) startGame({ scenario: 1, seed: G.seed }); showScene(name); return summary(); },
  newGame(opts = {}) {
    startGame({ ...opts, seed: opts.seed ?? G.seed, noTutorial: opts.tutorial === false });
    showScene('park'); G.paused = true;
    if (opts.empty) for (const o of [...G.S.objects]) doAct('demolishId', o.id);
    return summary();
  },
  act(name, ...a) {
    const S = G.S;
    switch (name) {
      case 'tool': setTool(a[0]); return summary();
      case 'pick': pickItem(a[0]); return summary();
      case 'panel': setPanel(a[0], a[1]); return summary();
      case 'camera': { if (a[0] != null) centerOn(a[0] + 0.5, a[1] + 0.5, S ? S.map.height[idx(S, a[0], a[1])] : 0); if (a[2]) view.cam.z = a[2]; G.dirty = true; return summary(); }
      case 'zoom': view.cam.z = a[0]; G.dirty = true; return summary();
      case 'pickAt': { const T = pick(S, a[0], a[1]); return T ? { x: T.x, y: T.y } : null; }
      case 'tileToScreen': { const h = a[2] != null ? a[2] : S.map.height[idx(S, a[0], a[1])]; if (view.g3) syncCamera(); else render(ctx, S, 0); const p = P(a[0] + 0.5, a[1] + 0.5, h); return { x: Math.round(p[0]), y: Math.round(p[1]) }; }
      case 'select': { G.sel = { kind: a[0], id: a[1] }; view.sel = G.sel; setPanel(a[0] === 'guest' ? 'guest' : 'obj', a[1]); return summary(); }
      case 'follow': G.follow = !!a[0]; return summary();
      case 'spawn': {
        const paths = []; for (let i = 0; i < S.map.path.length; i++) if (S.map.path[i]) paths.push(i);
        for (let k = 0; k < a[0]; k++) { const g = spawnGuest(S); if (!g) continue; const p = paths[(k * 7919) % paths.length]; g.ti = p; g.x = (p % S.map.w) + 0.5; g.y = Math.floor(p / S.map.w) + 0.5; g.z = S.map.height[p]; g.money += 40; }
        G.dirty = true; return summary();
      }
      case 'spawnAt': {
        const [x, y, n] = a, i = idx(S, x, y), ids = [];
        for (let k = 0; k < n; k++) { const g = spawnGuest(S); if (!g) continue; g.ti = i; g.x = x + 0.5; g.y = y + 0.5; g.z = S.map.height[i]; g.money += 40; ids.push(g.id); }
        G.dirty = true; return ids;
      }
      case 'goto': { const o = a[0] || {}; if (o.month != null) S.month = o.month; if (o.dow != null) S.dow = o.dow; if (o.hour != null) S.time = Math.round((o.hour - 10) * HOUR); if (o.year != null) S.year = o.year; S.weather.temp = tempAt(S); weatherClosures(S); G.dirty = true; refresh(); return summary(); }
      case 'weather': { S.weather.kind = a[0]; if (a[0] === 'storm') S.weather.storm = [0, DAY]; if (a[1] != null) { S.weather.hi = a[1]; S.weather.temp = a[1]; } weatherClosures(S); G.dirty = true; refresh(); return summary(); }
      case 'fx': view.noFx = !a[0]; return summary();
      case 'debugRender': view.dbg = a[0] || {}; G.dirty = true; return summary();
      case 'animAt': G.testRun = null; view.testRun = null; return summary();
      case 'speed': setSpeed(a[0]); return summary();
      case 'collect': collect(a[0]); return summary();
      case 'unlockAll': G.progress.unlockAll = true; saveProgress(); return summary();
      case 'slope': G.slope = a[0]; updateGhost(); renderPanel(); return summary();
      case 'lift': G.lift = !!a[0]; updateGhost(); renderPanel(); return summary();
      case 'rot': G.rot = a[0] & 3; updateGhost(); return summary();
      case 'hover': G.hover = { x: a[0], y: a[1], i: idx(S, a[0], a[1]) }; updateGhost(); G.dirty = true; return summary();
      // layout helpers (the balance tool's planner) for building test parks quickly
      case 'mainStreet': { const n = mainStreet(S, a[0] || 14, a[1] || 5, a[2] || 6); refresh(); return { ok: true, n }; }
      case 'autoPlace': { const r = autoPlace(S, a[0], a[1] || {}); refresh(); return r.ok ? { ok: true, id: r.id, x: r.obj.x, y: r.obj.y, entry: r.obj.entry } : { ok: false, reason: r.reason }; }
      case 'autoBlueprint': { const r = autoBlueprint(S, a[0]); refresh(); return r.ok ? { ok: true, id: r.id, stats: r.stats } : { ok: false, reason: r.reason }; }
      case 'stationSpot': {
        // a free 3-cell station beside a path for track type a[0]
        const w = S.map.w, order = pathOrder(S).slice(a[1] || 0), ahead = a[2] || 1;
        for (const p of order) {
          const px = p % w, py = Math.floor(p / w);
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) for (let d = 0; d < 4; d++) {
            const [dx, dy] = DIRS[d]; if (dx === ox || dx === -ox) continue;
            const c = stationCheck(S, a[0], px + ox, py + oy, d);
            let room = c.ok;
            for (let k = 3; room && k < 3 + ahead; k++) { const X = px + ox + dx * k, Y = py + oy + dy * k; room = X >= 0 && Y >= 0 && X < w && Y < S.map.h && !S.map.path[idx(S, X, Y)] && !S.map.occ[idx(S, X, Y)]; }
            if (room && Math.abs(c.h - S.map.height[p]) <= 1) return { x: px + ox, y: py + oy, dir: d, h: c.h };
          }
        }
        return null;
      }
      case 'cellCost': return cellCost(S, a[0], { x: a[1], y: a[2], h: a[3], lift: a[4] ? 1 : 0 }, !!a[5]);
      case 'demand': return demand(S);
      case 'monthlyCosts': return monthlyCosts(S);
      case 'gate': { const w = S.map.w; return { x: S.map.gate % w, y: Math.floor(S.map.gate / w), h: S.map.height[S.map.gate] }; }
      case 'tile': { const i = idx(S, a[0], a[1]); return { h: S.map.height[i], kind: S.map.kind[i], path: S.map.path[i], occ: S.map.occ[i], tree: S.map.tree[i], litter: S.map.litter[i] }; }
    }
    const r = doAct(name, ...a);
    if (name === 'trackStart' && r.ok) setPanel('track');
    updateGhost(); refresh();
    return JSON.parse(JSON.stringify(r, (k, v) => (k === 'obj' ? undefined : v)));
  },
};
window.__game = hooks;

// ---- boot ----------------------------------------------------------------------------------
try {
  // a running park as the title backdrop
  demo = newState({ scenario: 6, seed: 2003 });
  demo.scenario.status = 'demo'; demo.month = 3;
  simStep(demo, 320);
  demo.weather.kind = 'sun';
  centerOn(demo.map.gate % demo.map.w + 0.5, Math.floor(demo.map.gate / demo.map.w) - 8, 2);
  view.cam.z = view.W < 700 ? 0.8 : 1;
} catch (e) { demo = null; }
showScene('title');
G.dirty = true;
requestAnimationFrame(frame);
// the 3D view loads after first paint; the Canvas renderer stays as the fallback (no WebGL, ?gfx=2d, or the setting)
const gfxPref = new URLSearchParams(location.search).get('gfx') || G.settings.gfx || 'auto';
function start3d() {
  return boot3d(glc, { quality: ['high', 'medium', 'low'].includes(G.settings.quality) ? G.settings.quality : null })
    .then(() => { glc.hidden = false; document.body.classList.add('g3'); G.dirty = true; refresh(); })
    .catch(() => { glc.hidden = true; G.dirty = true; });
}
// after the page's load event, so three.js and the asset scripts never hold up first paint or the hooks
if (gfxPref !== '2d' && webglAvailable()) {
  const go = () => setTimeout(() => requestAnimationFrame(start3d), 0);
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}
G.hooks.setQuality = (q) => { setQuality(q); G.dirty = true; };
G.hooks.thumb = (type) => (view.g3 ? thumb(type) : null);
void draw3d;
