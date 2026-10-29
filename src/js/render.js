// Canvas renderer: isometric terrain blocks, paths, objects, track, guests, staff, night and weather.
// Painter's order: tiles by diagonal x+y (then x). A square n×n object is drawn right after diagonal
// x0+y0+n−2 and draws its own footprint block (MECHANICS §14).
import { K, idx, DAY, HOUR } from './state.js';
import { RIDES, TRACKS, STALLS, SCENERY } from './catalog.js';
import { hash2 } from './rng.js';
import { DIRS } from './track.js';
import { rideOpen } from './guests.js';
import { atSchool } from './staff.js';

export const TW = 64, TH = 32, LV = 8;
export const view = { dbg: {}, W: 800, H: 600, dpr: 1, cam: { x: 0, y: 0, z: 1 }, ox: 0, oy: 0, ghost: null, sel: null, hover: -1, frac: 0, reduced: false, t: 0 };
const anim = new Map();

export function setView(W, H, dpr) { view.W = W; view.H = H; view.dpr = dpr; }
function updateOrigin() {
  const c = view.cam;
  view.ox = view.W / 2 - c.x * c.z; view.oy = view.H / 2 - c.y * c.z;
}
// world (tile x, tile y, level z) → CSS px
export function P(x, y, z) {
  if (view.g3) return view.g3.project(x, y, z);
  const Z = view.cam.z;
  return [(x - y) * (TW / 2) * Z + view.ox, ((x + y) * (TH / 2) - z * LV) * Z + view.oy];
}
export function worldPx(x, y, z) { if (view.g3) return view.g3.worldPx(x, y, z); return [(x - y) * (TW / 2), (x + y) * (TH / 2) - z * LV]; }
export function centerOn(x, y, z) { const [wx, wy] = worldPx(x, y, z); view.cam.x = wx; view.cam.y = wy; }

// ---- colours -----------------------------------------------------------------------------
const SEASON_GRASS = ['#6E9A45', '#5E8F3E', '#5C8A3A', '#5A8638', '#62883A', '#6E8A3C', '#7F8840'];
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
const cache = new Map();
const sh = (hex, f) => { let m = cache.get(hex); if (!m) cache.set(hex, (m = new Map())); let v = m.get(f); if (!v) { v = shade(hex, f); m.set(f, v); } return v; };

function poly(ctx, pts, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
// An axis-aligned prism in world units: top plus the two faces that face the viewer (+x, +y).
export function prism(ctx, x0, y0, x1, y1, z0, z1, col) {
  const a = P(x0, y0, z1), b = P(x1, y0, z1), c = P(x1, y1, z1), d = P(x0, y1, z1);
  const b0 = P(x1, y0, z0), c0 = P(x1, y1, z0), d0 = P(x0, y1, z0);
  poly(ctx, [b, c, c0, b0], sh(col, -0.18));
  poly(ctx, [d, c, c0, d0], sh(col, -0.32));
  poly(ctx, [a, b, c, d], col);
}
function cyl(ctx, cx, cy, r, z0, z1, col, n = 12) {
  // vertical cylinder approximated as an ellipse top and a shaded body
  const Z = view.cam.z;
  const [sx, sy0] = P(cx, cy, z0), [, sy1] = P(cx, cy, z1);
  const rx = r * TW * 0.7 * Z, ry = r * TH * 0.7 * Z;
  ctx.fillStyle = sh(col, -0.25);
  ctx.beginPath(); ctx.ellipse(sx, sy0, rx, ry, 0, 0, Math.PI); ctx.lineTo(sx - rx, sy1); ctx.ellipse(sx, sy1, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(sx, sy1, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  void n;
}
function line(ctx, a, b, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w * view.cam.z; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }

// ---- terrain -----------------------------------------------------------------------------
function grassCol(S, i, h) {
  const base = SEASON_GRASS[S.month] || SEASON_GRASS[2];
  const v = (hash2(i, 7) - 0.5) * 0.06 + h * 0.025;
  return sh(base, v);
}
function terrainTile(ctx, S, x, y, i) {
  const M = S.map, h = M.height[i], kind = M.kind[i];
  const w = M.w;
  const top = [P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)];
  // side faces down to the neighbour on +x and +y (map edge: down to −1)
  const hr = x + 1 < w ? M.height[i + 1] : -1, hb = y + 1 < M.h ? M.height[i + w] : -1;
  const sideCol = kind === K.ROCK ? '#8C877C' : '#A08A6A';
  if (hr < h) poly(ctx, [top[1], top[2], P(x + 1, y + 1, hr), P(x + 1, y, hr)], sh(sideCol, -0.15));
  if (hb < h) poly(ctx, [top[3], top[2], P(x + 1, y + 1, hb), P(x, y + 1, hb)], sh(sideCol, -0.32));
  let col;
  if (kind === K.WATER) col = hash2(x, y, 9) > 0.85 ? '#3BA9A0' : '#2A9D8F';
  else if (kind === K.ROCK) col = sh('#9A968C', (hash2(i, 3) - 0.5) * 0.1);
  else col = grassCol(S, i, h);
  if (!M.owned[i]) col = sh(col.startsWith('#') ? col : '#5C8A3A', -0.35);
  poly(ctx, top, col);
  if (kind === K.WATER) { ctx.globalAlpha = 0.35; line(ctx, P(x + 0.25, y + 0.4, h), P(x + 0.6, y + 0.4, h), '#C3F0EA', 1); ctx.globalAlpha = 1; }
  if (view.grid) poly(ctx, top, null, 'rgba(0,0,0,0.12)');
}
function pathTile(ctx, S, x, y, i) {
  const M = S.map, h = M.height[i], w = M.w;
  const isGate = i === M.gate;
  const col = isGate ? '#D9D4CA' : '#CFC3A8';
  const e = 0.1;
  poly(ctx, [P(x + e, y + e, h), P(x + 1 - e, y + e, h), P(x + 1 - e, y + 1 - e, h), P(x + e, y + 1 - e, h)], col);
  // connect to neighbours: fill the gap strips
  const conn = (j) => M.path[j] && Math.abs(M.height[j] - h) <= 1;
  if (x + 1 < w && conn(i + 1)) poly(ctx, [P(x + 1 - e, y + e, h), P(x + 1, y + e, h), P(x + 1, y + 1 - e, h), P(x + 1 - e, y + 1 - e, h)], col);
  if (x > 0 && conn(i - 1)) poly(ctx, [P(x, y + e, h), P(x + e, y + e, h), P(x + e, y + 1 - e, h), P(x, y + 1 - e, h)], col);
  if (y + 1 < M.h && conn(i + w)) poly(ctx, [P(x + e, y + 1 - e, h), P(x + 1 - e, y + 1 - e, h), P(x + 1 - e, y + 1, h), P(x + e, y + 1, h)], col);
  if (y > 0 && conn(i - w)) poly(ctx, [P(x + e, y, h), P(x + 1 - e, y, h), P(x + 1 - e, y + e, h), P(x + e, y + e, h)], col);
  // stairs down the faces toward lower connected neighbours
  ctx.lineWidth = 1;
  if (x + 1 < w && conn(i + 1) && M.height[i + 1] < h) for (let k = 1; k < 4; k++) line(ctx, P(x + 1, y + e, h - k / 4), P(x + 1, y + 1 - e, h - k / 4), '#8C877C', 1);
  if (y + 1 < M.h && conn(i + w) && M.height[i + w] < h) for (let k = 1; k < 4; k++) line(ctx, P(x + e, y + 1, h - k / 4), P(x + 1 - e, y + 1, h - k / 4), '#8C877C', 1);
}
function pathDyn(ctx, S, x, y, i) {
  const M = S.map, h = M.height[i];
  const L = M.litter[i];
  for (let k = 0; k < L; k++) {
    const [lx, ly] = P(x + 0.2 + hash2(i, k) * 0.6, y + 0.2 + hash2(k, i) * 0.6, h);
    ctx.fillStyle = k % 2 ? '#F4F2EC' : '#C8501F'; ctx.fillRect(lx - 1.5 * view.cam.z, ly - 1 * view.cam.z, 3 * view.cam.z, 2 * view.cam.z);
  }
  if (i === M.gate) drawGate(ctx, S, x, y, h);
}
function drawGate(ctx, S, x, y, h) {
  prism(ctx, x + 0.02, y + 0.15, x + 0.16, y + 0.85, h, h + 4, '#F26B5B');
  prism(ctx, x + 0.84, y + 0.15, x + 0.98, y + 0.85, h, h + 4, '#F26B5B');
  prism(ctx, x - 0.05, y + 0.35, x + 1.05, y + 0.65, h + 4, h + 5.2, '#3FBFB5');
  const [sx, sy] = P(x + 0.5, y + 0.5, h + 4.6);
  ctx.fillStyle = '#FFF6E0'; ctx.font = `bold ${Math.max(7, 8 * view.cam.z)}px system-ui, sans-serif`; ctx.textAlign = 'center';
  if (view.cam.z >= 0.7) ctx.fillText('THRILLS', sx, sy + 3 * view.cam.z);
}

// ---- trees and scenery ----------------------------------------------------------------------
function treeCols(S, kind) {
  const m = S.month;
  if (kind === 1) return ['#2F4A2C', '#3D5E36'];
  if (kind === 2) return m === 6 ? ['#C8501F', '#D9773A'] : m === 0 ? ['#7FA05A', '#93B46A'] : ['#4F6B35', '#5F7F40'];
  if (kind === 3) return m === 0 ? ['#B5568F', '#D07AAE'] : m === 6 ? ['#C8501F', '#E2903F'] : ['#5C7A3A', '#6E8C46'];
  return m === 0 ? ['#F4F2EC', '#FFFFFF'] : m === 6 ? ['#A63E2A', '#C8501F'] : ['#4F6B35', '#628447'];
}
// Trees and people come from small sprite canvases cached per zoom (drawImage is far cheaper than
// rasterizing their paths every frame).
const sprites = new Map();
let spriteZ = 0;
function sprite(key, w, h, ax, ay, draw) {
  const Z = view.cam.z, d = view.dpr;
  if (spriteZ !== Z * 100 + d) { sprites.clear(); spriteZ = Z * 100 + d; }
  let s = sprites.get(key);
  if (!s) {
    const cv = Object.assign(document.createElement('canvas'), { width: Math.ceil(w * Z * d), height: Math.ceil(h * Z * d) });
    const g = cv.getContext('2d'); g.scale(d, d);
    draw(g, ax * Z, ay * Z, Z);
    s = { cv, w: w * Z, h: h * Z, ax: ax * Z, ay: ay * Z };
    sprites.set(key, s);
  }
  return s;
}
function blit(ctx, s, sx, sy) { ctx.drawImage(s.cv, sx - s.ax, sy - s.ay, s.w, s.h); }
function drawTree(ctx, S, x, y, h, kind, seed) {
  const j = Math.floor(hash2(seed, 11) * 3);
  const cx = x + 0.5 + (hash2(seed, 3) - 0.5) * 0.3, cy = y + 0.5 + (hash2(seed, 5) - 0.5) * 0.3;
  const [tx, ty] = P(cx, cy, h);
  const [c1, c2] = treeCols(S, kind);
  blit(ctx, sprite('t' + kind + c1 + j, 32, 56, 16, 52, (g, ox, oy, Z) => treeArt(g, ox, oy, Z, kind, c1, c2, j)), tx, ty);
}
function treeArt(ctx, tx, ty, Z, kind, c1, c2, j) {
  ctx.fillStyle = '#5B4632'; ctx.fillRect(tx - 1.5 * Z, ty - 8 * Z, 3 * Z, 8 * Z);
  const s = (0.85 + j * 0.2) * Z;
  if (kind === 1) {
    for (let k = 0; k < 3; k++) {
      const yy = ty - (8 + k * 9) * s, ww = (13 - k * 3.5) * s;
      ctx.fillStyle = k % 2 ? c2 : c1;
      ctx.beginPath(); ctx.moveTo(tx - ww, yy); ctx.lineTo(tx + ww, yy); ctx.lineTo(tx, yy - 16 * s); ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(tx, ty - 16 * s, 11 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(tx - 3 * s, ty - 19 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
  }
}

function drawScenery(ctx, S, o, night) {
  const x = o.x, y = o.y, h = o.h, Z = view.cam.z;
  const d = SCENERY[o.type];
  if (d.tree) return drawTree(ctx, S, x, y, h, d.tree, o.id * 7 + x);
  const [cx, cy] = P(x + 0.5, y + 0.5, h);
  switch (o.type) {
    case 'trash': prism(ctx, x + 0.4, y + 0.4, x + 0.6, y + 0.6, h, h + 1.3, '#355E41'); break;
    case 'lamp': case 'sign': {
      ctx.fillStyle = '#222'; ctx.fillRect(cx - 1 * Z, cy - 30 * Z, 2 * Z, 30 * Z);
      if (o.type === 'lamp') { ctx.fillStyle = night ? '#FFF6E0' : '#D9D4CA'; ctx.beginPath(); ctx.arc(cx, cy - 31 * Z, 3.5 * Z, 0, 7); ctx.fill(); }
      else {
        ctx.fillStyle = night ? '#FF3B3B' : '#F26B5B';
        ctx.beginPath(); ctx.moveTo(cx - 12 * Z, cy - 34 * Z); ctx.lineTo(cx + 6 * Z, cy - 34 * Z); ctx.lineTo(cx + 13 * Z, cy - 29 * Z); ctx.lineTo(cx + 6 * Z, cy - 24 * Z); ctx.lineTo(cx - 12 * Z, cy - 24 * Z); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFF6E0'; ctx.font = `bold ${6 * Z}px system-ui,sans-serif`; ctx.textAlign = 'center'; if (Z >= 0.8) ctx.fillText('RIDES', cx - 2 * Z, cy - 27 * Z);
      }
      break;
    }
    case 'flowers': {
      for (let k = 0; k < 7; k++) { const [fx, fy] = P(x + 0.2 + hash2(o.id, k) * 0.6, y + 0.2 + hash2(k, o.id) * 0.6, h); ctx.fillStyle = ['#E26D8E', '#F4C542', '#FFF6E0', '#B5568F'][k % 4]; ctx.beginPath(); ctx.arc(fx, fy - 2 * Z, 2.2 * Z, 0, 7); ctx.fill(); }
      break;
    }
    case 'statue': prism(ctx, x + 0.3, y + 0.3, x + 0.7, y + 0.7, h, h + 0.8, '#8C877C'); ctx.fillStyle = '#3E3528'; ctx.beginPath(); ctx.ellipse(cx, cy - 16 * Z, 7 * Z, 9 * Z, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy - 27 * Z, 5 * Z, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx - 4 * Z, cy - 31 * Z, 2 * Z, 0, 7); ctx.arc(cx + 4 * Z, cy - 31 * Z, 2 * Z, 0, 7); ctx.fill(); break;
    case 'logs': for (let k = 0; k < 3; k++) cylH(ctx, x + 0.2, y + 0.35 + k * 0.1, h + 0.5 + (k === 1 ? 0.8 : 0), '#8B5A33'); break;
    case 'minecart': prism(ctx, x + 0.25, y + 0.3, x + 0.75, y + 0.7, h + 0.4, h + 1.6, '#5E4B3C'); prism(ctx, x + 0.3, y + 0.35, x + 0.7, y + 0.65, h + 1.6, h + 1.9, '#8C877C'); break;
    case 'fountain': {
      prism(ctx, x + 0.1, y + 0.1, x + 1.9, y + 1.9, h, h + 0.6, '#C8C3B6');
      poly(ctx, [P(x + 0.3, y + 0.3, h + 0.6), P(x + 1.7, y + 0.3, h + 0.6), P(x + 1.7, y + 1.7, h + 0.6), P(x + 0.3, y + 1.7, h + 0.6)], '#2A9D8F');
      const [fx, fy] = P(x + 1, y + 1, h + 0.6);
      const t = view.reduced ? 0 : view.t / 600;
      for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(255,255,255,${0.35 - k * 0.07})`; ctx.beginPath(); ctx.arc(fx + Math.sin(t + k) * 4 * Z, fy - (12 + k * 10 + (t * 6 % 10)) * Z, (6 + k * 3) * Z, 0, 7); ctx.fill(); }
      break;
    }
  }
}
function cylH(ctx, x, y, z, col) {
  const a = P(x, y, z), b = P(x + 0.6, y, z), Z = view.cam.z;
  ctx.strokeStyle = col; ctx.lineWidth = 5 * Z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineCap = 'butt';
}

function drawStall(ctx, S, o) {
  const x = o.x, y = o.y, h = o.h, Z = view.cam.z, d = STALLS[o.type];
  if (o.type === 'bench') {
    prism(ctx, x + 0.2, y + 0.4, x + 0.8, y + 0.6, h + 0.5, h + 0.75, '#9C7A55');
    prism(ctx, x + 0.2, y + 0.55, x + 0.8, y + 0.62, h + 0.75, h + 1.6, '#8B6A45');
    return;
  }
  if (o.type === 'restroom') {
    prism(ctx, x + 0.12, y + 0.12, x + 0.88, y + 0.88, h, h + 3, '#D9D4CA');
    prism(ctx, x + 0.05, y + 0.05, x + 0.95, y + 0.95, h + 3, h + 3.4, '#3FBFB5');
    const [sx, sy] = P(x + 0.5, y + 0.95, h + 1.8); ctx.fillStyle = '#1F2A24'; ctx.font = `bold ${8 * Z}px system-ui,sans-serif`; ctx.textAlign = 'center'; if (Z >= 0.6) ctx.fillText('WC', sx - 6 * Z, sy);
    return;
  }
  prism(ctx, x + 0.15, y + 0.15, x + 0.85, y + 0.85, h, h + 2.4, '#FFF6E0');
  // striped awning
  const a = P(x + 0.05, y + 0.05, h + 3.4), b = P(x + 0.95, y + 0.05, h + 3.4), c = P(x + 0.95, y + 0.95, h + 2.6), dd = P(x + 0.05, y + 0.95, h + 2.6);
  poly(ctx, [a, b, c, dd], d.color);
  for (let k = 1; k < 5; k += 2) {
    const t0 = k / 5, t1 = (k + 1) / 5;
    const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    poly(ctx, [lerp(a, b, t0), lerp(a, b, t1), lerp(dd, c, t1), lerp(dd, c, t0)], '#FFF6E0');
  }
  prism(ctx, x + 0.05, y + 0.85, x + 0.95, y + 0.95, h + 1.2, h + 1.5, sh(d.color, -0.2));
  const icon = { food: '🍴', snack: '🍩', drink: '🥤', merch: '★' }[d.need] || '';
  if (Z >= 0.75) { const [sx, sy] = P(x + 0.5, y + 0.5, h + 4.5); ctx.font = `${10 * Z}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText(icon, sx, sy); }
}

// ---- rides ---------------------------------------------------------------------------------
function angleOf(o, speed, dt) {
  let a = anim.get(o.id) || 0;
  if (o.phase === 'run' && !o.broken && !view.reduced) a += speed * dt;
  else if (o.phase === 'run' && !o.broken) a += speed * dt * 0.25;
  anim.set(o.id, a);
  return a;
}
function base(ctx, S, o, col) {
  const M = S.map, x = o.x, y = o.y, n = o.n, h = o.h;
  // footprint block faces down to the neighbours, then a plaza top
  for (let k = 0; k < n; k++) {
    const xr = x + n, yr = y + k;
    const hr = xr < M.w ? M.height[idx(S, xr, yr)] : -1;
    if (hr < h) poly(ctx, [P(xr, yr, h), P(xr, yr + 1, h), P(xr, yr + 1, hr), P(xr, yr, hr)], sh('#A08A6A', -0.15));
    const xb = x + k, yb = y + n;
    const hb = yb < M.h ? M.height[idx(S, xb, yb)] : -1;
    if (hb < h) poly(ctx, [P(xb, yb, h), P(xb + 1, yb, h), P(xb + 1, yb, hb), P(xb, yb, hb)], sh('#A08A6A', -0.32));
  }
  poly(ctx, [P(x, y, h), P(x + n, y, h), P(x + n, y + n, h), P(x, y + n, h)], col || '#D9D4CA');
}
function drawRide(ctx, S, o, dt, night) {
  const x = o.x, y = o.y, n = o.n, h = o.h, Z = view.cam.z;
  const d = RIDES[o.type];
  const cx = x + n / 2, cy = y + n / 2;
  const standing = o.status === 'standing';
  base(ctx, S, o, d.water ? '#C8C3B6' : standing ? '#B5AE9E' : '#D9D4CA');
  const col = standing ? '#9A968C' : d.color;
  const A = standing ? 0 : angleOf(o, 1, dt);
  switch (o.type) {
    case 'carousel': case 'swings': case 'planes': case 'cups': {
      const r = n * 0.38;
      cyl(ctx, cx, cy, r, h, h + 0.6, '#8B4A33');
      const top = o.type === 'swings' ? 7 : o.type === 'carousel' ? 4 : 2.5;
      ctx.fillStyle = '#5E4B3C'; const [px, py] = P(cx, cy, h); const [, pt] = P(cx, cy, h + top); ctx.fillRect(px - 2 * Z, pt, 4 * Z, py - pt);
      const k = o.type === 'cups' ? 4 : 8;
      for (let i = 0; i < k; i++) {
        const a = A * (o.type === 'cups' ? 0.05 : 0.03) + (i / k) * Math.PI * 2;
        const rr = o.type === 'swings' && o.phase === 'run' ? r * 1.25 : r * 0.8;
        const zz = o.type === 'swings' ? h + (o.phase === 'run' ? 4.2 : 1.6) : o.type === 'planes' ? h + 1.4 + Math.sin(A * 0.04 + i) * 0.6 : h + 1;
        const [sx, sy] = P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, zz);
        if (o.type === 'swings') { const [tx, ty] = P(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, h + top - 0.5); line(ctx, [tx, ty], [sx, sy], '#5E4B3C', 0.8); }
        ctx.fillStyle = i % 2 ? '#FFF6E0' : col;
        if (o.type === 'cups') { ctx.beginPath(); ctx.ellipse(sx, sy, 7 * Z, 4 * Z, 0, 0, 7); ctx.fill(); ctx.fillStyle = sh(col, -0.3); ctx.fillRect(sx - 6 * Z, sy, 12 * Z, 3 * Z); }
        else { ctx.beginPath(); ctx.ellipse(sx, sy, 4 * Z, 3 * Z, 0, 0, 7); ctx.fill(); }
      }
      // canopy
      const [ax, ay] = P(cx, cy, h + top);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(ax, ay, r * TW * 0.75 * Z, r * TH * 0.75 * Z, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF6E0';
      for (let i = 0; i < 8; i += 2) { const a0 = (i / 8) * Math.PI * 2 + A * 0.01, a1 = ((i + 1) / 8) * Math.PI * 2 + A * 0.01; ctx.beginPath(); ctx.moveTo(ax, ay - 8 * Z); ctx.ellipse(ax, ay, r * TW * 0.75 * Z, r * TH * 0.75 * Z, 0, a0, a1); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = sh(col, -0.2); ctx.beginPath(); ctx.moveTo(ax - 6 * Z, ay); ctx.lineTo(ax, ay - 14 * Z); ctx.lineTo(ax + 6 * Z, ay); ctx.fill();
      break;
    }
    case 'wheel': {
      const [hx, hy] = P(cx, cy, h + 9);
      const R = 7.5 * LV * Z;
      line(ctx, P(cx - 0.9, cy + 0.9, h), [hx, hy], '#5E4B3C', 3); line(ctx, P(cx + 0.9, cy - 0.9, h), [hx, hy], '#5E4B3C', 3);
      ctx.strokeStyle = col; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.ellipse(hx, hy, R * 0.72, R, 0, 0, 7); ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = A * 0.012 + (i / 10) * Math.PI * 2;
        const gx = hx + Math.cos(a) * R * 0.72, gy = hy + Math.sin(a) * R;
        line(ctx, [hx, hy], [gx, gy], 'rgba(60,40,30,0.6)', 1);
        ctx.fillStyle = i % 2 ? '#F4C542' : '#3FBFB5'; ctx.fillRect(gx - 4 * Z, gy, 8 * Z, 6 * Z);
      }
      break;
    }
    case 'tower': {
      const top = 22;
      for (let k = 0; k < top; k += 2) { const [l1x, l1y] = P(cx - 0.3, cy + 0.3, h + k), [r1x, r1y] = P(cx + 0.3, cy - 0.3, h + k + 2); line(ctx, [l1x, l1y], [r1x, r1y], '#8C877C', 1); }
      prism(ctx, cx - 0.25, cy - 0.25, cx + 0.25, cy + 0.25, h, h + top, '#9C7A55');
      const z = h + 2 + (o.phase === 'run' ? (1 - Math.abs(((A * 0.01) % 2) - 1)) * (top - 6) : 0);
      cyl(ctx, cx, cy, 0.7, z, z + 2, col);
      prism(ctx, cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, h + top, h + top + 1.5, '#F26B5B');
      break;
    }
    case 'bumper': {
      prism(ctx, x + 0.15, y + 0.15, x + n - 0.15, y + n - 0.15, h, h + 4, '#B23A2A');
      const a = P(x + 0.05, y + n / 2, h + 7), b = P(x + n - 0.05, y + n / 2, h + 7);
      poly(ctx, [P(x + 0.05, y + 0.05, h + 4), P(x + n - 0.05, y + 0.05, h + 4), b, a], '#8C877C');
      poly(ctx, [a, b, P(x + n - 0.05, y + n - 0.05, h + 4), P(x + 0.05, y + n - 0.05, h + 4)], '#6E6A62');
      const [sx, sy] = P(x + n / 2, y + n - 0.1, h + 2.2);
      ctx.fillStyle = '#FFF6E0'; ctx.font = `bold ${8 * Z}px system-ui,sans-serif`; ctx.textAlign = 'center'; if (Z >= 0.6) ctx.fillText('BUMPER', sx - 10 * Z, sy);
      break;
    }
    case 'ship': {
      const [px, py] = P(cx, cy, h + 8);
      line(ctx, P(cx - 1, cy + 1, h), [px, py], '#5E4B3C', 3); line(ctx, P(cx + 1, cy - 1, h), [px, py], '#5E4B3C', 3);
      const sw = o.phase === 'run' ? Math.sin(A * 0.05) * 0.9 : 0;
      const bx = px + Math.sin(sw) * 40 * Z, by = py + Math.cos(sw) * 40 * Z;
      line(ctx, [px, py], [bx, by], '#5E4B3C', 2);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-sw * 0.6);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-26 * Z, -4 * Z); ctx.quadraticCurveTo(0, 14 * Z, 26 * Z, -4 * Z); ctx.lineTo(22 * Z, -8 * Z); ctx.lineTo(-22 * Z, -8 * Z); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFF6E0'; ctx.fillRect(-20 * Z, -8 * Z, 40 * Z, 2 * Z);
      ctx.restore();
      break;
    }
    case 'boom': {
      prism(ctx, cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, h, h + 10, '#5E4B3C');
      const [px, py] = P(cx, cy, h + 10);
      const a = A * 0.03, L = 48 * Z;
      const e1 = [px + Math.cos(a) * L, py + Math.sin(a) * L], e2 = [px - Math.cos(a) * L, py - Math.sin(a) * L];
      line(ctx, e1, e2, col, 4);
      ctx.fillStyle = '#F26B5B'; ctx.beginPath(); ctx.arc(e1[0], e1[1], 6 * Z, 0, 7); ctx.fill();
      ctx.fillStyle = '#8C877C'; ctx.beginPath(); ctx.arc(e2[0], e2[1], 5 * Z, 0, 7); ctx.fill();
      break;
    }
    case 'drop': {
      const top = 26;
      prism(ctx, cx - 0.22, cy - 0.22, cx + 0.22, cy + 0.22, h, h + top, '#EDEAE2');
      const cyc = (A * 0.004) % 1;
      const z = o.phase === 'run' ? h + 1 + (cyc < 0.7 ? cyc / 0.7 : 1 - (cyc - 0.7) / 0.3 * 1.0) * (top - 4) : h + 1;
      prism(ctx, cx - 0.45, cy - 0.45, cx + 0.45, cy + 0.45, z, z + 1.4, col);
      prism(ctx, cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, h + top, h + top + 1, '#F26B5B');
      break;
    }
    case 'sky': {
      line(ctx, P(x + 0.2, y + 0.2, h), P(x + 0.2, y + 0.2, h + 20), '#5E4B3C', 3);
      line(ctx, P(x + 1.8, y + 1.8, h), P(x + 1.8, y + 1.8, h + 20), '#5E4B3C', 3);
      const top = P(cx, cy, h + 20); line(ctx, P(x + 0.2, y + 0.2, h + 20), P(x + 1.8, y + 1.8, h + 20), '#5E4B3C', 2);
      const sw = o.phase === 'run' ? Math.sin(A * 0.06) * 1.1 : 0.9;
      const rx = top[0] + Math.sin(sw) * 70 * Z, ry = top[1] + Math.cos(sw) * 70 * Z;
      line(ctx, top, [rx, ry], '#222', 1); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(rx, ry, 5 * Z, 0, 7); ctx.fill();
      break;
    }
    case 'wave': case 'splash': case 'complex': case 'river': case 'racer': case 'surf': case 'slides': drawWater(ctx, S, o, A, col); break;
  }
  if (standing && Z >= 0.6) {
    const [sx, sy] = P(cx, cy, h + 3);
    ctx.fillStyle = 'rgba(31,42,36,0.75)'; ctx.fillRect(sx - 30 * Z, sy - 8 * Z, 60 * Z, 13 * Z);
    ctx.fillStyle = '#EDE3C8'; ctx.font = `${7 * Z}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText('STANDING · CLOSED', sx, sy + 1 * Z);
  }
  void night;
}
function drawWater(ctx, S, o, A, col) {
  const x = o.x, y = o.y, n = o.n, h = o.h, Z = view.cam.z;
  const closed = o.cal === false || o.status === 'standing';
  const water = closed ? '#7FA8B0' : '#4FB3C8';
  const inset = (e, z) => [P(x + e, y + e, z), P(x + n - e, y + e, z), P(x + n - e, y + n - e, z), P(x + e, y + n - e, z)];
  if (o.type === 'river') {
    poly(ctx, inset(0.2, h + 0.1), water);
    poly(ctx, inset(1.2, h + 0.1), '#5C8A3A');
    drawTree(ctx, S, x + n / 2 - 0.5, y + n / 2 - 0.5, h, 2, o.id);
  } else poly(ctx, inset(0.25, h + 0.1), water);
  if (!closed && !view.reduced) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2 * Z;
    for (let k = 0; k < 3; k++) { const t = ((A * 0.01 + k / 3) % 1); const a = P(x + 0.4, y + 0.4 + t * (n - 0.8), h + 0.1), b = P(x + n - 0.4, y + 0.4 + t * (n - 0.8), h + 0.1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  if (o.type === 'slides' || o.type === 'complex' || o.type === 'racer') {
    const tz = o.type === 'racer' ? 7 : 12;
    prism(ctx, x + 0.2, y + 0.2, x + 0.9, y + 0.9, h, h + tz, '#C8C3B6');
    const cols = ['#F26B5B', '#F4C542', '#3FBFB5', '#E26D8E'];
    const lanes = o.type === 'racer' ? 4 : 3;
    for (let k = 0; k < lanes; k++) {
      ctx.strokeStyle = cols[k]; ctx.lineWidth = 4 * Z; ctx.beginPath();
      for (let s = 0; s <= 12; s++) {
        const t = s / 12;
        const px = o.type === 'racer' ? x + 0.6 + k * 0.4 : x + 0.6 + (n - 1) * t + Math.sin(t * 6 + k) * 0.4;
        const py = o.type === 'racer' ? y + 0.7 + (n - 1) * t : y + 0.6 + (n - 1.2) * t * (0.5 + k * 0.25);
        const [sx, sy] = P(px, py, h + tz - (tz - 0.5) * t);
        if (s === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  }
  if (o.type === 'surf') prism(ctx, x + 0.4, y + 0.4, x + n - 0.4, y + 1, h, h + 2, '#1E4E79');
  if (o.type === 'splash') {
    prism(ctx, x + 1, y + 1, x + n - 1, y + n - 1, h, h + 6, '#F2A541');
    prism(ctx, x + 0.9, y + 0.9, x + n - 0.9, y + n - 0.9, h + 6, h + 6.6, '#3FBFB5');
    cyl(ctx, x + n / 2, y + n / 2, 0.5, h + 7, h + 9, '#F4C542');
  }
  if (o.type === 'wave') prism(ctx, x + 0.1, y + 0.1, x + n - 0.1, y + 0.5, h, h + 2.5, '#9C7A55');
  void col;
}

function drawAmphi(ctx, S, o, night) {
  const x = o.x, y = o.y, n = o.n, h = o.h, Z = view.cam.z;
  base(ctx, S, o, '#6E9A45');
  for (let r = 0; r < 4; r++) prism(ctx, x + 0.3 + r * 0.55, y + 0.3, x + 0.6 + r * 0.55, y + n - 0.3, h, h + 0.4 + r * 0.25, '#9C7A55');
  prism(ctx, x + n - 1.1, y + 0.4, x + n - 0.3, y + n - 0.4, h, h + 1.2, '#5E4B3C');
  // band shell
  const a = P(x + n - 0.3, y + 0.3, h + 1.2), b = P(x + n - 0.3, y + n - 0.3, h + 1.2), top = P(x + n - 0.3, y + n / 2, h + 8);
  ctx.fillStyle = '#EDE3C8'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(top[0] + 10 * Z, top[1] - 20 * Z, b[0], b[1]); ctx.closePath(); ctx.fill();
  const show = S.park.concert && S.park.concert.month === S.month && S.dow === 5 && S.time >= 950 && S.time < 1150;
  if (show && !view.reduced) {
    for (let k = 0; k < 3; k++) { const [lx, ly] = P(x + n - 0.7, y + 0.8 + k * 1.1, h + 2); ctx.fillStyle = ['#FF3B3B', '#4FC3FF', '#F4C542'][k]; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(view.t / 150 + k); ctx.beginPath(); ctx.arc(lx, ly, 4 * Z, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  }
  void night;
}

// ---- track ----------------------------------------------------------------------------------
function drawTrackCell(ctx, S, o, k, c, night) {
  const T = TRACKS[o.type], Z = view.cam.z, M = S.map;
  const g = M.height[idx(S, c.x, c.y)];
  const prev = o.cells[(k - 1 + o.cells.length) % o.cells.length], nxt = o.cells[(k + 1) % o.cells.length];
  const failed = o.status === 'testfail' && o.failAt === k;
  const support = T.wood ? '#8B5A33' : T.flume ? '#9C7A55' : '#EDEAE2';
  const cx = c.x + 0.5, cy = c.y + 0.5;
  if (c.h > g) {
    const legs = T.wood ? [[0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]] : [[0.5, 0.5]];
    for (const [lx, ly] of legs) line(ctx, P(c.x + lx, c.y + ly, g), P(c.x + lx, c.y + ly, c.h), support, T.wood ? 1.5 : 2.5);
    if (T.wood || c.h - g > 2) for (let z = g + 1; z < c.h; z += 1.5) line(ctx, P(c.x + 0.25, c.y + 0.25, z), P(c.x + 0.75, c.y + 0.75, z + 1), support, 1);
  }
  // rails: from the edge shared with prev to the edge shared with next, through the centre
  const ein = [(prev.x + c.x) / 2 + 0.5, (prev.y + c.y) / 2 + 0.5, (prev.h + c.h) / 2];
  const eout = [(nxt.x + c.x) / 2 + 0.5, (nxt.y + c.y) / 2 + 0.5, (nxt.h + c.h) / 2];
  const isStation = k < 3;
  const pts = [P(ein[0], ein[1], ein[2] + 0.6), P(cx, cy, c.h + 0.6), P(eout[0], eout[1], eout[2] + 0.6)];
  const rail = failed ? '#FF3B3B' : T.flume ? '#5B4632' : T.color;
  if (T.flume) {
    ctx.strokeStyle = rail; ctx.lineWidth = 9 * Z; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.stroke();
    ctx.strokeStyle = '#4FB3C8'; ctx.lineWidth = 5 * Z; ctx.stroke();
  } else {
    ctx.strokeStyle = sh(rail, -0.3); ctx.lineWidth = 6 * Z; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.stroke();
    ctx.strokeStyle = rail; ctx.lineWidth = 3 * Z; ctx.stroke();
    if (c.lift) { ctx.strokeStyle = '#222'; ctx.setLineDash([2 * Z, 2 * Z]); ctx.lineWidth = 1 * Z; ctx.stroke(); ctx.setLineDash([]); }
  }
  if (isStation) {
    prism(ctx, c.x + 0.05, c.y + 0.05, c.x + 0.95, c.y + 0.95, c.h, c.h + 0.4, '#D9D4CA');
    if (k === 1) prism(ctx, c.x + 0.1, c.y + 0.1, c.x + 0.9, c.y + 0.9, c.h + 3.4, c.h + 3.8, T.color);
  }
  // train cars on this cell (positions computed once per frame per track)
  let cars = trainCache.get(o.id);
  if (!cars || cars.f !== frameNo) { cars = trainCars(o); cars.f = frameNo; trainCache.set(o.id, cars); }
  for (const car of cars) if (car.k === k) {
    const t = car.f;
    const px = ein[0] + (eout[0] - ein[0]) * t, py = ein[1] + (eout[1] - ein[1]) * t, pz = ein[2] + (eout[2] - ein[2]) * t;
    const [sx, sy] = P(px, py, pz + 1.1);
    ctx.fillStyle = T.flume ? '#8B5A33' : '#F4C542';
    ctx.beginPath(); ctx.ellipse(sx, sy, 7 * Z, 4.5 * Z, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#F4E3C8'; ctx.beginPath(); ctx.arc(sx - 2 * Z, sy - 4 * Z, 1.8 * Z, 0, 7); ctx.arc(sx + 2.5 * Z, sy - 4 * Z, 1.8 * Z, 0, 7); ctx.fill();
  }
  void night;
}
const trainCache = new Map();
let frameNo = 0;
function trainCars(o) {
  if (!o.prof || o.status === 'building' || o.status === 'testfail') return [];
  const n = o.cells.length, nc = Math.min(4, Math.max(2, Math.round(o.seats / 4)));
  let p;
  if (o.phase === 'run') p = 1 - (o.timer - view.frac) / Math.max(1, o.cycle);
  else p = 0.04;
  if (view.testRun && view.testRun.id === o.id) p = view.testRun.p;
  const out = [];
  for (let c = 0; c < nc; c++) {
    let q = (p - c * 0.012 + 1) % 1;
    let k = 0;
    while (k + 1 < n && o.prof[k + 1] <= q) k++;
    const t0 = o.prof[k], t1 = k + 1 < n ? o.prof[k + 1] : 1;
    out.push({ k, f: Math.max(0, Math.min(1, (q - t0) / Math.max(1e-6, t1 - t0))) });
  }
  return out;
}

// ---- people --------------------------------------------------------------------------------
const SHIRTS = ['#F26B5B', '#3FBFB5', '#F4C542', '#E26D8E', '#4C8FA8', '#FFF6E0', '#7FA05A', '#B5568F'];
const SKIN = ['#F1C9A5', '#D9A27C', '#A86F4C', '#7A4E33'];
function drawPerson(ctx, x, y, z, kind, col, id, frame, staffRole) {
  const [sx, sy] = P(x, y, z);
  blit(ctx, sprite('p' + kind + col + (id & 3) + frame + (staffRole || ''), 20, 30, 10, 28, (g, ox, oy, Z) => personArt(g, ox, oy, Z, kind, col, id, frame, staffRole)), sx, sy);
}
function personArt(ctx, sx, sy, Z, kind, col, id, frame, staffRole) {
  const s = (kind === 0 ? 0.72 : kind === 3 ? 0.95 : 1) * Z;
  const legH = 5 * s, bodyH = 6 * s, headR = 2.3 * s;
  ctx.fillStyle = '#34424A';
  const sw = frame ? 1.2 * s : 0;
  ctx.fillRect(sx - 2 * s - sw * 0.3, sy - legH, 1.6 * s, legH);
  ctx.fillRect(sx + 0.4 * s + sw * 0.3, sy - legH, 1.6 * s, legH);
  ctx.fillStyle = staffRole === 'keeper' ? '#355E41' : staffRole === 'mechanic' ? '#1E4E79' : col;
  ctx.fillRect(sx - 2.6 * s, sy - legH - bodyH, 5.2 * s, bodyH);
  if (staffRole === 'mascot') {
    ctx.fillStyle = '#6B4A2E'; ctx.beginPath(); ctx.ellipse(sx, sy - legH - bodyH * 0.5, 4.5 * s, 6 * s, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy - legH - bodyH - 3.5 * s, 4 * s, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(sx - 3 * s, sy - legH - bodyH - 6.5 * s, 1.6 * s, 0, 7); ctx.arc(sx + 3 * s, sy - legH - bodyH - 6.5 * s, 1.6 * s, 0, 7); ctx.fill();
    return;
  }
  ctx.fillStyle = SKIN[id & 3];
  ctx.beginPath(); ctx.arc(sx, sy - legH - bodyH - headR, headR, 0, 7); ctx.fill();
  if (staffRole) { ctx.fillStyle = '#F4C542'; ctx.fillRect(sx - 2.6 * s, sy - legH - bodyH - headR * 2 - 0.5 * s, 5.2 * s, 1.6 * s); }
}

// ---- frame -------------------------------------------------------------------------------
export function isNight(S) { return S.time >= 900; }
export function nightAlpha(S) { return S.time < 850 ? 0 : Math.min(0.55, (S.time - 850) / 250 * 0.55); }

// ---- cached ground layer --------------------------------------------------------------------
// Terrain and paths are drawn once into an offscreen layer a margin larger than the screen and
// blitted every frame. Tiles that stand higher than a tile behind them ("occluders") are drawn
// again in painter order, so guests and rides behind a ridge stay hidden behind it.
const ground = { cv: null, ctx: null, key: '', cx: 0, cy: 0, mx: 0, my: 0, occl: null };
// Each state object gets its own id, so a new or loaded park never reuses another park's ground.
let groundIds = 0;
function groundKey(S) { if (!S._gid) S._gid = ++groundIds; return [S._gid, view.cam.z, view.dpr, view.W, view.H, S._netVer || 0, S.month, view.grid ? 1 : 0, S.map.w, nightAlpha(S) > 0.3 ? 1 : 0].join('|'); }
function ensureGround(S) {
  const c = view.cam, key = groundKey(S);
  const dx = (c.x - ground.cx) * c.z, dy = (c.y - ground.cy) * c.z;
  if (ground.cv && key === ground.key && Math.abs(dx) < ground.mx && Math.abs(dy) < ground.my) return;
  const W = view.W, H = view.H, d = view.dpr;
  ground.mx = Math.round(W * 0.25); ground.my = Math.round(H * 0.25);
  const cw = Math.ceil((W + 2 * ground.mx) * d), ch = Math.ceil((H + 2 * ground.my) * d);
  if (!ground.cv || ground.cv.width !== cw || ground.cv.height !== ch) {
    ground.cv = Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    ground.ctx = ground.cv.getContext('2d');
  }
  ground.key = key; ground.cx = c.x; ground.cy = c.y;
  const g = ground.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, ch), dark = nightAlpha(S) > 0.3;
  sky.addColorStop(0, dark ? '#14121F' : '#8FD0E8'); sky.addColorStop(1, dark ? '#1F1C2E' : '#CFE8EE');
  g.fillStyle = sky; g.fillRect(0, 0, cw, ch);
  g.setTransform(d, 0, 0, d, 0, 0);
  const M = S.map, w = M.w, h = M.h;
  const saveOx = view.ox, saveOy = view.oy;
  view.ox += ground.mx; view.oy += ground.my;
  const big = bigFootprints(S);
  ground.occl = new Uint8Array(w * h);
  const Z = c.z, Wc = W + 2 * ground.mx, Hc = H + 2 * ground.my;
  for (let dd = 0; dd <= w + h - 2; dd++) {
    for (let x = Math.max(0, dd - h + 1); x <= Math.min(w - 1, dd); x++) {
      const y = dd - x, i = y * w + x, ht = M.height[i];
      const hb = Math.max(x > 0 ? M.height[i - 1] : 0, y > 0 ? M.height[i - w] : 0, x > 0 && y > 0 ? M.height[i - w - 1] : 0);
      if (ht > hb && nearStuff(M, x, y, w)) ground.occl[i] = 1;
      // a tree in front of anything that moves or gets built is redrawn in painter order too
      if (M.tree[i] && !M.occ[i]) {
        for (const [ax, ay] of [[1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1], [1, 2]]) {
          const X = x - ax, Y = y - ay;
          if (X < 0 || Y < 0) continue;
          const j = Y * w + X;
          if (M.path[j] || M.occ[j]) { ground.occl[i] |= 2; break; }
        }
      }
      const [sx, sy] = P(x + 0.5, y + 0.5, 0);
      if (sx < -TW * Z || sx > Wc + TW * Z || sy < -TH * Z || sy > Hc + (MAXDROP + 2) * LV * Z) continue;
      if (big[i]) continue;
      terrainTile(g, S, x, y, i);
      if (M.path[i]) pathTile(g, S, x, y, i);
      if (M.tree[i] && !M.occ[i]) drawTree(g, S, x, y, ht, M.tree[i], i);
    }
  }
  view.ox = saveOx; view.oy = saveOy;
}
const MAXDROP = 12;
// Anything that can stand behind tile (x, y) within three tiles: a path, a ride, a stall, a track.
function nearStuff(M, x, y, w) {
  for (let ay = 0; ay <= 3; ay++) for (let ax = 0; ax <= 3; ax++) {
    if (!ax && !ay) continue;
    const X = x - ax, Y = y - ay;
    if (X < 0 || Y < 0) continue;
    const j = Y * w + X;
    if (M.path[j] || M.occ[j]) return true;
  }
  return false;
}
function bigFootprints(S) {
  const M = S.map, out = new Uint8Array(M.w * M.h);
  for (const o of S.objects) if (!o.cells && o.n > 1) for (let y = o.y; y < o.y + o.n; y++) for (let x = o.x; x < o.x + o.n; x++) out[y * M.w + x] = 1;
  return out;
}

export function render(ctx, S, dt) {
  view.t += dt; frameNo++;
  updateOrigin();
  if (view.g3) return render3(ctx, S, dt);
  const { W, H } = view, M = S.map, w = M.w, h = M.h;
  const na = nightAlpha(S);
  const night = na > 0.2;
  if (view.dbg.noTerrain) { ctx.fillStyle = '#8FD0E8'; ctx.fillRect(0, 0, W, H); } else {
    ensureGround(S);
    const c = view.cam, ox = ground.mx + (c.x - ground.cx) * c.z, oy = ground.my + (c.y - ground.cy) * c.z, d = view.dpr;
    ctx.drawImage(ground.cv, ox * d, oy * d, W * d, H * d, 0, 0, W, H);
  }
  // bucket guests and staff by tile
  const buckets = new Map();
  const queueAt = new Map();
  const push = (i, it) => { let b = buckets.get(i); if (!b) buckets.set(i, (b = [])); b.push(it); };
  for (const gg of S.guests) {
    if (gg.st === 'ride' || gg.st === 'gone') continue;
    if (gg.st === 'queue') { const n = (queueAt.get(gg.ti) || 0); queueAt.set(gg.ti, n + 1); if (n < 10) push(gg.ti, { g: gg, q: n }); continue; }
    push(gg.ti, { g: gg });
  }
  for (const st of S.staff) if (!atSchool(S, st)) push(st.ti, { s: st });
  // objects by anchor
  const big = new Map(), small = new Map(), cellsAt = new Map();
  for (const o of S.objects) {
    if (o.cells) { o.cells.forEach((c, k) => cellsAt.set(c.y * w + c.x, [o, k, c])); continue; }
    if (o.n > 1) { const d = o.x + o.y + o.n - 2; let b = big.get(d); if (!b) big.set(d, (b = [])); b.push(o); }
    else small.set(o.y * w + o.x, o);
  }
  const Z = view.cam.z, margin = 120 * Z;
  const frameOdd = ((view.t / 160) | 0) & 1;
  for (let d = 0; d <= w + h - 2; d++) {
    for (let x = Math.max(0, d - h + 1); x <= Math.min(w - 1, d); x++) {
      const y = d - x, i = y * w + x;
      // cull by the tile's screen box (tall stuff extends upward)
      const [sx, sy] = P(x + 0.5, y + 0.5, 0);
      if (sx < -TW * Z - margin || sx > W + TW * Z + margin || sy < -margin || sy > H + 260 * Z + margin) continue;
      const occ = M.occ[i];
      const ob = occ ? (small.get(i) || null) : null;
      const bigHere = occ && !ob && !cellsAt.has(i);
      const oc = ground.occl ? ground.occl[i] : 3;
      if ((oc & 1) && !bigHere && !view.dbg.noTerrain) { terrainTile(ctx, S, x, y, i); if (M.path[i]) pathTile(ctx, S, x, y, i); }
      if (M.path[i]) pathDyn(ctx, S, x, y, i);
      if (M.tree[i] && !occ && (oc || view.dbg.noTerrain)) drawTree(ctx, S, x, y, M.height[i], M.tree[i], i);
      const cell = cellsAt.get(i);
      if (cell) drawTrackCell(ctx, S, cell[0], cell[1], cell[2], night);
      if (ob) { if (ob.kind === 'stall') drawStall(ctx, S, ob); else drawScenery(ctx, S, ob, night); }
      const b = view.dbg.noGuests ? null : buckets.get(i);
      if (b) for (const it of b) {
        if (it.s) { const st = it.s; drawPerson(ctx, st.x, st.y, st.z, 2, '#000', st.id, frameOdd, st.role); continue; }
        const gg = it.g;
        let px = gg.x, py = gg.y;
        if (it.q != null) { px = x + 0.2 + (it.q % 5) * 0.15; py = y + 0.3 + Math.floor(it.q / 5) * 0.4; }
        else { px += (hash2(gg.id, 1) - 0.5) * 0.5; py += (hash2(gg.id, 2) - 0.5) * 0.5; }
        drawPerson(ctx, px, py, gg.z, gg.k, SHIRTS[gg.c], gg.id, gg.to >= 0 ? frameOdd ^ (gg.id & 1) : 0);
        if (view.sel && view.sel.kind === 'guest' && view.sel.id === gg.id) {
          const [hx, hy] = P(px, py, gg.z); ctx.strokeStyle = '#F4C542'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx, hy, 9 * Z, 5 * Z, 0, 0, 7); ctx.stroke();
          ctx.fillStyle = '#F4C542'; ctx.beginPath(); ctx.moveTo(hx, hy - 22 * Z); ctx.lineTo(hx - 5 * Z, hy - 30 * Z); ctx.lineTo(hx + 5 * Z, hy - 30 * Z); ctx.fill();
        }
      }
      const q = queueAt.get(i);
      if (q > 10 && Z >= 0.6) { const [qx, qy] = P(x + 0.5, y + 0.5, M.height[i]); badge(ctx, qx, qy - 26 * Z, '+' + (q - 10), '#34424A'); }
    }
    const bl = big.get(d);
    if (bl) for (const o of bl) {
      if (o.kind === 'ride') drawRide(ctx, S, o, dt, night);
      else if (o.kind === 'special') drawAmphi(ctx, S, o, night);
      else if (o.kind === 'scenery') { base(ctx, S, o, '#C8C3B6'); drawScenery(ctx, S, o, night); }
    }
  }
  // overlays on top: status badges, selection, ghosts
  for (const o of S.objects) overlayBadges(ctx, S, o);
  if (view.sel && view.sel.kind === 'obj') { const o = S.objects.find((x) => x.id === view.sel.id); if (o) outline(ctx, S, o, '#F4C542'); }
  drawGhost(ctx, S);
  // night tint and lights
  if (na > 0) {
    ctx.fillStyle = `rgba(10,12,40,${na})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const o of S.objects) {
      let col = null, r = 40;
      if (o.kind === 'scenery' && SCENERY[o.type].lamp) col = o.type === 'sign' ? 'rgba(255,59,59,' : 'rgba(255,240,200,';
      else if ((o.kind === 'ride' || o.kind === 'track') && rideOpen(S, o)) { col = 'rgba(79,195,255,'; r = 30 + o.n * 14; }
      else if (o.kind === 'stall' && o.type !== 'bench') { col = 'rgba(244,197,66,'; r = 26; }
      else if (o.type === 'amphi') { col = 'rgba(255,59,59,'; r = 80; }
      if (!col) continue;
      const cx = o.cells ? o.cells[1].x + 0.5 : o.x + o.n / 2, cy = o.cells ? o.cells[1].y + 0.5 : o.y + o.n / 2;
      const [sx, sy] = P(cx, cy, o.h + 3);
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * Z);
      gr.addColorStop(0, col + (na * 0.9).toFixed(2) + ')'); gr.addColorStop(1, col + '0)');
      ctx.fillStyle = gr; ctx.fillRect(sx - r * Z, sy - r * Z, 2 * r * Z, 2 * r * Z);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // rain and storm
  const wk = S.weather.kind;
  if ((wk === 'rain' || wk === 'storm') && !view.noFx) {
    ctx.strokeStyle = 'rgba(200,220,235,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath();
    const n = view.reduced ? 60 : 160, off = view.reduced ? 0 : view.t;
    for (let k = 0; k < n; k++) {
      const rx = (hash2(k, 1) * W + off * 0.05 * (1 + hash2(k, 3))) % W, ry = (hash2(k, 2) * H + off * 0.6 * (0.8 + hash2(k, 4))) % H;
      ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 11);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(60,70,80,0.18)'; ctx.fillRect(0, 0, W, H);
    const stormNow = wk === 'storm' && S.time >= S.weather.storm[0] && S.time < S.weather.storm[1];
    if (stormNow && !view.reduced && (view.t % 4000) < 90) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, W, H); }
  }
}

// 3D view: the WebGL canvas below draws the world; this 2D canvas on top keeps the status pins, the selection,
// the build ghost and queue counts, all placed with P() through the 3D camera.
function render3(ctx, S, dt) {
  const { W, H } = view, Z = view.cam.z;
  ctx.clearRect(0, 0, W, H);
  view.g3.draw(S, dt);
  const queueAt = new Map();
  for (const gg of S.guests) if (gg.st === 'queue') queueAt.set(gg.ti, (queueAt.get(gg.ti) || 0) + 1);
  const w = S.map.w;
  if (Z >= 0.6) for (const [i, q] of queueAt) if (q > 16) { const [qx, qy] = P(i % w + 0.5, Math.floor(i / w) + 0.5, S.map.height[i]); badge(ctx, qx, qy - 26 * Z, '👥 +' + (q - 16) + ' in line', '#34424A'); }
  for (const o of S.objects) overlayBadges(ctx, S, o, true);
  if (view.sel && view.sel.kind === 'obj') { const o = S.objects.find((x) => x.id === view.sel.id); if (o) outline(ctx, S, o, '#F4C542'); }
  if (view.sel && view.sel.kind === 'guest') {
    const gg = S.guests.find((g) => g.id === view.sel.id);
    if (gg && gg.st !== 'ride') {
      const px = gg.x + (hash2(gg.id, 1) - 0.5) * 0.5, py = gg.y + (hash2(gg.id, 2) - 0.5) * 0.5;
      const [hx, hy] = P(px, py, gg.z); const [, ty] = P(px, py, gg.z + 2.2);
      ctx.strokeStyle = '#F4C542'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx, hy, 9 * Z, 5 * Z, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#F4C542'; ctx.strokeStyle = '#1F2A24'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx, ty - 2 * Z); ctx.lineTo(hx - 6 * Z, ty - 12 * Z); ctx.lineTo(hx + 6 * Z, ty - 12 * Z); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  drawGhost(ctx, S);
}

const badgeW = new Map();
function badge(ctx, x, y, text, bg) {
  const Z = Math.max(0.8, view.cam.z);
  ctx.font = `bold ${10 * Z}px system-ui,sans-serif`;
  const wk = text + Z;
  let w = badgeW.get(wk);
  if (w == null) { w = ctx.measureText(text).width + 8 * Z; badgeW.set(wk, w); }
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 8 * Z, w, 15 * Z, 4 * Z) : ctx.rect(x - w / 2, y - 8 * Z, w, 15 * Z); ctx.fill();
  ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); ctx.textBaseline = 'alphabetic';
}
function overlayBadges(ctx, S, o, pins) {
  if (o.kind !== 'ride' && o.kind !== 'track' && o.kind !== 'stall' && o.kind !== 'special') return;
  if (o.kind === 'stall' && o.type === 'bench') return;
  const cx = o.cells ? o.cells[1].x + 0.5 : o.x + o.n / 2, cy = o.cells ? o.cells[1].y + 0.5 : o.y + o.n / 2;
  const [sx, sy] = P(cx, cy, o.h + (o.n > 1 ? 7 : 5));
  if (o.entry < 0 && o.status !== 'building') badge(ctx, sx, sy, '⚠ No path', '#9A2A1C');
  else if (o.broken) badge(ctx, sx, sy, '🔧 Broken', '#9A2A1C');
  else if (o.status === 'testfail') badge(ctx, sx, sy, '✖ Test failed', '#9A2A1C');
  else if (o.status === 'closed') badge(ctx, sx, sy, '⛔ Closed', '#574A37');
  // weather and season closures are not the player's to fix: in 3D they are small icon pins (the HUD names the weather)
  // weather and season closures are not the player's to fix: the 3D view leaves them to the HUD and the ride window
  else if (o.wx && !pins && view.sel && view.sel.id === o.id) badge(ctx, sx, sy, '⚡ Storm', '#34424A');
  else if (o.cal === false && o.status !== 'standing' && !pins) badge(ctx, sx, sy, '☂ Closed (season)', '#34424A');
}
function outline(ctx, S, o, col) {
  ctx.lineWidth = 2; ctx.strokeStyle = col;
  if (o.cells) { for (const c of o.cells) poly(ctx, [P(c.x, c.y, c.h), P(c.x + 1, c.y, c.h), P(c.x + 1, c.y + 1, c.h), P(c.x, c.y + 1, c.h)], null, col); return; }
  poly(ctx, [P(o.x, o.y, o.h), P(o.x + o.n, o.y, o.h), P(o.x + o.n, o.y + o.n, o.h), P(o.x, o.y + o.n, o.h)], null, col);
  if (o.entry >= 0) { const ex = o.entry % S.map.w, ey = Math.floor(o.entry / S.map.w), eh = S.map.height[o.entry]; poly(ctx, [P(ex + 0.3, ey + 0.3, eh), P(ex + 0.7, ey + 0.3, eh), P(ex + 0.7, ey + 0.7, eh), P(ex + 0.3, ey + 0.7, eh)], 'rgba(244,197,66,0.6)'); }
}
function drawGhost(ctx, S) {
  const G = view.ghost;
  if (!G) return;
  ctx.lineWidth = 2;
  for (const t of G.tiles || []) {
    const [x, y] = t, h = t[2] != null ? t[2] : S.map.height[idx(S, x, y)];
    poly(ctx, [P(x, y, h), P(x + 1, y, h), P(x + 1, y + 1, h), P(x, y + 1, h)], G.ok ? 'rgba(63,191,181,0.45)' : 'rgba(210,59,47,0.45)', G.ok ? '#2A9D8F' : '#9A2A1C');
  }
  if (G.arrow) {
    const [x, y, h] = G.arrow;
    const [sx, sy] = P(x + 0.5, y + 0.5, h + 0.6);
    ctx.fillStyle = G.ok ? '#F4C542' : '#F26B5B'; ctx.beginPath(); ctx.arc(sx, sy, 5 * view.cam.z, 0, 7); ctx.fill();
  }
  if (G.label) {
    const [x, y] = G.tiles && G.tiles.length ? G.tiles[G.tiles.length - 1] : [0, 0];
    const h = G.tiles && G.tiles.length && G.tiles[G.tiles.length - 1][2] != null ? G.tiles[G.tiles.length - 1][2] : S.map.height[idx(S, x, y)];
    const [sx, sy] = P(x + 0.5, y + 0.5, h);
    badge(ctx, sx, sy - 30 * view.cam.z, G.label, G.ok ? '#1F5F6B' : '#9A2A1C');
  }
}

// screen (CSS px) → tile, front-most first. Returns {x, y, i} or null.
export function pick(S, sx, sy) {
  if (view.g3) return view.g3.pick(S, sx, sy);
  updateOrigin();
  const M = S.map, w = M.w, h = M.h, Z = view.cam.z;
  for (let d = w + h - 2; d >= 0; d--) {
    for (let x = Math.min(w - 1, d); x >= Math.max(0, d - h + 1); x--) {
      const y = d - x, i = y * w + x;
      let z = M.height[i];
      const [cx, cy] = P(x + 0.5, y + 0.5, z);
      const dx = Math.abs(sx - cx) / (TW / 2 * Z), dy = Math.abs(sy - cy) / (TH / 2 * Z);
      if (dx + dy <= 1) return { x, y, i };
    }
  }
  return null;
}
export function pickGuest(S, sx, sy) {
  let best = null, bd = 14 * Math.max(1, view.cam.z);
  for (const g of S.guests) {
    if (g.st === 'ride' || g.st === 'gone' || g.st === 'queue') continue;
    const [px, py] = P(g.x, g.y, g.z);
    const d = Math.hypot(px - sx, py - 8 * view.cam.z - sy);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}
export { DIRS, DAY, HOUR };
