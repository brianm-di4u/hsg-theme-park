# Spa City Thrills: visual plan

## Baseline and benchmark
- Baseline run `--milestone visual-before`: 77/77 at desktop and mobile, 97 shots, every shot inspected through 15
  contact sheets.
- Benchmarks (official Steam store shots, review only, git-ignored in `benchmarks/`): Planet Coaster 2, Planet Coaster,
  Parkitect and RollerCoaster Tycoon 3. Sources are listed in `benchmarks/SOURCES.md`.
- An independent reviewer scored the baseline against them (`benchmarks/REVIEW-before.md`):

| Area | Art | Lighting | Animation/feel | UI | Type | Readability | Mobile | Authenticity |
|---|---|---|---|---|---|---|---|---|
| Before | 3 | 2 | 2 | 5 | 5 | 4 | 4 | 3 |

Top gaps: no sun or shadows; rides without vehicles or riders; coaster track is a flat ribbon; the terrain reads as
terraces and ends in a void; no horizon; guests are specks; queues look like paths; night is washed out; weather
changes nothing; status chips spam the map; no Hot Springs scenery; flat water.

## Direction: full 3D with the 2D renderer as fallback
Parkitect, the closest fit for this camera, is a stylized low-poly 3D game. Our game's scale (48 × 48 tiles, ~60
objects, 640+ guests) is easy for WebGL with instancing, and the camera already works like a fixed iso view. 2D sprites
would need thousands of pre-rendered frames for rides, track pieces in every slope and turn combination, and zoom
levels, and still could not give real light, shadows or night lighting.

- **three.js r186** (npm `three@0.186.1`, vendored as a classic script `vendor/three.min.js`, loaded after first paint).
- **Camera compatibility.** A narrow-FOV perspective camera looks down the exact view axis of the old 2:1 projection,
  so `view.cam` (x, y, zoom) keeps its meaning. Pan, zoom, pinch, keyboard cursor, `tileToScreen` and tests keep working.
  `P()` projects through the 3D camera, so badges, ghosts and labels still draw on the 2D canvas, now an overlay.
  Picking is a grid ray march against the heightfield.
- **The sim, builder rules, saves and hooks are untouched.** The renderer reads `S` only.
- **Fallback.** No WebGL, a failed load, `?gfx=2d` or the Settings toggle all use the existing Canvas renderer, unchanged.

## Assets
| Asset | How | Notes |
|---|---|---|
| Park terrain | code (`gfx/terrain3d.js`) | Smoothed heightfield: natural tiles share corner heights (slopes); graded pads, paths and ride footprints stay flat with stone retaining walls; sandstone and novaculite strata on cliffs; seasonal grass; baked corner AO |
| Backdrop terrain | **USGS 3DEP DEM + NLCD 2021** (`tools/geo/`, `assets/dem.js`) | A real 2.88 km square of the Ouachita ridges north-west of Hot Springs at 10 m. The ridge rises behind the park; forest blanket coloured by NLCD class and season; blends into the map edge; no void |
| Trees, people, bear, horse, teacup, log boat, coaster cars, tubes, rocks, logs, ore cart | **Blender** (`art-src/blender/build_models.py` → `assets/models.js`) | Shortleaf pine, oak-hickory, redbud, dogwood (region-coded for season and blossoms, sway weights); instanced |
| Flat rides (11), water rides (7), amphitheater, stalls (9), scenery (12), gate | code (`gfx/models3d.js`) | Original designs; static parts batched with vertex colours, moving parts animated from the sim's ride phase; riders seated |
| Coaster and flume track | code (`gfx/track3d.js`) | Spline through the cell path; tubular steel rails with spine and ties, wooden track on lattice bents, flume trough with water; supports to the real ground; lift chain; trains with riders |
| Water | shader | Creek, pools, wave pool, lazy river, flume water: scrolling ripples, fresnel, edge foam |
| Night | emissive vertex glow + light decals + bloom | Chaser bulbs, neon signs, lamp pools, ride light pools |
| Sky and weather | shader + particles | Time-of-day sun and sky, fog haze, cloud shadows, rain streaks, wet ground, lightning |
| UI icons and thumbnails | runtime render of the 3D models | Build menu thumbnails rendered from the actual models |

## Research additions (`research/terrain.md`)
- Site window, bbox and sources for the DEM and land cover; the ridge trend and relief.
- Ouachita forest composition (shortleaf pine, oak-hickory, redbud, dogwood) and seasonal timing, novaculite.

## Performance plan
- Instanced trees (one draw per species), instanced guests (one draw, walk cycle in the vertex shader), batched static
  objects, one terrain mesh rebuilt only when the network or terrain changes.
- Quality presets: high (2048 shadows, bloom, MSAA, DPR ≤ 2), medium (1024 shadows, DPR ≤ 1.5), low (no shadows or
  bloom, DPR 1). Phones start at medium; SwiftShader (the test harness) gets low with coalesced redraws.
- Render on demand while paused; the 3D frame only redraws when the sim or camera changes.
- Download: index.html ~0.3 MB, three.js ~0.73 MB, models + DEM ~0.6 MB, loaded after the title is up.
- Targets: 60 fps on a mid laptop with 640 guests, 30+ fps on phones; measured on the GPU with `tools/shots3d.mjs --fps`.

## Test plan
- All existing tests keep passing at both viewports (the hook spec is unchanged).
- New `gfx3d.test.mjs`: the 3D view boots, models and DEM load, `getState().gfx` reports mode and quality, picking
  through the 3D camera lands on the same tiles as `tileToScreen`, the 2D fallback (`?gfx=2d`) still renders, no
  external requests from file:// (`tools/check-file-url.mjs`).
- Perf test: software GL is only a sanity floor; real fps comes from the GPU tool.
- Every milestone: screenshots at both viewports, inspected, then an adversarial re-review against the benchmarks.
