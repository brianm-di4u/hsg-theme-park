# Code-sample survey

Five open-source samples for the core mechanics: an isometric renderer, grid pathfinding, crowd flow
fields, agent-based simulation and track physics. All are genre-generic; none is a clone of a
commercial park game. (Open-source clones of commercial park games, whatever their license, were
excluded on purpose and not opened.) Downloaded copies live in `reference-samples/` (git-ignored);
no install, build or test script was run, and nothing was opened in a browser.

| # | Sample | URL | License | Commit / version | Verdict |
|---|---|---|---|---|---|
| 1 | Isomer (isometric canvas graphics) | https://github.com/jdan/isomer | MIT (LICENSE, © 2014 Jordan Scales) | `b9d0bf6` (2017-07-25) | **Ideas adapted, no code copied** |
| 2 | PathFinding.js (grid A*, Dijkstra, JPS) | https://github.com/qiao/PathFinding.js | MIT (README + package.json, © 2011–2012 Xueqiao Xu) | `2904a9a` (2023-07-16), v0.4.18 | **Ideas adapted, no code copied** |
| 3 | Flowfield-Pathfinding (Treuille/Cooper/Popović crowd flows) | https://github.com/diningeachox/Flowfield-Pathfinding | **None found** (no LICENSE file; `raw/main/LICENSE` 404) | `e937bf4` (2021-09-27) | **Reference only** |
| 4 | Mesa (agent-based modeling, Python) | https://github.com/projectmesa/mesa | Apache-2.0 (LICENSE) | `f3bdcd6` (HEAD at survey time; not downloaded) | **Ideas adapted, no code copied** |
| 5 | rollercoaster (2D coaster physics for math classes) | https://github.com/kevinfrei/rollercoaster | Unlicense (public domain) | `691224d` (2022-11-21) | **Ideas adapted, no code copied** |

Articles read for background (no code taken): Red Blob Games, "Implementation of A*" and "Flow field
pathfinding" (redblobgames.com; no explicit code license found on the page, so reference only).

## 1. Isomer
- **Does well:** a clean projection model (x and y on the ground, z up, 30° iso), shapes built from
  prisms, painter's ordering by sorting faces by depth, lighting by face normal (top face lightest,
  left and right faces darker).
- **Does badly for us:** it draws every face of every shape every frame and sorts faces globally,
  which is too slow for a few thousand tiles plus hundreds of agents; no sprite caching; no picking
  (screen → tile) at all.
- **Taken:** the face-shading idea (top = base color, +x face −18%, +y face −30%) and the 2:1 diamond
  projection. Our depth ordering is our own: tiles drawn by diagonal `x+y`, square multi-tile rides
  inserted after diagonal `x0+y0+n−2` (see MECHANICS §6), sprites cached per zoom.

## 2. PathFinding.js
- **Does well:** clear grid model (walkability matrix), Dijkstra as A* with a zero heuristic, binary
  heap open list, tested finders, Node and browser.
- **Does badly for us:** one search per agent per goal. With 600 guests re-targeting every few
  seconds that is thousands of searches; it also allocates node objects per search.
- **Taken:** the binary-heap Dijkstra shape. We run it *backwards from each destination* once to make
  a distance field, reused by every guest heading there (sample 3's idea), on typed arrays with no
  per-node objects. Weighted edges (ramps cost more) come from our hills rule.

## 3. Flowfield-Pathfinding (reference only: no license)
- **Does well:** demonstrates the continuum-crowd idea: one potential field per goal shared by a whole
  group, with density and discomfort raising the cost of crowded cells, so groups part around each
  other.
- **Does badly for us:** fast marching on a fine grid every frame, per-face cost recomputation, many
  `Vector2D` allocations; far more than a tile-based park needs. No license, so no code is used.
- **Idea used (concept, not code):** one integration field per destination, crowding as a local cost.
  We apply crowding at the agent step (guests slow down and complain on packed tiles) instead of
  rebuilding fields every tick, so fields only rebuild when paths or rides change.

## 4. Mesa
- **Does well:** separates the model (environment, scheduler, RNG) from agents; agents step in a
  shuffled order from a seeded RNG; data collectors sample model metrics every step; models run
  headless for batch experiments.
- **Does badly for us:** Python, object-per-agent with dynamic dispatch; a browser game needs flat
  arrays and no allocation in the hot loop.
- **Taken:** the shape of our sim: one model object, a fixed-step scheduler, one seeded RNG in the
  state, agents with needs updated by rules, and a headless batch runner (`tools/balance.mjs`) that
  collects per-day metrics, Mesa's "batch run" idea.

## 5. rollercoaster
- **Does well:** energy conservation along a track (`v² = v₀² + 2g·Δh`), friction losses, tangent and
  normal acceleration for "g-forces".
- **Does badly for us:** a continuous function track, stepped at 1 ms with heavy math per slice;
  README says "Currently busted!".
- **Taken:** the energy model, discretized per track cell: speed from height drops, a friction loss
  per cell, a lift that holds a minimum speed, a stall test. Our intensity and thrill ratings are our
  own formulas from speed, drop size, drop steepness and turns at speed.

## Foundation chosen
- **World and render:** an isometric tile grid with integer height levels (Isomer's projection and
  shading, our own diagonal painter and cached sprites).
- **Movement:** per-destination Dijkstra distance fields on the path graph (PathFinding.js heap, the
  flow-field concept from sample 3), rebuilt only when the network changes.
- **Agents:** a Mesa-style model with a seeded RNG and fixed-step scheduler, needs-driven guests.
- **Tracks:** cell-by-cell energy physics from the rollercoaster sample, extended with lift cells and
  our own rating formulas.

No sample code is included in the game; there is nothing to attribute in source comments beyond the
ideas credited here.
