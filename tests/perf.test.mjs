// 500 guests at 60 fps, file size, load time, no requests or console errors (the harness checks those).
import fs from 'node:fs';
import path from 'node:path';

// The 3D view on the harness's software GL (SwiftShader) runs a few frames a second whatever we do, so there the
// test checks the script cost per frame instead; real GPU fps come from tools/shots3d.mjs --fps (REPORT/VISUAL-REPORT).
// The 2D fallback keeps the original ≥ 55 fps budget.
const dirSize = (d) => { const p = path.resolve('games/theme-park', d); return fs.existsSync(p) ? fs.readdirSync(p).filter((f) => !f.includes('LICENSE') && !f.endsWith('.json')).reduce((a, f) => a + fs.statSync(path.join(p, f)).size, 0) : 0; };
async function busyPark(t) {
      await t.seed(11);
      await t.game('newGame', { mode: 'sandbox', cash: 'unlimited', hills: 'rolling', tutorial: false });
      await t.game('act', 'mainStreet', 22, 4, 10);
      for (const r of ['carousel', 'wheel', 'bumper', 'swings', 'ship', 'drop', 'boom', 'cups', 'planes', 'tower', 'wave', 'river', 'slides', 'complex', 'bbq', 'pizza', 'chicken', 'funnel', 'refill', 'snocone', 'souvenir', 'restroom', 'restroom']) await t.game('act', 'autoPlace', r);
      for (const b of ['screamer', 'ridge', 'littlebear', 'lumber']) await t.game('act', 'autoBlueprint', b);
      await t.game('setState', { month: 3, hour: 13 });
      await t.game('act', 'spawn', 500);
      const s = await t.game('step', 60);
      t.expect(s.guests >= 480, `${s.guests} guests in the park`);
      const g = await t.game('act', 'gate');
      await t.game('act', 'camera', g.x, g.y - 10, t.viewport === 'mobile' ? 0.8 : 0.9);
      return s;
}

export const tests = [
  {
    name: 'performance (3D view): 500 guests, frame cost, size, load',
    async run(t) {
      const size = fs.statSync(path.resolve('games/theme-park/index.html')).size;
      t.expect(size < 2 * 1024 * 1024, `index.html ${(size / 1024).toFixed(0)} KB < 2 MB`);
      const total = size + dirSize('vendor') + dirSize('assets');
      t.log(`download: index.html ${(size / 1024).toFixed(0)} KB, total with three.js and assets ${(total / 1048576).toFixed(2)} MB`);
      t.expect(total < 3 * 1048576, 'total download < 3 MB');
      t.expect(t.loadMs < 2000, `hooks ready in ${t.loadMs} ms`);
      const t0 = Date.now();
      await t.page.waitForFunction(() => { const g = window.__game.getState().gfx; return g.mode === '3d' || g.failed; }, null, { timeout: 30000 });
      t.log(`3D ready ${Date.now() - t0} ms after the hooks`);
      const s = await busyPark(t);
      await t.game('resume');
      await t.game('act', 'speed', 1);
      const fps = await t.fps(3000);
      const gfx = (await t.state()).gfx;
      t.log(`fps ${fps.toFixed(1)} with ${s.guests} guests on ${gfx.gpu} (${gfx.quality}); script ${gfx.frameMs} ms per frame, ${gfx.draws} draw calls`);
      t.expect(gfx.mode === '3d', '3D view active');
      t.expect(fps >= (gfx.soft ? 1 : 55), `fps floor (${fps.toFixed(1)})`);
      t.expect(gfx.frameMs <= 12, `script time per 3D frame ≤ 12 ms (${gfx.frameMs})`);
      const mb = await t.memoryMB();
      t.log(`heap ${mb.toFixed(1)} MB`);
      t.expect(mb < 250, 'heap < 250 MB');
      await t.game('pause');
      await t.shot('01-500-guests');
    },
  },
  {
    name: 'performance (2D fallback): 500 guests at 55 fps',
    url: 'index.html?gfx=2d',
    async run(t) {
      const s = await busyPark(t);
      await t.game('resume');
      await t.game('act', 'speed', 1);
      const fps = await t.fps(3000);
      t.log(`fps ${fps.toFixed(1)} with ${s.guests} guests`);
      t.expect(fps >= 55, `≥ 55 fps (${fps.toFixed(1)})`);
      const mb = await t.memoryMB();
      t.log(`heap ${mb.toFixed(1)} MB`);
      await t.game('pause');
      // the sim cost per tick with this crowd, measured in the page
      const ms = await t.page.evaluate(() => { const t0 = performance.now(); window.__game.step(120); return (performance.now() - t0) / 120; });
      t.log(`step incl. one render: ${ms.toFixed(2)} ms per tick`);
      await t.shot('02-500-guests-2d');
    },
  },
];
