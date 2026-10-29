// Downloads the public-domain elevation and land-cover rasters the 3D backdrop is baked from, into
// art-src/dem/ (git-ignored; delete after baking).   node tools/geo/fetch.mjs <name> <w,s,e,n> <W> <H>
// Sources (U.S. federal works, public domain):
//   USGS 3D Elevation Program (3DEP) seamless DEM, exportImage as uncompressed float32 TIFF
//     https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer
//   USGS/MRLC National Land Cover Database 2021 (NLCD), WMS GetMap PNG in the standard class colours
//     https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/wms
// (Request pattern adapted from games/fishing/tools/geo/fetch.mjs.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../art-src/dem');
fs.mkdirSync(RAW, { recursive: true });
const [name, bbox, W, H] = process.argv.slice(2);
const q = (o) => Object.entries(o).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
async function get(url, file) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url); if (!r.ok) throw new Error(r.status);
      const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(path.join(RAW, file), b); console.log('got', file, (b.length / 1024).toFixed(0), 'KB'); return;
    } catch (e) { console.warn('retry', file, e.message); await new Promise((r) => setTimeout(r, 2000)); }
  }
  throw new Error('failed ' + file);
}
await get('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?' + q({
  bbox, bboxSR: 4326, imageSR: 4326, size: `${W},${H}`, format: 'tiff', pixelType: 'F32', noData: '',
  compression: 'None', interpolation: 'RSP_BilinearInterpolation', f: 'image' }), `dem_${name}.tif`);
await get('https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/wms?' + q({
  service: 'WMS', version: '1.1.1', request: 'GetMap', layers: 'NLCD_2021_Land_Cover_L48', styles: '', srs: 'EPSG:4326',
  bbox, width: W, height: H, format: 'image/png' }), `nlcd_${name}.png`);
