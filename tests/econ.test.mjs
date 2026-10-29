// Prices, finances, rating, marketing, research, concerts and the used-ride market.
import { park, click } from './helpers.mjs';

async function small(t) {
  await park(t);
  await t.game('act', 'mainStreet', 12, 5, 6);
  for (const r of ['carousel', 'bumper', 'swings', 'bbq', 'refill', 'restroom']) await t.game('act', 'autoPlace', r);
  await t.game('setState', { month: 2 });
}

export const tests = [
  {
    name: 'ride ops: price, pay per ride, up-charge, open and close',
    viewports: ['desktop'],
    async run(t) {
      await small(t);
      const s0 = await t.state();
      const car = s0.objects.find((o) => o.type === 'carousel');
      await t.game('act', 'select', 'obj', car.id);
      await click(t, 'price', '1');
      t.equal((await t.state()).objects.find((o) => o.id === car.id).price, car.price + 1, 'price button raises the price');
      await t.game('step', 400);
      t.equal((await t.state()).ledger.rides, 0, 'pay-one-price: no ride income');
      const sky = await t.game('act', 'autoPlace', 'sky');
      t.expect(sky.ok, 'Sky Swing placed');
      let s = await t.game('step', 500);
      t.expect(s.ledger.rides > 0, `up-charge ride earns even with pay-one-price ($${s.ledger.rides})`);
      await t.game('act', 'payPerRide', true);
      const before = s.ledger.rides;
      s = await t.game('step', 500);
      t.expect(s.ledger.rides > before + 20, 'pay-per-ride charges every ride');
      await t.game('act', 'select', 'obj', car.id);
      await click(t, 'rideOpen');
      s = await t.state();
      t.equal(s.objects.find((o) => o.id === car.id).status, 'closed', 'ride closed from its window');
      s = await t.game('step', 50);
      t.equal(s.objects.find((o) => o.id === car.id).queue, 0, 'a closed ride has no line');
    },
  },
  {
    name: 'finances: ledger, loan, chart',
    async run(t) {
      await small(t);
      await t.game('step', 7 * 1200 + 10);
      await t.game('act', 'panel', 'finances');
      let s = await t.state();
      t.expect(s.months >= 1, 'a month closed');
      const cash = s.cash, loan = s.loan;
      await click(t, 'loan', '10000');
      s = await t.state();
      t.equal(s.loan, loan + 10000, 'borrowed $10,000');
      t.equal(s.cash, cash + 10000, 'cash rose by $10,000');
      await click(t, 'loan', '-10000');
      t.equal((await t.state()).loan, loan, 'repaid');
      const txt = await t.page.textContent('#panel');
      for (const w of ['Admission', 'Pay per ride', 'Cooler Sundays', 'Monthly costs', 'Upkeep', 'Wages', 'This month', 'This season', 'Profit']) t.expect(txt.includes(w), `finances show ${w}`);
      t.expect((await t.page.$$('#panel svg.chart rect')).length >= 1, 'profit chart drawn');
      await t.shot('01-finances');
      await t.checkLayout();
    },
  },
  {
    name: 'rating: components and its pull on arrivals',
    async run(t) {
      await small(t);
      await t.game('step', 600);
      await t.game('act', 'panel', 'rating');
      const txt = await t.page.textContent('#panel');
      for (const w of ['Happiness', 'Variety', 'Excitement', 'Scenery', 'Capacity', 'Litter']) t.expect(txt.includes(w), `rating shows ${w}`);
      await t.shot('02-rating');
      await t.game('setState', { rating: 300 });
      const lo = await t.game('act', 'demand');
      await t.game('setState', { rating: 800 });
      const hi = await t.game('act', 'demand');
      t.expect(hi.n > lo.n * 1.5, `rating 800 brings more guests than 300 (${hi.n} vs ${lo.n})`);
    },
  },
  {
    name: 'marketing, Cooler Sundays, School Days, Fright Nights',
    async run(t) {
      await small(t);
      const base = await t.game('act', 'demand');
      await click(t, 'tool', 'park');
      await click(t, 'panel', 'marketing');
      await click(t, 'campaign', 'billboard');
      let d = await t.game('act', 'demand');
      t.expect(Math.abs(d.mk - 1.15) < 0.001, 'billboards +15%');
      t.expect(d.n > base.n, 'more expected guests');
      await t.shot('03-marketing');
      await t.checkLayout();
      let r = await t.game('act', 'market', 'school');
      t.expect(!r.ok, 'School Days refused outside May');
      await t.game('setState', { month: 1, dow: 1 });
      r = await t.game('act', 'market', 'school');
      t.expect(r.ok, 'School Days run in May');
      d = await t.game('act', 'demand');
      t.expect(d.dowF > 0.75 * 1.3, `May weekday boost (${d.dowF})`);
      await t.game('setState', { month: 2, dow: 6 });
      const sun = await t.game('act', 'demand');
      await t.game('act', 'cooler', true);
      const cool = await t.game('act', 'demand');
      t.expect(cool.dowF > sun.dowF, `Cooler Sundays raise Sunday arrivals (${sun.dowF} → ${cool.dowF})`);
      await t.game('setState', { month: 6, dow: 0 });
      r = await t.game('act', 'market', 'fright');
      t.expect(r.ok, 'Fright Nights run in October');
      d = await t.game('act', 'demand');
      t.expect(d.monthF > 1, `October boost (${d.monthF})`);
    },
  },
  {
    name: 'research unlocks in order',
    async run(t) {
      await t.seed(2);
      await t.game('newGame', { scenario: 1, tutorial: false });
      await t.game('act', 'tool', 'rides');
      let txt = await t.page.textContent('#panel');
      t.expect(/needs research/.test(txt), 'locked rides marked "needs research"');
      await t.game('act', 'panel', 'research');
      await click(t, 'research', '3');
      await t.shot('04-research');
      let s = await t.state();
      t.equal(s.research.level, 3, 'budget set to high');
      s = await t.game('step', 7 * 1200 + 5);
      t.expect(s.research.unlocked.includes('cups'), 'Spin Cups researched after a month on high');
      await t.checkLayout();
    },
  },
  {
    name: 'concerts: Saturday show, fans attend, seat sales',
    async run(t) {
      await t.seed(4);
      await t.game('newGame', { scenario: 6, tutorial: false });
      await t.game('setState', { month: 3 });
      const a = await t.game('act', 'autoPlace', 'amphi');
      t.expect(a.ok, 'amphitheater placed');
      await t.game('act', 'panel', 'concerts');
      await click(t, 'book', 'head');
      let s = await t.state();
      t.expect(s.concert && s.concert.act === 'head', `headliner booked (${s.concert && s.concert.band})`);
      t.expect(s.ledger.acts === 18000, 'act fee charged');
      s = await t.stepUntil((st) => st.objects.some((o) => o.type === 'amphi' && o.income > 0) && st.dow === 5 && st.time >= 1000, { max: 7 * 1200, chunk: 100, label: 'Saturday show' });
      t.expect(s.objects.find((o) => o.type === 'amphi').income > 0, 'seat sales at the show');
      await t.game('act', 'select', 'obj', a.id);
      await t.game('act', 'panel', null);
      await t.game('act', 'camera', a.x + 2, a.y + 2, t.viewport === 'mobile' ? 0.9 : 1.2);
      await t.shot('05-concert');
    },
  },
  {
    name: 'used-ride market with fictional provenance',
    async run(t) {
      await t.seed(5);
      await t.game('newGame', { scenario: 3, tutorial: false });
      await t.game('act', 'panel', 'market');
      const txt = await t.page.textContent('#panel');
      t.expect(txt.includes('$10,000 to buy') && /fictional/i.test(txt), 'woodie listed for $10,000 with fictional provenance');
      await t.shot('06-market');
      await t.checkLayout();
      let r = { ok: false };
      for (let skip = 0; skip < 80 && !r.ok; skip += 4) {
        const sp = await t.game('act', 'stationSpot', 'wood', skip);
        if (!sp) continue;
        for (const m of [false, true]) { if (!r.ok) r = await t.game('act', 'buyUsed', 0, sp.x, sp.y, sp.dir, m); }
      }
      const s = await t.state();
      const woodie = s.objects.find((o) => o.type === 'wood' && o.name === 'Old Timber');
      t.expect(r.ok && !!woodie, `used coaster built (${r.reason || 'ok'})`);
      if (woodie) {
        t.equal(woodie.cost, 100000, 'paid $10,000 plus $90,000 relocation');
        t.expect(woodie.rel < 0.93, `used ride reliability lower (${woodie.rel})`);
      }
      t.expect(s.market[0].sold, 'listing marked sold');
    },
  },
];
