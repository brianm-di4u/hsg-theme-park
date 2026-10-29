// Review shots and fps of the 3D view with a GPU-backed headless Chromium (the test harness runs SwiftShader).
//   node games/theme-park/tools/shots3d.mjs [out-dir] [--fps] [--only title,crowd] [--sw] [--vp desktop|mobile] [--2d]
// Serves the repo root on a local port, stages scenes through window.__game and writes PNGs
// (desktop 1280×800, mobile 390×844 @2x). --sw uses the default software GL instead of the GPU.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../shared/test-harness/package.json'));
const { chromium } = require('playwright');
const args = process.argv.slice(2);
function opt0(k) { return args.includes(k) ? args[args.indexOf(k) + 1] : null; }
const root = opt0('--root') ? path.resolve(opt0('--root')) : path.resolve(here, '../../..');
const pagePath = opt0('--page') || 'games/theme-park/index.html';
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const out = path.resolve(args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--')) || path.join(here, '../screenshots/scratch3d'));
const only = opt('--only') ? opt('--only').split(',') : null;
const vpOnly = opt('--vp');
const wantFps = args.includes('--fps');
fs.mkdirSync(out, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((q, r) => {
  const p = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
}).listen(0);
const port = server.address().port;
const gpuArgs = args.includes('--sw') ? [] : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--use-gl=angle'];
const browser = await chromium.launch({ headless: true, args: gpuArgs });

// a busy park: the perf test's layout (sandbox, a main street, most rides, four blueprints, 500+ guests)
const busy = (spawn = 600) => async (p) => p.evaluate((n) => {
  const G = window.__game; G.seed(7);
  G.newGame({ mode: 'sandbox', cash: 'unlimited', hills: 'rolling', tutorial: false });
  G.act('mainStreet', 22, 4, 10);
  for (const r of ['carousel', 'wheel', 'bumper', 'swings', 'ship', 'drop', 'boom', 'cups', 'planes', 'tower', 'wave', 'river', 'slides', 'complex', 'bbq', 'pizza', 'chicken', 'funnel', 'refill', 'snocone', 'souvenir', 'restroom', 'restroom', 'lamp', 'lamp', 'fountain', 'sign', 'flowers', 'statue', 'bench', 'trash']) G.act('autoPlace', r);
  for (const b of ['screamer', 'ridge', 'littlebear', 'lumber']) G.act('autoBlueprint', b);
  G.act('goto', { month: 3, dow: 5, hour: 14 }); G.act('weather', 'sun', 91);
  G.act('spawn', n); G.step(240);
  const g = G.act('gate'); G.act('camera', g.x, g.y - 10, window.innerWidth < 700 ? 0.8 : 0.9);
}, spawn);
const SCENES = {
  async title(p) { await p.evaluate(() => window.__game.scene('title')); },
  async start(p) { await p.evaluate(() => { const G = window.__game; G.seed(7); G.newGame({ scenario: 1, tutorial: false }); }); },
  crowd: busy(600),
  async close(p) { await busy(600)(p); await p.evaluate(() => { const G = window.__game; const g = G.act('gate'); G.act('camera', g.x + 2, g.y - 8, 1.8); }); },
  async vista(p) { await busy(400)(p); await p.evaluate(() => { const G = window.__game; G.act('camera', 24, 30, 0.33); G.act('goto', { hour: 19.8 }); G.act('weather', 'sun'); G.step(2); }); },
  async wide(p) { await busy(600)(p); await p.evaluate(() => { const G = window.__game; G.act('camera', 24, 24, 0.5); }); },
  async night(p) { await busy(500)(p); await p.evaluate(() => { const G = window.__game; G.act('goto', { hour: 21.5 }); G.step(2); }); },
  async dusk(p) { await busy(500)(p); await p.evaluate(() => { const G = window.__game; G.act('goto', { hour: 19.6 }); G.step(2); }); },
  async rain(p) { await busy(300)(p); await p.evaluate(() => { const G = window.__game; G.act('weather', 'storm', 78); G.step(2); }); },
  async fall(p) { await busy(300)(p); await p.evaluate(() => { const G = window.__game; G.act('goto', { month: 6, hour: 15 }); G.act('weather', 'sun', 76); G.step(2); }); },
  async spring(p) { await p.evaluate(() => { const G = window.__game; G.seed(7); G.newGame({ scenario: 1, tutorial: false }); G.act('goto', { month: 0, hour: 11 }); const g = G.act('gate'); G.act('camera', g.x, g.y - 14, 0.7); }); },
  async train(p) { await busy(300)(p); await p.evaluate(() => { const G = window.__game; const S = G.getState(true); const t = S.objects.find((o) => o.type === 'steel'); const c = t.cells[Math.floor(t.cells.length * 0.4)]; G.act('camera', c.x, c.y, 2); for (let i = 0; i < 400 && G.getState().objects.find((o) => o.id === t.id).riders === 0; i++) G.step(5); G.step(30); }); },
  async palette(p) { await busy(300)(p); await p.evaluate(() => { const G = window.__game; G.act('tool', 'rides'); }); },
  async guest(p) { await busy(400)(p); await p.evaluate(() => { const G = window.__game; const s = G.getState(); const g = s.sampleGuests.find((x) => x.st !== 'ride' && x.st !== 'queue') || s.sampleGuests[0]; G.act('select', 'guest', g.id); G.act('follow', true); G.step(3); }); },
  async coaster(p) { await busy(300)(p); await p.evaluate(() => { const G = window.__game; const s = G.getState(); const t = s.objects.find((o) => o.type === 'steel'); if (t) G.act('camera', t.x, t.y, 1.3); }); },
};
const VPS = { desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }, mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
for (const [vn, vo] of Object.entries(VPS)) {
  if (vpOnly && vn !== vpOnly) continue;
  const ctx = await browser.newContext(vo);
  const page = await ctx.newPage();
  if (args.includes('--throttle')) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/${pagePath}${args.includes('--2d') ? '?gfx=2d' : ''}`);
  await page.waitForTimeout(1500); if (errs.length) console.log('EARLY', errs.slice(0, 5));
  await page.waitForFunction(() => window.__game && (window.__game.getState().gfx.mode === '3d' || window.__game.getState().gfx.failed || !window.__game.getState().gfx.want), null, { timeout: 30000 });
  const gfx = await page.evaluate(() => window.__game.getState().gfx);
  console.log(vn, JSON.stringify(gfx));
  for (const [name, fn] of Object.entries(SCENES)) {
    if (only && !only.includes(name)) continue;
    const t0 = Date.now();
    await fn(page);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    await page.waitForTimeout(250);
    if (args.includes('--hide2d')) await page.evaluate(() => { document.getElementById('cv').style.visibility = 'hidden'; });
    await page.screenshot({ path: path.join(out, `${vn}-${name}.png`) });
    const st = await page.evaluate(() => window.__game.getState().gfx);
    console.log(`  ${vn} ${name}: ${Date.now() - t0} ms, ${st.draws} draws, ${(st.tris / 1000).toFixed(0)}k tris, frame ${st.frameMs} ms`);
    if (wantFps && ['crowd', 'night', 'wide', 'title'].includes(name)) {
      if (name !== 'title') await page.evaluate(() => window.__game.resume());
      await page.waitForTimeout(1200);
      const r = await page.evaluate(() => new Promise((res) => { const d = []; let last = performance.now(); const t0 = last; const f = (now) => { d.push(now - last); last = now; if (now - t0 < 4000) requestAnimationFrame(f); else { d.sort((x, y) => x - y); res({ fps: d.length / ((now - t0) / 1000), med: d[d.length >> 1], p90: d[Math.floor(d.length * 0.9)] }); } }; requestAnimationFrame(f); }));
      const g2 = await page.evaluate(() => window.__game.getState().gfx);
      console.log(`  ${vn} ${name}: ${r.fps.toFixed(1)} fps, median ${r.med.toFixed(1)} ms, p90 ${r.p90.toFixed(1)} ms, script ${g2.frameMs} ms/frame (${g2.quality})`);
      await page.evaluate(() => window.__game.pause());
    }
  }
  if (errs.length) console.log('CONSOLE', vn, errs.slice(0, 8));
  await ctx.close();
}
await browser.close(); server.close();
console.log('shots in', out);
