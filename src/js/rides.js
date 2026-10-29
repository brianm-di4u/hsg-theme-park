// Ride operation: load, run, unload; breakdowns and repairs; weather and water-calendar closures.
import { RIDES, TRACKS } from './catalog.js';
import { earn, spend, msg, guestById } from './state.js';
import { next } from './rng.js';
import { rideDone, leaveQueue, think, ridePrice, rideOpen } from './guests.js';

export const LOAD_MAX = 20, UNLOAD = 6, CONTRACTOR_TICKS = 400, CONTRACTOR_FEE = 500, REPAIR_TICKS = 60;

export function seatsOf(o) { return o.kind === 'track' ? o.seats || 8 : RIDES[o.type].seats; }
export function cycleOf(o) { return o.kind === 'track' ? o.cycle || 60 : RIDES[o.type].cycle; }
export function defOf(o) { return o.kind === 'track' ? TRACKS[o.type] : RIDES[o.type]; }

export function updateRides(S) {
  for (const o of S.objects) {
    if (o.kind !== 'ride' && o.kind !== 'track') continue;
    if (o.status === 'building' || o.status === 'testfail' || o.status === 'standing') continue;
    if (o.broken) { brokenTick(S, o); continue; }
    const open = rideOpen(S, o);
    if (!open && o.queue.length) {
      for (const gid of o.queue) { const g = guestById(S, gid); if (g) leaveQueue(S, g, 'closed'); }
      o.queue.length = 0;
    }
    if (o.phase === 'load') {
      if (open) board(S, o);
      if (o.riders.length) {
        o.loadT++;
        if (o.riders.length >= seatsOf(o) || o.loadT >= LOAD_MAX) startRun(S, o);
      } else o.loadT = 0;
    } else if (o.phase === 'run') {
      if (--o.timer <= 0) { o.phase = 'unload'; o.timer = UNLOAD; }
    } else if (o.phase === 'unload') {
      if (--o.timer <= 0) unload(S, o);
    }
  }
}

function board(S, o) {
  const seats = seatsOf(o);
  while (o.riders.length < seats && o.queue.length) {
    const gid = o.queue.shift(), g = guestById(S, gid);
    if (!g || g.st !== 'queue') continue;
    const price = ridePrice(S, o);
    if (price > 0) {
      if (g.money < price) { think(S, g, 'expensive', true); g.st = 'choose'; continue; }
      g.money -= price; g.spent += price; earn(S, 'rides', price); o.income += price;
    }
    g.st = 'ride';
    o.riders.push(gid);
  }
}

function startRun(S, o) {
  o.loadT = 0;
  // breakdown roll: worse the longer since the last inspection
  const hrs = (S.tick - o.lastInspect) / 100;
  const p = (1 - o.rel) * 0.15 * (1 + hrs / 6);
  if (next(S) < p) {
    o.broken = 1; o.brokenAt = S.tick; o.mech = 0;
    msg(S, `${o.name} has broken down${o.riders.length ? ' with riders aboard' : ''}.`, 'warn');
    for (const gid of o.queue) { const g = guestById(S, gid); if (g) leaveQueue(S, g, 'broke'); }
    o.queue.length = 0;
    return;
  }
  o.phase = 'run'; o.timer = cycleOf(o); o.cycles++;
}

function unload(S, o) {
  for (const gid of o.riders) { const g = guestById(S, gid); if (g) rideDone(S, g, o); }
  o.totalRiders += o.riders.length; o.monthRiders += o.riders.length;
  o.riders.length = 0;
  o.phase = 'load'; o.loadT = 0;
}

function brokenTick(S, o) {
  // no mechanic on the way after a while: an outside contractor fixes it for a fee
  if (!o.mech && S.tick - o.brokenAt > CONTRACTOR_TICKS) {
    spend(S, 'repairs', CONTRACTOR_FEE);
    msg(S, `A contractor repaired ${o.name} for $${CONTRACTOR_FEE}. Hire a mechanic to fix rides faster.`);
    repaired(S, o);
  }
}

export function repaired(S, o) {
  o.broken = 0; o.mech = 0; o.lastInspect = S.tick; o.rel = o.relBase;
  // stranded riders finish the ride
  o.phase = 'run'; o.timer = Math.ceil(cycleOf(o) / 3);
}

// Hourly: storms close tall rides, coasters and water rides; the water calendar opens and closes water rides.
export function waterOpenToday(S) {
  if (!S.park.waterCal) return S.weather.hi >= 78;
  const m = S.month, d = S.dow, weekend = d >= 5;
  if (m === 0 || m === 6) return false;          // April, October
  if (m >= 1 && m <= 3) return true;              // May–July daily
  if (m === 4) return d < 3 || weekend;           // August: daily until mid-month, then weekends
  return weekend;                                 // September weekends
}
export function weatherClosures(S) {
  const storm = S.weather.kind === 'storm' && S.time >= S.weather.storm[0] && S.time < S.weather.storm[1];
  const wOpen = waterOpenToday(S);
  for (const o of S.objects) {
    if (o.kind !== 'ride' && o.kind !== 'track') continue;
    const d = defOf(o);
    const exposed = o.kind === 'track' || d.tall || d.water;
    o.wx = storm && exposed ? 1 : 0;
    if (d.water && o.kind === 'ride') o.cal = wOpen;
  }
}
