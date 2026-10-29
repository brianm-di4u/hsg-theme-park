# Spa City Thrills: report

An original theme-park builder and management sim set in the wooded Ouachita hills of Hot Springs,
Arkansas. `index.html` (~465 KB) is built from `src/` with `node shared/tools/inline.mjs games/theme-park`. After the
visual campaign it also loads `vendor/three.min.js` and `assets/` (1.98 MB in all) for the 3D view, after first paint.
See `VISUAL-REPORT.md`: three.js 3D park, Blender models, real USGS terrain around the map, and the original Canvas
renderer kept as the fallback. Visual-final run: **86/86** at both viewports. Nothing is committed; the coordinator reviews and commits.
The game is not branded as, affiliated with or a depiction of the real park; real history appears only
on sourced history cards.

## What was built
- **Hills that matter.** A 48 × 48 isometric map of east-west ridges (height levels 0–10), a creek valley,
  rock outcrops and pine/oak/redbud/dogwood woods from a seed. Rides need flat ground (grading $40 a
  level); paths climb one level at a time as stairs; uphill walking is slower and more tiring and the
  pathfinder prefers level routes; coaster supports cost $25 per level above the ground, so tracks that
  ride the hillside are cheaper and score a "hugs the hillside" bonus; water rides pay pump upkeep per
  level of hill; the Lookout Tower gains thrill from the height it stands on.
- **Building.** Paths (drag, L-runs), 18 flat rides, 9 stalls and facilities, 12 scenery items, an
  amphitheater, terraforming, demolish (50% refund) and "leave standing" (closed landmark, 10% upkeep,
  refurbish later). Placement ghosts show cost, grading and the reason a spot is refused.
- **Coaster and flume builder.** Steel, wooden, family coasters and a log flume, built cell by cell from a
  three-cell station: slope (down 1–3, level, up), lift chain, left/straight/right, undo, auto-finish
  (BFS route home with heights planned to descend), and a test run on per-cell energy physics that fails
  on a stall and names the cell. Stats: length, top speed, biggest drop, airtime, hillside hugging,
  intensity 1–5 and thrill. Four blueprints place as one transaction (all or nothing).
- **Guests.** Agents with hunger, thirst, bladder, energy, nausea, happiness, money, height and an
  intensity range by kind (child/teen/adult/senior). They choose rides by thrill, fit, novelty, distance,
  wait and price; queue (FIFO, limit, patience); ride; eat; drop litter away from bins; slow down in
  crowds; think 24 kinds of thoughts (icon + words) aggregated in the Guests panel with a "why guests
  come" demand breakdown. Movement uses one Dijkstra distance field per destination on typed arrays,
  rebuilt only when the network changes.
- **Operations.** Ride cycles and capacity, breakdowns by reliability and inspection age, mechanics who
  walk over and repair or inspect, a $500 contractor when nobody comes, groundskeepers, a bear-costume
  entertainer, seasonal (teen) staff who are back at school on weekdays from mid-August.
- **Economy.** Admission or pay-per-ride, up-charge Sky Swing, stall prices, Cooler Sundays, four
  marketing campaigns plus Fright Nights, research budgets that unlock items in scenario order, loans with
  interest, monthly ledger and profit chart, winter costs, bankruptcy after two month-ends below −$20,000,
  a used-ride market with fictional provenance, Saturday concerts with fictional bands and $5/$10 seats.
- **World.** Each month plays as one representative week; April–October seasons with a winter summary;
  daily weather drawn from Hot Springs monthly normals; storms close tall, coaster and water rides; the
  water park follows the real calendar (daily May–mid-August, weekends to September); ride and park
  novelty fade (year two ~65–72% without new rides); seasonal tree colours; night lights and neon; rain.
- **Campaign and sandbox.** Six eras inspired by the real park's arc (1978 opening, 1984 debt, 1991 used
  woodie, 1995 closure year, 2000 bond rebirth with a water park, 2003 amphitheater), each with goals,
  history cards, stars and unlocking; a seven-step tutorial in 1978; a sandbox with hilliness, cash and
  map options.
- **Content.** 32 history cards from 48 references (audited bank items or verbatim research quotes),
  checked by `tools/check-facts.mjs` together with the climate normals and the Help "About" claims.
- **Polish.** WebAudio effects and crowd/rain beds (off until the first gesture), mid-century signage UI,
  text 100–150%, reduced motion, keyboard-only building with a tile cursor, live-region announcements,
  phone layout with a two-row dock and bottom sheets, build bar with Rotate/Done for touch, 3 save slots,
  autosave every month end, storage-blocked fallback.

## Acceptance criteria
| AC | Status | Evidence |
|---|---|---|
| AC1 title | met | screens › title; hooks ready in ~60–200 ms |
| AC2 help tabs | met | screens › help tabs (7 tabs, "game rules", non-affiliation, sources) |
| AC3 layout | met | `checkLayout` in every screen test; a11y › touch targets (mobile, all ≥ 44 px) |
| AC4 terrain | met | seeded generation used by every test; ridges, creek and stepped blocks in every map shot |
| AC5 paths | met | input › mouse/touch build; a11y › keyboard; refusals shown in the ghost |
| AC6 grading, terraform | met | grading cost in the placement ghost (input › mouse); terraform act used by the planner; terrain tool panel |
| AC7 placing, entries | met | input tests; "⚠ No path" badge and refusal reasons in shots |
| AC8 demolish, standing | met | Bond Rebirth starts with standing rides; refurbish in world › calendar; refunds in ride windows |
| AC9 guest flow | met | sim › guest flow (rides carry riders, lines form, everyone leaves at closing) |
| AC10 needs | met | sim › needs (5+ stalls sell, restrooms used, food/drink/admission in the ledger) |
| AC11 tastes, heights | met | sim › tastes (no child under 48 in on 48-in rides, no adult on kiddie planes) |
| AC12 thoughts | met | sim › thoughts (guest window, feedback panel with icon + words) |
| AC13 crowding | met | sim › crowding (packed tile walkers move less; "too crowded" recorded) |
| AC14 queues | met | sim › queues (line, limit, wait in minutes) |
| AC15 breakdowns | met | sim › breakdowns (contractor $500; mechanic repair) |
| AC16 litter | met | sim › litter (litter appears; groundskeepers sweep) |
| AC17 staff, school | met | sim › staff (seasonal at school on a late-August Thursday, back on weekends) |
| AC18 track builder | met | track › steel coaster (clicks, keyboard, undo, auto-finish, test, stats, $25/level supports) |
| AC19 flume, blueprints | met | track › stall test; track › flume and blueprints (flume intensity ≤ 3, pumps) |
| AC20 ride ops | met | econ › ride ops (price, up-charge with pay-one-price, pay-per-ride, close) |
| AC21 finances | met | econ › finances (loan, ledger, profit chart); campaign › lose (foreclosure) |
| AC22 rating | met | econ › rating (components; rating 800 brings > 1.5× the arrivals of 300) |
| AC23 weather | met | world › weather (rain cuts arrivals; storms close coasters and tall rides, not the carousel) |
| AC24 calendar | met | world › water calendar (8 cases); world › calendar (winter summary, ages +1); balance novelty band |
| AC25 marketing | met | econ › marketing (billboards, School Days in May only, Cooler Sundays, Fright Nights) |
| AC26 research | met | econ › research (locked items, a month on high unlocks Spin Cups) |
| AC27 concerts | met | econ › concerts (headliner fee, Saturday show, seat sales); 9 pm concert shot |
| AC28 used rides | met | econ › used market ($10,000 + $90,000, lower reliability, fictional provenance) |
| AC29 campaign | met | campaign › select/intro, win 1978 by a scripted plan (stars saved, 1984 unlocks), lose |
| AC30 sandbox | met | campaign › sandbox |
| AC31 tutorial | met | campaign › tutorial (all seven steps) |
| AC32 history | met | content › album (32 cards, every one sourced); `tools/check-facts.mjs` 51/51 |
| AC33 originality | met | content › originality (47 real ride/park/event names scanned across all play text; the park is never named in play) |
| AC34 saves | met | saves › slots, reload + Continue, autosave at month end; storage blocked still plays |
| AC35 time, determinism | met | speed buttons and keys in input/a11y tests; Node balance runs reproduce exactly from seeds |
| AC36 keyboard | met | a11y › keyboard only (sandbox via Tab/Enter, path and carousel with cursor keys, run, pause) |
| AC37 touch | met | input › touch (tap tools, drag path, tap to place, pinch zoom) |
| AC38 real input | met | input › mouse (desktop) and touch (mobile): built through the UI at 8×, guests ride it, no setState |
| AC39 access | met | a11y › contrast (0 failures across 20 screens and panels), reduced motion, 150% text, live region |
| AC40 audio | met (not heard) | a11y › settings persist; sounds play only after a gesture (see gaps) |
| AC41 performance | met | 278 KB, hooks < 2 s, no requests or console errors in any run. FPS with 642 guests: **60.5 desktop / 60.0 mobile** on the coordinator's quiet-machine review run (77/77); 18–40 on runs while other sessions saturated the CPU (86–99%). See Performance |
| AC42 balance | met, one outlier | `tools/balance.mjs`: 14/15 bands, every scenario won by its scripted player (below) |
| AC43 phone view | met | adults ~14 px tall at the default 0.9 phone zoom (full-size check of mobile crowd shot); follow camera keeps the guest above the sheet |
| AC44 day/night | met | world › night (9 pm lights and neon), rain, storm flashes |

## Test results
`node shared/test-harness/run.mjs games/theme-park --milestone final`: **75/77** at desktop (1280×800)
and mobile (390×844), 97 screenshots. The two failures are the fps assertion only (28.6 desktop, 17.2
mobile; the machine stayed at 86–99% CPU from other sessions' browser tests for the whole closing hour,
including a 25-minute wait for it to drop below 55%); every functional test
passed with zero console errors and zero external requests. The same perf test passed on the m3 run
(55.9 / 59.5 fps) and missed by 1.5 fps on the first final run (53.5 / 57.9). All 97 screenshots of the final
run were inspected through 15 contact sheets, with full-size checks of the phone crowd, building and
large-text shots. Milestones m1–m5 were run and inspected along the way (26 defects logged and fixed in
DEV-PLAN §5, including one found only on full-size inspection of the final shots: a reversed blit offset
that exposed sky when the camera moved).

## Balance (`node games/theme-park/tools/balance.mjs`)
| # | Scenario | Scripted player | When | Stars | Seasons (guests / rating / operating profit) |
|---|---|---|---|---|---|
| 1 | 1978 Opening Summer | won | Sep 1978 | 2 | 4,000+ guests, rating 500+ |
| 2 | 1984 Debt Season | won | Oct 1984 | 3 | loan paid to $89,000 |
| 3 | 1991 The Secondhand Woodie | won | Sep 1991 | 2 | used woodie bought for $100,000 all-in |
| 4 | 1995 Hold the Gates | won | season end 1995 | 1 | 8,145 / 652 / $47,023 |
| 5 | 2000 Bond Rebirth | won | season end 2001 | 1 | 2000: 11,214 / 653 / $129,794; 2001: 14,356 / 693 / $128,224 |
| 6 | 2003 Saturday Night Stage | won | Aug 2003 | 2 | $1,500+ concert seats, a 4+ coaster, rating 650+ |

| Metric | Result | Band |
|---|---|---|
| Small park (1978 plan), rides per visit | 2.63 | 2.5–7 |
| Small park, average happiness | 78 | 55–85 |
| Small park, rating | 520 | 450–700 |
| Small park, guests per July day | 177 | 50–250 |
| Year-two attendance without new rides | 65% | 65–90% (real 2000→2002: about 70%) |
| Stress park (20 rides, July, marketing), peak guests in the park | 783 | 350–900 |
| Stress park, rides per visit | **1.85** | 2–6 (outlier) |
| Sim tick, all systems, stress park | 0.1–0.5 ms (varies with machine load) | ≤ 2 ms |
| Distance-field build | 0.02–0.06 ms each, ~36 builds a day | ≤ 3 ms |

**Outliers and near-edges (named, not hidden):**
- **Overloaded parks give guests fewer than two rides a visit** (1.85). The stress park is deliberately
  over capacity (~800 guests for 20 rides); lines and give-ups dominate. Levers: ride capacity (seats,
  cycle), queue patience, the demand constant (17), or price elasticity.
- **Novelty decay sits on the band's edge** (65%; the real 2000→2002 drop was about 30%).
- **Scenario 1 wins in September with 2 stars**; scenarios 4 and 5 are won only at the final season end
  (1 star). Rides per visit (2.6) is near the low edge for small parks.

## Performance
- `index.html` ~280 KB (budget 2 MB); hooks ready in ~60–200 ms; JS heap 9.5–11 MB with 640 guests.
- Rendering: a cached ground layer (sky, terrain, paths, trees) rebuilt only on zoom, a pan past its
  margin, a build, the month or nightfall; raised tiles near paths and objects and trees just in front of
  them are redrawn in painter order; guests, staff and trees are sprites cached per zoom; the canvas is
  opaque. This took a 640-guest frame from ~24 fps to 56–60 fps in headless Chromium on a quiet machine.
- Sim: 0.26 ms per tick with 673 guests in Node (guest update ≈ 80% of it); distance fields 0.02–0.06 ms
  each and rebuilt only when paths or objects change; no per-tick allocation in the guest loop.
- Headless fps is software rasterization and swings with CPU contention: 53–60 fps when the machine was
  shared lightly, 18–40 fps while it ran at 86–99% CPU.

## Known gaps
- AC41 was confirmed after the final run: the coordinator's review run on a quiet machine passed 77/77
  with 60.5 / 60.0 fps and 642 guests.
- **Nobody listened to the audio or used a screen reader.** Sounds are short and quiet; live-region text
  was tested automatically only.
- Overloaded-park outlier above.
- Track rides run one train, and track stays on the cell grid: no loops or inversions.
- Guests are individuals (no families walking together); queues show 10 figures plus a "+N" badge.
- Occlusion is exact for tiles and square rides but approximated for the cached ground: only raised tiles
  near paths/objects are redrawn, so a guest could in theory show through a far ridge with nothing near it.
- The tutorial exists only in 1978; other eras rely on the intro, goals panel and Help.
- Real facts in cards name the real park and two of the source article titles name rides ("Wikipedia:
  The Gauntlet", "Wikipedia: X-Coaster", "Wikipedia: Arkansas Twister"); card texts themselves name no rides.

## Data notes (not fixed, reported)
- **Seasonal staff "nearly 600, many teens"** is a *claim* in the audited bank (hs-0450). The game shows it
  hedged ("The park says it hires…") from the research quote in `magic-springs.md`.
- **EPR sale date:** the bank (hs-0435) says "late-2016 sale"; research keeps late 2016 / April 2017 /
  December 2017 side by side. The card follows the bank wording.
- **Arkansas Twister retirement** (2024 vs 2025) and **X-Coaster 2026 status** are disputed; neither is used.
- **Climate table:** the research labels the normals period both 2006–2020 and 1991–2020; the game uses the
  table values as printed (checked by `check-facts.mjs`).
- **Theme kits** (logging, mining, bears) come from an *inferred* note in research; they are presented as
  original game themes, not as facts.

## Harness requests
- **A load-independent performance metric.** `t.fps` in headless Chromium measures software raster under
  whatever else the machine is doing; with several sessions running browser tests at once it swung from 60
  to 18 fps for the same build. A `t.frameCost(ms)` (CPU time per frame from `performance.now()` around the
  game's own render, or CDP `Performance.getMetrics` task duration) or a lock that serializes perf tests
  across sessions would make the budget testable.
- **`t.stepUntil` can step past a narrow window** (it checks between chunks). Document that predicates
  should test "has happened" state, or add an option to check every tick near the end.
- **A shared `contrastReport` helper** (several games now carry their own copy) that skips
  `aria-hidden` decorations.
- **Lesson worth adding:** after a touch drag on a canvas, Chromium may not synthesize the next `click` for
  a CDP tap on a button. Acting on `pointerup` for touch (and skipping the following click) fixed it.

## Files
Visual campaign: `VISUAL-PLAN.md`, `VISUAL-REPORT.md`, `research/terrain.md`, `src/js/gfx/` (3D view), `assets/`,
`vendor/` (three.js r186.1, MIT), `art-src/blender/` (model generator), `tools/geo/`, `tools/shots3d.mjs`,
`tools/check-file-url.mjs`, `tools/before-after.mjs`, `tools/build-vendor.mjs`, `tests/gfx3d.test.mjs`.

`PRD.md`, `MECHANICS.md`, `DEV-PLAN.md` (milestones, hook spec, test matrix, defect log), `SAMPLES.md`,
`research/town-content.md`, `tools/balance.mjs`, `tools/check-facts.mjs`, `tests/*.test.mjs` (11 files +
helpers), `src/` (21 modules + CSS).
