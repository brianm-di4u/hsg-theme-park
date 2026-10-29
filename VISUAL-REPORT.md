# Spa City Thrills: visual report

The park is now a full three.js 3D view. The simulation, builder rules, saves, hooks and every test are unchanged,
and the original Canvas renderer is kept as a fallback. Nothing is committed; the coordinator reviews and commits.
The plan is in `VISUAL-PLAN.md`. The reviews are in `benchmarks/REVIEW-*.md` (git-ignored with the benchmark shots).

## What changed
**Renderer (`src/js/gfx/`, about 2,000 lines).**
- `r3d.js` boots three.js after the page's `load` event.
  - The perspective camera looks down the old 2:1 iso axis, so `view.cam` keeps its meaning. `P()` projects through
    the 3D camera, so pan, zoom, pinch, the keyboard cursor, `tileToScreen`, overlays and every test still work.
  - Picking is a ray march over the heightfield (`act('pickAt')`).
  - The camera tilts lower at close zoom, and pulls back to 0.32× with a 21° lower tilt, so the ridges and sky come
    into view.
  - A composite pass carries a weather and time-of-day colour grade, a vignette and night bloom (high quality).
  - Build-menu thumbnails are rendered from the real models.
  - Quality presets are high, medium and low, picked by device. They step down automatically if the park runs under
    about 28 fps. Software GL gets the low preset.
- `terrain3d.js`: the park terrain.
  - Natural tiles share corner heights, so slopes read as slopes. Built tiles stay flat, with embankments toward
    them and stone walls only where the drop is more than two levels.
  - Strata on cut faces, leaf litter under the woods and corner-blended colour.
  - A shoaled creek with a winding surface outline.
  - Paver paths with curbs and stairs, and red-brick queue pens.
  - The **real-terrain backdrop**, below.
- `trees3d.js`: instanced Blender trees (shortleaf pine, oak, redbud, dogwood).
  - They are recoloured by month (redbud and dogwood bloom in April, October colour) and sway in the wind.
  - Pines and hardwoods are split by slope aspect: pine on south-facing slopes, hardwoods on north-facing.
  - An understory and a band of individual trees outside the map follow NLCD land cover.
  - Instanced novaculite boulders.
- `people3d.js`: one instanced draw for up to 1,400 walkers.
  - A vertex-shader walk cycle swings the legs and arms around the Blender pivots.
  - Per-guest shirt, pants, skin and hair. Staff wear coveralls, and the mascot is a bear model.
  - Seated riders on every ride, coaster car and log boat.
  - Umbrellas in rain.
  - The selected guest is drawn again on top as a yellow silhouette, so tall rides never hide it.
- `models3d.js`: original 3D designs for all 18 flat and water rides, with moving parts driven by the sim's ride phase.
  - Carousel horses, swing chairs that fly out, a Ferris wheel with level gondolas, a swinging boat, a boom, a drop
    ring, a sky swing, spinning cups, bumper cars, tube slides, a lazy river with tubes, a wave pool and a splash fort.
  - Bathhouse-style stucco shop fronts with arched windows and tile roofs, and a stone comfort station.
  - Stone planters on ride pads, legible name boards on every ride, and path dressing (globe lamps, benches,
    planters, bins).
  - A stone and timber gate with a lit sign, and an amphitheater with a lighting truss.
  - A thermal fountain with steam.
- `track3d.js`: coaster and flume track.
  - A Catmull-Rom spline through the cells, swept into tubular rails with a spine and ties, a wooden deck on timber
    bents, or a flume trough with water.
  - Rustic stone-and-timber pavilions for wooden and flume stations.
  - Trains are oriented by the track's up vector, follow the sim's run timing, and carry riders.
- `fx3d.js`: lamp light pools and halos, contact shadows, thermal steam (denser on cool days), slide spray, rain
  streaks, lightning, and fireworks over concerts at night.
- `materials3d.js`:
  - A shared vertex-colour material whose glow attribute drives night neon and chaser bulbs with no extra draw calls.
  - Paver and ground detail textures, and stone coursing on cliffs.
  - Moving-ripple water with fresnel, pool tiles and night underlight.
  - A sun computed for Hot Springs' latitude and the game clock, cloud shadows, a sky dome, and fog haze.

**Assets.**
- `assets/models.js`: 25 Blender models (`art-src/blender/build_models.py`, 5,339 triangles, 419 KB).
- `assets/dem.js`: USGS 3DEP elevation and NLCD 2021 land cover for a 2.88 km window of the Ouachita ridges north-west
  of Hot Springs, at 10 m (`tools/geo/`, 324 KB).
- 18 painted UI icons (Codex image generation → `art-pack`, 90 KB) replace the emoji in the dock and HUD.

**UI.**
- Painted toolbar and HUD icons, 3D ride thumbnails and queue badges with units ("+35 in line").
- One toast at a time, bottom left, hidden behind phone sheets.
- A fixed two-row phone HUD, with time controls on top and the numbers below.
- Weather and season pins removed from the map, since the HUD and the ride window carry them.
- Settings: 3D view on or off, and Graphics auto / high / medium / low.

## Review scores
Independent adversarial reviews against Planet Coaster 2, Planet Coaster, Parkitect and RollerCoaster Tycoon 3:

| Area | Before (2D) | m1 | m2 | m3 | m4 | **Final** |
|---|---|---|---|---|---|---|
| Art (models, terrain, scenery) | 3 | 5 | 6 | 6 | 6 | **6** (6.4) |
| Lighting and shadows | 2 | 5 | 5 | 6 | 6 | **6** (6.7) |
| Animation and game feel | 2 | 4 | 5 | 6 | 6 | **6** |
| UI | 5 | 6 | 7 | 7 | 7 | **7** |
| Typography | 5 | 6 | 6 | 6 | 7 | **7** |
| Readability | 4 | 5 | 6 | 7 | 7 | **7** |
| Mobile | 4 | 5 | 5 | 5 | 6 | **6** |
| Authenticity | 3 | 5 | 5 | 5 | 5 | **5** (5.7) |
| Overall | ≈ 3.5 | ≈ 5.1 | ≈ 5.6 | ≈ 6.0 | ≈ 6.3 | **≈ 6.4** |

The reviews logged 22 bugs plus 5 found later. Fixed:
- the upside-down coaster train;
- the hidden selected guest;
- torn slide tubes;
- the spike in the wave pool;
- a tree through a station;
- orbs on station roofs;
- the checkerboard lawns;
- the October heat;
- storms lit like noon;
- black tracks at night;
- the HUD reflowing on phones;
- overlapping cars;
- the pool seam;
- storm-chip spam on the 2D fallback;
- the concert's floating lights.

Still open (see Known gaps): N4, N10, N13, N14, N15, N17, N18, N19, N21 and N22, plus B9, B15 and N6.

## Tests
`node shared/test-harness/run.mjs games/theme-park --milestone visual-final`: **86/86 passed** at desktop and mobile,
with zero console errors and zero external requests. That is 77 original tests plus 9 new ones.

| Test | Covers |
|---|---|
| gfx3d › 3D view boots | WebGL view up, trees instanced, objects built, draws and triangles reported (both viewports) |
| gfx3d › picking | 5 tiles: `tileToScreen` → `pickAt` returns the same tile through the 3D camera |
| gfx3d › settings toggle | 3D off → 2D map, persists across reload, back on without reload, quality cycles |
| gfx3d › 2D fallback | `?gfx=2d` renders the Canvas park (both viewports) |
| perf › 3D view | download ≤ 3 MB (1.98 MB), hooks < 2 s, 3D ready ≈ 1.0–1.4 s later, script ≤ 12 ms/frame (1.1–2.4 ms), heap < 250 MB |
| perf › 2D fallback | 642 guests at ≥ 55 fps (59.6–60.4) |
| `tools/check-file-url.mjs` | from file://: three.js, models, DEM and 15 visible icons load and the park runs in 3D, with no network (both viewports, software and GPU) |
| `tools/check-facts.mjs` | 51/51 |
| `tools/balance.mjs` | 14/15 bands, unchanged (the stress-park outlier, as before) |

Changed tests:
- The live-region check waits for its announcement. Under software GL a 3D frame can outlast the 30 ms timer.
- The single ≥ 55 fps assertion became the two perf tests above.

Every final screenshot (99 across 16 contact sheets, plus 30 GPU review shots) was inspected. Before/after sheets are
in `screenshots/visual-final/before-after/` (`tools/before-after.mjs`).

## Performance
| Measure | Desktop (high) | Phone viewport (medium) |
|---|---|---|
| GPU fps, 600 guests, busy park (`tools/shots3d.mjs --fps`, RTX 5060) | 60.1 | 60.3 |
| GPU fps at night with bloom / zoomed out | 60.2 / 60.2 | 60.1 / 58.0 |
| GPU fps with 4× CPU throttle | 60.2 (7.4 ms script) | 60.1 (11.1 ms script) |
| Script time per 3D frame | 1–2.8 ms | 1–1.9 ms |
| Draw calls / triangles | 150–270 / 2.3–2.7 M | 110–190 / 1.5–1.9 M |
| Software GL in the harness (SwiftShader) | 2.6 fps, 1.7 ms script | 4.7 fps, 1.1 ms script |
| JS heap after GC, 500 guests | 61 MB | — |
| Download | index.html 465 KB + three.js 731 KB + models 410 KB + DEM 324 KB + icons 90 KB = **1.98 MB** | same |
| First paint | the title and hooks come from index.html alone (< 2 s); 3D loads after `load` and takes about 1 s | same |

- The 2D fallback is unchanged: 60 fps with 642 guests and a 9.5 MB heap.
- **Low-end and fallback options:**
  - no WebGL, a failed load, `?gfx=2d` or the setting → Canvas renderer;
  - software GL → low preset (no shadows or bloom, DPR 1);
  - slow frames → automatic step down.
- All fps figures were taken with the machine at 10–64% CPU, with other sessions running.

## Known gaps
**Major:**
1. **Terrain shape.** The sim's terraces still show as shelves wherever the ground climbs more than two levels between
   built tiles. The creek is still built from cell-length runs.
2. **Set dressing and architecture.** Plazas are thinly dressed. There is no CCC-style pavilion or bathhouse-scale
   building beyond the shop fronts and wooden-coaster stations.
3. **Water motion.** There is no wave-pool swell, no swimmers beyond the lazy-river tubes, and no splash bursts at the
   flume drop.
4. **Mobile sheets.** Three sheets clip their last button behind the rounded sheet edge (N4, N14, the rides list B15).
   There is no peek or half state.
5. **Sky.** The title sky is a flat slate gradient, and the vista sky has no visible sun.

**Polish:**
- July noon is washed out, and there is no screen-space AO (contact shadows only).
- The coaster train is empty at the station in one review shot (N10).
- Slide tubes have no supports (N18), and a lamp sits inside a pine (N15).
- Night slides read flat (N17), and the name boards are dark at night (N19).
- Novaculite outcrop tiles show as hard-edged pale pads (N21).
- No heatmap overlays, minimap or guest portrait.
- No rain splash rings.
- Editing paths or terrain rebuilds the terrain and backdrop meshes in one frame (≈ 50–80 ms hitch on the GPU machine).

**Not tested:** real phones (fps above is the phone *viewport* on a desktop GPU) and Safari. As before, nobody has
listened to the audio.

## New research (`research/terrain.md`)
- The backdrop window (bbox, 147.5–363.5 m relief) and its land-cover shares: 36% deciduous, 22% mixed, 11% evergreen,
  20% open.
  - Sources: [USGS 3DEP](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer) and
    [MRLC NLCD 2021](https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/wms), both public domain.
- Shortleaf pine: 80–100 ft, "a pyramidal head", needles in bundles of 2 and 3, 7–11 cm long
  ([Wikipedia: *Pinus echinata*](https://en.wikipedia.org/wiki/Pinus_echinata)).
- Aspect-driven pine versus hardwood bands (the existing EOA citation).
- The sun model for 34.54° N, with solar noon at about 13:12 daylight time.

## Requests
**Shared data:**
- Add the backdrop window and its land-cover shares to `research/geography-lakes-mountains.md` as a reusable
  "generic Ouachita valley" site.
- Add the shortleaf pine form facts to `research/fish-and-wildlife.md`.

**Harness:**
- A `--gpu` option for `run.mjs`, as baseball also asked. SwiftShader makes every 3D test slow (a full run takes about
  10 minutes), and its fps means nothing.
- A `t.frameCost()` helper. This game reports `getState().gfx.frameMs` itself.

**Lesson worth adding to LESSONS:**
- In three.js, a transparent material with `depthTest: false` on an InstancedMesh drew nothing here. An *opaque*
  material with `depthTest: false` and a high `renderOrder` gives a reliable x-ray silhouette.
- Build a coaster car's frame from the track's up vector, never from tangent × side, or the cars flip on hills.
