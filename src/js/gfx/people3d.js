// Guests and staff as instanced figures (Blender `person`, one draw call for the whole crowd). Shirt, pants, skin and
// hair come from per-instance attributes; a vertex shader swings legs and arms around the hip and shoulder pivots,
// so 1000 walkers cost one matrix per guest per frame. Riders sit in ride seats with the seated model.
import { hash2 } from '../rng.js';
import { atSchool } from '../staff.js';
import { guestById } from '../state.js';
import { LH, lin } from './geo.js';
import { decodeModels, modelGeometry } from './trees3d.js';
import { U } from './materials3d.js';

const SHIRTS = ['#F26B5B', '#3FBFB5', '#F4C542', '#E26D8E', '#4C8FA8', '#FFF6E0', '#7FA05A', '#B5568F'];
const PANTS = ['#34424A', '#2F3E5C', '#5B4A3A', '#6E6A60', '#2A2A2A', '#4A5E7A', '#8A7A5A'];
const SKIN = ['#F1C9A5', '#D9A27C', '#A86F4C', '#7A4E33'];
const HAIR = ['#2A1E16', '#4A3020', '#7A5230', '#C8A060', '#1A1A1A', '#8A6040'];
const KIND_SCALE = [0.68, 0.9, 1.0, 0.96];
const UMB = ['#F26B5B', '#3FBFB5', '#F4C542', '#34424A', '#E26D8E', '#FFF6E0', '#4C8FA8'];
const STAFF_COL = { mechanic: ['#1E4E79', '#1E4E79'], keeper: ['#355E41', '#5B4A3A'], mascot: ['#5A4030', '#5A4030'] };
const CAP = 1400;
// pivots from the Blender models (art-src/blender/build_models.py report)
export const PIV = { hip: 0.275, shoulder: 0.44, sx: 0.083 };
const BEAR_PIV = { hip: 0.21, shoulder: 0.47, sx: 0.112 };

function personMaterial(THREE, sit, piv = PIV) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.uniforms.uPiv = { value: new THREE.Vector3(piv.hip, piv.shoulder, piv.sx) };
    sh.vertexShader = `attribute float reg; attribute float anim; attribute vec3 aShirt; attribute vec3 aPants; attribute vec3 aSkin; attribute vec3 aHair; attribute vec2 aWalk;
      uniform float uTime; uniform vec3 uPiv;\n` + sh.vertexShader
      .replace('#include <color_vertex>', `vColor.rgb = reg < 0.5 ? aSkin : reg < 1.5 ? aShirt : reg < 2.5 ? aPants : reg < 3.5 ? vec3(0.03) : aHair;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${sit ? '' : `
        float sw = sin(uTime * 9.0 * aWalk.y + aWalk.x) * 0.55 * aWalk.y;
        float a = anim < 0.5 ? 0.0 : anim < 1.5 ? sw : anim < 2.5 ? -sw : anim < 3.5 ? -sw * 0.8 : sw * 0.8;
        float py = anim < 2.5 ? uPiv.x : uPiv.y;
        if (anim > 0.5) { float yy = transformed.y - py, zz = transformed.z; transformed.y = py + yy * cos(a) - zz * sin(a); transformed.z = yy * sin(a) + zz * cos(a); }
        transformed.y += abs(sw) * 0.012;`}`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>');
  };
  m.customProgramCacheKey = () => 'sct-person' + (sit ? 's' : '') + piv.hip;
  return m;
}
// stand-in body when the Blender models are missing: boxes for legs, torso, arms and head
function fallbackPerson(THREE, sit) {
  const parts = [ // [x0,y0,z0,x1,y1,z1, reg, anim]
    [-0.07, 0, -0.04, -0.01, 0.3, 0.04, 2, 1], [0.01, 0, -0.04, 0.07, 0.3, 0.04, 2, 2], [-0.08, 0.28, -0.05, 0.08, 0.5, 0.05, 1, 0],
    [-0.11, 0.3, -0.03, -0.08, 0.49, 0.03, 1, 3], [0.08, 0.3, -0.03, 0.11, 0.49, 0.03, 1, 4], [-0.055, 0.5, -0.05, 0.055, 0.62, 0.06, 0, 0], [-0.06, 0.58, -0.06, 0.06, 0.64, 0.06, 4, 0],
  ];
  const pos = [], nrm = [], reg = [], anim = [], col = [];
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), P = g.attributes.position, N = g.attributes.normal;
  for (const [x0, y0, z0, x1, y1, z1, r, a] of parts) for (let i = 0; i < P.count; i++) {
    let y = y0 + (P.getY(i) + 0.5) * (y1 - y0), z = z0 + (P.getZ(i) + 0.5) * (z1 - z0);
    if (sit && a > 0 && a < 3) { const t = (0.3 - y) / 0.3; y = 0.02 + (1 - t) * 0.0; z = z + t * 0.25; }
    pos.push(x0 + (P.getX(i) + 0.5) * (x1 - x0), sit ? y - 0.1 : y, z); nrm.push(N.getX(i), N.getY(i), N.getZ(i)); reg.push(r); anim.push(a); col.push(1, 1, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('reg', new THREE.Float32BufferAttribute(reg, 1)); geo.setAttribute('anim', new THREE.Float32BufferAttribute(anim, 1));
  return geo;
}

class Crowd {
  constructor(THREE, scene, geo, mat, cap) {
    this.T = THREE; this.cap = cap;
    const ia = (n) => new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n);
    this.attr = { aShirt: ia(3), aPants: ia(3), aSkin: ia(3), aHair: ia(3), aWalk: ia(2) };
    for (const [k, a] of Object.entries(this.attr)) { a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); }
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true; this.mesh.receiveShadow = false; this.mesh.frustumCulled = false;
    this.mesh.count = 0; scene.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    this.n = 0;
  }
  begin() { this.n = 0; }
  put(x, y, z, yaw, scale, shirt, pants, skin, hair, walkPh, walk) {
    if (this.n >= this.cap) return;
    const k = this.n++;
    this.q.setFromAxisAngle(this.up, yaw); this.v.set(x, y, z); this.s.set(scale, scale, scale);
    this.m.compose(this.v, this.q, this.s); this.mesh.setMatrixAt(k, this.m);
    const A = this.attr;
    A.aShirt.array.set(shirt, k * 3); A.aPants.array.set(pants, k * 3); A.aSkin.array.set(skin, k * 3); A.aHair.array.set(hair, k * 3);
    A.aWalk.array[k * 2] = walkPh; A.aWalk.array[k * 2 + 1] = walk;
  }
  putMatrix(mat, shirt, pants, skin, hair) {
    if (this.n >= this.cap) return;
    const k = this.n++; this.mesh.setMatrixAt(k, mat);
    const A = this.attr;
    A.aShirt.array.set(shirt, k * 3); A.aPants.array.set(pants, k * 3); A.aSkin.array.set(skin, k * 3); A.aHair.array.set(hair, k * 3);
    A.aWalk.array[k * 2] = 0; A.aWalk.array[k * 2 + 1] = 0;
  }
  end() {
    this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true;
    for (const a of Object.values(this.attr)) { a.needsUpdate = true; a.clearUpdateRanges && a.clearUpdateRanges(); a.addUpdateRange && a.addUpdateRange(0, Math.max(1, this.n) * a.itemSize); }
  }
}

export class People {
  constructor(THREE, scene, mats, R3, world) {
    this.T = THREE; this.world = world; this.R3 = R3; this.count = 0;
    const models = decodeModels();
    const pm = models.person, sm = models.person_sit, bm = models.bear;
    this.walkers = new Crowd(THREE, scene, pm ? modelGeometry(THREE, pm) : fallbackPerson(THREE, false), personMaterial(THREE, false), CAP);
    this.riders = new Crowd(THREE, scene, sm ? modelGeometry(THREE, sm) : fallbackPerson(THREE, true), personMaterial(THREE, true), 900);
    this.riders.mesh.castShadow = R3.quality === 'high';
    this.bears = new Crowd(THREE, scene, bm ? modelGeometry(THREE, bm) : fallbackPerson(THREE, false), personMaterial(THREE, false, BEAR_PIV), 24);
    // the selected guest, drawn again through anything in front of it as a soft yellow silhouette
    const xm = personMaterial(THREE, false); xm.customProgramCacheKey = () => 'sct-person-xray'; xm.depthTest = false; xm.depthWrite = false; xm.emissive = new THREE.Color(0xf4c542); xm.emissiveIntensity = 0.45;
    this.xray = new Crowd(THREE, scene, pm ? modelGeometry(THREE, pm) : fallbackPerson(THREE, false), xm, 1);
    this.xray.mesh.castShadow = false; this.xray.mesh.renderOrder = 999; // opaque, drawn last without a depth test: the selected guest shows through anything
    // rain umbrellas: one instanced canopy-and-pole over guests who carry one
    const ug = new THREE.ConeGeometry(0.2, 0.09, 8, 1, true); ug.translate(0, 0.745, 0);
    const pole = new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4); pole.translate(0.0, 0.6, 0.0);
    const um = new THREE.Mesh(); void um;
    const merged = window.THREE.mergeGeometries ? window.THREE.mergeGeometries([ug.toNonIndexed(), pole.toNonIndexed()]) : ug;
    this.umb = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), CAP);
    this.umb.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.umb.count = 0; this.umb.frustumCulled = false; this.umb.castShadow = true; scene.add(this.umb);
    this.umbCol = new THREE.Color(); this.umbM = new THREE.Matrix4(); this.umbV = new THREE.Vector3(); this.umbQ = new THREE.Quaternion(); this.umbS = new THREE.Vector3();
    this.prev = new Map();
    this.cache = new Map();
  }
  setQuality(q) { this.riders.mesh.castShadow = q === 'high'; this.walkers.mesh.castShadow = q !== 'low'; }
  look(g) {
    let c = this.cache.get(g.id);
    if (!c) {
      const h = (k) => hash2(g.id, k);
      c = { shirt: lin(SHIRTS[g.c % SHIRTS.length]), pants: lin(PANTS[Math.floor(h(31) * PANTS.length)]), skin: lin(SKIN[g.id & 3]), hair: lin(g.k === 3 && h(37) < 0.7 ? '#B8B4AC' : HAIR[Math.floor(h(33) * HAIR.length)]), ph: h(35) * 6.28 };
      if (this.cache.size > 4000) this.cache.clear();
      this.cache.set(g.id, c);
    }
    return c;
  }
  update(S, dt, view) {
    const M = S.map, w = M.w, W = this.walkers, prev = this.prev;
    W.begin();
    const queueAt = new Map();
    let selPose = null, nu = 0;
    const raining = S.weather.kind === 'rain' || S.weather.kind === 'storm';
    for (const g of S.guests) {
      if (g.st === 'ride' || g.st === 'gone') continue;
      const c = this.look(g), sc = KIND_SCALE[g.k] || 1;
      let px = g.x, py = g.y, yaw, walk = 0;
      if (g.st === 'queue') {
        const n = queueAt.get(g.ti) || 0; queueAt.set(g.ti, n + 1);
        if (n >= 16) continue;
        const tx = g.ti % w, ty = (g.ti / w) | 0;
        px = tx + 0.2 + (n % 6) * 0.12; py = ty + 0.3 + Math.floor(n / 6) * 0.22;
        const o = S.objects.find((ob) => ob.entry === g.ti && ob.queue && ob.queue.includes(g.id));
        yaw = o ? Math.atan2((o.x + o.n / 2) - px, (o.y + o.n / 2) - py) : 0;
      } else {
        px += (hash2(g.id, 1) - 0.5) * 0.5; py += (hash2(g.id, 2) - 0.5) * 0.5;
        const p = prev.get(g.id);
        if (p) {
          const dx = px - p[0], dy = py - p[1];
          if (dx * dx + dy * dy > 1e-6) { p[2] = Math.atan2(dx, dy); walk = 1; }
          p[0] = px; p[1] = py; yaw = p[2];
        } else { yaw = hash2(g.id, 3) * 6.28; prev.set(g.id, [px, py, yaw]); }
        if (g.to >= 0) walk = 1;
        if (g.st === 'sit' || g.st === 'stall' || g.st === 'concert') walk = 0;
      }
      W.put(px, g.z * LH + 0.035, py, yaw, sc * 0.95, c.shirt, c.pants, c.skin, c.hair, c.ph, view.reduced ? 0 : walk);
      if (raining && nu < CAP && hash2(g.id, 39) < 0.6) {
        this.umbQ.setFromAxisAngle(this.walkers.up, yaw + 0.3); this.umbV.set(px, g.z * LH + 0.035, py); const k2 = sc * 0.95; this.umbS.set(k2, k2, k2);
        this.umbM.compose(this.umbV, this.umbQ, this.umbS); this.umb.setMatrixAt(nu, this.umbM);
        this.umbCol.setRGB(...lin(UMB[Math.floor(hash2(g.id, 41) * UMB.length)])); this.umb.setColorAt(nu, this.umbCol); nu++;
      }
      if (view.sel && view.sel.kind === 'guest' && view.sel.id === g.id) selPose = [px, g.z * LH + 0.035, py, yaw, sc * 0.95, c.ph, walk];
    }
    this.umb.count = nu; this.umb.instanceMatrix.needsUpdate = true; if (this.umb.instanceColor) this.umb.instanceColor.needsUpdate = true;
    const X = this.xray; X.begin();
    if (selPose) { const Y = [1, 0.85, 0.25]; X.put(selPose[0], selPose[1], selPose[2], selPose[3], selPose[4] * 1.18, Y, Y, Y, Y, selPose[5], view.reduced ? 0 : selPose[6]); }
    X.end();
    // staff: coloured coveralls; the bear mascot is its own model
    const B = this.bears; B.begin();
    for (const st of S.staff) {
      if (atSchool(S, st)) continue;
      const p = prev.get(-st.id) || [st.x, st.y, 0]; const dx = st.x - p[0], dy = st.y - p[1];
      const moving = dx * dx + dy * dy > 1e-6; if (moving) p[2] = Math.atan2(dx, dy); p[0] = st.x; p[1] = st.y; prev.set(-st.id, p);
      const [a, b] = STAFF_COL[st.role] || STAFF_COL.keeper;
      if (st.role === 'mascot') B.put(st.x, st.z * LH + 0.035, st.y, p[2], 1, lin('#B08A60'), lin('#C8402E'), lin('#2A2420'), lin('#2A2420'), st.id, view.reduced ? 0 : moving ? 1 : 0);
      else W.put(st.x, st.z * LH + 0.035, st.y, p[2], 1, lin(a), lin(b), lin(SKIN[st.id & 3]), lin('#F4C542'), st.id, view.reduced ? 0 : moving ? 1 : 0);
    }
    if (prev.size > 5000) prev.clear();
    W.end(); B.end();
    // riders, seated where each ride's model says its seats are this frame
    const R = this.riders; R.begin();
    for (const [mat, gid] of this.world.objects.seats) {
      const g = guestById(S, gid);
      const c = g ? this.look(g) : { shirt: lin('#F4C542'), pants: lin('#34424A'), skin: lin('#F1C9A5'), hair: lin('#4A3020') };
      R.putMatrix(mat, c.shirt, c.pants, c.skin, c.hair);
    }
    R.end();
    this.count = W.n + R.n;
    void dt;
  }
}
