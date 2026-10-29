// The coaster and flume builder: station, cells, lift, turns, undo, auto-finish, the test run, stats.
import { park, click } from './helpers.mjs';

async function street(t) {
  await park(t, { seed: 21, hills: 'rolling' });
  await t.game('act', 'mainStreet', 16, 5, 7);
}

export const tests = [
  {
    name: 'build a steel coaster cell by cell, auto-finish, test and open',
    async run(t) {
      await street(t);
      await click(t, 'tool', 'coasters');
      let txt = await t.page.textContent('#panel');
      for (const w of ['Steel Coaster', 'Wooden Coaster', 'Family Coaster', 'Log Flume', 'Blueprints', '$25 per level']) t.expect(txt.includes(w), `coaster panel lists ${w}`);
      const sp = await t.game('act', 'stationSpot', 'steel', 0, 9);
      t.expect(!!sp, 'found room for a station');
      let r = await t.game('act', 'trackStart', 'steel', sp.x, sp.y, sp.dir);
      t.expect(r.ok, 'station placed');
      let s = await t.state();
      t.equal(s.panel, 'track', 'the builder opens');
      // lift hill through the UI: slope up, lift on, straight ×4
      await click(t, 'slope', '1');
      await click(t, 'lift');
      let added = 0;
      for (let k = 0; k < 6; k++) {
        const ok = await t.page.$('[data-act="trackAdd"][data-arg="0"]:not([disabled])');
        if (!ok) break;
        await click(t, 'trackAdd', '0'); added++;
      }
      s = await t.state();
      t.expect(s.trackBuild.cells >= 3 + Math.min(added, 3), `lift cells added by clicking (${s.trackBuild.cells} cells)`);
      // undo one, then turn and drop with the keyboard
      await click(t, 'trackUndo');
      t.equal((await t.state()).trackBuild.cells, s.trackBuild.cells - 1, 'undo removes a cell');
      await t.game('act', 'lift', false);
      await t.game('act', 'slope', 0);
      await t.page.focus('#cv').catch(() => {});
      await t.page.evaluate(() => document.activeElement && document.activeElement.blur());
      await t.page.keyboard.press('ArrowRight');
      await t.page.keyboard.press('PageDown'); await t.page.keyboard.press('PageDown'); await t.page.keyboard.press('PageDown');
      await t.page.keyboard.press('ArrowUp');
      s = await t.state();
      t.expect(s.trackBuild.cells >= 5, `keyboard added track (${s.trackBuild.cells} cells)`);
      await t.shot('01-building');
      await t.checkLayout();
      r = await t.game('act', 'trackAuto');
      t.expect(r.ok, `auto-finish closed the loop (${r.reason || r.cells + ' cells'})`);
      txt = await t.page.textContent('#panel');
      t.expect(/Loop closed/.test(txt) && /Top speed/.test(txt) && /Intensity/.test(txt), 'closed loop shows predicted stats');
      await click(t, 'trackFinish');
      s = await t.state();
      const o = s.objects.find((x) => x.type === 'steel');
      t.equal(o.status, 'open', 'the test run passed and the ride is open');
      t.expect(o.stats.vmax > 20 && o.int >= 2 && o.thrill > 2, `stats: ${o.stats.vmax} mph, drop ${o.stats.drop} ft, intensity ${o.int}, thrill ${o.thrill}`);
      await t.game('act', 'camera', sp.x, sp.y, t.viewport === 'mobile' ? 0.8 : 1);
      await t.game('act', 'panel', null);
      await t.shot('03-done');
      // supports cost $25 per level above the ground: a cell high on stilts costs more than one on the slope
      const g = await t.game('act', 'tile', sp.x, sp.y);
      const low = await t.game('act', 'cellCost', 'steel', sp.x, sp.y, g.h, false, false);
      const high = await t.game('act', 'cellCost', 'steel', sp.x, sp.y, g.h + 6, false, false);
      t.equal(high - low, 150, 'six levels of supports add $150 to a cell');
    },
  },
  {
    name: 'a climb without a lift stalls the test run and names the cell',
    async run(t) {
      await street(t);
      const sp = await t.game('act', 'stationSpot', 'family');
      await t.game('act', 'trackStart', 'family', sp.x, sp.y, sp.dir);
      await t.game('act', 'trackAdd', 0, 0, false);
      await t.game('act', 'trackAdd', 1, 0, false);
      await t.game('act', 'trackAdd', 1, 0, false);
      const r = await t.game('act', 'trackAuto');
      t.expect(r.ok, 'auto-finish closes it');
      await click(t, 'trackFinish');
      const s = await t.state();
      const o = s.objects.find((x) => x.type === 'family');
      t.equal(o.status, 'testfail', 'test failed');
      t.expect(o.failAt >= 3, `stalls at cell ${o.failAt + 1}`);
      t.expect(s.msgs.some((m) => /stalls at cell \d+/.test(m)), 'message names the cell');
      await t.game('act', 'select', 'obj', o.id);
      await t.game('act', 'camera', sp.x, sp.y, 1.3);
      await t.shot('02-stall');
      // fix it: edit, undo back to the climb, add a lift instead
      await click(t, 'editTrack');
      let st = await t.state();
      t.equal(st.panel, 'track', 'editing reopens the builder');
      await t.checkLayout();
    },
  },
  {
    name: 'flume and blueprints; water rides pay pumps by height',
    viewports: ['desktop'],
    async run(t) {
      await street(t);
      const f = await t.game('act', 'autoBlueprint', 'lumber');
      t.expect(f.ok, 'Lumber Run blueprint placed');
      t.expect(f.stats.int <= 3, `flume intensity capped at 3 (${f.stats.int})`);
      const b = await t.game('act', 'autoBlueprint', 'littlebear');
      t.expect(b.ok && b.stats.int <= 2.4, 'family coaster blueprint placed, gentle');
      const w = await t.game('act', 'autoPlace', 'wave');
      t.expect(w.ok, 'wave pool placed');
      const c = await t.game('act', 'monthlyCosts');
      t.expect(c.pump > 0 || (await t.game('act', 'tile', w.x, w.y)).h === 0, `pump upkeep charged by height ($${c.pump})`);
      await t.game('act', 'camera', w.x, w.y, 0.9);
      await t.shot('04-flume');
    },
  },
];
