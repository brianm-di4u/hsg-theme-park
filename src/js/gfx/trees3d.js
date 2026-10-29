// Instanced Ouachita trees: shortleaf pine, oak-hickory, redbud and dogwood (Blender models in assets/models.js).
// Region 1/2 of each model is recoloured by species and month (spring redbud and dogwood bloom, October colour),
// vertices sway with the wind by their `sway` weight. One draw call per model variant.
import { hash2 } from '../rng.js';
import { SCENERY, RIDES } from '../catalog.js';
import { LH, lin } from './geo.js';
import { backdropGround, aspectPine } from './terrain3d.js';
import { U } from './materials3d.js';

// month 0..6 = April..October: [main foliage, accent] per species
const PAL = {
  1: Array(7).fill(['#2F5A33', '#24472A']),
  2: [['#8DB255', '#A4C468'], ['#6E9A48', '#7FA650'], ['#4E7A3A', '#5E8A42'], ['#4C7638', '#5A8440'], ['#55793A', '#66843F'], ['#7A8A40', '#8E8A3A'], ['#B86A2A', '#C8962F']],
  3: [['#9C4F86', '#D47AB0'], ['#5E8A42', '#6E9A48'], ['#557F3C', '#62894A'], ['#557F3C', '#62894A'], ['#5E843E', '#6A8A44'], ['#8A8E3E', '#A89A3A'], ['#C9A93A', '#B8902E']],
  4: [['#7FA650', '#F2F0E6'], ['#6E9A48', '#7FA650'], ['#557F3C', '#5E8A42'], ['#557F3C', '#5E8A42'], ['#5E843E', '#6A8A44'], ['#7E6A3A', '#9A4A30'], ['#9A2E2A', '#B8452E']],
};
const TREE_SCALE = 0.58; // stylized: woods stay readable around rides at the iso camera
const VARIANTS = { 1: ['pine_a', 'pine_b', 'pine_c'], 2: ['oak_a', 'oak_b'], 3: ['redbud_a', 'redbud_b'], 4: ['dogwood_a', 'dogwood_b'] };

let decoded = null;
export function decodeModels() {
  if (decoded) return decoded;
  const src = window.SCT_MODELS || {}, out = {};
  const b64 = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  for (const [k, m] of Object.entries(src)) {
    const pos = new Float32Array(b64(m.pos).buffer), nr = new Int8Array(b64(m.nrm).buffer), col = b64(m.col);
    const nrm = new Float32Array(nr.length); for (let i = 0; i < nr.length; i++) nrm[i] = nr[i] / 127;
    out[k] = { n: m.n, pos, nrm, col, reg: m.reg ? b64(m.reg) : new Uint8Array(m.n), anim: m.anim ? b64(m.anim) : null, sway: m.sway ? b64(m.sway) : null, bbox: m.bbox };
  }
  decoded = out;
  return out;
}
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export function modelGeometry(THREE, md, extra = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(md.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(md.nrm, 3));
  const col = new Float32Array(md.n * 3); for (let i = 0; i < md.n * 3; i++) col[i] = s2l(md.col[i]);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const reg = new Float32Array(md.n); for (let i = 0; i < md.n; i++) reg[i] = md.reg[i];
  g.setAttribute('reg', new THREE.BufferAttribute(reg, 1));
  if (md.sway) { const s = new Float32Array(md.n); for (let i = 0; i < md.n; i++) s[i] = md.sway[i] / 255; g.setAttribute('sway', new THREE.BufferAttribute(s, 1)); }
  if (md.anim) { const a = new Float32Array(md.n); for (let i = 0; i < md.n; i++) a[i] = md.anim[i]; g.setAttribute('anim', new THREE.BufferAttribute(a, 1)); }
  void extra;
  g.computeBoundingSphere();
  return g;
}
// a stand-in when the Blender models are missing: trunk plus a faceted crown
function fallbackGeometry(THREE, kind) {
  const crown = kind === 1 ? new THREE.ConeGeometry(0.8, 3.2, 7, 2) : new THREE.IcosahedronGeometry(kind === 2 ? 1.2 : 0.8, 0);
  crown.translate(0, kind === 1 ? 2.8 : kind === 2 ? 2.6 : 1.6, 0);
  const trunk = new THREE.CylinderGeometry(0.08, 0.12, kind === 1 ? 1.6 : 1.4, 5); trunk.translate(0, kind === 1 ? 0.8 : 0.7, 0);
  const parts = [trunk.toNonIndexed(), crown.toNonIndexed()];
  const pos = [], nrm = [], col = [], reg = [], sway = [];
  parts.forEach((p, k) => {
    const P = p.attributes.position, N = p.attributes.normal;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nrm.push(N.getX(i), N.getY(i), N.getZ(i)); col.push(0.12, 0.08, 0.05); reg.push(k); sway.push(Math.min(1, P.getY(i) / 4)); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('reg', new THREE.Float32BufferAttribute(reg, 1)); g.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
  g.computeBoundingSphere();
  return g;
}

// Cutaway: trees whose canopy stands between the camera and a focus point (xyz, radius in w) dither out to their
// stumps, so the selected ride or guest, or the ride under a close zoom, stays visible. Shadows are kept.
const CUT_VS = `uniform vec4 uCutA; uniform vec4 uCutB; uniform vec3 uCam; varying float vCut; varying float vLy;
float cutAt(vec4 F, vec3 p) {
  if (F.w <= 0.0) return 0.0;
  vec3 d = uCam - F.xyz; float t = dot(p - F.xyz, d) / dot(d, d);
  if (t < 0.0) return 0.0;
  return 1.0 - smoothstep(F.w * 0.97, F.w, distance(p, F.xyz + d * t));
}
`;
function treeMaterial(THREE, kind, cut) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: false });
  const uLeaf = { value: new THREE.Color() }, uAcc = { value: new THREE.Color() }, uRef = { value: new THREE.Vector2(0.05, 0.05) };
  m.userData = { uLeaf, uAcc, uRef };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLeaf = uLeaf; sh.uniforms.uAcc = uAcc; sh.uniforms.uRef = uRef; sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    Object.assign(sh.uniforms, cut);
    sh.vertexShader = 'attribute float reg; attribute float sway; uniform vec3 uLeaf; uniform vec3 uAcc; uniform vec2 uRef; uniform float uTime; uniform float uWind;\n' + CUT_VS + sh.vertexShader
      .replace('#include <color_vertex>', `float lum = dot(color.rgb, vec3(0.3, 0.59, 0.11));
        // tint, keeping the model's baked light-to-dark gradient and per-face variation
        vColor.rgb = reg < 0.5 ? color.rgb : (reg < 1.5 ? uLeaf * clamp(lum / uRef.x, 0.55, 1.6) : uAcc * clamp(lum / uRef.y, 0.55, 1.6));
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb *= instanceColor.xyz;
        #endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float ph = ip.x * 0.37 + ip.z * 0.23;
        float sw = sway * sway * uWind;
        transformed.x += sin(uTime * 1.3 + ph) * 0.06 * sw;
        transformed.z += cos(uTime * 1.1 + ph * 1.3) * 0.05 * sw;
        float isc = length(instanceMatrix[1].xyz);
        vec3 c1 = ip + vec3(0.0, 1.5 * isc, 0.0), c2 = ip + vec3(0.0, 3.2 * isc, 0.0);
        vCut = max(max(cutAt(uCutA, c1), cutAt(uCutA, c2)), max(cutAt(uCutB, c1), cutAt(uCutB, c2))); vLy = position.y;`);
    // the stump mask is per fragment: a trunk is one long segment, so a per-vertex mask would smear up its length
    sh.fragmentShader = 'varying float vCut; varying float vLy;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (vCut > 0.0 && vCut * 1.04 * smoothstep(0.25, 0.4, vLy) > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;`);
  };
  m.customProgramCacheKey = () => 'sct-tree' + kind;
  return m;
}

function occKind(S, id) { if (!S._ok || S._okv !== S.objects.length) { S._ok = new Map(S.objects.map((o) => [o.id, o.kind])); S._okv = S.objects.length; } return S._ok.get(id); }
export class Trees {
  constructor(THREE, scene, mats, R3) {
    this.T = THREE; this.scene = scene; this.R3 = R3; this.meshes = []; this.count = 0; this.mats = {};
    this.cutU = { uCutA: { value: new THREE.Vector4() }, uCutB: { value: new THREE.Vector4() }, uCam: { value: new THREE.Vector3() } };
    this.cutR = [0, 0];
    for (const k of [1, 2, 3, 4]) this.mats[k] = treeMaterial(THREE, k, this.cutU);
    this.rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
  }
  // focus A: the selected ride or guest; focus B: the built object nearest the screen centre at close zoom.
  // Returns true while a cut is open or closing (the paused view keeps drawing until it settles).
  cut(S, view, camera, tgt, dt) {
    const C = this.cutU, M = S.map, w = M.w, ease = view.reduced ? 1 : Math.min(1, dt / 120);
    C.uCam.value.copy(camera.position);
    const objAt = (o) => { const n = o.n || 1, big = RIDES[o.type] && RIDES[o.type].tall ? 0.6 : 0; return [o.x + n / 2, o.h * LH + 0.5 + big, o.y + n / 2, n * 0.62 + 1.4 + big]; };
    let a = null, b = null;
    const sel = view.sel;
    if (sel && sel.kind === 'obj') { const o = S.objects.find((x) => x.id === sel.id); if (o && o.kind !== 'scenery') a = objAt(o); }
    else if (sel && sel.kind === 'guest') {
      const g = S.guests.find((x) => x.id === sel.id);
      if (g && g.st === 'ride') { const o = S.objects.find((x) => x.riders && x.riders.includes(g.id)); if (o) a = objAt(o); }
      else if (g && g.st !== 'gone') a = [g.x, g.z * LH + 0.5, g.y, 1.5];
    }
    const zk = Math.max(0, Math.min(1, (view.cam.z - 1.25) / 0.45));
    if (zk > 0 && tgt && !view.cine) {
      const tx = Math.floor(tgt[0]), ty = Math.floor(tgt[2]);
      let best = 0, bd = 9;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = tx + dx, Y = ty + dy; if (X < 0 || Y < 0 || X >= w || Y >= M.h) continue;
        const id = M.occ[Y * w + X]; if (!id || occKind(S, id) === 'scenery') continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = id; }
      }
      const o = best && S.objects.find((x) => x.id === best);
      if (o && !(sel && sel.kind === 'obj' && sel.id === o.id)) { b = objAt(o); b[3] *= zk; }
    }
    const set = (u, f, i) => {
      if (f) { this.cutR[i] += (f[3] - this.cutR[i]) * ease; if (Math.abs(f[3] - this.cutR[i]) < 0.02) this.cutR[i] = f[3]; u.value.set(f[0], f[1], f[2], this.cutR[i]); }
      else { this.cutR[i] *= 1 - ease; if (this.cutR[i] < 0.05) this.cutR[i] = 0; u.value.w = this.cutR[i]; }
      return f ? this.cutR[i] !== f[3] : this.cutR[i] > 0;
    };
    const moving = set(C.uCutA, a, 0); return set(C.uCutB, b, 1) || moving;
  }
  clear() { for (const m of this.meshes) { this.scene.remove(m); m.dispose(); } this.meshes = []; }
  rebuild(S, world) {
    const T = this.T, M = S.map, w = M.w, models = decodeModels();
    this.clear();
    const month = Math.max(0, Math.min(6, S.month));
    for (const k of [1, 2, 3, 4]) {
      const [a, b] = PAL[k][month], ud = this.mats[k].userData; ud.uLeaf.value.setRGB(...lin(a)); ud.uAcc.value.setRGB(...lin(b));
      const md = models[VARIANTS[k][0]];
      if (md && !ud.refDone) { const acc = [0, 0], n = [0, 0]; for (let i = 0; i < md.n; i++) { const r = md.reg[i]; if (r < 1) continue; const L = 0.3 * s2l(md.col[i * 3]) + 0.59 * s2l(md.col[i * 3 + 1]) + 0.11 * s2l(md.col[i * 3 + 2]); acc[r - 1] += L; n[r - 1]++; } ud.uRef.value.set(n[0] ? acc[0] / n[0] : 0.05, n[1] ? acc[1] / n[1] : 0.05); ud.refDone = true; }
    }
    // collect placements per variant
    const lists = {};
    const add = (kind, x, z, y, seed, s = 1) => {
      const vs = VARIANTS[kind], v = vs[Math.floor(hash2(seed, 11) * vs.length) % vs.length];
      (lists[v] || (lists[v] = { kind, items: [] })).items.push([x, y, z, hash2(seed, 13) * Math.PI * 2, s * TREE_SCALE * (0.72 + Math.pow(hash2(seed, 17), 1.5) * 0.65), seed]);
    };
    for (let y = 0; y < M.h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!M.tree[i] || M.occ[i]) continue;
      // keep canopies clear of anything built next door (stations, roofs, queue pens); purely visual
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < M.h && M.occ[Y * w + X] && occKind(S, M.occ[Y * w + X]) !== 'scenery') { near = true; break; } }
      if (near) continue;
      const fx = x + 0.5 + (hash2(i, 3) - 0.5) * 0.35, fz = y + 0.5 + (hash2(i, 5) - 0.5) * 0.35;
      add(M.tree[i], fx, fz, world.ground(fx, fz) - 0.02, i);
    }
    // understory: low hardwood shrubs on the forest floor between the trees
    for (let y = 0; y < M.h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (M.occ[i] || M.path[i] || M.kind[i] !== 0 || hash2(i, 71) > 0.3) continue;
      let wood = M.tree[i] ? 1 : 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < M.h && M.tree[Y * w + X]) wood++; }
      if (wood < 2) continue;
      const fx = x + 0.15 + hash2(i, 73) * 0.7, fz = y + 0.15 + hash2(i, 75) * 0.7;
      add(hash2(i, 77) < 0.6 ? 2 : 4, fx, fz, world.ground(fx, fz) - 0.02, i * 3 + 1, 0.38);
    }
    for (const o of S.objects) {
      const d = o.kind === 'scenery' && SCENERY[o.type];
      if (d && d.tree) add(d.tree, o.x + 0.5, o.y + 0.5, o.h * LH, o.id * 7 + o.x, 0.95);
    }
    // the band of individual trees just outside the map, by real land cover (NLCD)
    const q = this.R3.quality, band = q === 'high' ? 34 : q === 'medium' ? 22 : 12, dens = q === 'low' ? 0.3 : 0.42;
    const dem = world.dem;
    for (let Z = -band; Z < M.h + band; Z += 1) for (let X = -band; X < w + band; X += 1) {
      if (X >= -1 && X <= w && Z >= -1 && Z <= M.h) continue;
      const seed = (X + 1000) * 7919 + (Z + 1000) * 104729;
      const cv = dem ? dem.cov(X + 0.5, Z + 0.5) : 1;
      const forest = cv === 1 || cv === 2 || cv === 3;
      // open land (pasture, clearings) keeps a few field-edge trees
      if (!forest && !(cv === 6 && hash2(seed, 1) < 0.3) && !((cv === 0 || cv === 5) && hash2(seed, 1) < 0.1)) continue;
      // the access road to the gate stays clear
      const gx = M.gate % w; if (Z > M.h - 1 && Math.abs(X - gx) < 4) continue;
      if (hash2(seed, 2) > dens) continue;
      const r = hash2(seed, 4), pf = aspectPine(dem, X, Z, cv === 2 ? 0.85 : cv === 3 ? 0.5 : 0.2);
      const kind = r < pf ? 1 : r < pf + (1 - pf) * 0.78 ? 2 : r < pf + (1 - pf) * 0.9 ? 3 : 4;
      const fx = X + 0.5 + (hash2(seed, 6) - 0.5) * 0.8, fz = Z + 0.5 + (hash2(seed, 8) - 0.5) * 0.8;
      add(kind, fx, fz, backdropGround(S, world.CH, dem, fx, fz) - 0.05, seed, 1.05);
    }
    // novaculite and sandstone outcrops on rock tiles, the odd boulder in the woods
    const rocks = {};
    const addRock = (x, z, y, seed, s) => { const v = ['rock_a', 'rock_b', 'rock_c'][Math.floor(hash2(seed, 41) * 3) % 3]; (rocks[v] || (rocks[v] = [])).push([x, y, z, hash2(seed, 43) * 6.28, s, seed]); };
    for (let y = 0; y < M.h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (M.occ[i] || M.path[i]) continue;
      if (M.kind[i] === 1) { const fx = x + 0.5 + (hash2(i, 45) - 0.5) * 0.3, fz = y + 0.5 + (hash2(i, 47) - 0.5) * 0.3; addRock(fx, fz, world.ground(fx, fz), i, 1.1 + hash2(i, 49) * 0.7); if (hash2(i, 51) < 0.5) addRock(fx + 0.3, fz - 0.25, world.ground(fx + 0.3, fz - 0.25), i + 7, 0.6); }
      else if (M.tree[i] && hash2(i, 53) < 0.05) { const fx = x + 0.2 + hash2(i, 55) * 0.6, fz = y + 0.2 + hash2(i, 57) * 0.6; addRock(fx, fz, world.ground(fx, fz), i, 0.5 + hash2(i, 59) * 0.4); }
    }
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), v3 = new T.Vector3(), s3 = new T.Vector3(), up = new T.Vector3(0, 1, 0), col = new T.Color();
    this.count = 0;
    for (const [name, L] of Object.entries(lists)) {
      const md = models[name];
      const geo = md ? modelGeometry(T, md) : fallbackGeometry(T, L.kind);
      const im = new T.InstancedMesh(geo, this.mats[L.kind], L.items.length);
      L.items.forEach(([x, y, z, rot, s, seed], k) => {
        q4.setFromAxisAngle(up, rot); v3.set(x, y, z); s3.set(s, s * (0.9 + hash2(seed, 19) * 0.25), s);
        m4.compose(v3, q4, s3); im.setMatrixAt(k, m4);
        const t = 0.86 + hash2(seed, 23) * 0.24; col.setRGB(t, t * (0.96 + hash2(seed, 29) * 0.08), t); im.setColorAt(k, col);
      });
      im.castShadow = true; im.receiveShadow = true;
      im.computeBoundingSphere();
      this.scene.add(im); this.meshes.push(im); this.count += L.items.length;
    }
    for (const [name, items] of Object.entries(rocks)) {
      const md = models[name]; if (!md) continue;
      const im = new T.InstancedMesh(modelGeometry(T, md), this.rockMat, items.length);
      items.forEach(([x, y, z, rot, s], k) => { q4.setFromAxisAngle(up, rot); v3.set(x, y, z); s3.set(s, s * 0.85, s); m4.compose(v3, q4, s3); im.setMatrixAt(k, m4); });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
      this.scene.add(im); this.meshes.push(im);
    }
  }
}
