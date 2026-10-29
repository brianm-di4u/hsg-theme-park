// Weather, storms, the water calendar, the winter break, seasons and night.
import { park } from './helpers.mjs';

async function prebuilt(t, month = 3) {
  await t.seed(6);
  await t.game('newGame', { scenario: 6, tutorial: false });
  await t.game('setState', { month });
  await t.game('step', 400);
}

export const tests = [
  {
    name: 'weather: rain cuts arrivals; storms close tall, coaster and water rides',
    async run(t) {
      await prebuilt(t);
      await t.game('act', 'weather', 'sun', 90);
      const sun = await t.game('act', 'demand');
      await t.game('act', 'weather', 'rain', 78);
      const rain = await t.game('act', 'demand');
      t.expect(rain.n < sun.n * 0.7, `rain cuts expected guests (${sun.n} → ${rain.n})`);
      let s = await t.game('step', 60);
      t.expect(s.weather.kind === 'rain', 'raining');
      const g = await t.game('act', 'gate');
      await t.game('act', 'camera', g.x, g.y - 8, t.viewport === 'mobile' ? 0.8 : 1);
      await t.shot('01-rain');
      await t.game('act', 'weather', 'storm', 80);
      s = await t.state();
      const closed = s.objects.filter((o) => o.wx);
      t.expect(closed.some((o) => o.kind === 'track'), 'coasters closed for the storm');
      t.expect(closed.some((o) => o.type === 'wheel' || o.type === 'drop'), 'tall rides closed');
      t.expect(!closed.some((o) => o.type === 'carousel'), 'the carousel stays open');
      s = await t.game('step', 30);
      t.expect(s.objects.filter((o) => o.wx).every((o) => o.queue === 0), 'storm-closed rides have no lines');
      await t.shot('02-storm');
    },
  },
  {
    name: 'water calendar: daily May to mid-August, weekends to September',
    viewports: ['desktop'],
    async run(t) {
      await prebuilt(t);
      const cal = async (month, dow) => { await t.game('setState', { month, dow }); const s = await t.state(); return s.objects.find((o) => o.type === 'wave').cal; };
      t.equal(await cal(0, 2), false, 'April: closed');
      t.equal(await cal(1, 2), true, 'May weekday: open');
      t.equal(await cal(4, 1), true, 'early August weekday: open');
      t.equal(await cal(4, 3), false, 'late August weekday: closed');
      t.equal(await cal(4, 5), true, 'late August Saturday: open');
      t.equal(await cal(5, 2), false, 'September weekday: closed');
      t.equal(await cal(5, 6), true, 'September Sunday: open');
      t.equal(await cal(6, 6), false, 'October: closed');
    },
  },
  {
    name: 'calendar: month-end accounting, winter break, ride novelty ages',
    async run(t) {
      await t.seed(6);
      await t.game('newGame', { scenario: 5, tutorial: false });
      await t.game('setState', { month: 6 });
      // the dormant 2000 park has no open rides: refurbish two so the season has guests
      for (const o of (await t.state()).objects.filter((x) => x.status === 'standing').slice(0, 2)) await t.game('act', 'refurb', o.id);
      await t.game('setState', { dow: 5, hour: 10 });
      const before = (await t.state()).objects.map((o) => o.age);
      let s = await t.stepUntil((st) => st.pending === 'winter', { max: 2600, chunk: 100, label: 'winter' });
      t.equal(s.scene, 'winter', 'winter summary shown');
      const txt = await t.page.textContent('#screen');
      t.expect(/Winter 2000/.test(txt) && /Guests this season/.test(txt) && /Winter costs/.test(txt), 'winter summary lists the season');
      t.expect(!/Guests this seasons*0/.test(txt), 'the season had guests');
      await t.shot('03-winter');
      await t.checkLayout();
      await t.page.click('[data-act="spring"]');
      s = await t.state();
      t.equal(s.scene, 'park', 'back to the park');
      t.equal(s.month, 0, 'April');
      t.equal(s.year, 2001, 'next year');
      t.expect(s.objects.every((o, i) => o.age === before[i] + 1), 'every ride aged a season (novelty fades)');
    },
  },
  {
    name: 'seasons: spring redbuds, fall colours',
    async run(t) {
      await prebuilt(t, 0);
      const g = await t.game('act', 'gate');
      await t.game('act', 'camera', g.x - 4, g.y - 12, t.viewport === 'mobile' ? 0.8 : 1);
      await t.game('act', 'weather', 'sun', 75);
      await t.shot('04-spring');
      await t.game('setState', { month: 6 });
      await t.shot('05-fall');
    },
  },
  {
    name: 'night: lamps and ride lights after 7 pm',
    async run(t) {
      await prebuilt(t);
      await t.game('act', 'weather', 'sun', 85);
      await t.game('act', 'goto', { hour: 21 });
      const g = await t.game('act', 'gate');
      await t.game('act', 'camera', g.x, g.y - 8, t.viewport === 'mobile' ? 0.8 : 1);
      const s = await t.state();
      t.equal(s.hour, 21, '9 pm');
      await t.shot('06-night');
    },
  },
];
