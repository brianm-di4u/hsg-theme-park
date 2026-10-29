// The fixed-step simulation and the named actions. Pure: no DOM, so Node runs it unchanged.
import { DAY, HOUR, msg, objById, spend, touchNet } from './state.js';
import { def, kindOf, RIDES, TRACKS, STALLS } from './catalog.js';
import { spawnGuest, updateGuests, ejectFrom, strand } from './guests.js';
import { updateRides, weatherClosures } from './rides.js';
import { updateStaff, hire, fire } from './staff.js';
import { startDay, endDay, rate, tempAt, concertTick, runCampaign, bookConcert, takeLoan, demand, monthlyCosts, goalValue, goalMet, RESEARCH_LEVELS } from './world.js';
import { buildPath, place, placeCheck, demolishAt, demolish, leaveStanding, terraform, refreshEntries } from './build.js';
import { trackStart, trackAdd, trackUndo, trackAuto, trackFinish, placeBlueprint, buildingTrack, applyTest } from './track.js';
import { fieldStats } from './fields.js';

export const perf = { guestMs: 0, ticks: 0 };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function tick(S) {
  if (S.pending) return false;
  if (!S.dayStarted) { startDay(S); S.dayStarted = true; S.spawnI = 0; }
  S.tick++;
  if (S.park.open && S.time < DAY - HOUR) {
    while (S.spawnI < S.spawnQ.length && S.spawnQ[S.spawnI] <= S.time) {
      const fan = S.spawnQ[S.spawnI++] % 1 !== 0;
      const g = spawnGuest(S);
      if (g) { S.stats.monthGuests = (S.stats.monthGuests || 0) + 1; if (fan) { g.cgo = 1; g.stay = DAY; } }
    }
  }
  if (S.time % HOUR === 0) { S.weather.temp = tempAt(S); weatherClosures(S); }
  if (S.weather.kind === 'storm' && (S.time === S.weather.storm[0] || S.time === S.weather.storm[1])) weatherClosures(S);
  concertTick(S);
  updateRides(S);
  const t0 = now();
  updateGuests(S);
  perf.guestMs += now() - t0; perf.ticks++;
  updateStaff(S);
  if (S.guests.length > S.stats.peak) S.stats.peak = S.guests.length;
  if (S.time % HOUR === HOUR - 1) rate(S);
  S.time++;
  if (S.time >= DAY) { S.time = 0; S.dayStarted = false; endDay(S); }
  return true;
}

export function step(S, n) { for (let k = 0; k < n; k++) if (!tick(S)) break; }

const eject = (S) => (gid, o) => ejectFrom(S, gid, o);

// Named actions shared by the UI, the test hooks and the balance tool.
export function act(S, name, ...a) {
  switch (name) {
    case 'path': return buildPath(S, ...a);
    case 'place': {
      const [type, x, y] = a;
      if (kindOf(type) === 'track') return { ok: false, reason: 'Use the track builder' };
      if (type === 'amphi' && S.objects.some((o) => o.type === 'amphi')) return { ok: false, reason: 'One amphitheater per park' };
      return place(S, type, x, y);
    }
    case 'check': return placeCheck(S, a[0], a[1], a[2]);
    case 'terraform': return terraform(S, ...a);
    case 'demolish': {
      const [x, y] = a;
      return demolishAt(S, x, y, (g, o) => (typeof g === 'object' ? strand(S, g) : ejectFrom(S, g, o)));
    }
    case 'demolishId': return demolish(S, a[0], eject(S));
    case 'leaveStanding': return leaveStanding(S, a[0], eject(S));
    case 'refurb': {
      const o = objById(S, a[0]);
      if (!o || o.status !== 'standing') return { ok: false, reason: 'Not a standing ride' };
      const c = Math.round(((def(o.type).cost || def(o.type).station || 10000)) * 0.3);
      spend(S, 'construction', c);
      o.status = 'open'; o.rel = o.relBase = Math.max(o.relBase, (def(o.type).rel || 0.95) - 0.01); o.lastInspect = S.tick; o.age = 0;
      if (o.kind === 'track') applyTest(S, o);
      msg(S, `${o.name} refurbished and reopened ($${c.toLocaleString('en-US')}).`, 'good');
      touchNet(S);
      return { ok: true, cost: c };
    }
    case 'trackStart': return trackStart(S, ...a);
    case 'trackAdd': return trackAdd(S, ...a);
    case 'trackUndo': return trackUndo(S);
    case 'trackAuto': return trackAuto(S);
    case 'trackFinish': return trackFinish(S);
    case 'trackCancel': { const o = buildingTrack(S); if (!o) return { ok: false }; S.trackBuild = null; const r = demolish(S, o.id, eject(S)); return r; }
    case 'blueprint': return placeBlueprint(S, ...a);
    case 'setPrice': { const o = objById(S, a[0]); if (!o) return { ok: false }; o.price = Math.max(0, Math.min(60, Math.round(a[1]))); return { ok: true, price: o.price }; }
    case 'admission': S.park.admission = Math.max(0, Math.min(80, Math.round(a[0]))); return { ok: true, admission: S.park.admission };
    case 'payPerRide': S.park.payPerRide = !!a[0]; return { ok: true };
    case 'cooler': S.park.cooler = !!a[0]; return { ok: true };
    case 'waterCal': S.park.waterCal = !!a[0]; weatherClosures(S); return { ok: true };
    case 'openPark': S.park.open = !!a[0]; msg(S, S.park.open ? 'The park is open.' : 'The park is closed to new guests.'); return { ok: true };
    case 'rideOpen': {
      const o = objById(S, a[0]);
      if (!o || !o.queue || o.status === 'building' || o.status === 'testfail' || o.status === 'standing') return { ok: false };
      o.status = a[1] ? 'open' : 'closed'; return { ok: true };
    }
    case 'hire': return hire(S, a[0], a[1] !== false);
    case 'fire': return fire(S, a[0]);
    case 'loan': return takeLoan(S, a[0]);
    case 'market': return runCampaign(S, a[0], !!a[1]);
    case 'research': S.park.research.level = Math.max(0, Math.min(3, a[0] | 0)); return { ok: true };
    case 'book': return bookConcert(S, a[0]);
    case 'buyUsed': {
      const [i, x, y, dir, mirror] = a;
      const L = S.park.market[i];
      if (!L || L.sold) return { ok: false, reason: 'Not available' };
      let r;
      if (L.kind === 'track') r = placeBlueprint(S, L.bp, x, y, dir, !!mirror, { cost: L.price + L.reloc, rel: L.rel, name: 'Old Timber' });
      else {
        r = place(S, L.type, x, y, { cost: L.price + L.reloc, name: L.name.replace('Used ', '') });
        if (r.ok) { r.obj.rel = r.obj.relBase = L.rel; }
      }
      if (r.ok) { L.sold = true; msg(S, `Bought ${L.name} for $${(L.price + L.reloc).toLocaleString('en-US')} including relocation.`, 'good'); }
      return r;
    }
    case 'continue': {
      // dismiss a winter summary (the season has already rolled over)
      if (S.pending && S.pending.kind === 'winter') { S.pending = null; return { ok: true }; }
      return { ok: false };
    }
    case 'refresh': refreshEntries(S); return { ok: true };
  }
  return { ok: false, reason: 'Unknown action ' + name };
}

export { demand, monthlyCosts, goalValue, goalMet, fieldStats, RESEARCH_LEVELS, RIDES, TRACKS, STALLS };
