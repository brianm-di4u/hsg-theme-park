# Spa City Thrills

Theme-park builder / management sim. Part of **Hot Springs Games**, an open-source (MIT) collection of browser games set in
Hot Springs, Arkansas. The game ships as a self-contained `index.html`: art is drawn in code or painted into
`assets/`, sound is synthesized with WebAudio, and nothing loads from the network.

All games in the collection are original designs. Real places, schools and businesses appear as setting and
history only; no logos are reproduced and nothing implies endorsement. School rosters are fictional.

## Play

Open `index.html` in a browser, or serve the folder (`python -m http.server 8765`) and open http://127.0.0.1:8765/.

## Develop

```bash
npm run setup   # installs Playwright and Chromium for the test harness
npm run build   # rebuilds index.html from src/ (edit src/, not index.html)
npm test        # runs tests/*.test.mjs; screenshots land in screenshots/
```

Design docs: `PRD.md`, `MECHANICS.md`, `DEV-PLAN.md`, `REPORT.md`, `VISUAL-PLAN.md`, `VISUAL-REPORT.md`.

## Vendored from the collection

This repo was split out of the [hot-springs-games](https://github.com/brianm-di4u/hot-springs-games) monorepo,
which keeps the full research corpus, `LESSONS.md` and the session brief. Copies kept here so the game builds and
tests on its own:

- `shared/test-harness/`: the Playwright screenshot test runner (`run.mjs`, `art-pack.mjs`, `sheets.mjs`, `gallery.mjs`).
- `shared/tools/inline.mjs`: bundles `src/` into the single-file `index.html`.
- `shared/data/trivia-questions.json`: snapshot of the audited trivia bank (`data/questions.json` in [hsg-trivia](https://github.com/brianm-di4u/hsg-trivia)), read by the fact-check tools.
- `research/`: `magic-springs.md`, `geography-lakes-mountains.md` come from the collection's shared research corpus.

Older docs in this repo refer to monorepo paths such as `games/theme-park/` and `shared/...`; here the game
folder is the repo root.

## License

MIT (see `LICENSE`). Third-party code in `vendor/` keeps its own license.
