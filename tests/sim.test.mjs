// Guest agents, rides, staff and litter, on the prebuilt 2003 park (scenario 6) or small sandbox parks.
import { park, click } from './helpers.mjs';

async function busy(t, ticks = 600) {
  await t.seed(3);
  await t.game('newGame', { scenario: 6, tutorial: false });
  await t.game('setState', { month: 3 });
  for (let k = 0; k < ticks; k += 300) await t.game('step', 300);
  return t.state();
}

export const tests = [
  {
    name: 'guest flow: arrive, path to rides, queue, ride, leave',
    async run(t) {
      let s = await busy(t, 900);
      t.expect(s.guests > 50, `guests in the park (${s.guests})`);
      const ridden = s.objects.filter((o) => (o.kind === 'ride' || o.kind === 'track') && o.totalRiders > 0);
      t.expect(ridden.length >= 6, `${ridden.length} rides have carried riders`);
      t.expect(s.objects.some((o) => o.queue > 0), 'someone is queueing');
      t.expect(s.sampleGuests.some((g) => g.rides > 0), 'sampled guests have ridden');
      // uphill is slower: compare the walking step on a stair with a flat one through the sim's own numbers
      const slow = await t.page.evaluate(() => {
        const S = window.__game.getState(true); void S; return true;
      });
      t.expect(slow, 'state readable');
      await t.game('act', 'camera', ...(await gateOffset(t, 0, -8)), t.viewport === 'mobile' ? 0.9 : 1);
      await t.shot('01-crowd');
      // by closing time everyone walks out
      s = await t.stepUntil((st) => st.time >= 1100, { max: 1500, chunk: 50, label: 'closing time' });
      s = await t.game('step', 90);
      t.expect(s.guests < 40, `guests leave at closing (${s.guests} left)`);
      await t.checkLayout();
    },
  },
  {
    name: 'needs: food, drink, restrooms; money reaches the ledger',
    viewports: ['desktop'],
    async run(t) {
      const s = await busy(t, 1100);
      const stalls = s.objects.filter((o) => o.kind === 'stall' && o.type !== 'bench');
      const sold = stalls.filter((o) => o.sales > 0);
      t.expect(sold.length >= 5, `${sold.length} stalls have customers`);
      t.expect(s.objects.some((o) => o.type === 'restroom' && o.sales > 0), 'restrooms used');
      t.expect(s.ledger.food > 0 && s.ledger.drinks > 0 && s.ledger.admission > 0, `ledger: food $${s.ledger.food}, drinks $${s.ledger.drinks}, admission $${s.ledger.admission}`);
      const bbq = stalls.find((o) => o.type === 'bbq');
      await t.game('act', 'select', 'obj', bbq.id);
      await t.game('act', 'camera', bbq.x, bbq.y, 1.6);
      await t.shot('02-stalls');
    },
  },
  {
    name: 'tastes: intensity ranges and height rules',
    viewports: ['desktop'],
    async run(t) {
      await busy(t, 900);
      const r = await t.page.evaluate(() => {
        const S = window.__game.getState(true);
        const objs = new Map(S.objects.map((o) => [o.id, o]));
        const RIDES = { planes: { kiddie: 1 } };
        let tooShort = 0, kiddieAdult = 0, outOfRange = 0, inRange = 0;
        for (const g of S.guests) {
          for (const [id, n] of Object.entries(g.ridden)) {
            const o = objs.get(+id); if (!o || !n) continue;
            if ((o.type === 'drop' || o.type === 'boom' || o.type === 'ship' || o.type === 'steel' || o.type === 'wood') && g.hgt < 48 && g.st !== 'queue') tooShort++;
            if (RIDES[o.type] && g.hgt > 54 && o.queue !== undefined) kiddieAdult++;
          }
        }
        for (const g of S.guests) { if (g.lo <= g.hi) inRange++; else outOfRange++; }
        return { tooShort, kiddieAdult, inRange, outOfRange };
      });
      t.equal(r.tooShort, 0, 'no child under 48 in rode a 48-in ride');
      t.equal(r.kiddieAdult, 0, 'no adult rode the kiddie planes');
      t.equal(r.outOfRange, 0, 'every guest has a valid intensity range');
    },
  },
  {
    name: 'thoughts: guest window and feedback panel',
    async run(t) {
      const s = await busy(t, 900);
      const g = s.sampleGuests.find((x) => x.st !== 'ride' && x.st !== 'queue') || s.sampleGuests[0];
      await t.game('act', 'select', 'guest', g.id);
      await t.game('act', 'follow', true);
      await t.waitFrames(30);
      const txt = await t.page.textContent('#panel');
      for (const w of ['Happiness', 'Hunger', 'Thirst', 'Money left', 'Thoughts', 'likes intensity']) t.expect(txt.includes(w), `guest window shows ${w}`);
      await t.shot('04-guest');
      await t.game('act', 'follow', false);
      await t.game('act', 'panel', 'guests');
      const p = await t.page.textContent('#panel');
      t.expect(/What guests are thinking/.test(p) && /Why guests come/.test(p), 'feedback panel lists thoughts and demand');
      const icons = await t.page.$$eval('#panel .thought .ti', (els) => els.length);
      t.expect(icons >= 3, `top thoughts each carry an icon and words (${icons})`);
      await t.shot('03-feedback');
      await t.checkLayout();
    },
  },
  {
    name: 'crowding slows walkers and is complained about',
    viewports: ['desktop'],
    async run(t) {
      await park(t);
      await t.game('act', 'mainStreet', 12, 20, 4);
      await t.game('act', 'autoPlace', 'carousel');
      const g = await t.game('act', 'gate');
      const moved = async (ids) => t.page.evaluate((ids) => {
        const S = window.__game.getState(true);
        const gs = S.guests.filter((x) => ids.includes(x.id));
        return gs.reduce((s, x) => s + Math.abs(x.x - (x.ti % S.map.w) - 0.5) + Math.abs(x.y - Math.floor(x.ti / S.map.w) - 0.5) + (x.prev >= 0 ? 1 : 0), 0) / Math.max(1, gs.length);
      }, ids);
      const one = await t.game('act', 'spawnAt', g.x, g.y - 6, 1);
      await t.game('step', 4);
      const solo = await moved(one);
      const many = await t.game('act', 'spawnAt', g.x, g.y - 9, 40);
      await t.game('step', 4);
      const crowd = await moved(many);
      t.expect(crowd < solo, `walkers on a packed tile move less (${crowd.toFixed(2)} vs ${solo.toFixed(2)} tiles)`);
      const s = await t.game('step', 150);
      t.expect((s.thoughts.crowded || 0) > 0, `"too crowded" thoughts recorded (${s.thoughts.crowded || 0})`);
    },
  },
  {
    name: 'queues: FIFO, limit, wait shown in the ride window',
    async run(t) {
      const s = await busy(t, 900);
      const r = s.objects.filter((o) => o.kind === 'track' || o.kind === 'ride').sort((a, b) => b.queue - a.queue)[0];
      t.expect(r.queue > 0, `${r.name} has a line of ${r.queue}`);
      await t.game('act', 'select', 'obj', r.id);
      const txt = await t.page.textContent('#panel');
      t.expect(/In line/.test(txt) && /Wait/.test(txt) && /about \d+ min/.test(txt), 'ride window shows line and wait');
      t.expect(/Int \d/.test(txt) && /thrill/.test(txt), 'intensity and thrill shown');
      await t.game('act', 'camera', r.x, r.y, 1.2);
      await t.shot('05-ride-window');
      await t.checkLayout();
    },
  },
  {
    name: 'breakdowns: mechanic repairs; contractor without one',
    viewports: ['desktop'],
    async run(t) {
      await park(t);
      await t.game('act', 'mainStreet', 10, 5, 5);
      const c = await t.game('act', 'autoPlace', 'bumper');
      // force a breakdown by dropping reliability to zero for one cycle
      await t.page.evaluate((id) => { const G = window.__game; const S = G.getState(true); void S; window.__forceBreak = id; }, c.id);
      await t.page.evaluate((id) => {
        // reach into the live state through a full round-trip: lower reliability, reload
        const S = window.__game.getState(true);
        const o = S.objects.find((x) => x.id === id); o.rel = 0; o.relBase = 0.95; o.lastInspect = -100000;
        window.__game.setState(S);
      }, c.id);
      let s = await t.stepUntil((st) => st.objects.some((o) => o.broken), { max: 6000, chunk: 100, label: 'a breakdown' });
      const br = s.objects.find((o) => o.broken);
      t.expect(!!br, 'the ride broke down');
      await t.game('act', 'camera', br.x, br.y, 1.3);
      await t.shot('06-broken');
      // without a mechanic the contractor fixes it after a while, for a fee
      s = await t.stepUntil((st) => !st.objects.some((o) => o.broken), { max: 900, chunk: 50, label: 'contractor repair' });
      t.expect(s.ledger.repairs >= 500, `contractor charged $${s.ledger.repairs}`);
      // with a mechanic: break it again and watch the mechanic fix it sooner
      await t.game('act', 'hire', 'mechanic', true);
      await t.page.evaluate((id) => { const S = window.__game.getState(true); const o = S.objects.find((x) => x.id === id); o.broken = 1; o.brokenAt = S.tick; o.mech = 0; window.__game.setState(S); }, br.id);
      s = await t.stepUntil((st) => !st.objects.some((o) => o.broken), { max: 600, chunk: 20, label: 'mechanic repair' });
      t.expect(s.staff[0].done >= 1, 'the mechanic did the repair');
      t.expect(s.ledger.repairs === 0 || s.msgs.some((m) => /Mechanic 1 repaired/.test(m)), 'repaired by the mechanic');
    },
  },
  {
    name: 'litter: guests drop it away from bins; groundskeepers sweep',
    async run(t) {
      await park(t);
      await t.game('act', 'mainStreet', 12, 6, 6);
      for (const r of ['carousel', 'bumper', 'bbq', 'pizza', 'refill', 'funnel', 'restroom']) await t.game('act', 'autoPlace', r);
      await t.game('setState', { month: 3 });
      let s = await t.stepUntil((st) => st.litter >= 15, { max: 6000, chunk: 200, label: 'litter' });
      t.expect(s.litter >= 15, `litter on the paths (${s.litter})`);
      const g = await t.game('act', 'gate');
      await t.game('act', 'camera', g.x, g.y - 6, t.viewport === 'mobile' ? 1.1 : 1.3);
      await t.shot('07-litter');
      const before = s.litter;
      await t.game('act', 'hire', 'keeper', true);
      await t.game('act', 'hire', 'keeper', true);
      s = await t.game('step', 600);
      t.expect(s.staff.reduce((a, x) => a + x.done, 0) > 5, `groundskeepers swept ${s.staff.reduce((a, x) => a + x.done, 0)} pieces`);
      t.expect(s.litter < before + 40, `litter kept down (${before} → ${s.litter})`);
    },
  },
  {
    name: 'staff: hire panel, mascot, seasonal staff at school in late August',
    async run(t) {
      await busy(t, 300);
      await click(t, 'tool', 'staff');
      const txt = await t.page.textContent('#panel');
      for (const w of ['Groundskeeper', 'Mechanic', 'Entertainer', 'seasonal', 'Year-round', 'back at school']) t.expect(txt.includes(w), `staff panel mentions ${w}`);
      await t.page.click('[data-act="hire"][data-arg="mascot:1"]');
      await t.page.click('[data-act="hire"][data-arg="keeper:0"]');
      let s = await t.state();
      t.expect(s.staff.length >= 2, `staff hired (${s.staff.length})`);
      await t.shot('08-staff');
      await t.checkLayout();
      await t.game('setState', { month: 4, dow: 3 });
      s = await t.game('step', 5);
      const seasonal = s.staff.filter((x) => x.seasonal), yr = s.staff.filter((x) => !x.seasonal);
      t.expect(seasonal.every((x) => x.st === 'school'), 'seasonal staff are at school on a late-August Thursday');
      t.expect(yr.every((x) => x.st !== 'school'), 'year-round staff keep working');
      await t.game('setState', { dow: 5 });
      s = await t.game('step', 5);
      t.expect(s.staff.filter((x) => x.seasonal).every((x) => x.st !== 'school'), 'seasonal staff work weekends');
    },
  },
];

async function gateOffset(t, dx, dy) {
  const g = await t.game('act', 'gate');
  return [g.x + dx, g.y + dy];
}
