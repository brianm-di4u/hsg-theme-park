# Spa City Thrills: adversarial visual review, 3D milestone 3 (m3)

Reviewer stance: independent and hostile. Scores compare the game with the best benchmark in each dimension (10 = on par). The scale matches `REVIEW-before.md` (art 3, lighting 2, animation 2, UI 5, typography 5, readability 4, mobile 4, authenticity 3), `REVIEW-m1.md` (5, 5, 4, 6, 6, 5, 5, 5) and `REVIEW-m2.md` (6, 5, 5, 7, 6, 6, 5, 5).

**Sources reviewed**
- GPU review shots, all 30 opened at full size: `screenshots/review3d-m3/desktop-{title,start,crowd,close,vista,wide,night,dusk,rain,fall,spring,train,palette,guest,coaster}.png` and the 15 matching `mobile-*.png` (780×1688, i.e. 390×844 @2×).
- Crops made with Playwright (`deviceScaleFactor` 2–4 with a clip): the coaster train on the lift (`desktop-train` 600–860,50–230, 3×); the station exit (`desktop-coaster` 500–800,320–440, 4×); the selected guest (`desktop-guest` 560–720,330–440, 4×; `mobile-guest` 300–480,430–560, 4×); the slide tubes (`desktop-train` 360–660,470–735, 3×); the creek (`desktop-spring` 600–1280,130–460, 2×); the flume (`desktop-fall` 690–950,80–230, 3×); the night slides and plaza (`desktop-night` 180–600,180–460, 2×); the plaza crowd (`desktop-crowd` 330–690,280–480, 2×); the ride arrow sign (`desktop-close` 640–860,370–550, 3×); an outcrop (`mobile-start` 400–660,420–590, 3×); the vista and title skies (top 200 px of `desktop-vista` and `desktop-title`); and the concert stage (`v3d-m3/sheets/desktop-06.png` "05-concert", 3×).
- I measured play-area mean brightness (V), mean saturation (S) and mean R−B warmth for all 30 shots (rows 13–85% of the height, to skip the HUD and toolbar).
- Software-render contact sheets (low preset): `v3d-m3/sheets/desktop-01, 03, 04, 05, 06` and `mobile-01, 07` opened. I read `v3d-m3/report.json` for all test names and results.
- Benchmarks opened this pass: `parkitect-1` to `parkitect-6`, `pc2-1`, `pc2-5`, `rct3-1` and `rct3-4`.

**Fair comparison note.** As before, Parkitect's stylised low-poly look (`parkitect-2/4/6`) is the right target for this camera and art direction. Planet Coaster sets the ceiling for lighting and feel, but it is not a realistic target for a browser game.

**Headline.** This was a good bug-fix milestone, but the look has not changed much. The two worst m2 bugs are fixed:
- **The Ridge Runner train now sits upright** on its rails, with seated riders behind seat backs (`desktop-train.png`, `mobile-train.png`).
- **The selected guest now draws as a yellow x-ray silhouette** through the drop tower (`desktop-guest.png`, `mobile-guest.png`).

Several smaller fixes also landed:
- Storms are now properly desaturated: S is 53 in storms against 115 on sunny days.
- Coaster tracks glow at night.
- The slide tubes are closed and smooth.
- The flume has log boats with riders.
- The concert lights sit on a truss.
- The lawns lost their checkerboard.
- The vista now has a ring of distant ridges.

What has not moved is the overall look:
- **The park is still a set of flat shelves joined by vertical walls and stairs.**
- The plazas are still bare concrete, and the stalls are still boxes.
- The creek still kinks on the grid, and the pools are still flat blue slabs.
- There is still no sky during play.
- The golden-hour vista is still murky. It is now oversaturated olive (S 194), not golden.
- The mobile HUD still changes height between states and wraps to three rows in fall, and "Stop following" is still clipped.

The game now has very few bugs that would embarrass it, but the scenes are still sparse.

---

## Score table

| Dimension | Before | m1 | m2 | **m3** | One-line verdict |
|---|---|---|---|---|---|
| Art (models, terrain, scenery) | 3 | 5 | 6 | **6** | The train, the slide tubes, the flume boats and the stage truss are fixed, and natural ground is smooth. Terraces, bare plazas, box stalls, slab-like outcrops and the grid creek remain. Call it 6.4. |
| Lighting and shadows | 2 | 5 | 5 | **6** | The storm grade finally works, the night tracks glow, and the vista has a ridge ring. Golden hour is still broken, there is no sky in play, there is no AO, and sunny frames are washed out. |
| Animation and game feel (from stills) | 2 | 4 | 5 | **6** | Upright seated riders, log boats with riders, fireflies at the concert, and umbrellas. There are still no splashes, waves or lightning. A train sits empty at the station exit. |
| UI | 5 | 6 | 7 | **7** | Unchanged. The painted toolbar is still good. Toasts still stack, the rides list still cuts off, and there are no overlays or minimap. |
| Typography | 5 | 6 | 6 | **6** | Unchanged. The badges read well, and ride signs are still dot-light slabs with no words. |
| Readability (guests, rides, queues, paths, status) | 4 | 5 | 6 | **7** | The selected guest is now always visible, storm and sun read differently at a glance, and night tracks are legible. The carousel and swing queues still blob on the plaza. |
| Mobile | 4 | 5 | 5 | **5** | The compact HUD state is shorter (about 25% chrome). The HUD still changes height and wraps, the sheet still clips its action button, and the vista frames the forest, not the park. |
| Authenticity (Ouachita ridges, Hot Springs) | 3 | 5 | 5 | **5** | The ridge ring around the vista is the first sign in play that the park sits in hills. There is still no sky, no Hot Springs architecture, and the outcrops read as grey concrete slabs. Call it 5.4. |

**Overall: about 6.0 / 10, up from about 5.6.** The gain comes almost entirely from removing embarrassing bugs. The next point has to come from content: terrain shape, set dressing and sky.

### Measured grade (play area only)

| Shot | Conditions | Mean V | Mean S | R−B | Reading |
|---|---|---|---|---|---|
| `desktop-start` / `desktop-spring` | Sunny, April | 146 / 149 | 118 / 115 | 28 / 26 | Baseline daylight |
| `desktop-palette` | Sunny 94°F, July | 169 | 77 | 16 | Washed out, with plazas near white |
| `desktop-crowd` / `desktop-rain` | Storms | 108 / 107 | 53 / 53 | 3 / 3 | **Correctly cool and desaturated** (B2) |
| `desktop-dusk` | Rain, 7:37 pm | 113 | 80 | 21 | A little warmer than the storm frames; acceptable |
| `desktop-vista` / `mobile-vista` | Sunny, 7:49 pm | 60 / 63 | **194 / 189** | 21 / 23 | **Dark and oversaturated olive, not golden** (N3) |
| `desktop-night` | Rain, 9:31 pm | 57 | 49 | 0 | Moonlit, neutral |

---

## Bug status (m1 B1–B16 and m2 N1–N7)

| # | Bug | m3 status | Evidence (m3) |
|---|---|---|---|
| B1 | Selected guest hidden behind the drop tower | **Fixed** | `desktop-guest.png` (~628–650,365–410) and `mobile-guest.png` (~375–400,470–535): a pale-yellow full-body silhouette draws over the tower column, with a ▼ pin above it and a yellow ring at its feet. It is small at desktop zoom (about 10 px tall). |
| B2 | Storms lit like a cloudless noon | **Mostly fixed** | Storm frames now have S 53 against 115 on sunny days, with a cool neutral cast (R−B 3) and no hard shadows (`desktop-crowd`, `desktop-rain`, `desktop-wide`, `mobile-crowd`). What remains: no storm sky (no sky is ever in frame), no lightning, no fog depth and no wet sheen on paving. |
| B3 | Green spike in the wave pool | Fixed (holds) | The island with its tree, boulders and rings is intact (`mobile-fall.png` ~240–560,1290–1440). |
| B4 | Orbs on station roofs | Fixed (holds) | `desktop-night.png`: only canopy bulbs. |
| B5 | Pine through the Ridge Runner station | Fixed (holds) | `desktop-coaster.png`, `mobile-coaster.png` |
| B6 / N1 | Coaster train flipped, with riders hanging under the cars | **Fixed** | `desktop-train.png` (~610–830,55–220): five yellow cars ride on top of the red rails. Each car has two rows of riders seated behind seat backs, heads up. The same holds on `mobile-train.png` (~330–740,225–495) and at the station exit (`desktop-coaster.png` ~530–640,340–400). |
| B7 | Orphan support stubs | Fixed (holds) | |
| B8 | Toast covers "Stop following" | Fixed (holds) | No toast over the sheet. N4 is still open, see below. |
| B9 | Creek is a grid staircase | **Partly** | The bank sawtooth is gone, but the creek is now straight cell-length runs joined by hard 30–45° kinks, with a brown bank strip that breaks at each kink (`desktop-spring.png` ~640–1280,140–440; `mobile-spring.png` ~0–780,280–620; `desktop-wide.png` ~480–1200,240–560). |
| B10 | Log flume dry or empty | **Mostly fixed** | There is a log boat with riders in the trough (`desktop-fall.png` ~905–930,195–212), and water runs the whole length. There is still no drop splash, and boats are rare in frame. |
| B11 | White cubes floating at the amphitheatre | **Fixed (software sheet)** | `v3d-m3/sheets/desktop-06.png` "05-concert": the lamps hang from a black truss over the seating, and the floating white dots are now warm fireflies. It is not covered by the GPU set. |
| B12 | 95°F in October | Fixed (holds) | `desktop-fall.png`: "Sat October 2026, Sunny 76°F" |
| B13 | Checkerboard facets on grass | **Fixed (GPU)** | Lawns in `desktop-start`, `desktop-spring`, `mobile-start` and `mobile-spring` are smooth gradients with soft tree shadows. |
| B14 | Desktop toast stack on the play area | **Partly** | `desktop-crowd.png` and `desktop-close.png` still stack two toasts (10–430,658–722). Other shots show one. There is no count or collapse. |
| B15 | Rides list cuts off the last card with no scroll affordance | **Not fixed** | `desktop-palette.png`: "Swingin' Skiff" is cut at y ≈ 690–720. `mobile-palette.png`: "Bumper Barn" is cut at y ≈ 1370–1430. There is no fade mask and no scrollbar. |
| B16 | Mobile HUD reflows between states | **Not fixed** | `mobile-fall.png` wraps to three rows, with the rating chip alone on row 3 (y ≈ 165–215, so the HUD is 0–220). Even with two rows, the HUD is 185 px tall in `mobile-start`, `crowd`, `close`, `wide`, `night`, `dusk`, `rain` and `vista`, and 220 px in `mobile-guest`, `palette`, `train`, `coaster` and `spring` (row 1 sits at y 63 or y 70). The map jumps by 35 px between states. |
| N2 | Water-slide tubes tear | **Fixed** | `desktop-train.png` (~360–660,470–735): the red, yellow and teal tubes are closed and smoothly shaded, with no slivers. A new related defect, support posts piercing the tubes, is logged as N11. |
| N3 | Golden-hour vista is murky | **Not fixed; arguably worse** | `desktop-vista.png` and `mobile-vista.png` at 7:49 pm: V 60, S 194. The forest floor is a saturated brown-olive, and there is no warm key, no rim light on the canopy and no sky. Compare the pink sky over the whole scene in `rct3-4.jpg` and the red horizon in `pc2-5.jpg`. |
| N4 | "Stop following" clipped by the mobile sheet edge | **Not fixed** | `mobile-guest.png`: the button is cut at y ≈ 1362–1430 by the rounded sheet border. The same class of defect appears on the coaster builder sheet (N14). |
| N5 | 2D fallback spams storm chips | **Fixed** | `v3d-m3/sheets/desktop-03.png` "02-500-guests-2d": only "Broken" chips and queue counts remain. |
| N6 | Rain reads as static | **Partly** | The streaks are now thin, sparse and of varied length (`desktop-crowd.png`, `desktop-night.png`), and no longer look like TV noise. There are still no splash sprites, no puddles and no depth fade. |
| N7 | Coaster track black at night | **Fixed** | `desktop-night.png`: Ridge Runner (~240–470,90–260) and Lumber Run (~820–1280,330–600) glow red, and Little Bear (~820–1140,600–730) glows yellow. The water slides now take over the "black at night" problem (N8). |

**Summary.** Of the 23 tracked items:
- **15 are fixed:** B1, B3, B4, B5, B6/N1, B7, B8, B11, B12, B13, N2, N5 and N7, with B6 and N1 counted as one item.
- **2 are mostly fixed:** B2 and B10.
- **3 are partly fixed:** B9, B14 and N6.
- **4 are not fixed:** B15, B16, N3 and N4.

---

## New bugs found in m3

| # | Bug | Where (file, approx. px) | Likely fix (three.js) | Severity |
|---|---|---|---|---|
| N8 | **Water slides turn into black silhouettes at night.** The tubes are the darkest objects in a lit plaza. | `desktop-night.png` (~280–360,200–350; ~690–790,500–650); `mobile-night.png` (~480–640,1000–1300) | Add the slide material to the night-lift list used for the tracks (N7): `emissive = baseColor * 0.06`, or a 0.15 `emissiveIntensity` ramped by the `LightRig` night factor. Add small LED rings at the tube joints as an option. | Polish, but visible in every night shot |
| N9 | **Novaculite outcrops sit on grey vertical-sided slabs**, which read as concrete plinths or crates, not rock. A grass-topped boulder and a white crystal sit on a flat-topped box with sheer walls. | `mobile-start.png` (~460–620,470–560); `desktop-spring.png` (~560–770,95–210; ~860–990,180–240); `desktop-wide.png` (~400–490,195–240; ~1120–1240,445–505); `desktop-train.png` (~780–1050,310–420) | The cell-extruded base is showing. Replace it with a jittered convex hull (an `IcosahedronGeometry(r,1)` with per-vertex noise, scaled 1.0 × 0.45 × 0.8). Sink it 30% into the terrain, or add a skirt that follows the terrain height. Use a warm grey-tan (#a89f8c) with a moss tint on up-facing normals. Drop the white crystal colour to #d9d4c7 so it stops reading as snow. | Polish (authenticity) |
| N10 | **The Ridge Runner train sits empty at the station exit while 41 guests wait.** Every car has bare black seats. | `desktop-coaster.png` (~530–640,340–400); `mobile-coaster.png` (~180–420,720–850) | If the train is dispatching, riders should already be seated. Check that rider meshes are shown from boarding, not from "left station". If it is an empty test lap, the queue should not board, so show a "Testing" chip. | Polish, but it is in the coaster showcase shot |
| N11 | **Slide support posts pierce the tubes.** White posts run straight through the red and yellow tubes rather than ending under them. | `desktop-train.png` (~480–640,500–740: at least five posts poke through the tube surfaces) | Cut each post at `tubeCentre.y − radius` and add a small saddle or bracket mesh. Alternatively, place posts only at sweep samples whose ground footprint lies outside the tube's XZ projection. | Polish |
| N12 | **The mobile vista frames forest, not the park.** About 85% of the frame is trees, and the park is cut off at the left edge. | `mobile-vista.png` (park at ~0–290,700–1000) | Compute the vista target from the park's built bounding box, not the board centre. Fit the distance by aspect ratio (`dist = radius / tan(fov/2) / min(1, aspect)`). | Polish |
| N13 | **The title sky is flat slate grey** (#5f6675, with no gradient). It reads as overcast behind a summer title. | `desktop-title.png` (0–1280,0–160); `mobile-title.png` (0–780,0–120) | Use the same gradient sky dome proposed for play: horizon #f3d9b0 to zenith #7fa6c9 at title time, with sun-side warmth. | Polish |
| N14 | **The mobile coaster-builder sheet clips its last action row** ("Cancel" is cut by the sheet bottom). | `v3d-m3/sheets/mobile-01.png` "01-building" (~760–830,655–672) | Same fix as N4: a sticky action footer, with `padding-bottom: calc(var(--radius) + env(safe-area-inset-bottom))`. | Polish (mobile) |
| N15 | **A lamp post grows out of a pine on the plaza.** At night the lamp glows from inside a black pine silhouette. | `desktop-night.png` (~440–470,215–300); `desktop-dusk.png` (same spot) | Reject tree placement on cells within 0.6 tiles of path lamps, or cull trees when a path is placed under them. | Polish |
| (test) | The `title [desktop]` test fails because hooks are ready in 4571 ms. This is the only failing test in `v3d-m3/report.json`. | `report.json` | Not visual, but slow first paint hurts the title. Defer forest instancing and the ridge ring until after the lockup paints. | Perf |

---

## 1. Art (models, terrain, scenery): 6/10

**Observations**
- **The broken models are gone.** The train is upright with seated riders (`desktop-train.png`). The slide tubes are closed and smooth. The flume carries a log boat with riders (`desktop-fall.png`). The concert lamps sit on a truss (`sheets/desktop-06.png`). Natural ground is a smooth, soft-shaded slope with no checkerboard (`desktop-start.png` left third, `mobile-start.png`). For the first time, there is no model in the review set that is plainly wrong.
- **The built park is still terraces.** Every level change in `desktop-crowd`, `desktop-fall`, `desktop-rain` and `mobile-crowd` is a flat shelf, a vertical stone wall and a grey stair ramp. In `desktop-train.png` the right half is nothing but stair runs and walls (~720–1280,300–620). Compare `parkitect-4.jpg`, where the hillside (top right) is shaped mass and the park steps down it in readable tiers, or `rct3-1.jpg`, where paths ride the slope.
- **The plazas are still bare.** The central plaza (`desktop-crowd.png` ~330–690,280–480) has benches, two lamps, a mascot and nothing else: no beds, fences, string lights or planters. `parkitect-4.jpg` fills every free cell with flower beds, and `parkitect-6.jpg` fills one frame with string lights, a pergola, stone arches, a fountain and shrubs. The stalls are still coloured boxes with striped awnings (`desktop-close.png` ~0–330,320–380).
- **Water is still paint.** The wave pool is a uniform light-blue slab with a brown wave-machine box (`mobile-coaster.png` ~130–760,1030–1360). The slide landing is a flat blue pad (`desktop-close.png` ~690–950,590–700). The creek is a kinked ribbon (B9). Compare the tiled pool, foam and swimmers in `pc2-1.jpg`.
- **The scenery tells are now outcrops and forest.** The outcrops read as grey slabs (N9), and the forest is still one height and one spacing everywhere (`desktop-vista.png`). The vista ridge ring, however, is real progress (see Authenticity).

## 2. Lighting and shadows: 6/10

**Observations**
- **Weather now changes the light.** Storm frames are desaturated (S 53), cool and shadowless, and the umbrella crowd reads as a wet afternoon (`desktop-crowd.png`, `mobile-rain.png`). The dusk-rain frame (`desktop-dusk.png`, S 80, R−B 21) is distinguishably warmer than the 4 pm storm. This is the m2 gap 3 storm half, done.
- **Night is still the best state, and better than before.** The coaster tracks glow (N7 fixed), canopy bulb strings and drop-tower chasers are emissive, lamp halos bloom on wet paving, and the moonlit ambient stays legible (`desktop-night.png`). The faults are the black water slides (N8), dark flat pools with no underlights (`desktop-night.png` ~50–270,340–470; compare `pc2-5.jpg`), and the lamp inside a pine (N15).
- **Golden hour is still broken** (N3). At 7:49 pm the vista is V 60 and S 194, darker than dusk rain and more saturated than noon. The ground under the forest turns a muddy brown-olive. That looks like a colour-grading error, not a sunset.
- **There is no sky in play, no AO, and sunny frames are washed out.** `desktop-palette.png` (V 169, S 77) has near-white plazas and pale grass, so it is flatter than the April shots. Stall bases, wall feet and ride plinths meet the ground with no contact darkening (`desktop-close.png`).

## 3. Animation and game feel (from stills): 6/10

**Observations**
- **The hero ride is now a hero shot.** In `desktop-train.png` the five-car train climbs the lift with ten visible riders, varied hair and shirt colours, and seat backs. It is close to the riders in `parkitect-2.jpg` at this zoom, and it was a blooper in m2.
- **There is more life:** log boats with riders, fireflies over the amphitheatre (`sheets/desktop-06.png`), umbrellas in every rain state, riders on every flat ride, a swimmer in the wave pool, and the steam vent.
- **Water still has no motion cues.** There are no splashes at slide exits or the flume drop, no waves, and no foam. The rain still has no splash or puddle. Storms have no lightning.
- **There is a dead train at the station exit** (N10).

## 4. UI: 7/10

**Observations**
- The painted toolbar icon set, the honest "+N in line" badges and the restrained "Broken"-only status pins all hold up well (`desktop-palette.png`, `desktop-guest.png`).
- Nothing new: the rides list still cuts off its last card (B15), toasts still stack two-high on the play area (B14), and there are still no overlays, heatmaps or minimap (compare `parkitect-5.jpg`, with zone tint and labels, and `parkitect-3.jpg`, with staff pins and a ride-state overlay).
- The Guest panel still has no portrait or mini-view, even though the x-ray silhouette makes one easy (render the followed guest to a small `WebGLRenderTarget`).

## 5. Typography: 6/10

**Observations**
- The display and body pairing, the HUD, the panel small caps and the badges are all still good. The mobile type remains large and clean (`mobile-guest.png`).
- **In-world type is still blank.** The ride arrow sign is a cream board with seven red dots (`desktop-close.png` ~670–735,395–410, confirmed at 3×; `mobile-close.png` ~450–580,830–870). The swing and bumper-barn boards still show dot lights and no words. Only the gate board carries a name.
- The mobile HUD wrap in fall (B16) still reads as a layout fault.

## 6. Readability (guests, rides, queues, paths, status): 7/10

**Observations**
- **Following a guest now works.** The x-ray silhouette, pin and ring make the subject findable through any occluder (`desktop-guest.png`, `mobile-guest.png`). At desktop strategy zoom the figure is about 10 px tall. It would read better with a 2 px dark outline and a slightly more saturated yellow.
- **Weather states are readable at a glance.** The storm grade and the umbrella crowd make "storm" obvious without reading the HUD chip. Night tracks now trace each coaster's layout.
- **Queues are still half-solved.** The coaster and slide queues have brick paving, ropes and badges (`desktop-coaster.png`, `mobile-coaster.png`). The carousel and swing queues still spill as umbrella blobs across plaza concrete (`desktop-crowd.png` ~330–690,350–520), so you cannot tell queuers from walkers.

## 7. Mobile: 5/10

**Observations**
- **The compact HUD state is better.** Two rows end at y 185 (11%), and with the toolbar at 1445–1688 (14.4%) the chrome is about 25% (`mobile-crowd.png`, `mobile-night.png`). The icons and touch targets remain large and crisp.
- **The HUD is still not stable.** Its height is 185 in one set of shots and 220 in another, and it wraps to three rows in fall (B16).
- **The sheets still cover about 52%** (`mobile-guest.png`, `mobile-palette.png`, 555–1430), with no peek state. The guest sheet clips "Stop following" (N4), and the coaster builder clips "Cancel" (N14). The rides list cuts off with no affordance (B15).
- **The selection stays visible above the sheet** (`mobile-guest.png` ~375–400,470–535), which is a real fix.
- The vista misframes the park (N12). A persistent toast sits over the bottom of the map in `mobile-crowd`, `mobile-close`, `mobile-wide`, `mobile-vista` and `mobile-coaster` (1365–1425).

## 8. Authenticity (forested Ouachita ridges, Hot Springs, Arkansas): 5/10

**Observations**
- **The ridges have finally reached the play camera.** The top 20% of `desktop-vista.png` is a ring of long, forested ridgelines with pale crest highlights, which is exactly the Ouachita read. But it fills to the top edge with no sky, so it looks like a wall, not a horizon. Compare `pc2-5.jpg` and `rct3-1.jpg`, where ridges sit against a lit sky.
- **The seasons and climate remain right:** redbud and dogwood in April (`desktop-spring.png`), orange and red hardwoods in October at 76°F (`desktop-fall.png`), and 94°F in July.
- **The park itself is still generic.** Hot Springs is represented only by the stone retaining walls, the steam vent and the Lookout Tower. There are no CCC-style stone and timber pavilions, no bathhouse-row facades and no thermal fountain. The outcrops now read as concrete slabs (N9), which undercuts the one geological signature the area has.

---

## Ranked gap list (most important first)

**Major** gaps decide the score ceiling and how the game reads in a screenshot. **Polish** gaps are visible but local.

| # | Gap | Class | Why it matters | Concrete fix (three.js / WebGL, small team) |
|---|---|---|---|---|
| 1 | **Terraced built terrain, vertical walls and the grid creek (B9)** | **Major** | It is in every gameplay frame and contradicts "hillside park". It is now the single largest visual deficit. | Keep the cell heightfield for the sim, but render a smoothed display mesh: four subdivisions per cell, with heights bilinearly interpolated from cell corners and `computeVertexNormals()` over welded vertices. Where a terrace edge has no path or building within one cell, replace the wall with a 1:1.5 embankment (lerp the lower cell's edge vertices up). Keep stone walls only where a structure forces a sheer drop. Build the creek as a `CatmullRomCurve3` through cell centres (tension 0.5), swept as a ribbon 0.7 cells wide, with bank vertices lowered 0.15 and a soft-edged brown bank decal. |
| 2 | **Time-of-day grade and sky during play (N3, N13)** | **Major** | The golden hour is the free beauty shot, and it is the worst-graded frame in the set. A frame with no sky reads as a diorama. | Add a gradient sky dome (`SphereGeometry` with `side: BackSide`, `depthWrite: false`, a shader lerping horizon to zenith with a sun-direction warm lobe) driven by the `LightRig`. At sun elevation under 12°: sun #ffb070 at 1.4×, hemisphere sky #ffc9a0 and ground #4a3a2a, and fog to warm peach. **Clamp saturation in the grade pass** (target S ≤ 120) and raise exposure +0.3 EV. Tilt the camera 5–8° up at far zoom so 10–15% of the frame is sky over the ridge ring. Add a storm variant (dark slate dome, an 8–20 s lightning flash). |
| 3 | **Bare plazas, box stalls and no Hot Springs architecture** | **Major** | Density makes `parkitect-4/6` look finished. Place-specific buildings are the authenticity goal. | Build an instanced prop kit: flower beds (three colours), low stone walls, planters, bins, shade trees in grates, picnic tables, and string lights strung between lamps as `TubeGeometry` sag curves with instanced bulbs. Auto-dress free plaza cells and path edges, with a toggle. Give plazas warm stone pavers distinct from path concrete. Add facade skins over the stall and station boxes: CCC-style native-stone piers with timber-truss roofs for coaster stations, bathhouse-style stucco fronts with arched windows and tile roofs for shops (fictional names), and a thermal fountain around the steam vent. |
| 4 | **Mobile layout stability (B16, N4, N14, B15) and sheet coverage** | **Major (mobile)** | Mobile is a stated target. The HUD jumps 35 px, and two sheets clip their primary action. | Use a fixed HUD grid (`grid-template-columns: auto repeat(4, minmax(0,1fr))`, `white-space: nowrap`, tabular numbers, weather as an icon only) so nothing wraps. Fix the HUD height with a CSS variable. Give sheets a sticky action footer with safe-area padding, three snap states (peek 22%, half 45%, full) and a drag handle. Add a scrollbar gutter and a fade mask to long lists. Collapse toasts into an "N new" chip. |
| 5 | **Water surfaces and water motion** | **Major** | Pools, the creek and slides fill a large share of frames, read as flat paint, and are where `pc2-1` is strongest. | Use one `MeshStandardMaterial` with `onBeforeCompile`: two scrolling normal maps, Fresnel toward the sky colour, a tile-grid albedo for pools, and edge foam from a distance-to-edge attribute. Add a vertex sine swell to the wave pool. Add a 120-particle splash burst (`Points` with an additive sprite) at slide exits and the flume drop, triggered by vehicle arrival. At night, give the pool floor 0.3 emissive cyan (the underlight look of `pc2-5`) and fix the black slides (N8). |
| 6 | **Flat, washed-out daylight tone and no AO** | Polish (high value) | Every sunny frame benefits. `desktop-palette` has near-white plazas. | Switch to `AgXToneMapping` and tune exposure so plaza concrete sits at about 80–85% luminance. Add N8AO or SAO at half resolution on the high preset, with baked vertex AO at wall feet and ride plinths on low and mobile. Add a light vignette. |
| 7 | **Outcrops as slabs (N9) and a uniform forest** | Polish (authenticity) | The outcrops are the region's geological signature, and the forest is a third of every frame. | Use jittered-hull outcrops sunk into the terrain, in warm grey with moss. For the forest: 0.7–1.4× scale and ±6° lean jitter, species clusters (pine stands, hardwood draws along the creek), occasional clearings, and an instanced understorey of shrubs and ferns. |
| 8 | **Illegible ride signs** | Polish | This is the main typography deficit left. | Render each ride's name to a `CanvasTexture` (display face, 128 px tall, cream on navy) mapped on the sign board, using `anisotropy = renderer.capabilities.getMaxAnisotropy()`. Fade in a CSS2D label at close zoom for small boards. |
| 9 | **Small ride-life defects (N10, N11, N15) and the queue blob** | Polish | These are local tells in otherwise good shots. | Show riders from boarding onward. Trim slide posts to the tube underside and add brackets. Keep trees off lamp cells. Roll the brick queue paving and rope posts out to every flat-ride queue, and route queues as switchbacks inside a fenced pen rather than across plaza cells. |
| 10 | **No overlays, minimap or guest mini-view; toast stack (B14)** | Polish (UI depth) | This is what moves UI from 7 to 8. | Add a heatmap overlay: a ground-plane `DataTexture` of happiness, litter or crowding, blended in the terrain shader. Add a minimap as a top-down orthographic render to a 256² target every 2 s. Add a guest portrait from a 96² render target following the selected guest. Stack toasts with a count and auto-collapse after 4 s. |

**Major versus polish in one line:** four of the top five gaps (terrain, sky and grade, set dressing and architecture, water) are content and rendering work that sets the ceiling, and mobile layout is the fifth major item. Everything from 6 down is polish that adds about half a point each but will not change how the game reads in a screenshot.

---

## What must be kept

1. **The upright, seated coaster riders** and the train model (`desktop-train.png`). Do not touch the new car frame code except to add the boarding fix (N10).
2. **The x-ray selected-guest silhouette, with its pin and ring** (`desktop-guest.png`, `mobile-guest.png`). Add an outline, but keep the approach.
3. **The storm grade** (desaturated, cool and shadowless), and the **umbrellas in rain**. Build the sky and lightning on top of them.
4. **The glowing night coaster tracks,** the canopy bulb strings, the drop-tower chaser and the blooming lamp halos (`desktop-night.png`).
5. **The smooth natural ground** with no checkerboard (`desktop-start.png`). The terrain rework in gap 1 must preserve it.
6. **The ridge ring around the vista.** Put a sky behind it rather than replacing it.
7. **The flume log boats with riders, the closed slide tubes and the concert truss with fireflies.**
8. **The painted toolbar icon set,** the "+N in line" badges, the red-brick queue paving, the restrained "Broken"-only pins, and the 2D fallback's matching chip rules.
9. **The stone retaining walls** as a material, the **Lumber Run trestle**, the **wave-pool island** and the **flat-ride models** with riders.
10. **The seasonal forest and climate-correct HUD** (76°F in October), the **title lockup over the ridges**, the **panel information design**, the **history album and fictional-park disclaimer**, and the **large accessible mobile type** with the text-size option.
