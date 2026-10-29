// DOM UI: HUD, tool dock, side panel / bottom sheet, and full-screen screens.
import { G, money, esc, saveSettings, toast, store } from './app.js';
import { RIDES, TRACKS, STALLS, SCENERY, SPECIAL, STAFF, CAMPAIGNS, ACTS, MONTHS, DOWS, YEAR_ROUND, def, kindOf } from './catalog.js';
import { INCOME_KEYS, COST_KEYS, HOUR, objById, guestById } from './state.js';
import { SCENARIOS } from './scenarios.js';
import { FACTS, factById } from './facts.js';
import { THOUGHTS, KIND_NAMES, rideThrill, rideInt, rideHreq, waitTicks, queueMax, rideOpen } from './guests.js';
import { BLUEPRINTS, buildingTrack, addCheck, simulate } from './track.js';
import { isUnlocked } from './build.js';
import { demand, monthlyCosts, goalValue, goalMet, RESEARCH_LEVELS } from './sim.js';
import { wage, atSchool } from './staff.js';
import { startGame, saveTo, loadFrom, slotInfo, SLOTS, latestSlot, doAct, TUTORIAL } from './game.js';
import { setOn, setVolume, sfx } from './audio.js';
import { waterOpenToday } from './rides.js';
import { RESEARCH_COST, researchCat } from './catalog.js';

const $ = (id) => document.getElementById(id);
const intTag = (n) => `<span class="tag int" title="Intensity ${n} of 5">Int ${n}</span>`;

// ---- HUD -----------------------------------------------------------------------------------
const WX = { sun: ['☀', 'Sunny'], cloud: ['☁', 'Cloudy'], rain: ['☂', 'Rain'], storm: ['⚡', 'Storms'] };
export function clock(S) {
  const mins = 10 * 60 + Math.floor(S.time * 60 / HOUR);
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}
// The HUD is built once; updates only touch text and pressed states, so buttons stay under the pointer.
let hudBuilt = false;
const setText = (id, v) => { const e = $(id); if (e && e.innerHTML !== v) e.innerHTML = v; };
export function renderHud() {
  const S = G.S, el = $('hud');
  if (!S || G.scene !== 'park') { el.hidden = true; return; }
  el.hidden = false;
  if (!hudBuilt) {
    el.innerHTML = `<span class="park" id="h-park"></span><span class="stat" title="Date" id="h-date"></span><span class="stat" title="Time" id="h-time"></span><span class="stat" title="Weather" id="h-wx"></span><span class="stat" title="Cash" id="h-cash"></span><span class="stat" title="Guests in the park" id="h-guests"></span><span class="stat" title="Park rating" id="h-rating"></span><span class="grow"></span><span class="speed" role="group" aria-label="Time"><button data-act="pause" id="h-pause"></button>${[1, 2, 4, 8].map((n) => `<button data-act="speed" data-arg="${n}" aria-label="Speed ${n} times">${n}×</button>`).join('')}</span><button class="hudbtn" data-act="panel" data-arg="park" aria-label="Park menu">☰<span class="pk"> Park</span></button>`;
    hudBuilt = true;
  }
  const W = WX[S.weather.kind];
  setText('h-park', esc(S.park.name));
  setText('h-date', `<b>${DOWS[S.dow]}</b> <span class="mon">${MONTHS[Math.min(6, S.month)]}</span><span class="mo3">${MONTHS[Math.min(6, S.month)].slice(0, 3)}</span><span class="yr"> ${S.year}</span>`);
  setText('h-time', clock(S));
  setText('h-wx', `${icon({ sun: 'sun', cloud: 'cloud', rain: 'rain', storm: 'storm' }[S.weather.kind], W[0])} <span class="wxw">${W[1]}</span> ${S.weather.temp}°F`);
  setText('h-cash', `${icon('cash', '💵')} <b>${money(S.finance.cash)}</b>`);
  $('h-cash').classList.toggle('neg', S.finance.cash < 0);
  setText('h-guests', `${icon('guests', '👥')} <b>${S.guests.length}</b>`);
  setText('h-rating', `${icon('rating', '★')} <b>${Math.round(S.park.rating)}</b>`);
  const pb = $('h-pause');
  setText('h-pause', G.paused ? '▶' : '⏸');
  pb.setAttribute('aria-pressed', String(G.paused)); pb.setAttribute('aria-label', G.paused ? 'Paused. Press to play' : 'Pause');
  for (const b of el.querySelectorAll('[data-act="speed"]')) b.setAttribute('aria-pressed', String(!G.paused && G.speed === +b.dataset.arg));
  measureBars();
}
// Toasts, the tutorial tip and the panel are placed from the real HUD and dock heights.
let barH = '';
export function measureBars() {
  const h = $('hud').offsetHeight, d = $('dock').offsetHeight, key = h + ':' + d;
  if (key === barH || !h) return;
  barH = key;
  document.documentElement.style.setProperty('--hud-h', h + 'px');
  if (d) document.documentElement.style.setProperty('--dock-h', d + 'px');
}

// ---- dock ----------------------------------------------------------------------------------
// painted icons (art-src/icons → assets/icon-*.webp via art-pack); only names listed here are ever requested
const ICON_SET = new Set(['inspect', 'paths', 'rides', 'coasters', 'water', 'shops', 'scenery', 'terrain', 'demolish', 'staff', 'park', 'sun', 'cloud', 'rain', 'storm', 'cash', 'guests', 'rating']);
export const icon = (name, fb) => (ICON_SET.has(name) ? `<img class="pi" src="assets/icon-${name}.webp" alt="" draggable="false">` : fb);
const TOOL_ICON = { inspect: 'inspect', path: 'paths', rides: 'rides', coasters: 'coasters', water: 'water', shops: 'shops', scenery: 'scenery', terrain: 'terrain', demolish: 'demolish', staff: 'staff', park: 'park' };
const TOOLS = [
  ['inspect', '🔍', 'Inspect'], ['path', '▦', 'Paths'], ['rides', '🎠', 'Rides'], ['coasters', '🎢', 'Coasters'], ['water', '🌊', 'Water'],
  ['shops', '🍴', 'Shops'], ['scenery', '🌲', 'Scenery'], ['terrain', '⛰', 'Terrain'], ['demolish', '✖', 'Demolish'], ['staff', '👷', 'Staff'], ['park', '📋', 'Park'],
];
export function renderDock() {
  const el = $('dock');
  if (G.scene !== 'park') { el.hidden = true; return; }
  el.hidden = false;
  const active = G.tool === 'place' || G.tool === 'station' || G.tool === 'blueprint' || G.tool === 'used' ? G.palette : G.tool;
  queueMicrotask(measureBars);
  el.innerHTML = TOOLS.map(([id, ic, label]) => `<button data-act="tool" data-arg="${id}" aria-pressed="${active === id || (G.panel === id && ['staff', 'park'].includes(id))}" title="${label}"><span class="ic" aria-hidden="true">${icon(TOOL_ICON[id], ic)}</span>${label}</button>`).join('');
}

// ---- panel ---------------------------------------------------------------------------------
function shell(title, body, extra = '') {
  return `<header><h2>${title}</h2>${extra}<button class="x" data-act="closePanel" aria-label="Close panel">✕</button></header><div class="body">${body}</div>`;
}
function itemBtn(type, pressed, extraMeta = '') {
  const S = G.S, d = def(type), k = kindOf(type);
  const ok = isUnlocked(S, type);
  const cost = k === 'track' ? d.station : d.cost;
  let meta = '';
  if (k === 'ride') meta = `${intTag(d.int)} <span class="tag">${d.size}×${d.size}</span>${d.hreq ? ` <span class="tag">${d.hreq} in+</span>` : ''}${d.kiddie ? ' <span class="tag">kids</span>' : ''}${d.upcharge ? ' <span class="tag">up-charge</span>' : ''}`;
  else if (k === 'stall') meta = d.price ? `<span class="tag">sells $${d.price}</span>` : '<span class="tag">free</span>';
  else if (k === 'special') meta = `<span class="tag">${d.size}×${d.size}</span>`;
  else if (k === 'track') meta = `<span class="tag">station</span> <span class="tag">${d.hreq} in+</span>`;
  const sw = (d.color || '#9C7A55');
  const icon = k === 'ride' ? '🎠' : k === 'stall' ? (STALLS[type].need === 'restroom' ? '🚻' : STALLS[type].need === 'rest' ? '🪑' : '🛒') : k === 'track' ? '🎢' : k === 'special' ? '🎵' : '🌲';
  return `<button class="item" data-act="pick" data-arg="${type}" aria-pressed="${pressed}" ${ok ? '' : 'disabled'} aria-label="${esc(d.name)}, ${money(cost)}${ok ? '' : ', needs research'}">
${(() => { const th = G.hooks.thumb && G.hooks.thumb(type); return th ? `<span class="sw th" aria-hidden="true"><img src="${th}" alt=""></span>` : `<span class="sw" style="background:${sw}" aria-hidden="true">${icon}</span>`; })()}
<span><span class="nm">${esc(d.name)}</span><br><span class="meta tags">${ok ? meta : '<span class="tag">needs research</span>'}${extraMeta}</span></span>
<span class="cost">${money(cost)}</span></button>`;
}

export function renderPanel() {
  const el = $('panel'), S = G.S;
  if (G.scene !== 'park' || !G.panel || !S) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const fn = PANELS[G.panel];
  el.innerHTML = fn ? fn(S) : '';
}
export function setPanel(p, arg) {
  G.panel = p; G.panelArg = arg;
  G.trans = Math.max(G.trans, performance.now() + 50);
  renderPanel(); renderDock();
  const first = $('panel').querySelector('.body button, .body input, .body select');
  if (first && G.focusPanel) first.focus();
}

const PANELS = {
  rides: (S) => shell('Rides', `<p class="muted">Pick a ride, then click a spot beside a path. Uneven ground is graded flat ($40 per level).</p><h3>Gentle</h3><div class="items">${Object.keys(RIDES).filter((t) => RIDES[t].cat === 'gentle').map((t) => itemBtn(t, G.placeType === t)).join('')}</div><h3>Thrill</h3><div class="items">${Object.keys(RIDES).filter((t) => RIDES[t].cat === 'thrill').map((t) => itemBtn(t, G.placeType === t)).join('')}</div>${S.scenario.allUnlocked || isUnlocked(S, 'amphi') ? `<h3>Shows</h3><div class="items">${itemBtn('amphi', G.placeType === 'amphi')}</div>` : ''}`),
  water: (S) => shell('Water park', `<p class="muted">Water rides open daily May to mid-August, then weekends through September (toggle in Finances). Pumps cost $20/month per level of hill, so valleys are cheaper.</p><div class="items">${Object.keys(RIDES).filter((t) => RIDES[t].cat === 'water').map((t) => itemBtn(t, G.placeType === t)).join('')}</div><p class="muted">Today: ${waterOpenToday(S) ? 'water rides open' : 'water rides closed by the calendar'}.</p>`),
  shops: (S) => shell('Shops and facilities', `<div class="items">${Object.keys(STALLS).map((t) => itemBtn(t, G.placeType === t)).join('')}</div>`),
  scenery: (S) => shell('Scenery', `<p class="muted">Scenery near paths cheers guests up and raises the rating. Trash cans catch litter within 2 tiles.</p><div class="items">${Object.keys(SCENERY).map((t) => itemBtn(t, G.placeType === t, SCENERY[t].sv ? ` <span class="tag">scenery ${SCENERY[t].sv}</span>` : '')).join('')}</div>`),
  coasters: (S) => {
    const types = Object.keys(TRACKS).map((t) => itemBtn(t, G.tool === 'station' && G.placeType === t)).join('');
    const bps = Object.entries(BLUEPRINTS).map(([id, bp]) => {
      const ok = isUnlocked(S, bp.ttype);
      return `<button class="item" data-act="pickBp" data-arg="${id}" aria-pressed="${G.tool === 'blueprint' && G.placeType === id}" ${ok ? '' : 'disabled'}><span class="sw" style="background:${TRACKS[bp.ttype].color}" aria-hidden="true">📐</span><span><span class="nm">${esc(bp.name)}</span><br><span class="meta">${ok ? 'Click a tile beside a path. Rotate with R.' : 'needs research'}</span></span><span class="cost">≈${money(TRACKS[bp.ttype].station + 6000)}</span></button>`;
    }).join('');
    const mk = S.park.market && S.park.market.length ? `<h3>Used-ride market</h3>${marketList(S)}` : '';
    return shell('Coasters and flumes', `<p class="muted">Draw your own: pick a type, place its 3-cell station beside a path (R rotates), then add track cell by cell. Supports cost $25 per level above the ground, so riding down a hillside is cheap.</p><h3>Build your own</h3><div class="items">${types}</div><h3>Blueprints</h3><div class="items">${bps}</div>${mk}`);
  },
  market: (S) => shell('Used-ride market', marketList(S)),
  terrain: () => shell('Terrain', `<p class="muted">Click a tile to raise or lower it one level ($40, +$20 on rock). Paths connect across a step of one level; bigger steps need grading.</p><div class="row"><button class="btn" data-act="terra" data-arg="1" aria-pressed="${G.terraDir === 1}">▲ Raise</button><button class="btn" data-act="terra" data-arg="-1" aria-pressed="${G.terraDir === -1}">▼ Lower</button></div>`),
  path: () => shell('Paths', `<p class="muted">Drag to lay a straight or L-shaped run ($12 a tile). Paths step up or down one level as stairs; walking uphill is slower and more tiring, so guests prefer level routes.</p><p class="muted">Keyboard: arrows move the cursor, Enter starts and ends a run.</p>`),
  demolish: () => shell('Demolish', '<p class="muted">Click a path, ride, shop or scenery item to remove it. Rides refund half their cost; you can also leave a ride standing as a landmark from its window.</p>'),
  inspect: () => shell('Inspect', '<p class="muted">Click a guest, ride or shop to see details. Drag the map (or use the arrow keys) to look around; scroll or pinch to zoom.</p>'),
  track: (S) => trackPanel(S),
  obj: (S) => objPanel(S),
  guest: (S) => guestPanel(S),
  park: (S) => shell('Park', `<p class="muted"><b>${esc(S.park.name)}</b></p><div class="items">${[['finances', '💵', 'Finances and prices'], ['guests', '👥', 'Guests and feedback'], ['rating', '★', 'Park rating'], ['goals', '🎯', S.scenario.mode === 'campaign' ? 'Scenario goals' : 'Sandbox'], ['staff', '👷', 'Staff'], ['research', '🔬', 'Research'], ['marketing', '📣', 'Marketing'], ['concerts', '🎵', 'Concerts'], ...(S.park.market && S.park.market.length ? [['market', '🏷', 'Used-ride market']] : []), ['saves', '💾', 'Save and load']].map(([p, ic, l]) => `<button class="item" data-act="panel" data-arg="${p}"><span class="sw" aria-hidden="true">${ic}</span><span class="nm">${l}</span><span></span></button>`).join('')}</div>
<div class="row"><button class="btn alt" data-act="screen" data-arg="help">How to play</button><button class="btn alt" data-act="screen" data-arg="settings">Settings</button><button class="btn alt" data-act="screen" data-arg="history">History album</button></div>
<div class="row"><button class="btn" data-act="toTitle">Save and quit to title</button></div>`),
  finances: (S) => financePanel(S),
  guests: (S) => guestsPanel(S),
  rating: (S) => ratingPanel(S),
  goals: (S) => goalsPanel(S),
  staff: (S) => staffPanel(S),
  research: (S) => researchPanel(S),
  marketing: (S) => marketingPanel(S),
  concerts: (S) => concertPanel(S),
  saves: () => savesPanel(),
};

function marketList(S) {
  if (!S.park.market || !S.park.market.length) return '<p class="muted">No listings.</p>';
  return S.park.market.map((L) => {
    const d = L.kind === 'track' ? TRACKS[BLUEPRINTS[L.bp].ttype] : RIDES[L.type];
    return `<div class="card"><h4>${esc(L.name)}</h4><p>${money(L.price)} to buy + ${money(L.reloc)} to move it. Reliability ${Math.round(L.rel * 100)}% (new: ${Math.round(d.rel * 100)}%).</p><p class="muted">${esc(L.prov)}</p>${L.sold ? '<p><b>Sold</b></p>' : `<button class="btn alt" data-act="buyUsed" data-arg="${L.i}" aria-pressed="${G.tool === 'used' && G.listing === L.i}">Place it (${money(L.price + L.reloc)})</button>`}</div>`;
  }).join('');
}

function trackPanel(S) {
  const o = buildingTrack(S);
  if (!o) return shell('Track builder', '<p>No track in progress.</p>');
  const T = TRACKS[o.type];
  const slope = G.slope ?? 0, lift = !!G.lift;
  const slopes = [[-3, '⇊3'], [-2, '⇊2'], [-1, '↘'], [0, '→'], [1, '↗']].filter(([s]) => s >= T.dmin && s <= T.dmax);
  const prev = o.complete ? null : [-1, 0, 1].map((t) => addCheck(S, o, slope, t, lift));
  const sim = o.complete ? simulate(S, o) : null;
  const above = o.cells.map((c) => c.h - S.map.height[c.y * S.map.w + c.x]);
  const stats = sim && sim.ok ? `<table class="ledger"><tr><td>Length</td><td>${sim.stats.lengthFt} ft</td></tr><tr><td>Top speed</td><td>${sim.stats.vmax} mph</td></tr><tr><td>Biggest drop</td><td>${sim.stats.drop} ft</td></tr><tr><td>Airtime hills</td><td>${sim.stats.air}</td></tr><tr><td>Hugs the hillside</td><td>${sim.stats.hug}%</td></tr><tr><td>Intensity</td><td>${Math.max(1, Math.min(5, Math.round(sim.stats.int)))} of 5</td></tr><tr><td>Thrill</td><td>${sim.stats.thrill}</td></tr></table>` : sim ? `<p class="no"><b>Test run fails:</b> the train stalls at cell ${sim.failAt + 1}. Add a lift or lower that hill.</p>` : '';
  const body = `<p><b>${esc(o.name)}</b> · ${o.cells.length} cells · cost so far ${money(o.cost)} · highest ${Math.max(...above)} levels above ground</p>
${o.complete ? '<p class="ok"><b>Loop closed.</b> Run the test to open it.</p>' : `<h3>Next cell</h3>
<div class="slopes" role="group" aria-label="Slope">${slopes.map(([s, l]) => `<button class="btn small" data-act="slope" data-arg="${s}" aria-pressed="${slope === s}" aria-label="Slope ${s}">${l}</button>`).join('')}</div>
<div class="row"><button class="btn" data-act="lift" aria-pressed="${lift}">⛓ Lift chain ${lift ? 'on' : 'off'}</button></div>
<div class="pad" role="group" aria-label="Direction">${[[-1, '↰ Left'], [0, '↑ Straight'], [1, 'Right ↱']].map(([t, l], k) => `<button class="btn alt" data-act="trackAdd" data-arg="${t}" ${prev[k].ok ? '' : 'disabled'} title="${prev[k].ok ? (prev[k].close ? 'Closes the loop' : money(prev[k].cost)) : esc(prev[k].reason)}">${l}${prev[k].ok && prev[k].close ? ' ✓' : ''}</button>`).join('')}</div>
<p class="muted">${prev.filter((p) => !p.ok).map((p) => esc(p.reason)).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</p>
<p class="muted">You can also click the highlighted cells on the map.<span class="keys"> Keys: ← ↑ → add, PgUp/PgDn slope, L lift, Backspace undo.</span></p>`}
${stats}
<div class="row"><button class="btn" data-act="trackUndo">↶ Undo</button>${o.complete ? '' : '<button class="btn alt" data-act="trackAuto">Auto-finish</button>'}<button class="btn alt" data-act="trackFinish" ${o.complete ? '' : 'disabled'}>Test and open</button><button class="btn warn" data-act="trackCancel">Cancel</button></div>`;
  return shell(T.name + ' builder', body);
}

function objPanel(S) {
  const o = objById(S, G.panelArg);
  if (!o) return shell('Gone', '<p>This item no longer exists.</p>');
  const d = def(o.type);
  let body = '';
  const statusTxt = o.broken ? '🔧 Broken down' : o.status === 'standing' ? '🏚 Left standing (closed)' : o.status === 'testfail' ? '✖ Test failed' : o.status === 'closed' ? '⛔ Closed' : o.wx ? '⚡ Closed for the storm' : o.cal === false ? '☂ Closed by the water calendar' : o.entry < 0 ? '⚠ No path at the entrance' : '✔ Open';
  if (o.kind === 'ride' || o.kind === 'track') {
    const int = rideInt(o), th = rideThrill(S, o);
    const seats = o.kind === 'track' ? (o.seats || TRACKS[o.type].seats) : d.seats;
    const up = d.upcharge;
    body += `<p><b>${statusTxt}</b></p>
<div class="row">${intTag(int)} <span class="tag">thrill ${th.toFixed(1)}</span> <span class="tag">${seats} seats</span>${rideHreq(o) ? ` <span class="tag">${rideHreq(o)} in+</span>` : ''}</div>
<table class="ledger"><tr><td>Riders (this month / all)</td><td>${o.monthRiders || 0} / ${o.totalRiders}</td></tr><tr><td>In line</td><td>${o.queue.length} of ${queueMax(o)}</td></tr><tr><td>Wait</td><td>about ${Math.round(waitTicks(o) / HOUR * 60)} min</td></tr><tr><td>Reliability</td><td>${Math.round(o.rel * 100)}%</td></tr><tr><td>Last inspected</td><td>${Math.round((S.tick - o.lastInspect) / HOUR)} h ago</td></tr><tr><td>Income</td><td>${money(o.income)}</td></tr></table>`;
    if (o.stats) body += `<h3>Track stats</h3><table class="ledger"><tr><td>Length</td><td>${o.stats.lengthFt} ft</td></tr><tr><td>Top speed</td><td>${o.stats.vmax} mph</td></tr><tr><td>Biggest drop</td><td>${o.stats.drop} ft</td></tr><tr><td>Ride time</td><td>${o.stats.rideSec} s</td></tr><tr><td>Hugs the hillside</td><td>${o.stats.hug}%</td></tr></table>`;
    body += `<h3>Price ${up ? '(up-charge)' : S.park.payPerRide ? '' : '(only with pay-per-ride)'}</h3><div class="row"><button class="btn small" data-act="price" data-arg="-1" aria-label="Lower price">−</button><b>$${o.price}</b><button class="btn small" data-act="price" data-arg="1" aria-label="Raise price">+</button></div>`;
    if (o.status === 'standing') body += `<div class="row"><button class="btn alt" data-act="refurb">Refurbish and reopen (${money(Math.round((d.cost || d.station) * 0.3))})</button></div>`;
    else if (o.status === 'building' || o.status === 'testfail') body += `<div class="row"><button class="btn alt" data-act="editTrack">Edit track</button></div>`;
    else body += `<div class="row"><button class="btn" data-act="rideOpen" aria-pressed="${o.status === 'open'}">${o.status === 'open' ? 'Close ride' : 'Open ride'}</button><button class="btn" data-act="standing">Leave standing</button></div>`;
  } else if (o.kind === 'stall') {
    body += `<p><b>${o.entry < 0 ? '⚠ No path at the entrance' : '✔ Open'}</b></p><p class="muted">${esc(d.desc || '')}</p><table class="ledger"><tr><td>Sales (this month / all)</td><td>${o.monthSales} / ${o.sales}</td></tr><tr><td>Income</td><td>${money(o.income)}</td></tr><tr><td>Upkeep</td><td>${money(d.upkeep)}/month</td></tr></table>`;
    if (d.price) body += `<h3>Price</h3><div class="row"><button class="btn small" data-act="price" data-arg="-1" aria-label="Lower price">−</button><b>$${o.price}</b><button class="btn small" data-act="price" data-arg="1" aria-label="Raise price">+</button><span class="muted">usual $${d.price}</span></div>`;
  } else if (o.kind === 'special') {
    body += `<p class="muted">${esc(d.desc)}</p><table class="ledger"><tr><td>Shows</td><td>${o.shows || 0}</td></tr><tr><td>Seat sales</td><td>${money(o.income)}</td></tr></table><div class="row"><button class="btn alt" data-act="panel" data-arg="concerts">Book a show</button></div>`;
  } else body += `<p class="muted">${esc(d.desc || 'Scenery.')}</p>`;
  body += `<div class="row"><button class="btn warn" data-act="demolishSel">Demolish (refund ${money(Math.round((o.cost || 0) / 2))})</button></div>`;
  return shell(esc(o.name), body);
}

const NEEDS = [['happy', 'Happiness', false], ['energy', 'Energy', false], ['hunger', 'Hunger', true], ['thirst', 'Thirst', true], ['bladder', 'Restroom', true], ['nausea', 'Queasy', true]];
function guestPanel(S) {
  const g = guestById(S, G.panelArg);
  if (!g || g.st === 'gone') return shell('Guest', '<p>This guest has gone home.</p>');
  const where = { walk: 'Walking to ' + ((objById(S, g.dest) || {}).name || 'somewhere'), wander: 'Wandering', queue: 'In line for ' + ((objById(S, g.dest) || {}).name || 'a ride'), ride: 'Riding ' + ((objById(S, g.dest) || {}).name || ''), stall: 'Shopping', sit: 'Resting on a bench', leave: 'Heading home', concert: 'At the show', choose: 'Deciding' }[g.st] || g.st;
  const needs = NEEDS.map(([k, l, bad]) => { const v = Math.max(0, Math.min(100, g[k])); return `<div class="need"><span>${l}</span><span class="bar"><i style="width:${v}%;background:${bad ? (v > 60 ? '#9A2A1C' : '#A08A6A') : v < 30 ? '#9A2A1C' : '#2E6A3C'}"></i></span><span>${Math.round(v)}</span></div>`; }).join('');
  const th = g.th.map(([k]) => `<div class="thought ${THOUGHTS[k].bad ? 'bad' : ''}"><span class="ti" aria-hidden="true">${THOUGHTS[k].i}</span><span class="tx">${THOUGHTS[k].t}</span></div>`).join('') || '<p class="muted">No thoughts yet.</p>';
  return shell(`Guest #${g.id}`, `<p><b>${KIND_NAMES[g.k]}</b>, ${g.hgt} in tall · likes intensity ${g.lo}–${g.hi}</p><p>${esc(where)}</p>${needs}
<table class="ledger"><tr><td>Money left</td><td>${money(g.money)}</td></tr><tr><td>Spent</td><td>${money(g.spent)}</td></tr><tr><td>Rides taken</td><td>${g.rides}</td></tr></table><h3>Thoughts</h3>${th}
<div class="row"><button class="btn" data-act="follow" aria-pressed="${G.follow}">${G.follow ? 'Stop following' : 'Follow with camera'}</button></div>`);
}

function ledgerRows(L) {
  const inc = INCOME_KEYS.reduce((s, k) => s + L[k], 0), cost = COST_KEYS.reduce((s, k) => s + L[k], 0);
  return `<table class="ledger">${INCOME_KEYS.map((k) => `<tr><td>${k[0].toUpperCase() + k.slice(1)}</td><td>${money(L[k])}</td></tr>`).join('')}<tr><td><b>Income</b></td><td><b>${money(inc)}</b></td></tr>${COST_KEYS.map((k) => `<tr><td>${k[0].toUpperCase() + k.slice(1)}</td><td>−${money(L[k]).replace('−', '')}</td></tr>`).join('')}<tr><td><b>Profit</b></td><td><b>${money(inc - cost)}</b></td></tr></table>`;
}
function profitChart(S) {
  const ms = S.finance.months.slice(-14);
  if (!ms.length) return '<p class="muted">The chart fills in after the first month.</p>';
  const vals = ms.map((m) => INCOME_KEYS.reduce((s, k) => s + m[k], 0) - COST_KEYS.reduce((s, k) => s + m[k], 0));
  const mx = Math.max(1000, ...vals.map(Math.abs));
  const bw = 300 / ms.length;
  const bars = vals.map((v, i) => { const h = Math.abs(v) / mx * 50; return `<rect x="${i * bw + 2}" y="${v >= 0 ? 60 - h : 60}" width="${bw - 4}" height="${Math.max(1, h)}" fill="${v >= 0 ? '#2E6A3C' : '#9A2A1C'}"><title>${MONTHS[ms[i].m]} ${ms[i].y}: ${money(v)}</title></rect>`; }).join('');
  return `<svg class="chart" viewBox="0 0 300 120" role="img" aria-label="Monthly profit, last ${ms.length} months. Latest ${money(vals[vals.length - 1])}">${bars}<line x1="0" y1="60" x2="300" y2="60" stroke="#574A37"/><text x="2" y="114" font-size="10" fill="#574A37">${MONTHS[ms[0].m].slice(0, 3)} ${ms[0].y}</text><text x="298" y="114" font-size="10" fill="#574A37" text-anchor="end">${MONTHS[ms[ms.length - 1].m].slice(0, 3)} ${ms[ms.length - 1].y}</text></svg>`;
}
function financePanel(S) {
  const F = S.finance, P = S.park, c = monthlyCosts(S);
  return shell('Finances', `<div class="row"><span class="grow">Cash</span><b>${money(F.cash)}</b></div><div class="row"><span class="grow">Loan (${Math.round(F.rate * 100)}% a year, limit ${money(F.maxLoan)})</span><b>${money(F.loan)}</b></div>
<div class="row"><button class="btn small" data-act="loan" data-arg="10000">Borrow $10,000</button><button class="btn small" data-act="loan" data-arg="-10000">Repay $10,000</button></div>
<h3>Prices</h3><div class="row"><span class="grow">Admission</span><button class="btn small" data-act="admission" data-arg="-1" aria-label="Lower admission">−</button><b>$${P.admission}</b><button class="btn small" data-act="admission" data-arg="1" aria-label="Raise admission">+</button></div>
<div class="row"><button class="btn" data-act="ppr" aria-pressed="${P.payPerRide}">Pay per ride: ${P.payPerRide ? 'on' : 'off'}</button><button class="btn" data-act="cooler" aria-pressed="${P.cooler}">Cooler Sundays: ${P.cooler ? 'on' : 'off'}</button></div>
<p class="muted">Cooler Sundays: more guests on Sundays, but they bring their own food and drinks. Pay per ride lets you charge each ride's price instead of (or as well as) admission.</p>
<div class="row"><button class="btn" data-act="waterCal" aria-pressed="${P.waterCal}">Water calendar: ${P.waterCal ? 'on' : 'off (opens on warm days)'}</button></div>
<h3>Monthly costs</h3><table class="ledger"><tr><td>Upkeep (pumps ${money(c.pump)})</td><td>${money(c.upkeep)}</td></tr><tr><td>Wages</td><td>${money(c.wages)}</td></tr><tr><td>Loan interest</td><td>${money(c.interest)}</td></tr><tr><td>Research</td><td>${money(c.research)}</td></tr></table>
<h3>Monthly profit</h3>${profitChart(S)}
<h3>This month</h3>${ledgerRows(F.month)}<h3>This season</h3>${ledgerRows(F.season)}`);
}
function guestsPanel(S) {
  const gs = S.guests, avg = gs.length ? Math.round(gs.reduce((s, g) => s + g.happy, 0) / gs.length) : 0;
  const top = Object.entries(S.thoughts).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const d = demand(S);
  return shell('Guests', `<table class="ledger"><tr><td>In the park</td><td>${gs.length}</td></tr><tr><td>Today</td><td>${S.stats.guestsToday}</td></tr><tr><td>This season</td><td>${S.stats.guestsSeason}</td></tr><tr><td>Average happiness</td><td>${avg}</td></tr><tr><td>Turned away by prices</td><td>${S.stats.turnedAway}</td></tr></table>
<h3>What guests are thinking</h3>${top.length ? top.map(([k, v]) => `<div class="thought ${THOUGHTS[k].bad ? 'bad' : ''}"><span class="ti" aria-hidden="true">${THOUGHTS[k].i}</span><span class="tx grow">${THOUGHTS[k].t}</span><b>${Math.round(v)}</b></div>`).join('') : '<p class="muted">Nothing yet. Open the park and let some time pass.</p>'}
<h3>Why guests come (today's demand)</h3><table class="ledger"><tr><td>Ride draw</td><td>${d.draw}</td></tr><tr><td>Rating</td><td>×${d.ratingF}</td></tr><tr><td>Month</td><td>×${d.monthF}</td></tr><tr><td>Day of week</td><td>×${d.dowF}</td></tr><tr><td>Weather</td><td>×${d.weatherF}</td></tr><tr><td>Price vs value ($${d.value})</td><td>×${d.priceF}</td></tr><tr><td>Marketing</td><td>×${d.mk}</td></tr><tr><td>Expected arrivals</td><td>${d.n}</td></tr></table>`);
}
function ratingPanel(S) {
  const P = S.park.ratingParts, max = { happiness: 350, variety: 150, capacity: 100, cleanliness: 120, reliability: 80, scenery: 80, value: 80 };
  const rows = Object.entries(P).map(([k, v]) => `<div class="need"><span>${k[0].toUpperCase() + k.slice(1)}</span><span class="bar"><i style="width:${max[k] ? Math.max(0, v) / max[k] * 100 : 0}%;${v < 0 ? 'background:#9A2A1C' : ''}"></i></span><span>${v}</span></div>`).join('');
  return shell('Park rating', `<p><b>${Math.round(S.park.rating)}</b> of 1000. Higher ratings bring more guests.</p>${rows || '<p class="muted">Rated every game hour.</p>'}<p class="muted">Variety counts distinct ride types; capacity compares seats per hour with the crowd; cleanliness falls with litter; reliability falls with breakdowns; lost and stranded guests count against you.</p>`);
}
function goalsPanel(S) {
  const sc = S.scenario;
  if (sc.mode !== 'campaign') return shell('Sandbox', '<p>No goals and no deadline. Build anything.</p>');
  const rows = sc.goals.map((gl) => { const v = goalValue(S, gl), ok = goalMet(S, gl); const shown = gl.type === 'ratio' ? v + '%' : ['loan', 'cash', 'profit', 'concert'].includes(gl.type) ? money(v) : v; return `<div class="goal"><span class="${ok ? 'ok' : 'no'}" aria-label="${ok ? 'met' : 'not met'}">${ok ? '✔' : '✖'}</span><span>${esc(gl.label)}<br><span class="muted">now: ${shown}${gl.endOnly ? ' (judged at the end)' : ''}</span></span></div>`; }).join('');
  return shell(`${sc.startYear} · ${esc(sc.title)}`, `${rows}<p class="muted">Deadline: end of October ${sc.deadline}. Goals are checked at each month end.</p>`);
}
function staffPanel(S) {
  const roles = Object.entries(STAFF).map(([r, d]) => `<div class="card"><h4>${d.name}</h4><p class="muted">${d.desc}</p><div class="row"><button class="btn alt" data-act="hire" data-arg="${r}:1">Hire seasonal ${money(d.wage)}/mo</button><button class="btn" data-act="hire" data-arg="${r}:0">Year-round ${money(Math.round(d.wage * YEAR_ROUND))}/mo</button></div></div>`).join('');
  const list = S.staff.map((st) => `<div class="row"><span class="grow">${esc(st.name)} · ${st.seasonal ? 'seasonal' : 'year-round'} · ${atSchool(S, st) ? 'at school' : st.st}</span><button class="btn small" data-act="fire" data-arg="${st.id}" aria-label="Let ${esc(st.name)} go">✕</button></div>`).join('') || '<p class="muted">No staff yet.</p>';
  return shell('Staff', `<p class="muted">Seasonal staff are teenagers: cheaper, but back at school on weekdays from mid-August.</p>${roles}<h3>On the payroll (${S.staff.length})</h3>${list}`);
}
function researchPanel(S) {
  const R = S.park.research;
  const q = R.queue.map((t, i) => `<div class="row"><span class="grow">${i === 0 ? '▶ ' : ''}${esc(def(t).name)}</span><span class="muted">${RESEARCH_COST[researchCat(t)]} pts</span></div>`).join('') || '<p class="muted">Nothing left to research.</p>';
  return shell('Research', `<p>Points: <b>${R.points}</b>. Each month the budget adds points; items unlock in order.</p><div class="row" role="group" aria-label="Budget">${RESEARCH_LEVELS.map((l, i) => `<button class="btn small" data-act="research" data-arg="${i}" aria-pressed="${R.level === i}">${['None', 'Low', 'Medium', 'High'][i]}<br><span class="sub">${money(l.cost)}/mo</span></button>`).join('')}</div><h3>Queue</h3>${q}`);
}
function marketingPanel(S) {
  const rows = Object.entries(CAMPAIGNS).map(([id, c]) => { const on = !!S.park.campaigns[id]; return `<div class="card"><h4>${c.name} · ${money(c.cost)}</h4><p class="muted">${c.desc}</p><div class="row"><button class="btn alt" data-act="campaign" data-arg="${id}" ${on ? 'disabled' : ''}>${on ? 'Running this month' : 'Run this month'}</button>${on ? `<button class="btn" data-act="campaignAuto" data-arg="${id}" aria-pressed="${!!S.park.campaigns[id].auto}">Renew monthly</button>` : ''}</div></div>`; }).join('');
  return shell('Marketing', rows);
}
function concertPanel(S) {
  const amphi = S.objects.find((o) => o.type === 'amphi');
  const C = S.park.concert, booked = C && C.month === S.month && C.year === S.year;
  const acts = Object.entries(ACTS).map(([id, a]) => `<button class="item" data-act="book" data-arg="${id}" ${!amphi || booked ? 'disabled' : ''}><span class="sw" aria-hidden="true">🎵</span><span><span class="nm">${a.name}</span><br><span class="meta">+${Math.round(a.boost * 100)}% arrivals Saturday</span></span><span class="cost">${money(a.cost)}</span></button>`).join('');
  return shell('Concerts', `${amphi ? '' : '<p><b>Build an Amphitheater first</b> (Rides → Shows).</p>'}<p class="muted">Shows run Saturday night at 7:30. Lawn seats are free; about 30% of fans buy $5 reserved seats and 10% $10 VIP rows. All bands are fictional.</p>${booked ? `<p><b>Booked:</b> ${esc(C.band)} this Saturday.</p>` : ''}<div class="items">${acts}</div><p>Seat sales this season: <b>${money(S.stats.concertSeats)}</b></p>`);
}
function savesPanel() {
  const rows = SLOTS.map((s) => { const i = slotInfo(s); return `<div class="row"><span class="grow"><b>${s === 'auto' ? 'Autosave' : 'Slot ' + s}</b><br><span class="muted">${i ? esc(i.label) : 'empty'}</span></span>${s !== 'auto' ? `<button class="btn small" data-act="save" data-arg="${s}">Save</button>` : ''}<button class="btn small alt" data-act="load" data-arg="${s}" ${i ? '' : 'disabled'}>Load</button></div>`; }).join('');
  return shell('Save and load', `${G.storageOk ? '' : '<p class="no">Storage is blocked in this browser: saves last only until you close the page.</p>'}${rows}`);
}

// ---- screens -------------------------------------------------------------------------------
const HELP = {
  basics: ['Basics', `<p>Build a park on a wooded Ouachita hillside and keep guests happy. Lay <b>paths</b> from the gate, put <b>rides</b> and <b>shops</b> beside them (their entrance must touch a path), then press <b>▶</b>. Guests arrive, pick rides that suit them, queue, ride, eat, complain and go home.</p><p><b>Each month plays as one week</b> (Monday to Sunday). The season runs April to October; winter is a short break with a summary.</p><p>Watch the <b>Guests</b> panel for complaints, <b>Finances</b> for money and the <b>Park rating</b>. In the campaign, the <b>Goals</b> panel shows what you need by the deadline.</p>`],
  building: ['Building', `<p><b>Hills matter.</b> Terrain comes in height levels. Paths climb one level at a time as stairs, and guests tire faster walking uphill. Rides need flat ground: uneven spots are graded flat for $40 a level. Coaster supports cost $25 per level above the ground, so a track that rides down the hillside is cheaper and gets free speed. Water rides pay pump upkeep for every level of hill they sit on.</p><p>Rides and shops refund half their cost when demolished. A ride can also be <b>left standing</b> as a landmark (closed, 10% upkeep, counts as scenery) and refurbished later.</p>`],
  guests: ['Guests', `<p>Every guest has needs (hunger, thirst, restroom, energy, nausea), money and a taste for intensity: children like 1–2, teens 2–5, adults 1–4, seniors 1–3 (each guest varies). Rides are rated <b>intensity 1–5</b>; guests skip rides far above their range and are bored by rides below it. Height rules keep small children off 48-inch rides, and kiddie rides are for riders 54 inches and under.</p><p>Guests skip long lines, give up after waiting too long, drop litter away from trash cans, slow down in crowds, and complain about all of it. Staff help: groundskeepers sweep, mechanics fix breakdowns, the bear mascot cheers people up.</p>`],
  money: ['Money', `<p>Income: admission (pay-one-price), or pay-per-ride, plus food, drinks, souvenirs and concert seats. Costs: ride upkeep, wages, research, marketing, loan interest and repairs. Monthly costs are charged at each month end; winter charges five months of interest and a little upkeep.</p><p>Arrivals depend on your rating, the rides' draw (new rides draw more for two seasons), the month, the day of the week, the weather and how your prices compare with what the park offers. If cash stays below −$20,000 for two month-ends, the bank forecloses (game rules).</p>`],
  coasters: ['Coasters', `<p>Pick a coaster or flume type, place its 3-cell station beside a path, then add track: choose a slope (down 1–3, level, or up 1), switch the lift chain on for climbs, and pick left, straight or right. <b>Auto-finish</b> routes the track home. The loop must re-enter the station straight and level.</p><p><b>Test and open</b> runs the train: if it stalls on a climb without a lift, the test fails and names the cell. Speed comes from drops; turns at speed, airtime hills and big drops raise intensity and thrill; tracks that hug the hillside score extra. Above intensity 5.5 riders get scared and thrill falls.</p>`],
  controls: ['Controls', `<p><b>Mouse:</b> click to inspect or build, drag to lay paths, right-drag or drag in Inspect to pan, wheel to zoom.</p><p><b>Touch:</b> tap to inspect or build, drag with one finger to lay paths (or pan in Inspect), two fingers to pan and pinch-zoom.</p><p><b>Keyboard:</b> arrow keys pan (or move the build cursor when a tool is active), Enter places, Esc cancels, R rotates, Space pauses, 1–4 set speed, + and − zoom, I inspect, P paths, X demolish, Tab moves through every button.</p>`],
  about: ['About', `<p><b>Spa City Thrills</b> is an original game in the open-source Hot Springs Games collection (MIT). It is <b>not affiliated with, endorsed by or a depiction of</b> any real park. Park, ride, band and company names are fictional; all rules are game rules.</p><p>The campaign's eras are inspired by the history of Hot Springs' real theme park, Magic Springs (opened 1978, closed 1995, reopened 2000 with a water park and later a 5,000-seat amphitheater). History cards quote audited facts with their sources: Wikipedia, Coasterpedia, the Encyclopedia of Arkansas and the Hot Springs Sentinel-Record.</p><p>Weather comes from Hot Springs monthly normals (NOAA data via climate-charts.com): about 74°F in April up to 93°F in July; May is the wettest month. The water-park calendar and Saturday concerts follow the real park's pattern.</p>`],
};

export function screenHTML(name) {
  const S = G.S;
  switch (name) {
    case 'title': {
      const cont = latestSlot();
      return `<div class="scr title"><div class="logo" aria-label="Spa City Thrills"><span class="l1">SPA CITY</span><span class="l2">THRILLS</span></div>
<p class="tagline">Build a hillside amusement park in the Ouachita hills of Hot Springs, Arkansas.</p>
<div class="menu">${cont ? `<button class="btn primary" data-act="continue">Continue</button>` : ''}<button class="btn ${cont ? '' : 'primary'}" data-act="screen" data-arg="campaign">Campaign</button><button class="btn" data-act="screen" data-arg="sandbox">Sandbox</button><button class="btn" data-act="screen" data-arg="history">History album</button><button class="btn" data-act="screen" data-arg="help">How to play</button><button class="btn" data-act="screen" data-arg="settings">Settings</button></div>
<p class="footnote">An original game. Not affiliated with any real park; park, ride and band names are fictional. History cards cite their sources.</p></div>`;
    }
    case 'campaign': {
      const cards = SCENARIOS.map((sc) => {
        const open = sc.id === 1 || (G.progress.stars[sc.id - 1] || 0) > 0 || G.progress.unlockAll;
        const st = G.progress.stars[sc.id] || 0;
        return `<button class="scard" data-act="intro" data-arg="${sc.id}" ${open ? '' : 'disabled'} aria-label="${sc.year}, ${esc(sc.title)}${open ? '' : ', locked'}${st ? `, ${st} stars` : ''}"><span class="yr">${sc.year}</span><span class="nm">${esc(sc.title)}</span><span class="muted">${esc(sc.intro.split('. ').slice(1, 2).join('') || sc.intro.slice(0, 80))}</span><span class="stars" aria-hidden="true"><b>${'★'.repeat(st)}</b>${'☆'.repeat(3 - st)}</span>${open ? '' : '<span class="tag">Win the previous era to unlock</span>'}</button>`;
      }).join('');
      return `<div class="scr"><h1>Campaign</h1><p class="tagline">Eras inspired by Hot Springs' real park history. Every park, ride and person in play is fictional.</p><div class="scards">${cards}</div><div class="row back"><button class="btn" data-act="screen" data-arg="title">Back</button></div></div>`;
    }
    case 'intro': {
      const sc = SCENARIOS.find((s) => s.id === G.introId) || SCENARIOS[0];
      const cards = sc.facts.map((id) => factCard(factById(id))).join('');
      return `<div class="scr"><div class="panelbox"><h2>${sc.year} · ${esc(sc.title)}</h2><p>${esc(sc.intro)}</p><h3>Goals (by October ${sc.deadline})</h3><ul>${sc.goals.map((g) => `<li>${esc(g.label)}</li>`).join('')}</ul><h3>History</h3>${cards}<p class="muted">History cards are real; the park you build is not.</p><div class="row"><button class="btn alt" data-act="play" data-arg="${sc.id}">Start</button><button class="btn" data-act="screen" data-arg="campaign">Back</button></div></div></div>`;
    }
    case 'sandbox': {
      const o = G.sandbox || (G.sandbox = { hills: 'rolling', cash: '250000', seed: 7 });
      const sel = (k, opts) => `<div class="row" role="group" aria-label="${k}">${opts.map(([v, l]) => `<button class="btn small" data-act="sbx" data-arg="${k}:${v}" aria-pressed="${String(o[k]) === String(v)}">${l}</button>`).join('')}</div>`;
      return `<div class="scr"><div class="panelbox"><h2>Sandbox</h2><p>Everything unlocked. No goals, no deadline.</p><h3>Hills</h3>${sel('hills', [['gentle', 'Gentle'], ['rolling', 'Rolling'], ['steep', 'Steep']])}<h3>Starting cash</h3>${sel('cash', [['100000', '$100k'], ['250000', '$250k'], ['unlimited', 'Unlimited']])}<h3>Map</h3><div class="row"><button class="btn small" data-act="sbxSeed">New map (#${o.seed})</button></div><div class="row"><button class="btn alt" data-act="playSandbox">Start</button><button class="btn" data-act="screen" data-arg="title">Back</button></div></div></div>`;
    }
    case 'help': {
      const tabs = Object.entries(HELP).map(([k, [l]]) => `<button class="btn small" role="tab" data-act="helpTab" data-arg="${k}" aria-selected="${G.helpTab === k}">${l}</button>`).join('');
      return `<div class="scr"><div class="panelbox"><h2>How to play</h2><div class="tabs" role="tablist">${tabs}</div><div role="tabpanel">${HELP[G.helpTab][1]}</div><div class="row back"><button class="btn" data-act="back">Back</button></div></div></div>`;
    }
    case 'settings': {
      const s = G.settings;
      return `<div class="scr"><div class="panelbox"><h2>Settings</h2>
<div class="row"><button class="btn" data-act="set" data-arg="sound" aria-pressed="${s.sound}">Sound: ${s.sound ? 'on' : 'off'}</button></div>
<label class="row"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${s.vol}" data-act="vol" aria-label="Volume"></label>
<div class="row"><button class="btn" data-act="set" data-arg="reduced" aria-pressed="${!!reducedOn()}">Reduced motion: ${reducedOn() ? 'on' : 'off'}${s.reduced == null ? ' (system)' : ''}</button></div>
<div class="row" role="group" aria-label="Text size"><span>Text size</span>${[1, 1.25, 1.5].map((v) => `<button class="btn small" data-act="text" data-arg="${v}" aria-pressed="${s.text === v}">${Math.round(v * 100)}%</button>`).join('')}</div>
<div class="row"><button class="btn" data-act="set" data-arg="grid" aria-pressed="${s.grid}">Tile grid: ${s.grid ? 'on' : 'off'}</button></div>
<div class="row"><button class="btn" data-act="gfx" aria-pressed="${s.gfx !== '2d'}">3D view: ${s.gfx !== '2d' ? 'on' : 'off (2D map)'}</button><button class="btn" data-act="quality">Graphics: ${s.quality || 'auto'}</button></div>
${G.storageOk ? '' : '<p class="no">Storage is blocked: settings and saves last only for this visit.</p>'}
<div class="row back"><button class="btn" data-act="back">Back</button></div></div></div>`;
    }
    case 'history': {
      const have = G.progress.cards;
      const list = FACTS.map((f) => have.includes(f.id) ? factCard(f) : `<div class="card"><h4>🔒 ${f.year ? f.year : 'Hot Springs'} · locked</h4><p class="muted">Collect it in the campaign or by building.</p></div>`).join('');
      return `<div class="scr"><div class="panelbox"><h2>History album</h2><p>${have.length} of ${FACTS.length} cards collected. These are real; the park you build is not.</p>${list}<div class="row back"><button class="btn" data-act="back">Back</button></div></div></div>`;
    }
    case 'winter': {
      const sea = S.pending && S.pending.season;
      if (!sea) return '';
      const inc = INCOME_KEYS.reduce((s, k) => s + sea[k], 0), cost = COST_KEYS.reduce((s, k) => s + sea[k], 0);
      return `<div class="scr"><div class="panelbox"><h2>Winter ${sea.y}–${sea.y + 1}</h2><p>The ${sea.y} season is over. Snow is rare here; the crews spend the winter on repairs.</p><table class="ledger"><tr><td>Guests this season</td><td>${sea.guests.toLocaleString('en-US')}</td></tr><tr><td>Income</td><td>${money(inc)}</td></tr><tr><td>Costs</td><td>${money(cost)}</td></tr><tr><td>Winter costs (interest and upkeep)</td><td>${money(sea.winter)}</td></tr><tr><td>Rating</td><td>${sea.rating}</td></tr><tr><td>Cash now</td><td>${money(S.finance.cash)}</td></tr></table><p class="muted">New rides keep extra pull for two seasons; after that, guests want something new.</p><div class="row"><button class="btn alt" data-act="spring">Open the ${S.year} season</button></div></div></div>`;
    }
    case 'win': case 'lose': {
      const sc = S.scenario, won = name === 'win';
      const st = sc.stars || 0;
      const goals = sc.goals.map((gl, i) => `<li>${(sc.final ? sc.final[i] : goalMet(S, gl)) ? '✔' : '✖'} ${esc(gl.label)}</li>`).join('');
      const nextSc = SCENARIOS.find((s) => s.id === sc.id + 1);
      const sea = S.pending && S.pending.season;
      const gs = sea ? sea.guests : S.stats.guestsSeason;
      return `<div class="scr"><div class="panelbox"><h2>${won ? 'Scenario complete!' : 'Scenario lost'}</h2><p>${esc(sc.title)} · ${esc(sc.why || '')}</p>${won ? `<p class="stars" aria-label="${st} of 3 stars" style="font-size:2em"><b>${'★'.repeat(st)}</b>${'☆'.repeat(3 - st)}</p>` : ''}<ul>${goals}</ul><table class="ledger"><tr><td>Guests this season</td><td>${gs.toLocaleString('en-US')}</td></tr><tr><td>Rating</td><td>${Math.round(S.park.rating)}</td></tr><tr><td>Cash</td><td>${money(S.finance.cash)}</td></tr></table>
<div class="row">${won && nextSc ? `<button class="btn alt" data-act="intro" data-arg="${nextSc.id}">Next: ${nextSc.year} · ${esc(nextSc.title)}</button>` : ''}${!won ? `<button class="btn alt" data-act="intro" data-arg="${sc.id}">Try again</button>` : ''}<button class="btn" data-act="keepPlaying">Keep building</button><button class="btn" data-act="screen" data-arg="title">Title</button></div></div></div>`;
    }
  }
  return '';
}
export function factCard(f) {
  if (!f) return '';
  return `<div class="card"><h4>${f.year ? f.year + ' · ' : ''}${esc(f.title)}</h4><p>${esc(f.text)}</p><p class="src">Source: ${[...new Set(f.refs.map((r) => r.source))].map(esc).join('; ')}</p></div>`;
}
export function reducedOn() {
  if (G.settings.reduced != null) return G.settings.reduced;
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
const BUILD_HINT = {
  place: 'Tap or click a spot beside a path.', station: 'Place the 3-cell station beside a path.', blueprint: 'Place the blueprint station beside a path.',
  used: 'Place it beside a path.', path: 'Drag from a path to lay new path.', terrain: 'Tap tiles to raise or lower them.', demolish: 'Tap anything to remove it.',
};
export function renderTip() { renderTip0(); const el = $('tip'); document.documentElement.style.setProperty('--tip-h', el.hidden ? '0px' : el.offsetHeight + 8 + 'px'); }
function renderTip0() {
  const el = $('tip'), S = G.S;
  // while building, the tip area becomes a small action bar (rotate and cancel work without a keyboard)
  if (G.scene === 'park' && S && BUILD_HINT[G.tool] && !(S.tutorial && TUTORIAL[S.tutorial.step])) {
    const rot = G.tool === 'station' || G.tool === 'blueprint' || (G.tool === 'used' && S.park.market[G.listing] && S.park.market[G.listing].kind === 'track');
    const name = G.placeType && def(G.placeType) ? def(G.placeType).name + ': ' : '';
    el.hidden = false;
    el.innerHTML = `${esc(name)}${BUILD_HINT[G.tool]}<div class="row">${rot ? `<button class="btn small" data-act="rotate" aria-label="Rotate the station">⟳ Rotate</button>` : ''}<button class="btn small" data-act="cancelTool">Done</button></div>`;
    return;
  }
  if (G.scene !== 'park' || !S || !S.tutorial || !TUTORIAL[S.tutorial.step]) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<b>Tutorial ${S.tutorial.step + 1}/${TUTORIAL.length}.</b> ${TUTORIAL[S.tutorial.step].text}<br><button class="btn small" data-act="skipTut">Skip tutorial</button>`;
}

export { store, toast, setOn, setVolume, sfx, saveSettings, startGame, saveTo, loadFrom, doAct, rideOpen };
