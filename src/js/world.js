// Calendar, weather, demand and arrivals, month and season accounting, rating, research, marketing,
// concerts and scenario goals.
import { RIDES, TRACKS, STALLS, SPECIAL, CAMPAIGNS, ACTS, CLIMATE, MONTHS, RESEARCH_COST, researchCat, def } from './catalog.js';
import { DAY, HOUR, blankLedger, INCOME_KEYS, COST_KEYS, spend, earn, msg } from './state.js';
import { next, rint, gauss, pick } from './rng.js';
import { rideOpen, rideThrill, removeGuest } from './guests.js';
import { weatherClosures, seatsOf, cycleOf, defOf } from './rides.js';
import { wage } from './staff.js';
import { trackUpkeep } from './track.js';
import { objField } from './fields.js';

export const MONTH_F = [0.55, 0.75, 1.0, 1.05, 1.0, 0.6, 0.6];
export const DOW_F = [0.75, 0.75, 0.75, 0.75, 1.0, 1.45, 1.25];
export const WEATHER_F = { sun: 1.0, cloud: 0.95, rain: 0.55, storm: 0.4 };
export const BASE_DEMAND = 17;
export const RESEARCH_LEVELS = [{ pts: 0, cost: 0 }, { pts: 40, cost: 1000 }, { pts: 80, cost: 2000 }, { pts: 140, cost: 3500 }];
export const BANKRUPT = -20000;

// ---- weather ----------------------------------------------------------------------------------
export function rollWeather(S) {
  const C = CLIMATE[S.month];
  const hi = Math.round(C.hi + gauss(S) * 4.5), lo = Math.round(C.lo + gauss(S) * 4);
  const pRain = Math.min(0.5, C.pr * 0.062);
  const r = next(S);
  let kind = 'sun';
  if (r < pRain) kind = S.month >= 1 && S.month <= 4 && next(S) < 0.4 ? 'storm' : 'rain';
  else if (r < pRain + 0.2) kind = 'cloud';
  const s0 = rint(S, 3, 7) * HOUR, s1 = s0 + rint(S, 1, 2) * HOUR;
  S.weather = { kind, hi, lo: Math.min(lo, hi - 8), temp: lo, storm: kind === 'storm' ? [s0, s1] : [0, 0] };
}
export function tempAt(S) {
  const W = S.weather, h = S.time / HOUR; // 0 = 10:00
  const f = Math.sin(Math.min(Math.PI, Math.max(0, ((h + 2) / 12) * Math.PI)));
  return Math.round(W.lo + (W.hi - W.lo) * (0.35 + 0.65 * f) - (W.kind === 'rain' || W.kind === 'storm' ? 4 : 0));
}

// ---- demand --------------------------------------------------------------------------------
export function noveltyOf(o) { return o.age === 0 ? 1.6 : o.age === 1 ? 1.2 : 1; }
export function parkDraw(S) {
  let sum = 0, thrillSum = 0;
  const temp = S.weather.hi;
  for (const o of S.objects) {
    if ((o.kind !== 'ride' && o.kind !== 'track') || o.status !== 'open' || o.entry < 0) continue;
    const d = defOf(o);
    let w = 1;
    if (d.water && o.kind === 'ride') w = o.cal === false ? 0 : Math.max(0.2, Math.min(1.3, (temp - 70) / 15));
    const th = rideThrill(S, o);
    sum += th * noveltyOf(o) * w; thrillSum += th * (w > 0 ? 1 : 0);
  }
  return { draw: Math.pow(sum, 0.75), thrillSum };
}
export function demand(S) {
  const { draw, thrillSum } = parkDraw(S);
  const P = S.park;
  const ratingF = 0.4 + 1.2 * P.rating / 1000;
  let monthF = MONTH_F[S.month];
  if (S.month === 4 && S.dow >= 3) monthF = 0.7;
  if (S.month === 6 && P.campaigns.fright) monthF += CAMPAIGNS.fright.boost;
  let dowF = DOW_F[S.dow];
  if (S.month === 1 && S.dow < 5 && P.campaigns.school) dowF *= 1 + CAMPAIGNS.school.boost;
  if (P.cooler && S.dow === 6) dowF *= 1.2;
  const weatherF = WEATHER_F[S.weather.kind];
  const V = 8 + 1.6 * thrillSum;
  const adm = P.admission + (P.payPerRide ? avgRidePrice(S) * 3 : 0);
  const priceF = Math.max(0.25, Math.min(1.3, 1.3 - 0.6 * adm / Math.max(1, V)));
  let mk = 1;
  for (const k of ['billboard', 'radio', 'coupons']) if (P.campaigns[k]) mk += CAMPAIGNS[k].boost;
  const parkNov = P.seasonsOpen === 0 ? 1.2 : 1;
  let concertF = 1;
  if (S.dow === 5 && P.concert && P.concert.month === S.month && P.concert.year === S.year && hasAmphi(S)) concertF += ACTS[P.concert.act].boost;
  const raw = BASE_DEMAND * ratingF * draw * monthF * dowF * weatherF * priceF * mk * parkNov * concertF;
  const n = P.open && draw > 0 ? Math.min(1800, Math.round(raw)) : 0;
  return { n, draw: +draw.toFixed(2), ratingF: +ratingF.toFixed(2), monthF, dowF: +dowF.toFixed(2), weatherF, priceF: +priceF.toFixed(2), mk, parkNov, concertF, value: Math.round(V) };
}
function avgRidePrice(S) {
  const rs = S.objects.filter((o) => (o.kind === 'ride' || o.kind === 'track') && o.status === 'open');
  return rs.length ? rs.reduce((s, o) => s + o.price, 0) / rs.length : 0;
}
export const hasAmphi = (S) => S.objects.some((o) => o.type === 'amphi' && o.entry >= 0);

// ---- day / month / season --------------------------------------------------------------------
export function startDay(S) {
  rollWeather(S);
  S.weather.temp = tempAt(S);
  weatherClosures(S);
  const d = demand(S);
  let n = Math.round(d.n * (0.9 + next(S) * 0.2));
  S.stats.demand = d; S.stats.guestsToday = 0;
  const q = [];
  for (let k = 0; k < n; k++) q.push(Math.floor(600 * Math.pow(next(S), 1.6)));
  if (d.concertF > 1) { const extra = Math.round(n * (d.concertF - 1) * 0.8); for (let k = 0; k < extra; k++) q.push(600 + rint(S, 0, 300) + 0.5); } // .5 marks a concert fan
  q.sort((a, b) => a - b);
  S.spawnQ = q;
  if (S.dow === 0) S.stats.weekGuests = 0;
}

export function endDay(S) {
  for (const g of S.guests) removeGuest(S, g);
  S.guests = []; S._gmap = new Map();
  for (const o of S.objects) if (o.queue) { o.queue.length = 0; o.riders.length = 0; o.phase = 'load'; o.loadT = 0; }
  for (const st of S.staff) { st.ti = S.map.gate; st.to = -1; st.x = (S.map.gate % S.map.w) + 0.5; st.y = Math.floor(S.map.gate / S.map.w) + 0.5; st.path = []; st.tm = 0; st.tgt = 0; st.z = S.map.height[S.map.gate]; }
  for (const o of S.objects) if (o.mech) o.mech = 0;
  S.stats.dayLog = S.stats.dayLog || [];
  S.stats.dayLog.push({ y: S.year, m: S.month, d: S.dow, g: S.stats.guestsToday, w: S.weather.kind, r: Math.round(S.park.rating) });
  if (S.stats.dayLog.length > 120) S.stats.dayLog.shift();
  S.dayCount++;
  S.dow++;
  if (S.dow > 6) { S.dow = 0; endMonth(S); }
}

export function monthlyCosts(S) {
  let upkeep = 0, pump = 0;
  for (const o of S.objects) {
    if (o.kind === 'track') { if (o.status === 'standing') upkeep += trackUpkeep(o) * 0.1; else if (o.status !== 'building') upkeep += trackUpkeep(o); continue; }
    const d = def(o.type);
    if (!d || !d.upkeep) continue;
    let u = d.upkeep;
    if (o.kind === 'ride' && RIDES[o.type].water) { pump += 20 * o.h; }
    if (o.status === 'standing') u *= 0.1;
    upkeep += u;
  }
  const wages = S.staff.reduce((s, st) => s + wage(st), 0);
  const interest = Math.round(S.finance.loan * S.finance.rate / 12);
  const rl = RESEARCH_LEVELS[S.park.research.level];
  return { upkeep: Math.round(upkeep + pump), pump: Math.round(pump), wages, interest, research: rl.cost };
}

export function endMonth(S) {
  const F = S.finance, P = S.park;
  const c = monthlyCosts(S);
  spend(S, 'upkeep', c.upkeep); spend(S, 'wages', c.wages); spend(S, 'interest', c.interest); spend(S, 'research', c.research);
  // research
  const R = P.research;
  R.points += RESEARCH_LEVELS[R.level].pts;
  while (R.queue.length && R.points >= RESEARCH_COST[researchCat(R.queue[0])]) {
    const t = R.queue.shift(); R.points -= RESEARCH_COST[researchCat(t)]; R.unlocked.push(t);
    msg(S, `Research complete: ${def(t).name} is ready to build.`, 'good');
  }
  if (!R.queue.length) R.points = Math.min(R.points, 200);
  // marketing runs one month; auto-renew if asked
  for (const k of Object.keys(P.campaigns)) {
    const cmp = P.campaigns[k];
    if (cmp.auto && canRun(S, k, S.month + 1)) { spend(S, 'marketing', CAMPAIGNS[k].cost); }
    else delete P.campaigns[k];
  }
  // ride ageing: reliability drifts down between inspections
  for (const o of S.objects) if (o.rel) o.rel = Math.max(0.8, o.rel - 0.004);
  const rec = { y: S.year, m: S.month, ...F.month, cash: Math.round(F.cash), loan: F.loan, rating: Math.round(P.rating), guests: S.stats.monthGuests || 0 };
  F.months.push(rec); if (F.months.length > 60) F.months.shift();
  F.month = blankLedger();
  S.stats.monthGuests = 0;
  for (const o of S.objects) { if (o.monthRiders != null) o.monthRiders = 0; if (o.monthSales != null) o.monthSales = 0; }
  // bankruptcy
  if (F.cash < BANKRUPT) { F.badMonths++; msg(S, `Cash is below $${(-BANKRUPT).toLocaleString('en-US')} in debt. Another month like this and the bank forecloses.`, 'warn'); }
  else F.badMonths = 0;
  S.month++;
  const scen = S.scenario;
  if (F.badMonths >= 2) { endScenario(S, false, 'The bank foreclosed: cash stayed below −$20,000 for two month-ends.'); return; }
  if (S.month > 6) endSeason(S);
  else checkGoals(S, false);
  void scen;
}

export function endSeason(S) {
  const F = S.finance, P = S.park;
  const sea = { y: S.year, ...F.season, guests: S.stats.guestsSeason, rating: Math.round(P.rating) };
  // winter: five months of loan interest and 10% of a year's upkeep
  const c = monthlyCosts(S);
  const winter = Math.round(F.loan * F.rate * 5 / 12) + Math.round(c.upkeep * 7 * 0.1);
  F.cash -= winter; sea.winter = winter;
  F.seasons.push(sea);
  S.stats.seasonGuests.push({ y: S.year, n: S.stats.guestsSeason });
  checkGoals(S, true);
  if (S.pending) S.pending.season = sea; // the win/lose screen shows this season
  else S.pending = { kind: 'winter', season: sea };
  F.season = blankLedger();
  S.stats.guestsSeason = 0; S.stats.concertSeats = 0;
  for (const o of S.objects) { o.age++; if (o.rel) o.rel = Math.max(0.8, o.rel - 0.01); if (o.relBase) o.relBase = Math.max(0.85, o.relBase - 0.005); }
  for (const g of Object.keys(P.campaigns)) delete P.campaigns[g];
  P.seasonsOpen++;
  P.concert = null;
  S.month = 0; S.year++;
}

// ---- rating (hourly) ---------------------------------------------------------------------------
export function rate(S) {
  const gs = S.guests, P = S.park, M = S.map;
  const rides = S.objects.filter((o) => (o.kind === 'ride' || o.kind === 'track') && o.status !== 'building' && o.status !== 'testfail' && o.status !== 'standing');
  const open = rides.filter((o) => rideOpen(S, o));
  const avgHappy = gs.length ? gs.reduce((s, g) => s + g.happy, 0) / gs.length : 62;
  // positives: happiness, variety, excitement, scenery, capacity; negatives: litter, breakdowns,
  // prices, lost and stranded guests
  const parts = {};
  parts.happiness = Math.round(450 * avgHappy / 100);
  parts.variety = Math.min(200, new Set(open.map((o) => o.type)).size * 12);
  const top = open.map((o) => rideThrill(S, o)).sort((a, b) => b - a).slice(0, 3);
  parts.excitement = top.length ? Math.round(Math.min(100, (top.reduce((s, v) => s + v, 0) / 3) * 18)) : 0;
  let pathTiles = 0, litter = 0, scen = 0;
  for (let i = 0; i < M.path.length; i++) if (M.path[i]) { pathTiles++; litter += M.litter[i]; scen += S._scen ? Math.min(S._scen[i], 6) : 0; }
  parts.scenery = Math.round(150 * Math.min(1, (scen / Math.max(1, pathTiles)) / 4));
  let seatsHr = 0;
  for (const o of open) seatsHr += seatsOf(o) * HOUR / (cycleOf(o) + 15);
  const need = Math.max(1, gs.length * 0.9);
  parts.capacity = open.length ? Math.round(100 * Math.min(1, seatsHr / need)) : 0;
  parts.litter = -Math.round(150 * Math.min(1, litter / Math.max(1, pathTiles * 3)));
  parts.breakdowns = rides.length ? -Math.round(100 * rides.filter((o) => o.broken).length / rides.length) : 0;
  const exp = S.thoughtsHour.expensive || 0;
  parts.prices = -Math.round(100 * Math.min(1, (exp * 3) / (gs.length + 5)));
  parts.lost = -Math.min(150, S.stats.lostHour * 4);
  parts.stranded = -Math.min(100, rides.filter((o) => o.broken).reduce((s, o) => s + o.riders.length, 0) * 2);
  let total = Object.values(parts).reduce((s, v) => s + v, 0);
  if (!open.length) total = Math.min(total, 200);
  total = Math.max(0, Math.min(1000, total));
  P.rating = P.rating * 0.85 + total * 0.15;
  P.ratingParts = parts;
  S.stats.lostHour = 0;
  // thoughts: decay the park's running counts and add this hour's
  for (const k of Object.keys(S.thoughts)) S.thoughts[k] *= 0.7;
  for (const [k, v] of Object.entries(S.thoughtsHour)) S.thoughts[k] = (S.thoughts[k] || 0) + v;
  S.thoughtsHour = {};
}

// ---- marketing, concerts, loans, research ------------------------------------------------------
export function canRun(S, id, month = S.month) {
  if (id === 'school') return month === 1;
  if (id === 'fright') return month === 6;
  return month <= 6;
}
export function runCampaign(S, id, auto = false) {
  const c = CAMPAIGNS[id];
  if (!c) return { ok: false, reason: 'Unknown campaign' };
  if (S.park.campaigns[id]) { S.park.campaigns[id].auto = auto; return { ok: true, already: true }; }
  if (!canRun(S, id)) return { ok: false, reason: id === 'school' ? 'School Days run in May' : 'Fright Nights run in October' };
  spend(S, 'marketing', c.cost);
  S.park.campaigns[id] = { auto };
  msg(S, `${c.name} running this month.`);
  return { ok: true };
}
export function bookConcert(S, act) {
  if (!ACTS[act]) return { ok: false, reason: 'Unknown act' };
  if (!hasAmphi(S)) return { ok: false, reason: 'Build and connect an Amphitheater first' };
  if (S.park.concert && S.park.concert.month === S.month && S.park.concert.year === S.year) return { ok: false, reason: 'A show is already booked this month' };
  if (S.dow > 5 || (S.dow === 5 && S.time >= 950)) return { ok: false, reason: "This month's Saturday has passed" };
  const A = ACTS[act];
  spend(S, 'acts', A.cost);
  S.park.concert = { act, band: pick(S, A.bands), month: S.month, year: S.year, done: false };
  msg(S, `Booked ${S.park.concert.band} for Saturday night.`);
  return { ok: true, band: S.park.concert.band };
}
// At 19:30 on a concert Saturday most guests head for the amphitheater; at 21:30 the show ends.
export function concertTick(S) {
  const C = S.park.concert;
  if (!C || C.month !== S.month || C.year !== S.year || S.dow !== 5) return;
  const amphi = S.objects.find((o) => o.type === 'amphi' && o.entry >= 0);
  if (!amphi) return;
  if (S.time === 950) {
    const f = objField(S, amphi);
    for (const g of S.guests) {
      if (g.st === 'ride' || g.st === 'leave' || g.st === 'queue') continue;
      if (f[g.ti] === 65535 || (!g.cgo && next(S) > 0.75)) continue;
      g.dest = amphi.id; g.st = 'walk'; g.cgo = 1; g.stay = Math.max(g.stay, DAY);
    }
    amphi.shows = (amphi.shows || 0) + 1;
    msg(S, `${C.band} take the stage at the Amphitheater.`, 'good');
  }
  if (S.time === 1150) {
    for (const g of S.guests) if (g.st === 'concert') { g.st = 'leave'; g.dest = -1; g.happy = Math.min(100, g.happy + 10); g.th.unshift(['concert', S.tick]); g.th.length = Math.min(3, g.th.length); S.thoughtsHour.concert = (S.thoughtsHour.concert || 0) + 1; }
    C.done = true;
  }
}
export function takeLoan(S, amount) {
  const F = S.finance;
  if (amount > 0) {
    const a = Math.min(amount, F.maxLoan - F.loan);
    if (a <= 0) return { ok: false, reason: 'Loan limit reached' };
    F.loan += a; F.cash += a; return { ok: true, amount: a };
  }
  const a = Math.min(-amount, F.loan, Math.max(0, F.cash));
  if (a <= 0) return { ok: false, reason: 'Nothing to repay' };
  F.loan -= a; F.cash -= a; return { ok: true, amount: -a };
}

// ---- goals ------------------------------------------------------------------------------------
export function goalValue(S, gl) {
  const F = S.finance;
  switch (gl.type) {
    case 'guests': return gl.year && gl.year !== S.year ? (S.stats.seasonGuests.find((s) => s.y === gl.year) || { n: 0 }).n : S.stats.guestsSeason;
    case 'rating': return Math.round(S.park.rating);
    case 'loan': return F.loan;
    case 'cash': return Math.round(F.cash);
    case 'profit': { const L = F.season; return Math.round(INCOME_KEYS.reduce((s, k) => s + L[k], 0) - COST_KEYS.filter((k) => k !== 'construction').reduce((s, k) => s + L[k], 0)); }
    case 'ride': return Math.max(0, ...S.objects.filter((o) => o.status === 'open' && (gl.ttype ? o.type === gl.ttype : o.kind === 'track' && TRACKS[o.type] && !TRACKS[o.type].flume)).map((o) => o.int || 0));
    case 'rideType': return S.objects.filter((o) => gl.types.includes(o.type) && o.status === 'open').length;
    case 'concert': return S.stats.concertSeats;
    case 'ratio': {
      const a = S.stats.seasonGuests.find((s) => s.y === gl.base), b = S.stats.seasonGuests.find((s) => s.y === gl.year);
      const cur = gl.year === S.year ? S.stats.guestsSeason : b ? b.n : 0;
      return a && a.n ? Math.round((cur / a.n) * 100) : 0;
    }
  }
  return 0;
}
export function goalMet(S, gl) {
  const v = goalValue(S, gl);
  return gl.max ? v <= gl.value : v >= gl.value;
}
export function checkGoals(S, seasonEnd) {
  const sc = S.scenario;
  if (!sc || sc.status !== 'playing' || !sc.goals || !sc.goals.length) return; // the sandbox has no goals
  const final = seasonEnd && S.year >= sc.deadline;
  // year-specific goals can only be judged once that season is over (or at the final season end)
  const ready = sc.goals.every((gl) => goalMet(S, gl) && (!gl.endOnly || final) && (!gl.year || gl.year < S.year || (gl.year === S.year && seasonEnd)));
  if (ready) return endScenario(S, true, 'Every goal met.');
  if (final) endScenario(S, false, 'The deadline passed with goals unmet.');
}
export function endScenario(S, won, why) {
  const sc = S.scenario;
  if (!sc || sc.status !== 'playing') return;
  sc.status = won ? 'won' : 'lost'; sc.why = why; sc.endedAt = { year: S.year, month: S.month };
  sc.final = (sc.goals || []).map((gl) => goalMet(S, gl));
  if (won) {
    // stars: 3 if won with a season to spare or by July of the final season, 2 by September, else 1
    const early = (sc.deadline - S.year) * 7 + (6 - S.month);
    sc.stars = early >= 3 ? 3 : early >= 1 ? 2 : 1;
  } else sc.stars = 0;
  S.pending = { kind: won ? 'win' : 'lose', why };
  msg(S, won ? `Scenario complete! ${why}` : `Scenario lost. ${why}`, won ? 'good' : 'warn');
}

export { MONTHS };
