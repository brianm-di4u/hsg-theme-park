// TIFF (uncompressed float32) and PNG read/write helpers for the geo tools.
// Adapted from games/fishing/tools/geo/bake.mjs (same repository, MIT).
import fs from 'node:fs';
import zlib from 'node:zlib';

export function readTiff(file) {
  const b = fs.readFileSync(file);
  const le = b[0] === 0x49; const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o)); const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const ifd = u32(4); const n = u16(ifd); const tags = {};
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12, tag = u16(o), type = u16(o + 2), cnt = u32(o + 4);
    const size = { 3: 2, 4: 4 }[type] || 4; const at = cnt * size > 4 ? u32(o + 8) : o + 8;
    const vals = []; for (let k = 0; k < cnt; k++) vals.push(type === 3 ? u16(at + k * 2) : u32(at + k * 4));
    tags[tag] = vals;
  }
  const w = tags[256][0], h = tags[257][0]; if (tags[259] && tags[259][0] !== 1) throw new Error('compressed TIFF');
  const out = new Float32Array(w * h); let k = 0;
  const rd = (o) => (le ? b.readFloatLE(o) : b.readFloatBE(o));
  if (tags[273]) tags[273].forEach((off, i) => { const len = tags[279][i]; for (let p = 0; p < len; p += 4) out[k++] = rd(off + p); });
  else {
    const tw = tags[322][0], th = tags[323][0], across = Math.ceil(w / tw);
    tags[324].forEach((off, t) => { const tx = (t % across) * tw, ty = Math.floor(t / across) * th;
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const X = tx + x, Y = ty + y; if (X < w && Y < h) out[Y * w + X] = rd(off + (y * tw + x) * 4); } });
  }
  return { w, h, data: out };
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); }
export function writePng(w, h, px, channels = 1) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = channels === 1 ? 0 : 2;
  const stride = w * channels; const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; for (let x = 0; x < stride; x++) raw[y * (stride + 1) + 1 + x] = px[y * stride + x]; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
export function readPng(file) {
  const b = fs.readFileSync(file); let o = 8, W = 0, H = 0, ct = 0, pal = null; const idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); ct = d[9]; }
    else if (type === 'PLTE') pal = d; else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break; o += 12 + len; }
  const bpp = ct === 3 ? 1 : ct === 2 ? 3 : ct === 6 ? 4 : ct === 0 ? 1 : 2; const raw = zlib.inflateSync(Buffer.concat(idat)); const stride = W * bpp;
  const px = Buffer.alloc(W * H * bpp); let prev = Buffer.alloc(stride);
  for (let y = 0; y < H; y++) { const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), out = px.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? out[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0; let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[x] = v & 255; } prev = out; }
  const rgb = (i) => (ct === 3 ? [pal[px[i] * 3], pal[px[i] * 3 + 1], pal[px[i] * 3 + 2]] : ct === 0 ? [px[i], px[i], px[i]] : [px[i * bpp], px[i * bpp + 1], px[i * bpp + 2]]);
  return { w: W, h: H, rgb };
}
