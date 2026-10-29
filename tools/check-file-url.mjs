#!/usr/bin/env node
// Opens the game from file:// (no server) at both viewports and checks that three.js, the models, the terrain
// backdrop and the painted icons load, a park builds and runs in 3D, and nothing errors or reaches the network.
//   node games/theme-park/tools/check-file-url.mjs [--gpu]
// The test harness cannot do this itself: it blocks every URL that is not its own server.
// (Pattern from games/block-puzzle/tools/check-file-url.mjs.)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../../shared/test-harness/package.json'));
const { chromium } = require('playwright');
const url = pathToFileURL(path.resolve(HERE, '..', 'index.html')).href;
const gpu = process.argv.includes('--gpu') ? ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--use-gl=angle'] : [];
const browser = await chromium.launch({ args: gpu });
let failed = 0;
for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage();
  const problems = [], files = new Set();
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console error: ' + m.text()); });
  page.on('request', (r) => { const u = r.url(); if (u.startsWith('file:')) files.add(u.split('/').slice(-2).join('/')); else if (!u.startsWith('data:') && !u.startsWith('blob:')) problems.push('network request: ' + u); });
  page.on('requestfailed', (r) => problems.push('failed: ' + r.url()));
  await page.goto(url);
  await page.waitForFunction(() => window.__game && (window.__game.getState().gfx.mode === '3d' || window.__game.getState().gfx.failed), null, { timeout: 60000 });
  await page.evaluate(() => { const G = window.__game; G.seed(7); G.newGame({ mode: 'sandbox', cash: 'unlimited', tutorial: false }); G.act('mainStreet', 12, 4, 6); for (const r of ['carousel', 'wheel', 'bbq', 'souvenir', 'lamp']) G.act('autoPlace', r); G.act('autoBlueprint', 'screamer'); G.act('spawn', 200); G.step(60); G.act('tool', 'rides'); });
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => window.__game.getState());
  const imgs = await page.evaluate(() => [...document.images].filter((i) => i.src.startsWith('file:')).map((i) => i.complete && i.naturalWidth > 0));
  if (st.gfx.mode !== '3d') problems.push('3D view did not start: ' + st.gfx.failed);
  if (!(st.gfx.trees > 100 && st.gfx.objects3d > 3)) problems.push('scene incomplete: ' + JSON.stringify(st.gfx));
  if (imgs.some((ok) => !ok)) problems.push(`painted icons: ${imgs.filter(Boolean).length}/${imgs.length} decoded`);
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  [${name}] file:// · ${st.gfx.mode} (${st.gfx.gpu.slice(0, 40)}) · ${st.gfx.trees} trees · ${st.guests} guests · ${imgs.length} icons · files: ${[...files].sort().join(', ')}`);
  for (const p of problems) console.log('      ✗ ' + p);
  failed += problems.length ? 1 : 0;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
