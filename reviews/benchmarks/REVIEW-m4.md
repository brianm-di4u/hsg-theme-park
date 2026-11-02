# Spa City Thrills: adversarial visual review, 3D milestone 4 (m4)

Reviewer stance: independent and hostile. Scores compare the game with the best benchmark in each dimension (10 = on par). The scale matches `REVIEW-before.md` (art 3, lighting 2, animation 2, UI 5, typography 5, readability 4, mobile 4, authenticity 3) and `REVIEW-m3.md` (6, 6, 6, 7, 6, 7, 5, 5).

**Sources reviewed**
- GPU review shots, all 30 opened at full size: `screenshots/review3d-m4/desktop-{title,start,crowd,close,vista,wide,night,dusk,rain,fall,spring,train,palette,guest,coaster}.png` and the 15 matching `mobile-*.png` (780×1688, i.e. 390×844 @2×).
- Crops made with Playwright (`deviceScaleFactor` 1.5–6 with a clip), including:
  - the title sky (`desktop-title` 0–640,0–200, 2×) and the vista sky and ridges (`desktop-vista` 0–1280,50–300; park 340–840,260–460, 2.5×);
  - the station exit (`desktop-coaster` 520–760,320–420, 4×; `mobile-coaster` 160–600,700–880, 2×) and the lift train (`desktop-train` 600–860,50–230, 3×);
  - the slide tower (`desktop-train` 360–660,470–735, 3×; `mobile-train` 0–520,980–1440), the slide exit (`desktop-close` 680–960,540–730, 3×) and the night slides (`desktop-night` 680–800,460–660, 3×);
  - the creek (`desktop-spring` 600–1280,130–460, 2×) and the outcrops (`mobile-start` 400–660,420–590, 3×; `desktop-wide` 1090–1260,430–520, 3×);
  - the ride signs (`desktop-close` 380–640,360–560, 3×; 640–760,370–430, 4×; `desktop-train` 0–240,500–620, 3×) and a night sign (`desktop-night` 540–700,520–620, 4×);
  - the pools by day and night (`desktop-crowd` and `desktop-night` 40–280,340–470, 3×; `mobile-coaster` 100–780,1000–1380), and the wave-pool island (`mobile-fall` 120–700,1260–1440, 2×);
  - the lamp-in-pine (`desktop-night` 420–500,200–320, 4×; `desktop-dusk` 410–500,190–320, 4×; `mobile-night` 0–160,470–700, 3×);
  - the sheet and list ends (`desktop-palette` 935–1270,600–730, 3×; `mobile-palette` and `mobile-guest` 0–780,1280–1450);
  - the selected guest (`desktop-guest` 580–700,340–430, 4×) and the plaza crowd (`desktop-crowd` 330–690,280–480, 2.5×).
- **A pixel diff of every m4 shot against its m3 twin** (threshold: ΣRGB > 40). Outside the vista (63% and 57% changed), every shot changed by only 1–12%. Most of that is moving guests, rain streaks and shadow jitter. The real changes are listed in the headline.
- I measured play-area mean brightness (V), saturation (S) and R−B warmth for all 30 shots (rows 13–85% of the height), the same method as m3.
- Benchmarks opened this pass: `parkitect-1` to `parkitect-6`, `pc2-1`, `pc2-5`, `rct3-1` and `rct3-4`.
- Code read only to make the fixes concrete: `src/js/gfx/world3d.js` `light()` (lines 120–166), `materials3d.js` `makeWater()` (lines 69–88) and `models3d.js` `case 'slides'` (lines 453–476).
- Not covered: there is no software-render contact sheet or `report.json` for m4 in `screenshots/v3d-m4/`, which holds only the a11y and flow screens. The amphitheatre (B11) and the coaster builder sheet (N14) are therefore **not verified** this pass.

**Fair comparison note.** As before, Parkitect's stylised low-poly look (`parkitect-2/4/6`) is the right target for this camera. Planet Coaster sets the ceiling for lighting and feel.

**Headline.** This was a targeted fix milestone. The diff shows exactly seven things changed. Everything else is pixel-for-pixel the m3 park:
1. **The vista now has a sky and frames the park.** The ridge ring stands against a pale peach horizon, and the park sits in the centre of the frame on both form factors (`desktop-vista`, `mobile-vista`).
2. **Ride signs carry legible names:** "RIDGE SCREAMER", "RIDGE RUNNER", "NOVACULITE DROP", "BUMPER BARN", "LOOKOUT TOWER" and "SWINGIN' SKIFF" (`desktop-close`, `desktop-train`, `mobile-close`). This is the biggest typography gain since the 3D switch.
3. **The mobile HUD is stable.** It is the same two rows ending at y ≈ 192 in all 13 in-game mobile shots, with weather shown as an icon, and fall no longer wraps (B16 fixed).
4. **Night slides are no longer black** (N8), though they are now overcorrected (N17).
5. **Pools are underlit at night** (`desktop-night` 40–280,340–470, against m3's dark slab).
6. **Outcrops lost their sheer-walled box,** but they now sit on a flat grey pad (N9 partly fixed).
7. **The slide support posts were deleted** rather than trimmed (N11), so the tubes now hang unsupported (N18).

What did not change at all:
- the terraced terrain and stair runs (`desktop-crowd` 700–1280,180–460 is identical to m3);
- the kinked creek;
- the bare plazas and box stalls;
- the flat pools;
- the empty train at the station exit;
- the lamp growing out of a pine;
- the two-toast stack;
- the cut-off rides list and the clipped "Stop following";
- the flat slate title sky.

**Golden hour is still not golden.** It is less oversaturated (S 136, down from 194), but at R−B 15 it is *colder* than April noon (R−B 26–28) and still dark (V 68).

---

## Score table

| Dimension | Before | m1 | m2 | m3 | **m4** | One-line verdict |
|---|---|---|---|---|---|---|
| Art (models, terrain, scenery) | 3 | 5 | 6 | 6 | **6** | No content was added. The outcrop plinths became flat pads, and the slide posts were deleted, leaving floating tubes. Terraces, the bare plazas, box stalls, flat pools and the grid creek are untouched. Call it 6.3. |
| Lighting and shadows | 2 | 5 | 5 | 6 | **6** | There is now a sky in the vista and the pools are underlit at night. Golden hour is still dark and cooler than noon, the title sky is still flat slate, there is still no AO, and sunny frames are still washed out (V 168, S 78). Call it 6.4. |
| Animation and game feel (from stills) | 2 | 4 | 5 | 6 | **6** | Unchanged. There is still no splash at slide exits or the flume, no waves and no lightning, and the dead train still sits at the station exit. Cars now visibly overlap on the station curve (N20). |
| UI | 5 | 6 | 7 | 7 | **7** | Unchanged. The toast stack now shows in four desktop shots, the rides list still cuts off, and there are no overlays or minimap. |
| Typography | 5 | 6 | 6 | 6 | **7** | Ride signs now have crisp, correctly kerned names in a display face (`desktop-train` "…GE SCREAMER" at 3×). The arrow sign is still seven red dots, and the signs go unreadable at night (N19). |
| Readability (guests, rides, queues, paths, status) | 4 | 5 | 6 | 7 | **7** | Rides can now be identified without clicking. The queue blobs on the plaza and the small, unoutlined selected guest remain. Call it 7.3. |
| Mobile | 4 | 5 | 5 | 5 | **6** | The HUD is stable and never wraps, chrome is a steady 25.8%, and the vista frames the park. "Stop following" is still clipped, the rides list still cuts off, and a toast sits over the map in five shots. |
| Authenticity (Ouachita ridges, Hot Springs) | 3 | 5 | 5 | 5 | **5** | The vista finally reads as a park in a bowl of forested ridges under a sky (good). The outcrops are now grey concrete pads, and there is still no Hot Springs architecture. "Novaculite Drop" on a sign is the only new place cue. Call it 5.6. |

**Overall: about 6.3 / 10, up from about 6.0.** The gain comes from typography and mobile, which were cheap, correct fixes. The three content gaps that set the ceiling have now gone two milestones without being touched: terrain shape, set dressing and water. Until they move, the game will not pass 6.5.

### Measured grade (play area only)

| Shot | Conditions | Mean V | Mean S | R−B | m3 (V / S / R−B) | Reading |
|---|---|---|---|---|---|---|
| `desktop-start` / `desktop-spring` | Sunny, April | 144 / 148 | 119 / 116 | 28 / 26 | 146 / 149, 118 / 115, 28 / 26 | Unchanged baseline |
| `desktop-palette` | Sunny 94°F, July | 168 | 78 | 16 | 169 / 77 / 16 | **Still washed out**, with near-white plazas |
| `desktop-fall` | Sunny, October | 147 | 96 | 34 | n/a | The warmest frame in the set, from foliage, not light |
| `desktop-crowd` / `desktop-rain` | Storms | 107 / 106 | 53 / 54 | 3 / 3 | 108 / 107, 53 / 53, 3 / 3 | The storm grade holds |
| `desktop-dusk` | Rain, 7:37 pm | 121 | 62 | 17 | 113 / 80 / 21 | Slightly brighter and greyer than m3 |
| `desktop-vista` / `mobile-vista` | Sunny, 7:49 pm | **68 / 73** | **136 / 130** | **15 / 18** | 60 / 63, 194 / 189, 21 / 23 | Saturation is fixed, but it is **cooler than noon** and still dark (N3) |
| `desktop-night` | Rain, 9:31 pm | 59 | 51 | 0 | 57 / 49 / 0 | Neutral moonlight |

---

## Bug status (everything open after m3)

| # | Bug | m4 status | Evidence (m4) |
|---|---|---|---|
| B9 | Creek is a grid staircase | **Not fixed** (still only the m3 partial fix) | `desktop-spring.png` 600–1280,130–460 at 2×: straight cell runs, 30–45° kinks, and a vertical brown bank wall that breaks at every kink. The creek still runs in a trench with sheer brown sides in `desktop-crowd.png` 1000–1200,250–330 and `mobile-spring.png` 0–780,280–620. The diff against m3 is only edge noise. |
| B14 | Desktop toast stack on the play area | **Not fixed** (now in more shots) | Two stacked toasts at 10–430,658–722 in `desktop-crowd`, `desktop-close`, `desktop-vista` and `desktop-wide`. There is no count or collapse. |
| B15 | Rides list cuts off the last card with no affordance | **Not fixed** | `desktop-palette.png` 945–1245,690–722: "Swingin' Skiff" and "$18,000" are cut by the panel border, with no fade and no scrollbar. `mobile-palette.png` 40–735,1370–1428: "Bumper Barn" and "$11,000" are cut the same way. |
| B16 | Mobile HUD reflows between states | **Fixed** | Every in-game mobile shot has the speed row at y 12–100 and the stat row at y 138–188, ending at y ≈ 192, in compact, sheet, guest, train, coaster and fall states alike. `mobile-fall.png` reads "Sat Oct ☀76°F" on one row. The weather label became an icon, which is what fixed the wrap. |
| N3 | Golden-hour vista is murky | **Partly** | `desktop-vista.png` and `mobile-vista.png`: there is now a sky band (a flat peach-grey, about #d9c9bd, with no sun disc and no gradient worth the name), and S dropped from 194 to 136. But V is only 68, and R−B 15 makes it **cooler than noon (26–28)**. The forest floor is still brown-olive, and there is no rim light on the canopy. Compare the full red sky in `pc2-5.jpg` and the warm pink haze in `rct3-1.jpg` and `rct3-4.jpg`. The cause is in `world3d.js` `light()`: `day = (elev+4)/14` is about 0.7 at a 6° sun, so the haze takes a 29% lerp to `skyNight` (#1c2644) *after* the gold lerp, and the sun and `golden` are both scaled down by `day`. |
| N4 | "Stop following" clipped by the mobile sheet edge | **Not fixed** | `mobile-guest.png` 36–292,1362–1428: the button's lower half is cut by the rounded sheet border. A bottom scroll shadow is now drawn over it, which signals "scroll" but still hides the primary action. |
| N6 | Rain reads as static | **Partly** (unchanged) | The streaks are thin and sparse (`desktop-crowd`, `desktop-night`). There are still no splash rings, puddles or depth fade. |
| N8 | Water slides turn into black silhouettes at night | **Fixed, but overcorrected** | `desktop-night.png` 280–360,240–460 and 690–790,500–650; `mobile-night.png` 480–640,1010–1280: the tubes are bright pastel red, yellow and teal. They now render as flat, unshaded ribbons, logged as N17. |
| N9 | Outcrops sit on grey vertical-sided slabs | **Partly** | The sheer-walled box is gone (compare m3 `mobile-start` 400–660,420–590). The rock now sits on a flush **rectangular pale-grey pad** that reads as a poured concrete apron (`mobile-start.png` 420–650,450–560; `desktop-wide.png` 1100–1250,440–510 and 400–490,195–240; `desktop-spring.png` 570–770,95–210). The white crystal (#e8ecee-ish) still reads as snow. |
| N10 | Train sits empty at the station exit while guests wait | **Not fixed** | `desktop-coaster.png` 530–640,340–400 at 4× shows five yellow cars, every seat bare black, beside "+41 in line". `mobile-coaster.png` 180–420,720–850 is the same. |
| N11 | Slide support posts pierce the tubes | **Fixed by deletion** | `desktop-train.png` 360–660,470–735: no posts pierce the tubes, because there are no posts at all now. The tubes hang from the top deck with no support, logged as N18. |
| N12 | Mobile vista frames forest, not the park | **Mostly fixed** | `mobile-vista.png`: the park now spans x 0–730 at y 590–960, with the drop tower near the centre and ridges against sky above. The Ridge Wheel is still cut at the left edge (x 0–40), and the bottom 30% of the frame (1000–1440) is foreground canopy. |
| N13 | Title sky is flat slate grey | **Not fixed** | `desktop-title.png` 0–640,0–200 at 2× is a flat blue-grey (about #5f6675) behind the ridges, with no gradient and no warmth. `mobile-title.png` 0–780,0–130 is the same. The play-mode sky dome exists (`world3d.js:49–69`), but the title camera does not get a sunny or golden `light()` state. |
| N14 | Mobile coaster-builder sheet clips "Cancel" | **Unverified** | No builder state is in the GPU set, and no m4 software sheet exists. Given that N4 is unfixed, assume it is still open. |
| N15 | Lamp post grows out of a pine | **Not fixed** | `desktop-night.png` 440–470,215–300 at 4×: the lamp glows from inside a black pine silhouette. The same pine and lamp appear in `desktop-dusk.png` 430–480,200–310 and `mobile-night.png` 40–130,500–680. |

**Summary of the 15 items open after m3:**
- **1 fixed:** B16.
- **2 fixed with side effects:** N8 (overcorrected, now N17) and N11 (posts deleted, now N18).
- **1 mostly fixed:** N12.
- **2 partly fixed:** N3 and N9.
- **1 partly fixed and unchanged since m3:** N6.
- **7 not fixed:** B9, B14, B15, N4, N10, N13 and N15.
- **1 unverified:** N14.

---

## New bugs found in m4

| # | Bug | Where (file, approx. px) | Likely fix (three.js) | Severity |
|---|---|---|---|---|
| N16 | **A straight diagonal highlight seam crosses every rectangular pool.** It is faint by day and obvious at night now that pools are underlit. | `desktop-night.png` 160–230,355–410 (a bright band corner to corner); `desktop-crowd.png` 90–250,360–450; `mobile-coaster.png` 390–950,1100–1300 | The pool is a two-triangle quad with per-corner `vertexColors`, so the colour and the ripple-normal lighting interpolate differently across the shared diagonal. Give the pool one flat vertex colour and compute the depth tint in the fragment shader from a distance-to-edge term, or subdivide the quad (8×8) so the interpolation is smooth. | Polish, but visible in every night shot |
| N17 | **Night slides are flat, unshaded pastel ribbons,** the brightest and least 3D objects in the frame. They read as paper streamers. | `desktop-night.png` 280–360,240–460 and 690–790,500–650 (3× crop: no shading or highlight at all); `mobile-night.png` 480–640,1010–1280 | `ctx.metal.setGlow(0.18)` in `models3d.js:470` effectively replaces lighting. Keep the lit shading and add `emissive = base × 0.12 × uNight`, plus a Fresnel rim (`pow(1 − N·V, 2) × 0.4`). Add instanced LED rings every 0.6 units along the sweep for the "night" read. | Polish |
| N18 | **The slide tubes are unsupported and unanchored.** No posts remain, the tube tops float beside the tower deck with no start platform, and the run-outs end as open C-section cuts hovering above the pool with no splash. | `desktop-train.png` 360–660,470–735; `desktop-close.png` 690–960,540–730 (tube ends at about 740,610 and 860,690); `mobile-train.png` 0–520,980–1440 | Reinstate posts, trimmed at `tubeCentre.y − r` with a saddle bracket (the m3 fix). Add a flared start ring (`TorusGeometry(r × 1.3, 0.02)`) on the deck edge and a short flat run-out trough at water level. `fx.addSplash` is already called at `models3d.js:473`, but no splash is visible in any shot, so check that it fires on rider arrival and is not culled by the pool's transparency sort. | Polish |
| N19 | **Ride signs go unreadable at night.** The new name boards dim to grey, unlit slabs. | `desktop-night.png` 540–620,560–600 (4×: the text is illegible); 290–330,505–525 | Use the same `CanvasTexture` as `emissiveMap`, with `emissiveIntensity = 0.7 × uNight`, or add a small warm spot or decal glow under each board. | Polish |
| N20 | **Coaster cars interpenetrate on the station curve.** Adjacent car bodies overlap into a V at the joints. | `desktop-coaster.png` 560–640,355–395 (4×: car 3 sinks into car 4); `mobile-coaster.png` 280–430,760–830 | Sample the spline at each car's front and rear bogie (`s ± L/2`), place the car at the midpoint and orient it along the chord. Add a 0.04 gap between car lengths. | Polish, but in the coaster showcase shot |

---

## 1. Art (models, terrain, scenery): 6/10

**Observations**
- **Zero new content.** The diff confirms that the terrain, paths, stalls, plazas, pools and creek are pixel-identical to m3 outside of moving guests. `desktop-crowd` 700–1280,180–460 matches the m3 crop exactly: flat grass shelves, low stone walls and grey stair runs. Compare `parkitect-4.jpg`, where the hill is shaped mass and the park steps down it, and `rct3-1.jpg`, where paths ride the slope.
- **Both "fixes" removed geometry rather than building it.** The outcrop box became a flat pad (N9), and the slide posts were deleted, leaving floating tubes (N18). Each fix reads as a missing part.
- **The plazas are still bare** (`desktop-crowd` 330–690,280–480 at 2.5×): benches, two lamps, the mascot, umbrellas and concrete. `parkitect-4.jpg` and `parkitect-6.jpg` fill the same space with flower beds, string lights, a pergola, stone arches and a fountain with spray. The stalls are still boxes with striped awnings (`desktop-close` 0–340,300–460).
- **Pools are still slabs:** uniform light blue with no tiles, steps or swimmers (`mobile-coaster` 130–760,1030–1360), now with a diagonal seam (N16). Compare `pc2-1.jpg`. The wave-pool island with its rings and boulders (`mobile-fall` 120–700,1260–1440) is still the best water asset.
- **The hero assets hold up:** the five-car Ridge Screamer train with ten seated riders (`desktop-train` 600–860,50–230), the Lumber Run trestle, the flume log boats, and the drop tower.

## 2. Lighting and shadows: 6/10

**Observations**
- **The vista sky is real progress.** The ridge ring now ends against a horizon, not the frame edge (`desktop-vista` 0–1280,50–300). But it is a flat peach-grey card with no sun glow, no gradient to a blue zenith and no clouds, even though the shader has all three (`world3d.js:53–64`). The camera pitch only shows the bottom 5% of the dome, where `uHor` dominates.
- **Golden hour is still broken** (N3, with the measurements above). The light is cooler than noon, the canopy has no warm rim, and long tree shadows turn the forest floor brown-olive. `rct3-1.jpg` shows how a low sun reads: warm haze, lifted greens and a pink horizon. `pc2-5.jpg` shows the dusk ceiling.
- **Night improved again.** Pools are now lit from below (cyan, legible, close to the `pc2-5` underlight read), and the slides are no longer black. The faults are the flat slides (N17), the pool seam (N16), the dark signs (N19) and the lamp in a pine (N15).
- **Sunny midday is still flat:** `desktop-palette` V 168, S 78, with near-white plazas. Stall bases, wall feet and ride plinths have no contact darkening (`desktop-close`).
- **The title sky is untouched** (N13).

## 3. Animation and game feel (from stills): 6/10

**Observations**
- **Nothing new is moving.** The lift train with riders, the flume boat with riders (`desktop-fall` 905–930,195–212), umbrellas in rain, flat-ride riders, the steam vent and the wave-pool swimmer are all as in m3.
- **There are still no water cues:** no splash at the slide exits (`desktop-close` 690–960,540–730, despite `addSplash` in code), no flume drop splash, no pool ripple rings and no foam. Storms still have no lightning.
- **The coaster showcase shot still has the empty train** (N10) and now visibly overlapping cars (N20). This is the shot a player screenshots.

## 4. UI: 7/10

**Observations**
- The painted toolbar icons, the "+N in line" badges, the "Broken" pin and the panel information design remain good (`desktop-guest`, `desktop-palette`).
- **The toast stack is now in four desktop shots** (B14), with "Little Bear Coaster passed its test run" still showing two in-game hours later.
- The rides list still cuts off its last card (B15). The guest panel has 220 px of empty cream below "Stop following" on desktop (`desktop-guest` 935–1270,515–720), so there is room for a portrait or a mini-view.
- There are still no overlays, zone tints, staff pins or minimap. Compare `parkitect-5.jpg` (zone tint and labels) and `parkitect-3.jpg` (staff pins).

## 5. Typography: 7/10

**Observations**
- **The in-world names land.** The ride boards carry crisp, dark, all-caps display type on cream with a red rule: "RIDGE SCREAMER" (`desktop-train` 0–240,500–620, 3×: clean edges, no aliasing), "NOVACULITE DROP", "BUMPER BARN" (`desktop-close` 380–640,360–560) and "LOOKOUT TOWER" (`mobile-close` 40–130,420–470). They are legible at the default zoom on desktop and on phone. This was gap 8 in m3, done properly.
- **The leftovers:** the arrow sign is still a cream board with seven red dots (`desktop-close` 670–735,395–410 at 4×; `mobile-close` 450–560,840–860). The night boards are illegible (N19). Some boards are occluded by their own ride; that is acceptable.
- The HUD and panel type are unchanged and good. The mobile HUD no longer wraps, so the last layout fault in the type is gone.

## 6. Readability (guests, rides, queues, paths, status): 7/10

**Observations**
- **Rides are now identifiable at a glance** through the signs, which closes most of the "which ride is that?" gap that Parkitect solves with its station signs (`parkitect-4.jpg` "Carousel" board, 1250–1330,880–900).
- **The selected guest is unchanged:** a pale-yellow x-ray figure about 10 px tall with a ▼ pin and a ring (`desktop-guest` 620–650,365–410). It still has no outline, and it is easy to lose against the cream tower.
- **The queue blobs remain.** The carousel, swings and cups queues are undifferentiated umbrella masses across plaza concrete (`desktop-crowd` 330–690,350–520; `desktop-close` 100–500,200–480). Only the coaster and slide queues have brick paving and ropes.

## 7. Mobile: 6/10

**Observations**
- **The HUD is fixed.** It is a constant two rows (0–192, 11.4%) in every state, and with the toolbar at 1445–1688 (14.4%) chrome is a steady 25.8%. No state wraps or jumps (B16). The icons and touch targets remain large.
- **The vista now frames the park** (N12, mostly fixed), with ridges and sky on top.
- **The sheets are still the weak point.** "Stop following" is clipped (N4). The rides list cuts "Bumper Barn" (B15). The sheets still cover about 52% (555–1430) with no peek state.
- **A toast covers the bottom of the map** (1365–1425) in `mobile-crowd`, `mobile-close`, `mobile-wide`, `mobile-vista` and `mobile-coaster`.

## 8. Authenticity (forested Ouachita ridges, Hot Springs, Arkansas): 5/10

**Observations**
- **The vista is now the best place shot the game has.** A small park sits in a bowl of continuous pine and hardwood forest, ringed by long, low ridgelines against a hazy sky (`desktop-vista`, `mobile-vista`). That is the Ouachita read. It needs warm light (N3) to become a postcard.
- **The seasons remain right:** redbud and dogwood in April, orange and red hardwoods in October at 76°F, and 94°F in July.
- **Geology got worse in one respect.** The novaculite outcrops now sit on what reads as poured concrete aprons (N9). Real Ouachita novaculite is tilted, layered, off-white ledges breaking out of a forested slope.
- **There is still no Hot Springs architecture:** no CCC-style stone and timber shelters, no bathhouse-row facades and no thermal fountain at the steam vent. "Novaculite Drop" on a sign is a nice touch, but it is the only new place cue.

---

## Ranked remaining gaps

**Major** gaps decide the score ceiling and how the game reads in a screenshot. **Polish** gaps are visible but local.

| # | Gap | Class | Why it matters | Concrete fix (three.js / WebGL, small team) |
|---|---|---|---|---|
| 1 | **Terraced built terrain, vertical walls and the grid creek (B9)**, unchanged for two milestones | **MAJOR** | It is in every gameplay frame and contradicts "hillside park". It is the largest single visual deficit. | Keep the cell heightfield for the sim, and render a display mesh at four subdivisions per cell. Bilinearly interpolate corner heights, weld vertices and call `computeVertexNormals()`. Where a level change has no path or structure within one cell, replace the wall with a 1:1.5 embankment by lifting the lower cell's edge row. Keep stone walls only under paths or buildings. Build the creek as a `CatmullRomCurve3` through cell centres (centripetal, tension 0.5), swept as a 0.7-cell ribbon, with bank vertices lowered 0.15 and a soft brown bank blend in the terrain shader by distance to the curve. Do not use vertical bank boxes. |
| 2 | **Bare plazas, box stalls and no Hot Springs architecture** | **MAJOR** | Density makes `parkitect-4/6` look finished, and place-specific buildings are the authenticity goal. | Build an `InstancedMesh` prop kit: flower beds in three colours, low stone walls, planters, bins, shade trees in grates, picnic tables, and string lights (`TubeGeometry` catenaries between lamps with instanced emissive bulbs). Auto-dress free plaza cells and path edges. Lay warm stone pavers on plazas (a separate path material from concrete). Add facade skins: CCC-style rubble-stone piers and timber-truss roofs on stations, bathhouse-style stucco fronts with arched windows and tile roofs on shops (fictional names), and a stone-rimmed thermal fountain around the steam vent. |
| 3 | **Time-of-day grade: golden hour and title sky (N3, N13)** | **MAJOR** | Golden hour is the free beauty shot, and it is still the coldest sunny frame in the set. The title is the first impression. | In `world3d.js` `light()`, separate dusk from night: `night = 1 − smoothstep(−6, 0, elev)` drives the `skyNight` lerp, not `1 − day`. Drive `golden = smoothstep(14, 2, elev) × (elev > −2)`, unscaled by `day`. At full golden, set the haze to #ffb27a at 0.9 (not 0.44), `uTop` to #8fa8d0, sun colour #ffa860 at 3.2, hemisphere sky #ffcfa0 and ground #6a5032, and shadow intensity 0.6 so the forest floor is not crushed. Raise the grade tint to R 1.12, B 0.86 with `sat = 1 − golden × 0.05`. Targets: vista V ≥ 95, S ≤ 130, R−B ≥ 40. Tilt the far-zoom camera 4–6° up so 12–15% of the frame is dome (the sun glow and cumulus already exist in the shader). Give the title a fixed `light()` state (sunny, elevation about 18°, golden 0.3), so it uses the dome rather than #5f6675. |
| 4 | **Water surfaces and water motion (N16, splashes)** | **MAJOR** | Pools, the creek and slides fill a large share of frames. They are flat paint, and water is where `pc2-1` is strongest. | Fix the seam first (N16). Then, in `makeWater` (pool variant): add a tile-grid albedo (`fract(vWPos.xz × 4)` lines at 0.06 darkening), a depth tint from a distance-to-edge attribute, edge foam where that distance is under 0.08, and a vertex sine swell on the wave pool. Add a 120-particle `Points` splash with an additive sprite at slide run-outs and the flume drop, triggered on vehicle arrival. Add five to ten instanced swimmers or floaters per pool on busy days. |
| 5 | **Mobile sheets: N4, B15, N14, the persistent toast, no peek state** | **MAJOR (mobile)** | The HUD is solved, so the sheets are now the whole mobile deficit, and two of them still hide their primary action. | Use a sticky action footer (`position: sticky; bottom: 0`) with `padding-bottom: calc(var(--radius) + env(safe-area-inset-bottom))`. Add three snap states (peek 22%, half 45%, full) with a drag handle. Add a `mask-image` fade and a scrollbar gutter on long lists. Move toasts above the sheet or toolbar and collapse them to an "N new" chip after 4 s. Apply the same collapse to the desktop stack (B14). |
| 6 | **Washed-out midday and no AO** | POLISH (high value) | Every sunny frame benefits, and `desktop-palette` has near-white plazas. | Switch `r3d.js:47` to `AgXToneMapping`, tuned so plaza concrete sits at 80–85% luminance. Use N8AO or SAO at half resolution on the high preset, with baked vertex AO at wall feet, stall bases and ride plinths on low and mobile. Add a light vignette. |
| 7 | **Outcrops on concrete pads (N9) and a uniform forest** | POLISH (authenticity) | The outcrops are the region's geological signature, and the forest is a third of every frame. | Delete the pad. Use two to four jittered hulls (`IcosahedronGeometry(r, 1)` with noise, scaled 1.0 × 0.45 × 0.8 and tilted 20–35° on a shared strike) sunk 30% into the terrain, in warm grey-tan #a89f8c with a moss tint on up-facing normals. Change the crystal to #d9d4c7. For the forest: 0.7–1.4× scale and ±6° lean jitter, species clusters, clearings and an instanced understorey. |
| 8 | **Ride-life defects (N10, N18, N20, N15) and the queue blob** | POLISH | These are local tells in the showcase shots. | Show riders from boarding onward. Reinstate trimmed slide posts and add a start ring and run-out (N18). Place cars by bogie (N20). Reject trees within 0.6 tiles of path lamps (N15). Roll brick queue paving and rope posts out to every flat-ride queue, routed as a switchback pen. |
| 9 | **Night presentation (N17, N19) and the arrow sign** | POLISH | Night is the strongest state, and these are its last tells. | Use lit-plus-emissive slides with a rim and LED rings (N17). Add an emissive sign texture ramped by `uNight` (N19). Render the arrow sign's destination or "Exit" with the same `CanvasTexture` path as the ride boards. |
| 10 | **No overlays, minimap or guest mini-view; selected-guest outline** | POLISH (UI depth) | This moves UI from 7 to 8. | Add a heatmap overlay (a ground `DataTexture` blended in the terrain shader), a minimap (an orthographic render to a 256² target every 2 s), and a 96² guest portrait render target filling the empty panel space. Add a 2 px dark outline (back-face hull or `OutlinePass` on the followed guest) and a more saturated yellow on the x-ray figure. |

**Major versus polish in one line:** four of the top five gaps (terrain, set dressing and architecture, golden-hour grade, water) are content and rendering work that has been deferred for two milestones and sets the ceiling, and the mobile sheets are the fifth. Everything from 6 down adds about half a point each but will not change how the game reads in a screenshot. **The m4 fix list removed defects by deleting geometry (pads, posts). m5 has to add geometry.**

---

## What must be kept

1. **The legible ride signs** (display face, cream board, red rule). Extend the same `CanvasTexture` path to the arrow sign and to night emission. Do not shrink them.
2. **The stable two-row mobile HUD** with icon-only weather (all `mobile-*` shots). Lock its height with a CSS variable so no future chip can wrap it.
3. **The vista framing and the ridge ring against the sky.** Warm the light (gap 3). Do not move the camera back to the board centre.
4. **The pool underlights at night,** once the seam (N16) is fixed.
5. **The upright, seated coaster riders** and the five-car train (`desktop-train`). Fix the boarding (N10) and the car spacing (N20) only.
6. **The x-ray selected-guest silhouette, with its pin and ring.** Add an outline, but keep the approach.
7. **The storm grade** (S 53, R−B 3, shadowless), the **umbrellas in rain**, the **glowing night coaster tracks**, the canopy bulb strings, the drop-tower chaser and the blooming lamp halos.
8. **The smooth natural ground** with no checkerboard. The terrain rework in gap 1 must preserve it.
9. **The flume log boats with riders, the wave-pool island, the Lumber Run trestle, the stone retaining walls** as a material, and the **flat-ride models with riders**.
10. **The painted toolbar icon set,** the "+N in line" badges, the red-brick queue paving, the restrained "Broken"-only pins, the **seasonal forest and climate-correct HUD** (76°F in October), the **title lockup over the ridges**, the **panel information design**, the **fictional-park disclaimer**, and the **large accessible mobile type**.
