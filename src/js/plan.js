// Layout helpers shared by scenario set-up, the balance tool's scripted players and the tutorial hints.
// They only call the same build actions the player uses.
import { idx, inb, K } from './state.js';
import { buildPath, terraform, placeCheck, place, sizeOf } from './build.js';
import { placeBlueprint, DIRS } from './track.js';
import { gateField, INF } from './fields.js';

// Lay a path tile by tile from (x0,y0) toward (x1,y1), terracing any step taller than one level.
export function smartPath(S, x0, y0, x1, y1) {
  const M = S.map;
  const run = [];
  const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  let x = x0, y = y0;
  run.push([x, y]);
  while (x !== x1) { x += sx; run.push([x, y]); }
  while (y !== y1) { y += sy; run.push([x, y]); }
  let prev = -1, n = 0;
  for (const [X, Y] of run) {
    if (!inb(S, X, Y)) break;
    const i = idx(S, X, Y);
    if (M.kind[i] === K.WATER || M.occ[i] || !M.owned[i]) break;
    if (prev >= 0) {
      let guard = 0;
      while (Math.abs(M.height[i] - M.height[prev]) > 1 && guard++ < 12) {
        const r = terraform(S, X, Y, M.height[i] > M.height[prev] ? -1 : 1);
        if (!r.ok) break;
      }
      if (Math.abs(M.height[i] - M.height[prev]) > 1) break;
    }
    if (!M.path[i]) buildPath(S, X, Y, X, Y);
    prev = i; n++;
  }
  return n;
}

export function gateXY(S) { const g = S.map.gate, w = S.map.w; return [g % w, Math.floor(g / w)]; }

// A main street north from the gate with side streets every `every` tiles.
export function mainStreet(S, len = 16, every = 5, side = 7) {
  const [gx, gy] = gateXY(S);
  const n = smartPath(S, gx, gy - 2, gx, gy - len);
  for (let k = every; k <= Math.min(len, n + 1); k += every) {
    smartPath(S, gx, gy - k, gx + side, gy - k);
    smartPath(S, gx, gy - k, gx - side, gy - k);
  }
  return n;
}

// Path tiles in walking order from the gate.
export function pathOrder(S) {
  const f = gateField(S), out = [];
  for (let i = 0; i < f.length; i++) if (f[i] !== INF && S.map.path[i]) out.push(i);
  out.sort((a, b) => f[a] - f[b] || a - b);
  return out;
}

// Place an object next to the nearest path tile where it fits with little grading.
export function autoPlace(S, type, opts = {}) {
  const n = sizeOf(type), w = S.map.w, maxLevels = opts.maxLevels ?? n * n * 1.5;
  const order = pathOrder(S);
  const skip = opts.skip || 0;
  for (let k = skip; k < order.length; k++) {
    const p = order[k], px = p % w, py = Math.floor(p / w);
    const cands = [];
    for (let j = 0; j < n; j++) cands.push([px + 1, py - j], [px - n, py - j], [px - j, py + 1], [px - j, py - n]);
    for (const [x, y] of cands) {
      const c = placeCheck(S, type, x, y);
      if (!c.ok || c.levels > maxLevels || Math.abs(c.h - S.map.height[p]) > 1) continue;
      const r = place(S, type, x, y, opts.extra || {});
      if (r.ok) return r;
    }
  }
  return { ok: false, reason: 'No room' };
}

// Place a blueprint coaster beside a path, trying both directions and mirrors.
export function autoBlueprint(S, bp, opts = {}) {
  const w = S.map.w, order = pathOrder(S);
  for (let k = opts.skip || 0; k < order.length; k++) {
    const p = order[k], px = p % w, py = Math.floor(p / w);
    for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const sx = px + ox, sy = py + oy;
      for (let d = 0; d < 4; d++) {
        const [dx, dy] = DIRS[d];
        if (dx === ox && dy === oy) continue;
        if (dx === -ox && dy === -oy) continue;
        for (const mirror of [false, true]) {
          const r = placeBlueprint(S, bp, sx, sy, d, mirror, { needEntry: true, ...opts });
          if (r.ok) return r;
        }
      }
    }
  }
  return { ok: false, reason: 'No room for the ride' };
}

// Scatter scenery beside paths (cheap trees and flowers).
export function autoScenery(S, n, types = ['trash', 'flowers', 'redbud', 'trash', 'bench', 'dogwood', 'trash', 'lamp']) {
  let placed = 0, t = 0;
  const order = pathOrder(S);
  for (let k = 0; k < order.length && placed < n; k += 3) {
    const r = autoPlace(S, types[t % types.length], { skip: k, maxLevels: 2 });
    if (r.ok) { placed++; t++; }
  }
  return placed;
}
