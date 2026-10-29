// Rides, stalls, scenery, the gate and coaster track in 3D. Static parts of every object are batched into one
// vertex-coloured mesh; moving parts are small meshes animated from the sim's ride phase (run progress), so a frame
// is deterministic for a given sim state. Each moving part can expose seats, where the people layer sits riders.
// All designs are original generic ride types.
import { RIDES, STALLS, SCENERY, TRACKS } from '../catalog.js';
import { hash2 } from '../rng.js';
import { rideOpen } from '../guests.js';
import { cycleOf } from '../rides.js';
import { U } from './materials3d.js';
import { Geo, LH, lin, mix, mul, mat } from './geo.js';
import { decodeModels } from './trees3d.js';
import { buildTrack, trainPose } from './track3d.js';

const C = (h) => lin(h);
const WHITE = C('#F4EFE2'), CREAM = C('#FFF6E0'), STEEL = C('#B8BCC0'), DARK = C('#3A3A3A'), WOOD = C('#9C7A55'), WOOD2 = C('#7A5A3C');
const STONE = C('#9C9284'), STONE2 = C('#857A6C'), ROOF = C('#4A3A30'), CONC = C('#CFC6B4'), RED = C('#C8402E'), GOLD = C('#E8B84A'), BULB = C('#FFE7A0');
const NEON = { coral: C('#FF5A4A'), turq: C('#4FF0E0'), yellow: C('#FFD84A'), pink: C('#FF6FB0') };

const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
// run progress → [0..1] spin envelope distance (accelerate 15%, cruise, brake 15%), integrated so speed is smooth
function spin(p) {
  const a = 0.15; if (p <= 0) return 0; if (p >= 1) return 1;
  const total = 1 - a; // area under the trapezoid speed curve
  if (p < a) return (p * p / (2 * a)) / total;
  if (p > 1 - a) { const q = 1 - p; return (total - q * q / (2 * a)) / total; }
  return (p - a / 2) / total;
}

export class Objects {
  constructor(THREE, scene, mats, R3, world) {
    this.T = THREE; this.scene = scene; this.mats = mats; this.R3 = R3; this.world = world;
    this.root = new THREE.Group(); scene.add(this.root);
    this.dyn = []; this.sig = ''; this.count = 0; this.seats = []; this.statics = null; this.glows = null;
    this.models = decodeModels();
    this.sm = new THREE.Matrix4(); this.tv = new THREE.Vector3();
    this.signTex = null; this.signName = '';
  }
  signature(S) {
    let s = S._gid + ':' + (S._netVer || 0) + ':' + S.month + ':';
    for (const o of S.objects) s += o.id + o.type + o.status + (o.entry) + (o.cells ? o.cells.length + (o.complete ? 'c' : '') + (o.failAt ?? '') : '') + (o.cal === false ? 'x' : '') + ',';
    return s;
  }
  rebuild(S) {
    const T = this.T;
    for (const c of [...this.root.children]) { this.root.remove(c); c.traverse((n) => n.geometry && n.geometry.dispose()); }
    this.dyn = []; this.world.fx.steamSrc = [];
    const g = new Geo(), metal = new Geo(), pools = new Geo(), pave = new Geo(), ds = new Geo(), dsw = new Geo(), glowDecal = [];
    const ao = [];
    const ctx = { sign: (n, c) => nameSign(ctx, n, c), S, g, metal, pools, pave, ds, dsw, ao, T, models: this.models, world: this.world, glowDecal, add: (part) => this.dyn.push(part), objs: this };
    for (const o of S.objects) {
      if (!o.cells && o.kind !== 'scenery') ao.push([o.x + o.n / 2, o.h * LH + 0.075, o.y + o.n / 2, o.n * 0.62 + 0.25]);
      try {
        if (o.cells) buildTrack(ctx, o);
        else if (o.kind === 'ride') buildRide(ctx, o);
        else if (o.kind === 'stall') buildStall(ctx, o);
        else if (o.kind === 'scenery') buildScenery(ctx, o);
        else if (o.kind === 'special') buildAmphi(ctx, o);
      } catch (e) { console.warn('model', o.type, e); }
    }
    if (!this.noGate) { buildGate(ctx); dressPaths(ctx); }
    const mk = (geo, m, cast = true) => { if (!geo.count) return; const me = new T.Mesh(geo.build(T), m); me.castShadow = cast; me.receiveShadow = true; me.matrixAutoUpdate = false; this.root.add(me); return me; };
    mk(g, this.mats.obj); mk(metal, this.mats.metal); mk(pools, this.mats.pool, false); mk(pave, this.mats.path, false);
    if (!this.dsMat) { this.dsMat = this.mats.obj.clone(); this.dsMat.side = this.T.DoubleSide; this.dsMat.onBeforeCompile = this.mats.obj.onBeforeCompile; this.dsMat.customProgramCacheKey = this.mats.obj.customProgramCacheKey; this.dswMat = this.mats.pool.clone(); this.dswMat.side = this.T.DoubleSide; this.dswMat.onBeforeCompile = this.mats.pool.onBeforeCompile; this.dswMat.customProgramCacheKey = this.mats.pool.customProgramCacheKey; }
    mk(ds, this.dsMat); mk(dsw, this.dswMat, false);
    for (const d of this.dyn) { this.root.add(d.node); }
    this.decals = glowDecal; this.ao = ao;
    this.count = S.objects.length;
  }
  update(S, dt, view) {
    const sig = this.signature(S);
    if (sig !== this.sig) { this.sig = sig; this.rebuild(S); }
    this.seats.length = 0;
    const frac = view.frac || 0;
    for (const d of this.dyn) {
      const o = d.o;
      let p = 0;
      if (o) {
        const run = o.phase === 'run' && !o.broken && o.status !== 'standing';
        p = run ? Math.max(0, Math.min(1, 1 - (o.timer - frac) / Math.max(1, cycleOf(o)))) : 0;
        if (view.testRun && view.testRun.id === o.id) p = view.testRun.p;
      }
      d.update(p, this.world.time, view);
      if (d.seats && o && o.riders && o.riders.length && o.phase !== 'unload') {
        d.node.updateMatrixWorld(true);
        const list = d.seats();
        for (let k = 0; k < o.riders.length && k < list.length; k++) this.seats.push([list[k], o.riders[k]]);
      }
    }
  }
}

// ---------- helpers ---------------------------------------------------------------------------------
function entrySide(S, o) {
  if (o.entry < 0) return [0, 1];
  const w = S.map.w, ex = o.entry % w + 0.5, ey = Math.floor(o.entry / w) + 0.5, cx = o.x + o.n / 2, cy = o.y + o.n / 2;
  const dx = ex - cx, dy = ey - cy;
  return Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy) || 1];
}
// the pad every ride stands on: a paved plaza with a low stone curb, plus a queue gate toward the entry
function pad(ctx, o, top) {
  const { g, S } = ctx, y = o.h * LH, n = o.n;
  ctx.pave.box(o.x + 0.04, y, o.y + 0.04, o.x + n - 0.04, y + 0.06, o.y + n - 0.04, top || C('#D8C29C'), STONE2, false);
  const [ex, ey] = entrySide(S, o);
  if (n >= 2) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    if ((ex && sx === ex) || (ey && sz === ey)) continue; // keep the entrance side clear
    const px = o.x + n / 2 + sx * (n / 2 - 0.22), pz = o.y + n / 2 + sz * (n / 2 - 0.22);
    g.box(px - 0.14, y + 0.06, pz - 0.14, px + 0.14, y + 0.2, pz + 0.14, STONE, STONE2);
    for (let k = 0; k < 5; k++) { const fx = px - 0.08 + hash2(o.id + k, sx + 3) * 0.16, fz = pz - 0.08 + hash2(k, o.id + sz) * 0.16; g.box(fx - 0.035, y + 0.2, fz - 0.035, fx + 0.035, y + 0.27, fz + 0.035, [C('#E26D8E'), C('#F4C542'), C('#4E7A3A'), C('#FFF6E0'), C('#4E7A3A')][k]); }
  }
  if (o.entry >= 0) {
    // queue rails on the entry tile: posts and two rails along the sides parallel to the approach
    const w = S.map.w, qx = o.entry % w, qz = Math.floor(o.entry / w), qy = S.map.height[o.entry] * LH + 0.035, rc = C((RIDES[o.type] || {}).color || '#3FBFB5');
    for (const side of [0.12, 0.88]) {
      const a = ex ? [qx, qz + side] : [qx + side, qz], b = ex ? [qx + 1, qz + side] : [qx + side, qz + 1];
      for (const t of [0, 0.5, 1]) { const px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t; g.box(px - 0.018, qy, pz - 0.018, px + 0.018, qy + 0.22, pz + 0.018, DARK); }
      ctx.metal.tube([a[0], qy + 0.2, a[1]], [b[0], qy + 0.2, b[1]], 0.012, rc, 4); ctx.metal.tube([a[0], qy + 0.12, a[1]], [b[0], qy + 0.12, b[1]], 0.01, rc, 4);
    }
    // entrance arch on the pad edge facing the path
    const cx = o.x + n / 2 + ex * (n / 2 - 0.12), cz = o.y + n / 2 + ey * (n / 2 - 0.12), px = ey ? 0.3 : 0, pz = ex ? 0.3 : 0;
    const col = C((RIDES[o.type] || {}).color || '#3FBFB5');
    g.box(cx - px - 0.04, y, cz - pz - 0.04, cx - px + 0.04, y + 0.75, cz - pz + 0.04, WHITE);
    g.box(cx + px - 0.04, y, cz + pz - 0.04, cx + px + 0.04, y + 0.75, cz + pz + 0.04, WHITE);
    g.setGlow(0.9, 0.37); g.box(cx - px - 0.08 * (ey ? 1 : 0.3), y + 0.72, cz - pz - 0.08 * (ex ? 1 : 0.3), cx + px + 0.08 * (ey ? 1 : 0.3), y + 0.86, cz + pz + 0.08 * (ex ? 1 : 0.3), col, mul(col, 0.8)); g.setGlow();
    // the ride's name on a board above the arch, facing the path
    const sign = nameSign(ctx, o.name || (RIDES[o.type] || {}).name || '', (RIDES[o.type] || {}).color || '#3FBFB5');
    if (sign) { sign.position.set(cx + ex * 0.02, y + 1.02, cz + ey * 0.02); sign.rotation.y = Math.atan2(ex, ey); ctx.add({ o: null, node: sign, update: () => {}, seats: null }); }
  }
  return y + 0.06;
}
// name boards: text drawn once per name into a small canvas texture, lit at night like the other signs
const signCache = new Map();
function nameSign(ctx, name, color) {
  if (!name) return null;
  const T = ctx.T; let e = signCache.get(name + color);
  if (!e) {
    const cv = Object.assign(document.createElement('canvas'), { width: 512, height: 96 }), c = cv.getContext('2d');
    c.fillStyle = '#FFF6E0'; c.fillRect(0, 0, 512, 96); c.fillStyle = color; c.fillRect(0, 0, 512, 12); c.fillRect(0, 84, 512, 12);
    let fs = 54; c.font = `bold ${fs}px "Century Gothic", Futura, "Trebuchet MS", sans-serif`;
    const txt = name.toUpperCase(); while (c.measureText(txt).width > 480 && fs > 24) { fs -= 2; c.font = `bold ${fs}px "Century Gothic", Futura, "Trebuchet MS", sans-serif`; }
    c.fillStyle = '#34424A'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 256, 50);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.7 });
    mat.onBeforeCompile = (sh) => { sh.uniforms.uNight = U.uNight; sh.fragmentShader = 'uniform float uNight;' + String.fromCharCode(10) + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + String.fromCharCode(10) + ' totalEmissiveRadiance *= 0.12 + uNight * 1.2;'); };
    mat.customProgramCacheKey = () => 'sct-sign';
    e = { mat }; signCache.set(name + color, e);
    if (signCache.size > 80) signCache.delete(signCache.keys().next().value);
  }
  // two single-sided faces back to back, so the name reads the right way round from either side
  const geo = new T.PlaneGeometry(0.95, 0.18), m = new T.Mesh(geo, e.mat), b = new T.Mesh(geo, e.mat); b.rotation.y = Math.PI; m.position.z = 0.004; b.position.z = -0.004;
  const node = new T.Group(); node.add(m, b); return node;
}
function partNode(ctx, geo, material, x, y, z) {
  const { T } = ctx;
  const node = new T.Group(); node.position.set(x, y, z);
  if (geo && geo.count) { const m = new T.Mesh(geo.build(T), material || ctx.objs.mats.obj); m.castShadow = true; m.receiveShadow = true; node.add(m); }
  return node;
}
function meshOf(ctx, geo, material) { const m = new ctx.T.Mesh(geo.build(ctx.T), material || ctx.objs.mats.obj); m.castShadow = true; m.receiveShadow = true; return m; }
function modelColor(md, map) { return (r, col, i) => (map[r] ? map[r] : [Math.pow(col[i * 3] / 255, 2.2), Math.pow(col[i * 3 + 1] / 255, 2.2), Math.pow(col[i * 3 + 2] / 255, 2.2)]); }
function bulbs(g, cx, cz, y, r, n, phase = 0) {
  g.setGlow(1.4, phase || 0.001);
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; g.box(cx + Math.cos(a) * r - 0.025, y - 0.025, cz + Math.sin(a) * r - 0.025, cx + Math.cos(a) * r + 0.025, y + 0.025, cz + Math.sin(a) * r + 0.025, BULB); g.glow[1] = (k % 3) / 3 + 0.001; }
  g.setGlow();
}
// seats: local offsets on a node → world matrices each frame
function seatFn(ctx, node, list, rot = (k) => 0, s = 0.95) {
  const T = ctx.T, out = list.map(() => new T.Matrix4()), lm = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), v = new T.Vector3(), sc = new T.Vector3(s, s, s);
  return () => { for (let k = 0; k < list.length; k++) { const [x, y, z] = list[k]; q.setFromAxisAngle(up, rot(k)); v.set(x, y, z); lm.compose(v, q, sc); out[k].multiplyMatrices(node.matrixWorld, lm); } return out; };
}

// ---------- flat rides ----------------------------------------------------------------------------------
function buildRide(ctx, o) {
  const d = RIDES[o.type], standing = o.status === 'standing';
  const col = standing ? C('#9A968C') : C(d.color);
  if (d.water) return buildWaterRide(ctx, o, col);
  const y = pad(ctx, o), cx = o.x + o.n / 2, cz = o.y + o.n / 2, g = ctx.g, T = ctx.T;
  const R = o.n * 0.42;
  const add = (node, update, seats, cycle) => ctx.add({ o, node, update: standing ? () => {} : update, seats: standing ? null : seats, cycle });
  switch (o.type) {
    case 'carousel': {
      g.cyl(cx, cz, y, y + 0.14, R, R, 24, C('#8B4A33'), C('#B88A5A'));
      const rot = new Geo();
      rot.cyl(0, 0, 0.14, 0.2, R * 0.98, R * 0.98, 24, WOOD2, C('#C8A070'));
      rot.cyl(0, 0, 0.14, 1.55, 0.22, 0.22, 10, C('#F4D58A'));
      rot.cyl(0, 0, 0.6, 1.35, 0.26, 0.26, 10, C('#7A3A2A'));
      // canopy: striped cone + scalloped valance with bulbs
      rot.cone(0, 0, 1.52, 2.15, R * 1.05, 16, col, CREAM);
      rot.cyl(0, 0, 1.38, 1.52, R * 1.05, R * 1.05, 16, CREAM, null, mul(col, 0.7), false);
      bulbs(rot, 0, 0, 1.45, R * 1.07, 24, 0.2);
      rot.cyl(0, 0, 2.1, 2.35, 0.05, 0.0, 6, GOLD); rot.setGlow(1.2); rot.box(-0.06, 2.3, -0.06, 0.06, 2.42, 0.06, NEON.coral); rot.setGlow();
      const horse = ctx.models.horse, nh = 12, poles = [];
      const hm = new Geo();
      for (let k = 0; k < nh; k++) {
        const a = (k / nh) * Math.PI * 2, rr = k % 2 ? R * 0.62 : R * 0.82;
        rot.tube([Math.cos(a) * rr, 0.2, Math.sin(a) * rr], [Math.cos(a) * rr, 1.4, Math.sin(a) * rr], 0.018, GOLD, 4);
        poles.push([a, rr]);
      }
      const node = partNode(ctx, rot, null, cx, y, cz);
      const horses = [];
      const hc = [CREAM, C('#2A2A2A'), C('#8B5A33'), C('#E8E0D0')];
      for (let k = 0; k < nh; k++) {
        const hg = new Geo();
        if (horse) hg.model(horse, modelColor(horse, { 0: hc[k % 4], 2: GOLD }), mat(0, 0, 0, 0, 1.15));
        else hg.box(-0.2, 0, -0.07, 0.2, 0.25, 0.07, hc[k % 4]);
        const m = meshOf(ctx, hg); node.add(m); horses.push(m);
      }
      void hm;
      add(node, (p) => {
        const a = spin(p) * Math.PI * 2 * 3.2;
        node.rotation.y = -a;
        horses.forEach((m, k) => { const [ang, rr] = poles[k]; m.position.set(Math.cos(ang) * rr, 0.55 + Math.sin(a * 3 + k * 1.7) * 0.12 * (p > 0 ? 1 : 0), Math.sin(ang) * rr); m.rotation.y = -ang; });
      }, seatFn(ctx, node, poles.map(([ang, rr]) => [Math.cos(ang) * rr, 0.62, Math.sin(ang) * rr]), (k) => -poles[k][0]));
      break;
    }
    case 'planes': {
      g.cyl(cx, cz, y, y + 0.1, R, R, 18, C('#6E6A62'));
      const hub = new Geo(); hub.cyl(0, 0, 0, 1.1, 0.12, 0.1, 10, C('#4C8FA8')); hub.cone(0, 0, 1.1, 1.45, 0.3, 10, col, CREAM); bulbs(hub, 0, 0, 1.08, 0.32, 10, 0.3);
      const node = partNode(ctx, hub, null, cx, y, cz);
      const arms = [], n = 6;
      for (let k = 0; k < n; k++) {
        const arm = new T.Group(); const ag = new Geo();
        ag.tube([0, 0, 0], [R * 0.85, 0, 0], 0.025, STEEL, 4);
        const pc = [col, C('#F26B5B'), C('#3FBFB5')][k % 3];
        ag.box(R * 0.72, -0.08, -0.09, R * 1.02, 0.06, 0.09, pc); ag.box(R * 0.8, -0.02, -0.25, R * 0.92, 0.02, 0.25, CREAM); ag.box(R * 1.0, -0.04, -0.03, R * 1.06, 0.1, 0.03, pc);
        arm.add(meshOf(ctx, ag)); arm.position.y = 0.9; node.add(arm); arms.push(arm);
      }
      add(node, (p) => {
        const a = spin(p) * Math.PI * 2 * 3;
        node.rotation.y = -a;
        arms.forEach((arm, k) => { arm.rotation.set(0, (k / n) * Math.PI * 2, 0); arm.rotation.z = p > 0 ? 0.25 + Math.sin(a * 2 + k) * 0.18 : -0.2; });
      }, null);
      break;
    }
    case 'cups': {
      g.cyl(cx, cz, y, y + 0.08, R, R, 20, C('#E8DDC8'));
      const tt = new Geo(); tt.cyl(0, 0, 0.08, 0.14, R * 0.95, R * 0.95, 20, C('#5E9AA8'), C('#7FB8C4'));
      tt.cyl(0, 0, 0.14, 0.5, 0.18, 0.14, 10, CREAM); tt.cyl(0, 0, 0.5, 0.65, 0.25, 0.05, 10, col);
      const node = partNode(ctx, tt, null, cx, y, cz);
      const cups = [], cm = ctx.models.teacup;
      for (let k = 0; k < 4; k++) {
        const cg = new Geo(), cc = [col, C('#F4C542'), C('#3FBFB5'), C('#F26B5B')][k];
        if (cm) cg.model(cm, modelColor(cm, { 0: cc }), mat(0, 0, 0, 0, 0.9));
        else { cg.cyl(0, 0, 0, 0.35, 0.22, 0.32, 12, cc, null, mul(cc, 0.5)); }
        const m = meshOf(ctx, cg); node.add(m); cups.push(m);
      }
      const spots = [0, 1, 2, 3].map((k) => [Math.cos(k * Math.PI / 2 + 0.5) * R * 0.55, Math.sin(k * Math.PI / 2 + 0.5) * R * 0.55]);
      add(node, (p) => {
        const a = spin(p) * Math.PI * 2 * 2.5; node.rotation.y = a;
        cups.forEach((m, k) => { m.position.set(spots[k][0], 0.14, spots[k][1]); m.rotation.y = -a * (2.2 + k * 0.4); });
      }, seatFn(ctx, node, spots.flatMap(([x, z]) => [[x - 0.12, 0.22, z], [x + 0.12, 0.22, z], [x, 0.22, z - 0.12]])));
      break;
    }
    case 'wheel': {
      const H = 1.62, Rw = 1.35;
      // A-frame legs on both sides of the wheel plane (wheel in the x–y plane)
      for (const zz of [-0.32, 0.32]) {
        ctx.metal.tube([cx - 0.9, y, cz + zz], [cx, y + H, cz + zz * 0.6], 0.045, col, 6);
        ctx.metal.tube([cx + 0.9, y, cz + zz], [cx, y + H, cz + zz * 0.6], 0.045, col, 6);
      }
      g.box(cx - 0.35, y, cz + 0.42, cx + 0.35, y + 0.35, cz + 0.62, CREAM, C('#E0D6C2'));
      const wg = new Geo();
      for (const zz of [-0.18, 0.18]) for (let k = 0; k < 32; k++) {
        const a0 = (k / 32) * Math.PI * 2, a1 = ((k + 1) / 32) * Math.PI * 2;
        wg.tube([Math.cos(a0) * Rw, Math.sin(a0) * Rw, zz], [Math.cos(a1) * Rw, Math.sin(a1) * Rw, zz], 0.028, WHITE, 4);
      }
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; for (const zz of [-0.18, 0.18]) wg.tube([0, 0, zz * 0.4], [Math.cos(a) * Rw, Math.sin(a) * Rw, zz], 0.012, STEEL, 3); }
      wg.cyl(0, 0, -0.25, 0.25, 0.08, 0.08, 8, STEEL);
      wg.setGlow(1.3, 0.001); for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; wg.glow[1] = (k % 4) / 4 + 0.001; wg.box(Math.cos(a) * Rw * 1.02 - 0.02, Math.sin(a) * Rw * 1.02 - 0.02, 0.17, Math.cos(a) * Rw * 1.02 + 0.02, Math.sin(a) * Rw * 1.02 + 0.02, 0.21, BULB); } wg.setGlow();
      // the wheel geometry is built with y up in the x–y plane; cylinder axis needs to lie along z
      const wheel = new T.Group(); const wm = meshOf(ctx, wg); wm.rotation.x = 0; wheel.add(wm);
      const node = new T.Group(); node.position.set(cx, y + H, cz); node.add(wheel);
      const gondolas = [], ng = 12;
      for (let k = 0; k < ng; k++) {
        const gg = new Geo(), gc = [C('#F4C542'), C('#3FBFB5'), C('#F26B5B'), C('#E26D8E')][k % 4];
        gg.tube([0, 0, 0], [0, -0.12, 0], 0.01, STEEL, 3);
        gg.box(-0.13, -0.32, -0.12, 0.13, -0.12, 0.12, gc, mul(gc, 0.85)); gg.cone(0, 0, -0.12, 0.0, 0.17, 6, gc);
        const m = meshOf(ctx, gg); node.add(m); gondolas.push(m);
      }
      add(node, (p) => {
        const a = spin(p) * Math.PI * 2 * 1.2;
        wheel.rotation.z = -a;
        gondolas.forEach((m, k) => { const b = (k / ng) * Math.PI * 2 - a; m.position.set(Math.cos(b) * Rw, Math.sin(b) * Rw, 0); });
      }, seatFn(ctx, node, Array.from({ length: 24 }, (_, k) => [0, 0, 0])), 65);
      // seats follow the gondolas: override with their positions
      const last = ctx.objs.dyn[ctx.objs.dyn.length - 1];
      const sm = Array.from({ length: 24 }, () => new T.Matrix4()), lm = new T.Matrix4();
      last.seats = () => { for (let k = 0; k < 24; k++) { const gm = gondolas[k % ng]; lm.makeTranslation(k < ng ? -0.06 : 0.06, -0.3, 0); lm.premultiply(new T.Matrix4().makeScale(0.9, 0.9, 0.9)); sm[k].multiplyMatrices(gm.matrixWorld, lm); } return sm; };
      break;
    }
    case 'bumper': {
      // open-sided red pavilion with a gable roof; cars glide on a polished floor
      const x0 = o.x + 0.15, x1 = o.x + o.n - 0.15, z0 = o.y + 0.15, z1 = o.y + o.n - 0.15;
      g.setGlow(0, 0, 0.8); g.box(x0, y, z0, x1, y + 0.05, z1, C('#6E6A70')); g.setGlow();
      g.box(x0, y, z0, x1, y + 0.2, z0 + 0.06, C('#F4C542')); g.box(x0, y, z1 - 0.06, x1, y + 0.2, z1, C('#F4C542'));
      for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, z0], [(x0 + x1) / 2, z1]]) g.box(px - 0.05, y, pz - 0.05, px + 0.05, y + 1.1, pz + 0.05, WHITE);
      const rh = y + 1.1, rp = y + 1.75, red = C('#B23A2A');
      g.quad([x0 - 0.15, rh, z0 - 0.1], [x0 - 0.15, rh, z1 + 0.1], [(x0 + x1) / 2, rp, z1 + 0.1], [(x0 + x1) / 2, rp, z0 - 0.1], red);
      g.quad([x1 + 0.15, rh, z1 + 0.1], [x1 + 0.15, rh, z0 - 0.1], [(x0 + x1) / 2, rp, z0 - 0.1], [(x0 + x1) / 2, rp, z1 + 0.1], mul(red, 0.9));
      g.tri([x0 - 0.15, rh, z1 + 0.1], [x1 + 0.15, rh, z1 + 0.1], [(x0 + x1) / 2, rp, z1 + 0.1], CREAM);
      g.tri([x1 + 0.15, rh, z0 - 0.1], [x0 - 0.15, rh, z0 - 0.1], [(x0 + x1) / 2, rp, z0 - 0.1], CREAM);
      g.setGlow(1.2, 0.001); for (let k = 0; k <= 10; k++) { const t = k / 10; g.glow[1] = (k % 3) / 3 + 0.001; g.box(x0 + (x1 - x0) * t - 0.025, rh - 0.05, z1 + 0.08, x0 + (x1 - x0) * t + 0.025, rh, z1 + 0.13, BULB); } g.setGlow();
      const node = new T.Group(); node.position.set(cx, y + 0.05, cz);
      const cars = [], nc = 6;
      for (let k = 0; k < nc; k++) { const cg = new Geo(), cc = [C('#F26B5B'), C('#3FBFB5'), C('#F4C542'), C('#E26D8E'), C('#4C8FA8'), C('#7FA05A')][k]; cg.setGlow(0, 0, 0.9); cg.box(-0.14, 0.02, -0.1, 0.14, 0.12, 0.1, cc); cg.setGlow(); cg.box(-0.15, 0, -0.11, 0.15, 0.04, 0.11, DARK); cg.tube([-0.1, 0.12, 0], [-0.1, 1.0, 0], 0.008, STEEL, 3); const m = meshOf(ctx, cg); node.add(m); cars.push(m); }
      const W = (x1 - x0) / 2 - 0.3, Dd = (z1 - z0) / 2 - 0.3;
      add(node, (p, t) => {
        cars.forEach((m, k) => {
          const s = p > 0 ? t * 0.7 + k * 1.1 : k * 1.1;
          m.position.set(Math.sin(s * (0.9 + k * 0.13) + k) * W, 0, Math.cos(s * (0.7 + k * 0.11) + k * 2) * Dd);
          m.rotation.y = p > 0 ? s * (1 + (k & 1)) : k;
        });
      }, seatFn(ctx, node, []));
      ctx.objs.dyn[ctx.objs.dyn.length - 1].seats = () => { node.updateMatrixWorld(true); return cars.map((m) => m.matrixWorld.clone().multiply(new T.Matrix4().makeScale(0.85, 0.85, 0.85))); };
      break;
    }
    case 'tower': {
      const top = 22 * LH, w0 = 0.3;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ctx.metal.tube([cx + sx * w0, y, cz + sz * w0], [cx + sx * w0 * 0.6, y + top, cz + sz * w0 * 0.6], 0.03, C('#8C877C'), 4);
      for (let k = 0; k < 12; k++) {
        const y0 = y + (k / 12) * top, y1 = y + ((k + 1) / 12) * top, s0 = w0 * (1 - 0.4 * k / 12), s1 = w0 * (1 - 0.4 * (k + 1) / 12);
        ctx.metal.tube([cx - s0, y0, cz - s0], [cx + s1, y1, cz - s1], 0.012, STEEL, 3); ctx.metal.tube([cx + s0, y0, cz + s0], [cx - s1, y1, cz + s1], 0.012, STEEL, 3);
        ctx.metal.tube([cx - s0, y0, cz + s0], [cx - s1, y1, cz - s1], 0.012, STEEL, 3); ctx.metal.tube([cx + s0, y0, cz - s0], [cx + s1, y1, cz + s1], 0.012, STEEL, 3);
      }
      g.cyl(cx, cz, y + top, y + top + 0.35, 0.3, 0.22, 10, C('#F26B5B')); g.cone(cx, cz, y + top + 0.35, y + top + 0.8, 0.25, 10, C('#F26B5B'), CREAM);
      g.setGlow(1.6); g.box(cx - 0.04, y + top + 0.8, cz - 0.04, cx + 0.04, y + top + 0.95, cz + 0.04, NEON.coral); g.setGlow();
      const cab = new Geo(); cab.cyl(0, 0, 0, 0.12, 0.62, 0.62, 16, col, C('#C8A070')); cab.cyl(0, 0, 0.12, 0.55, 0.6, 0.6, 16, C('#9EC9D6')); cab.cyl(0, 0, 0.55, 0.65, 0.64, 0.6, 16, col, CREAM);
      bulbs(cab, 0, 0, 0.6, 0.65, 16, 0.5);
      const node = partNode(ctx, cab, null, cx, y + 0.2, cz);
      add(node, (p) => {
        const lift = p <= 0 ? 0 : p < 0.35 ? ease(p / 0.35) : p < 0.7 ? 1 : 1 - ease((p - 0.7) / 0.3);
        node.position.y = y + 0.2 + lift * (top - 1.2); node.rotation.y = spin(p) * Math.PI * 2 * 1.5;
      }, seatFn(ctx, node, Array.from({ length: 20 }, (_, k) => { const a = (k / 20) * Math.PI * 2; return [Math.cos(a) * 0.45, 0.12, Math.sin(a) * 0.45]; }), (k) => -(k / 20) * Math.PI * 2 + Math.PI / 2), 75);
      break;
    }
    case 'swings': {
      g.cyl(cx, cz, y, y + 0.12, R * 0.4, R * 0.42, 14, C('#D9D0BE'));
      g.cyl(cx, cz, y, y + 2.0, 0.16, 0.12, 10, C('#4C8FA8'));
      const node = new T.Group(); node.position.set(cx, y + 2.0, cz);
      const tilt = new T.Group(); node.add(tilt);
      const cg = new Geo(); cg.cone(0, 0, 0, 0.45, R * 0.75, 16, C('#3FBFB5'), WHITE); cg.cyl(0, 0, -0.12, 0.0, R * 0.75, R * 0.75, 16, WHITE, null, mul(C('#3FBFB5'), 0.6), false); bulbs(cg, 0, 0, -0.06, R * 0.77, 16, 0.6);
      tilt.add(meshOf(ctx, cg));
      const chairs = [], nch = 16;
      for (let k = 0; k < nch; k++) { const ch = new T.Group(); const sg = new Geo(); sg.tube([0, 0, 0], [0, -1.0, 0], 0.006, STEEL, 3); sg.box(-0.08, -1.08, -0.08, 0.08, -0.98, 0.08, k % 2 ? col : C('#F4C542')); sg.box(-0.08, -1.08, 0.06, 0.08, -0.85, 0.08, k % 2 ? col : C('#F4C542')); ch.add(meshOf(ctx, sg)); tilt.add(ch); chairs.push(ch); }
      add(node, (p) => {
        const a = spin(p) * Math.PI * 2 * 4, fly = p <= 0 ? 0 : Math.min(1, Math.min(p, 1 - p) / 0.15);
        tilt.rotation.y = -a; tilt.rotation.x = Math.sin(a * 0.5) * 0.12 * fly;
        chairs.forEach((ch, k) => { const b = (k / nch) * Math.PI * 2; ch.position.set(Math.cos(b) * R * 0.7, -0.1, Math.sin(b) * R * 0.7); ch.rotation.order = 'YXZ'; ch.rotation.set(0, -b, fly * 0.85); });
      }, null);
      const d0 = ctx.objs.dyn[ctx.objs.dyn.length - 1], sm = chairs.map(() => new T.Matrix4()), lm = new T.Matrix4().compose(new T.Vector3(0, -1.06, 0), new T.Quaternion(), new T.Vector3(0.85, 0.85, 0.85));
      d0.seats = () => { node.updateMatrixWorld(true); chairs.forEach((ch, k) => sm[k].multiplyMatrices(ch.matrixWorld, lm)); return sm; };
      break;
    }
    case 'ship': {
      const H = 1.9;
      for (const xx of [-0.7, 0.7]) { ctx.metal.tube([cx + xx * 0.4, y, cz - 0.6], [cx + xx * 0.08, y + H, cz], 0.04, C('#5E4B3C'), 5); ctx.metal.tube([cx + xx * 0.4, y, cz + 0.6], [cx + xx * 0.08, y + H, cz], 0.04, C('#5E4B3C'), 5); }
      ctx.metal.tube([cx - 0.15, y + H, cz], [cx + 0.15, y + H, cz], 0.06, STEEL, 6);
      const node = new T.Group(); node.position.set(cx, y + H, cz);
      const hull = new Geo(); const L = 1.25, Wd = 0.32;
      for (let k = 0; k < 12; k++) {
        const t0 = k / 12, t1 = (k + 1) / 12, z0 = -L + 2 * L * t0, z1 = -L + 2 * L * t1;
        const yb = (t) => -1.55 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.45, yt = (t) => -1.15 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.5;
        for (const sx of [-1, 1]) hull.quad([sx * Wd, yb(t0), z0], [sx * Wd, yt(t0), z0], [sx * Wd, yt(t1), z1], [sx * Wd, yb(t1), z1], k % 2 ? col : mul(col, 0.9));
        hull.quad([-Wd, yb(t0), z0], [-Wd, yb(t1), z1], [Wd, yb(t1), z1], [Wd, yb(t0), z0], mul(col, 0.6));
        hull.box(-Wd, yt(t0) - 0.06, z0, Wd, yt(t0), z1, C('#C8A070'), null, false);
      }
      hull.tube([0, 0, 0], [0, -1.2, -0.7], 0.03, STEEL, 4); hull.tube([0, 0, 0], [0, -1.2, 0.7], 0.03, STEEL, 4);
      hull.box(-0.03, -1.2, 1.05, 0.03, -0.6, 1.15, CREAM); hull.cone(0, 1.12, -0.6, -0.35, 0.08, 4, C('#F26B5B'));
      const swing = new T.Group(); swing.add(meshOf(ctx, hull)); node.add(swing);
      add(node, (p) => { const amp = p <= 0 ? 0 : Math.sin(Math.PI * Math.min(1, p)) * 1.15; swing.rotation.x = Math.sin(p * Math.PI * 2 * 5) * amp; },
        seatFn(ctx, swing, Array.from({ length: 20 }, (_, k) => [(k % 2 ? 0.14 : -0.14), -1.12, -0.9 + Math.floor(k / 2) * 0.2]), () => 0, 0.9));
      break;
    }
    case 'boom': {
      const H = 3.0;
      g.cyl(cx, cz, y, y + H, 0.16, 0.12, 10, C('#5E4B3C')); g.box(cx - 0.3, y, cz - 0.3, cx + 0.3, y + 0.25, cz + 0.3, C('#6E6A62'));
      const node = new T.Group(); node.position.set(cx, y + H, cz + 0.18);
      const arm = new T.Group(); node.add(arm);
      const ag = new Geo(); ag.setGlow(0, 0, 0.6); ag.box(-2.3, -0.07, -0.06, 2.3, 0.07, 0.06, col); ag.setGlow(); ag.cyl(0, 0, -0.1, 0.1, 0.16, 0.16, 8, STEEL);
      ag.setGlow(1.4, 0.001); for (let k = -9; k <= 9; k++) { if (!k) continue; ag.glow[1] = (Math.abs(k) % 3) / 3 + 0.001; ag.box(k * 0.24 - 0.02, 0.07, 0.04, k * 0.24 + 0.02, 0.11, 0.08, BULB); } ag.setGlow();
      arm.add(meshOf(ctx, ag));
      const pods = [];
      for (const sx of [-1, 1]) { const pg = new Geo(); pg.box(-0.22, -0.18, -0.16, 0.22, 0.18, 0.16, sx > 0 ? C('#F26B5B') : C('#F4C542')); pg.box(-0.18, -0.12, 0.16, 0.18, 0.12, 0.2, C('#3A3A3A')); const m = meshOf(ctx, pg); m.position.set(sx * 2.3, 0, 0.12); arm.add(m); pods.push(m); }
      add(node, (p) => { const a = spin(p) * Math.PI * 2 * 4; arm.rotation.z = a; pods.forEach((m, k) => { m.rotation.z = -a + Math.sin(a * 1.5 + k) * 0.6 * (p > 0 ? 1 : 0); }); }, null);
      ctx.objs.dyn[ctx.objs.dyn.length - 1].seats = () => { node.updateMatrixWorld(true); const out = []; pods.forEach((m) => { for (let k = 0; k < 4; k++) out.push(m.matrixWorld.clone().multiply(new T.Matrix4().compose(new T.Vector3((k % 2 ? 0.1 : -0.1), -0.15, k < 2 ? 0.02 : 0.1), new T.Quaternion(), new T.Vector3(0.8, 0.8, 0.8)))); }); return out; };
      break;
    }
    case 'drop': {
      const top = 26 * LH;
      g.setGlow(0, 0, 0.5); g.cyl(cx, cz, y, y + top, 0.2, 0.18, 12, C('#EDEAE2')); g.setGlow();
      for (let k = 1; k < 9; k++) g.cyl(cx, cz, y + top * k / 9, y + top * k / 9 + 0.05, 0.23, 0.23, 12, C('#C99A92'));
      g.cyl(cx, cz, y + top, y + top + 0.4, 0.4, 0.32, 12, C('#C99A92')); g.cone(cx, cz, y + top + 0.4, y + top + 0.7, 0.34, 12, C('#F26B5B'));
      g.setGlow(1.5, 0.001); for (let k = 0; k < 24; k++) { const yy = y + 0.4 + (k / 24) * (top - 0.6); g.glow[1] = k / 24 + 0.001; g.box(cx - 0.03, yy, cz + 0.19, cx + 0.03, yy + 0.06, cz + 0.23, NEON.pink); } g.setGlow();
      g.box(cx - 0.55, y, cz - 0.55, cx + 0.55, y + 0.2, cz + 0.55, C('#8C877C'));
      const ring = new Geo(); ring.cyl(0, 0, 0, 0.3, 0.62, 0.62, 16, col, C('#E8C8C0')); ring.cyl(0, 0, -0.05, 0.0, 0.55, 0.62, 16, DARK, null, DARK);
      const node = partNode(ctx, ring, null, cx, y + 0.25, cz);
      add(node, (p) => {
        const z = p <= 0 ? 0 : p < 0.55 ? ease(p / 0.55) : p < 0.68 ? 1 : p < 0.76 ? 1 - Math.pow((p - 0.68) / 0.08, 2) * 0.92 : 0.08 * (1 - (p - 0.76) / 0.24);
        node.position.y = y + 0.25 + z * (top - 1.0);
      }, seatFn(ctx, node, Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return [Math.cos(a) * 0.55, -0.25, Math.sin(a) * 0.55]; }), (k) => -(k / 12) * Math.PI * 2 + Math.PI / 2, 0.85), 50);
      break;
    }
    case 'sky': {
      const top = 20 * LH, x0 = o.x + 0.25, z0 = o.y + 0.25, x1 = o.x + o.n - 0.25, z1 = o.y + o.n - 0.25;
      ctx.metal.tube([x0, y, z0], [x0 + 0.2, y + top, z0 + 0.2], 0.06, C('#5E4B3C'), 6); ctx.metal.tube([x1, y, z1], [x1 - 0.2, y + top, z1 - 0.2], 0.06, C('#5E4B3C'), 6);
      ctx.metal.tube([x0 + 0.2, y + top, z0 + 0.2], [x1 - 0.2, y + top, z1 - 0.2], 0.03, STEEL, 4);
      g.setGlow(1.4); g.box(x0 + 0.12, y + top, z0 + 0.12, x0 + 0.28, y + top + 0.12, z0 + 0.28, NEON.coral); g.box(x1 - 0.28, y + top, z1 - 0.28, x1 - 0.12, y + top + 0.12, z1 - 0.12, NEON.coral); g.setGlow();
      g.box(cx - 0.3, y, cz - 0.3, cx + 0.3, y + 0.15, cz + 0.3, C('#F4C542'));
      const node = new T.Group(); node.position.set(cx, y + top, cz);
      const L = top - 0.4, fl = new Geo(); fl.tube([0, 0, 0], [0, -L, 0], 0.008, DARK, 3); fl.box(-0.2, -L - 0.12, -0.08, 0.2, -L, 0.08, col);
      const arm = new T.Group(); arm.add(meshOf(ctx, fl)); node.add(arm); arm.rotation.order = 'YXZ'; arm.rotation.y = Math.PI / 4;
      // hoisted back on a tow line, released, then swings out and settles
      add(node, (p) => { arm.rotation.x = p <= 0 ? 0 : p < 0.25 ? -1.35 * ease(p / 0.25) : -1.35 * Math.cos((p - 0.25) * Math.PI * 2 * 3.2) * (1 - ease((p - 0.25) / 0.75) * 0.85); },
        seatFn(ctx, arm, [[-0.1, -L + 0.02, 0], [0, -L + 0.02, 0], [0.1, -L + 0.02, 0]], () => 0, 0.8));
      break;
    }
  }
}

// ---------- water rides ------------------------------------------------------------------------------
function buildWaterRide(ctx, o, col) {
  const { g, pools, T } = ctx, y = o.h * LH, n = o.n, cx = o.x + n / 2, cz = o.y + n / 2;
  const closed = o.cal === false || o.status === 'standing';
  const deck = C('#D8CDB8'), tile = C('#BFE3E8'), water = closed ? C('#6E9AA4') : C('#3FA8C0');
  ctx.pave.box(o.x + 0.04, y, o.y + 0.04, o.x + n - 0.04, y + 0.07, o.y + n - 0.04, deck, STONE2, false);
  const pool = (x0, z0, x1, z1, depth = 0.25, wcol = water) => {
    g.box(x0, y - depth, z0, x1, y - depth + 0.02, z1, tile, null, false);
    for (const [a, b, c, dd] of [[x0, z0, x1, z0 + 0.03], [x0, z1 - 0.03, x1, z1], [x0, z0, x0 + 0.03, z1], [x1 - 0.03, z0, x1, z1]]) g.box(a, y - depth, b, c, y + 0.09, dd, C('#E8E2D4'), tile, false);
    pools.quad([x0, y + 0.085, z0], [x0, y + 0.085, z1], [x1, y + 0.085, z1], [x1, y + 0.085, z0], wcol);
  };
  switch (o.type) {
    case 'wave': {
      pool(o.x + 0.25, o.y + 0.6, o.x + n - 0.25, o.y + n - 0.25, 0.35);
      // beach entry: sand strip on the front edge, wave machine house at the back
      g.box(o.x + 0.25, y + 0.02, o.y + n - 0.7, o.x + n - 0.25, y + 0.06, o.y + n - 0.25, C('#E6D2A8'), null, false);
      g.box(o.x + 0.3, y, o.y + 0.1, o.x + n - 0.3, y + 0.75, o.y + 0.55, C('#9C7A55'), C('#8A6A48')); g.box(o.x + 0.25, y + 0.75, o.y + 0.05, o.x + n - 0.25, y + 0.82, o.y + 0.6, C('#4C8FA8'));
      const wg = new Geo(); for (let k = 0; k < 3; k++) wg.box(-n / 2 + 0.3, 0, -0.03 + k * 0.55, n / 2 - 0.3, 0.025 - k * 0.006, 0.03 + k * 0.55, mul(C('#E8F6F6'), 0.7 - k * 0.15));
      const node = partNode(ctx, wg, ctx.objs.mats.pool, cx, y + 0.02, cz); const m = node.children[0];
      ctx.add({ o, node, update: (p, t) => { if (!m) return; m.position.z = closed ? 0 : (((t * 0.25) % 1) * (n - 1.2)) - (n / 2 - 0.9); m.visible = !closed; }, seats: null });
      break;
    }
    case 'river': {
      pool(o.x + 0.2, o.y + 0.2, o.x + n - 0.2, o.y + n - 0.2, 0.25);
      g.box(o.x + 1.05, y - 0.25, o.y + 1.05, o.x + n - 1.05, y + 0.16, o.y + n - 1.05, C('#6E9A45'), C('#9C9284'));
      if (ctx.models.rock_a) { g.model(ctx.models.rock_a, modelColor(ctx.models.rock_a, {}), mat(cx - 0.55, y + 0.16, cz + 0.45, 1, 0.8)); g.model(ctx.models.rock_b, modelColor(ctx.models.rock_b, {}), mat(cx + 0.5, y + 0.16, cz - 0.4, 2, 0.7)); }
      if (ctx.models.oak_a) g.model(ctx.models.oak_a, modelColor(ctx.models.oak_a, {}), mat(cx, y + 0.16, cz, 0.7, 0.45)); else { g.cone(cx, cz, y + 0.22, y + 1.3, 0.5, 7, C('#3D6B3A')); g.cyl(cx, cz, y + 0.22, y + 0.5, 0.06, 0.05, 5, WOOD2); }
      const tubes = new T.Group(); tubes.position.set(cx, y + 0.03, cz);
      const tm = ctx.models.tube; const list = [];
      for (let k = 0; k < 10; k++) { const tg = new Geo(), tc = [C('#F4C542'), C('#F26B5B'), C('#3FBFB5'), C('#E26D8E')][k % 4]; if (tm) tg.model(tm, modelColor(tm, { 0: tc }), mat(0, 0, 0, 0, 0.8)); else tg.cyl(0, 0, 0, 0.08, 0.18, 0.18, 10, tc, mul(tc, 0.6)); const mm = meshOf(ctx, tg); tubes.add(mm); list.push(mm); }
      ctx.add({ o, node: tubes, update: (p, t) => list.forEach((mm, k) => { const s = ((closed ? 0 : t * 0.03) + k / 10) % 1, L = n - 1.4, per = 4 * L; let d = s * per, x, z; const h = L / 2; if (d < L) { x = -h + d; z = -h; } else if (d < 2 * L) { x = h; z = -h + d - L; } else if (d < 3 * L) { x = h - (d - 2 * L); z = h; } else { x = -h; z = h - (d - 3 * L); } mm.position.set(x, 0, z); mm.rotation.y = t * 0.3 + k; }),
        seats: () => { tubes.updateMatrixWorld(true); return list.map((mm) => mm.matrixWorld.clone().multiply(new T.Matrix4().compose(new T.Vector3(0, -0.02, 0), new T.Quaternion(), new T.Vector3(0.8, 0.8, 0.8)))); } });
      break;
    }
    case 'slides': case 'complex': case 'racer': {
      pool(o.x + 0.2, o.y + n - 1.25, o.x + n - 0.2, o.y + n - 0.2, 0.3);
      const tz = o.type === 'racer' ? 1.6 : 2.6, tx0 = o.x + 0.2, tz0 = o.y + 0.2;
      // tower: stacked platforms with stairs
      for (const [px, pz] of [[0, 0], [0.8, 0], [0, 0.8], [0.8, 0.8]]) g.box(tx0 + px, y, tz0 + pz, tx0 + px + 0.08, y + tz, tz0 + pz + 0.08, C('#C8C3B6'));
      for (let k = 1; k <= 3; k++) g.box(tx0 - 0.05, y + tz * k / 3 - 0.05, tz0 - 0.05, tx0 + 0.93, y + tz * k / 3, tz0 + 0.93, C('#4C8FA8'));
      g.cone(tx0 + 0.44, tz0 + 0.44, y + tz + 0.4, y + tz + 0.8, 0.65, 8, C('#F4C542'), CREAM); for (const [px, pz] of [[0, 0], [0.8, 0], [0, 0.8], [0.8, 0.8]]) g.box(tx0 + px, y + tz, tz0 + pz, tx0 + px + 0.05, y + tz + 0.45, tz0 + pz + 0.05, WHITE);
      const lanes = o.type === 'racer' ? 4 : 3, cols = [C('#F26B5B'), C('#F4C542'), C('#3FBFB5'), C('#E26D8E')];
      for (let k = 0; k < lanes; k++) {
        const pts = [];
        for (let s = 0; s <= 24; s++) {
          const t = s / 24;
          let px, pz;
          if (o.type === 'racer') { px = tx0 + 0.2 + k * 0.22; pz = tz0 + 0.95 + (n - 1.7 - 0.2) * t; }
          else { const a = t * Math.PI * (1.4 + k * 0.5) + k; const r = 0.55 + 0.5 * t; px = cx - 0.2 + Math.cos(a) * r * (0.6 + 0.4 * t) + k * 0.15; pz = tz0 + 0.5 + t * (n - 1.5) + Math.sin(a) * r * 0.4; }
          pts.push([px, y + tz - (tz - 0.12) * Math.pow(t, o.type === 'racer' ? 1.4 : 1), pz]);
        }
        ctx.metal.setGlow(0.07); ctx.metal.sweep(pts, 0.09, cols[k], 10); ctx.metal.setGlow();
        if (o.type === 'racer') for (let s = 4; s < pts.length - 1; s += 5) g.tube([pts[s][0], y, pts[s][2]], [pts[s][0], pts[s][1] - 0.09, pts[s][2]], 0.02, C('#C8C3B6'), 4);
      }
      if (!closed) ctx.world.fx.addSplash(cx, y + 0.1, o.y + n - 0.9, 0.7);
      if (o.type === 'complex') { g.box(o.x + n - 1.0, y, o.y + 0.25, o.x + n - 0.25, y + 0.9, o.y + 1.0, C('#E26D8E'), C('#C85878')); g.cone(o.x + n - 0.62, o.y + 0.62, y + 0.9, y + 1.4, 0.55, 6, C('#F4C542'), CREAM); }
      break;
    }
    case 'surf': {
      // a standing-wave sheet: an inclined blue ramp with flowing stripes
      g.box(o.x + 0.3, y, o.y + 0.3, o.x + n - 0.3, y + 0.5, o.y + 0.6, C('#1E4E79'));
      for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8; const zz0 = o.y + 0.6 + t0 * (n - 1.1), zz1 = o.y + 0.6 + t1 * (n - 1.1); const yy0 = y + 0.5 - Math.sin(t0 * Math.PI) * 0.0 - t0 * 0.42, yy1 = y + 0.5 - t1 * 0.42;
        pools.quad([o.x + 0.4, yy0 + 0.02, zz0], [o.x + 0.4, yy1 + 0.02, zz1], [o.x + n - 0.4, yy1 + 0.02, zz1], [o.x + n - 0.4, yy0 + 0.02, zz0], water); }
      g.box(o.x + 0.25, y, o.y + 0.3, o.x + 0.4, y + 0.7, o.y + n - 0.3, C('#F4C542')); g.box(o.x + n - 0.4, y, o.y + 0.3, o.x + n - 0.25, y + 0.7, o.y + n - 0.3, C('#F4C542'));
      break;
    }
    case 'splash': {
      pool(o.x + 0.25, o.y + 0.25, o.x + n - 0.25, o.y + n - 0.25, 0.12, closed ? water : C('#5EC0D0'));
      const fx0 = o.x + 1.0, fz0 = o.y + 1.0, fx1 = o.x + n - 1.0, fz1 = o.y + n - 1.0;
      for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 3; iz++) { const px = fx0 + (fx1 - fx0) * ix / 2, pz = fz0 + (fz1 - fz0) * iz / 2; g.cyl(px, pz, y, y + 1.6, 0.06, 0.06, 6, [C('#F26B5B'), C('#F4C542'), C('#3FBFB5')][(ix + iz) % 3]); }
      g.box(fx0 - 0.1, y + 0.7, fz0 - 0.1, fx1 + 0.1, y + 0.78, fz1 + 0.1, C('#F2A541')); g.box(fx0 - 0.1, y + 1.4, fz0 - 0.1, fx1 + 0.1, y + 1.48, fz1 + 0.1, C('#3FBFB5'));
      g.cone(cx, cz, y + 1.6, y + 2.2, (fx1 - fx0) * 0.75, 8, C('#F26B5B'), CREAM);
      ctx.metal.sweep([[fx1, y + 1.2, cz], [o.x + n - 0.3, y + 0.1, cz + 0.6]], 0.09, C('#F4C542'), 10);
      const bg = new Geo(); bg.cyl(0, 0, -0.25, 0.25, 0.28, 0.34, 10, C('#F4C542'), null, mul(C('#F4C542'), 0.6)); bg.tube([-0.4, 0, 0], [0.4, 0, 0], 0.03, STEEL, 4);
      const node = partNode(ctx, bg, null, cx, y + 2.55, cz); const bucket = node.children[0];
      ctx.add({ o, node, update: (p, t) => { if (bucket) bucket.rotation.x = closed ? 0 : Math.max(0, Math.sin(t * 0.4) - 0.8) * 8; }, seats: null });
      break;
    }
  }
}

// ---------- amphitheater ---------------------------------------------------------------------------------
function buildAmphi(ctx, o) {
  const { g, T } = ctx, y = o.h * LH, n = o.n, x0 = o.x, z0 = o.y;
  g.box(x0 + 0.04, y, z0 + 0.04, x0 + n - 0.04, y + 0.04, z0 + n - 0.04, C('#6E9A45'), STONE2, false);
  // terraced stone seating facing the stage on the +x side
  for (let r = 0; r < 5; r++) {
    const xx = x0 + 0.25 + r * 0.42, h = y + 0.06 + r * 0.12;
    g.box(xx, y, z0 + 0.35, xx + 0.42, h + 0.06, z0 + n - 0.35, r % 2 ? STONE : mix(STONE, C('#B5A88C'), 0.4), STONE2, false);
    for (let k = 0; k < 7; k++) g.box(xx + 0.1, h + 0.06, z0 + 0.45 + k * 0.45, xx + 0.32, h + 0.14, z0 + 0.8 + k * 0.45, C('#C8402E'), C('#9A2A1C'), false);
  }
  // stage and band shell (a quarter dome of ribbed panels)
  g.box(x0 + n - 1.25, y, z0 + 0.35, x0 + n - 0.2, y + 0.3, z0 + n - 0.35, WOOD2, C('#5E4B3C'));
  const sx = x0 + n - 0.3, scz = z0 + n / 2, Rr = 1.5;
  for (let k = 0; k < 10; k++) for (let j = 0; j < 5; j++) {
    const a0 = (k / 10) * Math.PI, a1 = ((k + 1) / 10) * Math.PI, b0 = (j / 5) * Math.PI / 2, b1 = ((j + 1) / 5) * Math.PI / 2;
    const P = (a, b) => [sx - Math.sin(b) * 0.0 - Math.cos(b) * Math.sin(a) * Rr * 0.75, y + 0.3 + Math.sin(b) * Rr, scz + Math.cos(a) * Rr * Math.cos(b)];
    const c = (k + j) % 2 ? C('#EDE3C8') : C('#E2D6B8');
    g.quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1), c);
  }
  g.setGlow(1.5, 0.001); for (let k = 0; k < 12; k++) { const a = (k / 11) * Math.PI; g.glow[1] = (k % 4) / 4 + 0.001; g.box(sx - Math.sin(a) * Rr * 0.75 - 0.03, y + 0.3, scz + Math.cos(a) * Rr - 0.03, sx - Math.sin(a) * Rr * 0.75 + 0.03, y + 0.38, scz + Math.cos(a) * Rr + 0.03, NEON.coral); } g.setGlow();
  // light towers
  // a lighting truss on two towers across the front of the stage, lamps hung from it
  const tx = x0 + n - 1.4;
  for (const zz of [z0 + 0.2, z0 + n - 0.2]) { ctx.metal.tube([tx, y, zz], [tx, y + 2.3, zz], 0.05, DARK, 6); ctx.metal.tube([tx - 0.12, y, zz], [tx, y + 2.3, zz], 0.02, DARK, 4); }
  ctx.metal.tube([tx, y + 2.3, z0 + 0.2], [tx, y + 2.3, z0 + n - 0.2], 0.04, DARK, 5); ctx.metal.tube([tx, y + 2.18, z0 + 0.2], [tx, y + 2.18, z0 + n - 0.2], 0.03, DARK, 5);
  g.setGlow(1.6); for (let k = 1; k < 6; k++) { const zz = z0 + 0.2 + (n - 0.4) * k / 6; g.box(tx - 0.06, y + 2.02, zz - 0.06, tx + 0.06, y + 2.16, zz + 0.06, C('#FFF0C8'), C('#3A3A3A')); } g.setGlow();
  void T;
}

// ---------- stalls ---------------------------------------------------------------------------------------
function buildStall(ctx, o) {
  const { g, S } = ctx, d = STALLS[o.type], y = o.h * LH, x = o.x, z = o.y;
  const [ex, ey] = entrySide(S, o);
  const yaw = Math.atan2(ex, ey); // front faces the path
  g.setMatrix(mat(x + 0.5, y, z + 0.5, yaw));
  if (o.type === 'bench') {
    g.box(-0.32, 0, -0.06, -0.28, 0.14, 0.06, DARK); g.box(0.28, 0, -0.06, 0.32, 0.14, 0.06, DARK);
    for (let k = 0; k < 3; k++) g.box(-0.36, 0.14, -0.1 + k * 0.06, 0.36, 0.165, -0.06 + k * 0.06, WOOD);
    for (let k = 0; k < 2; k++) g.box(-0.36, 0.2 + k * 0.08, -0.14, 0.36, 0.25 + k * 0.08, -0.11, WOOD);
    g.setMatrix(null); return;
  }
  if (o.type === 'restroom') {
    // rustic stone comfort station with a dark timber roof (park-service style)
    g.box(-0.4, 0, -0.38, 0.4, 0.7, 0.3, STONE, STONE2);
    for (let k = 0; k < 4; k++) g.box(-0.41, 0.12 + k * 0.16, -0.39, 0.41, 0.14 + k * 0.16, 0.31, STONE2, STONE2, false);
    g.quad([-0.5, 0.68, -0.48], [-0.5, 0.68, 0.4], [0, 0.98, 0.4], [0, 0.98, -0.48], ROOF); g.quad([0.5, 0.68, 0.4], [0.5, 0.68, -0.48], [0, 0.98, -0.48], [0, 0.98, 0.4], mul(ROOF, 0.85));
    g.tri([-0.5, 0.68, 0.4], [0.5, 0.68, 0.4], [0, 0.98, 0.4], WOOD2); g.tri([0.5, 0.68, -0.48], [-0.5, 0.68, -0.48], [0, 0.98, -0.48], WOOD2);
    g.box(-0.28, 0, 0.3, -0.08, 0.45, 0.32, C('#3E5A4A')); g.box(0.08, 0, 0.3, 0.28, 0.45, 0.32, C('#3E5A4A'));
    g.setGlow(1.2); g.box(-0.07, 0.5, 0.3, 0.07, 0.6, 0.33, C('#FFF0C8')); g.setGlow();
    g.setMatrix(null); return;
  }
  const col = C(d.color);
  if (d.need === 'food' || d.need === 'merch') { buildShopFront(g, o, d, col); g.setMatrix(null); ctx.glowDecal.push([x + 0.5, y, z + 0.5, 0.9, [1, 0.8, 0.4], 0.5]); return; }
  // kiosk: counter, back room, striped awning, a sign board with a glowing icon shape
  g.box(-0.38, 0, -0.38, 0.38, 0.62, 0.2, CREAM, C('#E8DCC0'));
  g.box(-0.4, 0, 0.2, 0.4, 0.3, 0.34, col, mul(col, 0.85));
  g.box(-0.42, 0.3, 0.2, 0.42, 0.34, 0.36, C('#E8E0D0'));
  for (let k = 0; k < 6; k++) { const x0 = -0.44 + k * 0.1467, x1 = x0 + 0.1467; g.quad([x0, 0.82, -0.05], [x0, 0.62, 0.48], [x1, 0.62, 0.48], [x1, 0.82, -0.05], k % 2 ? CREAM : col); }
  g.setGlow(0, 0, 0); g.box(-0.4, 0.62, -0.4, 0.4, 0.86, -0.05, mul(col, 0.9), mul(col, 0.8));
  g.box(-0.3, 0.86, -0.12, 0.3, 1.08, -0.06, C('#34424A'));
  g.setGlow(1.3); const ic = { food: NEON.yellow, snack: NEON.pink, drink: NEON.turq, merch: NEON.coral }[d.need] || NEON.yellow;
  if (d.need === 'food') { g.cyl(0, -0.05, 0.92, 0.95, 0.09, 0.09, 8, ic, ic, null, false); g.box(-0.09, 0.96, -0.08, 0.09, 1.0, -0.05, ic); }
  else if (d.need === 'drink') { g.box(-0.04, 0.9, -0.08, 0.04, 1.04, -0.05, ic); g.box(-0.015, 1.04, -0.08, 0.015, 1.07, -0.05, ic); }
  else if (d.need === 'snack') { for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; g.box(Math.cos(a) * 0.07 - 0.02, 0.97 + Math.sin(a) * 0.07 - 0.02, -0.08, Math.cos(a) * 0.07 + 0.02, 0.97 + Math.sin(a) * 0.07 + 0.02, -0.05, ic); } }
  else { g.box(-0.08, 0.92, -0.08, 0.08, 1.02, -0.05, ic); }
  g.setGlow();
  g.setMatrix(null);
  ctx.glowDecal.push([x + 0.5, y, z + 0.5, 0.9, [1, 0.8, 0.4]]);
}

// a small spa-town shop front (original, inspired by the stucco, arched windows and tile roofs of the town's
// historic bathhouse-era buildings): stucco walls, an arched serving window, a hipped tile roof and a striped awning
function buildShopFront(g, o, d, col) {
  const stucco = { food: C('#E8D8B8'), merch: C('#E2CFA6') }[d.need] || C('#E8D8B8'), trim = C('#B8A07A'), tile = C('#B05A3C'), tile2 = C('#9A4A30');
  g.box(-0.4, 0, -0.4, 0.4, 0.66, 0.3, stucco, mul(stucco, 0.9));
  g.box(-0.42, 0, -0.42, 0.42, 0.08, 0.32, trim, trim, false);
  g.box(-0.42, 0.62, -0.42, 0.42, 0.7, 0.32, trim, trim, false);
  // arched serving window facing the path (+z): dark opening, round head, counter
  g.box(-0.22, 0.2, 0.3, 0.22, 0.48, 0.32, C('#3A2A22'));
  for (let k = 0; k < 6; k++) { const a0 = (k / 6) * Math.PI, a1 = ((k + 1) / 6) * Math.PI; g.tri([0, 0.48, 0.321], [Math.cos(a0) * 0.22, 0.48 + Math.sin(a0) * 0.12, 0.321], [Math.cos(a1) * 0.22, 0.48 + Math.sin(a1) * 0.12, 0.321], C('#3A2A22')); }
  g.box(-0.26, 0.2, 0.3, 0.26, 0.24, 0.42, trim);
  g.setGlow(0.9); g.box(-0.18, 0.25, 0.305, 0.18, 0.45, 0.31, C('#FFD9A0')); g.setGlow();
  // hipped tile roof
  const r0 = 0.48, ry = 0.7, ap = 0.98;
  g.tri([-r0, ry, 0.38], [r0, ry, 0.38], [0, ap, -0.05], tile); g.tri([r0, ry, -0.48], [-r0, ry, -0.48], [0, ap, -0.05], tile2);
  g.tri([r0, ry, 0.38], [r0, ry, -0.48], [0, ap, -0.05], mul(tile, 0.92)); g.tri([-r0, ry, -0.48], [-r0, ry, 0.38], [0, ap, -0.05], mul(tile, 0.85));
  // striped awning over the window in the stall colour, and a glowing sign shape on the roof ridge
  for (let k = 0; k < 5; k++) { const x0 = -0.3 + k * 0.12, x1 = x0 + 0.12; g.quad([x0, 0.62, 0.32], [x0, 0.5, 0.5], [x1, 0.5, 0.5], [x1, 0.62, 0.32], k % 2 ? CREAM : col); }
  g.setGlow(1.3); g.box(-0.16, 0.74, 0.34, 0.16, 0.84, 0.37, col, col); g.setGlow();
}

// ---------- path dressing (decorative only: lamps, benches and planters the sim does not know about) ------------------
function dressPaths(ctx) {
  const { g, S } = ctx, M = S.map, w = M.w;
  const entries = new Set(S.objects.filter((o) => o.entry >= 0).map((o) => o.entry));
  for (let i = 0; i < w * M.h; i++) {
    if (!M.path[i] || i === M.gate || entries.has(i)) continue;
    const x = i % w, z = Math.floor(i / w), y = M.height[i] * LH + 0.035;
    // pick a curb side with no path on it
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => { const X = x + dx, Z = z + dz; return X >= 0 && Z >= 0 && X < w && Z < M.h && !M.path[Z * w + X]; });
    if (!sides.length) {
      // a plaza cell (paths all round): a shade tree in an iron grate or a round stone planter, centred
      const r2 = hash2(i, 65), px = x + 0.5 + (hash2(i, 67) - 0.5) * 0.3, pz = z + 0.5 + (hash2(i, 69) - 0.5) * 0.3;
      if (r2 < 0.12 && ctx.models.oak_b) { g.cyl(px, pz, y, y + 0.03, 0.2, 0.2, 10, DARK); g.model(ctx.models.oak_b, modelColor(ctx.models.oak_b, { 1: C('#5E8A42'), 2: C('#4E7A3A') }), mat(px, y + 0.03, pz, hash2(i, 71) * 6.28, 0.36)); }
      else if (r2 < 0.2) { g.cyl(px, pz, y, y + 0.16, 0.2, 0.22, 12, STONE, C('#6A4A32')); const fc = ['#E26D8E', '#F4C542', '#FFF6E0', '#F26B5B'].map(C); for (let k = 0; k < 7; k++) { const a = k * 0.9, rr = 0.06 + (k % 3) * 0.04; g.box(px + Math.cos(a) * rr - 0.03, y + 0.16, pz + Math.sin(a) * rr - 0.03, px + Math.cos(a) * rr + 0.03, y + 0.22, pz + Math.sin(a) * rr + 0.03, k % 2 ? C('#4E7A3A') : fc[k % 4]); } }
      continue;
    }
    const r = hash2(i, 61), [dx, dz] = sides[Math.floor(hash2(i, 63) * sides.length) % sides.length];
    const px = x + 0.5 + dx * 0.38, pz = z + 0.5 + dz * 0.38;
    const nb = S.map.occ[(z + dz) * w + (x + dx)] || S.map.tree[(z + dz) * w + (x + dx)];
    if (r < 0.1 && !nb) {
      // a mid-century globe lamp
      g.cyl(px, pz, y, y + 0.05, 0.05, 0.045, 6, DARK); g.cyl(px, pz, y, y + 0.85, 0.018, 0.015, 5, C('#2E3A3A'));
      g.setGlow(2.0); g.cyl(px, pz, y + 0.83, y + 0.93, 0.055, 0.055, 7, C('#FFF0C8'), C('#FFF0C8'), C('#FFF0C8')); g.setGlow();
      ctx.glowDecal.push([px, y, pz, 1.1, [1, 0.86, 0.6], 0.9]);
    } else if (r < 0.15 && !nb) {
      g.setMatrix(mat(px, y, pz, Math.atan2(-dx, -dz)));
      for (let k = 0; k < 3; k++) g.box(-0.3, 0.12, -0.06 + k * 0.045, 0.3, 0.14, -0.03 + k * 0.045, WOOD);
      g.box(-0.3, 0.17, 0.05, 0.3, 0.32, 0.075, WOOD); g.box(-0.27, 0, -0.06, -0.24, 0.12, 0.06, DARK); g.box(0.24, 0, -0.06, 0.27, 0.12, 0.06, DARK);
      g.setMatrix(null);
    } else if (r < 0.24 && !nb) {
      // a stone planter of flowers
      g.box(px - 0.13, y, pz - 0.13, px + 0.13, y + 0.14, pz + 0.13, STONE, STONE2);
      const fc = ['#E26D8E', '#F4C542', '#FFF6E0', '#F26B5B'].map(C);
      for (let k = 0; k < 6; k++) { const fx = px - 0.08 + hash2(i, k) * 0.16, fz = pz - 0.08 + hash2(k, i) * 0.16; g.box(fx - 0.03, y + 0.14, fz - 0.03, fx + 0.03, y + 0.2, fz + 0.03, k % 2 ? C('#4E7A3A') : fc[k % 4]); }
    } else if (r < 0.28) {
      g.cyl(px, pz, y, y + 0.22, 0.06, 0.07, 7, C('#355E41'), C('#2A4A33'));
    }
  }
}

// ---------- scenery --------------------------------------------------------------------------------------
function buildScenery(ctx, o) {
  const { g, S, models } = ctx, d = SCENERY[o.type], y = o.h * LH, x = o.x + 0.5, z = o.y + 0.5;
  if (d.tree) return; // instanced with the forest
  const md = (name, map, s = 1, rot = hash2(o.id, 3) * 6.28) => { const m = models[name]; if (m) g.model(m, modelColor(m, map || {}), mat(x, y, z, rot, s)); return !!m; };
  switch (o.type) {
    case 'trash': g.cyl(x, z, y, y + 0.26, 0.09, 0.1, 8, C('#355E41'), C('#2A4A33')); g.cyl(x, z, y + 0.26, y + 0.3, 0.11, 0.08, 8, C('#2A4A33'), C('#2A4A33')); break;
    case 'lamp': {
      g.cyl(x, z, y, y + 0.08, 0.07, 0.06, 6, DARK); g.cyl(x, z, y, y + 1.05, 0.025, 0.02, 6, C('#2E3A3A'));
      g.tube([x, y + 1.0, z], [x + 0.12, y + 1.05, z], 0.015, C('#2E3A3A'), 4);
      g.setGlow(2.2); g.cyl(x + 0.14, z, y + 0.96, y + 1.08, 0.07, 0.07, 8, C('#FFF0C8'), C('#FFF0C8'), C('#FFF0C8')); g.setGlow();
      ctx.glowDecal.push([x + 0.14, y, z, 1.6, [1, 0.88, 0.62]]);
      break;
    }
    case 'sign': {
      g.cyl(x, z, y, y + 1.2, 0.03, 0.03, 6, DARK);
      g.setMatrix(mat(x, y + 1.3, z, Math.PI / 4));
      g.box(-0.36, -0.1, -0.03, 0.22, 0.1, 0.03, CREAM, C('#E0D4B8')); g.box(-0.38, -0.12, -0.035, 0.24, -0.1, 0.035, C('#3FBFB5')); g.box(-0.38, 0.1, -0.035, 0.24, 0.12, 0.035, C('#3FBFB5'));
      g.setGlow(2.0, 0.001);
      for (let k = 0; k < 7; k++) { g.glow[1] = k / 7 + 0.001; g.box(-0.33 + k * 0.075, -0.025, 0.03, -0.29 + k * 0.075, 0.025, 0.05, NEON.coral); }
      g.tri([0.22, -0.16, 0.035], [0.38, 0, 0.035], [0.22, 0.16, 0.035], NEON.coral);
      g.setGlow(); g.setMatrix(null);
      ctx.glowDecal.push([x, y, z, 1.4, [1, 0.3, 0.25]]);
      break;
    }
    case 'flowers': {
      g.box(o.x + 0.12, y, o.y + 0.12, o.x + 0.88, y + 0.08, o.y + 0.88, C('#6A4A32'), STONE2, false);
      const fc = ['#E26D8E', '#F4C542', '#FFF6E0', '#B5568F', '#F26B5B'].map(C);
      for (let k = 0; k < 22; k++) { const fx = o.x + 0.2 + hash2(o.id, k) * 0.6, fz = o.y + 0.2 + hash2(k, o.id) * 0.6; g.box(fx - 0.015, y + 0.08, fz - 0.015, fx + 0.015, y + 0.15, fz + 0.015, C('#4E7A3A')); g.box(fx - 0.035, y + 0.15, fz - 0.035, fx + 0.035, y + 0.2, fz + 0.035, fc[k % fc.length]); }
      break;
    }
    case 'fountain': {
      // a thermal spring basin: travertine-like terraces of warm mineral stone, steaming water
      const x0 = o.x, z0 = o.y;
      g.box(x0 + 0.08, y, z0 + 0.08, x0 + 1.92, y + 0.06, z0 + 1.92, C('#D8CDB8'), STONE2, false);
      g.cyl(x0 + 1, z0 + 1, y, y + 0.22, 0.85, 0.85, 20, C('#C8B89A'), C('#B8A888'));
      g.cyl(x0 + 1, z0 + 1, y + 0.22, y + 0.42, 0.5, 0.48, 16, C('#BFA982'), C('#B09870'));
      g.cyl(x0 + 1, z0 + 1, y + 0.42, y + 0.62, 0.24, 0.2, 12, C('#B39A78'), C('#A08A68'));
      ctx.pools.disc(x0 + 1, z0 + 1, y + 0.2, 0.78, 20, C('#4FB3B0')); ctx.pools.disc(x0 + 1, z0 + 1, y + 0.4, 0.44, 16, C('#58BCB8'));
      g.cyl(x0 + 1, z0 + 1, y + 0.2, y + 0.205, 0.84, 0.84, 20, C('#9CB06A'), C('#8AA05E'), null, false); // algae-green rim, as at the town's display springs
      ctx.world.fx.addSteam(x0 + 1, y + 0.62, z0 + 1, 1.2);
      break;
    }
    case 'statue': if (!md('bear_statue', {}, 1.1)) { g.box(x - 0.15, y, z - 0.15, x + 0.15, y + 0.12, z + 0.15, WOOD2); g.box(x - 0.1, y + 0.12, z - 0.1, x + 0.1, y + 0.5, z + 0.1, C('#2A2420')); } break;
    case 'logs': if (!md('log_pile', {}, 1)) for (let k = 0; k < 3; k++) g.tube([x - 0.3, y + 0.08 + (k === 1 ? 0.12 : 0), z - 0.1 + k * 0.1], [x + 0.3, y + 0.08 + (k === 1 ? 0.12 : 0), z - 0.1 + k * 0.1], 0.07, C('#8B5A33'), 7); break;
    case 'minecart': if (!md('ore_cart', {}, 1)) { g.box(x - 0.25, y + 0.08, z - 0.15, x + 0.25, y + 0.35, z + 0.15, C('#5E4B3C')); } break;
  }
  void S;
}

// ---------- the park gate ------------------------------------------------------------------------------
function buildGate(ctx) {
  const { g, S, T } = ctx, M = S.map, w = M.w, gx = M.gate % w, gz = Math.floor(M.gate / w), y = M.height[M.gate] * LH;
  // two native-stone pillars with a timber beam and a lit sign, at the south edge of the map
  for (const px of [gx - 0.3, gx + 1.05]) {
    g.box(px, y, gz + 0.3, px + 0.25, y + 1.45, gz + 0.62, STONE, STONE2);
    for (let k = 0; k < 6; k++) g.box(px - 0.005, y + 0.1 + k * 0.23, gz + 0.295, px + 0.255, y + 0.12 + k * 0.23, gz + 0.625, STONE2, STONE2, false);
    g.box(px - 0.04, y + 1.45, gz + 0.26, px + 0.29, y + 1.55, gz + 0.66, C('#6E6458'));
  }
  g.box(gx - 0.45, y + 1.2, gz + 0.38, gx + 1.45, y + 1.32, gz + 0.54, WOOD2);
  g.setGlow(0.9, 0.001); for (let k = 0; k <= 12; k++) { g.glow[1] = (k % 3) / 3 + 0.001; const xx = gx - 0.35 + k * 0.15; g.box(xx - 0.02, y + 1.16, gz + 0.55, xx + 0.02, y + 1.2, gz + 0.59, BULB); } g.setGlow();
  // ticket booth beside the gate
  g.box(gx + 1.4, y, gz + 0.1, gx + 1.85, y + 0.6, gz + 0.55, CREAM, C('#E8DCC0')); g.box(gx + 1.35, y + 0.6, gz + 0.05, gx + 1.9, y + 0.68, gz + 0.6, C('#3FBFB5'));
  // the park-name sign: canvas texture, lit at night
  const name = S.park.name || 'Spa City Thrills';
  if (!ctx.objs.signTex || ctx.objs.signName !== name) {
    const cv = Object.assign(document.createElement('canvas'), { width: 512, height: 96 }), c = cv.getContext('2d');
    c.fillStyle = '#1F5F6B'; c.fillRect(0, 0, 512, 96); c.strokeStyle = '#F4C542'; c.lineWidth = 6; c.strokeRect(5, 5, 502, 86);
    c.fillStyle = '#FFF6E0'; c.font = 'bold 44px "Century Gothic", Futura, "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 44; while (c.measureText(name.toUpperCase()).width > 470 && fs > 20) { fs -= 2; c.font = `bold ${fs}px "Century Gothic", Futura, "Trebuchet MS", sans-serif`; }
    c.fillText(name.toUpperCase(), 256, 50);
    if (ctx.objs.signTex) ctx.objs.signTex.dispose();
    ctx.objs.signTex = new T.CanvasTexture(cv); ctx.objs.signTex.colorSpace = T.SRGBColorSpace; ctx.objs.signTex.anisotropy = 4; ctx.objs.signName = name;
  }
  const sm = new T.MeshStandardMaterial({ map: ctx.objs.signTex, emissiveMap: ctx.objs.signTex, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.6 });
  sm.onBeforeCompile = (sh) => { sh.uniforms.uNight = U.uNight; sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= 0.15 + uNight * 1.6;'); };
  const plane = new T.Mesh(new T.PlaneGeometry(2.1, 0.4), sm);
  plane.position.set(gx + 0.5, y + 1.6, gz + 0.62); plane.castShadow = false;
  const node = new T.Group(); node.add(plane);
  ctx.add({ o: null, node, update: () => {}, seats: null });
  const back = new Geo(); back.box(gx - 0.57, y + 1.38, gz + 0.5, gx + 1.57, y + 1.82, gz + 0.6, C('#34424A'));
  node.add(meshOf(ctx, back));
  ctx.glowDecal.push([gx + 0.5, y, gz + 0.9, 1.6, [0.85, 0.7, 0.45], 1.2]);
}
export { trainPose, TRACKS, rideOpen };
