// Keyboard-only play, contrast, reduced motion, text size, live region, audio settings.
import { click, contrastReport } from './helpers.mjs';

export const tests = [
  {
    name: 'keyboard only: start a sandbox, build a path and a ride, run the park',
    viewports: ['desktop'],
    async run(t) {
      const k = (key) => t.page.keyboard.press(key);
      // title → Sandbox → Start, by Tab and Enter
      const tabTo = async (sel, max = 30) => {
        for (let i = 0; i < max; i++) {
          if (await t.page.evaluate((sel) => document.activeElement && document.activeElement.matches(sel), sel)) return true;
          await k('Tab');
        }
        return false;
      };
      t.expect(await tabTo('[data-act="screen"][data-arg="sandbox"]'), 'Tab reaches Sandbox');
      await k('Enter');
      t.expect(await tabTo('[data-act="playSandbox"]'), 'Tab reaches Start');
      await k('Enter');
      let s = await t.state();
      t.equal(s.scene, 'park', 'park opened with the keyboard');
      await t.page.evaluate(() => document.activeElement && document.activeElement.blur());
      // P → path tool; arrows move the cursor from the gate; Enter, move, Enter builds
      await k('p');
      const before = (await t.state()).paths;
      await k('ArrowUp'); await k('Enter');
      for (let i = 0; i < 8; i++) await k('ArrowUp');
      await k('Enter');
      s = await t.state();
      t.expect(s.paths >= before + 7, `path built from the keyboard (${before} → ${s.paths})`);
      // B → rides panel; Tab to the carousel; Enter picks it
      await k('b');
      t.expect(await tabTo('[data-act="pick"][data-arg="carousel"]', 40), 'Tab reaches the carousel');
      await k('Enter');
      t.equal((await t.state()).tool, 'place', 'placing a carousel');
      await t.page.evaluate(() => document.activeElement && document.activeElement.blur());
      // cursor two tiles to the side of the path, then Enter
      let placed = false;
      for (const dir of ['ArrowRight', 'ArrowLeft']) {
        await k(dir); await k(dir);
        await k('Enter');
        s = await t.state();
        if (s.objects.some((o) => o.type === 'carousel')) { placed = true; break; }
        await k(dir === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight'); await k(dir === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight');
        for (let i = 0; i < 2; i++) { await k('ArrowDown'); }
      }
      t.expect(placed, 'carousel placed with Enter');
      await k('Escape');
      await k('4');
      s = await t.state();
      t.expect(!s.paused && s.speed === 8, 'key 4 runs at 8×');
      await t.page.waitForTimeout(4000);
      await k(' ');
      s = await t.state();
      t.expect(s.paused, 'Space pauses');
      t.expect(s.guestsToday > 0, `guests arrived (${s.guestsToday})`);
      await t.shot('01-keyboard');
    },
  },
  {
    name: 'contrast on screens and panels',
    async run(t) {
      const fails = [];
      const check = async (label) => { const r = await contrastReport(t.page); if (r.fails.length) fails.push(`${label}: ${r.fails.slice(0, 4).join('; ')}`); return r.checked; };
      await check('title');
      await click(t, 'screen', 'help'); await check('help');
      await click(t, 'helpTab', 'about'); await check('help about');
      await click(t, 'back');
      await click(t, 'screen', 'campaign'); await check('campaign');
      await click(t, 'intro', '1'); await check('intro');
      await t.seed(3);
      await t.game('newGame', { scenario: 6, tutorial: false });
      await t.game('step', 400);
      await check('park HUD and dock');
      for (const p of ['finances', 'guests', 'rating', 'staff', 'research', 'marketing', 'concerts', 'goals', 'saves', 'park', 'rides', 'coasters']) { await t.game('act', 'panel', p); await check('panel ' + p); }
      const s = await t.state();
      await t.game('act', 'select', 'guest', s.sampleGuests[0].id); await check('guest window');
      await t.game('act', 'select', 'obj', s.objects.find((o) => o.kind === 'track').id); await check('ride window');
      t.equal(fails.length, 0, `text contrast ≥ 4.5:1${fails.length ? ' — ' + fails.join(' | ') : ''}`);
    },
  },
  {
    name: 'reduced motion follows the system and can be toggled',
    reducedMotion: true,
    async run(t) {
      await click(t, 'screen', 'settings');
      let txt = await t.page.textContent('#screen');
      t.expect(/Reduced motion: on \(system\)/.test(txt), 'system preference honoured');
      t.expect(await t.page.evaluate(() => document.body.classList.contains('reduced')), 'reduced class set');
      await click(t, 'set', 'reduced');
      txt = await t.page.textContent('#screen');
      t.expect(/Reduced motion: off/.test(txt), 'toggled off in the game');
    },
  },
  {
    name: 'text size 150% still fits; live region announces; sound settings persist',
    async run(t) {
      await click(t, 'screen', 'settings');
      await click(t, 'text', '1.5');
      await click(t, 'set', 'sound');
      let s = await t.state();
      t.equal(s.settings.text, 1.5, 'text 150%');
      t.equal(s.settings.sound, false, 'sound off');
      await click(t, 'back');
      await t.seed(3);
      await t.game('newGame', { scenario: 6, tutorial: false });
      await t.game('act', 'panel', 'finances');
      await t.shot('02-large-text');
      await t.checkLayout();
      await t.game('act', 'mainStreet', 3, 9, 1);
      await t.game('act', 'autoPlace', 'bench');
      await t.game('act', 'loan', 10000);
      await t.game('act', 'hire', 'keeper', true);
      await t.page.waitForTimeout(100);
      const live = await t.page.textContent('#live');
      t.expect(live.length > 5, `live region: "${live}"`);
      await t.reload();
      s = await t.state();
      t.equal(s.settings.sound, false, 'sound setting persisted');
      t.equal(s.settings.text, 1.5, 'text size persisted');
    },
  },
  {
    name: 'touch targets are at least 44 px',
    viewports: ['mobile'],
    async run(t) {
      await t.seed(3);
      await t.game('newGame', { scenario: 6, tutorial: false });
      await t.game('act', 'panel', 'finances');
      const small = await t.page.$$eval('#hud button, #dock button, #panel button', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44); }).map((e) => e.textContent.trim().slice(0, 20)));
      t.equal(small.length, 0, `all buttons ≥ 44 px${small.length ? ': ' + small.join(', ') : ''}`);
    },
  },
];
