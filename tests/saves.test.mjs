// Save slots, autosave, Continue after a reload, and play with storage blocked.
import { park, click } from './helpers.mjs';

export const tests = [
  {
    name: 'save to a slot, change things, load it back; continue after reload',
    async run(t) {
      await park(t);
      await t.game('act', 'mainStreet', 10, 5, 5);
      await t.game('act', 'autoPlace', 'carousel');
      await t.game('step', 300);
      const saved = await t.state();
      await t.game('act', 'panel', 'saves');
      await click(t, 'save', '1');
      await t.shot('01-slots');
      await t.checkLayout();
      await t.game('act', 'autoPlace', 'bumper');
      await t.game('step', 200);
      await click(t, 'load', '1');
      let s = await t.state();
      t.equal(s.objects.length, saved.objects.length, 'objects restored');
      t.equal(s.tick, saved.tick, 'clock restored');
      t.equal(s.cash, saved.cash, 'cash restored');
      t.equal(s.guests, saved.guests, 'guests restored');
      await t.reload();
      t.expect(/Continue/.test(await t.page.textContent('#screen')), 'title offers Continue');
      await click(t, 'continue');
      s = await t.state();
      t.equal(s.scene, 'park', 'continued');
      t.equal(s.objects.length, saved.objects.length, 'same park after a reload');
      // a month end writes the autosave slot
      await t.game('step', 7 * 1200);
      await t.game('act', 'panel', 'saves');
      t.expect(!/Autosave\s*empty/.test(await t.page.textContent('#panel')), 'autosave written at the month end');
    },
  },
  {
    name: 'storage blocked: the game still plays and says so',
    initScript: () => {
      const thrower = () => { throw new Error('storage blocked'); };
      Object.defineProperty(window, 'localStorage', { get: thrower, configurable: true });
    },
    async run(t) {
      const s0 = await t.state();
      t.equal(s0.scene, 'title', 'boots');
      await park(t);
      await t.game('act', 'mainStreet', 8, 5, 4);
      await t.game('act', 'panel', 'saves');
      await click(t, 'save', '2');
      const s = await t.state();
      t.equal(s.storageOk, false, 'storage reported blocked');
      t.expect(/Storage is blocked/.test(await t.page.textContent('#panel')), 'saves panel explains');
      const r = await t.game('step', 200);
      t.expect(r.tick > 0, 'the park runs');
    },
  },
];
