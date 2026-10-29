// Terrain generation: east-west Ouachita-style ridges, a creek valley, rock outcrops and pine/oak woods.
import { makeRng, hash2 } from './rng.js';
import { K, MAXH, idx } from './state.js';

const HILLS = { gentle: 4.5, rolling: 7.5, steep: 10.5 };

function lattice(R, gw, gh) {
  const a = new Float32Array(gw * gh);
  for (let i = 0; i < a.length; i++) a[i] = R();
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => a[((j % gh) + gh) % gh * gw + (((i % gw) + gw) % gw)];
    const top = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
    const bot = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
    return top + (bot - top) * sy;
  };
}

export function genTerrain(S, { hills = 'rolling', seed = S.seed } = {}) {
  const { w, h } = S.map, M = S.map;
  const R = makeRng((seed * 7919 + 13) | 0);
  const n1 = lattice(R, 16, 16), n2 = lattice(R, 16, 16);
  const amp = HILLS[hills] || HILLS.rolling;
  const phase = R() * 6.28, creekMid = h * (0.36 + R() * 0.1);
  const gx = Math.floor(w * 0.5 + (R() - 0.5) * 6), gy = h - 1;
  M.gate = idx(S, gx, gy);
  const raw = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // ridges stretched along x (they run east-west)
    const n = 0.72 * n1(x / 11, y / 5.5) + 0.28 * n2(x / 4.5, y / 3);
    const cy = creekMid + 3 * Math.sin(x / 6 + phase);
    const d = Math.abs(y - cy);
    const valley = Math.min(1, d / 7);
    let v = (n * 1.25 - 0.1) * amp * (0.2 + 0.8 * valley);
    // the gate plaza is level and low so a new park can start building at once
    const gd = Math.hypot(x - gx, (y - gy) * 1.2);
    const gh = 1.5;
    if (gd < 9) v = gh + (v - gh) * Math.max(0, (gd - 3) / 6);
    raw[y * w + x] = v;
    if (d < 0.9) raw[y * w + x] = -1;
  }
  for (let i = 0; i < w * h; i++) {
    const v = raw[i];
    if (v < 0) { M.height[i] = 0; M.kind[i] = K.WATER; continue; }
    M.height[i] = Math.max(0, Math.min(MAXH, Math.round(v)));
    M.kind[i] = K.GRASS;
  }
  // creek banks never more than one level above the water
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (M.kind[i] === K.WATER) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      if (M.kind[Y * w + X] === K.WATER && M.height[i] > 1) M.height[i] = 1;
    }
  }
  // rock outcrops on steep spots, trees in the woods
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (M.kind[i] === K.WATER) continue;
    let steep = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      steep = Math.max(steep, Math.abs(M.height[Y * w + X] - M.height[i]));
    }
    if (steep >= 2 && hash2(x, y, seed) > 0.45) M.kind[i] = K.ROCK;
    const gd = Math.hypot(x - gx, y - gy);
    const p = 0.2 + 0.035 * M.height[i] + (gd < 7 ? -1 : 0);
    const r = hash2(x, y, seed + 1);
    if (r < p) {
      const t = hash2(x, y, seed + 2);
      M.tree[i] = t < 0.58 ? 1 : t < 0.88 ? 2 : t < 0.94 ? 3 : 4;
    }
  }
  // gate and entry walk
  const gh = M.height[M.gate];
  for (let k = 0; k < 3; k++) {
    const i = idx(S, gx, gy - k);
    M.path[i] = 1; M.tree[i] = 0; M.kind[i] = K.GRASS; M.height[i] = gh;
  }
}

export function hillsOf(hills) { return HILLS[hills] ? hills : 'rolling'; }
