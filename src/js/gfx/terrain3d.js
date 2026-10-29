// Park terrain, creek, paths and the real-terrain backdrop for the 3D view.
// The sim's tiles are flat at integer levels. Here "natural" tiles share their corner heights with neighbours
// within one level, so rolling ground reads as slopes; graded pads, paths and footprints stay flat and get
// stone retaining walls. Every tile centre stays at its sim height, so guests, supports and trees line up.
import { K } from '../state.js';
import { hash2 } from '../rng.js';
import { Geo, LH, lin, mix, mul } from './geo.js';

const SEASON_GRASS = ['#7A9E4C', '#6A9242', '#62883E', '#5F833C', '#68843E', '#768844', '#848648'];
const SEASON_FOREST = [ // deciduous canopy by month (Apr..Oct): spring green, summer, early fall
  ['#7FA24E', '#93B45C'], ['#5C8A3E', '#6E9A48'], ['#4E7A36', '#5C8840'], ['#4C7634', '#5A843E'], ['#55783A', '#6A8240'], ['#6E7E3E', '#8A7A3A'], ['#9A6A2E', '#B8562A'],
];
const PINE = '#2E5230', PINE2 = '#3A6036';

// ---------- corner heights ----------------------------------------------------------------------
// hard tiles (paths, anything built, water) stay flat; natural tiles average with neighbours ≤ 1 level away
// built-on tiles: paths and anything placed, except coaster track (its supports stand on natural ground)
export function builtMask(S) {
  const M = S.map, out = new Uint8Array(M.w * M.h), track = new Set();
  for (const o of S.objects) if (o.cells) track.add(o.id);
  for (let i = 0; i < out.length; i++) out[i] = M.path[i] || (M.occ[i] && !track.has(M.occ[i])) ? 1 : 0;
  return out;
}
export function cornerHeights(S, B) {
  const M = S.map, w = M.w, h = M.h, out = new Float32Array(w * h * 4);
  const isHard = (i) => B[i] || M.kind[i] === K.WATER;
  const H = (x, y) => M.height[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, hi = M.height[i];
    const C = [[0, 0], [1, 0], [1, 1], [0, 1]];
    if (M.kind[i] === K.WATER) {
      // the bed shoals up at corners shared with dry land, so the shoreline cuts diagonally instead of in steps
      for (let k = 0; k < 4; k++) {
        const cx = x + C[k][0], cy = y + C[k][1]; let wet = 0, n = 0;
        for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const X = cx + ox, Y = cy + oy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; n++; if (M.kind[Y * w + X] === K.WATER) wet++; }
        out[i * 4 + k] = hi - (wet >= n ? 0.55 : wet >= 3 ? 0.36 : wet === 2 ? 0.2 : 0.02);
      }
      continue;
    }
    if (isHard(i)) { out.fill(hi, i * 4, i * 4 + 4); continue; }
    for (let k = 0; k < 4; k++) {
      const cx = x + C[k][0], cy = y + C[k][1];
      let s = 0, n = 0, hard = null;
      for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const X = cx + ox, Y = cy + oy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const j = Y * w + X, v = H(X, Y);
        // a corner shared with a path or a built pad meets it exactly (an embankment instead of a wall) within 2 levels
        if (B[j] && M.kind[j] !== K.WATER && Math.abs(v - hi) <= 2 && (hard == null || Math.abs(v - hi) < Math.abs(hard - hi))) hard = v;
        if (Math.abs(v - hi) <= 2 && M.kind[j] !== K.WATER) { s += v; n++; }
      }
      out[i * 4 + k] = hard != null ? hard : n ? s / n : hi;
    }
  }
  return out;
}

// world height (y) of the ground at a point inside tile (x, y), from the tile's fan of four triangles
export function groundY(S, CH, fx, fz) {
  const M = S.map, w = M.w;
  const x = Math.max(0, Math.min(w - 1, Math.floor(fx))), y = Math.max(0, Math.min(M.h - 1, Math.floor(fz)));
  const i = y * w + x, u = fx - x, v = fz - y, c = M.height[i];
  const a = CH[i * 4], b = CH[i * 4 + 1], cc = CH[i * 4 + 2], d = CH[i * 4 + 3];
  // bilinear of the corners blended toward the centre value (close to the fan without a branchy triangle test)
  const bil = a * (1 - u) * (1 - v) + b * u * (1 - v) + cc * u * v + d * (1 - u) * v;
  const t = 1 - Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
  return (bil + (c - bil) * t) * LH;
}

// ---------- park terrain mesh -------------------------------------------------------------------
export function buildTerrain(S, CH, B) {
  const M = S.map, w = M.w, h = M.h, g = new Geo();
  const grass = lin(SEASON_GRASS[S.month] || SEASON_GRASS[2]);
  const dirt = lin('#8A6E4E'), sand = lin('#B09470'), sand2 = lin('#9A7E5C'), novac = lin('#B4AEA2'), novac2 = lin('#9E988C');
  const stone = lin('#9C9284'), stone2 = lin('#857C70'), bed = lin('#6E5E46'), moss = lin('#5E7A40'), litter = lin('#7A6A3E'), litter2 = lin('#6A6034');
  const top = (x, y, i) => {
    const kind = M.kind[i];
    let c;
    if (kind === K.WATER) c = bed;
    else if (kind === K.ROCK) c = mix(mul(grass, 0.9), mix(novac, novac2, hash2(i, 3)), 0.42); // thin soil and lichen around the boulders
    else {
      c = mul(grass, 0.97 + hash2(i, 7) * 0.04 + M.height[i] * 0.008);
      // woods: leaf litter and pine straw on the floor; open ground stays grassy
      let wood = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && M.tree[Y * w + X]) wood += dx || dy ? 0.14 : 0.44; }
      c = mix(c, mix(litter, litter2, hash2(i, 9)), Math.min(0.8, wood));
      if (B[i]) c = mix(c, dirt, 0.25);
    }
    if (!M.owned[i]) c = mix(mul(c, 0.82), lin('#6A6A50'), 0.2);
    return c;
  };
  const C = [[0, 0], [1, 0], [1, 1], [0, 1]];
  // tile colours, then corner colours averaged over the natural tiles that share the corner, so leaf litter and
  // grass blend across tiles instead of showing the grid
  const TC = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) TC[y * w + x] = top(x, y, y * w + x);
  const cornerCol = (x, y, k, i) => {
    if (B[i] || M.kind[i] !== K.GRASS) return TC[i];
    const cx = x + C[k][0], cy = y + C[k][1], acc = [0, 0, 0]; let n = 0;
    for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const X = cx + ox, Y = cy + oy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const j = Y * w + X; if (B[j] || M.kind[j] !== K.GRASS || Math.abs(M.height[j] - M.height[i]) > 1) continue;
      acc[0] += TC[j][0]; acc[1] += TC[j][1]; acc[2] += TC[j][2]; n++;
    }
    return n ? [acc[0] / n, acc[1] / n, acc[2] / n] : TC[i];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, hc = M.height[i] - (M.kind[i] === K.WATER ? 0.55 : 0), col = TC[i];
    const p = C.map(([ox, oy], k) => [x + ox, CH[i * 4 + k] * LH, y + oy]);
    const ctr = [x + 0.5, hc * LH, y + 0.5];
    // corner shading: lower corners than the tile (hollows, cliff feet) darker, crests lighter
    const cc = p.map((q, k) => mul(cornerCol(x, y, k, i), Math.max(0.8, Math.min(1.06, 1 + (CH[i * 4 + k] - hc) * 0.06))));
    const cm = B[i] || M.kind[i] !== K.GRASS ? col : [(cc[0][0] + cc[1][0] + cc[2][0] + cc[3][0]) / 4 * 0.5 + col[0] * 0.5, (cc[0][1] + cc[1][1] + cc[2][1] + cc[3][1]) / 4 * 0.5 + col[1] * 0.5, (cc[0][2] + cc[1][2] + cc[2][2] + cc[3][2]) / 4 * 0.5 + col[2] * 0.5];
    g.triN(ctr, p[1], p[0], [0, 1, 0], [0, 1, 0], [0, 1, 0], cm, cc[1], cc[0]);
    g.triN(ctr, p[2], p[1], [0, 1, 0], [0, 1, 0], [0, 1, 0], cm, cc[2], cc[1]);
    g.triN(ctr, p[3], p[2], [0, 1, 0], [0, 1, 0], [0, 1, 0], cm, cc[3], cc[2]);
    g.triN(ctr, p[0], p[3], [0, 1, 0], [0, 1, 0], [0, 1, 0], cm, cc[0], cc[3]);
  }
  // tile tops: flat normals softened toward up, then averaged per shared vertex so slopes shade smoothly
  smoothTopNormals(g);
  smoothByPosition(g, 3);
  // walls between tiles whose shared edges differ, and down the map edge
  const wall = (ax, az, bx, bz, ya0, ya1, yb0, yb1, hard, rock) => {
    // quad from edge A (ya0..ya1 along the edge) down/up to edge B; skip if flush
    if (Math.abs(ya0 - yb0) < 1e-3 && Math.abs(ya1 - yb1) < 1e-3) return;
    const hiA = ya0 + ya1 > yb0 + yb1;
    const tA = [ax, ya0, az], tB = [bx, ya1, bz], bA = [ax, yb0, az], bB = [bx, yb1, bz];
    const diff = Math.max(Math.abs(ya0 - yb0), Math.abs(ya1 - yb1)) / LH;
    let cTop, cBot;
    if (hard) { cTop = stone; cBot = stone2; }
    else if (rock) { cTop = novac; cBot = novac2; }
    else if (diff < 0.6) { cTop = mul(grass, 0.8); cBot = mix(grass, dirt, 0.5); }
    else { cTop = mix(sand, moss, 0.25); cBot = sand2; }
    // strata: alternate bands by world height
    const band = (y) => ((Math.floor(y / (LH * 0.5)) & 1) ? 0.92 : 1);
    const ct = (y, c) => mul(c, band(y));
    // this winding always faces the lower side
    const ca = hiA ? cTop : cBot, cb = hiA ? cBot : cTop;
    g.quad(tA, tB, bB, bA, ct(ya0, ca), ct(ya1, ca), ct(yb1, cb), ct(yb0, cb));
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const hardA = !!B[i] && M.kind[i] !== K.WATER;
    if (x + 1 < w) {
      const j = i + 1, hard = hardA || (!!B[j] && M.kind[j] !== K.WATER);
      wall(x + 1, y, x + 1, y + 1, CH[i * 4 + 1] * LH, CH[i * 4 + 2] * LH, CH[j * 4] * LH, CH[j * 4 + 3] * LH, hard, M.kind[i] === K.ROCK || M.kind[j] === K.ROCK);
    }
    if (y + 1 < h) {
      const j = i + w, hard = hardA || (!!B[j] && M.kind[j] !== K.WATER);
      wall(x + 1, y + 1, x, y + 1, CH[i * 4 + 2] * LH, CH[i * 4 + 3] * LH, CH[j * 4 + 1] * LH, CH[j * 4] * LH, hard, M.kind[i] === K.ROCK || M.kind[j] === K.ROCK);
    }
  }
  return g;
}
// top fan normals: average the four triangle normals per tile into the shared centre and keep corners per face
function smoothTopNormals(g) {
  const P = g.p, N = g.n;
  for (let t = 0; t < P.length; t += 9) {
    const ax = P[t], ay = P[t + 1], az = P[t + 2], bx = P[t + 3], by = P[t + 4], bz = P[t + 5], cx = P[t + 6], cy = P[t + 7], cz = P[t + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    // soften toward up so 1-level slopes don't look faceted
    const sx = nx * 0.7, sy = ny * 0.7 + 0.3, sz = nz * 0.7, sl = Math.hypot(sx, sy, sz);
    for (let k = 0; k < 3; k++) { N[t + k * 3] = sx / sl; N[t + k * 3 + 1] = sy / sl; N[t + k * 3 + 2] = sz / sl; }
  }
}

// ---------- creek water surface ------------------------------------------------------------------
export function buildWater(S) {
  const M = S.map, w = M.w, h = M.h, g = new Geo();
  const col = lin('#2E8A86');
  const wet = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && M.kind[Y * w + X] === K.WATER;
  // each water-surface corner slides toward the wet tiles around it, so convex shore corners cut diagonally and the
  // creek reads as a winding channel instead of a staircase (a function of the corner only, so tiles stay seamless)
  const corner = (cx, cy) => {
    let n = 0, tx = 0, ty = 0;
    for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (wet(cx + ox, cy + oy)) { n++; tx += cx + ox + 0.5; ty += cy + oy + 0.5; }
    const f = n >= 4 ? 0 : n === 3 ? 0.2 : n === 2 ? 0.0 : 0.75;
    return [cx + (tx / n - cx) * f, cy + (ty / n - cy) * f];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (M.kind[i] !== K.WATER) continue;
    const yy = (M.height[i] - 0.18) * LH;
    const a = corner(x, y), b = corner(x, y + 1), c = corner(x + 1, y + 1), d = corner(x + 1, y);
    g.quad([a[0], yy, a[1]], [b[0], yy, b[1]], [c[0], yy, c[1]], [d[0], yy, d[1]], col);
  }
  return g;
}

// ---------- paths, stairs, curbs ------------------------------------------------------------------
export function buildPaths(S) {
  const M = S.map, w = M.w, h = M.h, g = new Geo();
  const pave = lin('#CDBF9F'), pave2 = lin('#C2B391'), curb = lin('#8E8676'), gate = lin('#D8CCB0'), step = lin('#B5A88C');
  const e = 0.1, th = 0.035;
  const conn = (i, j) => M.path[j] && Math.abs(M.height[j] - M.height[i]) <= 1;
  // ride entrances are queue pens: red brick paving so lines read apart from walkways
  const queue = new Set(), brick = lin('#A65A44'), brick2 = lin('#94503C');
  for (const o of S.objects) if ((o.kind === 'ride' || o.kind === 'track' || o.kind === 'special') && o.entry >= 0) queue.add(o.entry);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!M.path[i]) continue;
    const hh = M.height[i], Y = hh * LH + th;
    const col = i === M.gate ? gate : queue.has(i) ? mix(brick, brick2, hash2(i, 5)) : mix(pave, pave2, hash2(i, 5));
    const nb = [[1, 0, x + 1 < w ? i + 1 : -1], [-1, 0, x > 0 ? i - 1 : -1], [0, 1, y + 1 < h ? i + w : -1], [0, -1, y > 0 ? i - w : -1]];
    const c = nb.map(([, , j]) => j >= 0 && conn(i, j));
    const same = nb.map(([, , j], k) => c[k] && M.height[j] === hh);
    // centre slab, extended to the tile edge toward each connected neighbour at the same level
    const x0 = x + (same[1] ? 0 : e), x1 = x + 1 - (same[0] ? 0 : e), z0 = y + (same[3] ? 0 : e), z1 = y + 1 - (same[2] ? 0 : e);
    g.quad([x0, Y, z0], [x0, Y, z1], [x1, Y, z1], [x1, Y, z0], col);
    // curbs on edges with no connection
    const cb = (ax, az, bx, bz) => g.box(Math.min(ax, bx), hh * LH, Math.min(az, bz), Math.max(ax, bx), Y + 0.04, Math.max(az, bz), curb, curb, false);
    if (!c[0]) cb(x + 1 - e, y + e * 0.5, x + 1 - e + 0.05, y + 1 - e * 0.5);
    if (!c[1]) cb(x + e - 0.05, y + e * 0.5, x + e, y + 1 - e * 0.5);
    if (!c[2]) cb(x + e * 0.5, y + 1 - e, x + 1 - e * 0.5, y + 1 - e + 0.05);
    if (!c[3]) cb(x + e * 0.5, y + e - 0.05, x + 1 - e * 0.5, y + e);
    // stairs toward a connected neighbour one level lower: four steps from this centre down to its centre
    nb.forEach(([dx, dy, j], k) => {
      if (!c[k] || M.height[j] !== hh - 1) return;
      const n = 6;
      for (let s = 0; s < n; s++) {
        const t0 = 0.5 - (s / n) * 0, a = 0.5 + (s / n), b = 0.5 + ((s + 1) / n); void t0;
        const yy = (hh - (s + 1) / n) * LH + th + LH / n * 0.5;
        // step spans from distance a to b along (dx, dy) from this tile's centre, full width minus margins
        const cx = x + 0.5, cz = y + 0.5;
        const px0 = cx + dx * a, px1 = cx + dx * b, pz0 = cz + dy * a, pz1 = cz + dy * b;
        const sx0 = dx ? Math.min(px0, px1) : x + e, sx1 = dx ? Math.max(px0, px1) : x + 1 - e;
        const sz0 = dy ? Math.min(pz0, pz1) : y + e, sz1 = dy ? Math.max(pz0, pz1) : y + 1 - e;
        g.box(sx0, (hh - 1) * LH, sz0, sx1, yy, sz1, s & 1 ? step : col, mul(step, 0.85), false);
      }
    });
  }
  return g;
}

// south-facing slopes carry pine, north-facing slopes hardwoods (EOA: Ouachita Mountains): shift the pine share by aspect
export function aspectPine(dem, X, Z, base) {
  if (!dem) return base;
  const dz = dem.elev(X, Z + 2) - dem.elev(X, Z - 2); // metres over 12 m; negative = ground falls toward the south
  return Math.max(0.05, Math.min(0.95, base - Math.max(-0.35, Math.min(0.35, dz * 0.12))));
}
// ---------- real-terrain backdrop ----------------------------------------------------------------
// A 2.88 km square of USGS 3DEP elevation and NLCD land cover around the map (assets/dem.js), at true scale
// (1 unit = 3 m), blended into the map's border heights. Forest beyond the tree band is a lumpy canopy blanket.
let demCache = null;
function decodeDem(D) {
  if (demCache && demCache.src === D) return demCache;
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const hb = b64(D.h10), cover = b64(D.cover);
  const h = new Float32Array(D.w * D.h); const dv = new DataView(hb.buffer);
  for (let i = 0; i < h.length; i++) h[i] = D.minElev + dv.getUint16(i * 2, true) / 10;
  demCache = { src: D, w: D.w, h: D.h, el: h, cover, m: D.mPerPx };
  return demCache;
}
export function demSampler(D, mapW) {
  const d = decodeDem(D), W = d.w, Hh = d.h, cx = W / 2, cz = Hh / 2, k = 3 / d.m; // pixels per world unit
  const at = (px, pz) => d.el[Math.max(0, Math.min(Hh - 1, pz)) * W + Math.max(0, Math.min(W - 1, px))];
  const elev = (X, Z) => {
    const px = cx + (X - mapW / 2) * k, pz = cz + (Z - mapW / 2) * k;
    const x0 = Math.floor(px), z0 = Math.floor(pz), fx = px - x0, fz = pz - z0;
    return (at(x0, z0) * (1 - fx) + at(x0 + 1, z0) * fx) * (1 - fz) + (at(x0, z0 + 1) * (1 - fx) + at(x0 + 1, z0 + 1) * fx) * fz;
  };
  const cov = (X, Z) => { const px = Math.round(cx + (X - mapW / 2) * k), pz = Math.round(cz + (Z - mapW / 2) * k); return d.cover[Math.max(0, Math.min(Hh - 1, pz)) * W + Math.max(0, Math.min(W - 1, px))]; };
  let e0 = 0, n = 0; for (let z = 4; z < mapW; z += 8) for (let x = 4; x < mapW; x += 8) { e0 += elev(x, z); n++; } e0 /= n;
  const half = (W / 2) / k; // world half-extent of the DEM
  return { elev, cov, e0, half };
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// border height of the map at the boundary point nearest (X, Z), in world units
function borderY(S, CH, X, Z) {
  const M = S.map, w = M.w;
  const bx = Math.max(0, Math.min(w, X)), bz = Math.max(0, Math.min(M.h, Z));
  const tx = Math.max(0, Math.min(w - 1, Math.floor(bx - (bx >= w ? 1e-6 : 0)))), tz = Math.max(0, Math.min(M.h - 1, Math.floor(bz - (bz >= M.h ? 1e-6 : 0))));
  const i = tz * w + tx, u = bx - tx, v = bz - tz;
  const a = CH[i * 4], b = CH[i * 4 + 1], c = CH[i * 4 + 2], d = CH[i * 4 + 3];
  return (a * (1 - u) * (1 - v) + b * u * (1 - v) + c * u * v + d * (1 - u) * v) * LH;
}
// the backdrop's ground height at (X, Z) (outside the map), shared by the mesh and the band trees
export function backdropGround(S, CH, dem, X, Z) {
  const M = S.map, w = M.w;
  const bx = Math.max(0, Math.min(w, X)), bz = Math.max(0, Math.min(M.h, Z));
  const d = Math.hypot(X - bx, Z - bz);
  const by = borderY(S, CH, X, Z);
  if (!dem) return by - Math.min(1.5, d * 0.05);
  const rel = (dem.elev(X, Z) - dem.elev(bx, bz)) / 3;
  // the camera looks north-west from the south-east: flatten the relief on that side so hills never block the park
  const front = smooth(-26, 8, (X + Z - w - M.h) / Math.SQRT2);
  return by + rel * smooth(1, 26, d) * (1 - front * 0.92) - front * Math.min(2.5, d * 0.06);
}
export function buildBackdrop(S, CH, dem) {
  const M = S.map, w = M.w;
  const R = dem ? Math.min(470, dem.half - 4) : 160;
  // a rectilinear grid, fine near the map and coarse far away
  const axis = [];
  for (let v = 0; v <= w; v += 1) axis.push(v);
  const out = [];
  let s = 0;
  for (let d = 1; d <= R; d += s) { s = d < 30 ? 1 : d < 90 ? 2.5 : d < 200 ? 6 : 12; out.push(d); }
  const A = [...out.map((d) => -d).reverse(), ...axis, ...out.map((d) => w + d)];
  const n = A.length;
  const Y = new Float32Array(n * n), Cl = new Float32Array(n * n * 3);
  const season = Math.max(0, Math.min(6, S.month));
  const [dc1, dc2] = SEASON_FOREST[season].map(lin), pine = lin(PINE), pine2 = lin(PINE2), open = lin(SEASON_GRASS[season]);
  const pond = lin('#3E7E86'), shrub = mix(open, lin('#7A7A44'), 0.4);
  for (let zi = 0; zi < n; zi++) for (let xi = 0; xi < n; xi++) {
    const X = A[xi], Z = A[zi], k = zi * n + xi;
    const inside = X >= 0 && X <= w && Z >= 0 && Z <= M.h;
    if (inside) { Y[k] = borderY(S, CH, X, Z); continue; }
    const bx = Math.max(0, Math.min(w, X)), bz = Math.max(0, Math.min(M.h, Z)), d = Math.hypot(X - bx, Z - bz);
    let y = backdropGround(S, CH, dem, X, Z);
    const cv = dem ? dem.cov(X, Z) : 1;
    const forest = cv === 1 || cv === 2 || cv === 3;
    const n1 = hash2(Math.round(X * 1.3), Math.round(Z * 1.3), 17), n2 = hash2(Math.round(X * 0.4), Math.round(Z * 0.4), 29);
    let c;
    if (forest) {
      const pf = aspectPine(dem, X, Z, cv === 2 ? 0.85 : cv === 3 ? 0.45 : 0.15);
      let can = n1 < pf ? mix(pine, pine2, n2) : mix(dc1, dc2, n1 * 0.7 + n2 * 0.3);
      if (season === 0 && n1 > 0.95 && n2 > 0.3) can = mix(can, n2 > 0.65 ? lin('#C2589A') : lin('#E8E6DA'), 0.55); // redbud and dogwood bloom in the understory
      can = mul(can, 0.82 + n2 * 0.2);
      // under the band of individual trees the ground is leaf litter; beyond it, a canopy blanket
      const floor = mix(mix(open, lin('#7A6A3E'), 0.55), lin('#6A6034'), n1 * 0.5);
      const k2 = smooth(26, 40, d);
      c = mix(floor, can, k2);
      const front = smooth(-26, 8, (X + Z - w - M.h) / Math.SQRT2);
      y += k2 * (2.2 + n1 * 0.9 + n2 * 0.8) * (1 - front * 0.6);
    } else if (cv === 4) c = pond;
    else if (cv === 6) c = shrub;
    else c = mul(open, 0.9 + n1 * 0.1);
    Y[k] = y; Cl[k * 3] = c[0]; Cl[k * 3 + 1] = c[1]; Cl[k * 3 + 2] = c[2];
  }
  const g = new Geo();
  for (let zi = 0; zi < n - 1; zi++) for (let xi = 0; xi < n - 1; xi++) {
    const X0 = A[xi], X1 = A[xi + 1], Z0 = A[zi], Z1 = A[zi + 1];
    if (X0 >= 0 && X1 <= w && Z0 >= 0 && Z1 <= M.h) continue; // the map covers this cell
    const k00 = zi * n + xi, k10 = k00 + 1, k01 = k00 + n, k11 = k01 + 1;
    const col = (k) => {
      if (A[k % n] >= 0 && A[k % n] <= w && A[(k / n) | 0] >= 0 && A[(k / n) | 0] <= M.h) { // shared with the map border: grass
        return lin(SEASON_GRASS[season]);
      }
      return [Cl[k * 3], Cl[k * 3 + 1], Cl[k * 3 + 2]];
    };
    g.quad([X0, Y[k00], Z0], [X0, Y[k01], Z1], [X1, Y[k11], Z1], [X1, Y[k10], Z0], col(k00), col(k01), col(k11), col(k10));
  }
  // smooth normals per vertex position for the big hills (flat shading would facet the far ridges)
  smoothByPosition(g);
  return { geo: g, axis: A, Y };
}
function smoothByPosition(g, withY) {
  const P = g.p, N = g.n, acc = new Map();
  const keyOf = (t) => P[t].toFixed(2) + ',' + P[t + 2].toFixed(2) + (withY ? ',' + P[t + 1].toFixed(withY) : '');
  for (let t = 0; t < P.length; t += 9) {
    for (let k = 0; k < 3; k++) {
      const key = keyOf(t + k * 3);
      let a = acc.get(key); if (!a) acc.set(key, (a = [0, 0, 0]));
      a[0] += N[t]; a[1] += N[t + 1]; a[2] += N[t + 2];
    }
  }
  for (let t = 0; t < P.length; t += 3) {
    const a = acc.get(keyOf(t)); const l = Math.hypot(a[0], a[1], a[2]) || 1;
    N[t] = a[0] / l; N[t + 1] = a[1] / l; N[t + 2] = a[2] / l;
  }
}
export { SEASON_GRASS, SEASON_FOREST };
