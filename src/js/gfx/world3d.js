// Scene assembly for the 3D view: sun, sky and fog by time of day and season; terrain, creek, paths and the real
// backdrop; instanced trees; objects, tracks and people. Rebuilds only what changed (keys per layer).
import { K } from '../state.js';
import { hash2 } from '../rng.js';
import { nightAlpha } from '../render.js';
import { LH, lin } from './geo.js';
import { builtMask, cornerHeights, buildTerrain, buildWater, buildPaths, buildBackdrop, demSampler, backdropGround, groundY } from './terrain3d.js';
import { U } from './materials3d.js';
import { Trees } from './trees3d.js';
import { Objects } from './models3d.js';
import { People } from './people3d.js';
import { Fx } from './fx3d.js';

const DECL = [10, 19, 23, 21, 13, 2, -10]; // solar declination, Apr–Oct (degrees)
const LAT = 34.54 * Math.PI / 180;
// the sun's direction for the game clock: Hot Springs latitude, solar noon ≈ 13:12 daylight time
export function sunDir(S) {
  const hour = 10 + S.time / 100, dec = (DECL[Math.max(0, Math.min(6, S.month))] || 10) * Math.PI / 180;
  const H = (hour - 13.2) * 15 * Math.PI / 180;
  const sinE = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H);
  const E = Math.asin(sinE);
  const cosA = (Math.sin(dec) - Math.sin(E) * Math.sin(LAT)) / (Math.cos(E) * Math.cos(LAT));
  let A = Math.acos(Math.max(-1, Math.min(1, cosA))); if (H > 0) A = 2 * Math.PI - A; // azimuth from north, clockwise
  // world: x east, z south, y up
  return { el: E, az: A, v: [Math.sin(A) * Math.cos(E), Math.sin(E), -Math.cos(A) * Math.cos(E)] };
}

export class World {
  constructor(THREE, scene, mats, R3, renderer) {
    this.T = THREE; this.scene = scene; this.mats = mats; this.R3 = R3; this.renderer = renderer;
    this.keys = {}; this.S = null; this.CH = null; this.dem = window.SCT_DEM ? demSampler(window.SCT_DEM, 48) : null;
    const T = THREE;
    scene.fog = new T.Fog(0xb8cdd6, 60, 420);
    scene.background = new T.Color(0xb8cdd6);
    this.hemi = new T.HemisphereLight(0xcfe3f0, 0x5a5a3a, 0.9); scene.add(this.hemi);
    this.sun = new T.DirectionalLight(0xfff1d6, 2.6);
    this.sun.castShadow = true;
    const sz = R3.quality === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sz, sz); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun); scene.add(this.sun.target);
    this.groups = {};
    for (const k of ['ground', 'backdrop']) { this.groups[k] = new T.Group(); scene.add(this.groups[k]); }
    this.trees = new Trees(THREE, scene, mats, R3);
    this.objects = new Objects(THREE, scene, mats, R3, this);
    this.people = new People(THREE, scene, mats, R3, this);
    this.fx = new Fx(THREE, scene, mats, R3, this);
    this.envAt = -1;
    // sky dome: zenith-to-horizon gradient, a sun glow and soft drifting cumulus (seen on the title and when zoomed out)
    this.skyU = { uTop: { value: new T.Color(0x5f93c4) }, uHor: { value: new T.Color(0xb8cdd6) }, uSun: { value: new T.Vector3(0, 1, 0) }, uSunCol: { value: new T.Color(0xfff1d6) }, uTime: U.uTime, uCloudy: { value: 0.4 } };
    this.sky = new T.Mesh(new T.SphereGeometry(1400, 32, 16), new T.ShaderMaterial({
      uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uTop, uHor, uSunCol, uSun; uniform float uTime, uCloudy; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          float y = max(vD.y, 0.0);
          vec3 c = mix(uHor, uTop, pow(y, 0.55));
          float s = max(dot(vD, normalize(uSun)), 0.0);
          c += uSunCol * (pow(s, 600.0) * 1.5 + pow(s, 12.0) * 0.18);
          vec2 q = vD.xz / max(0.08, vD.y) * 0.9 + vec2(uTime * 0.004, 0.0);
          float cl = n(q) * 0.55 + n(q * 2.1) * 0.3 + n(q * 4.3) * 0.15;
          cl = smoothstep(0.62 - uCloudy * 0.3, 0.9, cl) * smoothstep(0.02, 0.2, vD.y);
          c = mix(c, mix(vec3(1.0), uHor, 0.35) * (0.75 + 0.25 * y), cl * 0.85);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` }));
    this.sky.frustumCulled = false; this.sky.renderOrder = -1; scene.add(this.sky);
    this.pmrem = new T.PMREMGenerator(renderer);
    this.time = 0;
  }
  setQuality(q) { const sz = q === 'high' ? 2048 : 1024; this.sun.shadow.mapSize.set(sz, sz); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } this.people.setQuality(q); }
  stats() { return { trees: this.trees.count, guests3d: this.people.count, objects3d: this.objects.count }; }
  ground(x, z) { return this.CH ? groundY(this.S, this.CH, x, z) : 0; }

  update(S, dt, camera, view) {
    const T = this.T, M = S.map;
    this.time += dt / 1000;
    U.uTime.value = view.reduced ? 0 : this.time;
    if (this.S !== S) { this.S = S; this.keys = {}; }
    // ---- terrain layer (built tiles, heights, season) ----
    const tkey = [S._gid || (S._gid = Math.random()), S._netVer || 0, S._objVer || 0, S.month, S.objects.length].join('|');
    if (tkey !== this.keys.terrain) {
      this.keys.terrain = tkey;
      const B = builtMask(S);
      this.B = B; this.CH = cornerHeights(S, B);
      this.replace('ground', [
        this.mesh(buildTerrain(S, this.CH, B), this.mats.terrain, { cast: true, receive: true }),
        this.mesh(buildWater(S), this.mats.water, { receive: true }),
        this.mesh(buildPaths(S), this.mats.path, { cast: false, receive: true }),
      ]);
      const bkey = [S._gid, S.month, M.w].join('|') + '|' + borderSig(S, this.CH);
      if (bkey !== this.keys.backdrop) {
        this.keys.backdrop = bkey;
        const bd = buildBackdrop(S, this.CH, this.dem);
        this.replace('backdrop', [this.mesh(bd.geo, this.mats.backdrop, { cast: false, receive: true })]);
      }
      this.trees.rebuild(S, this);
    }
    // ---- objects (rides, stalls, scenery, track) ----
    this.objects.update(S, dt, view);
    // ---- people ----
    this.people.update(S, dt, view);
    // ---- light, sky, weather ----
    this.light(S, camera, view);
    this.fx.update(S, dt, camera, view);
  }
  replace(name, meshes) {
    const g = this.groups[name];
    for (const c of [...g.children]) { g.remove(c); c.geometry.dispose(); }
    for (const m of meshes) if (m) g.add(m);
  }
  mesh(geo, mat, { cast = true, receive = true } = {}) {
    if (!geo.count) return null;
    const m = new this.T.Mesh(geo.build(this.T), mat); m.castShadow = cast; m.receiveShadow = receive; m.matrixAutoUpdate = false; m.updateMatrix();
    return m;
  }

  light(S, camera, view) {
    const T = this.T, sun = sunDir(S), wk = S.weather.kind;
    const elev = sun.el * 180 / Math.PI;
    const day = Math.max(0, Math.min(1, (elev + 5) / 9));            // 0 at night → 1 from 4° of sun elevation
    const golden = Math.max(0, Math.min(1, 1 - (elev - 3) / 20)) * Math.max(0, Math.min(1, (elev + 2) / 4)); // low sun warms the light
    const lamps = Math.min(1, nightAlpha(S) / 0.55);
    const night = Math.max(1 - day, lamps * 0.65);
    const wet = wk === 'rain' || wk === 'storm' ? 1 : 0, overcast = wk === 'cloud' ? 0.45 : wk === 'rain' ? 0.85 : wk === 'storm' ? 1 : 0;
    U.uNight.value = night; U.uWet.value = wet * 0.8; U.uCloud.value = (wk === 'sun' ? 0.55 : wk === 'cloud' ? 0.8 : 0.25) * day;
    U.uCloudOff.value.set((this.time * 0.004) % 1, (this.time * 0.0025) % 1);
    // sun: follows the camera target so the shadow map covers what is on screen
    const tg = new T.Vector3(); camera.getWorldDirection(tg); const dist = this.R3.camD || 30;
    const target = camera.position.clone().addScaledVector(tg, dist);
    const sv = sun.el > 0.02 ? sun.v : [0.35, 0.8, 0.45]; // after sunset: a cool moonlight from the south-east
    const span = Math.max(14, dist * 1.05);
    this.sun.position.set(target.x + sv[0] * 80, target.y + sv[1] * 80, target.z + sv[2] * 80);
    this.sun.target.position.copy(target); this.sun.target.updateMatrixWorld();
    const sc = this.sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 20; sc.far = 200; sc.updateProjectionMatrix();
    const warm = new T.Color().setRGB(1, 0.93 - golden * 0.28, 0.82 - golden * 0.45);
    const moon = new T.Color(0x8fa6d8);
    this.sun.color.copy(day > 0.05 ? warm : moon);
    this.sun.intensity = day > 0.05 ? (2.9 * day + golden * 1.1) * (1 - overcast * 0.8) : 0.6;
    if (this.sun.shadow.intensity !== undefined) this.sun.shadow.intensity = 1 - overcast * 0.7;
    this.sun.castShadow = this.renderer.shadowMap.enabled && (day > 0.05 || true);
    // sky/haze: Ouachita blue haze by day, peach at golden hour, deep blue at night
    const skyDay = new T.Color(0xaecbdc), skyGold = new T.Color(0xf0b088), skyNight = new T.Color(0x1c2644), skyRain = new T.Color(0x7a868e);
    const sky = skyDay.clone().lerp(skyGold, golden * 0.75).lerp(skyNight, 1 - day).lerp(skyRain, overcast * 0.7 * day);
    this.scene.background.copy(sky); this.scene.fog.color.copy(sky);
    this.sky.position.copy(camera.position);
    this.skyU.uHor.value.copy(sky); this.skyU.uTop.value.copy(new T.Color(0x4f8fd0).lerp(new T.Color(0x070a18), 1 - day).lerp(new T.Color(0x56606a), overcast * 0.85 * day).lerp(new T.Color(0x7890c0), golden * 0.35));
    this.skyU.uHor.value.lerp(new T.Color(0xffc890), golden * 0.55);
    this.skyU.uSun.value.set(sun.v[0], Math.max(-0.05, sun.v[1]), sun.v[2]); this.skyU.uSunCol.value.copy(warm).multiplyScalar(day);
    this.skyU.uCloudy.value = wk === 'sun' ? 0.25 : wk === 'cloud' ? 0.7 : 1;
    this.scene.fog.near = dist + (wet ? 10 : 30); this.scene.fog.far = dist + (wk === 'storm' ? 140 : wet ? 200 : 420);
    this.hemi.color.copy(new T.Color(0xcfe3f0).lerp(new T.Color(0x4a5e9a), (1 - day) * 0.85)).lerp(new T.Color(0xffd2a8), golden * 0.3);
    this.hemi.groundColor.copy(new T.Color(0x5e5a3a).lerp(new T.Color(0x1a1c2a), 1 - day));
    this.hemi.intensity = 0.9 + day * 0.4 + overcast * 0.35 * day + golden * 0.7;
    this.renderer.toneMappingExposure = (0.88 + (1 - day) * 0.25 + golden * 0.4) * (1 - overcast * 0.12);
    // environment reflections from a tiny sky scene, refreshed when the light changes noticeably
    const envKey = Math.round(day * 8) + Math.round(golden * 4) * 10 + overcast * 100;
    if (envKey !== this.envAt) { this.envAt = envKey; this.buildEnv(sky, day); }
    this.night = night; this.day = day; this.lamps = lamps;
    // grade: storms grey and flat, rain cool, golden hour warm, night slightly blue
    const sat = 1 - overcast * 0.38 - golden * 0.1, con = 1 - overcast * 0.12;
    const tint = [1 + golden * 0.1 - overcast * 0.05, 1 + golden * 0.02 - overcast * 0.02, 1 - golden * 0.12 + overcast * 0.04];
    this.grade = { sat, con, tint };
  }
  buildEnv(sky, day) {
    const T = this.T, s = new T.Scene();
    const geo = new T.SphereGeometry(10, 16, 8);
    const top = sky.clone().multiplyScalar(0.85 + day * 0.4), bot = new T.Color(0x4a5a3a).multiplyScalar(0.3 + day * 0.7);
    const col = []; const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) / 10 + 1) / 2; const c = bot.clone().lerp(top, Math.pow(t, 0.7)); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    s.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    if (this.env) this.env.dispose();
    this.env = this.pmrem.fromScene(s, 0.02).texture;
    this.scene.environment = this.env; this.scene.environmentIntensity = 0.35 + day * 0.45;
    geo.dispose();
  }
}
function borderSig(S, CH) {
  const M = S.map, w = M.w; let s = 0;
  for (let x = 0; x < w; x++) { s = (s * 31 + CH[x * 4] * 4) | 0; s = (s * 31 + CH[((M.h - 1) * w + x) * 4 + 3] * 4) | 0; }
  for (let y = 0; y < M.h; y++) { s = (s * 31 + CH[(y * w) * 4] * 4) | 0; s = (s * 31 + CH[(y * w + w - 1) * 4 + 1] * 4) | 0; }
  return s;
}
export { backdropGround, hash2, K, LH, lin };
