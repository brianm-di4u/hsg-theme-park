# Spa City Thrills: adversarial visual review, 3D milestone 1 (m1)

Reviewer stance: independent and hostile. Scores compare the game with the best benchmark in each dimension (10 = on par). The scale matches `REVIEW-before.md` (old 2D: art 3, lighting 2, animation 2, UI 5, typography 5, readability 4, mobile 4, authenticity 3).

**Sources reviewed**
- GPU review shots, all opened at full size: `screenshots/review3d-m1/desktop-{title,start,crowd,close,wide,night,dusk,rain,fall,spring,palette,guest,coaster}.png` and the 13 matching `mobile-*.png`. I upscaled 2–4× crops of the coaster station (`desktop-coaster`), the selected guest (`desktop-guest`), the night plaza (`desktop-night`), the wave pool (`desktop-crowd`), the Lumber Run supports (`desktop-crowd`, right side), the flume (`desktop-crowd`, top centre), the rain crowd (`desktop-rain`) and the bumper-barn queue (`desktop-close`).
- Software-render contact sheets: `screenshots/v3d-m1/sheets/desktop-01..09.png` and `mobile-01..06.png`. These are older than the GPU shots, and some status pins have changed since.
- Benchmarks, all 24 opened: `pc2-1..6`, `pc1-1..6`, `parkitect-1..6`, `rct3-1..6`.

**Fair comparison note.** As before, the stylised low-poly look of Parkitect (`parkitect-2/4/6`) is the right target for this camera and art direction. Planet Coaster sets the ceiling for lighting and feel, but it is not a realistic target for a browser game.

**Headline.** This is a real step up. It is now a genuine 3D park with sun shadows, recognisable flat rides with riders, a believable pine and hardwood forest, and night lighting that works. It no longer reads as a prototype. It still reads as a clean *toy diorama* rather than a *place*, though. The terrain is a grid of concrete terraces, the plazas are empty slabs, the weather does not touch the light, the coaster trains are empty, and the flume has no water. There are also a handful of visible bugs, listed below, that a reviewer would screenshot.

---

## Score table

| Dimension | Before | **m1** | One-line verdict |
|---|---|---|---|
| Art (models, terrain, scenery) | 3 | **5** | Flat rides are now recognisable models and the forest is convincing. Terrain is grid terraces, plazas are bare and the stalls are boxes. |
| Lighting and shadows | 2 | **5** | A real sun with soft cast shadows, and good night lamps. Weather and dusk do not change the light, there is no AO, and the image is washed out. |
| Animation and game feel (from stills) | 2 | **4** | Riders appear on flat rides, and there are crowds and steam. Coaster trains are empty, the flume is dry, and there are no splashes, umbrellas or blur. |
| UI | 5 | **6** | Ride thumbnails, toasts moved to a corner, icon pins. Still emoji tool icons, web-form panels and no overlays. |
| Typography | 5 | **6** | Display and body faces are now paired in the HUD and panels. In-world signs are illegible and the "+N" badges are ambiguous. |
| Readability (guests, rides, queues, paths, status) | 4 | **5** | Guests read as people and rides are distinct. Queues blob, path, plaza and queue paving are identical, the selection marker is hidden, and storm pins spam. |
| Mobile | 4 | **5** | Selection is framed above the sheet. Chrome is still about 28%, sheets about 52%, and a toast covers a sheet button. |
| Authenticity (Ouachita ridges, Hot Springs) | 3 | **5** | Correct forest mix, dogwood, redbud and fall colour, a creek, novaculite outcrops and ridges on the title. In play it is a flat grid with no Hot Springs architecture. |

**Overall: about 5.1 / 10, up from about 3.5.** It is now a competent stylised 3D builder. To reach Parkitect level it needs one pass on terrain and set dressing, a weather and lighting state machine, and the bug list fixed.

---

## Visual bugs (top priority; fix before any new features)

| # | Bug | Where (file, approx. px) | Likely fix |
|---|---|---|---|
| B1 | **The selected-guest marker floats in mid-air, and the guest is hidden behind the drop tower.** The yellow ring and inverted-triangle pin sit beside the drop-tower column with no guest under them. Guest #1 is occluded by the tower. | `desktop-guest.png` (~630,365–405); `mobile-guest.png` (~385,475–540) | Project the ring onto the guest's ground height, not a fixed Y. When the guest is occluded, draw an x-ray silhouette (a second pass with `depthTest:false` at low alpha) and keep the pin `depthTest:false`. Auto-orbit or pan the camera so the subject is unoccluded when "Follow" starts. |
| B2 | **Storms and rain are lit like a cloudless noon.** The HUD says "Storms 84°F" and "Storms 78°F", yet hard sun shadows fall from every tree and ride. The only storm cue is thin rain streaks. | `desktop-crowd.png`, `desktop-close.png`, `desktop-wide.png`, `desktop-rain.png`, `mobile-rain.png` | Drive sun intensity, shadow opacity, hemisphere colours, fog and a colour-grade LUT from weather (see gap 1). |
| B3 | **A green pyramid spike sticks up through the middle of the wave pool.** A square green base with a dark faceted cone sits in the pool, reading as a terrain vertex that was never flattened or as a broken island mesh. | `desktop-crowd.png` (~640,690–735), `desktop-palette.png` (~640,700), `mobile-crowd.png` (~390,1330–1400), `mobile-rain.png`, `mobile-night.png` (~390,1350) | Flatten terrain under the pool footprint before building the pool mesh, or replace the island with an authored island model (rock, palm-free Ouachita boulders, a lifeguard chair). |
| B4 | **Glowing white orbs float on top of coaster-station roofs** at dusk and night. They look like a light-helper or lamp sprite placed at roof height. | `desktop-night.png` (~205,240; ~950,290; ~940,608); `desktop-dusk.png` (~950,290; ~940,608) | Put station lamps under the canopy as emissive fixtures, and use the pooled-light decal on the platform, not a billboard glow above the roof. |
| B5 | **A pine grows through the front of the Ridge Runner station roof and into its queue pen.** Scenery is not cleared from the ride, station or queue footprint. | `desktop-coaster.png` (~620–660, 290–440); `mobile-coaster.png` (~380–420, 600–930) | When a ride, station, queue or path is placed, remove or relocate trees whose trunk *or canopy radius* intersects the footprint plus a 0.5-cell margin. |
| B6 | **The coaster train looks detached from its rails at the station exit.** The three yellow and navy cars sit pitched below the red rails that run behind them, with a bare white post under the middle car. All the cars are empty while 41 guests wait. | `desktop-coaster.png` (~535–640, 350–425); `mobile-coaster.png` (~180–380, 740–880) | Check the car transform at the station-to-track transition: sample both position and tangent from the same spline and apply bank or pitch per car bogie. See gap 3 for riders. |
| B7 | **Orphan support stubs.** Short brown posts stick out of the grass under Lumber Run with no track above them. | `desktop-crowd.png` (~1075,360; ~1180,520; ~1230,545; plus several near 1060–1280, 340–560) | Generate supports only from track samples: cast each one down from the track to the terrain, and drop any support whose top is not attached to a track tie. |
| B8 | **The toast covers the "Stop following" button** at the bottom of the mobile guest sheet. | `mobile-guest.png` (y ≈ 1385–1450) | On mobile, anchor toasts above the sheet's top edge or inside the HUD, or suppress them while a sheet is open. |
| B9 | **The creek is a grid staircase.** The blue channel zig-zags in 1-cell steps with hard cut edges. | `desktop-wide.png` (~480–1200, 240–560); `desktop-spring.png` (~600–1280, 140–440); `mobile-wide.png` | Render water as a smoothed spline ribbon (Catmull-Rom through the cell centres), with bank vertices lowered along it, even if the logic stays cell-based. |
| B10 | **The log flume is dry.** The trough reads as a brown fence ribbon on posts, with no visible water and no boats. | `desktop-crowd.png` (~700–900, 100–200); `desktop-wide.png` (~500–560, 300–340) | Use a U-trough cross-section with an inner water strip (scrolling normal-map material) and log boats with riders. Add a splash burst at the drop. |
| B11 | **The amphitheatre has floating white cubes in the night sky** (software sheet). | `v3d-m1/sheets/desktop-06.png`, "05-concert" tile (~1215,148; ~1122,188) | Attach the stage spotlights to a truss, or remove them. Verify on GPU. |
| B12 | **95°F and sunny in October.** The HUD shows "Sat October 2026, Sunny 95°F". Hot Springs' normal October high is in the mid-70s °F. | `desktop-fall.png`, `mobile-fall.png` | Clamp the review-harness weather to the climate table for the forced month (the game's own NOAA normals). |
| B13 | **Checkerboard facet shading on grass.** Alternating light and dark triangles expose the tile grid on gentle slopes. | `desktop-start.png` (centre), `desktop-spring.png`, `mobile-start.png` | Use smooth vertex normals across shared cells (compute normals on the welded heightfield) and add a low-frequency grass albedo noise. |
| B14 | **The desktop toast stack covers the gate and carousel.** Three toasts occupy the bottom-left of the play area, where the park entrance always sits. | `desktop-crowd.png`, `desktop-close.png`, `desktop-wide.png` (10–430, 625–725) | Collapse to a single line with a count ("3 new"), auto-expire after 4 seconds, and leave an opt-in log in the Park menu. |
| B15 | **Minor: the Rides list cuts off the last card** ("Whirlwind Boom") with no scroll affordance. | `desktop-palette.png` (~945–1260, 705–720) | Add a fade-out mask and a scrollbar gutter. |
| B16 | **Minor: the mobile HUD reflows between states.** The time chip jumps between row 1 and row 2. | `mobile-start.png` vs `mobile-crowd.png` vs `mobile-fall.png` | Use fixed-width HUD slots on mobile. |

---

## 1. Art (models, terrain, scenery): 5/10

**Observations**
- **The flat rides are now real models with recognisable silhouettes.** In `desktop-close.png` and `desktop-crowd.png` the carousel has horses under a striped canopy, the swing ride has chairs on chains, the Ferris wheel has spokes and coloured gondolas, and the spin cups, swinging ship, bumper barn (cars inside) and drop tower (rider ring at the top) are all identifiable from strategy zoom. This is the biggest improvement in the build. Compare `parkitect-4.jpg`: Parkitect's flat rides have more sub-parts (platform rims, fencing, lit crowns, operator booths), but the silhouettes are now in the same league.
- **The terrain is a grid of terraces with concrete retaining walls.** In `desktop-crowd.png`, `desktop-wide.png` and `mobile-crowd.png` the hillside is a set of flat green shelves joined by grey concrete stair ramps, with vertical grey walls at every level change. It is clean, but it reads as a parking structure, not a hillside. Slope only shows as a dark gradient on the left edge (`desktop-start.png`). Compare `parkitect-1/5.jpg` (faceted rock cliffs and sculpted mesas) and `rct3-1.jpg` (rolling ground under the park).
- **The plazas are bare slabs, and the stalls are boxes.** The central plaza in `desktop-crowd.png` is uniform pale concrete with nothing on it but guests and ride footprints: no planters, flower beds, lamp rows, bins, fountains or fences (one bench and one lamp in `desktop-close.png`). The stalls are coloured boxes with a striped awning and a black sign board. Compare `parkitect-6.jpg`, which has a fountain, flower beds, a pergola, statues, stone walls, string lights and benches in one frame, and `parkitect-4.jpg`, with flower beds lining every path.
- **The forest is good but uniform.** The faceted pines and round hardwoods in `desktop-start.png`, `desktop-spring.png` and `mobile-spring.png` are a believable mixed stand and cast shadows. However, every tree is the same height and spacing, the trunks are long bare sticks (the "lollipop on a pole" look), and there is no understorey, so the floor reads as lawn. The rock outcrops (`desktop-start.png` ~700,210; `desktop-wide.png` ~430,215) are near-white crumpled shapes that read as snow piles or paper.

**What the benchmarks do better.** They have ground that is sculpted rather than terraced, 10× the set dressing per square metre, themed building facades, and tree models with varied scale, crown shapes and undergrowth.

## 2. Lighting and shadows: 5/10

**Observations**
- **There is a real key light with soft cast shadows.** Trees throw long shadows across the lawns in `desktop-start.png`, `desktop-coaster.png` and `desktop-spring.png`, and rides shadow the plaza in `desktop-close.png`. Objects are now grounded. This was the number-one gap and it is half-closed.
- **Weather and time of day do not change the light (bug B2).** "Storms" in `desktop-crowd.png` and `desktop-rain.png` is lit identically to "Sunny" in `desktop-palette.png`. "7:37 pm" in `desktop-dusk.png` looks like 4 pm in `desktop-crowd.png`, with only a faint glow under one lamp. There is no golden hour, overcast desaturation or wet sheen. Compare `rct3-4.jpg` (pink sunset sky tinting the whole scene) and `pc2-5.jpg` (red dusk sky with silhouetted ridges).
- **The night works.** `desktop-night.png` and `mobile-night.png` show emissive bulb strings on the carousel, swing, Ferris wheel and Lookout Tower drum, a pink chaser on the drop tower, warm pooled light under lamps, and a moonlit blue ambient that keeps geometry legible. However, there is no bloom, the pools are flat dark rectangles, the coaster track goes black, and there are floating glow orbs (B4). Compare `pc2-5.jpg`, with lit pool underlights, glowing glazing and warm path lamps everywhere.
- **The image is flat, washed out and has no AO.** The pale plazas clip towards white (`desktop-palette.png` centre), and contact shadows under stalls, ride bases and terrace walls are missing, so the walls read as cardboard. Contrast is low across the board.

**What the benchmarks do better.** A lighting state driven by weather and time, an ambient-occlusion term, bloom on emissives, a filmic tone curve, and a visible sky.

## 3. Animation and game feel (judged from stills): 4/10

**Observations**
- **Flat rides now carry riders.** There are riders in the swing chairs (`desktop-close.png` ~270–360,230–290), in the ship (`desktop-crowd.png` ~500,615), on the drop-tower ring (`desktop-guest.png` ~620,210) and in the bumper cars (`desktop-close.png` ~580,455). The Ferris gondolas are coloured but no riders show at this zoom.
- **The coaster trains are empty.** The Ridge Runner train in `desktop-coaster.png` has no riders while "+41" queue. The Little Bear cars (`desktop-crowd.png` ~830–910,600–640) and the Ridge Runner train in the orange station (`desktop-crowd.png` ~930–1030,325–355) are also empty. The headline ride shows no life. Compare `rct3-5.jpg` and `pc2-2.jpg`, where rows of riders have their arms up.
- **There are no water cues.** The flume is dry (B10). The two body slides are bare tubes that end in flat blue pads with no splash (`desktop-close.png` ~760–940,430–680). The wave pool is flat cyan with static rings and one swimmer. Compare `pc2-1.jpg`, where swimmers, foam and splash spread through the whole pool.
- **The crowd is dense but static and unresponsive to weather.** Hundreds of guests mass at the carousel and bumper barn (`desktop-close.png`), but in heavy rain (`desktop-rain.png`, crop ~360–700,330–640) there are no umbrellas, no ponchos and no hurrying, while Guest #1's own thought is "I'm getting soaked" (`desktop-guest.png`). The steam vent at the plaza (`desktop-night.png` ~490,290) is the only particle effect, and it is a good one.

**What the benchmarks do better.** Riders on every vehicle, water and splash on every water ride, props and reactions in the crowd, and spectacle (`pc1-2.jpg` fireworks).

## 4. UI: 6/10

**Observations**
- **The ride palette now has rendered thumbnails.** `desktop-palette.png` and `mobile-palette.png` show a 3D icon per ride with intensity, footprint and height chips and a right-aligned price. This is a clear improvement on the text-only list. It is still a single vertical list per category, though, not the dense filterable grid of `pc2-4.jpg`.
- **Notifications have moved to the bottom-left and status is icon-only.** Toasts are no longer top-centre, and the storm chips are now small bolt icons (`desktop-rain.png`). But the toast stack still covers the park gate (B14), and there are 14 bolt pins in `desktop-rain.png`, one on nearly every tall ride, which is still spam.
- **The toolbar still uses emoji icons.** 🔍 🎠 🎢 🌊 🍴 🌲 ✕ 👷 📋 in every shot render inconsistently and clash with the faceted 3D art. Parkitect (`parkitect-3/5.jpg`) uses a single consistent pictogram set.
- **The panels are still web forms.** The Guest panel (`desktop-guest.png`) is well organised, but it has no portrait, no mini 3D view of the guest and no map link. There are no heatmaps, overlays or minimap anywhere. Compare the `pc2-4.jpg` Heatmaps button and the `parkitect-5.jpg` zone tint.

**What the benchmarks do better.** A consistent icon set, grid palettes with filters, analytic overlays, portraits, and in-world build gizmos.

## 5. Typography: 6/10

**Observations**
- **There is now a deliberate pairing.** The geometric display face (the "SPA CITY / THRILLS" lockup, the "Ouachita Hills Fun Park" HUD name, and the panel titles "Rides" and "Guest #1") sits over a humanist sans body with clear weights. The section caps "GENTLE", "THRILL" and "THOUGHTS" in teal give hierarchy (`desktop-palette.png`, `mobile-guest.png`).
- **The title lockup is still strong, and the title screen improves on it.** In `desktop-title.png` the lockup sits over a 3D panorama of the park and forested ridges. The footer disclaimer now has a dark scrim and is readable, which fixes the old contrast fail.
- **In-world type is illegible.** The entrance-gate name board (`desktop-start.png` ~440,430; `mobile-start.png` ~40,880) and every ride sign board (black slabs with dot lights, e.g. `desktop-close.png` ~700,420) are unreadable at every zoom.
- **The "+35", "+41" and "+77" badges are ambiguous.** It is unclear whether they are income, queue overflow or riders (`desktop-coaster.png`, `desktop-fall.png`). With no unit or icon, they read as money popups.

**What the benchmarks do better.** Modelled signage that is legible at gameplay zoom (`rct3-4.jpg`), and clean billboard labels for zones (`parkitect-5.jpg`).

## 6. Readability (guests, rides, queues, paths, status): 5/10

**Observations**
- **Guests read as people.** At default zoom (`desktop-close.png`, `mobile-close.png`) they have heads, varied skin and hair, coloured shirts and dark legs, a big improvement on specks. At `desktop-wide.png` they are still dots, which is acceptable.
- **Rides are distinct from above.** The teal and white stripes, the yellow and white slide-tower parasol, the red barn roof and the white drop tower all pop. Keep this.
- **Queues are still hard to read.** Some queues have post-and-rope fences (`desktop-close.png` ~430–560,560–650), but most guests waiting at the carousel, swings and bumper barn form undifferentiated blobs on the same pale concrete as paths and plazas (`desktop-crowd.png`). The paving does not distinguish queue, path and plaza. Compare the red-and-white queue lanes of `parkitect-4.jpg`.
- **The selection marker and status pins.** The selected guest is hidden (B1). The storm bolt pins (`desktop-rain.png`) repeat what the HUD already says. The "Broken" chip (`desktop-guest.png` ~560,424) is good and actionable.

**What the benchmarks do better.** Queue-specific art, varied paving, clustered pins for actionable states only, and zone tints.

## 7. Mobile: 5/10

**Observations**
- **The selection stays framed above the sheet.** In `mobile-guest.png` the guest pin sits in the visible strip above the sheet, which is the old complaint fixed in principle (B1 still hides the guest itself).
- **The chrome is still heavy.** The HUD takes 0–255 px (15%) of 1688, including a whole row for play and speed. The 2×6 toolbar takes 1470–1688 (13%). A toast adds 1385–1450. That leaves about 68% for the map with no sheet open (`mobile-crowd.png`).
- **The sheets cover about 52%** (`mobile-guest.png` and `mobile-palette.png`, 580–1450), with no peek or half state visible, and the toast covers the "Stop following" button (B8).
- **Type and touch targets are large and accessible,** and the palette cards with thumbnails work well at phone width (`mobile-palette.png`).

**What the benchmarks do better.** The standard here is good mobile builders: a one-row HUD, a collapsible tool rail, draggable half-height sheets, and toasts that never cover controls.

## 8. Authenticity (forested Ouachita ridges, Hot Springs, Arkansas): 5/10

**Observations**
- **The forest is right.** Shortleaf-style pines mixed with hardwoods, white dogwood and pink redbud in April (`desktop-spring.png`, `mobile-spring.png`), and orange and red hardwoods among evergreen pines in October (`desktop-fall.png`) are correct for the Ouachitas, and the seasonal swap is excellent. The pale outcrops nod to novaculite, and the creek through the woods (`desktop-wide.png`) fits.
- **The ridges exist only on the title screen.** `desktop-title.png` shows long, rounded, forested ridgelines, which is exactly the right read. In play, the camera never sees beyond the board, and the park sits on flat terraces (`desktop-crowd.png`). The premise "build a hillside park" is not visible in the playfield. Compare `rct3-1.jpg` (hills to the horizon) and `pc2-5.jpg` (silhouetted ridges behind the park).
- **There is no Hot Springs material culture.** Stalls are generic carnival boxes, retaining walls are poured concrete, and rides are generic primary colours. The steam vent (`desktop-night.png`) and the Lookout Tower (a nod to a mountain observation tower) are the only place cues. There is no CCC-style native-stone masonry, no timber pavilions, no bathhouse-style facades, and no lake.
- **The climate is wrong in the fall shot** (B12, 95°F in October).

**What the benchmarks do better.** A theme expressed through materials, buildings, props and horizon (`pc1-2.jpg` Western street, `pc2-3.jpg` medieval harbour, `parkitect-5.jpg` Frontierland mesas).

---

## Ranked gap list (most important first)

| # | Gap | Why it matters | Concrete fix (three.js / WebGL, small team) |
|---|---|---|---|
| 1 | **Fix the bug list (B1–B10 first)** | A floating marker, a pyramid in the pool, glowing orbs on roofs, a tree through a station and dry flumes are the things players screenshot. They undo the credibility the 3D pass bought. | Run a one-sprint bug burn-down. Add a visual regression check to the harness: screenshot known scenes and diff against approved baselines, at the same `review3d` camera positions. |
| 2 | **Lighting ignores weather and time of day** | Weather is a core system (it closes rides and cuts arrivals) but is invisible. Dusk, a free mood moment, is wasted. | Build a `LightRig` with keyframes {sun dir/colour/intensity, hemi sky/ground, fog colour/density, shadow opacity, exposure, LUT} for dawn, noon, golden hour, dusk, night, overcast and storm, and lerp by clock and weather. In storms set the sun to 15–25%, shadow opacity to 0.2, raise fog and use a cool desaturated LUT, with occasional lightning (a 60 ms exposure spike plus a directional flash). In rain, multiply roughness down and add a screen-space wet sheen on paving. |
| 3 | **Coaster and flume trains carry no riders, and water rides have no water** | Coasters are the headline feature. Empty trains read as a broken ride. | Reuse the instanced seated-rider mesh from the flat rides, with two per row parented to each car. Add an arms-up pose on drops (vertex-shader blend driven by track pitch). Give flumes a U-trough with a water strip (scrolling normal map plus fresnel) and log boats. Add a GPU splash burst (about 200 points) at flume drops and slide exits, plus a white foam decal ring. |
| 4 | **Terrain reads as concrete terraces, not a hillside** | It defeats the "hillside park" premise and the Ouachita identity. | Keep the cell logic but render a *welded* heightfield with smooth normals (fixes B13). Replace the vertical grey walls with sloped embankments where the grade allows, and with native-stone retaining walls (tiling stone texture or instanced rock-block mesh) elsewhere. Add slope-based shading: grass, then leaf litter and dirt, then sandstone or novaculite rock on steep faces. Seed sandbox maps with east–west ridge profiles. |
| 5 | **The flat, washed-out image has no AO** | Walls and stalls look pasted on, and pale plazas burn out. This is cheap to fix and lifts every frame. | Switch to AgX or ACES tone mapping, then set exposure so the plazas sit around 85% luminance. Add N8AO or GTAO (half resolution, mobile toggle). Add selective bloom (`UnrealBloomPass` on an emissive layer) for night bulbs. Add a subtle vignette and a per-season LUT. |
| 6 | **Plazas and paths are bare; there is no set dressing** | Density is what makes Parkitect look finished. Empty slabs make the park look unfinished at any polygon count. | Add an instanced prop kit: lamps, benches, bins, planters, flower beds, low stone walls, string lights between lamp posts, and shade trees in tree-grates. Auto-dress paths procedurally: a lamp every N cells, a bin near every stall, flower-bed edging on plaza borders, all toggleable. Give paving three materials: plaza (warm stone pavers), path (asphalt with curbs) and queue (coloured brick). |
| 7 | **No Hot Springs architecture or theming** | Authenticity is a stated goal, and the place lives only in text. | Build an original scenery and facade kit: native-stone CCC-style pavilions with timber trusses, bathhouse-style stucco shop fronts with arched windows and tile roofs (fictional names), a thermal-water fountain with steam (the existing vent, upgraded), wrought-iron lamps and a stone park gate. Apply them as skins over the existing stall boxes so the logic is unchanged. |
| 8 | **Queues are unreadable** | Wait times and crowd flow are the main management feedback. | Make queues a distinct path type with coloured paving, instanced stanchions and rope (already partly there), and auto switchbacks in a queue pen. Pack queued guests in single file along the queue spline instead of a blob. Show the wait time as a small billboard at the queue entrance. Clarify the "+N" badges with a person icon (queue overflow) or "$" (income). |
| 9 | **No horizon or sky during play** | The best authenticity asset (the ridges) is invisible after the title screen. | Allow a little more camera tilt at mid and close zoom so the top of the frame shows sky. Ring the board with 3–4 low-poly ridge silhouette meshes in exponential height fog (blue-grey aerial perspective). Add a gradient sky dome tied to the `LightRig`. At wide zoom, fade the board edge into forest cards. |
| 10 | **Status pins still spam** | Fourteen identical bolts in `desktop-rain.png` bury the rides. | Show weather only in the HUD. Pin only actionable states (broken, closed by you, long queue, unhappy). Cluster pins in screen space at wide zoom with a count badge, and expand them on hover or tap. |
| 11 | **Mobile chrome and sheets are too large** | About 32% of the phone is chrome before any sheet, and about 52% when a sheet is open. | Merge play and speed into one cycle button on the HUD row, and drop the third row. Turn the toolbar into a single horizontally scrolling rail (6 visible). Add three sheet snap states (peek at 20%, half at 45%, full) with a drag handle. Keep toasts above the sheet or in the HUD (B8). |
| 12 | **Guests do not react to the world** | Weather and mood are invisible on the guests themselves. | Use per-instance prop slots: an umbrella or poncho in rain, a balloon, a drink or a food tray after a purchase, and a mascot hat. Add a mood tint or emote icon on hover. Add a faster walk cycle in rain. Turn rain umbrellas on as soon as `weather != sunny`. |
| 13 | **Emoji toolbar icons and web-form panels** | Inconsistent platform glyphs clash with the art and read as unfinished. | Draw one SVG icon set (2 px stroke, rounded, in the panel colours), or render tiny 3D icons offline the way the ride thumbnails are already rendered. Add a guest portrait (render-to-texture of the guest instance) and ride thumbnails to the panel headers. |
| 14 | **No analytic overlays or minimap** | The benchmarks expose crowding, happiness and litter in the world. Here they live in text tables. | Add a heatmap overlay: a data texture sampled in the terrain shader (`DataTexture` per cell, updated every second) for crowding, happiness, litter and noise. Add a small minimap (an orthographic render to a 256² target, refreshed occasionally). |
| 15 | **Wooden coaster supports are sparse posts** | Lumber Run should be the Ouachita-timber showpiece. Sparse posts plus orphans (B7) look unfinished. | Build a procedural trestle: a bent every 1–1.5 m along the track, each made of 2 instanced posts, horizontal ledgers every 2 m of height and X-bracing, all cast to terrain and merged into one `InstancedMesh`. This is the dense black lattice of `parkitect-2.jpg`, in timber brown. |
| 16 | **Water surfaces are flat** | Pools, the creek and the wave pool fill a large share of the frame and look like paint. | Use one water material: two scrolling normal maps, fresnel, a depth-based tint (pool-tile texture visible in the shallows), foam where the depth-to-edge distance is small, and sine displacement for the wave pool. Render the creek as a spline ribbon (B9). |
| 17 | **Forest uniformity** | Uniform scale and bare trunks are the remaining "toy" tell in the best-looking part of the game. | Randomise scale (0.7–1.4×) and lean, cluster trees by species, add an understorey (instanced shrubs, ferns, leaf-litter decals) and fallen logs. Give pines lower branch whorls, not bare poles. Shade the rock outcrops darker and warmer, and give them a top-down moss tint so they stop reading as snow. |
| 18 | **In-world signage illegible** | The park gate and ride names are part of the charm and are currently black slabs. | Render sign text to a `CanvasTexture` at a minimum effective 12 px, and fade in a billboarded HTML/CSS2D label near zoom. Use large single-word signs on rides (the old "BUMPER" idea, done legibly). |

---

## What must be kept

1. **The flat-ride models and their silhouettes.** The carousel horses, swing chairs, Ferris gondolas, rider ring on the drop tower, swinging ship and the slide tower's parasol all read instantly from strategy zoom (`desktop-crowd.png`). Add detail around them, but do not muddy the silhouettes.
2. **Sun shadows.** Keep them, and make them weather-aware.
3. **The night lighting language:** emissive bulb strings, the chaser on the drop tower, warm lamp pools and a legible moonlit ambient (`desktop-night.png`). It is the best-looking state in the build. Add bloom and fix the orbs, but keep the restraint.
4. **The seasonal forest:** dogwood and redbud in spring, orange and red hardwoods among pines in fall (`desktop-spring.png`, `desktop-fall.png`). Correct for the region, and a genuine signature.
5. **The title screen:** the lockup over a 3D panorama with forested ridges (`desktop-title.png`, `mobile-title.png`).
6. **The colour palette:** cream, teal, coral and mustard, carried consistently from the UI into the ride canopies.
7. **The rides palette with rendered thumbnails and chips** (`desktop-palette.png`). Extend the same render pipeline to the toolbar icons and panel headers.
8. **The panel information design:** guest stat bars and thoughts, ride stats including "Hugs the hillside %", and the price steppers.
9. **The guest model scale.** Guests are big enough to read as people at default zoom (`desktop-close.png`). Do not shrink them for crowd counts; use LOD at wide zoom instead.
10. **The steam vent:** the single best place cue in the world (`desktop-night.png`). Build the Hot Springs kit around it.
11. **The history album, era campaign and fictional-park disclaimer**, now with a readable scrim.
12. **Large accessible mobile type and touch targets,** and the text-size options visible in the software sheets (`v3d-m1/sheets/desktop-03.png`, "02-large-text"). Keep these while shrinking the chrome.
