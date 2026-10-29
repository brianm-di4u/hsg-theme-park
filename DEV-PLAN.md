# Spa City Thrills: development plan

## 1. Milestones
| M | Name | Tasks | Exit check |
|---|---|---|---|
| m1 | Foundation | `src/` skeleton, inline build; state, RNG, terrain gen; iso renderer with diagonal painter, camera (pan, zoom, pinch), picking; HUD and dock shell; title, help, settings screens; hooks `seed/getState/setState/isIdle/scene/newGame/step/pause/resume` | title, help, settings, empty map shots at both viewports, zero errors |
| m2 | Core loop | paths (drag, stairs), grading, objects placement and entries; distance fields; guests (arrive, choose, walk, queue, ride, needs, leave); stalls, money and ledger; ride cycle; speed controls; real-input test (mouse + touch) | guests ride a mouse-built ride; balance tool v1 runs a park headless |
| m3 | Content | full catalog; track builder (steel, wood, family, flume), physics, stats, auto-finish, blueprints; staff, litter, breakdowns; weather, calendar, winter break, novelty; rating; marketing, research, concerts, used-ride market; 6 scenarios + sandbox, goals, win/lose; tutorial; saves; history cards + check-facts | each scenario won by `balance.mjs --scenarios`; every panel shot |
| m4 | Polish | audio; day/night, rain, seasonal trees; thoughts feedback panel icons; accessibility (keyboard cursor, live region, text scale, reduced motion, contrast); phone sheets and camera follow | a11y tests pass; contrast 0 failures |
| m5 / final | Optimization and release | profile guest and pathfinding cost; render culling; file size; final balance; REPORT.md | `--milestone final` passes at both viewports; every shot inspected |

## 2. Source layout
```
src/index.html            page shell, DOM for HUD/dock/panels
src/styles/main.css       tokens (copied from shared/design/tokens.css values) + layout
src/js/main.js            boot, loop, hooks
src/js/rng.js             mulberry32
src/js/state.js           state creation, serialize/deserialize
src/js/terrain.js         generation, grading, terraform
src/js/catalog.js         rides, stalls, scenery, track types, staff, campaigns, acts (data)
src/js/build.js           paths, placement, entries, demolish
src/js/fields.js          distance fields (Dijkstra on typed arrays)
src/js/track.js           track builder, physics, ratings, blueprints, auto-finish
src/js/guests.js          arrivals, guest agent update, thoughts
src/js/rides.js           ride cycle, queues, breakdowns, stalls
src/js/staff.js           staff agents
src/js/economy.js         ledger, loans, marketing, research, concerts, market, rating
src/js/calendar.js        days, months, weather, winter break, goals
src/js/scenarios.js       campaign + sandbox definitions
src/js/sim.js             tick(): orchestrates the modules (pure: no DOM)
src/js/render.js          canvas renderer
src/js/sprites.js         cached procedural sprites
src/js/ui.js              HUD, dock, panels, screens
src/js/input.js           mouse, touch, keyboard
src/js/audio.js           WebAudio
src/js/facts.js           history cards (ids + text + source)
tools/balance.mjs         headless sim runs (imports src/js/sim.js etc. directly)
tools/check-facts.mjs     history-card checker
tests/*.test.mjs          harness tests
```
The sim modules never touch the DOM, so Node runs them unchanged.

## 3. `window.__game` hook spec
| Method | Behaviour |
|---|---|
| `seed(n)` | reseed the sim RNG (and terrain on the next `newGame`) |
| `getState()` | summary: `{scene, paused, speed, tick, year, month, monthName, dow, hour, cash, loan, rating, guests, guestsToday, guestsSeason, objects:[{id,type,kind,x,y,size,status,connected,riders,queue,totalRiders,price,intensity,thrill}], tracks:[…stats], staff, weather, scenario:{id,status,goals}, tool, selected, panel, msgs, ledger, thoughts, zoom, camera}` |
| `getState(true)` | the full serialized state (save format) |
| `setState(s)` | a full save object, or a partial `{cash, rating, hour, month, …}` patch for crafted tests; redraws |
| `isIdle()` | true when no panel transition, toast entry, camera ease or ride-test animation is running (ambient guests, steam, rain and the title animation are excluded) |
| `step(n)` | advance n sim ticks while paused (scene must be `park`); returns `getState()` |
| `pause()` / `resume()` | stop/start the fixed-step loop |
| `scene(name)` | `title`, `campaign`, `sandbox`, `park`, `help`, `settings`, `history`, `win`, `lose`, `winter`, `intro` |
| `newGame(opts)` | `{mode:'campaign'|'sandbox', scenario:1–6, seed, hills, cash, empty:true}` → park scene, paused |
| `act(name, ...args)` | named actions, same code paths as the UI: `tool(id)`, `path(x0,y0,x1,y1)`, `place(type,x,y)`, `terraform(x,y,±1)`, `demolish(x,y)`, `leaveStanding(id)`, `trackStart(type,x,y,dir)`, `trackAdd(slope,turn,lift)`, `trackUndo()`, `trackFinish()`, `trackAuto()`, `blueprint(id,x,y,dir)`, `setPrice(id,p)`, `admission(p)`, `payPerRide(b)`, `openPark(b)`, `rideOpen(id,b)`, `hire(role,seasonal)`, `loan(amount)`, `market(id)`, `research(level)`, `book(act)`, `cooler(b)`, `buyUsed(i,x,y,dir)`, `speed(n)`, `select(kind,id)`, `panel(name)`, `camera(x,y,zoom)`, `tileToScreen(x,y)` → CSS px of a tile's top centre, `spawn(n)`, `spawnAt(x,y,n)`, `goto({month,dow,hour})`, `weather(kind,temp)`, `animAt(ms)`, `fx(bool)`; test helpers that reuse the balance tool's planner: `mainStreet(len,every,side)`, `autoPlace(type)`, `autoBlueprint(id)`, `stationSpot(ttype,skip,ahead)`, `gate()`, `tile(x,y)`, `check(type,x,y)`, `cellCost(…)`, `demand()`, `monthlyCosts()`, `collect(cardId)`, `debugRender(flags)` |

`window.__TEST__` only disables the title attract camera drift; rules and rendering are unchanged.

Visual campaign additions: `getState().gfx` = `{mode: '3d'|'2d', want, loading, failed, quality, gpu, soft, draws, tris,
frameMs, trees, guests3d, objects3d}`; `act('pickAt', sx, sy)` → the tile the current renderer picks at a screen point;
`isIdle()` is false while the 3D view loads and while a paused 3D frame is queued. `?gfx=2d` forces the Canvas renderer;
`?debug` exposes `window.__R3` for inspection. See `VISUAL-PLAN.md` and `VISUAL-REPORT.md`.

## 4. Test matrix
Screenshot names are `<file>-<nn>-<what>` in `screenshots/<milestone>/<viewport>/`; both viewports unless
noted.

| AC | Test (file › name) | Screenshots |
|---|---|---|
| AC1 | screens › title | `screens-01-title` |
| AC2 | screens › help tabs | `screens-02-help-basics` … `screens-08-help-about` |
| AC3 | every screen test calls `checkLayout`; screens › touch targets (mobile) | — |
| AC4 | core › terrain determinism | `core-01-terrain` |
| AC5 | core › paths and stairs | `core-02-paths` |
| AC6 | core › grading and terraform | `core-03-grading` |
| AC7 | core › placement ghost and entry | `core-04-ghost-ok`, `core-05-ghost-bad` |
| AC8 | core › demolish and leave standing | `core-06-standing` |
| AC9 | sim › guest flow | `sim-01-crowd` |
| AC10 | sim › needs and stalls | `sim-02-stalls` |
| AC11 | sim › tastes and height | — |
| AC12 | sim › thoughts panel | `sim-03-feedback`, `sim-04-guest` |
| AC13 | sim › crowding | — |
| AC14 | sim › queues | `sim-05-ride-window` |
| AC15 | sim › breakdown and mechanic | `sim-06-broken` |
| AC16 | sim › litter and sweeping | `sim-07-litter` |
| AC17 | sim › staff and school | `sim-08-staff` |
| AC18 | track › build, stall, auto-finish, stats | `track-01-building`, `track-02-stall`, `track-03-done` |
| AC19 | track › flume and blueprints | `track-04-flume` |
| AC20 | econ › ride ops and pricing | — |
| AC21 | econ › finances and loan | `econ-01-finances` |
| AC22 | econ › rating | `econ-02-rating` |
| AC23 | world › weather and storms | `world-01-rain`, `world-02-storm` |
| AC24 | world › calendar, winter, seasons | `world-03-winter`, `world-04-fall` |
| AC25 | econ › marketing | `econ-03-marketing` |
| AC26 | econ › research | `econ-04-research` |
| AC27 | econ › concerts | `econ-05-concert` |
| AC28 | econ › used market | `econ-06-market` |
| AC29 | campaign › scenarios, win, lose, stars | `campaign-01-select`, `campaign-02-intro`, `campaign-03-goals`, `campaign-04-win`, `campaign-05-lose` |
| AC30 | campaign › sandbox | `campaign-06-sandbox` |
| AC31 | campaign › tutorial | `campaign-07-tutorial` |
| AC32 | content › history cards; `tools/check-facts.mjs` | `content-01-album` |
| AC33 | content › originality scan | — |
| AC34 | saves › slots, resume, storage blocked | `saves-01-slots` |
| AC35 | core › speed and determinism | — |
| AC36 | a11y › keyboard only | `a11y-01-keyboard` |
| AC37 | input › touch build and pinch (mobile) | `input-02-touch` |
| AC38 | input › mouse build and ride (desktop); input › touch build and ride (mobile) | `input-01-mouse`, `input-02-touch` |
| AC39 | a11y › contrast, reduced motion, text scale, live region | `a11y-02-large-text` |
| AC40 | a11y › audio settings persist | — |
| AC41 | perf › fps with 500 guests, size, load | `perf-01-500-guests` |
| AC42 | `tools/balance.mjs` (REPORT.md); balance › scripted plan wins scenario 1 in the browser | — |
| AC43 | input › phone view guest size, follow camera (mobile) | `input-03-follow` |
| AC44 | world › night | `world-05-night` |

## 5. Defect log
| # | Milestone | Defect | Fix |
|---|---|---|---|
| 1 | m1 | Empty side panel visible on the park screen: author `display:flex` overrode the `hidden` attribute | `[hidden] { display: none !important }` |
| 2 | m1 | Mobile dock scrolled sideways, so six tools were off-screen (`checkLayout`) | Two-row 6-column dock grid on phones |
| 3 | m2 | After a canvas touch drag, Chromium dropped the next synthesized click: dock taps did nothing | Touch taps on `[data-act]` act on `pointerup`; the following click is skipped |
| 4 | m2 | Pinch test landed on the ride sheet that opens after placing a ride | Test closes the sheet first (the sheet opening is intended) |
| 5 | m2 | Guests walked 10 tiles per game hour and rides ran 30–100 game minutes: ~2 rides a visit, ratings saturated, costs beat income | 1× = 12 ticks/s, guests 0.18 tiles/tick, ride cycles halved, new demand and rating formulas (balance tool) |
| 6 | m2 | Saves lost every typed array: the `__t` marker was dropped by the "skip keys starting with _" replacer | Marker renamed `t$`; save/load test round-trips the park |
| 7 | m2 | Litter almost never dropped (trash timer only counted at tile centres) | Timer counts every tick; later tuned (keepers clear a tile per sweep, refill bottles make no trash) |
| 8 | m2 | Crowding never slowed anyone: only the destination tile was checked | Current or next tile over 6 guests halves speed |
| 9 | m3 | Concert fans went home at 9 pm before the 7:30 show ended; seat sales near zero | Concert fans (`cgo`) stay until 9:30; extra Saturday arrivals are fans |
| 10 | m3 | Sandbox ended in a "win" at the first month end (no goals = all goals met) | Goals are skipped when a scenario has none |
| 11 | m3 | Up-charge Sky Swing never sold a ride: the general "too expensive" rule judged $20 against thrill 4.2 | Up-charge rides are worth up to 5× their thrill |
| 12 | m3 | HUD rebuilt its buttons every 200 ms while running, so clicks on Pause timed out | HUD built once; updates only change text and pressed states |
| 13 | m3 | Stations could be placed with no room behind them, so the loop could never close ("No free route") | Station check needs a free cell behind and ahead |
| 14 | m3 | 24 fps with 640 guests (software raster) | Cached ground layer with sky and trees, occluder tiles redrawn only near paths/objects, sprite caches for guests and trees, opaque canvas: 56–60 fps on a quiet machine |
| 15 | m3 | Contrast failures on research budget sub-labels (muted text on dark buttons) | `.btn .sub` inherits the button colour; decorative swatches are `aria-hidden` |
| 16 | m3 | HUD speed buttons 36 px tall on phones | 44 px minimum on phones |
| 17 | m4 | Blueprint flumes placed beside a path more than one level away showed "No path" | `needEntry` makes the blueprint transaction roll back unless the station connects |
| 18 | m4 | Failed-test coaster window read "undefined seats" | Seats fall back to the track type |
| 19 | m4 | Prebuilt parks had no staff, so every breakdown waited for the contractor (toast spam) | Prebuilt parks start with a mechanic and a groundskeeper |
| 20 | m4 | Mobile HUD wrapped to 3–4 rows depending on numbers and text size; toasts and panels used a fixed `--hud-h` | HUD and dock heights are measured into `--hud-h`/`--dock-h`; fixed mobile row order |
| 21 | m4 | Touch players had no way to rotate a coaster station (R key only) | Build bar in the tip area with ⟳ Rotate and Done |
| 22 | m4 | Winter screenshot showed a season with 0 guests (the dormant 2000 park has no open rides) | Test refurbishes two rides and plays the last two October days |
| 23 | final | Patches of sky showed through the park after a camera move: the cached ground was blitted with the camera offset's sign reversed (found on full-size inspection of the final phone crowd shot) | `mx + Δcamera`; the cache image and screen checked side by side; the final run re-shot |
| 24 | final | 2×2 scenery (Steam Fountain) left its footprint undrawn once ground caching skipped object footprints | Big scenery draws its own base like rides |
| 25 | final | Phone dock labels ran together at 150% text ("TerrainDemolish") | Dock labels capped at 12 px and clipped |
| 26 | final | Autosave only ran at the winter break | Autosave at every month end (saves test checks the slot) |
| 27 | visual m1 | Tree instance colours were multiplied twice (three's instance colour chunk plus ours): a shader compile error | One colour assignment per region in the tree shader |
| 28 | visual m1 | The live-region test read the announcement before its 30 ms timer under software GL | The test waits for the text (up to 4 s) |
| 29 | visual m1 | The perf test's ≥ 55 fps cannot hold for WebGL on SwiftShader (2–4 fps) | 3D test checks script cost per frame and a floor on software GL; GPU fps from `tools/shots3d.mjs --fps`; the 2D fallback keeps ≥ 55 fps |
| 30 | visual m2 | Selected guest hidden behind tall rides | Selected guest drawn again last, without a depth test, as a yellow silhouette (a transparent material did not draw at all; opaque with `renderOrder` 999 does) |
| 31 | visual m2 | Coaster cars upside down: side × tangent gave a downward up vector | Car frame from the track's up vector; side = up × forward |
| 32 | visual m2 | Slide tubes torn at bends (separate prism segments) | One parallel-transport sweep per slide (`Geo.sweep`) |
| 33 | visual m3 | `title` test: hooks ready in 4.6 s because three.js was appended before the page's load event | 3D boot waits for `load` |
| 34 | visual m3 | Checkerboard lawns: per-tile leaf-litter tint | Corner colours averaged across natural tiles |
| 35 | visual m3 | Mobile HUD 185–220 px and 3 rows in October | Fixed two-row mobile HUD, short month, no wrapping chips |
| 36 | visual m3 | A breakdown rebuilt every object mesh (≈ 50 ms hitch) | Broken state left out of the object signature (the pin shows it) |
| 37 | visual m4 | Name boards mirrored when seen from behind | Two single-sided faces back to back |

