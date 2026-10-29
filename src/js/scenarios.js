// Campaign scenarios (eras inspired by the real park's history; park, rides and people are fictional)
// and the sandbox. setup() builds the starting park with the same actions the player uses.
import { RIDES, TRACKS, STALLS, SCENERY, SPECIAL } from './catalog.js';
import { createState, blankLedger } from './state.js';
import { genTerrain } from './terrain.js';
import { mainStreet, autoPlace, autoBlueprint, autoScenery } from './plan.js';
import { hire } from './staff.js';

const SCEN = Object.keys(SCENERY);
const BASIC_STALLS = ['bbq', 'pizza', 'funnel', 'refill', 'snocone', 'souvenir', 'restroom', 'bench'];

function prebuild(S, list) {
  for (const t of list) {
    if (t.startsWith('bp:')) autoBlueprint(S, t.slice(3));
    else autoPlace(S, t);
  }
}
function age(S, years, rel) {
  for (const o of S.objects) {
    o.age = years;
    if (rel && o.rel) { o.relBase = rel; o.rel = rel - 0.02; }
  }
}
function stand(S, types) {
  for (const o of S.objects) if (types.includes(o.type) && o.queue) { o.status = 'standing'; }
}

export const SCENARIOS = [
  {
    id: 1, year: 1978, title: 'Opening Summer', era: 'motor-hotel', seed: 1978, hills: 'rolling',
    cash: 60000, loan: 0, maxLoan: 50000, rate: 0.09, admission: 8, deadline: 1978, tutorial: true,
    intro: 'Summer 1978. A local builder has cleared a gate at the foot of a wooded Ouachita ridge. Lay paths, place a few gentle rides and a log flume, feed people, and open a family fun park.',
    facts: ['open', 'name', 'flume', 'tower', 'scale'],
    unlocked: ['carousel', 'planes', 'wheel', 'tower', 'family', 'flume', ...BASIC_STALLS, ...SCEN],
    research: ['cups', 'bumper', 'swings'],
    goals: [{ type: 'guests', value: 4000, label: 'Welcome 4,000 guests this season' }, { type: 'rating', value: 500, label: 'Reach a park rating of 500' }],
  },
  {
    id: 2, year: 1984, title: 'Debt Season', era: 'motor-hotel', seed: 1984, hills: 'rolling',
    cash: 15000, loan: 120000, maxLoan: 140000, rate: 0.12, admission: 10, deadline: 1985, seasonsOpen: 6, rating: 430,
    intro: 'Spring 1984. The park is six seasons old and owes the bank $120,000 at 12%. Cut what does not pay, fix what does, and pay the loan down before the investors sell.',
    facts: ['debt', 'shuttle'],
    unlocked: ['carousel', 'planes', 'wheel', 'tower', 'cups', 'bumper', 'swings', 'family', 'flume', 'chicken', ...BASIC_STALLS, ...SCEN],
    research: ['ship', 'drop', 'steel', 'boom'],
    setup: (S) => { mainStreet(S, 15, 5, 7); prebuild(S, ['carousel', 'planes', 'bumper', 'wheel', 'cups', 'bp:littlebear', 'bp:lumber', 'bbq', 'refill', 'funnel', 'restroom', 'souvenir']); autoScenery(S, 8); age(S, 4, 0.93); },
    goals: [{ type: 'loan', value: 90000, max: true, label: 'Pay the loan down to $90,000' }, { type: 'rating', value: 560, label: 'Reach a park rating of 560' }],
  },
  {
    id: 3, year: 1991, title: 'The Secondhand Woodie', era: 'nps-rustic', seed: 1991, hills: 'steep',
    cash: 140000, loan: 0, maxLoan: 100000, rate: 0.1, admission: 12, deadline: 1991, seasonsOpen: 12, rating: 470, market: true,
    intro: 'Spring 1991. A wooden coaster from a closed park is for sale for $10,000. The catch is moving it. Find it a hillside, build it into the slope, and make it the reason people drive up from Little Rock.',
    facts: ['woodie', 'reloc', 'lift'],
    unlocked: ['carousel', 'planes', 'wheel', 'tower', 'cups', 'bumper', 'swings', 'ship', 'family', 'flume', 'wood', 'chicken', ...BASIC_STALLS, ...SCEN],
    research: ['drop', 'boom', 'steel'],
    setup: (S) => { mainStreet(S, 15, 5, 7); prebuild(S, ['carousel', 'planes', 'bumper', 'swings', 'wheel', 'bp:littlebear', 'bp:lumber', 'bbq', 'pizza', 'refill', 'funnel', 'restroom', 'souvenir']); autoScenery(S, 10); age(S, 5, 0.93); },
    goals: [{ type: 'ride', ttype: 'wood', value: 3, label: 'Run a wooden coaster of intensity 3+' }, { type: 'guests', value: 6000, label: 'Welcome 6,000 guests this season' }, { type: 'rating', value: 620, label: 'Reach a park rating of 620' }],
  },
  {
    id: 4, year: 1995, title: 'Hold the Gates', era: 'nps-rustic', seed: 1995, hills: 'rolling',
    cash: 8000, loan: 90000, maxLoan: 100000, rate: 0.12, admission: 14, deadline: 1995, seasonsOpen: 17, rating: 380,
    intro: 'Spring 1995. Rides are tired, crowds are thin and the bank is calling. In history the park closed this year. Can you finish the season in the black?',
    facts: ['closed', 'fitraco'],
    unlocked: ['carousel', 'planes', 'wheel', 'tower', 'cups', 'bumper', 'swings', 'ship', 'drop', 'family', 'flume', 'wood', 'chicken', ...BASIC_STALLS, ...SCEN],
    research: ['boom', 'steel', 'sky'],
    setup: (S) => { mainStreet(S, 16, 5, 7); prebuild(S, ['carousel', 'planes', 'bumper', 'swings', 'wheel', 'ship', 'bp:littlebear', 'bp:lumber', 'bp:ridge', 'bbq', 'pizza', 'refill', 'funnel', 'restroom', 'souvenir']); autoScenery(S, 6); age(S, 9, 0.9); },
    goals: [{ type: 'profit', value: 40000, endOnly: true, label: 'Make $40,000 operating profit this season' }, { type: 'rating', value: 600, label: 'Reach a park rating of 600' }],
  },
  {
    id: 5, year: 2000, title: 'Bond Rebirth', era: 'lake-life', seed: 2000, hills: 'rolling',
    cash: 260000, loan: 0, maxLoan: 120000, rate: 0.08, admission: 18, deadline: 2001, seasonsOpen: 0, rating: 420,
    intro: 'Spring 2000. After five dark years, city bond money reopens the gates. Old rides stand silent: refurbish them or clear them. Build a water park, then keep people coming back once the novelty fades.',
    facts: ['reopen', 'bond', 'water', 'att2000', 'decline', 'watercal'],
    unlocked: ['carousel', 'planes', 'wheel', 'tower', 'cups', 'bumper', 'swings', 'ship', 'drop', 'boom', 'family', 'flume', 'wood', 'wave', 'river', 'slides', 'chicken', ...BASIC_STALLS, ...SCEN],
    research: ['complex', 'racer', 'steel', 'surf', 'splash'],
    setup: (S) => { mainStreet(S, 16, 5, 8); prebuild(S, ['carousel', 'bumper', 'wheel', 'swings', 'bp:littlebear', 'bp:ridge', 'bbq', 'refill', 'restroom']); autoScenery(S, 4); age(S, 12, 0.92); stand(S, ['carousel', 'bumper', 'wheel', 'swings', 'family', 'wood']); },
    goals: [{ type: 'guests', year: 2000, value: 9000, label: 'Welcome 9,000 guests in 2000' }, { type: 'ratio', base: 2000, year: 2001, value: 90, endOnly: true, label: 'Keep 2001 attendance at 90% of 2000' }, { type: 'rating', value: 650, label: 'Reach a park rating of 650' }],
  },
  {
    id: 6, year: 2003, title: 'Saturday Night Stage', era: 'deco-neon', seed: 2003, hills: 'steep',
    cash: 160000, loan: 0, maxLoan: 150000, rate: 0.07, admission: 22, deadline: 2003, seasonsOpen: 3, rating: 560,
    intro: 'Spring 2003. Build an amphitheater in the woods, book Saturday-night shows, and add a coaster big enough to headline the posters.',
    facts: ['amphi', 'saturday', 'inverted', 'att2004'],
    unlocked: [...Object.keys(RIDES).filter((t) => !['surf', 'splash', 'sky'].includes(t)), 'family', 'flume', 'wood', 'steel', 'amphi', 'chicken', ...BASIC_STALLS, ...SCEN],
    research: ['surf', 'splash', 'sky'],
    setup: (S) => { mainStreet(S, 18, 5, 8); prebuild(S, ['carousel', 'planes', 'bumper', 'swings', 'wheel', 'ship', 'drop', 'cups', 'bp:littlebear', 'bp:lumber', 'bp:ridge', 'wave', 'slides', 'bbq', 'pizza', 'chicken', 'refill', 'snocone', 'funnel', 'restroom', 'restroom', 'souvenir']); autoScenery(S, 14); age(S, 3, 0.95); },
    goals: [{ type: 'concert', value: 1500, label: 'Sell $1,500 of concert seats' }, { type: 'ride', value: 4, label: 'Run a coaster of intensity 4+' }, { type: 'rating', value: 650, label: 'Reach a park rating of 650' }],
  },
];

export const MARKET_3 = [
  { kind: 'track', bp: 'ridge', name: 'Used wooden coaster', price: 10000, reloc: 90000, rel: 0.9, prov: 'Built in 1972 for a Gulf Coast boardwalk park; idle since that park closed. (Provenance is fictional.)' },
  { kind: 'ride', type: 'ship', name: "Used Swingin' Skiff", price: 6000, reloc: 5000, rel: 0.9, prov: 'Swung for eleven seasons at a county fair in Missouri. (Fictional.)' },
  { kind: 'ride', type: 'drop', name: 'Used drop tower', price: 9000, reloc: 12000, rel: 0.89, prov: 'Bought for a park that never closed the deal. (Fictional.)' },
];

export function sandboxDef(o = {}) {
  const cash = o.cash === 'unlimited' ? 10000000 : +(o.cash || 250000);
  return {
    id: 0, year: o.year || 2026, title: 'Sandbox', era: 'lake-life', seed: o.seed ?? 7, hills: o.hills || 'rolling',
    cash, loan: 0, maxLoan: 200000, rate: 0.08, admission: 15, deadline: 9999, allUnlocked: true, market: true,
    intro: 'Build anything. No goals, no deadline.', facts: [], unlocked: [], research: [], goals: [],
  };
}

export function newState(opts = {}) {
  const sc = opts.mode === 'sandbox' ? sandboxDef(opts) : SCENARIOS.find((s) => s.id === (opts.scenario || 1)) || SCENARIOS[0];
  const seed = (opts.seed ?? sc.seed) | 0;
  const S = createState({ seed });
  genTerrain(S, { hills: opts.hills || sc.hills, seed });
  S.year = sc.year;
  S.scenario = { id: sc.id, title: sc.title, mode: sc.id ? 'campaign' : 'sandbox', goals: sc.goals, deadline: sc.deadline, status: 'playing', allUnlocked: !!sc.allUnlocked, era: sc.era, startYear: sc.year };
  S.park.research.unlocked = [...new Set(sc.unlocked)];
  S.park.research.queue = [...sc.research];
  if (sc.setup && !opts.empty) {
    S.finance.cash = 1e9;
    S.scenario.allUnlocked = true;
    sc.setup(S);
    S.scenario.allUnlocked = !!sc.allUnlocked;
  }
  const F = S.finance;
  F.cash = sc.cash; F.loan = sc.loan; F.maxLoan = sc.maxLoan; F.rate = sc.rate;
  F.month = blankLedger(); F.season = blankLedger();
  S.park.admission = sc.admission;
  S.park.rating = sc.rating || 400;
  S.park.seasonsOpen = sc.seasonsOpen || 0;
  if (sc.market) S.park.market = (sc.id === 0 ? MARKET_3 : MARKET_3).map((m, i) => ({ ...m, i, sold: false }));
  if (sc.setup && !opts.empty) { hire(S, 'mechanic', true); hire(S, 'keeper', true); }
  S.tutorial = sc.tutorial && !opts.noTutorial ? { step: 0 } : null;
  S.msgs = [];
  S.rng = (seed * 2654435761) | 0;
  return S;
}

export { TRACKS, STALLS, SPECIAL };
