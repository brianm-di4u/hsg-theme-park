// Distance fields ("flow fields") on the path graph. One Dijkstra per destination, run backwards from
// the destination with directed step costs, cached until the path network changes (touchNet).
// Idea credits in SAMPLES.md: binary-heap Dijkstra (PathFinding.js), one field per goal (crowd flows).
export const INF = 65535;
export const COST_FLAT = 10, COST_UP = 18, COST_DOWN = 12;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];

export const fieldStats = { builds: 0, ms: 0 };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Can a walker step from tile a to its neighbour b?
export function linked(S, a, b) {
  const M = S.map;
  return M.path[a] && M.path[b] && Math.abs(M.height[a] - M.height[b]) <= 1;
}
export function stepCost(S, a, b) {
  const d = S.map.height[b] - S.map.height[a];
  return d > 0 ? COST_UP : d < 0 ? COST_DOWN : COST_FLAT;
}

let heap = new Float64Array(1024), hn = 0;
function hpush(v) {
  if (hn >= heap.length) { const nh = new Float64Array(heap.length * 2); nh.set(heap); heap = nh; }
  let i = hn++; heap[i] = v;
  while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; }
}
function hpop() {
  const top = heap[0]; hn--;
  if (hn > 0) {
    heap[0] = heap[hn]; let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1; let m = i;
      if (l < hn && heap[l] < heap[m]) m = l;
      if (r < hn && heap[r] < heap[m]) m = r;
      if (m === i) break;
      const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m;
    }
  }
  return top;
}

export function buildField(S, sources) {
  const t0 = now();
  const { w, h } = S.map, n = w * h, SH = 4096;
  const dist = new Uint16Array(n).fill(INF);
  hn = 0;
  for (const s of sources) if (s >= 0) { dist[s] = 0; hpush(s); }
  while (hn) {
    const v = hpop(), b = v % SH, d = (v - b) / SH;
    if (d > dist[b]) continue;
    const bx = b % w, by = (b - bx) / w;
    for (let k = 0; k < 4; k++) {
      const ax = bx + DX[k], ay = by + DY[k];
      if (ax < 0 || ay < 0 || ax >= w || ay >= h) continue;
      const a = ay * w + ax;
      if (!linked(S, a, b)) continue;
      const nd = d + stepCost(S, a, b);
      if (nd < dist[a]) { dist[a] = nd; hpush(nd * SH + a); }
    }
  }
  fieldStats.builds++; fieldStats.ms += now() - t0;
  return dist;
}

export function field(S, key, sources) {
  if (!S._fields) S._fields = new Map();
  let f = S._fields.get(key);
  if (!f) { f = buildField(S, sources); S._fields.set(key, f); }
  return f;
}
export const objField = (S, o) => field(S, 'o' + o.id, [o.entry]);
export const gateField = (S) => field(S, 'gate', [S.map.gate]);

// Next tile toward the field's zero from tile i (−1 if none). parity splits ties so crowds spread.
export function downhill(S, f, i, parity) {
  const w = S.map.w, x = i % w, y = (i - x) / w;
  let best = -1, bv = f[i];
  for (let kk = 0; kk < 4; kk++) {
    const k = (kk + parity) & 3;
    const X = x + DX[k], Y = y + DY[k];
    if (X < 0 || Y < 0 || X >= w || Y >= S.map.h) continue;
    const j = Y * w + X;
    if (f[j] < bv && linked(S, i, j)) { bv = f[j]; best = j; }
  }
  return best;
}

export function neighbours(S, i) {
  const w = S.map.w, x = i % w, y = (i - x) / w, out = [];
  for (let k = 0; k < 4; k++) {
    const X = x + DX[k], Y = y + DY[k];
    if (X < 0 || Y < 0 || X >= w || Y >= S.map.h) continue;
    const j = Y * w + X;
    if (linked(S, i, j)) out.push(j);
  }
  return out;
}

// Short breadth-first search for staff: path (list of tiles, excluding start) to the nearest tile
// satisfying pred within maxSteps, or null.
export function bfsPath(S, from, pred, maxSteps = 14) {
  const prev = new Map([[from, -1]]);
  let frontier = [from];
  for (let step = 0; step < maxSteps && frontier.length; step++) {
    const nextF = [];
    for (const i of frontier) {
      for (const j of neighbours(S, i)) {
        if (prev.has(j)) continue;
        prev.set(j, i);
        if (pred(j)) {
          const path = [j]; let p = i;
          while (p !== from) { path.push(p); p = prev.get(p); }
          return path.reverse();
        }
        nextF.push(j);
      }
    }
    frontier = nextF;
  }
  return null;
}
