# Spa City Thrills: town content

Everything from the Hot Springs research that this game uses, with its source. Spa City Thrills is an
**original** theme-park builder. The real Hot Springs theme park (Magic Springs) inspires the setting,
the campaign's eras and some tuning shapes only. The game is not branded as that park: no logos, no
real ride names in play, nothing that implies endorsement. Real names appear only inside sourced
history cards, which are labelled as history.

Source keys follow `research/magic-springs.md` (W-MS = Wikipedia: Magic Springs, CP = Coasterpedia,
W-AT = Wikipedia: Arkansas Twister, W-XC = Wikipedia: X-Coaster, W-GT = Wikipedia: The Gauntlet,
SR-2026 = Sentinel-Record, May 11, 2026). "Bank" = the audited trivia bank
`games/trivia/data/questions.json`; only `confirmed` items are shown to players.

## 1. Park history over the decades (campaign spine)

| Year | Fact | Use in game | Source |
|---|---|---|---|
| 1978-07-22 | The park opened as "Magic Springs Family Fun Park" | Scenario 1 "Opening Summer" (1978); history card | Bank hs-0414, hs-0415 (W-MS) |
| 1978 | Built by local businessman Bob Sykes, managed by Leisure and Recreation Concepts (Dallas) | Not shown (people not needed); flavor is "a local builder" | magic-springs.md timeline (W-MS) |
| 1978 | Opening rides confirmed: a log flume, a tall observation/paratower, a kiddie coaster | Scenario 1 unlock list: log flume, observation tower, kiddie coaster (generic types, original names) | magic-springs.md (W-MS; CP; EOA) |
| 1978 | The log flume dates to the 1978 opening | History card | Bank hs-0422 (W-MS) |
| 1910–1977 | The first tower began as a 1910 Swiss cargo crane and stood at the 1937 Paris World's Fair before two other expos and two parks | History card (1937 fair only); inspires the fictional "provenance" line on used-ride listings | Bank hs-0424 (W-MS) |
| 1980 | A launched looping shuttle coaster opened; it later moved to Elitch Gardens in Denver | History card for the used-ride market | Bank hs-0423 (CP) |
| 1980s | Debt-burdened investors sold the park to a new owner group that had money trouble of its own | Scenario 2 "Debt Season" (1984) | magic-springs.md timeline (W-MS) |
| 1991 | The park paid $10,000 for a used wooden coaster (plus about $900,000 to move it) | Scenario 3 "The Secondhand Woodie": a used wooden coaster listed for $10,000 plus a relocation fee (game scale) | Bank hs-0419 (W-AT); relocation from magic-springs.md (W-AT) |
| 1992 | That wooden coaster has a 95-ft lift hill and a wood structure; it first ran in Florida as The Roaring Tiger | History cards | Bank hs-0420, hs-0421, hs-0418 (W-AT) |
| 1995 | The park closed in 1995 and stayed shut until May 2000 | Scenario 4 "Hold the Gates": keep a struggling park open | Bank hs-0416 (W-MS) |
| 1995 | A Belgian company, Fitraco, bought it at a foreclosure auction | History card | Bank hs-0417 (W-MS) |
| 2000-05-27 | Reopened after Hot Springs voters approved a bond issue; a water park debuted | Scenario 5 "Bond Rebirth": bond cash, dormant rides, build a water park | Bank hs-0432, hs-0433, hs-0434 (W-MS; CP) |
| 2000–2004 | Attendance: more than 362,500 (2000), about 272,000 (2001), about 254,000 (2002), more than 291,000 (2003), past 400,000 (2004) | Novelty-decay tuning shape (about −25% in year two without a new major ride); history cards for 2000 and 2004 | Bank hs-0437, hs-0438; decline years from magic-springs.md (W-MS) |
| 2003 | A 5,000-seat amphitheater opened; concerts every Saturday in season | Scenario 6 "Saturday Night Stage"; the Amphitheater building, Saturday concerts | Bank hs-0439, hs-0440, hs-0441 (W-MS) |
| 2004 | An inverted coaster built for Jazzland (New Orleans) by Vekoma; $7 million; 5 inversions | History cards; Scenario 6 coaster goal | Bank hs-0446, hs-0447, hs-0448, hs-0449 (W-GT) |
| 2006 | A 150-ft looping shuttle coaster reaching 65 mph | History cards | Bank hs-0444, hs-0445 (W-XC) |
| 2017 | EPR Properties bought the park (late 2016 sale per W-MS); Premier Parks, LLC manages it | History card (owner/operator split) | Bank hs-0435, hs-0436 (W-MS) |
| 2026 | "Cooler Sundays": $36.99 for both parks, bring your own food and cooler | "Cooler Sundays" pricing lever (more guests, less food revenue); history card | Bank hs-0452 (SR-2026) |
| 2026 | New restaurant focused on wings and tenders | The "Chicken Shack" stall (original name); history card | Bank hs-0360 (SR-2026) |

**Not used as facts** (disputed or unconfirmed in the research): the wooden coaster's retirement year
(2024 vs 2025), the looping shuttle's 2026 status, the EPR sale date beyond "late 2016" in the bank,
flat-ride opening years, the 1976 founding claim, the awards list. Incidents (2006, 2007, 2017) are
public record but are **not** shown; the game abstracts them as generic breakdowns and inspections
with no victims or injuries (magic-springs.md "Incidents": "abstract as generic mechanics").

## 2. Ride types over the decades (catalog inspiration, generic types only)

From magic-springs.md attraction tables. The game uses only generic type names (carousel, log flume,
swinging ship, drop tower…) and its own invented ride names.

| Era | Generic types seen at the real park | Game unlock era |
|---|---|---|
| 1978 | log flume, observation/paratower, kiddie coaster, kiddie airplanes | 1978 |
| 1979–1992 | bumper cars, launched looping shuttle, carousel, track cars, kiddie train, used wooden coaster, steel sit-down coaster | 1980s–1991 |
| 2000 | spinning boom, swinging pirate ship, wild-mouse coaster, family coaster, wave swinger, power-surge spinner, teacups, kiddie rides | 2000 |
| 2001–2018 | drop tower, mine-train coaster, inverted coaster, shoot-the-chute, looping shuttle, skycoaster (up-charge), second drop tower | 2003+ |
| Water park 2000–2012 | wave pool, lazy river, slide tower (2000 era) → slide complex (2007) → 7-lane racing slide (2008) → surf simulator (2010) → giant splash play structure (2012) | Water research tree, in that real order |

- **Intensity 1–5:** the park rates rides on a 1–5 scale (W-MS). The game rates every ride 1–5.
- **Height tiers:** 32, 36, 42, 48, 52 in appear in the ride tables (W-MS; CP). The game uses
  36 / 42 / 48 / 52 in tiers.
- **Up-charge ride:** the skycoaster costs extra ($20 / $30 / $40 for one, two or three riders, W-MS).
  The game's "Sky Swing" is an up-charge ride even when admission is pay-one-price.
- **Used-ride flow:** coasters and flat rides moved between parks in both directions (magic-springs.md
  "Secondhand flow"). The game has a used-ride market with *fictional* provenance lines.
- **Retire or leave standing:** a retired wooden coaster stands, not operating, with a tribute at its
  entrance (W-AT; KARK snippet). The game lets a ride be "left standing" as scenery.

## 3. Water park

| Fact | Use | Source |
|---|---|---|
| Admission included with park admission | Water rides use the same gate | magic-springs.md (W-MS) |
| Open daily May through mid-August, then weekends through end of September | Water-park calendar: daily May → mid-August, weekends in late August–September, closed April and October | magic-springs.md (W-MS) |
| Real build order 2000 → 2012 (above) | Water research order | magic-springs.md (W-MS) |

## 4. Concerts

| Fact | Use | Source |
|---|---|---|
| 5,000-seat amphitheater (2003), concerts every Saturday in season | Amphitheater building; concerts only on Saturdays | Bank hs-0439, 0440, 0441 |
| Free lawn seating, 26 rows of reserved benches; reserved $5, VIP (first six rows) $10, "probably historical" | Concert ticket split: lawn free, reserved and VIP seats sold at $5 and $10 (shown as game prices) | magic-springs.md (W-MS) |
| Concerts are "one of the park's biggest draws" (2026) | Concert nights raise that day's attendance and food sales | SR-2026 |
| No historic performer list exists | All acts are fictional bands | magic-springs.md "Known gaps" |

## 5. Operations, staff, food, events

| Fact | Use | Source |
|---|---|---|
| Season April through October | The game season runs April–October; November–March is a winter build break | magic-springs.md (W-MS) |
| Nearly 600 seasonal employees, many teenagers in first jobs (claim, aggregate only) | Teen seasonal staff; part of the crew returns to school in mid-August (staff availability drops on weekdays late August–September) [inferred mechanic] | magic-springs.md (SR-2026); bank hs-0450 is a *claim* so it is not shown |
| School group days in May (Education In Motion) | "School Days" marketing campaign fills May weekdays | magic-springs.md (W-MS; SR-2026) |
| October Halloween festival | "Fright Nights" October event (original name) | magic-springs.md (W-MS) |
| 2026 bundle: pizza, funnel cakes, refill bottles; wings-and-tenders restaurant | Stalls: Pizza Slice, Funnel Cakes, Chicken Shack, Refill Bottles drink stand | magic-springs.md (SR-2026) |
| McClard's Bar-B-Q, famous Hot Springs barbecue (goat barbecue by 1928) | A generic "Hickory BBQ" stall (no business name used) | culture-events-food.md (EOA) |
| Rainy weather kept many guests away early in 2025 | Rain lowers arrivals; wet springs | magic-springs.md (SR-2026) |

## 6. Terrain and setting

| Fact | Use | Source |
|---|---|---|
| Park is in Hot Springs, about 50 miles from Little Rock | Title-screen line "In the Ouachita hills of Hot Springs, Arkansas" | magic-springs.md (W-MS) |
| Layout, zones, acreage and address are unknown | The map is fully original: generated wooded ridges with a creek valley | magic-springs.md "Known gaps" |
| Water-park and dry-park ride names suggest mountain, bear, logging and mining themes [inferred] | Original zone themes: Logging Camp, Mine Ridge, Bear Hollow, Steam Valley | magic-springs.md "Theming and layout" |
| Hilly Ouachita terrain [inferred] | Height levels matter: grading costs, uphill paths tire guests, coasters save on supports along slopes, water rides pay pump costs to lift water | magic-springs.md "Game hooks" 6 |
| Shortleaf pine, oak, novaculite, sandstone | Terrain and tree palette (`ouachita-forest`, `nps-rustic`) | shared/design/tokens.css |
| Spring redbud and dogwood, fall maple and oak oranges | Seasonal tree colors | visual-style-guide.md (Spa City Thrills hooks) |
| Coaster track red with white lattice supports; mid-century signage kit (neon arrows, starbursts) | Track and UI art | visual-style-guide.md |
| Palettes: `motor-hotel` signage, `lake-life` water park, `nps-rustic` + `ouachita-forest` hillside, `deco-neon` night | Game palette | visual-style-guide.md; tokens.css |

## 7. Weather and seasons (Hot Springs monthly normals)

The sim draws daily weather from these normals (`geography-lakes-mountains.md` → Climate, from
climate-charts.com NOAA normals; `tools/check-facts.mjs` checks the numbers the game uses):

| Month | Avg high °F | Avg low °F | Precip in |
|---|---|---|---|
| Apr | 74.4 | 51.8 | 5.9 |
| May | 81.5 | 61.0 | 6.3 |
| Jun | 90.6 | 69.9 | 4.0 |
| Jul | 93.3 | 72.6 | 4.0 |
| Aug | 92.8 | 71.7 | 3.7 |
| Sep | 86.7 | 64.8 | 4.0 |
| Oct | 75.4 | 52.5 | 4.3 |

- May is the wettest month (bank hs-0176). Rain chance in the game scales with precipitation.
- Thunderstorms close tall rides, coasters and water rides for a while [game rule].
- Hot days push guests to water rides and drink stands; water rides draw little below about 78 °F
  [game rule].

## 8. Tourism context (light touch)

| Fact | Use | Source |
|---|---|---|
| The racetrack's winter–spring meet builds to the Arkansas Derby | "Race season" April bonus: extra tourists in town in April (fictional "the track" only, no names) | oaklawn-and-racing.md |
| A mountain-bike trail system opened in 2018 and drew 15,000+ riders in its first year (snippet) | Not used as a fact; a sandbox-only "trail riders in town" flavor event is out of scope | other-attractions.md |
| Heritage attractions: alligator farm (1902), ostrich farm (1900–1953), IQ Zoo (1955–1990) | History cards in the album (heritage set); no placeable copies of real businesses | Bank hs-0399, hs-0410, hs-0333, hs-0495 |

## 9. History cards shown in the game

`src/js/data/facts.js` lists every card with its bank id or research quote. `tools/check-facts.mjs`
verifies each bank id is `confirmed` with the same source, and each research quote appears in the
named research file. Card text is paraphrased and avoids real ride names except where the bank
answer itself is the point (none of the shown cards name a ride).

## 10. Names the game must not use

From magic-springs.md "Names that do NOT exist" and the content rules: no real ride names in play,
no park logo or name on the title, no "Hurricane", no "Krypton", no Herschend or Mid-America Parks.
All ride, stall, band and company names in play are original and fictional.
