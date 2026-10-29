# Spa City Thrills: product requirements

## 1. Vision
Build a hillside amusement park in the wooded Ouachita ridges of Hot Springs, Arkansas, and run it
through the decades. Lay paths up the slopes, place rides and stalls, draw your own coaster or log flume
down the hillside, and watch hundreds of guests choose, queue, ride, eat, complain and come back. A
campaign follows eras inspired by the real town park's history (a 1970s opening, debt, a secondhand
coaster, a closure, a bond-funded rebirth with a water park, Saturday concerts); a sandbox lets you build
freely.

**Original game.** Spa City Thrills is not a recreation of any commercial park game and is not branded
as, affiliated with or endorsed by any real park. The ride catalog, names, rules and UI are our own.
Real park history appears only on sourced history cards.

## 2. Pillars
1. **The hills are the puzzle.** Height levels change costs, routes, guest energy, coaster thrill and
   pump bills. Valleys are cheap and flat; ridges are thrilling and tiring.
2. **Readable crowds.** Every guest is an agent with needs, money, intensity tastes and thoughts, and the
   player can see why the park is or isn't working (feedback panel, thoughts, heat of the queues).
3. **Build your own ride, kept small.** A cell-by-cell track builder with honest physics, live stats and
   auto-finish: finishable in a minute on a phone.
4. **Local flavor, honest history.** Era scenarios, weather from Hot Springs monthly normals, teen
   seasonal crews, Saturday concerts, Cooler Sundays; every shown fact is sourced and labelled.

## 3. Players
Casual sim fans on laptop and phone; history-curious Arkansans; kids old enough to read prices. Sessions
of 10–40 minutes; a scenario fits in one or two sessions.

## 4. Modes
- **Campaign** (6 scenarios, unlocked in order, stars for goals met early):
  1. **1978 · Opening Summer.** Empty wooded hillside, $60,000. Build a family park: paths, gentle rides,
     a log flume, a lookout tower, food. Goals: 4,000 guests this season, rating ≥ 500. Guided tutorial.
  2. **1984 · Debt Season.** A small park with a $120,000 loan at 12%. Two seasons. Goals: loan ≤ $90,000
     and rating ≥ 560 by October 1985, never bankrupt.
  3. **1991 · The Secondhand Woodie.** The used-ride market lists a wooden coaster for $10,000 plus
     relocation. Goals: a wooden coaster with intensity ≥ 3 running, 6,000 guests, rating ≥ 620.
  4. **1995 · Hold the Gates.** An aging park with tired rides and falling attendance (history closed it
     this year). Goals: $40,000 operating profit this season and rating ≥ 600.
  5. **2000 · Bond Rebirth.** A dormant, overgrown park and bond money. Build a water park (wave pool,
     lazy river, slide tower). Two seasons. Goals: 9,000 guests in 2000, 2001 attendance ≥ 90% of 2000,
     rating ≥ 650.
  6. **2003 · Saturday Night Stage.** Build an amphitheater and book Saturday concerts; build a big coaster.
     Goals: $1,500 of concert seats, a coaster with intensity ≥ 4, rating ≥ 650.
- **Sandbox:** pick hilliness (gentle / rolling / steep), start cash ($100k / $250k / unlimited) and seed;
  everything unlocked; no goals.

## 5. Rules
The complete rules are in `MECHANICS.md` (§1–§11). Player-facing summaries live in the Help screen
under "Game rules", labelled as game rules.

## 6. Hot Springs content map
| Where | Content | Source |
|---|---|---|
| Title | "In the Ouachita hills of Hot Springs, Arkansas"; hills, pines, red coaster track with white lattice | town-content §6 |
| Scenario intros | era text inspired by the real park's arc, each with 1–3 sourced history cards | town-content §1 |
| History album | every card collected, each with its source | town-content §9 |
| Weather | daily weather drawn from Hot Springs monthly normals; May is wettest | town-content §7 |
| Calendar | April–October season; water park daily May–mid-August, weekends to September; Saturday concerts; teen staff back at school mid-August | town-content §3–§5 |
| Catalog | generic ride types seen over the decades, original names; intensity 1–5; height tiers 36/42/48/52 in; up-charge Sky Swing | town-content §2 |
| Food | BBQ, pizza, funnel cakes, chicken tenders, refill bottles, sno-cones (generic) | town-content §5 |
| Themes | Logging Camp, Mine Ridge, Bear Hollow, Steam Valley scenery sets (original) | town-content §6 |
| Palettes | `motor-hotel` signage UI, `ouachita-forest`/`nps-rustic` terrain, `lake-life` water, `deco-neon` night | visual-style-guide |

## 7. Screens and flow
Title → Campaign (scenario cards) → scenario intro (era text + history card) → Park. Title → Sandbox
setup → Park. Title → Continue (latest save). Park screen: top HUD (park, date, time, weather, cash,
guests, rating, speed), bottom dock (Inspect, Paths, Rides, Coasters, Water, Shops, Scenery, Terrain,
Staff, Demolish, Park), side panel (desktop) or bottom sheet (phone) for palettes and info windows: ride
window, guest window, Finances, Staff, Research, Marketing, Concerts, Market, Guests (feedback), Rating,
Goals, Save/Load, Settings, Help. Month-end toast; winter-break summary; win/lose screen with stars; back
to the title.

## 8. Art direction
Procedural Canvas art. Isometric terrain blocks in pine-shadow greens with sandstone sides and novaculite
rock; creek in thermal blue-green. Rides in mid-century signage colors (turquoise, coral, atomic yellow,
neon white) with red coaster track on white lattice. UI panels styled as motor-hotel signs: cream panels,
turquoise headers, coral buttons, starburst accents. Night: deco-neon tint with lamp and sign glows.
Seasonal trees: redbud pink and dogwood white in spring, green summer, orange October. Guests: small
figures, shirt color by kind plus a shape badge when selected.

## 9. Audio direction
WebAudio only, quiet by default, mute and volume in settings: build thunk, cash tick, ride bell, coaster
rattle and screams (filtered noise), splash, crowd murmur bed scaled by guest count, rain, thunder,
month-end chime, win fanfare.

## 10. Accessibility
Keyboard-only play (tile cursor for building), visible focus, text ≥ 4.5:1 contrast, text size 100–150%,
`prefers-reduced-motion` and an in-game toggle (no camera easing, no flashes, no confetti), colorblind-safe
cues (every status has an icon shape and a word, not color alone), an `aria-live` region for messages,
pause at any time.

## 11. Mobile and touch
Portrait first at 390 × 844. Map fills the screen; HUD in two compact rows; dock scrolls horizontally;
panels are bottom sheets ≤ 55% of the height. Default phone zoom keeps guests ≥ 10 px tall; pinch zoom
0.5–2×, two-finger pan. All touch targets ≥ 44 px.

## 12. Performance budgets
60 fps on a mid-range laptop with 500 guests in the park; sim tick ≤ 2 ms with 500 guests; HTML ≤ 2 MB;
interactive (hooks ready) ≤ 2 s; zero network requests; zero console errors.

## 13. Save and load
Three slots plus autosave each month end; settings and campaign stars persist; everything works with
storage blocked (in-memory fallback, a notice in settings).

## 14. Acceptance criteria
| # | Feature | Criterion |
|---|---|---|
| AC1 | Title | Title shows the game name, Ouachita setting line, Campaign, Sandbox, Continue (when a save exists), History, Help, Settings; hooks ready < 2 s |
| AC2 | Help | Tabs Basics, Building, Guests, Money, Coasters, Controls, About; rules labelled "game rules"; About states non-affiliation and sources |
| AC3 | Layout | No horizontal overflow or off-screen controls on every screen at both viewports; mobile touch targets ≥ 44 px |
| AC4 | Terrain | Same seed → same heights; heights 0–10 with ridges and a creek; hills visible as stepped blocks |
| AC5 | Paths | Drag lays a run, $12/tile; connects across ≤ 1 level (stairs); refused on water, rides, track |
| AC6 | Grading | Uneven footprint is graded to its median at $40/level, shown in the preview; terraform raise/lower works |
| AC7 | Placing | Ghost preview green/red with cost; entry detected; unconnected rides warn and get no guests |
| AC8 | Demolish | 50% refund; "leave standing" keeps a closed ride as scenery with 10% upkeep |
| AC9 | Guest flow | Guests arrive, path to rides by distance fields, queue, ride and leave; uphill walking is slower and more tiring |
| AC10 | Needs | Hungry/thirsty/bursting/tired guests use food, drink, restrooms, benches; money moves to the ledger |
| AC11 | Tastes | Guests choose rides inside their intensity range; height rules keep children off 48-in rides and adults off kiddie rides |
| AC12 | Thoughts | Guests show recent thoughts; the Guests panel lists top thoughts with icon and count |
| AC13 | Crowding | Tiles with > 6 guests slow walkers; > 10 adds "too crowded" |
| AC14 | Queues | FIFO, max length, wait estimate shown, guests skip or give up past patience |
| AC15 | Breakdowns | Rides break by reliability; a mechanic walks there and repairs; without one a contractor repairs later for $500 |
| AC16 | Litter | Guests drop litter away from bins; groundskeepers sweep; dirty paths lower happiness and rating |
| AC17 | Staff | Hire/fire 3 roles; entertainers raise nearby happiness; seasonal staff are at school on weekdays from mid-August |
| AC18 | Track builder | Station, extend with turns, up/down/steep, lift, undo, auto-finish closes the loop; a stall fails the test with the cell named; stats (length, speed, drop, intensity 1–5, thrill) and cost with support savings on slopes |
| AC19 | Flume, blueprints | Log flume variant with pump upkeep; blueprints place when they fit |
| AC20 | Ride ops | Open/close, price, pay-per-ride toggle, up-charge rides always charge |
| AC21 | Finances | Monthly ledger, loan take/repay with interest, bankruptcy rule, profit chart |
| AC22 | Rating | Rating 0–1000 with component breakdown; higher rating → more arrivals |
| AC23 | Weather | Daily weather from Hot Springs normals; rain cuts arrivals; storms close tall, coaster and water rides; temperature shown |
| AC24 | Calendar | Month = one week; winter-break summary; seasonal tree colors; water calendar; ride and park novelty decay |
| AC25 | Marketing | Four campaigns, Cooler Sundays, Fright Nights change arrivals and sales as specified |
| AC26 | Research | Budget levels accrue points and unlock items in scenario order |
| AC27 | Concerts | Amphitheater; book Saturday acts; arrivals rise; guests attend; seat revenue $5/$10 |
| AC28 | Used rides | Market listings with discount, relocation fee, lower reliability and a fictional provenance line |
| AC29 | Campaign | Six scenarios with era intro and history card, goals panel, win/lose, stars saved, next unlocks |
| AC30 | Sandbox | Hilliness, cash and seed options; all items unlocked; no goals |
| AC31 | Tutorial | Scenario 1 walks through path, ride, stall, open, speed with step checks |
| AC32 | History | Every shown fact is audited or quoted from research with its source; `tools/check-facts.mjs` passes; album lists collected cards |
| AC33 | Originality | No real ride names, park name or trademarks in play text (scanned by a test) |
| AC34 | Saves | 3 slots + autosave restore the exact park; storage blocked still plays |
| AC35 | Time | Pause and 1/2/4/8×; same seed and actions give the same state |
| AC36 | Keyboard | Build a path and a ride and run the park with the keyboard only |
| AC37 | Touch | Build a path and a ride with touch; pinch zoom and two-finger pan |
| AC38 | Real input | Mouse (desktop) and touch (mobile) build a path and a ride and guests ride it, with no setState |
| AC39 | Access | Text contrast ≥ 4.5:1, reduced motion, text 100–150%, icon + word cues, live region |
| AC40 | Audio | WebAudio sounds, mute and volume persist, quiet default |
| AC41 | Performance | ≥ 55 fps headless with 500 guests; HTML ≤ 2 MB; hooks < 2 s; no requests or console errors |
| AC42 | Balance | `tools/balance.mjs` metrics inside target bands; every scenario won by a scripted plan |
| AC43 | Phone view | Guests ≥ 10 px tall at default phone zoom; camera follows the selected guest or ride |
| AC44 | Day/night | Night tint with lamp and ride glows after 19:00; rain and storm effects |

## 15. Out of scope
Multiplayer; land purchase beyond the scenario's owned area; tunnels, underground track, loops and
inversions (track stays on the cell grid: turns, climbs and drops); multiple trains per track; guest groups that walk
together; individual staff patrol zones; season passes and bundles (noted as future levers); shops' stock;
a full day/night 24-hour cycle; custom scenario editor; real ride names, logos or any real park branding.
