#!/usr/bin/env node
// Before/after sheets: pairs same-named screenshots from two milestones side by side.
// Adapted from games/block-puzzle/tools/before-after.mjs.
//   node tools/before-after.mjs [before=visual-before] [after=visual-final]
// Writes screenshots/<after>/before-after/<viewport>-NN.png (review aid; screenshots are git-ignored).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../shared/test-harness/package.json'));
const { chromium } = require('playwright');
const [before = 'visual-before', after = 'visual-final'] = process.argv.slice(2);
const SHOTS = ['01-title', '13-park-start', '01-crowd', '01-500-guests', '01-building', '03-done', '04-flume', '02-storm', '06-night', '05-fall', '04-spring', '05-concert', '04-guest', '05-ride-window', '06-broken', '07-litter'];
const root = path.resolve(HERE, '..', 'screenshots'), out = path.join(root, after, 'before-after');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const vp of ['desktop', 'mobile']) {
  const pairs = SHOTS.map(n => [n, path.join(root, before, vp, n + '.png'), path.join(root, after, vp, n + '.png')]).filter(([, a, b]) => fs.existsSync(a) && fs.existsSync(b));
  const per = vp === 'desktop' ? 3 : 4, w = vp === 'desktop' ? 560 : 300;
  for (let k = 0; k * per < pairs.length; k++) {
    const img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    const rows = pairs.slice(k * per, k * per + per).map(([n, a, b]) => `<div class="r"><div><img src="${img(a)}"><p>${n} · before</p></div><div><img src="${img(b)}"><p>${n} · after</p></div></div>`).join('');
    const page = await browser.newPage({ viewport: { width: w * 2 + 30, height: 400 } });
    await page.setContent(`<style>body{margin:0;background:#222;color:#eee;font:14px sans-serif}.r{display:flex;gap:10px;padding:5px}.r div{width:${w}px}img{width:100%;display:block}p{margin:4px 0 8px}</style>${rows}`);
    await page.waitForTimeout(200);
    const file = path.join(out, `${vp}-${String(k + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, fullPage: true }); await page.close();
    console.log(file);
  }
}
await browser.close();
