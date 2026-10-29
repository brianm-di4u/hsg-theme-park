#!/usr/bin/env node
// Runs the real sim headless in Node. Scripted players build each campaign scenario with the same
// actions the UI uses; the report covers guests, satisfaction, profit, whether and when each scenario
// is won, and the cost of guests and pathfinding per tick. Exit 1 if a metric leaves its band.
//   node tools/balance.mjs            all scenarios + the stress park
//   node tools/balance.mjs 3 --v      one scenario, monthly detail
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const imp = (f) => import(pathToFileURL(path.join(here, '../src/js', f)).href);
const { newState } = await imp('scenarios.js');
const { tick, act, perf } = await imp('sim.js');
const { mainStreet, autoPlace, autoBlueprint, autoScenery, smartPath, gateXY } = await imp('plan.js');
const { fieldStats } = await imp('fields.js');
const { DAY } = await imp('state.js');
const { INCOME_KEYS, COST_KEYS } = await imp('state.js');
const { goalValue } = await imp('world.js');

const args = process.argv.slice(2);
const only = args.find((a) => /^\d+$/.test(a));
const verbose = args.includes('--v');

// ---- scripted players -------------------------------------------------------------------------
const hireN = (S, role, n) => { while (S.staff.filter((s) => s.role === role).length < n) act(S, 'hire', role, true); };
const repay = (S, keep) => { if (S.finance.loan > 0 && S.finance.cash > keep) act(S, 'loan', -Math.min(S.finance.loan, Math.floor((S.finance.cash - keep) / 1000) * 1000)); };
const can = (S, n) => S.finance.cash > n;
const placeAll = (S, list) => { for (const t of list) { const r = t.startsWith('bp:') ? autoBlueprint(S, t.slice(3)) : autoPlace(S, t); if (!r.ok && verbose) console.log('   could not place', t, r.reason); } };
const has = (S, t) => S.objects.some((o) => o.type === t);

const PLANS = {
  1: (S, m, y) => {
    if (y === 1978 && m === 0) {
      act(S, 'research', 1); act(S, 'admission', 10);
      mainStreet(S, 14, 5, 6);
      placeAll(S, ['carousel', 'planes', 'bbq', 'refill', 'restroom', 'bp:lumber', 'trash', 'bench', 'funnel']);
      autoScenery(S, 8, ['trash', 'flowers', 'trash', 'redbud', 'lamp']);
    }
    if (m === 1) { hireN(S, 'keeper', 1); if (can(S, 18000)) placeAll(S, ['wheel']); }
    if (m === 2 && can(S, 12000)) placeAll(S, ['bp:littlebear', 'pizza']);
    if (m === 3 && can(S, 20000)) { placeAll(S, ['tower', 'snocone']); hireN(S, 'mechanic', 1); }
    if (m === 4 && can(S, 10000)) placeAll(S, ['cups', 'souvenir']);
  },
  2: (S, m, y) => {
    if (y === 1984 && m === 0) { hireN(S, 'mechanic', 1); hireN(S, 'keeper', 1); act(S, 'admission', 14); act(S, 'research', 0); autoScenery(S, 6, ['trash', 'bench', 'trash']); }
    if (y === 1984 && m === 1 && can(S, 12000)) placeAll(S, ['swings']);
    if (y === 1985 && m === 0) { act(S, 'market', 'billboard'); }
    repay(S, 12000);
  },
  3: (S, m, y) => {
    if (m === 0) {
      const L = S.park.market[0];
      const r = autoBlueprint(S, L.bp, { cost: L.price + L.reloc, rel: L.rel, name: 'Old Timber' });
      if (r.ok) L.sold = true; else if (verbose) console.log('   used coaster did not fit:', r.reason);
      hireN(S, 'mechanic', 1); hireN(S, 'keeper', 2); act(S, 'admission', 15);
      placeAll(S, ['chicken', 'restroom', 'trash', 'bench']);
      act(S, 'market', 'billboard');
    }
    if (m === 2 && can(S, 25000)) placeAll(S, ['ship', 'snocone']);
    if (m === 3 && can(S, 10000)) autoScenery(S, 8);
  },
  4: (S, m, y) => {
    if (m === 0) { hireN(S, 'mechanic', 1); hireN(S, 'keeper', 2); act(S, 'research', 0); act(S, 'admission', 13); autoScenery(S, 8, ['trash', 'flowers', 'trash', 'bench']); }
    if (m === 1) act(S, 'market', 'school');
    if (m === 2 && can(S, 8000)) placeAll(S, ['chicken', 'restroom']);
  },
  5: (S, m, y) => {
    if (y === 2000 && m === 0) {
      for (const o of S.objects.filter((o) => o.status === 'standing' && ['carousel', 'wheel', 'family', 'wood'].includes(o.type))) act(S, 'refurb', o.id);
      smartPath(S, ...extend(S));
      placeAll(S, ['wave', 'river', 'slides', 'snocone', 'pizza', 'restroom', 'chicken', 'trash', 'bench', 'trash']);
      hireN(S, 'mechanic', 1); hireN(S, 'keeper', 3); act(S, 'research', 2);
      autoScenery(S, 10);
    }
    if (y === 2000 && m === 2 && can(S, 30000)) placeAll(S, ['ship', 'drop']);
    if (y === 2001 && m === 0) {
      placeAll(S, ['bp:screamer', 'complex', 'racer']);
      hireN(S, 'mascot', 1);
      act(S, 'market', 'radio');
    }
    if (y === 2001 && m === 2 && can(S, 30000)) placeAll(S, ['surf', 'splash', 'boom']);
  },
  6: (S, m, y) => {
    if (m === 0) {
      smartPath(S, ...extend(S));
      placeAll(S, ['amphi', 'bp:screamer', 'restroom', 'chicken', 'trash', 'bench']);
      hireN(S, 'mechanic', 2); hireN(S, 'keeper', 3); hireN(S, 'mascot', 1);
      autoScenery(S, 8, ['trash', 'flowers', 'trash', 'lamp']);
    }
    if (m >= 1 && m <= 5) act(S, 'book', m >= 2 && m <= 4 ? 'head' : 'regional');
    if (m === 2 && can(S, 30000)) placeAll(S, ['boom', 'river']);
  },
};
// a new side street at the top of the main street, for room
function extend(S) { const [gx, gy] = gateXY(S); return [gx, gy - 16, gx + 9, gy - 16]; }

function runScenario(id) {
  const S = newState({ scenario: id, noTutorial: true });
  const plan = PLANS[id];
  const rec = { id, title: S.scenario.title, months: [], won: null, when: null };
  let lastMonth = -1, lastYear = S.year, guard = 0;
  const startYear = S.year;
  plan(S, 0, S.year);
  while (guard++ < 5 * 49 * DAY) {
    if (S.pending) {
      if (S.pending.kind === 'winter') { act(S, 'continue'); lastMonth = -1; plan(S, 0, S.year); continue; }
      break;
    }
    tick(S);
    if (S.month !== lastMonth || S.year !== lastYear) {
      if (lastMonth >= 0 || S.year !== lastYear) {
        const F = S.finance.months[S.finance.months.length - 1];
        if (F) rec.months.push({ y: F.y, m: F.m, guests: F.guests, cash: F.cash, loan: F.loan, rating: F.rating, concerts: F.concerts, profit: INCOME_KEYS.reduce((s, k) => s + F[k], 0) - COST_KEYS.reduce((s, k) => s + F[k], 0) });
      }
      lastMonth = S.month; lastYear = S.year;
      if (S.month > 0 && S.month <= 6) plan(S, S.month, S.year);
    }
  }
  rec.won = S.scenario.status === 'won';
  rec.status = S.scenario.status; rec.why = S.scenario.why;
  rec.when = S.scenario.endedAt ? `${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'season end'][Math.min(7, S.scenario.endedAt.month)]} ${S.scenario.endedAt.year}` : '-';
  rec.stars = S.scenario.stars;
  rec.goals = S.scenario.goals.map((g, i) => `${g.label}: ${goalValue(S, g)}${S.scenario.final ? (S.scenario.final[i] ? ' ✔' : ' ✖') : ''}`);
  rec.seasons = S.finance.seasons.map((s) => ({ y: s.y, guests: s.guests, rating: s.rating, profit: Math.round(INCOME_KEYS.reduce((a, k) => a + s[k], 0) - COST_KEYS.filter((k) => k !== 'construction').reduce((a, k) => a + s[k], 0)) }));
  rec.objects = S.objects.filter((o) => o.kind === 'ride' || o.kind === 'track').length;
  rec.S = S; rec.startYear = startYear;
  return rec;
}

// ---- guest metrics from one built park -----------------------------------------------------------
function guestMetrics(S, days = 7) {
  const out = { visits: 0, rides: 0, food: 0, drinks: 0, stayH: 0, happyExit: 0, peak: 0 };
  const seen = new Map();
  for (let d = 0; d < days; d++) {
    for (let t = 0; t < DAY; t++) {
      tick(S);
      for (const g of S.guests) seen.set(g.id, g);
      out.peak = Math.max(out.peak, S.guests.length);
      if (S.pending) act(S, 'continue');
    }
  }
  for (const g of seen.values()) { out.visits++; out.rides += g.rides; out.stayH += (Math.min(DAY, g.arr + g.stay) - g.arr) / 100; out.happyExit += g.happy; }
  out.rides /= Math.max(1, out.visits); out.stayH /= Math.max(1, out.visits); out.happyExit /= Math.max(1, out.visits);
  return out;
}

// ---- stress park: a big sandbox for the 500-guest budget -------------------------------------
function stressPark() {
  const S = newState({ mode: 'sandbox', cash: 'unlimited', seed: 11, hills: 'rolling' });
  mainStreet(S, 22, 4, 10);
  placeAll(S, ['carousel', 'wheel', 'bumper', 'swings', 'ship', 'drop', 'boom', 'cups', 'planes', 'tower', 'wave', 'river', 'slides', 'complex', 'racer', 'splash', 'bp:screamer', 'bp:ridge', 'bp:littlebear', 'bp:lumber', 'bbq', 'pizza', 'chicken', 'funnel', 'refill', 'snocone', 'souvenir', 'restroom', 'restroom', 'restroom', 'bbq', 'refill']);
  autoScenery(S, 30);
  for (const r of ['keeper', 'keeper', 'keeper', 'keeper', 'keeper', 'mechanic', 'mechanic', 'mascot']) act(S, 'hire', r, false);
  S.park.rating = 750; S.month = 3; S.park.admission = 22;
  act(S, 'market', 'radio');
  return S;
}

// ---- report ---------------------------------------------------------------------------------
const BANDS = [];
const band = (name, v, lo, hi) => { BANDS.push({ name, v, lo, hi, ok: v >= lo && v <= hi }); };
const fmt = (n) => (typeof n === 'number' ? (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : +n.toFixed(2)) : n);

const ids = only ? [+only] : [1, 2, 3, 4, 5, 6];
const t0 = Date.now();
console.log('Scenario results (scripted players)');
console.log('| # | Scenario | Result | When | Stars | Seasons (guests / rating / operating profit) |');
console.log('|---|---|---|---|---|---|');
const recs = [];
for (const id of ids) {
  const r = runScenario(id);
  recs.push(r);
  console.log(`| ${id} | ${r.title} | ${r.status}${r.won ? '' : ' (' + r.why + ')'} | ${r.when} | ${r.stars || 0} | ${r.seasons.map((s) => `${s.y}: ${s.guests} / ${s.rating} / $${fmt(s.profit)}`).join('; ')} |`);
  if (verbose) {
    for (const m of r.months) console.log(`   ${m.y} ${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][m.m]} guests ${m.guests} rating ${m.rating} seats $${m.concerts} cash $${fmt(m.cash)} loan $${fmt(m.loan)} profit $${fmt(m.profit)}`);
    console.log('   goals:', r.goals.join(' | '));
  }
  band(`scenario ${id} won by the scripted player`, r.won ? 1 : 0, 1, 1);
}

if (!only) {
  // a fresh copy of scenario 1's finished park keeps running a summer week for guest metrics
  const s1 = recs.find((r) => r.id === 1);
  if (s1) {
    const S = s1.S; S.pending = null; S.month = 3; S.dow = 0;
    const g = guestMetrics(S, 7);
    console.log(`\nSmall park (scenario 1's park, a July week): ${g.visits} visits, peak ${g.peak}, rides/visit ${fmt(g.rides)}, stay ${fmt(g.stayH)} h, happiness ${fmt(g.happyExit)}, rating ${Math.round(S.park.rating)}`);
    band('small park: rides per visit', g.rides, 2.5, 7);
    band('small park: average happiness', g.happyExit, 55, 85);
    band('small park: rating', S.park.rating, 450, 700);
    band('small park: guests per July day', g.visits / 7, 50, 250);
  }
  // novelty decay: scenario 1's park, unchanged, one more full season
  {
    const S = newState({ scenario: 1, noTutorial: true });
    S.scenario.status = 'free'; // goals off: just measure attendance
    for (let m = 0; m < 5; m++) PLANS[1](S, m, 1978); // the whole park on opening day
    const seasons = [];
    for (let y = 0; y < 2; y++) {
      while (!S.pending) tick(S);
      seasons.push(S.pending.season.guests); act(S, 'continue');
    }
    if (seasons.length === 2) { const ratio = seasons[1] / seasons[0]; console.log(`Novelty decay, no new rides: ${seasons[0]} → ${seasons[1]} guests (${Math.round(ratio * 100)}%)`); band('year-two attendance without new rides (% of year one)', ratio * 100, 65, 90); }
  }
  // stress park
  const S = stressPark();
  perf.guestMs = 0; perf.ticks = 0; fieldStats.builds = 0; fieldStats.ms = 0;
  const t1 = Date.now();
  const g = guestMetrics(S, 3);
  const tickMs = (Date.now() - t1) / (3 * DAY);
  console.log(`\nStress park (${S.objects.filter((o) => o.kind === 'ride' || o.kind === 'track').length} rides, July, rating ${Math.round(S.park.rating)}): ${g.visits} visits in 3 days, peak ${g.peak} guests in the park, rides/visit ${fmt(g.rides)}, happiness ${fmt(g.happyExit)}`);
  console.log(`  sim tick ${fmt(tickMs)} ms average (guest update ${fmt(perf.guestMs / perf.ticks)} ms); distance fields: ${fieldStats.builds} builds, ${fmt(fieldStats.ms / Math.max(1, fieldStats.builds))} ms each, ${fmt(fieldStats.ms)} ms total`);
  band('stress park: peak guests', g.peak, 350, 900);
  band('stress park (overloaded on purpose): rides per visit', g.rides, 2, 6);
  band('stress park: sim tick ms (all systems)', tickMs, 0, 2);
  band('stress park: field build ms', fieldStats.ms / Math.max(1, fieldStats.builds), 0, 3);
}

console.log('\n| Metric | Value | Band | |\n|---|---|---|---|');
for (const b of BANDS) console.log(`| ${b.name} | ${fmt(b.v)} | ${b.lo}–${b.hi} | ${b.ok ? 'ok' : '**OUT**'} |`);
console.log(`\n${BANDS.filter((b) => b.ok).length}/${BANDS.length} in band · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(BANDS.every((b) => b.ok) ? 0 : 1);
