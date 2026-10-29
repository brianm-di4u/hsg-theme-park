# Terrain, forest and light for the 3D view

The park map is still the game's own seeded 48 × 48 terrain. Around it, the 3D view shows real terrain: a
2.88 km square of the Ouachita ridges north-west of Hot Springs. The park is fictional. The site is a generic
valley at the foot of a ridge. It is **not** the real park's site, which lies east of town on US 70.

## Backdrop site (baked into `assets/dem.js` by `tools/geo/`)
| Item | Value | Source |
|---|---|---|
| Window | lon −93.13915 to −93.10765, lat 34.52833 to 34.55427 (about 2.88 × 2.88 km), true north up | chosen by the authors from a hillshade preview of the region |
| Elevation | USGS 3DEP seamless DEM, sampled at 288 × 288 (10 m), 147.5–363.5 m in the window | [USGS 3DEP ImageServer](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer) (public domain) |
| Land cover | NLCD 2021 at the same grid: 36% deciduous, 22% mixed, 11% evergreen, 20% open, 8% developed (drawn as open ground), 2% shrub | [MRLC NLCD 2021 WMS](https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2021_Land_Cover_L48/wms) (public domain) |
| Relief | a ridge rises about 200 m directly north of the park; flat valley to the south | measured from the DEM |
| Scale | 1 map tile = 3 m; heights at true scale; the relief on the camera (south-east) side is flattened so it never hides the park | game choice |

## Forest (what the trees and canopy show)
- The ridges trend east–west, which is unusual in North America. South-facing slopes carry pine forest or
  woodland and north-facing slopes hardwoods, so vegetation forms east–west bands. [Encyclopedia of Arkansas: Ouachita Mountains](https://encyclopediaofarkansas.net/entries/ouachita-mountains-442/)
  (already in the shared `research/fish-and-wildlife.md`). The backdrop picks pine vs hardwood by each sample's
  aspect from the DEM, weighted by the NLCD class.
- Canopy trees: shortleaf pine; southern red, red, black and white oaks; hickories. Valley bottoms carry sweetgum,
  sycamore, beech and hornbeam. [NPS Inventory & Monitoring: HOSP](https://www.nps.gov/im/htln/hosp.htm)
- Old-growth trees in the national park include shortleaf pine, blackjack oak and white oak. [Wikipedia: Hot Springs National Park](https://en.wikipedia.org/wiki/Hot_Springs_National_Park)
- Shortleaf pine reaches 80–100 ft (24–30 m), with "a pyramidal head that contains several small branches"
  and needles in bundles of two and three, 7–11 cm long. [Wikipedia: *Pinus echinata*](https://en.wikipedia.org/wiki/Pinus_echinata)
  The game draws pines at stylized size (about 0.6× true height relative to guests) so rides stay visible.
- Redbud and dogwood bloom in early spring before the hardwoods leaf out. The game shows them in April, its first
  season month. Exact bloom dates in Garland County are **not sourced**.
- Autumn colour (oak and hickory russet and gold, sweetgum red) is drawn in October. Peak timing is **not sourced**.

## Stone and water
- Novaculite is a dense white-to-grey stone of the Ouachitas, quarried for whetstones (shared research cites
  [EOA Novaculite](https://encyclopediaofarkansas.net/entries/novaculite-2220/)). Rock outcrop tiles use a pale
  grey-white; cut faces near paths and rides use tan sandstone and stone retaining walls.
- The steam fountain's rim is green after the display springs' "mosses and blue-green algae" ([NPS Display Spring](https://www.nps.gov/places/maurice-historic-display-spring.htm)).
  Its warm terraced basin echoes tufa ([NPS: What is tufa?](https://www.nps.gov/hosp/learn/photosmultimedia/tufa.htm)).
  It is an original fountain, not a copy of a real one. Steam is denser on cool days.

## Sun
- The sun's position is computed for latitude 34.54° N. Solar noon is about 13:12 daylight time at this longitude
  (93.1° W, about 12 minutes behind the 90° W standard meridian, plus daylight time). Solar declination comes from
  monthly mean values (Apr +10°, May +19°, Jun +23°, Jul +21°, Aug +13°, Sep +2°, Oct −10°). Standard astronomy; the
  numbers are rounded.

## Facts worth adding to shared research
- The backdrop window and its land-cover shares (above), as a reusable "generic Ouachita valley" site.
- The shortleaf pine height, crown and needle description (Wikipedia), for any game that draws pines.
