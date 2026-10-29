// Coaster and flume track in 3D: a centripetal Catmull-Rom spline through the cell centres, swept into tubular steel
// rails with a spine, a wooden deck on timber bents, or a flume trough with water; supports reach the real ground.
// Trains follow the spline by arc length from the sim's run progress (same timing as the 2D view), riders seated.
import { TRACKS } from '../catalog.js';
import { Geo, LH, lin, mix, mul, mat } from './geo.js';

const C = (h) => lin(h);
const RAIL_UP = 0.32; // track centreline above the cell's level

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1, 2].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
// sample the centreline: points every 1/N cell, plus cumulative arc length
export function trackLine(o, N = 8) {
  const cells = o.cells, n = cells.length, closed = !!o.complete && n > 3;
  const P = cells.map((c) => [c.x + 0.5, c.h * LH + RAIL_UP, c.y + 0.5]);
  const at = (k) => (closed ? P[(k + n) % n] : P[Math.max(0, Math.min(n - 1, k))]);
  const pts = [], us = [];
  const segs = closed ? n : n - 1;
  for (let k = 0; k < segs; k++) for (let s = 0; s < N; s++) { pts.push(catmull(at(k - 1), at(k), at(k + 1), at(k + 2), s / N)); us.push(k + s / N); }
  pts.push(closed ? pts[0].slice() : P[n - 1].slice()); us.push(segs);
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  return { pts, us, len, total: len[len.length - 1], closed, N };
}
function frameAt(L, i) {
  const a = L.pts[Math.max(0, i - 1)], b = L.pts[Math.min(L.pts.length - 1, i + 1)];
  let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l;
  // side = tangent × up, up' = side × tangent
  let sx = -tz, sz = tx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
  return { t: [tx, ty, tz], s: [sx, 0, sz], u: [-sz * ty, sz * tx - sx * tz, sx * ty] };
}
// position + frame at arc length d (wraps on closed loops)
function poseAt(L, d) {
  if (L.closed) d = ((d % L.total) + L.total) % L.total; else d = Math.max(0, Math.min(L.total, d));
  let lo = 0, hi = L.len.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.len[m] <= d) lo = m; else hi = m; }
  const f = (d - L.len[lo]) / Math.max(1e-6, L.len[hi] - L.len[lo]);
  const a = L.pts[lo], b = L.pts[hi];
  const fr = frameAt(L, lo);
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], ...fr };
}
// arc length for the 2D view's progress q along the loop (cell k at prof[k])
function arcForQ(o, L, q) {
  const n = o.cells.length, prof = o.prof;
  let k = 0; while (k + 1 < n && prof[k + 1] <= q) k++;
  const t0 = prof[k], t1 = k + 1 < n ? prof[k + 1] : 1;
  const f = Math.max(0, Math.min(1, (q - t0) / Math.max(1e-6, t1 - t0)));
  const u = k - 0.5 + f; // a cell spans from the edge with the previous cell to the edge with the next
  const uu = ((u % n) + n) % n, i = Math.min(L.us.length - 1, Math.floor(uu * L.N));
  return L.len[i] + (L.len[Math.min(L.len.length - 1, i + 1)] - L.len[i]) * (uu * L.N - i);
}
export function trainPose(o, L, p) { return poseAt(L, arcForQ(o, L, p)); }

export function buildTrack(ctx, o) {
  const T = TRACKS[o.type], { metal, world } = ctx, THREE = ctx.T;
  const g = T.flume ? ctx.ds : ctx.g, pools = T.flume ? ctx.dsw : ctx.pools;
  if (!o.cells || o.cells.length < 2) return;
  const L = trackLine(o);
  const rail = C(T.color), dark = mul(rail, 0.55), sup = T.wood ? C('#B8865A') : T.flume ? C('#8B6A45') : C('#E8E4DA');
  const failed = o.status === 'testfail' ? o.failAt : -1;
  const gw = T.flume ? 0.2 : T.wood ? 0.16 : o.type === 'family' ? 0.1 : 0.12;
  const n = L.pts.length;
  // rails, spine and ties along the samples
  for (let i = 0; i < n - 1; i++) {
    const A = frameAt(L, i), B = frameAt(L, i + 1), a = L.pts[i], b = L.pts[i + 1];
    const cell = Math.floor(L.us[i] + 0.5) % o.cells.length, lift = o.cells[cell] && o.cells[cell].lift;
    const bad = cell === failed;
    const off = (p, f, s, u) => [p[0] + f.s[0] * s + f.u[0] * u, p[1] + f.s[1] * s + f.u[1] * u, p[2] + f.s[2] * s + f.u[2] * u];
    if (T.flume) {
      // U trough: floor and two walls, water inside
      const wcol = C('#5B4632'), w2 = gw + 0.05;
      g.quad(off(a, A, -w2, -0.1), off(b, B, -w2, -0.1), off(b, B, w2, -0.1), off(a, A, w2, -0.1), mul(wcol, 0.8));
      g.quad(off(a, A, -w2, -0.1), off(a, A, -w2, 0.12), off(b, B, -w2, 0.12), off(b, B, -w2, -0.1), wcol);
      g.quad(off(b, B, w2, -0.1), off(b, B, w2, 0.12), off(a, A, w2, 0.12), off(a, A, w2, -0.1), wcol);
      g.quad(off(a, A, -w2, 0.12), off(a, A, -w2 - 0.04, 0.12), off(b, B, -w2 - 0.04, 0.12), off(b, B, -w2, 0.12), C('#7A5A3C'));
      g.quad(off(b, B, w2, 0.12), off(b, B, w2 + 0.04, 0.12), off(a, A, w2 + 0.04, 0.12), off(a, A, w2, 0.12), C('#7A5A3C'));
      pools.quad(off(a, A, -gw, 0.0), off(b, B, -gw, 0.0), off(b, B, gw, 0.0), off(a, A, gw, 0.0), bad ? C('#C8402E') : C('#3FA8C0'));
    } else {
      const rc = bad ? C('#FF3B30') : rail;
      metal.setGlow(bad ? 1.5 : 0.22); // a faint rail glow keeps the track readable after dark
      metal.tube(off(a, A, -gw, 0), off(b, B, -gw, 0), 0.028, rc, 5);
      metal.tube(off(a, A, gw, 0), off(b, B, gw, 0), 0.028, rc, 5);
      if (T.wood) { g.quad(off(a, A, -gw - 0.06, -0.04), off(b, B, -gw - 0.06, -0.04), off(b, B, gw + 0.06, -0.04), off(a, A, gw + 0.06, -0.04), C('#8B6A45')); }
      else metal.tube(off(a, A, 0, -0.09), off(b, B, 0, -0.09), 0.045, dark, 6);
      metal.setGlow();
      if (i % 2 === 0) metal.tube(off(a, A, -gw, 0), off(a, A, gw, 0), 0.016, T.wood ? C('#6E5A44') : dark, 4);
      if (!T.wood && i % 2 === 0) { metal.tube(off(a, A, -gw, 0), off(a, A, 0, -0.09), 0.012, dark, 3); metal.tube(off(a, A, gw, 0), off(a, A, 0, -0.09), 0.012, dark, 3); }
      if (lift && i % 2 === 1) { g.box(a[0] - 0.02, a[1] - 0.02, a[2] - 0.02, a[0] + 0.02, a[1] + 0.02, a[2] + 0.02, C('#2A2A2A')); }
    }
  }
  // supports: one per cell, from under the track to the real ground
  const spots = [];
  o.cells.forEach((c, k) => { if (k >= 3) { spots.push(k * L.N); if (T.wood) spots.push(k * L.N + (L.N >> 1)); } });
  spots.forEach((i0) => {
    const i = Math.min(n - 1, i0), p = L.pts[i], f = frameAt(L, i);
    const gy = world.ground(p[0], p[2]), top = p[1] - 0.12;
    if (top - gy < 0.08) return;
    if (T.wood) {
      // a timber bent: two posts, ledgers and cross bracing
      const s0 = [p[0] - f.s[0] * 0.3, p[2] - f.s[2] * 0.3], s1 = [p[0] + f.s[0] * 0.3, p[2] + f.s[2] * 0.3];
      g.tube([s0[0], gy, s0[1]], [s0[0], top, s0[1]], 0.03, sup, 4); g.tube([s1[0], gy, s1[1]], [s1[0], top, s1[1]], 0.03, sup, 4);
      for (let yy = gy + 0.35; yy < top; yy += 0.35) g.tube([s0[0], yy, s0[1]], [s1[0], yy, s1[1]], 0.018, mul(sup, 0.9), 4);
      for (let yy = gy; yy + 0.35 < top + 0.01; yy += 0.35) { g.tube([s0[0], yy, s0[1]], [s1[0], Math.min(top, yy + 0.35), s1[1]], 0.012, mul(sup, 0.8), 3); }
    } else {
      const col = T.flume ? sup : C('#E8E4DA');
      metal.tube([p[0], gy, p[2]], [p[0], top, p[2]], T.flume ? 0.04 : 0.05, col, 6);
      g.box(p[0] - 0.09, gy - 0.02, p[2] - 0.09, p[0] + 0.09, gy + 0.05, p[2] + 0.09, C('#B8B0A0'));
    }
  });
  // station: platform deck and a canopy over the three station cells
  const st = o.cells.slice(0, 3);
  const minx = Math.min(...st.map((c) => c.x)), maxx = Math.max(...st.map((c) => c.x)) + 1, minz = Math.min(...st.map((c) => c.y)), maxz = Math.max(...st.map((c) => c.y)) + 1, sy = st[0].h * LH;
  ctx.pave.box(minx + 0.04, sy, minz + 0.04, maxx - 0.04, sy + 0.18, maxz - 0.04, C('#C9B79A'), C('#B8B0A0'), false);
  const roofY = sy + 1.05, rc = T.flume ? C('#2A9D8F') : rail;
  if (T.wood || T.flume) {
    // a rustic park pavilion (native-stone piers, timber gable roof), in the spirit of the CCC-era shelters of the region
    const stn = C('#9C9284'), stn2 = C('#857A6C'), timber = C('#6E4E34'), shake = C('#5A4434');
    for (const [px, pz] of [[minx + 0.06, minz + 0.06], [maxx - 0.16, minz + 0.06], [minx + 0.06, maxz - 0.16], [maxx - 0.16, maxz - 0.16]]) {
      g.box(px, sy + 0.18, pz, px + 0.1, sy + 0.55, pz + 0.1, stn, stn2); g.box(px + 0.02, sy + 0.55, pz + 0.02, px + 0.08, roofY, pz + 0.08, timber);
    }
    const alongX = maxx - minx > maxz - minz, rh = roofY + 0.42;
    if (alongX) {
      const zc = (minz + maxz) / 2;
      g.quad([minx - 0.1, roofY, minz - 0.15], [maxx + 0.1, roofY, minz - 0.15], [maxx + 0.1, rh, zc], [minx - 0.1, rh, zc], shake);
      g.quad([maxx + 0.1, roofY, maxz + 0.15], [minx - 0.1, roofY, maxz + 0.15], [minx - 0.1, rh, zc], [maxx + 0.1, rh, zc], mul(shake, 0.85));
      for (const xx of [minx - 0.1, maxx + 0.1]) g.tri([xx, roofY, minz - 0.15], [xx, roofY, maxz + 0.15], [xx, rh, zc], timber);
      for (let k = 0; k <= 3; k++) { const xx = minx + (maxx - minx) * k / 3; g.tube([xx, roofY, minz], [xx, rh - 0.05, zc], 0.025, timber, 4); g.tube([xx, roofY, maxz], [xx, rh - 0.05, zc], 0.025, timber, 4); }
    } else {
      const xc = (minx + maxx) / 2;
      g.quad([minx - 0.15, roofY, maxz + 0.1], [minx - 0.15, roofY, minz - 0.1], [xc, rh, minz - 0.1], [xc, rh, maxz + 0.1], shake);
      g.quad([maxx + 0.15, roofY, minz - 0.1], [maxx + 0.15, roofY, maxz + 0.1], [xc, rh, maxz + 0.1], [xc, rh, minz - 0.1], mul(shake, 0.85));
      for (const zz of [minz - 0.1, maxz + 0.1]) g.tri([minx - 0.15, roofY, zz], [maxx + 0.15, roofY, zz], [xc, rh, zz], timber);
      for (let k = 0; k <= 3; k++) { const zz = minz + (maxz - minz) * k / 3; g.tube([minx, roofY, zz], [xc, rh - 0.05, zz], 0.025, timber, 4); g.tube([maxx, roofY, zz], [xc, rh - 0.05, zz], 0.025, timber, 4); }
    }
  } else {
    for (const [px, pz] of [[minx + 0.08, minz + 0.08], [maxx - 0.12, minz + 0.08], [minx + 0.08, maxz - 0.12], [maxx - 0.12, maxz - 0.12]]) g.box(px, sy + 0.18, pz, px + 0.04, roofY, pz + 0.04, C('#F4EFE2'));
    g.box(minx - 0.05, roofY, minz - 0.05, maxx + 0.05, roofY + 0.06, maxz + 0.05, rc, mul(rc, 0.75));
  }
  g.setGlow(1.2, 0.001); const cxs = (minx + maxx) / 2, czs = (minz + maxz) / 2;
  for (let k = 0; k < 10; k++) { g.glow[1] = (k % 3) / 3 + 0.001; const t = k / 9; const bx = minx + (maxx - minx) * t, bz = minz + (maxz - minz) * t; g.box(bx - 0.02, roofY - 0.04, (maxz - minz > maxx - minx ? bz : maxz + 0.03) - 0.02, bx + 0.02, roofY, (maxz - minz > maxx - minx ? bz : maxz + 0.03) + 0.02, C('#FFE7A0')); }
  g.setGlow(); void cxs; void czs;
  ctx.glowDecal.push([(minx + maxx) / 2, sy + 0.18, (minz + maxz) / 2, 1.2, [0.8, 0.66, 0.44], 0.8]);
  // the coaster's name board on the station's long side
  const sign = ctx.sign && ctx.sign(o.name || T.name, T.color);
  if (sign) { const alongX = maxx - minx > maxz - minz; sign.position.set(alongX ? (minx + maxx) / 2 : maxx + 0.17, roofY - 0.14, alongX ? maxz + 0.17 : (minz + maxz) / 2); sign.rotation.y = alongX ? 0 : Math.PI / 2; ctx.add({ o: null, node: sign, update: () => {}, seats: null }); }
  // the train
  if (!o.prof || o.status === 'building' || o.status === 'testfail') return;
  const nc = Math.min(4, Math.max(2, Math.round((o.seats || T.seats) / 4)));
  const cars = [], node = new THREE.Group();
  const md = ctx.models;
  for (let k = 0; k < nc; k++) {
    const cg = new Geo(), body = T.flume ? null : k === 0 ? md.coaster_car_lead : md.coaster_car;
    const bc = T.flume ? C('#8B5A33') : o.type === 'wood' ? C('#2E5A8A') : o.type === 'family' ? C('#E26D8E') : C('#F4C542');
    const m = T.flume ? md.log_boat : body;
    if (m) cg.model(m, (r, col, i) => (r === 0 && !T.flume ? bc : [Math.pow(col[i * 3] / 255, 2.2), Math.pow(col[i * 3 + 1] / 255, 2.2), Math.pow(col[i * 3 + 2] / 255, 2.2)]), mat(0, T.flume ? -0.12 : -0.035, 0, 0, T.flume ? 0.9 : 1));
    else { cg.box(-0.17, -0.08, -0.28, 0.17, 0.12, 0.28, bc, mul(bc, 0.8)); cg.box(-0.15, 0.12, 0.0, 0.15, 0.22, 0.05, mul(bc, 0.6)); }
    const mesh = new THREE.Mesh(cg.build(THREE), ctx.objs.mats.obj); mesh.castShadow = true; mesh.matrixAutoUpdate = false;
    node.add(mesh); cars.push(mesh);
  }
  const M4 = new THREE.Matrix4(), seatsW = [], tmp = new THREE.Matrix4();
  for (let k = 0; k < nc * 4; k++) seatsW.push(new THREE.Matrix4());
  const space = T.flume ? 0.95 : 0.74;
  ctx.add({
    o, node,
    update: (p) => {
      const q = o.phase === 'run' || p > 0 ? p : 0.04;
      const lead = arcForQ(o, L, q);
      cars.forEach((mesh, k) => {
        // car frame: forward = track tangent, up = the track's up (always above the rails), side = up × forward
        const P = poseAt(L, lead - k * space), z = P.t, ul = Math.hypot(P.u[0], P.u[1], P.u[2]) || 1, y = P.u.map((v) => v / ul);
        const x = [y[1] * z[2] - y[2] * z[1], y[2] * z[0] - y[0] * z[2], y[0] * z[1] - y[1] * z[0]];
        M4.set(x[0], y[0], z[0], P.p[0], x[1], y[1], z[1], P.p[1], x[2], y[2], z[2], P.p[2], 0, 0, 0, 1);
        mesh.matrix.copy(M4); mesh.matrixWorldNeedsUpdate = true;
      });
    },
    seats: () => {
      node.updateMatrixWorld(true);
      cars.forEach((mesh, k) => { for (let s = 0; s < 4; s++) { tmp.compose(new THREE.Vector3(s % 2 ? 0.09 : -0.09, T.flume ? -0.02 : 0.085, (s < 2 ? 0.12 : -0.12) * (T.flume ? 1.6 : 1)), new THREE.Quaternion(), new THREE.Vector3(0.82, 0.82, 0.82)); seatsW[k * 4 + s].multiplyMatrices(mesh.matrixWorld, tmp); } });
      return seatsW;
    },
  });
  void mix;
}
