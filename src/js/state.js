// The one serializable state object S, plus derived caches (keys starting with "_", never saved).
export const DAY = 1200;          // ticks per game day (10:00–22:00)
export const HOUR = 100;          // ticks per game hour
export const OPEN_HOUR = 10;
export const TPS = 12;            // ticks per real second at 1×
export const MAXH = 10;           // highest terrain level
export const K = { GRASS: 0, ROCK: 1, WATER: 2 };

export function createState({ seed = 1, w = 48, h = 48 } = {}) {
  const n = w * h;
  const S = {
    v: 1, seed, rng: seed | 0, tick: 0,
    time: 0, dow: 0, month: 0, year: 1978, dayCount: 0,
    map: {
      w, h,
      height: new Uint8Array(n), kind: new Uint8Array(n), tree: new Uint8Array(n),
      path: new Uint8Array(n), owned: new Uint8Array(n).fill(1), litter: new Uint8Array(n), occ: new Int32Array(n),
      gate: 0,
    },
    objects: [], guests: [], staff: [], nextId: 1, nextGuest: 1,
    finance: { cash: 50000, loan: 0, maxLoan: 100000, rate: 0.1, month: blankLedger(), months: [], season: blankLedger(), seasons: [], badMonths: 0 },
    park: {
      name: 'Ouachita Hills Fun Park', open: true, admission: 10, payPerRide: false, cooler: false,
      rating: 400, ratingParts: {}, campaigns: {}, research: { level: 0, points: 0, queue: [], unlocked: [] },
      concert: null, seasonsOpen: 0, market: [], waterCal: true,
    },
    weather: { kind: 'sun', hi: 80, lo: 60, temp: 70, storm: [0, 0] },
    stats: { guestsToday: 0, guestsSeason: 0, guestsTotal: 0, turnedAway: 0, seasonGuests: [], demand: {}, lostHour: 0, concertSeats: 0, peak: 0 },
    thoughts: {}, thoughtsHour: {},
    scenario: null, tutorial: null, trackBuild: null, pending: null,
    msgs: [], spawnQ: [],
  };
  return S;
}

export function blankLedger() {
  return { admission: 0, rides: 0, food: 0, drinks: 0, merch: 0, concerts: 0, wages: 0, upkeep: 0, construction: 0, research: 0, marketing: 0, interest: 0, acts: 0, repairs: 0, guests: 0 };
}
export const INCOME_KEYS = ['admission', 'rides', 'food', 'drinks', 'merch', 'concerts'];
export const COST_KEYS = ['wages', 'upkeep', 'construction', 'research', 'marketing', 'interest', 'acts', 'repairs'];

export function earn(S, key, amt) {
  S.finance.cash += amt; S.finance.month[key] += amt; S.finance.season[key] += amt;
}
export function spend(S, key, amt) {
  S.finance.cash -= amt; S.finance.month[key] += amt; S.finance.season[key] += amt;
}

// Refunds reduce the construction line rather than counting as income.
export function refund(S, amt) {
  S.finance.cash += amt; S.finance.month.construction -= amt; S.finance.season.construction -= amt;
}

export function msg(S, text, kind = 'info') {
  S.msgs.push({ t: S.tick, text, kind });
  if (S.msgs.length > 40) S.msgs.shift();
}

export const idx = (S, x, y) => y * S.map.w + x;
export const inb = (S, x, y) => x >= 0 && y >= 0 && x < S.map.w && y < S.map.h;

export function objById(S, id) {
  if (!S._objMap || S._objMapVer !== S.objects.length + ':' + (S._objVer || 0)) {
    S._objMap = new Map(S.objects.map((o) => [o.id, o]));
    S._objMapVer = S.objects.length + ':' + (S._objVer || 0);
  }
  return S._objMap.get(id);
}
export function guestById(S, id) {
  if (!S._gmap) S._gmap = new Map(S.guests.map((g) => [g.id, g]));
  return S._gmap.get(id);
}
export function touchObjects(S) { S._objVer = (S._objVer || 0) + 1; S._objMap = null; }
export function touchNet(S) { S._netVer = (S._netVer || 0) + 1; S._fields = null; S._derivedVer = -1; }

// ---- save format ----------------------------------------------------------------------------
const TYPED = { Uint8Array, Int32Array, Uint16Array, Float32Array };
export function serialize(S) {
  return JSON.stringify(S, (k, v) => {
    if (k && k[0] === '_') return undefined;
    if (ArrayBuffer.isView(v)) return { t$: v.constructor.name, d: rle(Array.from(v)) };
    return v;
  });
}
export function deserialize(json) {
  const S = JSON.parse(typeof json === 'string' ? json : JSON.stringify(json), (k, v) => {
    if (v && typeof v === "object" && v.t$ && TYPED[v.t$]) return TYPED[v.t$].from(unrle(v.d));
    return v;
  });
  return S;
}
// Run-length encode number arrays as [value, count, value, count…].
function rle(a) {
  const out = [];
  for (let i = 0; i < a.length;) {
    let j = i; while (j < a.length && a[j] === a[i]) j++;
    out.push(a[i], j - i); i = j;
  }
  return out;
}
function unrle(r) {
  const out = [];
  for (let i = 0; i < r.length; i += 2) for (let k = 0; k < r[i + 1]; k++) out.push(r[i]);
  return out;
}
