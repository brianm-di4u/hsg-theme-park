// Guest agents: arrival, needs, choosing, walking on distance fields, queues, stalls, leaving.
import { RIDES, TRACKS, STALLS, SPECIAL } from './catalog.js';
import { HOUR, DAY, idx, earn, guestById, objById, msg } from './state.js';
import { next, rint, rrange } from './rng.js';
import { objField, gateField, downhill, neighbours, INF } from './fields.js';
import { derived } from './build.js';

// Thought kinds: label, icon glyph (shape, never color alone), good/bad.
export const THOUGHTS = {
  hungry: { t: "I'm hungry", i: '🍴', bad: 1 }, thirsty: { t: "I'm thirsty", i: '🥤', bad: 1 },
  restroom: { t: 'I need a restroom', i: '🚻', bad: 1 }, tired: { t: "I'm tired", i: '💤', bad: 1 },
  queasy: { t: 'I feel queasy', i: '🌀', bad: 1 }, intense: { t: 'That was too intense', i: '⚠', bad: 1 },
  tame: { t: 'That was too tame', i: '😐', bad: 1 }, longline: { t: 'That line is too long', i: '⏳', bad: 1 },
  waited: { t: 'I waited too long', i: '⌛', bad: 1 }, crowded: { t: "It's too crowded", i: '👥', bad: 1 },
  dirty: { t: 'This path is dirty', i: '🗑', bad: 1 }, lost: { t: "I can't find a way there", i: '❓', bad: 1 },
  expensive: { t: "That's too expensive", i: '💲', bad: 1 }, broke: { t: 'That ride broke down', i: '🔧', bad: 1 },
  rain: { t: "I'm getting soaked", i: '☔', bad: 1 }, hot: { t: "It's so hot", i: '☀', bad: 1 },
  nothing: { t: "There's nothing to do", i: '…', bad: 1 }, closed: { t: 'That ride is closed', i: '⛔', bad: 1 },
  great: { t: 'What a great ride!', i: '★', bad: 0 }, view: { t: 'What a view from up here', i: '⛰', bad: 0 },
  scenery: { t: 'This park is lovely', i: '✿', bad: 0 }, value: { t: 'Good value for the money', i: '✔', bad: 0 },
  concert: { t: 'Great show tonight!', i: '♪', bad: 0 }, mascot: { t: 'I love the bear!', i: '♥', bad: 0 },
};

// kinds: 0 child, 1 teen, 2 adult, 3 senior
const KINDS = [
  { lo: 1, hi: 2, m: [15, 40], h: [36, 54], w: 0.24 },
  { lo: 2, hi: 5, m: [20, 50], h: [58, 70], w: 0.22 },
  { lo: 1, hi: 4, m: [40, 100], h: [60, 74], w: 0.42 },
  { lo: 1, hi: 3, m: [30, 70], h: [60, 72], w: 0.12 },
];
export const KIND_NAMES = ['Child', 'Teen', 'Adult', 'Senior'];

export function think(S, g, k, force) {
  if (!force && S.tick - g.tt < 60) return;
  g.tt = S.tick;
  S.thoughtsHour[k] = (S.thoughtsHour[k] || 0) + 1;
  if (g.th.length && g.th[0][0] === k) { g.th[0][1] = S.tick; return; }
  g.th.unshift([k, S.tick]); if (g.th.length > 3) g.th.length = 3;
}

export function spawnGuest(S) {
  const M = S.map, gate = M.gate, gx = gate % M.w, gy = (gate - gx) / M.w;
  let r = next(S), k = 0;
  while (k < 3 && r > KINDS[k].w) { r -= KINDS[k].w; k++; }
  const K0 = KINDS[k];
  const money = rint(S, K0.m[0], K0.m[1]);
  let adm = S.park.admission;
  if (S.park.campaigns.coupons && next(S) < 0.3) adm = Math.round(adm / 2);
  if (money < adm + 2) { S.stats.turnedAway++; return null; }
  const g = {
    id: S.nextGuest++, k, hgt: rint(S, K0.h[0], K0.h[1]), c: rint(S, 0, 7),
    x: gx + 0.5, y: gy + 0.5, z: M.height[gate], ti: gate, to: -1,
    st: 'choose', dest: 0, tm: 0, money: money - adm, spent: adm,
    happy: rint(S, 58, 76), hunger: rint(S, 5, 45), thirst: rint(S, 5, 40), bladder: rint(S, 0, 30),
    energy: rint(S, 75, 100), nausea: 0,
    lo: Math.max(1, K0.lo + (next(S) < 0.25 ? -1 : 0)), hi: Math.min(5, K0.hi + (next(S) < 0.3 ? (next(S) < 0.5 ? -1 : 1) : 0)),
    pat: rint(S, 300, 700), stay: rint(S, 4 * HOUR, 8 * HOUR), arr: S.time,
    ridden: {}, rides: 0, th: [], tt: -999, trash: 0, idle: 0, wander: 0, par: 0, umb: 0, qt: 0, cooler: 0, prev: -1,
  };
  if (g.hi < g.lo) g.hi = g.lo;
  g.par = g.id & 3;
  if (S.park.cooler && S.dow === 6) g.cooler = 1;
  earn(S, 'admission', adm);
  S.guests.push(g);
  if (S._gmap) S._gmap.set(g.id, g);
  S.stats.guestsToday++; S.stats.guestsSeason++; S.stats.guestsTotal++;
  return g;
}

export function removeGuest(S, g) {
  g.st = 'gone';
  if (S._gmap) S._gmap.delete(g.id);
}

// ---- choosing -------------------------------------------------------------------------------
export function rideOpen(S, o) {
  return (o.kind === 'ride' || o.kind === 'track') && o.status === 'open' && !o.broken && !o.wx && o.cal !== false && o.entry >= 0;
}
export function fitOf(g, int) {
  if (int >= g.lo && int <= g.hi) return 1;
  if (int < g.lo) return 0.6;
  if (int === g.hi + 1) return 0.15;
  return 0;
}
export function rideThrill(S, o) {
  if (o.kind === 'track') return o.thrill || 1;
  const d = RIDES[o.type];
  return d.view ? d.thrill + 0.15 * o.h : d.thrill;
}
export function rideInt(o) { return o.kind === 'track' ? o.int || 1 : RIDES[o.type].int; }
export function rideHreq(o) { return o.kind === 'track' ? TRACKS[o.type].hreq : RIDES[o.type].hreq; }
export function ridePrice(S, o) {
  const d = o.kind === 'track' ? TRACKS[o.type] : RIDES[o.type];
  if (d.upcharge) return o.price;
  return S.park.payPerRide ? o.price : 0;
}
export function waitTicks(o) {
  const seats = o.kind === 'track' ? o.seats || 8 : RIDES[o.type].seats;
  const cyc = (o.kind === 'track' ? o.cycle || 60 : RIDES[o.type].cycle) + 25;
  return Math.round((o.queue.length / seats) * cyc);
}
export function queueMax(o) {
  const seats = o.kind === 'track' ? o.seats || 8 : RIDES[o.type].seats;
  return Math.max(12, seats * 4);
}
function canRide(S, g, o) {
  const d = o.kind === 'track' ? TRACKS[o.type] : RIDES[o.type];
  if (d.kiddie && g.hgt > 54) return false;
  if (g.hgt < rideHreq(o)) return false;
  return true;
}

function nearestStall(S, g, needs) {
  let best = null, bd = INF;
  for (const o of S.objects) {
    if (o.kind !== 'stall' || o.entry < 0 || !needs.includes(STALLS[o.type].need)) continue;
    const f = objField(S, o), d = f[g.ti];
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function goTo(S, g, o) { g.dest = o.id; g.st = 'walk'; g.idle = 0; }
function goHome(S, g) { g.dest = -1; g.st = 'leave'; }

export function choose(S, g) {
  const rain = S.weather.kind === 'rain' || S.weather.kind === 'storm';
  // urgent needs first
  if (g.bladder > 70) { const o = nearestStall(S, g, ['restroom']); if (o) return goTo(S, g, o); think(S, g, 'restroom'); }
  if (g.thirst > 60) {
    if (g.cooler) { g.thirst = 10; g.bladder += 15; }
    else { const o = nearestStall(S, g, ['drink']); if (o && STALLS[o.type].price <= g.money) return goTo(S, g, o); think(S, g, 'thirsty'); }
  }
  if (g.hunger > 60) {
    if (g.cooler) { g.hunger = 10; g.happy = Math.min(100, g.happy + 3); }
    else { const o = nearestStall(S, g, g.money > 8 ? ['food', 'snack'] : ['snack', 'food']); if (o && STALLS[o.type].price <= g.money) return goTo(S, g, o); think(S, g, 'hungry'); }
  }
  if (g.energy < 25 || g.nausea > 50) {
    const o = nearestStall(S, g, ['rest']); if (o) return goTo(S, g, o);
    think(S, g, g.nausea > 50 ? 'queasy' : 'tired');
  }
  if (rain && !g.umb && g.money >= 8 && next(S) < 0.5) { const o = nearestStall(S, g, ['merch']); if (o) return goTo(S, g, o); }
  // rides
  let best = null, bs = 0.15;
  for (const o of S.objects) {
    if (o.kind !== 'ride' && o.kind !== 'track') continue;
    if (!rideOpen(S, o) || !canRide(S, g, o)) continue;
    const f = objField(S, o), dist = f[g.ti];
    if (dist === INF) continue;
    const int = rideInt(o), fit = fitOf(g, int);
    if (fit <= 0) continue;
    const price = ridePrice(S, o);
    if (price > g.money) continue;
    const th = rideThrill(S, o);
    // up-charge rides are judged as a special treat: worth up to five times their thrill in dollars
    const worth = (o.kind === 'ride' && RIDES[o.type].upcharge) ? th * 5 : th * 1.5 + 0.5;
    if (price > 0 && price > worth) { if (next(S) < 0.3) think(S, g, 'expensive'); continue; }
    const times = g.ridden[o.id] || 0;
    const wait = waitTicks(o);
    let s = th * fit * Math.pow(0.55, times) - dist / 400 - (wait / g.pat) * 2 + next(S) * 0.8;
    if (o.queue.length >= queueMax(o)) s -= 3;
    if (s > bs) { bs = s; best = o; }
  }
  if (best) return goTo(S, g, best);
  if (g.money >= 4 && g.hunger > 35 && next(S) < 0.5) { const o = nearestStall(S, g, ['snack', 'food']); if (o) return goTo(S, g, o); }
  g.idle++;
  if (g.idle >= 4) { think(S, g, 'nothing'); return goHome(S, g); }
  g.st = 'wander'; g.wander = rint(S, 4, 9); g.dest = 0;
}

// ---- arriving at the destination ------------------------------------------------------------
function arrive(S, g) {
  if (g.dest === -1) { removeGuest(S, g); return; }
  const o = objById(S, g.dest);
  if (!o || o.entry !== g.ti) { g.st = 'choose'; return; }
  if (o.kind === 'ride' || o.kind === 'track') {
    if (!rideOpen(S, o)) { think(S, g, o.broken ? 'broke' : 'closed'); g.st = 'choose'; return; }
    if (o.queue.length >= queueMax(o)) { think(S, g, 'longline'); g.ridden[o.id] = (g.ridden[o.id] || 0) + 1; g.st = 'choose'; return; }
    o.queue.push(g.id); g.st = 'queue'; g.qt = S.tick;
    return;
  }
  if (o.kind === 'stall') return buy(S, g, o);
  if (o.kind === 'special') { g.st = 'concert'; seatSale(S, g, o); return; }
  g.st = 'choose';
}

function buy(S, g, o) {
  const d = STALLS[o.type];
  const price = o.price;
  if (price > g.money) { think(S, g, 'expensive'); g.st = 'choose'; g.idle++; return; }
  g.money -= price; g.spent += price;
  if (price > 0) {
    const key = d.need === 'drink' ? 'drinks' : d.need === 'merch' ? 'merch' : 'food';
    earn(S, key, price); o.income += price;
  }
  o.sales++; o.monthSales++;
  g.st = 'stall'; g.tm = 15;
  switch (d.need) {
    case 'food': g.hunger = Math.max(0, g.hunger - 70); g.trash = rint(S, 40, 120); break;
    case 'snack': g.hunger = Math.max(0, g.hunger - 35); g.happy = Math.min(100, g.happy + 2); g.trash = rint(S, 40, 120); break;
    case 'drink': g.thirst = 0; g.bladder += 25; if (o.type !== 'refill') g.trash = rint(S, 40, 120); break; // refill bottles go home as souvenirs
    case 'merch': g.happy = Math.min(100, g.happy + 6); if (S.weather.kind === 'rain' || S.weather.kind === 'storm') g.umb = 1; break;
    case 'restroom': g.bladder = 0; g.tm = 20; break;
    case 'rest': g.st = 'sit'; g.tm = 80; break;
  }
  if (price > 0 && price <= d.price * 1.1 && next(S) < 0.1) think(S, g, 'value');
}

function seatSale(S, g, o) {
  const r = next(S);
  const amt = r < 0.15 ? 10 : r < 0.55 ? 5 : 0; // VIP rows and reserved benches; the lawn is free
  if (amt && g.money >= amt) {
    g.money -= amt; g.spent += amt; earn(S, 'concerts', amt); S.stats.concertSeats += amt; o.income += amt;
  }
}

// A ride finished with this guest aboard.
export function rideDone(S, g, o) {
  const th = rideThrill(S, o), int = rideInt(o), fit = fitOf(g, int);
  g.happy = Math.min(100, g.happy + (2 + 1.6 * th) * Math.max(fit, 0.2));
  if (int > g.hi) { g.nausea += 20 * (int - g.hi); g.happy -= 8; think(S, g, 'intense', true); }
  else if (int < g.lo) think(S, g, 'tame');
  else if (th >= 3.4) think(S, g, 'great');
  if (RIDES[o.type] && RIDES[o.type].view && o.h >= 5) think(S, g, 'view');
  if (TRACKS[o.type] && TRACKS[o.type].flume && S.weather.temp > 85) g.happy = Math.min(100, g.happy + 4);
  if (RIDES[o.type] && RIDES[o.type].water) { g.happy = Math.min(100, g.happy + Math.max(0, (S.weather.temp - 80) / 3)); g.thirst = Math.max(0, g.thirst - 10); }
  g.ridden[o.id] = (g.ridden[o.id] || 0) + 1; g.rides++;
  g.energy -= 2;
  g.st = 'choose'; g.ti = o.entry; g.to = -1;
  const w = S.map.w; g.x = (o.entry % w) + 0.5; g.y = Math.floor(o.entry / w) + 0.5; g.z = S.map.height[o.entry];
}

// Leave a queue (gave up, ride closed) or be ejected from a demolished ride.
export function leaveQueue(S, g, why) {
  if (why) think(S, g, why, true);
  if (why === 'waited') g.happy -= 10;
  g.st = 'choose';
}

// ---- per-tick update ------------------------------------------------------------------------
const SPEED = 0.18;
export function updateGuests(S) {
  derived(S);
  const M = S.map, w = M.w, n = w * M.h;
  if (!S._crowd || S._crowd.length !== n) S._crowd = new Uint16Array(n);
  const crowd = S._crowd; crowd.fill(0);
  const gs = S.guests;
  for (let i = 0; i < gs.length; i++) { const g = gs[i]; if (g.st !== 'queue' && g.st !== 'ride' && g.st !== 'concert') crowd[g.ti]++; }
  const hot = S.weather.temp > 90, rain = S.weather.kind === 'rain' || S.weather.kind === 'storm';
  const closing = S.time >= DAY - HOUR;
  let removed = 0;
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i];
    if (g.st === 'gone') { removed++; continue; }
    // needs
    g.hunger += 0.1; g.thirst += hot ? 0.21 : 0.14; g.bladder += 0.06; g.nausea = Math.max(0, g.nausea - 0.2);
    if (g.st === 'ride' || g.st === 'queue' || g.st === 'concert' || g.st === 'stall') g.energy -= 0.02;
    if (g.st === 'sit') { g.energy = Math.min(100, g.energy + 0.4); g.nausea = Math.max(0, g.nausea - 0.6); }
    // happiness drift
    let dh = -0.008;
    if (g.hunger > 70 || g.thirst > 70 || g.bladder > 85) dh -= 0.03;
    if (g.energy < 20) dh -= 0.02;
    if (g.nausea > 50) dh -= 0.02;
    if (rain && !g.umb && g.st !== 'ride') dh -= 0.02;
    const sc = S._scen[g.ti];
    if (sc > 0) dh += Math.min(sc, 6) * 0.002;
    if (S._cheer && S._cheer[g.ti]) dh += 0.04;
    g.happy = Math.max(0, Math.min(100, g.happy + dh));
    // litter: carried trash goes in a bin within 2 tiles, or on the path when the guest gives up
    if (g.trash > 0 && g.st !== 'ride' && g.st !== 'queue') {
      if (S._bin[g.ti]) g.trash = 0;
      else if (--g.trash <= 0 && M.path[g.ti] && M.litter[g.ti] < 9) M.litter[g.ti]++;
    }
    // periodic checks (staggered)
    if ((S.tick + g.id) % 50 === 0) periodic(S, g, rain, hot, closing, crowd);
    switch (g.st) {
      case 'queue': {
        if (S.tick - g.qt > g.pat) {
          const o = objById(S, g.dest);
          if (o) { const k = o.queue.indexOf(g.id); if (k >= 0) o.queue.splice(k, 1); }
          leaveQueue(S, g, 'waited');
        }
        break;
      }
      case 'ride': case 'concert': break;
      case 'stall': case 'sit':
        if (--g.tm <= 0) g.st = 'choose';
        break;
      case 'choose':
        if (closing && !(g.cgo && S.time < 1150)) { goHome(S, g); break; }
        choose(S, g);
        break;
      default: move(S, g, crowd);
    }
    if (g.st === 'gone') removed++;
  }
  if (removed) {
    S.guests = gs.filter((g) => g.st !== 'gone');
  }
}

function periodic(S, g, rain, hot, closing, crowd) {
  if (g.st === 'leave' || g.st === 'ride') return;
  if (g.hunger > 75) think(S, g, 'hungry');
  else if (g.thirst > 75) think(S, g, 'thirsty');
  else if (g.bladder > 85) think(S, g, 'restroom');
  else if (rain && !g.umb) think(S, g, 'rain');
  else if (hot && next(S) < 0.2) think(S, g, 'hot');
  else if (S.map.litter[g.ti] >= 3) think(S, g, 'dirty');
  else if (crowd[g.ti] > 10) think(S, g, 'crowded');
  else if (S._cheer && S._cheer[g.ti] && next(S) < 0.4) think(S, g, 'mascot');
  else if (S._scen[g.ti] > 4 && next(S) < 0.3) think(S, g, 'scenery');
  if (g.st === 'queue' || g.st === 'concert' || (g.cgo && S.time < 1150)) return;
  const stayed = S.time - g.arr;
  const broke = S.park.payPerRide && g.money < 1;
  if (g.energy < 10 || g.happy < 20 || stayed > g.stay || broke || closing) goHome(S, g);
}

function move(S, g, crowd) {
  const M = S.map, w = M.w;
  if (g.to < 0) {
    // at a tile centre: decide the next tile
    if (g.st === 'walk' || g.st === 'leave') {
      const target = g.dest === -1 ? null : objById(S, g.dest);
      if (g.dest !== -1 && (!target || target.entry < 0)) { g.st = 'choose'; return; }
      const f = g.dest === -1 ? gateField(S) : objField(S, target);
      if (f[g.ti] === 0) { arrive(S, g); return; }
      const nx = downhill(S, f, g.ti, g.par);
      if (nx < 0) {
        if (g.dest === -1) { removeGuest(S, g); return; } // stranded off the network: walk out
        think(S, g, 'lost'); S.stats.lostHour++; g.ridden[g.dest] = (g.ridden[g.dest] || 0) + 2; g.st = 'choose'; g.idle++;
        return;
      }
      g.to = nx;
    } else if (g.st === 'wander') {
      if (g.wander-- <= 0) { g.st = 'choose'; return; }
      const nb = neighbours(S, g.ti);
      if (!nb.length) { g.st = 'choose'; g.idle++; return; }
      let j = nb[Math.floor(next(S) * nb.length)];
      if (j === g.prev && nb.length > 1) j = nb[(nb.indexOf(j) + 1) % nb.length];
      g.to = j;
    } else return;
    if (!M.path[g.to] && g.to !== M.gate) { g.to = -1; g.st = 'choose'; return; }
  }
  // walk toward the centre of g.to
  const tx = (g.to % w) + 0.5, ty = Math.floor(g.to / w) + 0.5;
  const h0 = M.height[g.ti], h1 = M.height[g.to];
  let sp = SPEED;
  if (h1 > h0) { sp *= 0.6; g.energy -= 0.15; } else g.energy -= 0.075;
  if (crowd[g.ti] > 6 || crowd[g.to] > 6) sp *= 0.5;
  if (g.energy < 15) sp *= 0.75;
  const dx = tx - g.x, dy = ty - g.y, dist = Math.abs(dx) + Math.abs(dy);
  if (dist <= sp) {
    g.x = tx; g.y = ty; g.prev = g.ti; g.ti = g.to; g.to = -1; g.z = h1;
  } else {
    g.x += Math.sign(dx) * Math.min(sp, Math.abs(dx));
    g.y += Math.sign(dy) * Math.min(sp, Math.abs(dy));
    const prog = 1 - (Math.abs(tx - g.x) + Math.abs(ty - g.y));
    g.z = h0 + (h1 - h0) * Math.max(0, Math.min(1, prog));
  }
}

// When a ride closes or is demolished, its queue and riders go back to choosing.
export function ejectFrom(S, gid, o) {
  const g = guestById(S, gid);
  if (!g) return;
  if (o && o.entry >= 0) {
    const w = S.map.w; g.ti = o.entry; g.to = -1; g.x = (o.entry % w) + 0.5; g.y = Math.floor(o.entry / w) + 0.5; g.z = S.map.height[o.entry];
  }
  leaveQueue(S, g, 'closed');
}
// A guest standing on a path that was removed walks to the gate (teleported back onto the network).
export function strand(S, g) {
  const M = S.map, w = M.w;
  g.ti = M.gate; g.to = -1; g.x = (M.gate % w) + 0.5; g.y = Math.floor(M.gate / w) + 0.5; g.z = M.height[M.gate];
  g.st = 'choose';
}

export { SPECIAL };
