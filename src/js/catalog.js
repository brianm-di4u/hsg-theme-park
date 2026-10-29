// Game data: ride catalog, track types, stalls, scenery, staff, marketing, concert acts, research.
// Every name here is original to Spa City Thrills. Generic ride types follow research/town-content §2.
// Prices are game values.

// Flat rides. int = intensity 1–5 (the real park's 1–5 scale), thrill = draw/excitement score,
// seats per cycle, cycle = run ticks, hreq = minimum height in inches, rel = base reliability.
export const RIDES = {
  carousel: { name: 'Spring Carousel', cat: 'gentle', size: 3, cost: 9000, upkeep: 500, int: 1, thrill: 2.0, seats: 16, cycle: 40, price: 2, hreq: 0, rel: 0.97, color: '#3FBFB5', desc: 'Painted horses under a striped canopy.' },
  planes: { name: 'Tadpole Planes', cat: 'gentle', size: 2, cost: 5000, upkeep: 300, int: 1, thrill: 1.6, seats: 8, cycle: 30, price: 1, hreq: 0, rel: 0.97, kiddie: true, color: '#F4C542', desc: 'Kiddie planes that rise and dip. Riders 54 in and under.' },
  wheel: { name: 'Ridge Wheel', cat: 'gentle', size: 3, cost: 14000, upkeep: 700, int: 1, thrill: 2.4, seats: 24, cycle: 65, price: 2, hreq: 0, rel: 0.96, tall: true, view: true, color: '#F26B5B', desc: 'A Ferris wheel. Higher ground, better view.' },
  cups: { name: 'Spin Cups', cat: 'gentle', size: 2, cost: 7000, upkeep: 400, int: 2, thrill: 2.1, seats: 12, cycle: 35, price: 2, hreq: 36, rel: 0.97, color: '#E26D8E', desc: 'Teacup-style spinners.' },
  bumper: { name: 'Bumper Barn', cat: 'gentle', size: 3, cost: 11000, upkeep: 600, int: 2, thrill: 2.6, seats: 12, cycle: 40, price: 2, hreq: 42, rel: 0.95, color: '#8B4A33', desc: 'Bumper cars in a red barn.' },
  tower: { name: 'Lookout Tower', cat: 'gentle', size: 2, cost: 16000, upkeep: 600, int: 1, thrill: 2.0, seats: 20, cycle: 75, price: 2, hreq: 0, rel: 0.97, tall: true, view: true, color: '#9C7A55', desc: 'A rotating cabin climbs a lattice tower. Each level of hill adds thrill.' },
  swings: { name: 'Dogwood Swings', cat: 'thrill', size: 3, cost: 15000, upkeep: 700, int: 2, thrill: 2.8, seats: 24, cycle: 45, price: 2, hreq: 42, rel: 0.96, color: '#FFF6E0', desc: 'A wave swinger with dogwood-white chairs.' },
  ship: { name: "Swingin' Skiff", cat: 'thrill', size: 3, cost: 18000, upkeep: 900, int: 4, thrill: 3.4, seats: 20, cycle: 45, price: 3, hreq: 48, rel: 0.95, color: '#B5654A', desc: 'A swinging boat that climbs past level.' },
  boom: { name: 'Whirlwind Boom', cat: 'thrill', size: 2, cost: 22000, upkeep: 1100, int: 5, thrill: 3.8, seats: 8, cycle: 40, price: 3, hreq: 48, rel: 0.94, tall: true, color: '#4FC3FF', desc: 'A spinning boom that turns riders upside down.' },
  drop: { name: 'Novaculite Drop', cat: 'thrill', size: 2, cost: 30000, upkeep: 1300, int: 4, thrill: 4.0, seats: 12, cycle: 50, price: 3, hreq: 48, rel: 0.95, tall: true, color: '#C99A92', desc: 'A drop tower in whetstone white and rose.' },
  sky: { name: 'Sky Swing', cat: 'thrill', size: 2, cost: 20000, upkeep: 900, int: 5, thrill: 4.2, seats: 3, cycle: 30, price: 20, hreq: 42, rel: 0.96, tall: true, upcharge: true, color: '#F26B5B', desc: 'A skycoaster. Up-charge: always costs extra, even with pay-one-price admission.' },
  wave: { name: 'Wave Pool', cat: 'water', size: 4, cost: 40000, upkeep: 1500, int: 1, thrill: 2.6, seats: 40, cycle: 80, price: 2, hreq: 0, rel: 0.97, water: true, color: '#4C8FA8', desc: 'Rolling waves on the hour.' },
  river: { name: 'Lazy River', cat: 'water', size: 4, cost: 35000, upkeep: 1300, int: 1, thrill: 2.2, seats: 30, cycle: 90, price: 2, hreq: 0, rel: 0.97, water: true, color: '#2A9D8F', desc: 'Tubes drift around an island.' },
  slides: { name: 'Slide Tower', cat: 'water', size: 3, cost: 28000, upkeep: 1200, int: 3, thrill: 3.2, seats: 12, cycle: 25, price: 2, hreq: 42, rel: 0.96, water: true, tall: true, color: '#F4C542', desc: 'Four tube slides from one tower.' },
  complex: { name: 'Slide Complex', cat: 'water', size: 3, cost: 32000, upkeep: 1300, int: 3, thrill: 3.5, seats: 14, cycle: 25, price: 2, hreq: 42, rel: 0.96, water: true, color: '#E26D8E', desc: 'Tube and body slides around an activity pool.' },
  racer: { name: 'Racing Slides', cat: 'water', size: 3, cost: 30000, upkeep: 1200, int: 2, thrill: 3.0, seats: 14, cycle: 20, price: 2, hreq: 42, rel: 0.96, water: true, color: '#3FBFB5', desc: 'Seven lanes side by side.' },
  surf: { name: 'Surf Machine', cat: 'water', size: 3, cost: 36000, upkeep: 1500, int: 3, thrill: 3.3, seats: 4, cycle: 20, price: 3, hreq: 48, rel: 0.94, water: true, color: '#1E4E79', desc: 'A standing-wave surf simulator.' },
  splash: { name: 'Splash Fort', cat: 'water', size: 4, cost: 38000, upkeep: 1400, int: 1, thrill: 2.8, seats: 40, cycle: 60, price: 2, hreq: 0, rel: 0.97, water: true, color: '#F2A541', desc: 'A giant water play fort with a tipping bucket.' },
};

// Track rides built cell by cell (track.js). dmin/dmax = height change per cell; maxAbove = levels over ground.
export const TRACKS = {
  family: { name: 'Family Coaster', cat: 'coaster', station: 6000, seats: 12, dmin: -1, dmax: 1, maxAbove: 4, intCap: 2.4, rel: 0.96, hreq: 36, price: 2, upkeep: 600, color: '#F4C542' },
  steel: { name: 'Steel Coaster', cat: 'coaster', station: 20000, seats: 16, dmin: -3, dmax: 1, maxAbove: 12, intCap: 9, rel: 0.95, hreq: 48, price: 4, upkeep: 1600, color: '#D23B2F' },
  wood: { name: 'Wooden Coaster', cat: 'coaster', station: 14000, seats: 20, dmin: -2, dmax: 1, maxAbove: 10, intCap: 9, rel: 0.93, hreq: 48, price: 3, upkeep: 1400, wood: true, color: '#C8501F' },
  flume: { name: 'Log Flume', cat: 'coaster', station: 10000, seats: 8, dmin: -2, dmax: 1, maxAbove: 6, intCap: 3, rel: 0.96, hreq: 42, price: 2, upkeep: 900, flume: true, color: '#2A9D8F' },
};
export const TRACK_NAMES = {
  family: ['Little Bear Coaster', 'Pine Cone Express', 'Critter Coaster'],
  steel: ['Ridge Screamer', 'Steam Valley Streak', 'Thunder Hollow'],
  wood: ['Ridge Runner', 'Timber Rattler', 'Old Sawmill'],
  flume: ['Lumber Run', 'Sawmill Splash', 'Creek Log Chute'],
};

// Stalls and facilities (1×1). need = which guest need they serve.
export const STALLS = {
  bbq: { name: 'Hickory BBQ', size: 1, cost: 2500, upkeep: 250, need: 'food', price: 6, goods: 0.4, color: '#8B4A33', desc: 'Smoked pork sandwiches.' },
  pizza: { name: 'Pizza Slice', size: 1, cost: 2200, upkeep: 220, need: 'food', price: 5, goods: 0.35, color: '#F26B5B', desc: 'Pizza by the slice.' },
  chicken: { name: 'Chicken Shack', size: 1, cost: 2600, upkeep: 250, need: 'food', price: 7, goods: 0.4, color: '#F4C542', desc: 'Wings and tenders.' },
  funnel: { name: 'Funnel Cakes', size: 1, cost: 1800, upkeep: 180, need: 'snack', price: 4, goods: 0.3, color: '#E26D8E', desc: 'Powdered-sugar funnel cakes.' },
  refill: { name: 'Refill Bottles', size: 1, cost: 1600, upkeep: 160, need: 'drink', price: 3, goods: 0.25, color: '#3FBFB5', desc: 'Souvenir bottles and cheap refills.' },
  snocone: { name: 'Sno-Cones', size: 1, cost: 1400, upkeep: 140, need: 'drink', price: 2, goods: 0.25, color: '#4FC3FF', desc: 'Shaved ice. Sells best on hot days.' },
  souvenir: { name: 'Souvenirs', size: 1, cost: 2000, upkeep: 200, need: 'merch', price: 8, goods: 0.5, color: '#B5568F', desc: 'Caps, and ponchos when it rains.' },
  restroom: { name: 'Restrooms', size: 1, cost: 1500, upkeep: 200, need: 'restroom', price: 0, goods: 0, color: '#D9D4CA', desc: 'Free. Guests need them.' },
  bench: { name: 'Bench', size: 1, cost: 150, upkeep: 0, need: 'rest', price: 0, goods: 0, sv: 0.5, color: '#9C7A55', desc: 'Tired or queasy guests sit here.' },
};

// Scenery and helpers (1×1 unless size given). sv = scenery value.
export const SCENERY = {
  trash: { name: 'Trash Can', cost: 80, sv: 0, bin: true, desc: 'Guests drop litter within 2 tiles of one into it.' },
  lamp: { name: 'Lamp Post', cost: 120, sv: 0.6, lamp: true, desc: 'Lights paths at night.' },
  pine: { name: 'Shortleaf Pine', cost: 60, sv: 1, tree: 1 },
  oak: { name: 'Oak', cost: 60, sv: 1, tree: 2 },
  redbud: { name: 'Redbud', cost: 70, sv: 1.3, tree: 3 },
  dogwood: { name: 'Dogwood', cost: 70, sv: 1.3, tree: 4 },
  flowers: { name: 'Flower Bed', cost: 40, sv: 1.2 },
  fountain: { name: 'Steam Fountain', cost: 2000, sv: 4, size: 2, desc: 'A thermal-style fountain with a plume of steam.' },
  statue: { name: 'Bear Statue', cost: 600, sv: 2, desc: 'Bear Hollow theme.' },
  logs: { name: 'Log Pile', cost: 200, sv: 1, desc: 'Logging Camp theme.' },
  minecart: { name: 'Ore Cart', cost: 300, sv: 1.2, desc: 'Mine Ridge theme.' },
  sign: { name: 'Neon Arrow', cost: 400, sv: 1.5, lamp: true, desc: 'A mid-century arrow sign that glows at night.' },
};

export const SPECIAL = {
  amphi: { name: 'Amphitheater', size: 4, cost: 60000, upkeep: 1500, color: '#5E4B3C', desc: 'Saturday concerts. Lawn seats are free; reserved $5, VIP $10.' },
};

export const STAFF = {
  keeper: { name: 'Groundskeeper', wage: 1400, desc: 'Sweeps litter.' },
  mechanic: { name: 'Mechanic', wage: 1800, desc: 'Repairs breakdowns and inspects rides.' },
  mascot: { name: 'Entertainer', wage: 1200, desc: 'A bear-costume mascot. Cheers up guests within 3 tiles.' },
};
export const YEAR_ROUND = 1.4;

export const CAMPAIGNS = {
  billboard: { name: 'Highway Billboards', cost: 3000, boost: 0.15, desc: '+15% arrivals this month.' },
  radio: { name: 'Radio Spots', cost: 6000, boost: 0.25, desc: '+25% arrivals this month.' },
  school: { name: 'School Days', cost: 2000, boost: 0.4, desc: 'May only: +40% on weekdays from school groups.' },
  coupons: { name: 'Two-for-One Coupons', cost: 1000, boost: 0.3, desc: '+30% arrivals; 30% of guests pay half admission.' },
  fright: { name: 'Fright Nights', cost: 5000, boost: 0.6, desc: 'October only: a Halloween event, +60% arrivals.' },
};

// Fictional bands only (research has no performer history; town-content §4).
export const ACTS = {
  local: { name: 'Local band', cost: 1500, boost: 0.1, bands: ['The Ouachita Ramblers', 'Steam Valley String Band', 'Gulpha Gorge Grass'] },
  regional: { name: 'Regional act', cost: 6000, boost: 0.25, bands: ['Redbud Revival', 'The Diamond Lakes Dance Band', 'Novaculite Kings'] },
  head: { name: 'Headliner', cost: 18000, boost: 0.5, bands: ['Midnight Vapor', 'The Hollow Pines', 'Crystal Hill Choir'] },
};

// Research points per unlock. Order inside a scenario comes from the scenario.
export const RESEARCH_COST = { gentle: 60, thrill: 120, water: 140, coaster: 160, stall: 50, special: 150, scenery: 40 };

export const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];
export const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Hot Springs monthly normals Apr–Oct (research/geography-lakes-mountains.md → Climate; climate-charts.com NOAA).
// tools/check-facts.mjs checks these against the research table.
export const CLIMATE = [
  { m: 'Apr', hi: 74.4, lo: 51.8, pr: 5.9 },
  { m: 'May', hi: 81.5, lo: 61.0, pr: 6.3 },
  { m: 'Jun', hi: 90.6, lo: 69.9, pr: 4.0 },
  { m: 'Jul', hi: 93.3, lo: 72.6, pr: 4.0 },
  { m: 'Aug', hi: 92.8, lo: 71.7, pr: 3.7 },
  { m: 'Sep', hi: 86.7, lo: 64.8, pr: 4.0 },
  { m: 'Oct', hi: 75.4, lo: 52.5, pr: 4.3 },
];

export function def(type) {
  return RIDES[type] || STALLS[type] || SCENERY[type] || SPECIAL[type] || TRACKS[type] || null;
}
export function kindOf(type) {
  if (RIDES[type]) return 'ride';
  if (TRACKS[type]) return 'track';
  if (STALLS[type]) return 'stall';
  if (SPECIAL[type]) return 'special';
  if (SCENERY[type]) return 'scenery';
  return null;
}
export function researchCat(type) {
  if (RIDES[type]) return RIDES[type].cat === 'water' ? 'water' : RIDES[type].cat;
  if (TRACKS[type]) return 'coaster';
  if (STALLS[type]) return 'stall';
  if (SPECIAL[type]) return 'special';
  return 'scenery';
}
export const ALL_TYPES = [...Object.keys(RIDES), ...Object.keys(TRACKS), ...Object.keys(STALLS), ...Object.keys(SPECIAL), ...Object.keys(SCENERY)];
