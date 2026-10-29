// Shared materials for the 3D view. One vertex-coloured standard material carries almost everything; a per-vertex
// aGlow = (strength, chase phase, gloss) attribute adds night glow (neon, bulbs, signs) and glossy paint, so lit
// signage and chaser bulbs need no extra draw calls. Uniforms are shared and updated once per frame.

export const U = { uTime: { value: 0 }, uNight: { value: 0 }, uWet: { value: 0 }, uCloud: { value: 0 }, uCloudOff: { value: null }, uDetail: { value: null }, uPave: { value: null }, uWind: { value: 0.6 } };

const GLOW_VS_DECL = `attribute vec3 aGlow;\nvarying vec3 vGlow;\nvarying vec3 vWPos;\n`;
const GLOW_FS_DECL = `uniform float uTime; uniform float uNight; uniform float uWet; uniform float uCloud; uniform vec2 uCloudOff;\nuniform sampler2D uDetail;\nvarying vec3 vGlow;\nvarying vec3 vWPos;\n`;

// opts: { detail: 'ground' | 'pave' | null, clouds: bool }
function patch(mat, opts = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    if (opts.detail === 'pave') sh.uniforms.uDetail = U.uPave;
    sh.vertexShader = GLOW_VS_DECL + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vGlow = aGlow;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vec4 wp4 = modelMatrix * vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n wp4 = modelMatrix * instanceMatrix * vec4(transformed, 1.0);\n #endif\n vWPos = wp4.xyz;');
    let fs = GLOW_FS_DECL + sh.fragmentShader;
    // gloss: lower roughness where aGlow.z is set; wet weather lowers it everywhere a little
    fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.28, vGlow.z);\n roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.55, uWet);');
    if (opts.detail) {
      // world-space detail texture on up-facing surfaces (grass speckle, paver joints)
      fs = fs.replace('#include <color_fragment>', `#include <color_fragment>
        vec2 duv = vWPos.xz * ${opts.detail === 'pave' ? '1.0' : '0.37'};
        float dt = texture2D(uDetail, duv).r;
        float dt2 = texture2D(uDetail, duv * 0.21 + 0.37).r;
        diffuseColor.rgb *= mix(1.0, (0.78 + 0.44 * dt) * (0.9 + 0.2 * dt2), ${opts.detail === 'pave' ? '0.9' : '0.75'});
        ${opts.detail === 'ground' ? `vec3 wn = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
        if (abs(wn.y) < 0.45) { float st = texture2D(uDetail, vec2((vWPos.x + vWPos.z) * 0.9, vWPos.y * 1.8)).b; diffuseColor.rgb *= 0.62 + 0.55 * st; }` : ''}`);
    }
    if (opts.clouds) {
      fs = fs.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float cl = texture2D(uDetail, vWPos.xz * 0.006 + uCloudOff).g;
        float cs = mix(1.0, smoothstep(0.35, 0.75, cl) * 0.55 + 0.45, uCloud);
        reflectedLight.directDiffuse *= cs; reflectedLight.directSpecular *= cs;`);
    }
    // night glow: emissive = vertex colour × strength, with chaser bulbs when phase > 0
    fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float chase = vGlow.y > 0.0 ? 0.55 + 0.45 * step(0.5, fract(uTime * 1.6 + vGlow.y)) : 1.0;
      totalEmissiveRadiance += diffuseColor.rgb * vGlow.x * chase * (0.12 + uNight * 2.4);
      ${opts.detail === 'pave' ? 'totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.78, 0.5) * uNight * 0.16;' : ''}`);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'sct-' + (opts.detail || '-') + (opts.clouds ? 'c' : '');
  return mat;
}

export function makeMaterials(THREE, tex, R3) {
  U.uDetail.value = tex.detail; U.uPave.value = tex.pave; U.uCloudOff.value = new THREE.Vector2(0, 0);
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, ...o });
  const M = {
    obj: patch(std({})),
    terrain: patch(std({ roughness: 0.95 }), { detail: 'ground', clouds: true }),
    backdrop: patch(std({ roughness: 1 }), { clouds: true }),
    path: patch(std({ roughness: 0.9 }), { detail: 'pave' }),
    metal: patch(std({ roughness: 0.35, metalness: 0.55 })),
    glass: new THREE.MeshStandardMaterial({ color: 0x9ec9d6, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.45 }),
    water: makeWater(THREE),
    pool: makeWater(THREE, true),
    decal: new THREE.MeshBasicMaterial({ map: tex.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, toneMapped: false }),
    steam: new THREE.MeshBasicMaterial({ map: tex.puff, transparent: true, depthWrite: false, opacity: 0.5, vertexColors: true }),
    rain: new THREE.LineBasicMaterial({ color: 0xc8dcea, transparent: true, opacity: 0.38, depthWrite: false }),
  };
  void R3;
  return M;
}

// water: vertex-coloured, slightly transparent, with moving ripple normals and a fresnel lift toward the sky colour
function makeWater(THREE, pool) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.05, transparent: true, opacity: pool ? 0.86 : 0.9 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uTime; uniform float uNight;\nvarying vec3 vWPos;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${pool ? 'vec2 tg = abs(fract(vWPos.xz * 4.0) - 0.5); diffuseColor.rgb *= 0.9 + 0.1 * smoothstep(0.44, 0.47, max(tg.x, tg.y)) * -1.0 + 0.1; // pool tiles seen through the water' : ''}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 q = vWPos.xz * ${pool ? '3.1' : '2.2'};
        float t = uTime * ${pool ? '0.9' : '0.6'};
        vec3 rip = vec3(sin(q.x * 1.7 + t * 2.1) * 0.5 + sin(q.y * 2.3 - t * 1.3 + q.x * 0.7) * 0.5, 0.0,
                        cos(q.y * 1.9 + t * 1.7) * 0.5 + sin(q.x * 2.9 + q.y * 0.6 - t * 2.4) * 0.4);
        normal = normalize(normal + (viewMatrix * vec4(rip.x * 0.16, 0.0, rip.z * 0.16, 0.0)).xyz);`)
      .replace('#include <opaque_fragment>', `float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
        outgoingLight = mix(outgoingLight, vec3(0.62, 0.78, 0.86) * (1.0 - uNight * 0.85), fres * 0.45);
        ${pool ? 'outgoingLight += diffuseColor.rgb * vec3(0.5, 0.9, 1.0) * uNight * 0.55; // pool underlights after dark' : ''}
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'sct-water' + (pool ? 'p' : '');
  return m;
}

// procedural textures (canvas → texture; nothing is fetched, so file:// works)
export function makeDetailTextures(THREE) {
  const N = 256;
  const cv = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  // detail: R = small speckle noise, G = big soft cloud noise (both tile)
  const c1 = cv(N, N), g1 = c1.getContext('2d'), img = g1.createImageData(N, N);
  const lat = (n, seed) => { const a = new Float32Array(n * n); let s = seed; for (let i = 0; i < a.length; i++) { s = (s * 16807) % 2147483647; a[i] = s / 2147483647; } return a; };
  const L1 = lat(64, 7), L2 = lat(8, 11), L3 = lat(16, 3);
  const samp = (L, n, x, y) => { const x0 = Math.floor(x) % n, y0 = Math.floor(y) % n, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n, fx = x - Math.floor(x), fy = y - Math.floor(y); const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (L[y0 * n + x0] * (1 - sx) + L[y0 * n + x1] * sx) * (1 - sy) + (L[y1 * n + x0] * (1 - sx) + L[y1 * n + x1] * sx) * sy; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = 0.6 * samp(L1, 64, x / 4, y / 4) + 0.4 * samp(L3, 16, x / 16, y / 16);
    const g = 0.65 * samp(L2, 8, x / 32, y / 32) + 0.35 * samp(L3, 16, x / 16, y / 16);
    // B: coursed stone blocks (32 px courses, staggered, mortar joints) for walls and cliffs
    const row = Math.floor(y / 32), bx = Math.floor((x + (row & 1) * 24) / 48), jx = (x + (row & 1) * 24) % 48, jy = y % 32;
    const joint = jx < 3 || jy < 3 ? 0.25 : 1, bv = 0.55 + 0.45 * ((Math.sin(bx * 12.9898 + row * 78.233) * 43758.5453) % 1 + 1) % 1;
    const k = (y * N + x) * 4; img.data[k] = r * 255; img.data[k + 1] = g * 255; img.data[k + 2] = joint * bv * (0.85 + 0.15 * r) * 255; img.data[k + 3] = 255;
  }
  g1.putImageData(img, 0, 0);
  const detail = new THREE.CanvasTexture(c1); detail.wrapS = detail.wrapT = THREE.RepeatWrapping; detail.colorSpace = THREE.NoColorSpace;
  // pavers: running-bond stone pavers, one texture repeat per tile
  const c2 = cv(128, 128), g2 = c2.getContext('2d');
  g2.fillStyle = '#c8c8c8'; g2.fillRect(0, 0, 128, 128);
  const rows = 4;
  for (let r = 0; r < rows; r++) for (let k = -1; k < 4; k++) {
    const x0 = k * 32 + (r & 1 ? 16 : 0), y0 = r * 32;
    const v = 170 + ((r * 7 + k * 13) % 5) * 12;
    g2.fillStyle = `rgb(${v},${v},${v})`; g2.fillRect(x0 + 2, y0 + 2, 28, 28);
  }
  g2.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 300; i++) g2.fillRect((i * 53) % 128, (i * 97) % 128, 1, 1);
  const pave = new THREE.CanvasTexture(c2); pave.wrapS = pave.wrapT = THREE.RepeatWrapping; pave.colorSpace = THREE.NoColorSpace; pave.anisotropy = 4;
  // soft round glow for light pools and neon halos
  const c3 = cv(64, 64), g3 = c3.getContext('2d'), gr = g3.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g3.fillStyle = gr; g3.fillRect(0, 0, 64, 64);
  const glow = new THREE.CanvasTexture(c3);
  // steam puff
  const c4 = cv(64, 64), g4 = c4.getContext('2d');
  for (let i = 0; i < 6; i++) { const x = 20 + (i * 13) % 26, y = 22 + (i * 7) % 22, r = 14 + (i % 3) * 4; const g = g4.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); g4.fillStyle = g; g4.fillRect(0, 0, 64, 64); }
  const puff = new THREE.CanvasTexture(c4);
  return { detail, pave, glow, puff };
}
