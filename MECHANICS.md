# Spa City Thrills: mechanics

The core-mechanics foundation, synthesized from the samples in `SAMPLES.md`. All numbers here are the
starting values; `tools/balance.mjs` tunes them and REPORT.md records the final bands.

## 1. Loop and timing
- **Fixed step.** The sim advances in ticks. 1× speed = 12 ticks per real second; speeds 1×, 2×, 4×,
  8× and pause. The render loop runs on `requestAnimationFrame`, accumulates real time and runs at most
  12 ticks per frame (no spiral of death), then draws with positions interpolated inside the tick.
- **Calendar.** One game day = 1,200 ticks, 10:00 to 22:00 (100 ticks per game hour). The season runs
  April–October. **Each month plays as one representative week**, Monday to Sunday (7 days), so a season is
  49 days: about 82 min at 1×, 10 min at 8×. November–March is a winter break: one summary screen that
  charges winter costs (5 months of loan interest, 10% of yearly upkeep) and ages rides.
- **Day shape.** Gates open 10:00. Guests arrive 10:00–16:00 (front-loaded), plus 16:00–19:00 on concert
  Saturdays. At 21:00 guests head for the exit; at 22:00 anyone left is walked out and the day closes:
  daily stats, then month-end (Sunday) accounting.
- **Determinism.** One seeded PRNG (mulberry32) lives in the state (`rng` = current 32-bit state). The sim
  uses only it, never `Math.random`. Cosmetic effects (rain streaks, confetti) use a separate render
  RNG. `seed(n)` resets it. The same seed + same actions = the same park, in Node and in the browser.

## 2. Grid and terrain (hills matter)
- 48 × 48 tiles (scenarios may use smaller owned areas). Each tile has a **height level** 0–10, a
  terrain kind (grass, rock, water) and an optional tree. Levels are 10 ft (3 m) apart; a tile is about
  26 ft (8 m) across.
- Terrain is generated from the seed: east-west ridges (value noise stretched along x, like the
  Ouachitas), a creek in the lowest valley (water tiles at level 0–1), rock outcrops on steep spots,
  shortleaf pine and oak woods, redbud and dogwood at edges.
- **Projection.** 2:1 isometric: screen x = (x − y)·W/2, screen y = (x + y)·H/2 − z·U with W = 64, H = 32,
  U = 8 px at zoom 1. Faces shaded by normal (top = base, +x face −18%, +y face −30%).
- **Why hills matter:**
  1. Flat rides and stalls need a flat footprint. Placing on uneven ground **grades** it to the
     footprint's median height at $40 per level moved (shown in the preview).
  2. Terraform tool: raise or lower one tile by a level, $40 (+$20 if it moves rock).
  3. Paths connect across a step of at most one level (drawn as stairs). Walking **uphill** is slower
     (×0.6) and drains energy three times as fast; pathfinding charges 18 for an uphill step, 12 for
     downhill, 10 for flat, so guests prefer level routes.
  4. Coaster supports cost $25 per level of track above the ground: a track that rides down a hillside
     is cheaper than one on stilts, and big natural drops add thrill without a lift.
  5. Water rides pay pump upkeep: +$20/month per height level of the ride's footprint (the creek
     valley is cheapest). Flumes pay +$30/month per level of lift.
  6. The Lookout Tower gains thrill from the height it stands on (+0.15 per level).

## 3. Building
- **Paths:** $12 per tile; drag to lay a straight or L-shaped run. Cannot cross water, rides or track.
  Tiles connect to 4-neighbors with a height difference ≤ 1.
- **Objects** (rides, stalls, facilities, scenery) are square, 1×1 to 4×4. A footprint needs owned,
  non-water, non-path, non-track tiles; trees are cleared at $20 each. An object is **connected** when a
  path tile touches its footprint edge with a height difference ≤ 1; that path tile becomes its
  **entry** (entrance and exit). Unconnected rides show a warning and get no guests.
- **Demolish:** refunds 50% of the object's build cost (track: 50% of track cost). A ride can instead be
  **left standing** (closed, no upkeep except 10%, counts as scenery: "nostalgia").
- **Used-ride market** (scenarios that enable it): listings of rides at a discount with lower starting
  reliability, a relocation fee, and a fictional provenance line (marked "fictional").

## 4. Track rides (coaster and flume builder)
- A track ride is a closed loop of cells on the grid. Cell 0–2 are the **station** (a straight run of
  three, at the highest ground under it, with a free cell behind and ahead so the loop can leave and
  return). Each new cell is 4-adjacent to the previous one; a direction change is a
  turn. Each cell has a height `h ≥ terrain`, at most 12 levels above it, and a `lift` flag.
- Allowed height change per cell: steel coaster −3…+1, wooden coaster −2…+1, family/kiddie coaster
  −1…+1 (max 4 above ground), log flume −2…+1. A climb (+1) on a non-lift cell needs speed.
- The loop **closes** when the last cell is the cell just behind the station, at station height.
  **Auto-finish** finds the shortest free route back (BFS over free cells) and spreads the needed height
  change along it (descending at most the type's limit per cell; climbs become lift cells).
- **Blueprints:** preset layouts (relative cells and heights) placed like a ride, if every cell fits.
- **Physics** (per cell, from the energy model in sample 5): `v² ← v² − 2g·Δz`, then
  `v² ← v²·(1 − k) − c` with k = 0.015 straight / 0.03 turn, c = 0.5; lift cells set
  `v = max(v, 3 m/s)`; the station sets `v = max(v, 2 m/s)`. If `v² ≤ 0` on a non-lift cell the
  **test fails** at that cell ("the train stalls: add a lift or lower the hill").
- **Stats:** length (cells × 26 ft), max speed (mph), biggest drop (ft), steep drops (Δh ≤ −2), turns at
  speed (v > 12 m/s), airtime crests (a climb followed by a drop at v > 10), hillside-hugging fraction
  (cells within 1 level of the ground), total lift.
- **Ratings:**
  - intensity ι = 0.09·vmax + 0.17·drop + 0.25·steep + 0.08·fastTurns + 0.3·air (+0.5 wood); shown
    as 1–5 (rounded, clamped). Flume ι capped at 3, kiddie at 2.
  - thrill T = 0.1·vmax + 0.13·drop + 0.3·air + 0.08·turns + 0.15·(cells/10) + 0.6·hug; if ι > 5.5,
    T −= 2·(ι − 5.5) (too intense, guests fear it); flume +1.0 splash bonus.
  - ride time from the per-cell speeds; run = 8 ticks + 0.6 × ride seconds (loading up to 20 ticks), capacity = train seats
    (steel 16, wood 20, family 12, flume 8).
- **Cost:** station by type ($6,000–$20,000) + per cell $150 + supports $25/level above ground + lift
  $120 + turn $40.

## 5. Guests (agent model)
- **Arrivals per day** = 17 × rating factor × draw × month × weekday × weather × price × marketing ×
  novelty × concert, ± 10% noise (tuned by `tools/balance.mjs`):
  - rating factor 0.4 + 1.2·rating/1000; draw = (Σ thrill × novelty)^0.75; ride novelty 1.6 in its first
    season, 1.2 in the second, then 1.0; park novelty 1.2 in the first season after opening or
    reopening. Together they give about −30% in year two without a new ride (measured 65–72%; the real
    2000→2002 attendance fell to about 70%).
  - month: Apr 0.55, May 0.75, Jun 1.0, Jul 1.05, Aug 1.0 then 0.7 after mid-month, Sep 0.6, Oct 0.6
    (+0.6 with Fright Nights); weekday: Mon–Thu 0.75, Fri 1.0, Sat 1.45, Sun 1.25.
  - weather: sun 1.0, cloud 0.95, rain 0.55, storm 0.4; water rides weigh into the draw by the day's high (0.2 at 73 °F up to 1.3 at 90 °F).
  - price: value V = $8 + $1.6 × Σ thrill (pay-per-ride parks use mean ride price); factor
    clamp(1.3 − 0.6 × admission / V, 0.25, 1.3). Guests turned away by price are counted.
- **Kinds:** child (36–54 in), teen, adult, senior, with intensity tolerance [lo, hi]: child [1,2], teen
  [2,5], adult [1,4], senior [1,3] (±1 random). Money: child $15–40, teen $20–50, adult $40–100, senior
  $30–70. Kiddie rides take riders ≤ 54 in only.
- **Needs** (0–100) per tick: hunger +0.1, thirst +0.14 (×1.5 above 90 °F), bladder +0.06 (+25 per
  drink), energy −0.05 (×1.5 walking, ×3 uphill), nausea −0.2. Happiness 0–100 moves with events.
- **States:** walking, wandering, queueing, riding, at a stall, sitting, leaving.
- **Choosing** (when idle): urgent needs first (restroom > 70 bladder, drink > 60 thirst, food > 60
  hunger, bench < 25 energy or > 50 nausea), using the nearest reachable stall by field distance. Else
  score each open, connected ride: `thrill × fit × 0.55^(times ridden) − dist/40 − wait/patience`,
  plus jitter. `fit` is 1 inside [lo, hi], 0.6 below lo ("too tame"), 0.15 one above hi, 0 beyond.
  Height and price filters apply. No good choice → wander; several in a row → go home.
- **Leaving:** money gone, energy < 10, happiness < 20, stayed longer than their stay limit (4–8 game
  hours), or closing time.
- **Ride effects:** happiness + (2 + 1.6·thrill)·fit (happiness also drifts down 0.8 per game hour);
  above hi: nausea + 20 per level over, happiness −8; a ride price above 1.5 × thrill + $0.50 is "not
  worth it" (up-charge rides: 5 × thrill).
- **Thoughts:** each guest keeps its last three thoughts; the park keeps hourly counts by kind for the
  Guest Feedback panel (top complaints with icons). Kinds: hungry, thirsty, restroom, tired, queasy, too
  intense, too tame, line too long, waited too long, too crowded, dirty path, can't find X, too expensive,
  great ride, nice view (hilltop paths), lovely scenery, broke down, rain, heat.
- **Litter:** after food or a drink (not refill bottles, which go home as souvenirs) a guest carries trash
  40–120 ticks; within 2 tiles of a trash can it goes in; else it drops on the current path tile (0–9 per
  tile). Litter ≥ 3 lowers happiness
  of guests on the tile.
- **Crowding:** guests per tile are counted every tick. Above 6 on the current or next tile a guest moves at
  half speed; above 10 it
  thinks "too crowded".

## 6. Pathfinding
- **Distance fields** (flow fields): for every destination (each object's entry tile and the park gate) a
  Dijkstra field on the path graph, computed backwards from the destination with directed step costs
  (flat 10, up 18, down 12). Stored as `Uint16Array(w·h)`, 65535 = unreachable. A binary heap on typed
  arrays, no per-node objects.
- Fields are cached per destination and invalidated by a **network version** that bumps on any path or
  object change. They rebuild lazily the first time a guest asks. The balance tool reports the rebuild
  cost and per-tick guest cost.
- A walking guest at a tile center picks the 4-neighbor with the lowest field value (ties broken by guest
  id parity so crowds split), then moves toward it; its height interpolates across stairs.
- Staff use the same fields (mechanics to ride entries) or a short BFS (groundskeepers to the nearest
  litter within 12 steps).

## 7. Rides, queues and capacity
- Flat-ride catalog in `src/js/data/catalog.js`: size, cost, upkeep, intensity, thrill, seats, cycle
  ticks, default price, height requirement, base reliability, flags (tall, water, kiddie, up-charge).
- **Cycle:** load (until full or 20 ticks with at least one rider) → run (cycle ticks, 20–90) → unload (6).
- **Queue:** FIFO of guest ids; max length = seats × 4 (min 12). Estimated wait = queue / seats × cycle.
  Guests skip a ride whose wait beats their patience (300–700 ticks); in-queue guests give up past it.
- **Reliability** r: base 0.94–0.99, −0.01 per season of age, restored by inspection. Breakdown chance
  per cycle = (1 − r) × 0.15 × (1 + hours since inspection / 6). A broken ride stops; riders wait; the
  queue drains with "broke down" thoughts. A mechanic walks over and repairs it in 60 ticks; with no
  mechanic, an outside contractor repairs it after 400 ticks for $500.
- **Storms** close tall rides, coasters and water rides until the storm ends. Water rides follow the
  water calendar (daily May–mid-August, weekends late August–September, closed April and October) and
  draw little below 78 °F.

## 8. Staff
- Groundskeeper $1,400/month (sweeps a littered tile clean in 12 ticks), Mechanic $1,800 (repairs, then inspects
  the ride with the oldest inspection), Entertainer $1,200 (a bear-costume mascot: guests within 3 tiles
  gain happiness and queue patience).
- Hired as **seasonal** (teen) or **year-round** (+40% wage). Seasonal staff are back at school on
  weekdays from mid-August through September (shown as "At school").

## 9. Economy
- Cash, loan (scenario max, annual rate charged monthly, winter months at the break), ledger per month:
  admission, rides, food, drinks, merch, concerts in; wages, upkeep, construction, research, marketing,
  interest, acts, repairs out. Bankrupt when cash < −$20,000 at two month-ends in a row.
- **Pricing:** admission (pay-one-price, default) or pay-per-ride (admission can be 0); up-charge rides
  always charge. Stall prices per stall. **Cooler Sundays** toggle: Sunday arrivals ×1.2, food and drink
  sales ×0.3 that day.
- **Marketing** (one month, renewable): Billboards $3,000 (+15%), Radio $6,000 (+25%), School Days $2,000
  (May weekdays +40%), Coupons $1,000 (+30% arrivals, 30% pay half admission). Fright Nights (October,
  $5,000 setup).
- **Concerts:** needs an Amphitheater. Book Saturdays per month: Local band $1,500 (+10% arrivals),
  Regional act $6,000 (+25%), Headliner $18,000 (+50%); extra Saturday arrivals come as fans. At 19:30 fans
  and three in four other guests walk to the show and stay until 21:30; seat sales 40% at $5 reserved and
  15% at $10 VIP (historic price points); the lawn is free.
- **Research:** budget none/low/medium/high = 0/40/80/140 points per month, $0/$1,000/$2,000/$3,500.
  Items cost 60–200 points; scenarios set what starts unlocked and the research order.

## 10. Park rating (0–1000, updated hourly, smoothed 0.85/0.15)
Positives: happiness 450 × avg/100 · variety 12 per distinct open ride type (max 200) · excitement 18 × the
average thrill of the top three rides (max 100) · scenery 150 (scenery value within 2 tiles of paths) ·
capacity 100 (seats per hour vs 0.9 × guests). Penalties: litter up to −150 (litter ÷ 3 × path tiles),
breakdowns up to −100, prices up to −100 ("too expensive" thoughts), lost guests × 4 per hour, stranded
riders × 2. A park with no open rides is capped at 200.

## 11. Scenarios
A scenario = map seed and terrain preset, owned area, prebuilt objects, start cash/loan/max loan, start
year, unlocks, research list, enabled features (market, concerts, water calendar) and goals checked at
each month end (guests this season, rating, cash, loan, profit, a ride of a type with intensity ≥ n,
concert revenue, attendance ratio between seasons), with a deadline (end of October of year Y). All goals
met → win (early wins allowed). Deadline passed or bankruptcy → lose.

## 12. State model and save format
One serializable object `S` (see `src/js/state.js`): `v`, `seed`, `rng`, `tick`, `day`, calendar
(`year`, `month` 0–6 = Apr–Oct, `dow` 0–6), `map` (w, h, `height`, `kind`, `tree`, `path`, `owned`,
`litter`, `occ` (object id per tile) as typed arrays, saved run-length encoded as `{t$, d}`), `objects` (rides, stalls, scenery, with track cells),
`guests`, `staff`, `finance`, `park` (name, admission, payPerRide, cooler, marketing, research, concerts,
rating), `weather`, `scenario`, `stats`, `msgs`. Typed arrays are saved as plain arrays (or run-length
strings for the large ones). Saves go to `localStorage` key `sct-save-<slot>` (three slots + auto) as
`{v:1, savedAt, name, state}`, wrapped in try/catch; settings in `sct-settings`, campaign progress in
`sct-progress`. Autosave at every month end and at the winter break.

## 13. Input
- **Mouse:** click to select/inspect; with a tool, click or drag to build (path drags lay runs; ride tools
  show a ghost that follows the pointer); right-drag or middle-drag pans; wheel zooms around the pointer.
- **Touch:** one finger taps and drags with the current tool; in Inspect mode one finger pans. Two
  fingers pan and pinch-zoom in any mode. Panels are bottom sheets.
- **Keyboard:** arrows/WASD pan (or move the build cursor when a tool is active); Enter places; Esc
  cancels; R rotates; Space pauses; 1–4 speeds; +/− zoom; P path, B rides, X demolish, I inspect; Tab
  reaches every control.

## 14. Rendering
- Canvas 2D at device pixel ratio, DOM overlay for HUD and panels.
- Draw order: tiles by diagonal `x+y` (then x); each tile draws terrain block (sides down to its +x/+y
  neighbors), path, litter, single-tile objects, track cells and cars, and the guests on it. A square
  n×n object is drawn once, right after diagonal `x0+y0+n−2`; its footprint tiles skip their own terrain.
  Ride art stays inside the footprint's vertical prism, so this ordering is exact for square objects.
- The ground (sky, terrain, paths, trees) is drawn once into an offscreen layer a quarter-screen larger than
  the view and blitted each frame; it rebuilds on zoom, a pan past the margin, any build, the month (tree
  colours) and nightfall. Raised tiles near paths or objects, and trees just in front of them, are drawn
  again in painter order so depth stays right.
- Guests, staff and trees are drawn from sprite canvases cached per zoom; rides animate live.
- Day/night tint after 19:00 with lamp and neon glows; rain streaks and storm flashes; seasonal tree
  colors (spring redbud/dogwood, summer green, October orange).
- Renders on demand when paused and nothing changes; the sim loop drives frames when running.

## 15. Test hooks (`window.__game`)
`seed`, `getState`, `setState`, `isIdle`, `step(n)`, `pause`, `resume`, `scene`, `newGame`, `act`. Full spec in
DEV-PLAN.md §3.
