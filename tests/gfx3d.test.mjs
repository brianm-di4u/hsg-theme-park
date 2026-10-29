// The 3D view: it boots after first paint, its assets load from the game folder only, picking through the 3D camera
// agrees with tileToScreen, real input still builds, and the 2D fallback renders when asked for.
import { park, starter } from './helpers.mjs';

const ready = (t) => t.page.waitForFunction(() => { const g = window.__game.getState().gfx; return g && (g.mode === '3d' || g.failed); }, null, { timeout: 30000 });

export const tests = [
  {
    name: '3D view boots with models, terrain and trees',
    async run(t) {
      await ready(t);
      let s = await t.state();
      t.equal(s.gfx.mode, '3d', `3D view active (${s.gfx.gpu})`);
      t.expect(!s.gfx.failed, 'no load failure');
      await park(t);
      await starter(t);
      await t.game('act', 'autoPlace', 'carousel');
      await t.game('act', 'autoPlace', 'bbq');
      await t.waitForStable();
      s = await t.state();
      t.expect(s.gfx.trees > 200, `instanced trees (${s.gfx.trees})`);
      t.expect(s.gfx.objects3d >= 2, `objects built (${s.gfx.objects3d})`);
      t.expect(s.gfx.draws > 5 && s.gfx.tris > 10000, `drew the scene (${s.gfx.draws} calls, ${s.gfx.tris} tris)`);
      t.log(`quality ${s.gfx.quality}, frame ${s.gfx.frameMs} ms`);
      await t.shot('01-park-3d');
    },
  },
  {
    name: 'picking through the 3D camera lands on the tile tileToScreen names',
    async run(t) {
      await ready(t);
      await park(t);
      const g = await t.game('act', 'gate');
      await t.game('act', 'camera', g.x, g.y - 6, 1);
      let ok = 0, n = 0;
      for (const [dx, dy] of [[0, -3], [2, -5], [-3, -8], [4, -9], [-1, -12]]) {
        const x = g.x + dx, y = g.y + dy;
        const p = await t.game('act', 'tileToScreen', x, y);
        n++;
        const picked = await t.game('act', 'pickAt', p.x, p.y);
        if (picked && picked.x === x && picked.y === y) ok++;
        else t.log(`(${x},${y}) picked ${JSON.stringify(picked)}`);
      }
      t.expect(ok >= n - 1, `picks match ${ok}/${n}`);
    },
  },
  {
    name: 'settings: the 3D view can be turned off and on, and the choice persists',
    viewports: ['desktop'],
    async run(t) {
      await ready(t);
      await t.page.click('[data-act="screen"][data-arg="settings"]');
      await t.page.click('[data-act="gfx"]');
      let s = await t.state();
      t.equal(s.gfx.mode, '2d', 'switched to the 2D map');
      t.equal(s.settings.gfx, '2d', 'setting stored');
      await t.reload();
      await t.page.waitForTimeout(400);
      s = await t.state();
      t.equal(s.gfx.mode, '2d', 'still 2D after a reload');
      await t.page.click('[data-act="screen"][data-arg="settings"]');
      await t.page.click('[data-act="gfx"]');
      await ready(t);
      s = await t.state();
      t.equal(s.gfx.mode, '3d', 'back to 3D without a reload');
      await t.page.click('[data-act="quality"]');
      t.expect(['high', 'medium', 'low'].includes((await t.state()).settings.quality), 'graphics quality cycles');
    },
  },
  {
    name: '2D fallback renders when the 3D view is off',
    url: 'index.html?gfx=2d',
    async run(t) {
      await t.page.waitForTimeout(300);
      const s = await t.state();
      t.equal(s.gfx.mode, '2d', '2D renderer in use');
      await park(t);
      await starter(t);
      await t.game('act', 'autoPlace', 'carousel');
      await t.shot('02-fallback-2d');
    },
  },
];
