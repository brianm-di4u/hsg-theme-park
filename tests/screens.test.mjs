import { click } from './helpers.mjs';

export const tests = [
  {
    name: 'title',
    async run(t) {
      const s = await t.state();
      t.equal(s.scene, 'title', 'boots to the title');
      const txt = await t.page.textContent('#screen');
      for (const w of ['SPA CITY', 'THRILLS', 'Ouachita hills of Hot Springs', 'Campaign', 'Sandbox', 'History album', 'How to play', 'Settings', 'Not affiliated']) t.expect(txt.includes(w), `title shows "${w}"`);
      t.expect(t.loadMs < 2000, `hooks ready in ${t.loadMs} ms`);
      await t.shot('01-title');
      await t.checkLayout();
    },
  },
  {
    name: 'help tabs',
    async run(t) {
      await click(t, 'screen', 'help');
      const tabs = ['basics', 'building', 'guests', 'money', 'coasters', 'controls', 'about'];
      const want = { basics: 'one week', building: 'Hills matter', guests: 'intensity 1–5', money: 'game rules', coasters: 'Auto-finish', controls: 'Keyboard', about: 'not affiliated with' };
      let n = 2;
      for (const k of tabs) {
        await click(t, 'helpTab', k);
        const txt = await t.page.textContent('#screen');
        t.expect(txt.includes(want[k]), `${k} tab mentions "${want[k]}"`);
        await t.shot(`${String(n++).padStart(2, '0')}-help-${k}`);
      }
      const about = await t.page.textContent('#screen');
      for (const w of ['MIT', 'Magic Springs', 'fictional', 'NOAA', 'Encyclopedia of Arkansas']) t.expect(about.includes(w), `about cites ${w}`);
      await t.checkLayout();
      await t.page.keyboard.press('Escape');
      t.equal((await t.state()).scene, 'title', 'Esc returns to the title');
    },
  },
  {
    name: 'settings and history album',
    async run(t) {
      await click(t, 'screen', 'settings');
      const txt = await t.page.textContent('#screen');
      for (const w of ['Sound', 'Volume', 'Reduced motion', 'Text size']) t.expect(txt.includes(w), `settings has ${w}`);
      await t.shot('09-settings');
      await t.checkLayout();
      await click(t, 'back');
      await click(t, 'screen', 'history');
      const h = await t.page.textContent('#screen');
      t.expect(/of \d+ cards collected/.test(h), 'album counts cards');
      await t.shot('10-history');
      await t.checkLayout();
    },
  },
  {
    name: 'campaign select and intro',
    async run(t) {
      await click(t, 'screen', 'campaign');
      const txt = await t.page.textContent('#screen');
      for (const y of ['1978', '1984', '1991', '1995', '2000', '2003']) t.expect(txt.includes(y), `campaign lists ${y}`);
      await t.shot('11-campaign');
      await t.checkLayout();
      await click(t, 'intro', '1');
      const i = await t.page.textContent('#screen');
      t.expect(i.includes('July 22, 1978') && i.includes('Source: Wikipedia: Magic Springs'), 'intro shows a sourced history card');
      await t.shot('12-intro');
      await t.checkLayout();
      await click(t, 'play', '1');
      const s = await t.state();
      t.equal(s.scene, 'park', 'park scene');
      t.equal(s.tutorial, 0, 'tutorial starts');
      await t.shot('13-park-start');
      await t.checkLayout();
    },
  },
];
