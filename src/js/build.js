// Building: paths, terraform, placing objects (with grading), entries, demolish, derived tile maps.
import { RIDES, STALLS, SCENERY, SPECIAL, TRACKS, def, kindOf } from './catalog.js';
import { K, MAXH, idx, inb, spend, refund, msg, touchNet, touchObjects, objById } from './state.js';

export const PATH_COST = 12, TREE_COST = 20, GRADE_COST = 40, ROCK_COST = 20;

export function isUnlocked(S, type) {
  const sc = S.scenario;
  if (!sc || sc.allUnlocked) return true;
  return S.park.research.unlocked.includes(type);
}

const free = (S, i) => S.map.owned[i] && !S.map.path[i] && !S.map.occ[i];

// ---- paths -------------------------------------------------------------------------------
// The tiles of an L-shaped run: along x first, then along y.
export function pathRun(x0, y0, x1, y1) {
  const out = [];
  const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  let x = x0, y = y0;
  out.push([x, y]);
  while (x !== x1) { x += sx; out.push([x, y]); }
  while (y !== y1) { y += sy; out.push([x, y]); }
  return out;
}
export function pathCheck(S, x, y) {
  if (!inb(S, x, y)) return 'Off the map';
  const i = idx(S, x, y), M = S.map;
  if (!M.owned[i]) return 'Not park land';
  if (M.kind[i] === K.WATER) return 'Water';
  if (M.occ[i]) return 'Something is built here';
  return null;
}
export function pathCost(S, run) {
  let c = 0;
  for (const [x, y] of run) {
    if (pathCheck(S, x, y)) continue;
    const i = idx(S, x, y);
    if (S.map.path[i]) continue;
    c += PATH_COST + (S.map.tree[i] ? TREE_COST : 0);
  }
  return c;
}
export function buildPath(S, x0, y0, x1, y1) {
  const run = pathRun(x0, y0, x1, y1);
  let built = 0, cost = 0, failed = 0;
  for (const [x, y] of run) {
    if (pathCheck(S, x, y)) { failed++; continue; }
    const i = idx(S, x, y);
    if (S.map.path[i]) continue;
    const c = PATH_COST + (S.map.tree[i] ? TREE_COST : 0);
    S.map.path[i] = 1; S.map.tree[i] = 0;
    cost += c; built++;
  }
  if (cost) spend(S, 'construction', cost);
  if (built) { touchNet(S); refreshEntries(S); }
  return { built, cost, failed };
}

// ---- terraform ---------------------------------------------------------------------------
export function terraformCheck(S, x, y, d) {
  if (!inb(S, x, y)) return 'Off the map';
  const i = idx(S, x, y), M = S.map;
  if (!M.owned[i]) return 'Not park land';
  if (M.occ[i]) return 'Something is built here';
  if (M.kind[i] === K.WATER) return 'Water';
  const nh = M.height[i] + d;
  if (nh < 0 || nh > MAXH) return 'Too high or low';
  return null;
}
export function terraform(S, x, y, d) {
  const bad = terraformCheck(S, x, y, d);
  if (bad) return { ok: false, reason: bad };
  const i = idx(S, x, y), M = S.map;
  const cost = GRADE_COST + (M.kind[i] === K.ROCK ? ROCK_COST : 0) + (M.tree[i] ? TREE_COST : 0);
  M.height[i] += d; M.tree[i] = 0;
  if (M.kind[i] === K.ROCK && d < 0) M.kind[i] = K.GRASS;
  spend(S, 'construction', cost);
  touchNet(S); refreshEntries(S);
  return { ok: true, cost };
}

// ---- objects -----------------------------------------------------------------------------
export function sizeOf(type) { const d = def(type); return (d && d.size) || 1; }

// Check a footprint with top-left (x, y). Grading flattens it to the median height.
export function placeCheck(S, type, x, y) {
  const d = def(type), n = sizeOf(type), M = S.map;
  if (!d) return { ok: false, reason: 'Unknown item' };
  if (!isUnlocked(S, type)) return { ok: false, reason: 'Not researched yet' };
  const hs = [];
  let trees = 0, rock = 0;
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) {
    const X = x + dx, Y = y + dy;
    if (!inb(S, X, Y)) return { ok: false, reason: 'Off the map' };
    const i = idx(S, X, Y);
    if (!M.owned[i]) return { ok: false, reason: 'Not park land' };
    if (M.kind[i] === K.WATER) return { ok: false, reason: 'Water' };
    if (M.path[i]) return { ok: false, reason: 'Path in the way' };
    if (M.occ[i]) return { ok: false, reason: 'Something is built here' };
    hs.push(M.height[i]); if (M.tree[i]) trees++; if (M.kind[i] === K.ROCK) rock++;
  }
  hs.sort((a, b) => a - b);
  const h = hs[hs.length >> 1];
  const levels = hs.reduce((s, v) => s + Math.abs(v - h), 0);
  const grade = levels * GRADE_COST + rock * ROCK_COST;
  const base = d.cost;
  const cost = base + grade + trees * TREE_COST;
  return { ok: true, cost, grade, levels, h, n };
}

export function makeObject(S, type, x, y, h, extra = {}) {
  const d = def(type), kind = kindOf(type);
  const o = {
    id: S.nextId++, type, kind, x, y, n: sizeOf(type), h, built: S.tick, age: 0,
    entry: -1, status: 'open', price: d.price || 0, cost: d.cost || 0,
    name: d.name,
    ...extra,
  };
  if (kind === 'ride' || kind === 'track') Object.assign(o, {
    queue: [], riders: [], phase: 'load', timer: 0, loadT: 0, totalRiders: 0, income: 0,
    rel: d.rel, relBase: d.rel, lastInspect: S.tick, broken: 0, brokenAt: 0, mech: 0, cycles: 0, monthRiders: 0,
  });
  if (kind === 'stall') Object.assign(o, { sales: 0, income: 0, monthSales: 0 });
  if (kind === 'special') Object.assign(o, { shows: 0, income: 0 });
  return o;
}

export function place(S, type, x, y, extra = {}) {
  const c = placeCheck(S, type, x, y);
  if (!c.ok) return c;
  const M = S.map, o = makeObject(S, type, x, y, c.h, extra);
  if (extra.cost != null) c.cost = c.cost - def(type).cost + extra.cost;
  for (let dy = 0; dy < c.n; dy++) for (let dx = 0; dx < c.n; dx++) {
    const i = idx(S, x + dx, y + dy);
    M.height[i] = c.h; M.tree[i] = 0; if (M.kind[i] === K.ROCK) M.kind[i] = K.GRASS;
    M.occ[i] = o.id;
  }
  S.objects.push(o);
  spend(S, 'construction', c.cost);
  o.cost = c.cost - c.grade;
  touchObjects(S); touchNet(S); refreshEntries(S);
  return { ok: true, id: o.id, cost: c.cost, obj: o };
}

// Footprint tiles of an object (tracks use their cells).
export function tilesOf(S, o) {
  if (o.cells) return o.cells.map((c) => idx(S, c.x, c.y));
  const out = [];
  for (let dy = 0; dy < o.n; dy++) for (let dx = 0; dx < o.n; dx++) out.push(idx(S, o.x + dx, o.y + dy));
  return out;
}

// The entry is the first path tile touching the footprint (station cells for tracks) within 1 level.
// Front edges (+y, +x: the sides that face the viewer) are tried first.
export function findEntry(S, o) {
  const M = S.map, w = M.w;
  const cand = [];
  if (o.cells) {
    for (let k = 0; k < Math.min(3, o.cells.length); k++) {
      const c = o.cells[k];
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) cand.push([c.x + dx, c.y + dy, c.h]);
    }
  } else {
    const n = o.n;
    for (let k = 0; k < n; k++) cand.push([o.x + k, o.y + n, o.h]);
    for (let k = 0; k < n; k++) cand.push([o.x + n, o.y + k, o.h]);
    for (let k = 0; k < n; k++) cand.push([o.x - 1, o.y + k, o.h]);
    for (let k = 0; k < n; k++) cand.push([o.x + k, o.y - 1, o.h]);
  }
  for (const [x, y, h] of cand) {
    if (!inb(S, x, y)) continue;
    const i = y * w + x;
    if (M.path[i] && Math.abs(M.height[i] - h) <= 1) return i;
  }
  return -1;
}
export function refreshEntries(S) {
  for (const o of S.objects) {
    if (o.kind === 'scenery' && !SCENERY[o.type].bin) continue;
    const e = findEntry(S, o);
    if (e !== o.entry) { o.entry = e; touchNet(S); }
  }
  S._derivedVer = -1;
}

// Remove whatever is at a tile: an object (refund 50%) or a path (refund 50%).
export function demolishAt(S, x, y, ejectGuest) {
  if (!inb(S, x, y)) return { ok: false };
  const i = idx(S, x, y), M = S.map;
  if (M.occ[i]) return demolish(S, M.occ[i], ejectGuest);
  if (M.path[i]) {
    if (i === M.gate || i === M.gate - M.w || i === M.gate - 2 * M.w) return { ok: false, reason: 'The entrance walk stays' };
    M.path[i] = 0; refund(S, PATH_COST / 2);
    // guests standing here step back to the nearest path or the gate
    for (const g of S.guests) if (g.ti === i && ejectGuest) ejectGuest(g);
    touchNet(S); refreshEntries(S);
    return { ok: true, kind: 'path' };
  }
  return { ok: false };
}
export function demolish(S, id, ejectGuest) {
  const o = objById(S, id);
  if (!o) return { ok: false };
  if (S.trackBuild && S.trackBuild.id === id) S.trackBuild = null;
  const back = Math.round((o.cost || 0) / 2);
  refund(S, back);
  for (const t of tilesOf(S, o)) S.map.occ[t] = 0;
  if (o.queue) for (const gid of [...o.queue, ...o.riders]) ejectGuest && ejectGuest(gid, o);
  S.objects.splice(S.objects.indexOf(o), 1);
  touchObjects(S); touchNet(S); refreshEntries(S);
  msg(S, `${o.name} demolished. Refund $${back.toLocaleString('en-US')}.`);
  return { ok: true, refund: back };
}
export function leaveStanding(S, id, ejectGuest) {
  const o = objById(S, id);
  if (!o || !o.queue) return { ok: false };
  for (const gid of [...o.queue, ...o.riders]) ejectGuest && ejectGuest(gid, o);
  o.queue = []; o.riders = [];
  o.status = 'standing'; o.broken = 0;
  msg(S, `${o.name} is now left standing as a landmark.`);
  touchNet(S);
  return { ok: true };
}

// ---- derived tile maps: trash-can cover, scenery value near paths ----------------------------
export function derived(S) {
  const ver = S._netVer || 0;
  if (S._derivedVer === ver && S._bin) return S;
  const { w, h } = S.map, n = w * h;
  const bin = new Uint8Array(n), scen = new Float32Array(n), lamp = new Uint8Array(n);
  for (const o of S.objects) {
    let sv = 0, isBin = false, isLamp = false;
    if (o.kind === 'scenery') { const d = SCENERY[o.type]; sv = d.sv; isBin = !!d.bin; isLamp = !!d.lamp; }
    else if (o.kind === 'stall' && STALLS[o.type].sv) sv = STALLS[o.type].sv;
    else if (o.status === 'standing') sv = 3;
    if (!sv && !isBin && !isLamp) continue;
    const r = isBin ? 2 : 2;
    for (let y = Math.max(0, o.y - r); y <= Math.min(h - 1, o.y + o.n - 1 + r); y++)
      for (let x = Math.max(0, o.x - r); x <= Math.min(w - 1, o.x + o.n - 1 + r); x++) {
        const i = y * w + x;
        if (isBin) bin[i] = 1;
        if (isLamp) lamp[i] = 1;
        scen[i] += sv;
      }
  }
  // natural scenery: trees near paths count a little
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!S.map.tree[i]) continue;
    for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
      for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) scen[yy * w + xx] += 0.25;
  }
  S._bin = bin; S._scen = scen; S._lamp = lamp; S._derivedVer = ver;
  return S;
}

export { RIDES, STALLS, SCENERY, SPECIAL, TRACKS };
