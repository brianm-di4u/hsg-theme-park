// Hillshade preview of a fetched DEM with a 1 km grid: node preview.mjs <name>
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { readTiff, writePng } from './geo-lib.mjs';
const RAW = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../art-src/dem');
const name = process.argv[2];
const d = readTiff(path.join(RAW, `dem_${name}.tif`));
const { w, h, data } = d; let mn = 1e9, mx = -1e9; for (const v of data) { if (v < mn) mn = v; if (v > mx) mx = v; }
console.log(w, h, 'elev', mn.toFixed(0), mx.toFixed(0));
const px = Buffer.alloc(w * h * 3);
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const i = y * w + x, dx = data[i + 1] - data[i - 1], dy = data[i + w] - data[i - w];
  const sh = Math.max(0, Math.min(1, 0.6 + (-dx * 0.7 + dy * 0.7) / 80));
  const e = (data[i] - mn) / (mx - mn);
  px[i * 3] = (60 + 150 * e) * sh; px[i * 3 + 1] = (110 + 100 * (1 - e)) * sh; px[i * 3 + 2] = 70 * sh;
  if (x % 40 === 0 || y % 40 === 0) { px[i * 3] = 255; px[i * 3 + 1] = 255; px[i * 3 + 2] = 255; }
}
fs.writeFileSync(path.join(RAW, `preview_${name}.png`), writePng(w, h, px, 3));
