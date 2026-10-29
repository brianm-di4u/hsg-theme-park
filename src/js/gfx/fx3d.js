// Atmosphere for the 3D view: night light pools and halos (a cheap stand-in for bloom), thermal steam, rain streaks
// and lightning. Everything here is decorative and reads the sim without changing it.
import { LH } from './geo.js';
import { U } from './materials3d.js';

export class Fx {
  constructor(THREE, scene, mats, R3, world) {
    this.T = THREE; this.scene = scene; this.mats = mats; this.R3 = R3; this.world = world; this.U = U;
    this.steamSrc = []; this.decalsRef = null; this.pool = null; this.halo = null;
    // rain: line segments in a box that follows the camera target
    const N = 1600, pos = new Float32Array(N * 6);
    this.rainSeed = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) this.rainSeed[i] = Math.random();
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    // streaks fade from a dim tail to a brighter head, each with its own strength
    const rc = new Float32Array(N * 6); for (let i = 0; i < N; i++) { const a = 0.35 + this.rainSeed[i * 3 + 2] * 0.65; rc.set([a * 0.15, a * 0.17, a * 0.19, a, a * 1.05, a * 1.1], i * 6); }
    rg.setAttribute('color', new THREE.BufferAttribute(rc, 3));
    mats.rain.vertexColors = true; mats.rain.blending = THREE.AdditiveBlending; mats.rain.color.setRGB(0.55, 0.6, 0.66);
    this.rain = new THREE.LineSegments(rg, mats.rain); this.rain.frustumCulled = false; this.rain.visible = false; scene.add(this.rain);
    // steam puffs
    const sp = new THREE.BufferGeometry(); sp.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.steam = new THREE.Points(sp, new THREE.PointsMaterial({ map: this.puffTex(), size: 0.9, transparent: true, opacity: 0.42, depthWrite: false, color: 0xffffff, sizeAttenuation: true }));
    this.steam.frustumCulled = false; scene.add(this.steam);
    this.flash = 0;
    // fireworks over the amphitheater on concert nights
    const FW = 6 * 48, fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FW * 3), 3).setUsage(THREE.DynamicDrawUsage));
    fg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(FW * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.fw = new THREE.Points(fg, new THREE.PointsMaterial({ map: mats.decal.map, size: 0.55, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.fw.frustumCulled = false; this.fw.visible = false; scene.add(this.fw);
  }
  puffTex() {
    const T = this.T, c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  }
  addSteam(x, y, z, s) { this.steamSrc.push([x, y, z, s]); }
  addSplash(x, y, z, s) { this.steamSrc.push([x, y, z, s, 1]); }
  rebuildLights(list) {
    const T = this.T;
    for (const k of ['pool', 'halo']) if (this[k]) { this.scene.remove(this[k]); this[k].geometry.dispose(); this[k] = null; }
    if (!list.length) return;
    // ground light pools: additive quads on the ground
    const pp = [], pc = [], uv = [], hp = [], hc = [];
    for (const [x, y, z, r, c, hy] of list) {
      const yy = y + 0.07;
      const q = [[x - r, z - r, 0, 0], [x - r, z + r, 0, 1], [x + r, z + r, 1, 1], [x - r, z - r, 0, 0], [x + r, z + r, 1, 1], [x + r, z - r, 1, 0]];
      for (const [qx, qz, u, v] of q) { pp.push(qx, yy, qz); pc.push(c[0] * 0.55, c[1] * 0.55, c[2] * 0.55); uv.push(u, v); }
      hp.push(x, y + (hy != null ? hy : Math.min(1.0, r * 0.55)), z); hc.push(c[0], c[1], c[2]);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pp, 3)); g.setAttribute('color', new T.Float32BufferAttribute(pc, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    this.poolMat = this.poolMat || this.mats.decal.clone();
    this.pool = new T.Mesh(g, this.poolMat); this.pool.renderOrder = 2; this.scene.add(this.pool);
    const hg = new T.BufferGeometry(); hg.setAttribute('position', new T.Float32BufferAttribute(hp, 3)); hg.setAttribute('color', new T.Float32BufferAttribute(hc, 3));
    this.haloMat = this.haloMat || new T.PointsMaterial({ map: this.mats.decal.map, size: 1.3, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
    this.halo = new T.Points(hg, this.haloMat); this.halo.renderOrder = 3; this.scene.add(this.halo);
  }
  // soft contact shadows under rides and stalls (a cheap stand-in for ambient occlusion)
  rebuildAO(list) {
    const T = this.T;
    if (this.aoMesh) { this.scene.remove(this.aoMesh); this.aoMesh.geometry.dispose(); this.aoMesh = null; }
    if (!list.length) return;
    const pp = [], uv = [];
    for (const [x, y, z, r] of list) for (const [qx, qz, u, v] of [[x - r, z - r, 0, 0], [x - r, z + r, 0, 1], [x + r, z + r, 1, 1], [x - r, z - r, 0, 0], [x + r, z + r, 1, 1], [x + r, z - r, 1, 0]]) { pp.push(qx, y, qz); uv.push(u, v); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pp, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    this.aoMat = this.aoMat || new T.MeshBasicMaterial({ color: 0x000000, alphaMap: this.mats.decal.map, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.aoMesh = new T.Mesh(g, this.aoMat); this.aoMesh.renderOrder = 1; this.scene.add(this.aoMesh);
  }
  update(S, dt, camera, view) {
    const W = this.world, night = U.uNight.value, lamps = W.lamps || 0;
    // light pools follow the objects' list (rebuilt when the object layer rebuilds)
    const src = W.objects.decals || [];
    if (src !== this.decalsRef) { this.decalsRef = src; this.rebuildLights(src); this.rebuildAO(W.objects.ao || []); }
    const on = Math.max(lamps, night > 0.5 ? 1 : 0);
    if (this.pool) { this.poolMat.opacity = 0.85 * on; this.pool.visible = on > 0.02; }
    if (this.halo) { this.haloMat.opacity = 0.75 * on; this.halo.visible = on > 0.02; }
    // steam: puffs rise and fade above each thermal source; denser on cool mornings
    const sp = this.steam.geometry.attributes.position, A = sp.array, t = view.reduced ? 0 : W.time;
    let n = 0;
    const cool = Math.max(0, Math.min(1, (80 - (S.weather.temp || 75)) / 25)) * 0.6 + 0.4;
    for (const [x, y, z, s, splash] of this.steamSrc) for (let k = 0; k < 24 && n < 400; k++, n++) {
      const sd = k * 12.9898;
      if (splash) { // spray: quick arcs out of the pool where riders land
        const ph = (t * 1.4 + k / 24) % 1, a = sd % 6.28, r = ph * 0.55 * s;
        A[n * 3] = x + Math.cos(a) * r; A[n * 3 + 1] = y + Math.sin(ph * Math.PI) * 0.4 * s; A[n * 3 + 2] = z + Math.sin(a) * r * 0.6;
        continue;
      }
      const ph = (t * 0.25 + k / 24) % 1;
      A[n * 3] = x + Math.sin(sd) * 0.25 * s + Math.sin(t * 0.7 + k) * 0.15 * ph; A[n * 3 + 1] = y + ph * 1.6 * s * cool; A[n * 3 + 2] = z + Math.cos(sd * 1.3) * 0.25 * s + ph * 0.25;
    }
    for (let k = n; k < 400; k++) A[k * 3 + 1] = -999;
    sp.needsUpdate = true; this.steam.visible = n > 0; this.steam.material.opacity = 0.32 * cool + 0.1;
    // fireworks: bursts rise and bloom over the stage during a Saturday concert after dark (not with reduced motion)
    const amphi = S.objects.find((o) => o.type === 'amphi');
    const show = amphi && S.park.concert && S.park.concert.month === S.month && S.dow === 5 && S.time >= 950 && S.time < 1150;
    this.fw.visible = !!(show && night > 0.4 && !view.reduced && !view.noFx);
    if (this.fw.visible) {
      const P = this.fw.geometry.attributes.position.array, Cc = this.fw.geometry.attributes.color.array, t = W.time;
      const cx = amphi.x + amphi.n / 2, cz = amphi.y + amphi.n / 2, cy = amphi.h * LH;
      const cols = [[1, 0.35, 0.3], [0.3, 0.95, 0.9], [1, 0.85, 0.3], [1, 0.45, 0.75], [0.7, 0.8, 1]];
      for (let b = 0; b < 6; b++) {
        const ph = (t * 0.33 + b / 6) % 1, cyc = Math.floor(t * 0.33 + b / 6), sd = cyc * 7 + b * 13;
        const bx = cx + Math.sin(sd) * 2.5, bz = cz + Math.cos(sd * 1.7) * 2.5, by = cy + 6 + (sd % 3);
        const c = cols[(sd % 5 + 5) % 5];
        for (let k = 0; k < 48; k++) {
          const i = (b * 48 + k) * 3, a = k * 2.399, e = Math.acos(1 - 2 * ((k + 0.5) / 48));
          if (ph < 0.25) { const r = ph / 0.25; P[i] = bx; P[i + 1] = cy + 1 + (by - cy - 1) * r; P[i + 2] = bz; const f = k === 0 ? 1 : 0; Cc[i] = c[0] * f; Cc[i + 1] = c[1] * f; Cc[i + 2] = c[2] * f; continue; }
          const q = (ph - 0.25) / 0.75, r = Math.sqrt(q) * 2.2, fade = Math.max(0, 1 - q);
          P[i] = bx + Math.sin(e) * Math.cos(a) * r; P[i + 1] = by + Math.cos(e) * r - q * q * 1.5; P[i + 2] = bz + Math.sin(e) * Math.sin(a) * r;
          Cc[i] = c[0] * fade; Cc[i + 1] = c[1] * fade; Cc[i + 2] = c[2] * fade;
        }
      }
      this.fw.geometry.attributes.position.needsUpdate = true; this.fw.geometry.attributes.color.needsUpdate = true;
    }
    // rain
    const wk = S.weather.kind, raining = (wk === 'rain' || wk === 'storm') && !view.noFx;
    this.rain.visible = raining;
    if (raining) {
      const R = this.rain.geometry.attributes.position, P = R.array, seed = this.rainSeed, N = P.length / 6;
      const tg = new this.T.Vector3(); camera.getWorldDirection(tg);
      const c = camera.position.clone().addScaledVector(tg, W.R3.camD || 30), span = Math.max(16, (W.R3.camD || 30) * 0.9);
      const fall = view.reduced ? 0 : W.time * 9;
      for (let i = 0; i < N; i++) {
        const x = c.x + (seed[i * 3] - 0.5) * span * 2, z = c.z + (seed[i * 3 + 1] - 0.5) * span * 2;
        const y = c.y - 4 + (((seed[i * 3 + 2] * 14 - fall * (0.8 + seed[i * 3] * 0.4)) % 14) + 14) % 14;
        const len = 0.25 + seed[i * 3] * 0.4; P[i * 6] = x + 0.05 * len; P[i * 6 + 1] = y + len; P[i * 6 + 2] = z + 0.02 * len; P[i * 6 + 3] = x; P[i * 6 + 4] = y; P[i * 6 + 5] = z;
      }
      R.needsUpdate = true;
      this.mats.rain.opacity = (wk === 'storm' ? 0.55 : 0.4) * (1 - U.uNight.value * 0.45);
    }
    // lightning: a brief bright sky flash during the storm window (never with reduced motion)
    const stormNow = wk === 'storm' && S.time >= S.weather.storm[0] && S.time < S.weather.storm[1];
    const flash = stormNow && !view.reduced && !view.noFx && ((W.time * 1000) % 4000) < 90;
    if (flash) { W.hemi.intensity += 2.5; }
    void dt; void LH;
  }
}
