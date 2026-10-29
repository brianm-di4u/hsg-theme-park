// Campaign: goals, the tutorial, a full scripted win of 1978, a foreclosure, stars, the sandbox.
import { click } from './helpers.mjs';

export const tests = [
  {
    name: 'scenario select and intro history card',
    async run(t) {
      await click(t, 'screen', 'campaign');
      const locked = await t.page.$$eval('.scard[disabled]', (els) => els.length);
      t.expect(locked >= 5, `later eras locked until earlier ones are won (${locked})`);
      await t.shot('01-select');
      await click(t, 'intro', '1');
      const txt = await t.page.textContent('#screen');
      t.expect(/Goals \(by October 1978\)/.test(txt) && /Welcome 4,000 guests/.test(txt), 'intro lists goals');
      t.expect((await t.page.$$('#screen .card .src')).length >= 3, 'history cards show sources');
      await t.shot('02-intro');
      await t.checkLayout();
    },
  },
  {
    name: 'tutorial walks through path, ride, food, restrooms, play, coaster',
    async run(t) {
      await t.seed(1);
      await t.game('newGame', { scenario: 1 });
      let s = await t.state();
      t.equal(s.tutorial, 0, 'tutorial step 1');
      t.expect(await t.page.isVisible('#tip'), 'tip shown');
      await t.shot('07-tutorial');
      await t.game('act', 'mainStreet', 12, 5, 6);
      await t.game('step', 1); s = await t.state();
      t.equal(s.tutorial, 1, 'paths done');
      await t.game('act', 'autoPlace', 'carousel'); await t.game('step', 1);
      t.equal((await t.state()).tutorial, 2, 'ride done');
      await t.game('act', 'autoPlace', 'bbq'); await t.game('step', 1);
      t.equal((await t.state()).tutorial, 3, 'food done');
      await t.game('act', 'autoPlace', 'restroom'); await t.game('act', 'autoPlace', 'refill'); await t.game('step', 1);
      t.equal((await t.state()).tutorial, 4, 'restrooms and drinks done');
      await click(t, 'speed', '1');
      await t.page.waitForTimeout(600);
      await click(t, 'pause');
      t.equal((await t.state()).tutorial, 5, 'play done');
      await t.game('act', 'autoBlueprint', 'lumber'); await t.game('step', 1);
      t.equal((await t.state()).tutorial, 6, 'coaster done');
      await t.game('act', 'panel', 'goals');
      await t.game('step', 1);
      s = await t.state();
      t.equal(s.tutorial, null, 'tutorial complete');
      await t.shot('03-goals');
      await t.checkLayout();
    },
  },
  {
    name: 'win 1978 with a scripted plan; stars saved; next era unlocks',
    viewports: ['desktop'],
    async run(t) {
      await t.seed(1);
      await t.game('newGame', { scenario: 1, tutorial: false });
      await t.game('act', 'research', 1);
      await t.game('act', 'admission', 10);
      await t.game('act', 'mainStreet', 14, 5, 6);
      for (const r of ['carousel', 'planes', 'bbq', 'refill', 'restroom', 'trash', 'bench', 'funnel']) await t.game('act', 'autoPlace', r);
      await t.game('act', 'autoBlueprint', 'lumber');
      for (const r of ['flowers', 'redbud', 'lamp', 'trash']) await t.game('act', 'autoPlace', r);
      await t.game('step', 7 * 1200);
      await t.game('act', 'hire', 'keeper', true);
      await t.game('act', 'autoPlace', 'wheel');
      await t.game('step', 7 * 1200);
      await t.game('act', 'autoBlueprint', 'littlebear');
      await t.game('act', 'autoPlace', 'pizza');
      const s = await t.stepUntil((st) => st.pending === 'win' || st.pending === 'lose', { max: 6 * 7 * 1200, chunk: 2400, label: 'scenario end' });
      t.equal(s.scenario.status, 'won', `1978 won (${s.scenario.why})`);
      t.equal(s.scene, 'win', 'win screen');
      t.expect(s.stars[1] >= 1, `stars saved (${s.stars[1]})`);
      await t.shot('04-win');
      await t.checkLayout();
      await t.page.click('[data-act="screen"][data-arg="title"]');
      await click(t, 'screen', 'campaign');
      t.expect(!(await t.page.$('.scard[data-arg="2"][disabled]')), '1984 unlocked');
    },
  },
  {
    name: 'lose: the bank forecloses after two month-ends deep in debt',
    async run(t) {
      await t.seed(1);
      await t.game('newGame', { scenario: 2, tutorial: false });
      await t.game('setState', { cash: -90000 });
      const s = await t.stepUntil((st) => st.pending === 'lose', { max: 3 * 7 * 1200, chunk: 1200, label: 'foreclosure' });
      t.equal(s.scenario.status, 'lost', 'lost');
      t.expect(/foreclosed/.test(s.scenario.why), s.scenario.why);
      t.equal(s.scene, 'lose', 'lose screen');
      await t.shot('05-lose');
      await t.checkLayout();
    },
  },
  {
    name: 'sandbox: options, everything unlocked, no goals',
    async run(t) {
      await click(t, 'screen', 'sandbox');
      await click(t, 'sbx', 'hills:steep');
      await click(t, 'sbx', 'cash:unlimited');
      await t.shot('06-sandbox');
      await t.checkLayout();
      await click(t, 'playSandbox');
      const s = await t.state();
      t.equal(s.scene, 'park', 'sandbox park');
      t.expect(s.cash >= 1e6, 'unlimited cash');
      await click(t, 'tool', 'rides');
      const txt = await t.page.textContent('#panel');
      t.expect(!/needs research/.test(txt), 'everything unlocked');
      await t.game('act', 'panel', 'goals');
      t.expect(/No goals/.test(await t.page.textContent('#panel')), 'no goals');
    },
  },
];
