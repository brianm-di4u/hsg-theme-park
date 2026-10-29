// Staff agents: groundskeepers sweep, mechanics repair and inspect, entertainers cheer guests up.
import { STAFF, YEAR_ROUND } from './catalog.js';
import { msg } from './state.js';
import { next } from './rng.js';
import { objField, neighbours, bfsPath, downhill } from './fields.js';
import { repaired } from './rides.js';

const SPEED = 0.2, SWEEP = 12, INSPECT = 30;

export function wage(st) { return Math.round(STAFF[st.role].wage * (st.seasonal ? 1 : YEAR_ROUND)); }

export function hire(S, role, seasonal = true) {
  if (!STAFF[role]) return { ok: false, reason: 'Unknown role' };
  const M = S.map, w = M.w;
  const n = S.staff.filter((s) => s.role === role).length + 1;
  const st = { id: S.nextId++, role, seasonal: seasonal ? 1 : 0, name: `${STAFF[role].name} ${n}`, ti: M.gate, to: -1, x: (M.gate % w) + 0.5, y: Math.floor(M.gate / w) + 0.5, z: M.height[M.gate], st: 'idle', tgt: 0, tm: 0, path: [], done: 0 };
  S.staff.push(st);
  msg(S, `Hired ${st.name} (${seasonal ? 'seasonal' : 'year-round'}, $${wage(st).toLocaleString('en-US')}/month).`);
  return { ok: true, id: st.id };
}
export function fire(S, id) {
  const k = S.staff.findIndex((s) => s.id === id);
  if (k < 0) return { ok: false };
  const [st] = S.staff.splice(k, 1);
  for (const o of S.objects) if (o.mech === st.id) o.mech = 0;
  return { ok: true };
}

// Seasonal (teen) staff are back at school on weekdays from mid-August through September.
export function atSchool(S, st) {
  if (!st.seasonal) return false;
  const weekday = S.dow < 5;
  return weekday && ((S.month === 4 && S.dow >= 3) || S.month === 5);
}

export function updateStaff(S) {
  const M = S.map, w = M.w;
  if (!S._cheer || S._cheer.length !== M.w * M.h) S._cheer = new Uint8Array(M.w * M.h);
  if (S.tick % 10 === 0) S._cheer.fill(0);
  for (const st of S.staff) {
    const school = atSchool(S, st);
    if (school) { if (st.st !== 'school') { st.st = 'school'; if (st.tgt) release(S, st); } continue; }
    if (st.st === 'school') { st.st = 'idle'; st.ti = M.gate; st.x = (M.gate % w) + 0.5; st.y = Math.floor(M.gate / w) + 0.5; st.to = -1; }
    if (st.role === 'mascot' && S.tick % 10 === 0) {
      const x0 = st.ti % w, y0 = Math.floor(st.ti / w);
      for (let y = Math.max(0, y0 - 3); y <= Math.min(M.h - 1, y0 + 3); y++)
        for (let x = Math.max(0, x0 - 3); x <= Math.min(w - 1, x0 + 3); x++) S._cheer[y * w + x] = 1;
    }
    if (st.to >= 0) { step(S, st); continue; }
    if (st.tm > 0) { work(S, st); continue; }
    decide(S, st);
  }
}

function release(S, st) {
  const o = S.objects.find((x) => x.id === st.tgt);
  if (o && o.mech === st.id) o.mech = 0;
  st.tgt = 0;
}

function decide(S, st) {
  const M = S.map;
  if (st.role === 'keeper') {
    if (M.litter[st.ti] > 0) { st.tm = SWEEP; st.st = 'sweep'; return; }
    if (!st.path.length) st.path = bfsPath(S, st.ti, (j) => M.litter[j] > 0, 14) || [];
    if (st.path.length) { st.to = st.path.shift(); st.st = 'walk'; return; }
    return wander(S, st);
  }
  if (st.role === 'mechanic') {
    let o = st.tgt ? S.objects.find((x) => x.id === st.tgt) : null;
    if (!o) {
      // nearest broken ride nobody is fixing, else the ride with the oldest inspection
      let best = null, bd = 1e9;
      for (const r of S.objects) {
        if (!r.broken || r.mech || r.entry < 0) continue;
        const d = objField(S, r)[st.ti];
        if (d < bd) { bd = d; best = r; }
      }
      if (!best) {
        let age = 400;
        for (const r of S.objects) {
          if ((r.kind !== 'ride' && r.kind !== 'track') || r.entry < 0 || r.status === 'standing' || r.status === 'building') continue;
          const a = S.tick - r.lastInspect;
          if (a > age && objField(S, r)[st.ti] < 65535) { age = a; best = r; }
        }
      }
      if (!best) return wander(S, st);
      o = best; st.tgt = o.id; if (o.broken) o.mech = st.id;
    }
    if (o.entry < 0) { release(S, st); return; }
    const f = objField(S, o);
    if (f[st.ti] === 0) { st.tm = o.broken ? 60 : INSPECT; st.st = o.broken ? 'repair' : 'inspect'; return; }
    const nx = downhill(S, f, st.ti, st.id & 3);
    if (nx < 0) { release(S, st); return wander(S, st); }
    st.to = nx; st.st = 'walk';
    return;
  }
  wander(S, st);
}

function wander(S, st) {
  const nb = neighbours(S, st.ti);
  st.st = 'walk';
  if (!nb.length) return;
  st.to = nb[Math.floor(next(S) * nb.length)];
}

function work(S, st) {
  if (--st.tm > 0) return;
  const M = S.map;
  if (st.st === 'sweep') { st.done += M.litter[st.ti]; M.litter[st.ti] = 0; } // a whole tile per sweep
  if (st.st === 'repair' || st.st === 'inspect') {
    const o = S.objects.find((x) => x.id === st.tgt);
    if (o) {
      if (o.broken) { repaired(S, o); msg(S, `${st.name} repaired ${o.name}.`); }
      else { o.lastInspect = S.tick; o.rel = Math.min(o.relBase, o.rel + 0.02); }
      st.done++;
    }
    st.tgt = 0;
  }
  st.st = 'idle';
}

function step(S, st) {
  const M = S.map, w = M.w;
  if (!M.path[st.to]) { st.to = -1; st.path = []; return; }
  const tx = (st.to % w) + 0.5, ty = Math.floor(st.to / w) + 0.5;
  const dx = tx - st.x, dy = ty - st.y;
  const h0 = M.height[st.ti], h1 = M.height[st.to];
  const sp = SPEED * (h1 > h0 ? 0.7 : 1);
  if (Math.abs(dx) + Math.abs(dy) <= sp) { st.x = tx; st.y = ty; st.ti = st.to; st.to = -1; st.z = h1; }
  else {
    st.x += Math.sign(dx) * Math.min(sp, Math.abs(dx)); st.y += Math.sign(dy) * Math.min(sp, Math.abs(dy));
    const prog = 1 - (Math.abs(tx - st.x) + Math.abs(ty - st.y));
    st.z = h0 + (h1 - h0) * Math.max(0, Math.min(1, prog));
  }
}
