# Spa City Thrills: adversarial visual review (before overhaul)

Reviewer stance: independent and hostile. The scores compare the game against the best benchmark in each dimension (10 = on par). A browser game is not excused for looking like a browser game.

**Sources reviewed**
- Current game: all 15 contact sheets (`screenshots/visual-before/sheets/desktop-01..09.png`, `mobile-01..06.png`). I also opened these at full size: `desktop/01-title`, `01-building`, `01-crowd`, `01-500-guests`, `02-storm`, `03-winter`, `04-flume`, `04-guest`, `05-concert`, `05-fall`, `05-ride-window`, `06-night`, `07-litter`, `01-album`, `11-campaign`, `13-park-start`, `mobile/01-title`, `01-crowd`, `01-500-guests`, `01-building`, `04-guest`, `05-ride-window` and `06-night`. I upscaled crops of the crowds in `01-crowd`, `01-500-guests`, `06-night` and `05-concert` to 3–4× to judge the guests.
- Benchmarks: `pc2-1..6`, `pc1-1..6`, `parkitect-1..6` and `rct3-1..6`, all opened.

**Fair comparison note.** The flat, low-poly, readable style of Parkitect (`parkitect-1/2/4/5/6`) is the right benchmark for this game. Photoreal Planet Coaster is not. Even against Parkitect, the current game is far behind.

---

## Score table

| Dimension | Score | One-line verdict |
|---|---|---|
| Art (models, terrain, scenery) | **3** | Primitive placeholders. Rides are discs, cones and slabs; terrain is a staircase. |
| Lighting and shadows | **2** | No sun, no cast shadows, no AO. Night is additive blobs. |
| Animation and game feel (from stills) | **2** | No visible riders, vehicles barely visible, no particles. Nothing reads as moving. |
| UI | **5** | Clean, consistent and legible, but it reads as a web form. No thumbnails, overlays or minimap. |
| Typography | **5** | Strong title lockup. Body text is generic, map labels are illegible. |
| Readability (guests, rides, queues, paths, status) | **4** | Rides are distinct by colour. Guests are specks, queues are invisible, status chips spam. |
| Mobile | **4** | Functional with big touch targets, but the HUD and toolbar take about 30% of the screen and the sheets cover about 50% more. |
| Authenticity (Ouachita ridges / Hot Springs) | **3** | "Ouachita" lives in the text, not the picture. Generic green grid with terraced steps. |

**Overall: about 3.5 / 10.** It is a competent systems prototype with a placeholder art pass.

---

## 1. Art (models, terrain, scenery): 3/10

**Observations**
- **Flat rides are primitives with no detail.** In `desktop/01-crowd.png` and `05-ride-window.png` the carousel is a brown disc under a striped cone with white dots and no horses. The "swing" ride is an A-frame with a red bowl. The drop tower is a grey square pillar with a pink cube collar. The Ferris wheel is a thin 2D red ellipse with coloured squares and no gondolas or riders. Compare `rct3-4.jpg` (a spoked wooden Ferris wheel with gondolas) and `parkitect-4.jpg` (a carousel with horses, and a chair-swing with chains and riders).
- **Coaster track is a flat coloured ribbon on toothpick supports.** `desktop/01-500-guests.png`, `06-night.png`, `05-fall.png` and `mobile/06-night.png` all show a 2–3 px red or orange band with a dotted lift line. There are no rails, ties or spine, and the supports have no footers or cross-bracing. Wooden coasters get no lattice trestles. Compare `parkitect-2.jpg`: a dense black timber trestle, twin rails, cross-ties and trains with riders, all in a stylised low-poly look.
- **Terrain is a stepped staircase of identical tiles.** `desktop/13-park-start.png`, `04-flume.png` and `07-litter.png` show uniform grid squares with visible seams. Height changes are 1-level brown strips like rice terraces. The world ends in a hard brown cliff dropping into a flat pale-blue void. There are no slopes, rock or ground texture. Compare `parkitect-1/5.jpg`, where faceted rock cliffs and sculpted mesas sell height even in low poly.
- **Scenery is sparse and lollipop-like.** Pines are stacked cones and hardwoods are green balls. The pink and white flowering trees in `13-park-start.png` and `01-building.png` read as gumballs or balloons on sticks. Shops are striped awnings on white boxes (`02-stalls`, `01-crowd`). There are no benches, bins, lamps, fences, planters or signage of any density. Compare `parkitect-6.jpg`: string lights, stone arches, flower beds, a fountain, a pergola and a statue in a single frame.

**What the benchmarks do better.** Every ride has a recognisable silhouette, a vehicle and riders. Track is built from a real cross-section profile. Terrain has sculpted slopes and rock material. Scenery density is about 10× higher.

## 2. Lighting and shadows: 2/10

**Observations**
- **No directional light or cast shadows anywhere.** Shading is per-face flat colour. In `desktop/01-crowd.png` the drop tower, Ferris wheel, carousel canopy and guests cast nothing on the plaza, so objects float. Compare `pc2-1.jpg` and `pc2-3.jpg`, where long soft sun shadows anchor every tree and guest, and `parkitect-4.jpg`, where even a toy style has crisp shadows under trees and rides.
- **Night is a blue multiply with additive glow blobs.** In `desktop/06-night.png` (and the zoomed crop) each ride gets a fuzzy white-cyan halo that washes out the geometry. The drop tower becomes a glowing grey column. Paths are not lit, lamps cast no pools of light, and the ride bulbs are not emissive. Compare `pc2-5.jpg`: warm path lamps, cyan pool underlights, lit dome glazing, and a red-to-black sunset sky with silhouetted ridgelines.
- **Time of day and weather do not change the light.** `desktop/02-storm.png` ("Storms 80°F") is lit identically to sunny `01-crowd.png`, with only faint rain streaks. `05-concert.png` at 9 pm shows a red stage glow that barely reads as a show. There is no sky, so there is no golden hour.
- **No ambient occlusion or contact darkening.** Stalls, ride bases and terrain steps meet the ground with no darkening, so everything looks pasted on.

**What the benchmarks do better.** A real key light with shadows, an ambient sky term, emissive lights at night, and atmospheric sky and fog. Light is used as mood (`pc1-1`, `pc1-2`, `pc2-5`, `rct3-4` sunset).

## 3. Animation and game feel (judged from stills): 2/10

**Observations**
- **No riders are visible on any ride in any shot.** `05-ride-window.png` reports "Riders 41" on Ridge Runner, yet the only visible train is a 6-pixel yellow blob in the top-left of the frame. The carousel, Ferris wheel, swing and drop tower in `01-crowd.png` are all empty. Compare `pc2-2.jpg` (screaming riders with arms up), `rct3-5.jpg` (a front-row view) and `parkitect-4.jpg` (riders visible at strategy zoom).
- **No motion cues.** There are no blur, splash, spray, steam or particle effects. The flume in `04-flume.png` is a blue outline with no water, foam or boat spray. The wave pool (`01-crowd.png`) is a flat blue rectangle with two white lines.
- **Crowds are static specks.** Upscaled crops of `01-crowd.png` and `05-concert.png` show 4×10 px figures (head, shirt, legs) without shadows, gait, props, balloons or umbrellas. In `05-concert.png` the crowd at the amphitheatre has no orientation towards the stage. Compare `pc2-1.jpg`, where swimmers, loungers and walkers are each doing something.
- **Some feedback does exist.** The income popups (`+28`, `+17` in `01-500-guests.png`), the toast stack and the "Broken" chips are the only game-feel signals, and they are UI, not world.

**What the benchmarks do better.** The world itself communicates activity through riders, vehicles, water, particles, crowds with intent, and fireworks (`pc1-2.jpg`).

## 4. UI: 5/10

**Observations**
- **Consistent, legible panel system.** The cream, teal and coral palette is coherent across `04-guest.png` (stat bars plus a thoughts list), `05-ride-window.png` (track stats, price stepper, coloured actions) and `01-building.png` (coaster builder). This is a real strength.
- **It looks like a web form, not a game.** The panels are tall text tables with no imagery. The build toolbar uses emoji glyphs (🔍 🎠 🎢 🌊 🍴 🌲) at about 16 px, which render inconsistently across platforms. The build menus have no ride thumbnails. Compare the `pc2-4.jpg` thumbnail grid of 62 coasters with category tabs, search and sort, and the `parkitect-3.jpg` tabbed staff panel with portraits.
- **The toast stack sits in the top-centre of the play area.** In `01-crowd.png`, `05-concert.png` and `01-500-guests.png`, three toasts permanently cover about 15% of the most important part of the view. Benchmarks keep notifications to a corner icon (`pc2-4.jpg` bell, `parkitect-5.jpg` "!" badge).
- **No overlays, heatmaps, minimap, zone tools or in-world build gizmos.** The coaster builder (`01-building.png`) is a button grid ("⇊3 ⇊2 ↘ → ↗") plus a warning, "Track would hit the ground", with no in-world ghost track or height markers. Compare the move gizmo in `pc2-4.jpg` and the in-world metre labels on the slide in `pc2-6.jpg`.

**What the benchmarks do better.** Visual menus, iconography, in-world construction affordances, analytical overlays and unobtrusive notifications.

## 5. Typography: 5/10

**Observations**
- **The title lockup is good.** In `desktop/01-title.png` and `mobile/01-title.png`, "SPA CITY" in mustard with a red offset shadow over "THRILLS" in spaced cream geometric caps has genuine vintage-park poster energy. Keep it.
- **In-game body text is a generic system sans.** The HUD, panels and toasts look like default Segoe/Trebuchet. There is no deliberate pairing with the display face, and the HUD park name ("Ouachita Hills Fun Park") is the only branded type in play.
- **Map labels are illegible.** "BUMPER", "THRILLS" and "WC" are about 7–9 px baked text on models (`01-crowd.png`, `06-night.png`). The "BUMP" sign is clipped by the tower in `01-500-guests.png`.
- **Hierarchy inside panels is fine,** with bold section heads ("TRACK STATS", "THOUGHTS") and right-aligned numbers. But the low-contrast grey footer disclaimer over busy map art on `mobile/01-title.png` fails contrast.

**What the benchmarks do better.** A single branded UI type family with weights. Map signage is either modelled art (`rct3-4` "Post Office") or a clean billboard label (`parkitect-5` zone names).

## 6. Readability (guests, rides, queues, paths, status): 4/10

**Observations**
- **Rides are distinguishable by colour and silhouette at a glance.** The striped canopies, the red Ferris ring and the rainbow slides work at strategy zoom (`01-crowd.png`). This is the best part of the current art.
- **Guests are undifferentiated specks.** At 1280×800 in `01-500-guests.png` the 673 guests are coloured dots. You cannot tell kids, adults, staff, unhappy guests or guests carrying food apart. In `04-guest.png` the selected Guest #15 is not highlighted on the map at all. Compare `parkitect-4.jpg`, where guests are chunky readable people with visible heads and arms at a similar zoom.
- **Queues are invisible.** The ride window says "In line 2 of 80" (`05-ride-window.png`), but queues use the same tan path tiles as regular paths, with no railings, stanchions or switchbacks. Plazas, paths and flat-ride pads are all the same light grey and tan (`01-crowd.png`). Compare `parkitect-4.jpg` (red-and-white queue lanes with railings) and `rct3-3.jpg`.
- **Status chips spam the map.** In `desktop/01-500-guests.png` there are 10 identical "⚡ Storm" chips plus "Broken" chips, and `mobile/01-500-guests.png` has 8 on a phone screen. They occlude rides and tell you nothing new, because the HUD already says "Storms". The yellow wireframe selection outline in `05-ride-window.png` is clear and should stay.

**What the benchmarks do better.** Large readable guests, dedicated queue art, distinct paving materials, sparse icon-only status pins (`parkitect-3.jpg` green janitor pins and red "no" pins), and zone tinting (`parkitect-5.jpg`).

## 7. Mobile: 4/10

**Observations**
- **The chrome eats the playfield.** In `mobile/01-crowd.png` (780×1688) the HUD takes 0–255 px (two rows plus a whole row just for the speed buttons) and the toolbar takes 1470–1688 px. That is about 28% of the height before the toast, which covers another about 6%.
- **Bottom sheets cover the subject.** `mobile/04-guest.png` and `05-ride-window.png` cover about 52% of the screen. With chrome, only about 20% of the map is visible, and the selected guest or ride is underneath the sheet. In `mobile/01-building.png` the coaster-builder sheet clips the red Cancel button off the bottom and hides the track being built.
- **Touch targets are generous and the type is large.** This is good and accessible. The 2×6 toolbar grid is readable, but it spends two rows on tools you use once a minute.
- **The mobile title footer overlaps map art in low contrast** (`mobile/01-title.png`). The bottom 35% of the title screen is a featureless blue-grey void.

**What the benchmarks do better.** The benchmarks are not mobile games, so here the standard is good mobile builders: a single slim HUD row, a collapsible tool rail, half-height draggable sheets that keep the selection framed above them, and a camera that auto-pans the subject into the visible area.

## 8. Authenticity (forested Ouachita ridges, Hot Springs, Arkansas): 3/10

**Observations**
- **The terrain does not read as the Ouachitas.** The Ouachitas are long east–west ridges with rounded crests, steep wooded flanks and exposed novaculite and sandstone. `13-park-start.png` and `04-flume.png` show a near-flat green board with 1-step terraces. The only cliff is the map edge.
- **No horizon or setting beyond the board.** The park sits on a pale-blue void (`01-title.png`, `07-litter.png`), with no distant ridgelines, sky, lake shoreline or town. Compare `pc2-5.jpg` (rolling forested hills behind the park at sunset) and `rct3-1.jpg` (patchwork hills to the horizon). A layered ridgeline silhouette is the single cheapest authenticity win available.
- **The forest mix is plausible but toy-like.** The pine-and-hardwood mix and the autumn oranges in `05-fall.png` are correct in spirit. The seasonal swap is a genuine highlight. But the dogwood and redbud blooms read as gumballs, and the density is too low. The real setting is unbroken canopy that the park is cut into.
- **No Hot Springs material culture.** There are no thermal-water steam features, no rustic CCC-style stone walls or timber pavilions, and no Spanish-Revival or Neoclassical spa facades. The rides and shops are generic carnival boxes. All the place identity is in the text (campaign cards in `11-campaign.png`, the history album in `01-album.png`), and none of it is in the world.

**What the benchmarks do better.** Every benchmark park has a strong sense of place built from terrain shape, materials, props and horizon: Western in `rct3-4` and `pc1-2`, Mediterranean in `pc2-3`, Frontierland mesas in `parkitect-5`.

---

## Ranked gap list (most important first)

| # | Gap | Why it matters | Concrete browser-buildable fix |
|---|---|---|---|
| 1 | **No real lighting or shadows** | This is the main reason everything looks like flat placeholder vector art. Shadows ground objects, give scale on slopes, and make even primitive geometry look intentional, as Parkitect proves. | Add a three.js `DirectionalLight` sun with a single shadow map fitted to the camera frustum (2048², PCFSoft, recomputed when the camera moves), plus a `HemisphereLight` sky/ground term. Add N8AO or SAOPass for contact AO. Use ACES tone mapping and sRGB output. Drive sun angle and colour from the game clock. |
| 2 | **Rides are primitives with no vehicles or riders** | Rides are the product, and they currently show neither what the ride is nor that it is running. | Author low-poly GLTF models in Blender for each flat ride, with named pivot nodes for spin, swing and lift, and animate the transforms. Add instanced seated-rider meshes (one shared mesh, tinted per instance) on every vehicle. Carousel horses, Ferris gondolas, swing chairs on chains, a drop-tower gondola ring. |
| 3 | **Coaster and flume track is a flat ribbon** | The coaster builder is the headline feature, and its output looks like a line on a map. | Generate track with `ExtrudeGeometry` or a custom sweep of a rail cross-section (2 rails, spine, ties every N metres) along the cell spline. For woodies, build procedural lattice trestles (instanced beams down to terrain height). Add trains of 3–6 cars with riders. Flumes get a U-trough with an animated scrolling water texture and a splash particle burst at the drop. |
| 4 | **Terrain reads as terraces, not Ouachita ridges** | It defeats the game's whole premise ("hillside park", "Hugs the hillside 23%") and its sense of place. | Replace stepped tiles with a smooth vertex heightfield, while keeping the logical grid for building. Use slope-based vertex colour (grass on flat ground, leaf litter and dirt on mid slopes, grey-white novaculite and tan sandstone rock on steep faces). Seed the default maps with real east–west ridge profiles (USGS DEM, as the sister game Ouachita Bass Classic already does). Hide grid lines except in build mode. |
| 5 | **No horizon, sky or world edge** | The pale-blue void makes it look like a tech demo and wastes the most evocative element of the setting. | Add a gradient sky dome tied to time of day, 3–4 layered ridgeline silhouette meshes at distance with exponential fog (blue-grey aerial perspective), and Lake Hamilton style water on the low side. Fade the board edge into forest instead of a cut cliff. |
| 6 | **Guests are unreadable specks** | Guests are the management feedback loop. Players need to see crowding, unhappiness and what guests carry. | Use instanced low-poly guests at about 2× the current screen size, with a vertex-shader walk cycle (leg and arm swing driven by per-instance phase), blob shadow decals, and per-instance shirt, hair and skin tints. Add props (balloon, drink, umbrella in rain) and an optional mood tint or icon overlay. Use LOD to fall back to sprites at far zoom. Draw a ring on the selected guest. |
| 7 | **Queues, paths and plazas are indistinguishable** | Players cannot see wait times or crowd flow in the world, which is a core readability failure. | Add a distinct queue path type with railings or stanchions (instanced posts plus rope), coloured paving, and visible guests packed in line. Give paths textured paving with curbs and edging, and plazas a different material. Add a heatmap overlay toggle (crowding, happiness, litter), as in `pc2-4.jpg`. |
| 8 | **Night is additive blobs; there are no real lights** | Night and the concerts are a showcase moment and currently look washed out. | Use emissive materials on ride bulbs (chaser animation via UV offset), lamp posts with baked light-pool decals (cheap, no per-pixel point lights), a few real `PointLight`s near the camera only, and selective bloom (threshold on emissive only). Add a moonlit sky and stage spotlights plus a fireworks particle system for concert nights. |
| 9 | **Weather is visually inert** | "Storms" changes park behaviour, but the picture is identical to sunny, so the player gets no cue. | Storm preset: dim the sun, desaturate the colour grade, add darker clouds on the sky dome, denser GPU rain particles with splash sprites on paths, a wet specular boost on paving, occasional lightning flashes (a full-screen flash plus a brief directional light), and umbrellas on guests. |
| 10 | **Status chip spam** | Ten identical "Storm" chips bury the rides and add no information. | Show weather once in the HUD. On the map show icon-only pins (no text) for actionable states only (broken, closed, unhappy queue). Cluster pins at far zoom and expand them on hover or tap, as with the `parkitect-3.jpg` pins. |
| 11 | **Scenery and Hot Springs theming are absent** | Authenticity is a stated goal, and right now all the place identity is in the text. | Build an original Hot Springs scenery kit: rustic stone retaining walls and pavilions in the CCC style, thermal fountains with steam particles, Spanish-Revival and Neoclassical bathhouse-inspired facades for shops (fictional names), timber boardwalks, wrought-iron lamps, benches and bins. Add a distant generic observation-tower silhouette on a ridge, plus dense oak-hickory and shortleaf-pine canopy with proper tree models (layered card foliage, not balls). |
| 12 | **Water surfaces are flat fills** | Pools, the wave pool, the lake and flumes are a big share of every frame. | Write a water shader with scrolling normal maps, a fresnel tint, shoreline foam from a depth or distance mask, and a pool-tile texture under transparent water. Animate wave-pool sine displacement. Add splash particles where flume boats land. |
| 13 | **Build menus lack visuals; the builder lacks in-world affordances** | Discoverability and the feel of construction lag the benchmarks badly. | Render ride thumbnails offline from the GLTF models (or at runtime to a RenderTarget) and show category-tabbed grids. In the coaster builder, draw a ghost next-segment preview, height labels on supports, and green, red or yellow validity tinting in the world instead of text-only warnings. Replace emoji with a consistent SVG icon set. |
| 14 | **Mobile chrome footprint** | About 70% of the phone screen is UI when a panel is open, and the selection is hidden. | One slim HUD row (cash, guests, rating, then the time and a single play/speed cycle button, with the rest under "Park"). A single scrollable tool rail. Bottom sheets at about 40% height with a drag handle and a peek state, and auto-pan the camera so the selection sits centred above the sheet. Move toasts to a small bottom-left ticker. |
| 15 | **Fixed high isometric camera** | Benchmarks sell emotion with close-ups (`pc2-2`, `rct3-5`); the game cannot show its own rides. | Allow 90° rotation, wider zoom down to guest level with a tilt toward perspective at close zoom, and an optional subtle tilt-shift depth of field at far zoom (it suits the diorama look). Add a ride-cam that follows a train, and "Follow with camera" on guests. |
| 16 | **Map labels and typography** | Baked 8 px signage is illegible, and the in-game type does not match the branded title. | Pair the title display face with one webfont UI family (a humanist sans with tabular numerals) used everywhere. Replace baked text with billboarded labels that scale with zoom and hide below a threshold, or modelled sign art. |
| 17 | **No post-processing polish** | Jaggies on thin lines (track, supports, the Ferris ring) and a flat colour response cheapen every frame. | Add SMAA or FXAA (or MSAA on the main target), a light colour-grade LUT per season and time of day, and a subtle vignette. Keep the cost mobile-safe with a quality toggle. |

---

## What the current game does well and must keep

1. **The colour language.** Cream, teal, coral and mustard are cohesive and friendly. The striped canopies and rainbow slides already read at strategy zoom (`01-crowd.png`). Keep the palette and carry it into the new models and materials.
2. **The title lockup** (`01-title.png`), a vintage park-poster feel that is genuinely on-brand.
3. **Seasonal foliage change** (`05-fall.png`). The orange hardwoods among pines are right for the Ouachitas. Extend it to spring dogwood and redbud (as real tree models) and to a bare winter.
4. **The ride selection outline** (yellow wireframe in `05-ride-window.png`), which is clear and immediate.
5. **The panel information design.** The guest stat bars and thoughts (`04-guest.png`), the ride stats including the place-specific "Hugs the hillside %", and the price stepper are well organised and data-rich.
6. **The cell-by-cell coaster builder logic** and the hillside-hugging mechanic. Keep the logic, and replace only its presentation.
7. **The history album with cited sources and the campaign era cards** (`01-album.png`, `11-campaign.png`), together with the clear "fictional park" disclaimer. This is where the authenticity is strongest. Bring it into the world (for example era-appropriate ride models per campaign era).
8. **Generous touch targets and large mobile type.** Keep the accessibility while shrinking the chrome.
9. **Income popups and breakdown toasts** as feedback. Keep them, but relocate the toasts and pair them with world-side cues.
10. **Readable ride silhouettes at strategy zoom.** Whatever detail is added, keep each ride type's colour-coded silhouette distinct from above. That is where Parkitect wins over Planet Coaster for this camera.
