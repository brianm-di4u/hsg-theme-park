// A small vertex-colour geometry builder for the 3D view. Everything static (terrain, paths, ride bases, stalls,
// scenery) is emitted as plain triangles with per-vertex colour and a "glow" attribute (strength, chase phase, gloss),
// then uploaded as one BufferGeometry, so a whole park costs a handful of draw calls.
// Coordinates: x = tile x, z = tile y, y = up (world units: 1 = one tile).

export const LH = 0.35; // world height of one terrain level

const tmp = [0, 0, 0];
function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
const colCache = new Map();
// '#rrggbb' → linear [r, g, b]
export function lin(hex) {
  let v = colCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
    colCache.set(hex, v);
  }
  return v;
}
export function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
export function mul(a, f) { return [a[0] * f, a[1] * f, a[2] * f]; }

export class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.g = []; this.m = null; this.glow = [0, 0, 0]; }
  // optional transform: a 4×3 affine matrix as [a,b,c,tx, d,e,f,ty, g,h,i,tz] (rows)
  setMatrix(m) { this.m = m; return this; }
  setGlow(strength = 0, phase = 0, gloss = 0) { this.glow = [strength, phase, gloss]; return this; }
  xf(x, y, z) {
    const m = this.m; if (!m) { tmp[0] = x; tmp[1] = y; tmp[2] = z; return tmp; }
    tmp[0] = m[0] * x + m[1] * y + m[2] * z + m[3]; tmp[1] = m[4] * x + m[5] * y + m[6] * z + m[7]; tmp[2] = m[8] * x + m[9] * y + m[10] * z + m[11];
    return tmp;
  }
  xn(x, y, z) {
    const m = this.m; let a = x, b = y, c = z;
    if (m) { a = m[0] * x + m[1] * y + m[2] * z; b = m[4] * x + m[5] * y + m[6] * z; c = m[8] * x + m[9] * y + m[10] * z; }
    const l = Math.hypot(a, b, c) || 1; tmp[0] = a / l; tmp[1] = b / l; tmp[2] = c / l; return tmp;
  }
  // one triangle with a flat normal (computed from the transformed points)
  tri(a, b, c, col, cb, cc) {
    const P = this.p, N = this.n, C = this.c, G = this.g;
    const A = this.xf(a[0], a[1], a[2]).slice(), B = this.xf(b[0], b[1], b[2]).slice(), Cc = this.xf(c[0], c[1], c[2]).slice();
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    P.push(A[0], A[1], A[2], B[0], B[1], B[2], Cc[0], Cc[1], Cc[2]);
    N.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    const c1 = col, c2 = cb || col, c3 = cc || col;
    C.push(c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], c3[0], c3[1], c3[2]);
    const g = this.glow; G.push(g[0], g[1], g[2], g[0], g[1], g[2], g[0], g[1], g[2]);
  }
  // triangle with explicit (smooth) normals
  triN(a, b, c, na, nb, nc, col, cb, cc) {
    const P = this.p, N = this.n, C = this.c, G = this.g;
    for (const [v, nn, cl] of [[a, na, col], [b, nb, cb || col], [c, nc, cc || col]]) {
      const X = this.xf(v[0], v[1], v[2]); P.push(X[0], X[1], X[2]);
      const Y = this.xn(nn[0], nn[1], nn[2]); N.push(Y[0], Y[1], Y[2]);
      C.push(cl[0], cl[1], cl[2]);
      const g = this.glow; G.push(g[0], g[1], g[2]);
    }
  }
  quad(a, b, c, d, col, cb, cc, cd) { this.tri(a, b, c, col, cb, cc); this.tri(a, c, d, col, cc, cd || col); }
  // axis-aligned box from (x0,y0,z0) to (x1,y1,z1); colours: top, sides, bottom (optional)
  box(x0, y0, z0, x1, y1, z1, top, side, bottom) {
    const s = side || top, s2 = mul(s, 0.86);
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], top);
    if (bottom !== false) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], bottom || mul(s, 0.6));
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], s);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], s2);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], s2);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], s);
    return this;
  }
  // vertical cylinder / frustum around (cx, cz) from y0 to y1 with radii r0 (bottom) and r1 (top)
  cyl(cx, cz, y0, y1, r0, r1, seg, side, top, bottom, smooth = true) {
    const ang = (k) => (k / seg) * Math.PI * 2;
    const slope = (r0 - r1) / Math.max(1e-6, y1 - y0);
    for (let k = 0; k < seg; k++) {
      const a0 = ang(k), a1 = ang(k + 1);
      const p00 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], p10 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
      const p01 = [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1], p11 = [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1];
      if (smooth) {
        const n0 = [Math.cos(a0), slope, Math.sin(a0)], n1 = [Math.cos(a1), slope, Math.sin(a1)];
        this.triN(p00, p01, p11, n0, n0, n1, side); this.triN(p00, p11, p10, n0, n1, n1, side);
      } else { this.tri(p00, p01, p11, side); this.tri(p00, p11, p10, side); }
      if (top && r1 > 0) this.tri([cx, y1, cz], p11, p01, top);
      if (bottom && r0 > 0) this.tri([cx, y0, cz], p00, p10, bottom);
    }
    return this;
  }
  // a tube between two points (square-ish prism with `seg` sides), for rails, struts and poles
  tube(a, b, r, col, seg = 6) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
    const t = [dx / L, dy / L, dz / L];
    let u = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
    let l = Math.hypot(...v); v = v.map((q) => q / l);
    u = [v[1] * t[2] - v[2] * t[1], v[2] * t[0] - v[0] * t[2], v[0] * t[1] - v[1] * t[0]];
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      const o0 = [u[0] * Math.cos(a0) + v[0] * Math.sin(a0), u[1] * Math.cos(a0) + v[1] * Math.sin(a0), u[2] * Math.cos(a0) + v[2] * Math.sin(a0)];
      const o1 = [u[0] * Math.cos(a1) + v[0] * Math.sin(a1), u[1] * Math.cos(a1) + v[1] * Math.sin(a1), u[2] * Math.cos(a1) + v[2] * Math.sin(a1)];
      const A0 = [a[0] + o0[0] * r, a[1] + o0[1] * r, a[2] + o0[2] * r], A1 = [a[0] + o1[0] * r, a[1] + o1[1] * r, a[2] + o1[2] * r];
      const B0 = [b[0] + o0[0] * r, b[1] + o0[1] * r, b[2] + o0[2] * r], B1 = [b[0] + o1[0] * r, b[1] + o1[1] * r, b[2] + o1[2] * r];
      this.triN(A0, B0, B1, o0, o0, o1, col); this.triN(A0, B1, A1, o0, o1, o1, col);
    }
    return this;
  }
  // one continuous tube along a polyline, with parallel-transported frames so rings never twist or tear at bends
  sweep(pts, r, col, seg = 8, open = false) {
    const n = pts.length; if (n < 2) return this;
    const T = [], U = [], V = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l = Math.hypot(...t) || 1; t = t.map((q) => q / l); T.push(t);
    }
    let u = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    for (let i = 0; i < n; i++) {
      const t = T[i], d = u[0] * t[0] + u[1] * t[1] + u[2] * t[2];
      u = [u[0] - t[0] * d, u[1] - t[1] * d, u[2] - t[2] * d]; const l = Math.hypot(...u) || 1; u = u.map((q) => q / l);
      U.push(u); V.push([t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]);
    }
    const ring = (i, k) => { const a = (k / seg) * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a); return [U[i][0] * c + V[i][0] * s2, U[i][1] * c + V[i][1] * s2, U[i][2] * c + V[i][2] * s2]; };
    // open = a half-pipe flume channel (upper half missing), so riders inside show
    const k0 = open ? Math.floor(seg / 2) : 0;
    for (let i = 0; i < n - 1; i++) for (let k = k0; k < seg; k++) {
      const o00 = ring(i, k), o01 = ring(i, k + 1), o10 = ring(i + 1, k), o11 = ring(i + 1, k + 1), a = pts[i], b = pts[i + 1];
      const P = (p, o) => [p[0] + o[0] * r, p[1] + o[1] * r, p[2] + o[2] * r];
      this.triN(P(a, o00), P(b, o10), P(b, o11), o00, o10, o11, col); this.triN(P(a, o00), P(b, o11), P(a, o01), o00, o11, o01, col);
    }
    return this;
  }
  // a cone/dome-ish canopy: n segments, radius r at y0 rising to apex at y1; stripes alternate col/col2
  cone(cx, cz, y0, y1, r, seg, col, col2, rot = 0) {
    for (let k = 0; k < seg; k++) {
      const a0 = rot + (k / seg) * Math.PI * 2, a1 = rot + ((k + 1) / seg) * Math.PI * 2;
      this.tri([cx, y1, cz], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], k % 2 && col2 ? col2 : col);
    }
    return this;
  }
  disc(cx, cz, y, r, seg, col, col2) {
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      this.tri([cx, y, cz], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], k % 2 && col2 ? col2 : col);
    }
    return this;
  }
  // append an imported model (from SCT_MODELS, decoded) with a colour function per region
  model(md, colOf, m) {
    const save = this.m; if (m) this.m = m;
    const P = md.pos, Nn = md.nrm, R = md.reg;
    for (let i = 0; i < md.n; i += 3) {
      const a = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], b = [P[i * 3 + 3], P[i * 3 + 4], P[i * 3 + 5]], c = [P[i * 3 + 6], P[i * 3 + 7], P[i * 3 + 8]];
      const na = [Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]], nb = [Nn[i * 3 + 3], Nn[i * 3 + 4], Nn[i * 3 + 5]], nc = [Nn[i * 3 + 6], Nn[i * 3 + 7], Nn[i * 3 + 8]];
      this.triN(a, b, c, na, nb, nc, colOf(R[i], md.col, i), colOf(R[i + 1], md.col, i + 1), colOf(R[i + 2], md.col, i + 2));
    }
    this.m = save;
    return this;
  }
  get count() { return this.p.length / 3; }
  // → THREE.BufferGeometry
  build(THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.g, 3));
    g.computeBoundingSphere();
    return g;
  }
}

// affine helpers: translation · rotation about Y · uniform scale
export function mat(tx, ty, tz, rotY = 0, s = 1) {
  const c = Math.cos(rotY) * s, si = Math.sin(rotY) * s;
  return [c, 0, si, tx, 0, s, 0, ty, -si, 0, c, tz];
}
