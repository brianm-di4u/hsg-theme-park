# Spa City Thrills: adversarial visual review, 3D milestone 2 (m2)

Reviewer stance: independent and hostile. Scores compare the game with the best benchmark in each dimension (10 = on par). The scale matches `REVIEW-before.md` (old 2D: art 3, lighting 2, animation 2, UI 5, typography 5, readability 4, mobile 4, authenticity 3) and `REVIEW-m1.md` (art 5, lighting 5, animation 4, UI 6, typography 6, readability 5, mobile 5, authenticity 5).

**Sources reviewed**
- GPU review shots, all opened at full size: `screenshots/review3d-m2/desktop-{title,start,crowd,close,vista,wide,night,dusk,rain,fall,spring,train,palette,guest,coaster}.png` and the 15 matching `mobile-*.png`. I upscaled 2–3× crops of the coaster train (`desktop-train` ~600–880,60–270), the slide tower (`desktop-train` ~380–680,280–740), the selected guest (`desktop-guest` ~520–760,300–480), the station exit (`desktop-coaster` ~520–820,330–480), the wave-pool island (`mobile-dusk` ~150–620,1280–1445), the night stations and Lumber Run (`desktop-night`), the flume (`desktop-crowd` top centre), the plaza crowd (`desktop-crowd` ~380–760,200–460) and the creek (`desktop-spring` ~600–1280,130–460).
- Software-render contact sheets (low preset, build minus the last tweaks): I inspected `screenshots/v3d-m2/sheets/desktop-01..07.png`, `mobile-01.png` and `mobile-04.png`, and cropped the "05-concert" tile on `desktop-06.png` at 2×. The tool's image budget blocked `desktop-08/09` and `mobile-02/03/05/06/07`, so I did not inspect them.
- Benchmarks: `parkitect-2`, `parkitect-4`, `parkitect-6`, `pc2-1`, `pc2-5` and `rct3-4` were opened side by side with the m2 shots. The tool's image budget blocked the other 18 in this pass. Where this review cites them (`parkitect-1/5`, `pc2-4`, `rct3-1`), it relies on the m1 review's descriptions.

**Fair comparison note.** As before, Parkitect's stylised low-poly look (`parkitect-2/4/6`) is the right target for this camera and art direction. Planet Coaster sets the ceiling for lighting and feel, but it is not a realistic target for a browser game.

**Headline.** A real but uneven step. The m1 bug burn-down mostly happened: the pool spike, the roof orbs, the tree through the station, the October heatwave and the mobile toast-over-button are gone. Guests carry umbrellas in rain, queues have their own red-brick paving and honest "+41 in line" badges, the flume has water, the retaining walls are stone, Lumber Run has a real trestle, and the emoji toolbar has been replaced by a painted icon set. But the single most important new feature, **riders on the coaster, ships upside down**: the Ridge Runner train hangs under its rails with riders dangling head-first beneath the cars (`desktop-train.png`, `mobile-train.png`). That is the screenshot a hostile reviewer would lead with. The selected guest is still hidden behind the drop tower, the terrain is still a checkerboard of terraces, the creek still zig-zags, storms are still saturated summer colour, and the new "golden hour" vista is murky olive rather than golden.

---

## Score table

| Dimension | Before | m1 | **m2** | One-line verdict |
|---|---|---|---|---|
| Art (models, terrain, scenery) | 3 | 5 | **6** | Stone walls, brick queues, a real trestle, an authored pool island and a watered flume. Terrain is still terraces, plazas are still bare and stalls are still boxes. |
| Lighting and shadows | 2 | 5 | **5** | Storms now drop sun shadows and night lamps bloom, but there is still no sky, no AO, storms stay fully saturated and the golden-hour vista is muddy. Call it 5.5, rounded down for the vista. |
| Animation and game feel (from stills) | 2 | 4 | **5** | Umbrellas, riders on every flat ride, a swimmer, water in the flume. The flagship coaster riders hang upside down under the train. |
| UI | 5 | 6 | **7** | A consistent painted toolbar icon set replaces emoji, the queue badges have an icon and a unit, and there are fewer toasts. There are still no overlays, no minimap and the palette list still cuts off. |
| Typography | 5 | 6 | **6** | The badges now read ("+41 in line"), and the gate name board is close to legible. Ride sign boards are still black slabs, and the mobile HUD wraps to three rows. |
| Readability (guests, rides, queues, paths, status) | 4 | 5 | **6** | Queue paving and badges finally read, and umbrellas make crowd flow visible. The selected guest is still invisible, and the carousel and swing queues still blob. |
| Mobile | 4 | 5 | **5** | The toast no longer covers sheet buttons. Chrome is still about 30%, sheets about 52%, the HUD reflows to three rows in fall, and "Stop following" is clipped by the sheet edge. |
| Authenticity (Ouachita ridges, Hot Springs) | 3 | 5 | **5** | Climate is fixed and the walls are native-stone-ish. In play the setting is still a flat forest carpet with one ridge in a corner (`desktop-vista.png`), and there is no Hot Springs architecture. |

**Overall: about 5.6 / 10, up from about 5.1.** Fix the coaster orientation and the guest occlusion this week. The next real jump needs terrain and set dressing plus a proper grading and sky pass.

---

## m1 bug status (B1–B16)

| # | m1 bug | Status | Evidence (m2) |
|---|---|---|---|
| B1 | Selected-guest marker floats; guest hidden behind drop tower | **Not fixed** | `desktop-guest.png`: the pin (~632,368) and ring (~636,400) sit against the drop-tower column with no guest visible. `mobile-guest.png`: the pin (~385,478) and ring (~385,535) are again beside the tower column. Follow mode still lets the tower occlude the subject, and there is no x-ray silhouette. |
| B2 | Storms lit like cloudless noon | **Partly** | `desktop-rain.png`, `desktop-crowd.png` and `desktop-wide.png` ("Storms") have lost the hard tree shadows and are about 20% darker than sunny `desktop-palette.png` (mean V 110 vs 139). However, saturation is unchanged or higher (mean S 107 vs 95), there is no grey sky, no fog, no wet sheen and no lightning. It still reads as a summer afternoon with rain streaks drawn on top. The software sheet `v3d-m2/sheets/desktop-04.png` "02-storm" still looks sunny (build minus tweaks). |
| B3 | Green pyramid spike in wave pool | **Fixed** | The pool now has an authored island with a hardwood, two boulders, swim rings and a swimmer (`mobile-dusk.png` ~150–620,1280–1445; `desktop-crowd.png` ~600–700,680–730). |
| B4 | Glowing orbs on station roofs | **Fixed** | `desktop-night.png`: the Ridge Runner station (~150–270,230–290) and Little Bear station (~860–1030,570–690) now have bulbs along the canopy edge and a pooled light on the platform. No roof-top orbs remain. |
| B5 | Pine through Ridge Runner station | **Fixed** | `desktop-coaster.png` and `mobile-coaster.png`: the station, queue and roof are clear of trees. |
| B6 | Coaster train detached from rails at station exit; empty cars | **Not fixed; regressed** | The cars now have riders, but the whole train is flipped. The rails run across the car tops and riders hang head-down beneath the cars (`desktop-train.png` ~620–830,80–250; `mobile-train.png` ~330–740,265–550; `desktop-coaster.png` ~535–640,350–415 shows the same cars slung under the rails at the station exit). See N1. |
| B7 | Orphan support stubs under Lumber Run | **Fixed (as far as visible)** | Lumber Run now has regular timber bents with ledgers (`desktop-crowd.png` ~820–1270,340–600). The short posts along the ground-level outer run (`desktop-night.png` ~1000–1200,560–720) sit under the track. I found no floating stubs. |
| B8 | Toast covers "Stop following" on mobile | **Fixed, new defect** | No toast appears over the guest sheet in `mobile-guest.png`. However, the "Stop following" button is now clipped by the sheet's bottom edge (y ≈ 1365–1430). See N4. |
| B9 | Creek is a grid staircase | **Partly** | Banks are darker and the channel is slightly wider, but it still runs in 45° cell steps with hard corners (`desktop-wide.png` ~560–820,370–470; `desktop-spring.png` ~640–1280,140–440; `mobile-wide.png` ~380–760,860–970). |
| B10 | Log flume dry | **Partly** | The trough now has a blue water strip (`desktop-crowd.png` ~700–930,100–220; `mobile-wide.png` ~130–470,650–840). There are still no log boats, no riders and no drop splash. |
| B11 | Floating white cubes at amphitheatre | **Not fixed (software sheet)** | `v3d-m2/sheets/desktop-06.png` "05-concert" (~410,270 and ~597,195 in the tile) and `mobile-04.png` "05-concert" (~888,1150; ~992,1100) still show white floating hexes over the stage. It is not covered by the GPU set, so it is unverified there. |
| B12 | 95°F in October | **Fixed** | `desktop-fall.png` and `mobile-fall.png`: "Sat October 2026, Sunny 76°F". |
| B13 | Checkerboard facet shading on grass | **Not fixed** | Light and dark triangle patches still tile the lawn (`desktop-start.png` centre and right; `desktop-spring.png` everywhere; `mobile-start.png` ~0–780,560–1440; `mobile-spring.png`). |
| B14 | Desktop toast stack covers gate and carousel | **Partly** | Usually there is one toast now (`desktop-guest`, `desktop-wide`, `desktop-vista`, `desktop-coaster`), but `desktop-crowd.png` and `desktop-close.png` still stack two (10–430, 660–720). These cameras keep the gate clear, but the stack still sits on the play area, and there is no count or collapse. |
| B15 | Rides list cuts off last card, no scroll affordance | **Not fixed** | `desktop-palette.png` "Swingin' Skiff" is cut at y ≈ 705–720. `mobile-palette.png` "Bumper Barn" is cut at y ≈ 1370–1430. There is no fade mask or scrollbar. |
| B16 | Mobile HUD reflows between states | **Not fixed; worse** | The time chip sits in row 1 in `mobile-crowd.png` and row 2 in `mobile-start.png`. In `mobile-fall.png` the HUD wraps to three rows, with the rating chip alone beside the speed buttons (y ≈ 180–235). |

**Summary: 6 fixed (B3, B4, B5, B7, B12, B8 with a caveat), 4 partly (B2, B9, B10, B14), 6 not fixed (B1, B6 regressed, B11, B13, B15, B16).**

---

## New bugs found in m2

| # | Bug | Where (file, approx. px) | Likely fix |
|---|---|---|---|
| N1 | **The coaster train is upside down. Riders hang head-first under the cars.** The red rails run across the car tops, the yellow car bodies sit below the track, and each rider's head and torso dangle below the car floor. It happens on the lift hill and at the station exit, so it is not an inversion element. This is the "train (coaster with riders)" showcase shot. | `desktop-train.png` (~620–830,80–250); `mobile-train.png` (~330–740,265–550); `desktop-coaster.png` / `mobile-coaster.png` (station exit, cars slung under the rails) | The car basis is using the spline's Frenet normal, which flips sign on curves and hills, or it uses `-up`. Build each car's frame from the track tangent `T` and the *track's* stored up or bank vector `U` (world +Y rotated by bank), set `B = T × U` and `U = B × T`, then call `matrix.makeBasis(T, U, B)` (or `B, U, -T` depending on the model's forward axis). Parent riders to a seat node at +Y in car space. Add a harness assertion that `carWorldUp.y > 0` on every non-inverted segment. |
| N2 | **The water-slide tubes tear.** White slivers and dashes run along the yellow, red and teal tubes, as if the inside faces or seams show through. | `desktop-train.png` (~380–640,480–735); `mobile-train.png` (~0–400,1000–1440); visible at lower zoom in `desktop-crowd.png` (~690–780,470–650) | The swept tube is open or single-sided, or its normals are inverted at the seam. Close the sweep (duplicate the first ring vertex and weld it), use `side: THREE.DoubleSide` or cap the inner wall, and recompute normals after the sweep. Check the frames along the sweep for the same Frenet flip as N1, which also twists tube cross-sections. |
| N3 | **The golden-hour vista is murky, not golden.** At 7:49 pm "Sunny 78°F", the frame is dark olive (mean V 62), with no warm key, no sky and no rim light on the canopy. The park reads as dimmed, not as sunset. | `desktop-vista.png`, `mobile-vista.png` | At sun elevation under 12°, set the sun colour to about #ffb070 at 1.3–1.6× intensity and the hemisphere ground to a warm brown, raise exposure by 0.3 EV, and tint the fog a warm peach. Add a gradient sky dome so the frame has a bright upper edge (compare the `pc2-5.jpg` and `rct3-4.jpg` skies). |
| N4 | **"Stop following" is clipped by the mobile sheet edge.** The button's bottom third is cut off by the sheet's rounded border, with no padding. | `mobile-guest.png` (y ≈ 1365–1430) | Add bottom padding equal to the border radius plus `env(safe-area-inset-bottom)` inside the sheet scroller, or pin the actions in a sticky footer. |
| N5 | **The 2D fallback still spams storm chips** (fallback only). There are 10+ "Storm" text chips on rides, the m0 problem. | `v3d-m2/sheets/desktop-03.png` "02-500-guests-2d" | Apply the 3D pin rules (actionable states only) to the 2D renderer too. |
| N6 | **Rain reads as static.** The streaks are uniform, opaque white bars of equal length and spacing, which look like snow or TV noise, most visibly at night. | `desktop-night.png` (whole frame), `mobile-night.png` | Stretch the streaks along the camera-relative fall velocity, randomise length, vary alpha from 0.15 to 0.35, fade them with depth, and add small splash sprites on paving. |
| N7 | **The coaster track turns black at night** (continuing from m1, now more visible with lit lamps beside it). Lumber Run and the Ridge Runner are unlit silhouettes. | `desktop-night.png` (~820–1280,330–620; ~240–470,90–240) | Give the track material a small emissive floor (0.04–0.06), or let the hemisphere moonlight lift it. Add a lit lift-hill chain or edge LED strip as an option. |

---

## 1. Art (models, terrain, scenery): 6/10

**Observations**
- **The bug burn-down paid off in art.** The pool island is now an authored set piece with a tree, boulders and swim rings (`mobile-dusk.png`). The retaining walls are coursed stone blocks rather than poured concrete (`mobile-close.png` ~0–780,260–1100; `desktop-close.png` ~700–1000,330–500). Queue lanes have their own red-brick paving (`desktop-close.png` ~560–760,600–720; `mobile-coaster.png` ~410–620,850–940). Lumber Run now has a proper bent-and-ledger trestle (`desktop-crowd.png` right side), which is close in spirit to the `parkitect-2.jpg` lattice, but sparser and lighter.
- **The terrain is still terraces.** Every level change in `desktop-crowd.png`, `desktop-rain.png` and `mobile-crowd.png` is a flat green shelf joined by grey stair ramps and vertical walls. The walls are better material, but they are the same shape. In `desktop-start.png` and `desktop-spring.png`, gentle ground still shows the checkerboard of light and dark triangles (B13). Compare the sculpted slopes of `parkitect-4.jpg` (top right) and `parkitect-1.jpg`.
- **The plazas are still bare slabs.** The central plaza in `desktop-crowd.png` has a few benches, two lamps and four small planters (`desktop-close.png` ~380,655), and is otherwise empty concrete. `parkitect-4.jpg` paves nearly every free cell with flower beds, fences and lamps, and `parkitect-6.jpg` packs string lights, a pergola, arches, a fountain and shrubs into one frame. The stalls are unchanged coloured boxes with striped awnings.
- **The forest is a uniform carpet.** `desktop-vista.png` and `desktop-wide.png` show thousands of trees at one height and one spacing, with no clearings, understorey or species clusters, and the park sits in a rectangle cut out of it with straight grid edges. The novaculite outcrops are still pale crumpled shapes that read as snow (`desktop-spring.png` ~460–560,90–130; `mobile-start.png` ~440–620,470–560).
- **New model bugs undercut the gains:** the inverted train (N1) and the torn slide tubes (N2).

## 2. Lighting and shadows: 5/10

**Observations**
- **Weather now touches the light, a little.** Storm frames lose their hard tree shadows and are about 20% darker (`desktop-rain.png` vs `desktop-palette.png`). That is the right direction, but the colour response is unchanged: grass is still saturated lime and the plazas are still bright, there is no grey sky (none is ever in frame), and there is no fog or wet sheen. A player would still call it a sunny day with rain drawn on top.
- **Night got better.** In `desktop-night.png`, the lamps now bloom into soft halos, the station canopies carry bulb strings with a lit platform (B4 fixed), and the carousel, Ferris wheel, swing and drop-tower chasers are emissive. It remains the best state in the game. The coaster track is still a black silhouette (N7), and the pools are still dark flat rectangles; compare the lit pool underlights in `pc2-5.jpg`.
- **The golden hour fails** (N3). `desktop-vista.png` at 7:49 pm is dim olive with no warm key, no rim light and no sky. It is darker, not warmer. `desktop-dusk.png` (7:37 pm, rain) is lit the same as 4:24 pm. Compare the pink sky over the whole scene in `rct3-4.jpg`.
- **There is still no AO and the tone is flat.** Stalls, ride bases and wall feet meet the ground without contact darkening (`desktop-close.png`). The sunny frames (`desktop-palette.png`, `desktop-fall.png`) are washed out, with the plazas near white.

## 3. Animation and game feel (judged from stills): 5/10

**Observations**
- **Guests react to weather.** Umbrellas in at least six colours appear in every rain and storm shot (`desktop-close.png`, `mobile-crowd.png`, `desktop-night.png`). Paired with the "I'm getting soaked" thought (`desktop-guest.png`), this is a genuine, readable system cue, and the best single addition in m2.
- **There are riders everywhere, but the headline ride is broken.** Flat rides carry riders: the ship, swings, carousel horses, bumper cars and the drop-tower ring (`desktop-close.png`). The Ridge Runner train now has riders, but they hang head-down under the inverted cars (N1). That turns the hero shot into a blooper.
- **Water is half there.** The flume carries water but no logs or boats. The body slides end in flat pads with no splash (`desktop-close.png` ~760–940,560–700). The wave pool has one swimmer and static rings, and still no waves. Compare `pc2-1.jpg`, where swimmers, foam and splash fill the whole pool.
- **The rain streaks look like static** (N6), and there is no lightning, splash or puddle cue. The steam vent (`desktop-night.png` ~495,295) is still the only ambient particle effect, and it is still good.

## 4. UI: 7/10

**Observations**
- **The emoji are gone.** The toolbar is now a consistent set of painted, slightly vintage icons (a magnifier, paving, a carousel, a coaster, a slide, a stall, a tree, terrain, a bomb, a broom and a clipboard) on cream tiles (`desktop-palette.png` bottom bar, `mobile-start.png`). It matches the poster palette and reads well. This closes m1 gap 13.
- **Queue badges are honest.** "+41 in line" with a people icon (`desktop-coaster.png`, `mobile-coaster.png`) fixes the ambiguous "+N" money-popup read.
- **The toasts are calmer.** Usually there is one, sometimes two (B14 partly). There is still no count, collapse or log.
- **The panels are still web forms.** The Guest panel has no portrait or mini-view. The rides list still cuts off its last card with no affordance (B15). There are still no heatmaps, overlays or minimap anywhere; compare the `pc2-4.jpg` Heatmaps button and the zone tint in `parkitect-5.jpg`.

## 5. Typography: 6/10

**Observations**
- **The display and body pairing holds up well,** in the title lockup, the HUD park name, and panel titles over a humanist body face with teal small caps ("GENTLE", "THOUGHTS"). This is unchanged from m1, and good.
- **The badges are fixed.** "+41 in line" is legible at 1280 px and on the phone (`mobile-coaster.png`). The gate board now reads "OUACHITA HILLS FUN PARK" in white on navy at start zoom (`desktop-start.png` ~405–480,400–460).
- **Ride signs are still illegible.** The black slab sign boards on the swing ride, the carousel and the bumper-barn arrow (`desktop-close.png` ~265–340,440–470 and ~670–735,395–410; `mobile-close.png` ~450–560,830–870) show dot lights and no words.
- **The mobile HUD wraps unpredictably.** It goes to three rows in `mobile-fall.png` (B16). That is a layout fault, but it reads as sloppy type.

## 6. Readability (guests, rides, queues, paths, status): 6/10

**Observations**
- **Queues finally read.** Brick-red queue paving, post-and-rope fencing and the "in line" badge (`desktop-close.png`, `mobile-coaster.png`) make waits legible. This is close to the red-and-white queue lanes of `parkitect-4.jpg`, though the lanes are short and lack switchbacks.
- **Umbrellas reveal crowd flow** in rain from strategy zoom: you can see the river of guests along the hill paths (`desktop-crowd.png` ~690–900,250–330). Guests in good weather still read as people at default zoom.
- **The selected guest is still invisible** (B1). Follow mode frames the drop tower, not the guest.
- **The carousel and swing queues still blob** on plaza concrete (`desktop-crowd.png` ~280–560,380–560), because only some queues got the brick treatment. Status pins are restrained now, with "Broken" chips only (`desktop-guest.png`, `desktop-vista.png`). Keep that.

## 7. Mobile: 5/10

**Observations**
- **The chrome footprint is unchanged.** The HUD takes 0–262 px (15.5%), including a whole row for play and speed, and the toolbar takes 1445–1688 (14.4%), so about 30% of a 1688 px screen is chrome. The persistent toast (1365–1425) covers the bottom of the map in `mobile-crowd.png`, `mobile-wide.png`, `mobile-vista.png` and `mobile-coaster.png`.
- **The sheets still cover about 52%** (`mobile-guest.png` and `mobile-palette.png`, 555–1430), with no peek or half state. The toast no longer covers the button (B8), but the button is now clipped by the sheet edge (N4).
- **The selection stays above the sheet,** but the tower hides it (B1).
- **The type and touch targets remain large and accessible,** and the painted icons are crisp at phone scale (`mobile-start.png`). The HUD reflow got worse (B16).

## 8. Authenticity (forested Ouachita ridges, Hot Springs, Arkansas): 5/10

**Observations**
- **Climate and forest are right.** It is 76°F in October (B12 fixed), with orange and red hardwoods among pines in fall (`desktop-fall.png`), and dogwood and redbud in April (`desktop-spring.png`). The seasonal swap remains a signature.
- **The ridges still live on the title screen.** `desktop-title.png` and `mobile-title.png` show long, faceted, forested ridgelines, which is exactly the right read. In play, even the zoomed-out vista shows a flat forest carpet with one ridge in the top-left corner (`desktop-vista.png` ~0–330,55–170) and no sky. Compare `pc2-5.jpg` (silhouetted ridges against the sky) and `rct3-1.jpg` (hills to the horizon). The park still sits on flat shelves, not on a hillside.
- **The stone retaining walls nod to CCC native-stone work.** That is the first Hot Springs material cue in the world besides the steam vent and the Lookout Tower. There are still no timber pavilions, bathhouse-style facades, thermal fountain or lake, and the stalls are generic carnival boxes.

---

## Ranked gap list (most important first)

| # | Gap | Why it matters | Concrete fix (three.js / WebGL, small team) |
|---|---|---|---|
| 1 | **Coaster train orientation (N1, B6) and slide-tube tearing (N2)** | The hero ride ships upside down with riders hanging head-first. It is the first thing a reviewer or player will screenshot. | Store an explicit up or bank vector per track sample instead of Frenet normals. Per car, set `T = curve.getTangentAt(u)` and `U = applyAxisAngle(worldUp, T, bank)`, re-orthogonalise, then `car.matrix.makeBasis(...)` and `car.matrixAutoUpdate = false`. Place the bogies at two arc-length samples and aim the car between them. Reuse the same frame code for the slide-tube sweep and close its seam. Add a harness check that renders `review3d` "train" and asserts that the car's world-up `y > 0`. |
| 2 | **Selected guest hidden (B1)** | Follow mode is the main way to read a guest. Right now it frames a tower. | Draw the selected guest in a second pass with `depthTest:false`, a 0.35-alpha flat colour and `renderOrder` 999 (an x-ray silhouette). Put the ring on the guest's ground height with `polygonOffset`. When following, raycast from the camera to the guest, and if a ride occludes it, orbit the camera's azimuth in 15° steps until the guest is visible. |
| 3 | **Weather and time grading (B2 partly, N3)** | Storms and dusk still look like summer noon. Weather is a core system, and the golden hour is a free beauty shot that currently looks broken. | Add a full-screen colour-grade pass (`ShaderPass` with saturation, contrast, lift/gamma/gain or a 32³ LUT) keyed by the `LightRig`. For storms: saturation 0.6, contrast 0.9, a cool tint, `FogExp2` density ×3 in blue-grey, a dark gradient sky dome, a lightning flash every 8–20 s (100 ms exposure spike), and paving roughness 0.3 with an env-map sheen. For golden hour: see N3. For overcast rain, use the same at half strength. |
| 4 | **Terrain: terraces and checkerboard facets (B13)** | Terraces defeat the "hillside park" premise, and the facets expose the grid on every lawn. | Render a welded heightfield with `computeVertexNormals()` over shared vertices. Add low-frequency albedo noise in `onBeforeCompile` (two octaves of world-space value noise, ±8% luminance) and slope-based blends (grass, then leaf litter, then sandstone or novaculite). Replace vertical walls with 1:1.5 embankments wherever the next cell is free, and keep the stone walls only where space forces them. |
| 5 | **Sky and horizon during play** | The best authenticity asset, the ridges, only appears on the title screen. The vista proves the board is a flat carpet. | Use a gradient sky dome tied to the `LightRig`. Ring the board with three low-poly ridge silhouette meshes at 2–4× board radius in height fog. Allow 5–8° more camera tilt at mid and far zoom so that 10–15% of the frame is sky. |
| 6 | **Bare plazas and stall boxes** | Density is what makes `parkitect-4/6` look finished. Bare slabs make the park look unfinished whatever the polygon count. | Build an instanced prop kit: flower beds, low stone walls, string lights between lamps, planters, bins, shade trees in grates, and picnic tables. Auto-dress plaza edges and free plaza cells (toggleable). Give the plaza warm stone pavers, distinct from path concrete. Add facade skins over the stall boxes (see gap 9). |
| 7 | **Water: creek staircase (B9), flat pools, dry flume (B10 partly)** | Water fills a large share of every frame and reads as paint. | Build the creek as a Catmull-Rom ribbon through cell centres, with lowered bank vertices. Use one water material: two scrolling normal maps, fresnel, a shallow-depth tint with a pool-tile texture, and edge foam. Give the wave pool vertex-sine displacement. Add instanced log boats with riders to the flume, plus a 150-point splash burst at drops and slide exits. |
| 8 | **No AO; flat, washed-out tone** | Contact shadows and tone are the cheapest lift for every frame. | Switch to `AgXToneMapping` with exposure tuned so plazas sit at about 85% luminance. Add N8AO at half resolution, with a quality toggle for mobile. Add a light vignette. |
| 9 | **No Hot Springs architecture** | Authenticity is a stated goal, and the stone walls are the only cue added in m2. | Build a facade kit as skins over the existing stall and station boxes: CCC-style native-stone pavilions with timber trusses for coaster stations, bathhouse-style stucco shop fronts with arched windows and tile roofs (fictional names), a thermal fountain built around the steam vent, and a stone park gate. |
| 10 | **Mobile chrome, sheets and HUD reflow (B15, B16, N4)** | About 30% of the screen is chrome before any sheet, and about 52% more when a sheet is open, and the HUD layout jumps between states. | Use one HUD row: cash, guests, rating, time and a single play/speed cycle button, with weather as an icon. Use a fixed CSS grid with `minmax` slots so nothing wraps. Give sheets three snap states (peek at 22%, half at 45%, full) with a drag handle, a sticky action footer and safe-area padding. Add a fade mask and scrollbar gutter to the rides list. Collapse toasts into a "3 new" chip on mobile. |
| 11 | **Night and rain polish (N6, N7)** | Night is the best state, but black tracks and static-like rain cheapen it. | Give track materials an emissive floor plus optional LED edge strips. Add pool underlights (an emissive pool floor at 0.3). Use velocity-stretched rain streaks with random length and alpha and depth fade, splash sprites on paving, and a wet-paving roughness drop at night for lamp reflections. |
| 12 | **Concert white cubes (B11), illegible ride signs, forest uniformity** | These are the remaining "toy" and "bug" tells in otherwise good frames. | Remove the stage spotlight helpers or mount them on a truss, and verify on GPU. Render ride names to a `CanvasTexture` at an effective 12 px or more, with a CSS2D label fade-in at close zoom. For the forest: 0.7–1.4× scale and lean jitter, species clusters, occasional clearings, instanced shrubs and ferns, pine branch whorls, and darker, warmer outcrops with a moss tint so they stop reading as snow. |

---

## What must be kept

1. **Umbrellas in rain** (`desktop-close.png`, `mobile-crowd.png`). This is the clearest weather and system cue in the game. Extend it with ponchos and a faster walk.
2. **The painted toolbar icon set** (`mobile-start.png`, `desktop-palette.png`). It is consistent, on-palette and legible. Extend it to the panel headers and the Park menu.
3. **The "+N in line" badges with the people icon, and the red-brick queue paving** (`desktop-coaster.png`, `desktop-close.png`). Roll the paving out to every queue.
4. **The stone retaining walls.** Keep the material even when embankments replace most of the walls.
5. **The authored wave-pool island** (`mobile-dusk.png`) and the **watered flume trough**.
6. **The Lumber Run trestle** (`desktop-crowd.png`). Densify it towards `parkitect-2.jpg`, but keep the timber colour.
7. **The night lighting language:** bulb strings on canopies and stations, the drop-tower chaser, blooming lamp halos and a legible moonlit ambient (`desktop-night.png`).
8. **The flat-ride models and their silhouettes** (carousel horses, swing chairs, Ferris gondolas, ship, drop-tower ring), all with riders.
9. **The seasonal forest** (`desktop-spring.png`, `desktop-fall.png`) and the **climate-correct HUD** (76°F in October).
10. **The title screen,** with its lockup over forested ridges (`desktop-title.png`, `mobile-title.png`).
11. **The restrained status pins** ("Broken" only), and the **shadow suppression in storms**. Build the grading pass on top of them rather than replacing them.
12. **The panel information design** (guest stat bars and thoughts, ride stats, price steppers), the **history album and fictional-park disclaimer**, and the **large accessible mobile type and the text-size option** (`v3d-m2/sheets/desktop-03.png` "02-large-text").
