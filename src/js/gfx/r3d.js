// three.js view of the park. It replaces the Canvas painter when WebGL is available and keeps every contract of
// render.js: view.cam (iso px centre + zoom) still drives the camera, P() projects through the 3D camera, pick() ray
// marches the heightfield, and the 2D canvas on top carries badges, ghosts and labels.
// Only reads the sim state S; never changes it.
import { view } from '../render.js';
import { LH } from './geo.js';
import { World } from './world3d.js';
import { makeMaterials, makeDetailTextures } from './materials3d.js';
import { Objects } from './models3d.js';
import { def, kindOf, RIDES } from '../catalog.js';

export const R3 = { want: false, ready: false, loading: false, failed: null, quality: 'high', gpu: '', soft: false, draws: 0, tris: 0, frameMs: 0, lastDraw: 0 };
let THREE = null, renderer = null, scene = null, camera = null, world = null, mats = null, glCanvas = null;
const ZREF = 2.5;                       // level of the ground plane the 2D camera centre maps to
const EL = Math.PI / 6, AZ = Math.PI / 4; // the 2:1 iso view: 30° down, looking from +x+y
const DIR = [-Math.cos(EL) * Math.sin(AZ), -Math.sin(EL), -Math.cos(EL) * Math.cos(AZ)];
const FOV = 28;
let CW = 800, CH = 600, DPR = 1;

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('could not load ' + src));
    document.head.appendChild(s);
  });
}
export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

// load three.js and the asset scripts after first paint, then build the renderer
export async function boot(canvas, opts = {}) {
  if (R3.loading || R3.ready) return;
  R3.loading = true; R3.want = true; glCanvas = canvas;
  try {
    if (!window.THREE) await loadScript('vendor/three.min.js');
    await Promise.all([window.SCT_MODELS ? null : loadScript('assets/models.js'), window.SCT_DEM ? null : loadScript('assets/dem.js')]);
    THREE = window.THREE;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    R3.gpu = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    R3.soft = /swiftshader|llvmpipe|software|basic render/i.test(R3.gpu);
    const phone = Math.min(window.innerWidth, window.innerHeight) < 700;
    R3.quality = opts.quality || (R3.soft ? 'low' : phone ? 'medium' : 'high');
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.info.autoReset = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = R3.quality !== 'low';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 2000);
    mats = makeMaterials(THREE, makeDetailTextures(THREE), R3);
    world = new World(THREE, scene, mats, R3, renderer); if (/[?&]debug/.test(location.search)) { R3._world = world; window.__R3 = R3; }
    R3.ready = true; R3.loading = false;
    resize(CW, CH, DPR);
    view.g3 = api;
  } catch (e) {
    R3.failed = String(e && e.message || e); R3.loading = false; R3.ready = false; view.g3 = null;
    console.warn('3D view unavailable, using the 2D renderer:', R3.failed);
    throw e;
  }
}
export function resize(W, H, dpr) {
  CW = W; CH = H; DPR = dpr;
  if (!renderer) return;
  const q = R3.quality, cap = R3.soft ? 1 : q === 'high' ? 2 : q === 'medium' ? 1.5 : 1;
  renderer.setPixelRatio(Math.min(dpr, cap));
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
}

// ---- camera mapping ------------------------------------------------------------------------------
const tgt = [0, 0, 0];
export function syncCamera() {
  if (!camera) return;
  const c = view.cam;
  // the ground point at level ZREF on the 2D view axis through the screen centre
  const a = c.x / 32, b = (c.y + ZREF * 8) / 16; // a = x − y, b = x + y
  tgt[0] = (a + b) / 2; tgt[2] = (b - a) / 2; tgt[1] = ZREF * LH;
  let D = Math.SQRT2 * CH / (128 * c.z * Math.tan((FOV / 2) * Math.PI / 180)), dir = dirFor(c.z);
  // title and menus: a low cinematic view across the park toward the ridge and the sky
  if (view.cine) { const el = 0.19, az = AZ + 0.2, wide = CW > 700; dir = [-Math.cos(el) * Math.sin(az), -Math.sin(el), -Math.cos(el) * Math.cos(az)]; D *= 1.9; const k = wide ? 9 : 0; tgt[0] -= 3 + k; tgt[2] += k - 3; tgt[1] += 2.5; }
  camera.position.set(tgt[0] - dir[0] * D, tgt[1] - dir[1] * D, tgt[2] - dir[2] * D);
  camera.up.set(0, 1, 0);
  camera.lookAt(tgt[0], tgt[1], tgt[2]);
  camera.updateMatrixWorld();
  R3.camD = D;
}
// zoomed in, the camera tilts a little lower so the ridges behind the park come into view
function elFor(z) { const t = Math.max(0, Math.min(1, (z - 1) / 1)), u = Math.max(0, Math.min(1, (0.5 - z) / 0.18)); return EL - (7 * Math.PI / 180) * t * t * (3 - 2 * t) - (21 * Math.PI / 180) * u * u * (3 - 2 * u); }
function dirFor(z) { const el = elFor(z); return [-Math.cos(el) * Math.sin(AZ), -Math.sin(el), -Math.cos(el) * Math.cos(AZ)]; }
// the view.cam value that centres world point (x, y, level z) in the 3D view
function worldPx3(x, y, z) {
  const el = elFor(view.cam.z), d = dirFor(view.cam.z);
  const t = (z - ZREF) * LH / Math.sin(el); // slide along the view axis down to the ZREF plane
  const X = x + d[0] * t, Y = y + d[2] * t;
  return [(X - Y) * 32, (X + Y) * 16 - ZREF * 8];
}
const pv = { x: 0, y: 0, z: 0 };
function project(x, y, z) {
  const e = camera.matrixWorldInverse.elements, p = camera.projectionMatrix.elements;
  const X = x, Y = z * LH, Z = y;
  const vx = e[0] * X + e[4] * Y + e[8] * Z + e[12], vy = e[1] * X + e[5] * Y + e[9] * Z + e[13], vz = e[2] * X + e[6] * Y + e[10] * Z + e[14];
  const cx = p[0] * vx + p[8] * vz, cy = p[5] * vy + p[9] * vz, w = -vz;
  pv.x = (cx / w * 0.5 + 0.5) * CW; pv.y = (0.5 - cy / w * 0.5) * CH;
  return [pv.x, pv.y];
}
// screen → tile: march the camera ray over the grid, front to back, and return the first tile whose top it hits
function pick3(S, sx, sy) {
  syncCamera();
  const ndc = new THREE.Vector3((sx / CW) * 2 - 1, -(sy / CH) * 2 + 1, 0.5).unproject(camera);
  const o = camera.position, d = ndc.sub(o).normalize();
  const M = S.map, w = M.w, h = M.h;
  // start where the ray drops below the highest possible ground
  const top = (12 * LH - o.y) / d.y;
  let t = Math.max(0, top), step = 0.05, prevAbove = true;
  for (let n = 0; n < 4000; n++, t += step) {
    const X = o.x + d.x * t, Y = o.y + d.y * t, Z = o.z + d.z * t;
    if (Y < -2) break;
    const tx = Math.floor(X), tz = Math.floor(Z);
    if (tx < 0 || tz < 0 || tx >= w || tz >= h) { prevAbove = true; continue; }
    const i = tz * w + tx, gy = M.height[i] * LH;
    if (Y <= gy) { void prevAbove; return { x: tx, y: tz, i }; }
  }
  return null;
}

export const api = {
  project, worldPx: worldPx3, pick: pick3, sync: syncCamera, draw: (S, dt) => draw(S, dt),
  get ready() { return R3.ready; },
};

// ---- build-menu thumbnails: each catalog item rendered once from its 3D model --------------------------
const thumbs = new Map();
let thumbKit = null;
export function thumb(type) {
  if (!R3.ready) return null;
  if (thumbs.has(type)) return thumbs.get(type);
  const k = kindOf(type); if (k === 'track' || !def(type)) { thumbs.set(type, null); return null; }
  const T = THREE, SZ = 112;
  if (!thumbKit) {
    const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xdfeaf2, 0x6a6a50, 1.4)); const sun = new T.DirectionalLight(0xfff1d6, 2.4); sun.position.set(4, 8, 6); sc.add(sun);
    const rt = new T.WebGLRenderTarget(SZ, SZ, { samples: 4 }); const cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
    const stubWorld = { ground: () => 0, fx: { steamSrc: [], addSteam() {}, addSplash() {} }, time: 0 };
    const objs = new Objects(T, sc, mats, R3, stubWorld); objs.noGate = true;
    const cv = Object.assign(document.createElement('canvas'), { width: SZ, height: SZ });
    thumbKit = { sc, rt, cam, objs, cv, px: new Uint8Array(SZ * SZ * 4) };
  }
  const K = thumbKit, d = def(type), n = d.size || 1, W = 6;
  const M = { w: W, h: W, height: new Uint8Array(W * W), kind: new Uint8Array(W * W), tree: new Uint8Array(W * W), path: new Uint8Array(W * W), owned: new Uint8Array(W * W).fill(1), litter: new Uint8Array(W * W), occ: new Int32Array(W * W), gate: 0 };
  const o = { id: 1, type, kind: k, x: 1, y: 1, n, h: 0, entry: -1, status: 'open', phase: 'load', timer: 0, riders: [], queue: [], cal: true };
  const S = { map: M, objects: [o], park: { name: '' }, month: 2, _gid: 'thumb' + type };
  K.objs.sig = ''; K.objs.update(S, 0, { frac: 0 });
  const c = 1 + n / 2, r = Math.max(1.4, n * 0.95) + (RIDES[type] && RIDES[type].tall ? 1.6 : 0);
  K.cam.position.set(c + r * 1.25, r * 1.15, c + r * 1.25); K.cam.lookAt(c, (RIDES[type] && RIDES[type].tall ? r * 0.45 : n * 0.18), c);
  const prevBg = K.sc.background; K.sc.background = null;
  renderer.setRenderTarget(K.rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(K.sc, K.cam);
  renderer.readRenderTargetPixels(K.rt, 0, 0, SZ, SZ, K.px); renderer.setRenderTarget(null); K.sc.background = prevBg;
  const g = K.cv.getContext('2d'), img = g.createImageData(SZ, SZ);
  for (let y = 0; y < SZ; y++) img.data.set(K.px.subarray((SZ - 1 - y) * SZ * 4, (SZ - y) * SZ * 4), y * SZ * 4); // flip rows
  g.putImageData(img, 0, 0);
  const url = K.cv.toDataURL('image/png'); thumbs.set(type, url);
  return url;
}

// ---- night bloom (high quality only): scene → HDR target, bright pass at quarter size, two blurs, composite ----
let bloom = null;
function makeBloom() {
  const T = THREE, full = new T.Vector2(); renderer.getDrawingBufferSize(full);
  const rt = (w, h, s = 0) => new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: s, depthBuffer: s > 0 });
  const msaa = R3.quality === 'high' ? 4 : 2;
  const qw = Math.max(1, full.x >> 2), qh = Math.max(1, full.y >> 2);
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2));
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new T.Scene(); sc.add(quad);
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const bright = new T.ShaderMaterial({ uniforms: { tMap: { value: null } }, vertexShader: vs, toneMapped: false,
    fragmentShader: 'uniform sampler2D tMap; varying vec2 vUv; void main(){ vec3 c = texture2D(tMap, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.85, 2.2, l), 1.0); }' });
  const blur = new T.ShaderMaterial({ uniforms: { tMap: { value: null }, uDir: { value: new T.Vector2() } }, vertexShader: vs, toneMapped: false,
    fragmentShader: 'uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 c = texture2D(tMap, vUv).rgb * 0.227; c += (texture2D(tMap, vUv + uDir * 1.38).rgb + texture2D(tMap, vUv - uDir * 1.38).rgb) * 0.316; c += (texture2D(tMap, vUv + uDir * 3.23).rgb + texture2D(tMap, vUv - uDir * 3.23).rgb) * 0.07; gl_FragColor = vec4(c, 1.0); }' });
  const comp = new T.ShaderMaterial({ uniforms: { tScene: { value: null }, tBloom: { value: null }, uK: { value: 1 }, uSat: { value: 1 }, uTint: { value: new T.Vector3(1, 1, 1) }, uCon: { value: 1 } }, vertexShader: vs,
    fragmentShader: `uniform sampler2D tScene, tBloom; uniform float uK, uSat, uCon; uniform vec3 uTint; varying vec2 vUv; void main(){ vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * uK; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat) * uTint; c = (c - 0.18) * uCon + 0.18; c = max(c, 0.0); vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.35; gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` });
  return { w: full.x, h: full.y, scene: rt(full.x, full.y, msaa), a: rt(qw, qh), b: rt(qw, qh), quad, cam, sc, bright, blur, comp, qw, qh };
}
function renderBloom(k, grade) {
  const full = new THREE.Vector2(); renderer.getDrawingBufferSize(full);
  if (!bloom || bloom.w !== full.x || bloom.h !== full.y) { if (bloom) for (const r of ['scene', 'a', 'b']) bloom[r].dispose(); bloom = makeBloom(); }
  const B = bloom, pass = (mat, target) => { B.quad.material = mat; renderer.setRenderTarget(target); renderer.render(B.sc, B.cam); };
  renderer.setRenderTarget(B.scene); renderer.render(scene, camera);
  B.comp.uniforms.uSat.value = grade.sat; B.comp.uniforms.uCon.value = grade.con; B.comp.uniforms.uTint.value.set(...grade.tint);
  if (k <= 0) { B.comp.uniforms.tScene.value = B.scene.texture; B.comp.uniforms.tBloom.value = B.scene.texture; B.comp.uniforms.uK.value = 0; pass(B.comp, null); return; }
  B.bright.uniforms.tMap.value = B.scene.texture; pass(B.bright, B.a);
  for (let i = 0; i < 2; i++) {
    B.blur.uniforms.tMap.value = B.a.texture; B.blur.uniforms.uDir.value.set(1 / B.qw, 0); pass(B.blur, B.b);
    B.blur.uniforms.tMap.value = B.b.texture; B.blur.uniforms.uDir.value.set(0, 1 / B.qh); pass(B.blur, B.a);
  }
  B.comp.uniforms.tScene.value = B.scene.texture; B.comp.uniforms.tBloom.value = B.a.texture; B.comp.uniforms.uK.value = k;
  pass(B.comp, null);
}

// ---- frame -----------------------------------------------------------------------------------
export function draw(S, dt) {
  if (!R3.ready) return;
  const t0 = performance.now();
  renderer.info.reset();
  syncCamera();
  world.update(S, dt, camera, view);
  const night = world.night || 0;
  // colour grade (weather and time of day) and night bloom go through one composite pass; low quality renders direct
  if (R3.quality !== 'low' && !R3.soft) renderBloom(R3.quality === 'high' && night > 0.2 ? Math.min(1, (night - 0.2) * 1.6) : 0, world.grade || { sat: 1, con: 1, tint: [1, 1, 1] });
  else renderer.render(scene, camera);
  R3.frameMs = performance.now() - t0;
  const info = renderer.info.render; R3.draws = info.calls; R3.tris = info.triangles; R3.lastDraw = performance.now();
}
export function gfxState() {
  return { mode: R3.ready && view.g3 ? '3d' : '2d', want: R3.want, loading: R3.loading, failed: R3.failed, quality: R3.quality, gpu: R3.gpu, soft: R3.soft, draws: R3.draws, tris: R3.tris, frameMs: Math.round(R3.frameMs * 10) / 10, ...(world ? world.stats() : {}) };
}
export function setQuality(q) {
  R3.quality = q;
  if (!renderer) return;
  renderer.shadowMap.enabled = q !== 'low';
  world && world.setQuality(q);
  resize(CW, CH, DPR);
}
// switch between the 3D view and the Canvas renderer without reloading
export function use3d(on) { if (on && R3.ready) { view.g3 = api; R3.want = true; } else { view.g3 = null; R3.want = on; } return !!view.g3; }
