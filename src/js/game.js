// Game flow: new games, saves, scenes, tutorial checks, history-card collection.
import { G, store, loadJSON, saveProgress, toast } from './app.js';
import { serialize, deserialize, touchNet, touchObjects, HOUR } from './state.js';
import { newState, SCENARIOS } from './scenarios.js';
import { tick, act } from './sim.js';
import { view, centerOn } from './render.js';
import { factById } from './facts.js';
import { sfx } from './audio.js';
import { refreshEntries, derived } from './build.js';

export const SLOTS = ['auto', '1', '2', '3'];

export function startGame(opts = {}) {
  const S = newState(opts);
  G.S = S; G.sel = null; G.tool = 'inspect'; G.placeType = null; G.listing = null; G.panel = null; G.follow = false;
  G.paused = true; G.speed = 1;
  derived(S);
  G.savedMonths = 0;
  homeCamera();
  if (S.scenario.mode === 'campaign') {
    const sc = SCENARIOS.find((s) => s.id === S.scenario.id);
    for (const f of sc.facts) collect(f, true);
  }
  return S;
}
export function homeCamera() {
  const S = G.S, w = S.map.w, gx = S.map.gate % w, gy = Math.floor(S.map.gate / w);
  view.cam.z = view.W < 700 ? 0.9 : 1;
  centerOn(gx + 0.5, gy - 5, S.map.height[S.map.gate]);
}

export function runTicks(n) {
  const S = G.S;
  if (!S) return;
  for (let k = 0; k < n; k++) {
    if (!tick(S)) break;
    if (S.time % HOUR === 0) hourly();
  }
  afterTicks();
}
let lastRain = false;
function hourly() {
  const S = G.S;
  const rain = S.weather.kind === 'rain' || S.weather.kind === 'storm';
  if (rain && !lastRain && S.month === 1) collect('wet');
  lastRain = rain;
}
export function afterTicks() {
  const S = G.S;
  // surface new sim messages
  while (G.lastMsg < S.msgs.length) {
    const m = S.msgs[G.lastMsg++];
    toast(m.text, m.kind);
    if (m.kind === 'warn') sfx.error();
  }
  if (S.msgs.length < G.lastMsg) G.lastMsg = S.msgs.length;
  // autosave at every month end
  if (S.finance.months.length !== G.savedMonths) { autosave(); G.savedMonths = S.finance.months.length; }
  if (S.pending) {
    G.paused = true;
    if (S.pending.kind === 'winter') { autosave(); sfx.chime(); G.hooks.scene('winter'); }
    else if (S.pending.kind === 'win' || S.pending.kind === 'lose') finishScenario();
  }
  tutorialCheck();
}

function finishScenario() {
  const S = G.S, sc = S.scenario;
  if (sc.mode === 'campaign') {
    const prev = G.progress.stars[sc.id] || 0;
    if (sc.status === 'won') {
      G.progress.stars[sc.id] = Math.max(prev, sc.stars || 1);
      const bonus = { 1: 'gator', 2: 'ostrich', 3: 'iqzoo', 4: 'mtntower', 5: 'chicken', 6: 'epr' }[sc.id];
      if (bonus) collect(bonus);
    }
    saveProgress();
  }
  sc.status === 'won' ? sfx.fanfare() : sfx.sad();
  G.hooks.scene(sc.status === 'won' ? 'win' : 'lose');
}

// ---- history cards -------------------------------------------------------------------------
export function collect(id, quiet) {
  if (!factById(id) || G.progress.cards.includes(id)) return false;
  G.progress.cards.push(id); saveProgress();
  if (!quiet) toast(`New history card: ${factById(id).title}`, 'good');
  return true;
}
// Cards tied to things the player does.
export function onAction(name, a, r) {
  if (!r || !r.ok) return;
  if (name === 'hire') collect('teens');
  if (name === 'cooler' && a[0]) collect('cooler');
  if (name === 'place' && a[0] === 'chicken') collect('chicken');
  if (name === 'place' && ['wave', 'river', 'slides'].includes(a[0])) collect('watercal');
  if (name === 'place' && a[0] === 'tower') collect('mtntower');
  if (name === 'trackFinish' || name === 'blueprint') { const o = G.S.objects.find((x) => x.id === (r.id || (G.S.objects[G.S.objects.length - 1] || {}).id)); if (o && o.type === 'steel') collect('skyloop'); }
}

// ---- tutorial (scenario 1) -----------------------------------------------------------------
export const TUTORIAL = [
  { text: 'Welcome to 1978! Pick Paths (P) and drag from the gate up into the woods to lay at least 8 path tiles.', done: (S) => countPaths(S) >= 11 },
  { text: 'Open Rides and place a Spring Carousel beside your path. Its entrance must touch the path.', done: (S) => S.objects.some((o) => o.kind === 'ride' && o.entry >= 0) },
  { text: 'Guests get hungry. Open Shops and place Hickory BBQ next to the path.', done: (S) => S.objects.some((o) => o.kind === 'stall' && ['bbq', 'pizza', 'chicken', 'funnel'].includes(o.type) && o.entry >= 0) },
  { text: 'Add Restrooms and a Refill Bottles drink stand, also touching the path.', done: (S) => S.objects.some((o) => o.type === 'restroom' && o.entry >= 0) && S.objects.some((o) => ['refill', 'snocone'].includes(o.type) && o.entry >= 0) },
  { text: 'Press ▶ (or Space) to open for the day. The 2×, 4× and 8× buttons speed time up.', done: (S) => !G.paused && S.tick > 2 },
  { text: 'Add a thrill: Coasters → the Lumber Run blueprint drops a log flume beside a path. Or draw your own!', done: (S) => S.objects.some((o) => o.kind === 'track' && o.status === 'open') },
  { text: 'Watch the Guests panel for complaints and the Goals panel for your targets. Good luck!', done: () => G.panel === 'guests' || G.panel === 'goals' },
];
function countPaths(S) { let n = 0; for (const p of S.map.path) n += p; return n; }
export function tutorialCheck() {
  const S = G.S;
  if (!S || !S.tutorial) return;
  const st = TUTORIAL[S.tutorial.step];
  if (!st) return;
  if (st.done(S)) {
    S.tutorial.step++;
    sfx.bell();
    if (S.tutorial.step >= TUTORIAL.length) { S.tutorial = null; toast('Tutorial complete.', 'good'); }
    G.hooks.refresh();
  }
}

// ---- saves ---------------------------------------------------------------------------------
export function saveTo(slot) {
  const S = G.S;
  if (!S) return false;
  const rec = { v: 1, savedAt: Date.now(), name: S.park.name, label: `${S.scenario.title} · ${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][Math.min(6, S.month)]} ${S.year}`, state: serialize(S) };
  const ok = store.set('sct-save-' + slot, JSON.stringify(rec));
  return ok || !G.storageOk;
}
export function autosave() { saveTo('auto'); }
export function slotInfo(slot) {
  const rec = loadJSON('sct-save-' + slot, null);
  return rec ? { label: rec.label, savedAt: rec.savedAt, name: rec.name } : null;
}
export function loadFrom(slot) {
  const rec = loadJSON('sct-save-' + slot, null);
  if (!rec) return false;
  return loadState(deserialize(rec.state));
}
export function loadState(S) {
  G.S = S; G.sel = null; G.panel = null; G.tool = 'inspect'; G.paused = true;
  S._fields = null; touchNet(S); touchObjects(S); S._gmap = null;
  refreshEntries(S); derived(S);
  G.lastMsg = S.msgs.length; G.savedMonths = S.finance.months.length;
  homeCamera();
  return true;
}
export function latestSlot() {
  let best = null, t = -1;
  for (const s of SLOTS) { const i = slotInfo(s); if (i && i.savedAt > t) { t = i.savedAt; best = s; } }
  return best;
}

// Actions from the UI go through here so cards, sounds and redraws follow.
export function doAct(name, ...a) {
  const r = act(G.S, name, ...a);
  onAction(name, a, r);
  if (r && r.ok === false && r.reason) toast(r.reason, 'warn');
  afterTicks();
  G.dirty = true;
  return r;
}
