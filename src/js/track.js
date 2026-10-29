// Track rides: a closed loop of cells, built one cell at a time from a three-cell station.
// Physics per cell from the energy model credited in SAMPLES.md (rollercoaster sample):
//   v² ← v² − 2g·Δz;  v² ← v²·(1 − k) − c;  lift cells hold v ≥ 3 m/s.
import { TRACKS, TRACK_NAMES } from './catalog.js';
import { K, idx, inb, spend, refund, msg, touchNet, touchObjects } from './state.js';
import { makeObject, refreshEntries } from './build.js';

export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const LEVEL_M = 3, CELL_M = 8, G = 9.8;
export const CELL_COST = 150, SUPPORT_COST = 25, LIFT_COST = 120, TURN_COST = 40;

const terr = (S, x, y) => S.map.height[idx(S, x, y)];

export function cellCost(S, ttype, c, turned) {
  const above = Math.max(0, c.h - terr(S, c.x, c.y));
  return CELL_COST + SUPPORT_COST * above + (c.lift ? LIFT_COST : 0) + (turned ? TURN_COST : 0) + (TRACKS[ttype].flume ? 40 : 0);
}

function freeCell(S, o, x, y) {
  if (!inb(S, x, y)) return 'Off the map';
  const i = idx(S, x, y), M = S.map;
  if (!M.owned[i]) return 'Not park land';
  if (M.path[i]) return 'Path in the way';
  if (M.occ[i]) return M.occ[i] === (o && o.id) ? 'Track already here' : 'Something is built here';
  return null;
}

export function stationCheck(S, ttype, x, y, dir) {
  const [dx, dy] = DIRS[dir], cells = [];
  for (let k = 0; k < 3; k++) {
    const X = x + dx * k, Y = y + dy * k;
    const bad = freeCell(S, null, X, Y);
    if (bad) return { ok: false, reason: bad };
    if (S.map.kind[idx(S, X, Y)] === K.WATER) return { ok: false, reason: 'Water' };
    cells.push({ x: X, y: Y, h: terr(S, X, Y), d: dir, lift: 0 });
  }
  // the loop needs a free cell behind the station to come home through, and one ahead to leave by
  for (const k of [-1, 3]) {
    const bad = freeCell(S, null, x + dx * k, y + dy * k);
    if (bad) return { ok: false, reason: k < 0 ? 'No room behind the station to close the loop' : 'No room ahead of the station' };
  }
  const hs = cells.map((c) => c.h), h = Math.max(...hs);
  if (h - Math.min(...hs) > 2) return { ok: false, reason: 'Too uneven for a station' };
  for (const c of cells) c.h = h;
  const cost = TRACKS[ttype].station + cells.reduce((s, c) => s + SUPPORT_COST * (h - terr(S, c.x, c.y)), 0);
  return { ok: true, cells, cost, h };
}

export function trackStart(S, ttype, x, y, dir) {
  if (!TRACKS[ttype]) return { ok: false, reason: 'Unknown track' };
  const c = stationCheck(S, ttype, x, y, dir);
  if (!c.ok) return c;
  const used = S.objects.filter((o) => o.type === ttype).length;
  const names = TRACK_NAMES[ttype];
  const name = names[used % names.length] + (used >= names.length ? ' ' + (Math.floor(used / names.length) + 1) : '');
  const o = makeObject(S, ttype, x, y, c.h, { cells: c.cells, dir0: dir, complete: false, status: 'building', cost: c.cost, name });
  for (const cell of c.cells) { const i = idx(S, cell.x, cell.y); S.map.occ[i] = o.id; S.map.tree[i] = 0; }
  S.objects.push(o);
  spend(S, 'construction', c.cost);
  S.trackBuild = { id: o.id };
  touchObjects(S); touchNet(S); refreshEntries(S);
  return { ok: true, id: o.id, cost: c.cost };
}

export function buildingTrack(S) {
  if (!S.trackBuild) return null;
  return S.objects.find((o) => o.id === S.trackBuild.id) || null;
}

// The cell that would come next for (slope, turn); closing = it lands on the station start correctly.
export function nextCell(S, o, slope, turn) {
  const last = o.cells[o.cells.length - 1];
  const d = (last.d + turn + 4) & 3;
  const [dx, dy] = DIRS[d];
  return { x: last.x + dx, y: last.y + dy, h: last.h + slope, d, lift: 0 };
}
export function addCheck(S, o, slope, turn, lift) {
  const T = TRACKS[o.type];
  if (o.complete) return { ok: false, reason: 'Track is complete' };
  if (slope < T.dmin || slope > T.dmax) return { ok: false, reason: 'Too steep for this ride' };
  if (Math.abs(turn) > 1) return { ok: false, reason: 'Bad turn' };
  const c = nextCell(S, o, slope, turn);
  c.lift = lift ? 1 : 0;
  const s0 = o.cells[0];
  if (c.x === s0.x && c.y === s0.y) {
    if (c.d === o.dir0 && c.h === s0.h) return { ok: true, close: true, cell: c, cost: 0 };
    return { ok: false, reason: c.h !== s0.h ? 'Must meet the station at its height' : 'Must enter the station straight' };
  }
  const bad = freeCell(S, o, c.x, c.y);
  if (bad) return { ok: false, reason: bad };
  const t = terr(S, c.x, c.y);
  if (c.h < t) return { ok: false, reason: 'Track would hit the ground' };
  if (c.h - t > T.maxAbove) return { ok: false, reason: 'Too high above the ground' };
  const last = o.cells[o.cells.length - 1];
  return { ok: true, cell: c, cost: cellCost(S, o.type, c, c.d !== last.d) };
}

export function trackAdd(S, slope, turn, lift) {
  const o = buildingTrack(S);
  if (!o) return { ok: false, reason: 'No track being built' };
  const r = addCheck(S, o, slope, turn, lift);
  if (!r.ok) return r;
  if (r.close) { o.complete = true; touchNet(S); return { ok: true, closed: true }; }
  o.cells.push(r.cell);
  S.map.occ[idx(S, r.cell.x, r.cell.y)] = o.id; S.map.tree[idx(S, r.cell.x, r.cell.y)] = 0;
  o.cost += r.cost; spend(S, 'construction', r.cost);
  touchNet(S);
  return { ok: true, cost: r.cost };
}

export function trackUndo(S) {
  const o = buildingTrack(S);
  if (!o) return { ok: false };
  if (o.complete) { o.complete = false; o.status = 'building'; o.stats = null; return { ok: true }; }
  if (o.cells.length <= 3) return { ok: false, reason: 'Only the station is left' };
  const c = o.cells.pop(), prev = o.cells[o.cells.length - 1];
  const back = cellCost(S, o.type, c, c.d !== prev.d);
  S.map.occ[idx(S, c.x, c.y)] = 0;
  o.cost -= back; refund(S, back);
  touchNet(S);
  return { ok: true };
}

// Shortest free route back to the cell behind the station, then heights spread along it.
export function autoRoute(S, o) {
  const T = TRACKS[o.type], s0 = o.cells[0], [ddx, ddy] = DIRS[o.dir0];
  const P = { x: s0.x - ddx, y: s0.y - ddy };
  const last = o.cells[o.cells.length - 1];
  const key = (x, y, d) => (y * S.map.w + x) * 4 + d;
  const start = key(last.x, last.y, last.d);
  const prev = new Map([[start, -1]]);
  let q = [[last.x, last.y, last.d]], goal = null;
  const canEnd = (d) => ((d - o.dir0 + 4) & 3) !== 2;
  if (last.x === P.x && last.y === P.y && canEnd(last.d)) goal = start;
  while (q.length && goal == null) {
    const nq = [];
    for (const [x, y, d] of q) {
      for (const turn of [0, 1, -1]) {
        const nd = (d + turn + 4) & 3, X = x + DIRS[nd][0], Y = y + DIRS[nd][1];
        const k = key(X, Y, nd);
        if (prev.has(k)) continue;
        const isP = X === P.x && Y === P.y;
        if (!isP && freeCell(S, o, X, Y)) continue;
        if (isP && freeCell(S, o, X, Y)) continue;
        prev.set(k, key(x, y, d));
        if (isP && canEnd(nd)) { goal = k; break; }
        nq.push([X, Y, nd]);
      }
      if (goal != null) break;
    }
    q = nq;
    if (prev.size > 20000) break;
  }
  if (goal == null) return null;
  const route = [];
  for (let k = goal; k !== start; k = prev.get(k)) {
    const d = k & 3, t = k >> 2; route.push({ x: t % S.map.w, y: Math.floor(t / S.map.w), d });
  }
  route.reverse();
  // heights: descend as fast as allowed, never below the ground or the station; climb with a lift
  let cur = last.h;
  const hs = s0.h;
  for (let i = 0; i < route.length; i++) {
    const c = route[i], t = terr(S, c.x, c.y);
    const remaining = route.length - 1 - i;
    let h = Math.max(t, hs, cur + T.dmin);
    if (h > cur + 1) return null; // a cliff we cannot climb
    c.lift = h > cur ? 1 : 0;
    if (h - hs > remaining * -T.dmin) return null; // cannot get back down in time
    if (h - t > T.maxAbove) return null;
    c.h = h; cur = h;
  }
  if (cur !== hs) return null;
  return route;
}

export function trackAuto(S) {
  const o = buildingTrack(S);
  if (!o || o.complete) return { ok: false, reason: 'Nothing to finish' };
  const route = autoRoute(S, o);
  if (!route) return { ok: false, reason: 'No free route back to the station' };
  let prev = o.cells[o.cells.length - 1], cost = 0;
  for (const c of route) {
    const cc = cellCost(S, o.type, c, c.d !== prev.d);
    o.cells.push(c); S.map.occ[idx(S, c.x, c.y)] = o.id; S.map.tree[idx(S, c.x, c.y)] = 0;
    cost += cc; prev = c;
  }
  o.cost += cost; spend(S, 'construction', cost);
  o.complete = true;
  touchNet(S);
  return { ok: true, cost, cells: route.length };
}

// ---- physics and ratings -----------------------------------------------------------------
export function simulate(S, o) {
  const T = TRACKS[o.type], cells = o.cells, n = cells.length;
  let v2 = 4;
  const speeds = new Array(n).fill(2);
  let fail = -1;
  for (let i = 1; i < n; i++) {
    const c = cells[i], p = cells[i - 1];
    const dz = (c.h - p.h) * LEVEL_M;
    v2 -= 2 * G * dz;
    const turned = c.d !== p.d;
    v2 = v2 * (1 - (turned ? 0.03 : 0.015)) - 0.5;
    if (c.lift) v2 = Math.max(v2, 9);
    if (i < 3) v2 = Math.max(v2, 4);
    if (v2 <= 0.25 && !c.lift) { fail = i; break; }
    speeds[i] = Math.sqrt(Math.max(v2, 0.25));
  }
  if (fail >= 0) return { ok: false, failAt: fail, speeds };
  let vmax = 0, drop = 0, run = 0, steep = 0, fastTurns = 0, air = 0, turns = 0, hug = 0, lift = 0, time = 0;
  for (let i = 0; i < n; i++) {
    const c = cells[i], p = cells[(i - 1 + n) % n], nx = cells[(i + 1) % n];
    const v = speeds[i];
    vmax = Math.max(vmax, v);
    const sl = c.h - p.h;
    if (sl < 0) { run += -sl; drop = Math.max(drop, run); } else run = 0;
    if (sl <= -2) steep++;
    if (c.d !== p.d) { turns++; if (v > 12) fastTurns++; }
    if (sl > 0 && !c.lift && nx.h < c.h && v > 8) air++;
    if (c.h - terr(S, c.x, c.y) <= 1) hug++;
    if (c.lift && sl > 0) lift += sl;
    time += CELL_M / Math.max(v, 1.5);
  }
  hug /= n;
  let int = 0.5 + 0.09 * vmax + 0.17 * drop + 0.25 * steep + 0.08 * fastTurns + 0.3 * air + (T.wood ? 0.5 : 0);
  int = Math.min(int, T.intCap);
  let thrill = 0.1 * vmax + 0.13 * drop + 0.3 * air + 0.08 * Math.min(turns, 16) + 0.15 * Math.min(n / 10, 8) + 0.6 * hug;
  if (int > 5.5) thrill -= 2 * (int - 5.5);
  if (T.flume) thrill += 1.0;
  thrill = Math.max(1, Math.round(thrill * 10) / 10);
  const stats = {
    cells: n, lengthFt: Math.round(n * 26), vmax: Math.round(vmax * 2.237), drop: drop * 10, steep, turns, fastTurns, air,
    hug: Math.round(hug * 100), liftFt: lift * 10, rideSec: Math.round(time), int: Math.round(int * 10) / 10, thrill,
  };
  return { ok: true, speeds, stats, time };
}

export function trackFinish(S) {
  const o = buildingTrack(S);
  if (!o) return { ok: false, reason: 'No track being built' };
  if (!o.complete) return { ok: false, reason: 'The track is not a closed loop yet' };
  const r = applyTest(S, o);
  if (!r.ok) return r;
  S.trackBuild = null;
  o.status = 'open';
  msg(S, `${o.name} passed its test run: ${r.stats.vmax} mph, intensity ${Math.max(1, Math.min(5, Math.round(r.stats.int)))}.`);
  touchNet(S); refreshEntries(S);
  return { ok: true, stats: r.stats };
}

export function applyTest(S, o) {
  const r = simulate(S, o);
  if (!r.ok) {
    o.status = 'testfail'; o.failAt = r.failAt;
    msg(S, `Test run failed: the train stalls at cell ${r.failAt + 1}. Add a lift or lower that hill.`, 'warn');
    return { ok: false, reason: `The train stalls at cell ${r.failAt + 1}`, failAt: r.failAt };
  }
  o.failAt = -1;
  o.stats = r.stats;
  o.int = Math.max(1, Math.min(5, Math.round(r.stats.int)));
  o.thrill = r.stats.thrill;
  o.seats = TRACKS[o.type].seats;
  o.cycle = Math.round(8 + r.time * 0.6);
  // cumulative time profile for drawing the train
  let acc = 0; o.prof = [];
  for (let i = 0; i < o.cells.length; i++) { o.prof.push(acc); acc += CELL_M / Math.max(r.speeds[i], 1.5); }
  o.prof = o.prof.map((t) => Math.round((t / acc) * 1000) / 1000);
  return { ok: true, stats: r.stats };
}

// Pump upkeep for flumes: +$30/month per level of lift.
export function trackUpkeep(o) {
  const T = TRACKS[o.type];
  let u = T.upkeep + o.cells.length * 6;
  if (T.flume && o.stats) u += 3 * o.stats.liftFt;
  return u;
}

// ---- blueprints ------------------------------------------------------------------------
// Each is a station plus [turn, slope, lift] commands; auto-finish closes the loop.
export const BLUEPRINTS = {
  littlebear: { name: 'Little Bear (family coaster)', ttype: 'family', cmds: [[0, 0, 0], [0, 1, 1], [0, 1, 1], [1, 0, 0], [0, -1, 0], [0, 0, 0], [1, 0, 0], [0, -1, 0], [0, 0, 0]] },
  lumber: { name: 'Lumber Run (log flume)', ttype: 'flume', cmds: [[0, 0, 0], [0, 1, 1], [0, 1, 1], [0, 1, 1], [1, 0, 0], [0, 0, 0], [0, -1, 0], [1, 0, 0], [0, 0, 0], [0, -2, 0], [0, 0, 0]] },
  ridge: { name: 'Ridge Runner (wooden coaster)', ttype: 'wood', cmds: [[0, 0, 0], [0, 1, 1], [0, 1, 1], [0, 1, 1], [0, 1, 1], [0, 1, 1], [1, 0, 0], [0, -2, 0], [0, -2, 0], [0, -1, 0], [0, 1, 0], [0, -1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 0]] },
  screamer: { name: 'Ridge Screamer (steel coaster)', ttype: 'steel', cmds: [[0, 0, 0], [0, 1, 1], [0, 1, 1], [0, 1, 1], [0, 1, 1], [0, 1, 1], [0, 1, 1], [0, 1, 1], [1, 0, 0], [0, -3, 0], [0, -3, 0], [0, -1, 0], [0, 1, 0], [0, -1, 0], [1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 0], [1, 0, 0], [0, 0, 0]] },
};

// Place a blueprint as one transaction: everything or nothing.
export function placeBlueprint(S, bpId, x, y, dir, mirror = false, opts = {}) {
  const bp = BLUEPRINTS[bpId];
  if (!bp) return { ok: false, reason: 'Unknown blueprint' };
  const snap = JSON.stringify(S.finance), nextId = S.nextId, prevBuild = S.trackBuild, nMsgs = S.msgs.length;
  const r0 = trackStart(S, bp.ttype, x, y, dir);
  if (!r0.ok) return r0;
  const o = buildingTrack(S);
  const undo = (reason) => {
    for (const c of o.cells) S.map.occ[idx(S, c.x, c.y)] = 0;
    S.objects.splice(S.objects.indexOf(o), 1);
    S.finance = JSON.parse(snap); S.nextId = nextId; S.trackBuild = prevBuild; S.msgs.length = Math.min(S.msgs.length, nMsgs);
    touchObjects(S); touchNet(S); refreshEntries(S);
    return { ok: false, reason };
  };
  for (const [turn, slope, lift] of bp.cmds) {
    const r = trackAdd(S, slope, mirror ? -turn : turn, lift);
    if (!r.ok) return undo(r.reason);
    if (r.closed) break;
  }
  if (!o.complete) { const a = trackAuto(S); if (!a.ok) return undo(a.reason); }
  const t = trackFinish(S);
  if (!t.ok) return undo(t.reason);
  if (opts.needEntry && o.entry < 0) return undo('No path within a level of the station');
  if (opts.cost != null) {
    // a used-ride purchase replaces the build cost with the listing price
    const built = o.cost; refund(S, built); spend(S, 'construction', opts.cost); o.cost = opts.cost;
  }
  if (opts.rel != null) { o.rel = opts.rel; o.relBase = opts.rel; }
  if (opts.name) o.name = opts.name;
  return { ok: true, id: o.id, stats: o.stats };
}
