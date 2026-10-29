// 500 guests at 60 fps, file size, load time, no requests or console errors (the harness checks those).
import fs from 'node:fs';
import path from 'node:path';

export const tests = [
  {
    name: 'performance: 500 guests, size, load',
    async run(t) {
      const size = fs.statSync(path.resolve('games/theme-park/index.html')).size;
      t.expect(size < 2 * 1024 * 1024, `index.html ${(size / 1024).toFixed(0)} KB < 2 MB`);
      t.expect(t.loadMs < 2000, `hooks ready in ${t.loadMs} ms`);
      await t.seed(11);
      await t.game('newGame', { mode: 'sandbox', cash: 'unlimited', hills: 'rolling', tutorial: false });
      await t.game('act', 'mainStreet', 22, 4, 10);
      for (const r of ['carousel', 'wheel', 'bumper', 'swings', 'ship', 'drop', 'boom', 'cups', 'planes', 'tower', 'wave', 'river', 'slides', 'complex', 'bbq', 'pizza', 'chicken', 'funnel', 'refill', 'snocone', 'souvenir', 'restroom', 'restroom']) await t.game('act', 'autoPlace', r);
      for (const b of ['screamer', 'ridge', 'littlebear', 'lumber']) await t.game('act', 'autoBlueprint', b);
      await t.game('setState', { month: 3, hour: 13 });
      await t.game('act', 'spawn', 500);
      let s = await t.game('step', 60);
      t.expect(s.guests >= 480, `${s.guests} guests in the park`);
      const g = await t.game('act', 'gate');
      await t.game('act', 'camera', g.x, g.y - 10, t.viewport === 'mobile' ? 0.8 : 0.9);
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
      await t.shot('01-500-guests');
    },
  },
];
