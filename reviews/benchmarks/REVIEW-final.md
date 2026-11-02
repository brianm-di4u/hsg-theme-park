# Spa City Thrills: adversarial visual review, FINAL (end of the 3D visual campaign)

Reviewer stance: independent and hostile. Scores compare the game with the best benchmark in each dimension (10 = on par). The scale matches `REVIEW-before.md` (art 3, lighting 2, animation 2, UI 5, typography 5, readability 4, mobile 4, authenticity 3) and `REVIEW-m4.md` (6, 6, 6, 7, 7, 7, 6, 5).

**Sources reviewed**
- GPU review shots, all 30 opened at full size: `screenshots/review3d-final/desktop-{title,start,crowd,close,vista,wide,night,dusk,rain,fall,spring,train,palette,guest,coaster}.png` (1280×800) and the 15 matching `mobile-*.png` (780×1688, i.e. 390×844 @2×).
- Crops made with Playwright (`deviceScaleFactor` 2–4 with a clip), each final crop paired with the same clip from `review3d-m4/`:
  - vista sky and ridges (`desktop-vista` 0–1280,50–330, 2×) and park (340–840,260–460, 3×); title sky (`desktop-title` 0–640,0–220, 2×); dusk (`desktop-dusk` 0–1280,50–330, 2×);
  - outcrops (`desktop-close` 360–620,60–220, 4×; `mobile-rain` 150–360,580–760, 3×; `desktop-train` 770–1070,290–430, 3×; `desktop-wide` 1080–1270,420–540, 4×);
  - slides by day and night (`desktop-close` 680–960,500–730, 3×; `desktop-train` 360–660,470–735, 3×; `desktop-night` 280–370,230–460 and 680–800,480–660, 4×);
  - pools (`desktop-night` 40–280,340–470, 3×; `desktop-coaster` 490–880,490–720, 2×);
  - the coaster station (`desktop-coaster` 520–760,330–420, 4×; `mobile-coaster` 160–600,700–880, 2×) and the night Little Bear station (`desktop-night` 780–960,560–660, 4×);
  - signs (`desktop-close` 640–760,370–430, 4×; `desktop-night` 520–720,500–620, 4×); the lamp-in-pine (`desktop-night` 410–500,190–320, 4×; `mobile-night` 0–180,470–700, 3×);
  - plaza (`desktop-crowd` 200–560,330–520 and 330–690,280–480, 3×; `desktop-close` 0–420,180–420, 3×); the selected guest (`desktop-guest` 580–700,340–430, 4×);
  - toasts (`desktop-{crowd,close,vista,wide}` 0–450,620–730, 2–3×); list and sheet ends (`desktop-palette` 935–1270,600–730, 3×; `mobile-palette` 0–780,500–1450; `mobile-guest` 0–780,1280–1450, 2×).
- **A pixel diff of every final shot against its m4 twin** (threshold ΣRGB > 40, with red change maps for close, night, coaster, train, crowd, title and mobile-guest). Outside the vista (83% / 70% changed) and dusk (71% / 61%), every shot changed by only **0.4–4.4%**, which is mostly rain streaks, moving guests and shadow jitter. The real changes are listed in the headline.
- Play-area grade (V, S, R−B; rows 13–85% of the height) for all 30 shots, the same method as m3 and m4.
- Supporting software-render shots: `screenshots/v3d-m4/mobile/01-building.png` (coaster builder sheet, 09:03, same build window) and `screenshots/visual-final/desktop/05-concert.png` (amphitheatre, final).
- Benchmarks opened this pass: `parkitect-1` to `parkitect-6`, `pc2-1`, `pc2-5`, `rct3-1` and `rct3-4`.

**Fair comparison note.** Parkitect's stylised low-poly look (`parkitect-2/4/6`) is the right target for this camera. Planet Coaster (`pc2-1`, `pc2-5`) is the ceiling for lighting, water and feel; RCT3 (`rct3-1`, `rct3-4`) is the reference for warm low-sun haze.

**Headline.** The final milestone was another targeted fix pass. The diff shows these changes and nothing else:
1. **Golden hour is finally warm.** `desktop-vista` R−B 15 → **40**, V 68 → **109**, S 136 → 134; `mobile-vista` R−B 18 → 42, V 73 → 115. It is now the warmest frame in the set, as it should be (N3 mostly fixed).
2. **Dusk is lifted:** `desktop-dusk` V 121 → 139, R−B 17 → 23, with a warm haze on the left edge.
3. **Pools have a tile grid and the diagonal seam is gone** (N16 fixed): `desktop-night` 40–280,340–470 and `desktop-coaster` 490–880,490–720 show an even grid with no corner-to-corner band.
4. **Coaster cars no longer interpenetrate** (N20 fixed): `desktop-coaster` 520–760,330–420 at 4× shows five separate cars with a visible gap at every joint; in m4 cars 3 and 4 merged into a V.
5. **The desktop toast stack is down to one toast** in `desktop-crowd`, `desktop-close`, `desktop-vista` and `desktop-wide` (B14 partly fixed).
6. **Outcrop pads went translucent** instead of being removed (N9 still partly fixed, now N21).
7. **One shade tree was added to the central plaza** (`desktop-crowd` about 430–470,450–490; `desktop-close` 230–300,330–380). That is the whole of the set-dressing pass.

What did not change at all, now for three milestones: the terraced terrain and stair runs, the kinked grid creek, the bare plazas and box stalls, the empty train at the station, the unsupported slide tubes, the flat night slides, the dark night signs, the lamp growing out of a pine, the clipped "Stop following", the cut rides list, the flat slate title sky and the washed-out July noon (V 168, S 78, unchanged to the digit).

---

## Score table

| Dimension | Before | m4 | **Final** | One-line verdict |
|---|---|---|---|---|
| Art (models, terrain, scenery) | 3 | 6 | **6** | Pool tiles and a single plaza tree are the only content added. Terraces, the grid creek, box stalls, floating slide tubes and the outcrop pads are all still there. Call it 6.4. |
| Lighting and shadows | 2 | 6 | **6** | The vista is warm at last, and dusk is brighter. But the title sky is still flat slate, July noon is still washed out, there is still no AO, and the vista sky is still a flat peach card with no sun. Call it 6.7: close to 7, but not there. |
| Animation and game feel (from stills) | 2 | 6 | **6** | Car spacing is fixed. There are still no splashes, waves or lightning, and the showcase train still sits at the station with every seat empty. |
| UI | 5 | 7 | **7** | Only one toast now, which is good. The rides list still cuts off, and there is still no overlay, minimap or guest mini-view. |
| Typography | 5 | 7 | **7** | Unchanged. The day ride boards are good. The arrow sign is still seven red dots, and the boards are still unreadable at night. |
| Readability (guests, rides, queues, paths, status) | 4 | 7 | **7** | Unchanged. The signs carry it. The queue blobs and the small, unoutlined selected guest remain. |
| Mobile | 4 | 6 | **6** | The HUD is still stable. The sheets were not touched: "Stop following" is clipped, "Bumper Barn" is cut off, and the builder's last button is cut off. A toast still sits over the map in five shots. |
| Authenticity (Ouachita ridges, Hot Springs) | 3 | 5 | **5** | The warm vista is the best place image the game has made. But the novaculite is still on pads, and there is still no Hot Springs architecture. Call it 5.7. |

**Overall: about 6.4 / 10, up from about 6.3 at m4 and about 3.5 before.** The 3D switch delivered roughly three points. The last two milestones added about 0.4 between them, all from cheap and correct fixes (signs, HUD, grade, seam, car spacing). The three content gaps named in m3 (terrain shape, set dressing and architecture, water) shipped untouched. They are the reason the game ends below 6.5.

### Measured grade (play area only)

| Shot | Conditions | Final (V / S / R−B) | m4 (V / S / R−B) | Reading |
|---|---|---|---|---|
| `desktop-start` / `desktop-spring` | Sunny, April | 144 / 119 / 28; 148 / 117 / 26 | 144 / 119 / 28; 148 / 116 / 26 | Unchanged baseline |
| `desktop-palette` | Sunny 94°F, July | **168 / 78 / 16** | 168 / 78 / 16 | **Still washed out**, near-white plazas |
| `desktop-fall` | Sunny, October | 147 / 96 / 34 | 147 / 96 / 34 | Unchanged |
| `desktop-crowd` / `desktop-rain` | Storms | 106 / 54 / 3; 106 / 54 / 3 | 107 / 53 / 3; 106 / 54 / 3 | The storm grade holds |
| `desktop-dusk` | Rain, 7:37 pm | **139 / 62 / 23** | 121 / 62 / 17 | Brighter and slightly warmer |
| `desktop-vista` / `mobile-vista` | Sunny, 7:49 pm | **109 / 134 / 40; 115 / 128 / 42** | 68 / 136 / 15; 73 / 130 / 18 | **Warm, and the m4 targets were met** (V ≥ 95, R−B ≥ 40); S is 4 over the 130 cap on desktop |
| `desktop-night` | Rain, 9:31 pm | 58 / 51 / 0 | 59 / 51 / 0 | Unchanged |
| `desktop-title` / `mobile-title` | Title | 106 / 103 / 8; 144 / 90 / 17 | (diff 1.1% / 1.9%) | The title's slate sky is untouched |

---

## Bug status (everything open after m4)

| # | Bug | Final status | Evidence (final) |
|---|---|---|---|
| B9 | Creek is a grid staircase | **Not fixed** | `desktop-spring` 600–1280,130–460 at 2×: straight cell runs, 30–45° kinks and brown vertical bank walls that break at every kink. The diff against m4 is 1.1%. |
| B14 | Desktop toast stack on the play area | **Partly fixed** | There is now one toast at 10–430,690–725 in `desktop-crowd`, `desktop-close`, `desktop-vista` and `desktop-wide`, and `visual-final/desktop/05-concert` also shows one. There is still no count or collapse chip, and the toast still covers the play area. |
| B15 | Rides list cuts off the last card with no affordance | **Not fixed** | `desktop-palette` 945–1245,690–722: "Swingin' Skiff" and "$18,000" are cut by the panel border. `mobile-palette` 40–735,1370–1428: "Bumper Barn" and "$11,000" are cut the same way. There is no fade and no scrollbar. |
| N3 | Golden-hour vista is murky | **Mostly fixed** | R−B 40/42, V 109/115. The forest floor is now ochre-gold. Two problems remain: the sky is the same flat peach card (about #e6d5c6) with no sun disc or gradient (`desktop-vista` 0–1280,50–200), and the floor reads mustard rather than haze-lit. Compare `rct3-1`, where the low sun lifts the greens and pinks the horizon. |
| N4 | "Stop following" clipped by the mobile sheet edge | **Not fixed** | `mobile-guest` 36–292,1362–1428: the button's lower half is still cut by the rounded border under a scroll shadow. The sheet region is identical to m4. |
| N6 | Rain reads as static | **Not fixed** (partly fixed since m3) | The streaks are sparse and thin. There are no splash rings, puddles or depth fade (`desktop-crowd`, `desktop-close`). |
| N9 | Outcrops sit on grey pads | **Partly fixed** (it changed form) | The pads are now **semi-transparent** pale quads with hard straight edges, and the rock hulls show through as brown-olive blobs (`mobile-rain` 150–360,580–760; `desktop-close` 460–940,350–580 at 4×; `desktop-wide` 1100–1250,440–510). See N21. |
| N10 | Train sits empty at the station exit while guests wait | **Not fixed** | `desktop-coaster` 520–760,330–420 at 4×: five cars with every seat bare black beside "+41 in line". `mobile-coaster` 160–600,700–880 is the same. The night Little Bear train is empty too (`desktop-night` 780–960,560–660). |
| N12 | Mobile vista frames forest, not the park | **Mostly fixed** (unchanged) | The park sits at y 590–960 with ridges and sky above. About 30% of the bottom is foreground canopy, and a toast covers 1365–1425. |
| N13 | Title sky is flat slate grey | **Not fixed** | `desktop-title` 0–640,0–220 at 2× is a flat blue-grey (about #5f6675). `mobile-title` is the same. The diff is 1.1%. |
| N14 | Mobile coaster-builder sheet clips its last button | **Not fixed** (software evidence) | `v3d-m4/mobile/01-building.png` 36–175,1405–1428: a red button (Cancel) shows only its top 20 px under the scroll shadow. There is no GPU builder shot in the final set. |
| N15 | Lamp post grows out of a pine | **Not fixed** | `desktop-night` 440–470,215–300 at 4×: the lamp glows from inside a black pine. It is the same in `desktop-dusk` 430–480,200–310 and `mobile-night` 0–180,470–700. |
| N16 | Diagonal highlight seam across every pool | **Fixed** | `desktop-night` 40–280,340–470 at 3× and `desktop-coaster` 490–880,490–720 at 2×: there is an even tile grid and no diagonal band. |
| N17 | Night slides are flat, unshaded pastel ribbons | **Not fixed** | `desktop-night` 280–370,230–460 at 4× is pixel-equivalent to m4: flat red, yellow and teal ribbons with no shading. |
| N18 | Slide tubes unsupported, with open run-outs | **Not fixed** | `desktop-train` 360–660,470–735 and `desktop-close` 680–960,500–730 match m4. No posts, no start ring, and the C-section ends hover over the pool with no splash. |
| N19 | Ride signs unreadable at night | **Not fixed** | `desktop-night` 520–720,500–620 at 4× matches m4: grey slabs with illegible text. |
| N20 | Coaster cars interpenetrate on the station curve | **Fixed** | `desktop-coaster` 520–760,330–420 at 4× and `mobile-coaster` 160–600,700–880: there is a clean gap between every car. |

**Summary of the 17 items open after m4:**
- **2 fixed:** N16 and N20.
- **1 mostly fixed:** N3.
- **2 partly fixed:** B14 and N9. N9 changed form.
- **1 mostly fixed and unchanged since m4:** N12.
- **11 not fixed:** B9, B15, N4, N6, N10, N13, N14, N15, N17, N18 and N19.

The amphitheatre (B11, unverified at m4) is present and reads correctly in `visual-final/desktop/05-concert.png`: raked red seats, a stage shell with bulb strings and a crowd at the stage. Treat it as closed.

---

## New bugs found in the final pass

| # | Bug | Where (file, approx. px) | Likely fix (three.js) | Severity |
|---|---|---|---|---|
| N21 | **Outcrop aprons are translucent ghost quads.** Making the pad transparent rather than deleting it leaves a hard-edged, pale, glassy rhombus on the grass. The rock's buried lower hull shows through it as a brown-olive blob, so the rock looks encased in a display case. | `mobile-rain` 150–360,580–760 at 3×; `desktop-close` 460–620,170–220 at 4×; `desktop-wide` 1100–1250,440–510 at 4×; `desktop-train` 770–1070,290–430 (pale quads around both rocks) | Delete the pad mesh outright. If the pad was hiding a terrain hole, fill it in the heightfield. Sink the hulls 30% into the terrain, set `depthWrite: true` and `transparent: false` on the rock material, and blend the contact with a soft terrain-shader darkening by distance to the outcrop centre. | Polish, but it is in 8 of the 13 daytime in-game shots |
| N22 | **The vista's warm grade is carried by the ground, not the light.** The forest floor turns mustard-ochre (about #b09048) while the canopy stays mid-green and the sky stays a flat peach card, so it reads as "dry grass", not "low sun". | `desktop-vista` 0–1280,330–730; `mobile-vista` 0–780,600–1440 | Warm the light, not the albedo: sun #ffa860 with a rim on canopy tops (`pow(1−N·V,3)×golden`), hemisphere ground #6a5032 at a lower intensity, and a sky dome gradient visible in frame (tilt the far camera 4–6° up). Pull the floor back toward olive. | Polish |

---

## 1. Art (models, terrain, scenery): 6/10

**Observations**
- **The only content added is pool tiles and one plaza tree.** The tile grid (`desktop-coaster` 490–880,490–720) is a real improvement: pools now read as built objects, not paint. The single shade tree in the central plaza (`desktop-crowd` 430–470,450–490) is a gesture. Compare `parkitect-4.jpg`, where every free cell is a flower bed, and `parkitect-6.jpg`, with string lights, a pergola, arches, a fountain with spray and benches in one frame.
- **The terrain is unchanged for the third milestone running.** `desktop-crowd` 700–1280,180–460 still shows flat grass shelves, low stone walls and long grey stair runs. `desktop-dusk` shows it best: the whole park is a staircase of level pads. `parkitect-4.jpg` and `rct3-1.jpg` put rides on shaped slopes.
- **The creek is still a cell-stepped trench** (`desktop-spring` 600–1280,130–460).
- **The slide tower is still broken as an object** (N18): three tubes hang from the top deck with no posts, and the run-outs are open C-sections (`desktop-close` 680–960,500–730).
- **The hero assets still hold:** the five-car Ridge Screamer with seated riders on the lift (`desktop-train` 600–860,50–230), the Lumber Run trestle, the flume log boats, the drop tower, the wave-pool island, and the amphitheatre (`visual-final/desktop/05-concert`).

## 2. Lighting and shadows: 6/10

**Observations**
- **The vista grade is the biggest change in the milestone, and it is real.** R−B rose from 15 to 40 and V from 68 to 109, so golden hour is no longer the coldest sunny frame. But the warmth sits in the ground colour (N22): the sky band is the same flat peach as m4 (`desktop-vista` 0–1280,50–200), there is no sun disc, glow or gradient, and the canopy has no warm rim. `rct3-1.jpg` and `pc2-5.jpg` show the sky doing the work.
- **Dusk is brighter** (V 139) and has a warm haze at the left edge (`desktop-dusk` 0–120,330–520). It is still mostly a grey rain grade.
- **The rest is unchanged.** July noon is still V 168, S 78 with near-white plazas (`desktop-palette`). There is still no AO or contact darkening at stall bases, wall feet or plinths (`desktop-close`). The title sky is still slate (N13). Night still has flat slides (N17), dark signs (N19) and the lamp in a pine (N15).
- **Night pools are now the best-lit water in the game:** cyan, with a tile grid and no seam (`desktop-night` 40–280,340–470). It is a fair echo of the underlight read in `pc2-5.jpg`.

## 3. Animation and game feel (from stills): 6/10

**Observations**
- **Car spacing is fixed** (N20). The coaster train now reads as a train of linked cars.
- **It is still a dead train in the showcase shot** (N10). Every seat is empty beside "+41 in line" (`desktop-coaster`, `mobile-coaster`). The night Little Bear train is empty too.
- **There are still no water cues anywhere:** no splash at slide run-outs or the flume drop, no ripple rings and no foam. Storms still have no lightning, and rain has no splash rings (N6). Compare the spray and splash in `parkitect-6.jpg` and the swimmers in `pc2-1.jpg`.
- **What moves is still good:** the lift train with riders, flume riders, flat-ride riders, umbrellas in rain, the steam vent and the concert crowd.

## 4. UI: 7/10

**Observations**
- **One toast at a time now** (B14 partly). That stops the stack, but there is no "N new" chip, and the toast still covers the play area on desktop and the map on mobile.
- **The rides list still cuts off its last card** with no fade or scrollbar (B15; `desktop-palette` 945–1245,690–722).
- **There are still no overlays, zone tints, staff pins, minimap or guest portrait.** `desktop-guest` 935–1270,515–720 is still empty cream. Compare `parkitect-5.jpg` (zone tint and labels) and `parkitect-3.jpg` (staff pins).
- **Kept strengths:** the painted toolbar icons, the "+N in line" badges, the restrained "Broken" pin and the panel information design.

## 5. Typography: 7/10

**Observations**
- **The day ride boards remain the type win of the campaign:** "RIDGE SCREAMER", "DOGWOOD SWINGS", "SPIN CUPS" and "LOOKOUT TOWER" are crisp and correctly set (`desktop-close` 0–420,180–420 at 3×; `mobile-coaster` 680–850,0–80).
- **There are two leftovers from m4.** The arrow sign is still a board with seven red dots (`desktop-close` 640–760,370–430 at 4×). The boards are illegible at night (N19).
- The HUD, panel and title type are unchanged and good. The title lockup over the ridges is strong; only its sky lets it down.

## 6. Readability (guests, rides, queues, paths, status): 7/10

**Observations**
- **Rides are identifiable at a glance by day,** but not at night (N19).
- **The selected guest is unchanged:** a pale-yellow x-ray figure about 10 px tall, with a ▼ pin and a ring, and no outline (`desktop-guest` 580–700,340–430 at 4×). It sits against a cream tower and is easy to lose.
- **The queue blobs are unchanged:** the swings, cups and carousel queues are undifferentiated umbrella masses across concrete (`desktop-crowd` 330–690,280–480). Only the coaster and slide queues have brick paving and ropes.

## 7. Mobile: 6/10

**Observations**
- **The HUD is still the mobile success:** two fixed rows ending at y ≈ 192 in every state, icon weather, and large touch targets.
- **The sheets were not touched.** "Stop following" is clipped (N4, `mobile-guest` 36–292,1362–1428). "Bumper Barn" and "$11,000" are cut (B15, `mobile-palette` 40–735,1370–1428). The builder's last button is cut (N14, `v3d-m4/mobile/01-building` 36–175,1405–1428). That makes three sheets whose bottom action is hidden. The sheets still cover about 52% of the screen with no peek state.
- **A toast still covers the bottom of the map** (1365–1425) in `mobile-crowd`, `mobile-close`, `mobile-wide`, `mobile-vista` and `mobile-coaster`.
- **The warm mobile vista** (R−B 42) is the best phone frame in the set.

## 8. Authenticity (forested Ouachita ridges, Hot Springs, Arkansas): 5/10

**Observations**
- **The vista is now a warm-lit park in a bowl of continuous pine and hardwood under long ridgelines** (`desktop-vista`, `mobile-vista`). That is the Ouachita postcard the game has been aiming at, though the mustard floor (N22) undercuts it.
- **The seasons and climate remain right:** redbud and dogwood in April, orange hardwoods in October at 76°F, and 94°F in July.
- **The geology is still wrong.** The novaculite outcrops are white faceted hulls on translucent pads (N21). Real novaculite is tilted, layered, off-white ledges breaking out of a forested slope.
- **There is still no Hot Springs architecture:** no CCC-style stone and timber shelters, no bathhouse-row stucco and tile, and no thermal fountain at the steam vent (`desktop-crowd` 420–620,330–400 is still a bare concrete cone). Place cues are limited to names: "Novaculite Drop", "Ouachita Hills Fun Park", "Dogwood Swings" and "Crystal Hill Choir".

---

## Remaining gaps (named known gaps at ship)

**MAJOR** gaps decide the score ceiling and how the game reads in a screenshot. **POLISH** gaps are visible but local.

| # | Gap | Class | Why it matters | Concrete fix (three.js / WebGL, small team) |
|---|---|---|---|---|
| G1 | **Terraced built terrain, vertical walls and the grid creek (B9)** | **MAJOR** | It is in every gameplay frame and contradicts "hillside park". It has been the largest single deficit for three milestones. | Render a display mesh at four subdivisions per sim cell with bilinear corner heights and welded normals. Use 1:1.5 embankments where no path or structure sits at a level change, and keep stone walls only under paths and buildings. Build the creek as a `CatmullRomCurve3` ribbon with lowered bank vertices and a shader bank blend; do not use vertical bank boxes. |
| G2 | **Bare plazas, box stalls and no Hot Springs architecture** | **MAJOR** | Density is what makes `parkitect-4/6` look finished, and place-specific buildings are the authenticity goal. One tree is not a pass. | Build an `InstancedMesh` prop kit: flower beds, planters, bins, picnic tables, shade trees in grates and string-light catenaries. Auto-dress free plaza cells. Lay warm stone pavers. Add facade skins: CCC rubble-stone piers and timber trusses on stations, bathhouse stucco with arched windows and tile roofs on shops, and a stone-rimmed thermal fountain at the steam vent. |
| G3 | **Water life: splashes, swell, swimmers and foam** | **MAJOR** | Pools, slides and the flume fill a large share of frames. They are tidy now (tiles, no seam), but they are still static. | Add a 120-particle additive `Points` splash on rider arrival at slide run-outs and the flume drop, a vertex swell on the wave pool, edge foam by distance to edge, and 5–10 instanced swimmers or floaters per pool on busy days. |
| G4 | **Mobile sheets hide their primary action (N4, B15, N14), with a persistent toast and no peek state** | **MAJOR (mobile)** | Three sheets hide their bottom control. This is the whole remaining mobile deficit. | Use a sticky action footer (`position: sticky; bottom: 0; padding-bottom: calc(var(--radius) + env(safe-area-inset-bottom))`). Add peek, half and full snap states with a drag handle, and a `mask-image` fade plus a scrollbar gutter on lists. Move toasts above the toolbar and collapse them to an "N new" chip after 4 s, on desktop too (B14). |
| G5 | **Title sky (N13) and a vista sky with no sun (N22)** | **MAJOR (first impression)** | The title is the first frame anyone sees, and its sky is flat slate. The vista sky is a flat card. | Give the title camera a fixed `light()` state (sunny, elevation about 18°, golden 0.3). Tilt the far and title cameras 4–6° up so 12–15% of the frame is dome, which shows the shader's existing sun glow and cumulus. Move the vista warmth from albedo to the sun, rim and hemisphere colour. |
| G6 | **Washed-out midday and no AO** | POLISH (high value) | It affects every sunny frame. July noon is unchanged at V 168, S 78. | Use `AgXToneMapping` tuned so concrete sits at 80–85% luminance, N8AO or SAO at half resolution on high, and baked vertex AO at wall feet, stall bases and plinths on low and mobile. |
| G7 | **Ride-life defects: empty train (N10), unsupported slides (N18), lamp in a pine (N15) and queue blobs** | POLISH | These are tells in the showcase shots; the empty train is in the one shot players will screenshot. | Show riders from boarding onward. Reinstate trimmed slide posts with saddle brackets, a start ring and a flat run-out trough. Reject trees within 0.6 tiles of lamps. Roll brick queue paving and rope posts out to every flat-ride queue. |
| G8 | **Night presentation: flat slides (N17), dark signs (N19) and the arrow sign** | POLISH | Night is a strong state, and these are its last tells. | Lit-plus-emissive slides with a Fresnel rim and LED rings. Use the sign `CanvasTexture` as `emissiveMap`, ramped by `uNight`. Render the arrow sign's destination text with the same path. |
| G9 | **Outcrops (N9, N21) and a uniform forest** | POLISH (authenticity) | Novaculite is the region's geological signature. The forest is a third of every frame. | Delete the pad. Use two to four tilted, sunk, layered hulls on a shared strike in warm grey-tan #a89f8c with moss on up-facing normals. Add scale, lean and species jitter, clearings and an understorey to the forest. |
| G10 | **No overlays, minimap or guest portrait; selected guest has no outline** | POLISH (UI depth) | This is what moves UI from 7 to 8. | Add a heatmap ground `DataTexture`, an orthographic minimap render target refreshed every 2 s, and a 96² guest portrait in the empty panel space. Add a 2 px outline on the followed guest. |
| G11 | **Rain has no splash rings, puddles or lightning (N6)** | POLISH | Storms are a frequent state, and the frames read as frozen. | Add instanced ring decals on paths and pools, a wet-path roughness drop, and an occasional full-frame lightning flash with a 0.15 s hemisphere spike. |

**Major versus polish in one line:** the campaign closed every cheap gap it named (HUD, signs, seam, car spacing, golden-hour warmth) and shipped every expensive one untouched: terrain, set dressing and architecture, water life, mobile sheets and the title sky. Those five are the known gaps that hold the game at about 6.4. Everything in the polish list is worth about half a point at most and will not change how a screenshot reads.

---

## What must be kept

1. **The warm golden-hour vista** (R−B 40, V 109) and its framing of the park in a ridge bowl. Warm the sky and the light further; do not cool the grade back.
2. **The tiled pools with no seam,** and the cyan night underlight.
3. **The spaced five-car coaster train** with upright seated riders on the lift (`desktop-train`). Fix boarding only.
4. **The legible day ride signs** (display face, cream board, red rule). Extend them to night emission and the arrow sign; do not shrink them.
5. **The stable two-row mobile HUD** with icon-only weather. Lock its height with a CSS variable.
6. **The single-toast behaviour.** Build the "N new" chip on top of it.
7. **The storm grade** (S 54, R−B 3, shadowless), the **umbrellas in rain**, the **glowing night coaster track**, the canopy bulb strings, the drop-tower chaser and the blooming lamp halos.
8. **The smooth natural ground** with no checkerboard. The terrain rework (G1) must preserve it.
9. **The flume log boats with riders, the wave-pool island, the Lumber Run trestle, the amphitheatre with raked seats and a bulb-lit shell, the stone retaining walls** as a material, and the **flat-ride models with riders**.
10. **The painted toolbar icon set,** the "+N in line" badges, the red-brick queue paving, the restrained "Broken"-only pins, the **seasonal forest and climate-correct HUD**, the **title lockup over the ridges**, the **panel information design**, the **fictional-park disclaimer** and the **large accessible mobile type**.
