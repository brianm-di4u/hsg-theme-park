# UI icon prompts

The 18 painted UI icons (`assets/icon-*.webp`) were generated for this game with OpenAI image generation, run through
Codex on 2026-10-29. The raw 1024 × 1024 PNGs go in `art-src/icons/`, which is git-ignored. They are packed to 96 px
WebP by `node shared/test-harness/art-pack.mjs .` using `art-src/art.json`, which trims each icon and keys out its
white background.

`icon-rides.png` was generated first as the pilot. The other 17 used it as the style reference so the set matches.

## Shared style prompt

> A mid-century American roadside / motor-hotel signage look, like a small enamel badge emblem. Simple bold silhouette
> readable at 32 px, thick clean shapes, a subtle painted gouache texture and soft highlight, a thin dark-slate
> (#34424A) outline. Palette only: cream #FFF6E0, turquoise #3FBFB5, coral #F26B5B, mustard #F4C542, slate #34424A,
> pine green #2F4A2C, warm brown #8B5A33. Centered subject filling ~80% of the square, on a TRANSPARENT background (if
> transparency is impossible, a perfectly flat pure white #FFFFFF background with no shadow). Square 1024×1024. No
> text, no letters, no numbers, no logos, no brand marks, no real-world landmarks.

## Subjects

| File | Subject |
|---|---|
| icon-inspect | a magnifying glass |
| icon-paths | a short stretch of paver walkway with a little step, seen at an angle |
| icon-rides | a small carousel with a striped turquoise-and-cream canopy (pilot) |
| icon-coasters | a red roller-coaster hill of track with a white lattice support and one small car |
| icon-water | a curling water slide splashing into a pool |
| icon-shops | a food kiosk with a striped coral awning |
| icon-scenery | a shortleaf pine tree next to a small flower bed |
| icon-terrain | a stepped green hill with a shovel |
| icon-demolish | a wrecking ball on a chain |
| icon-staff | a groundskeeper's cap and broom |
| icon-park | a clipboard with a checklist (no readable text) |
| icon-sun | a simple sun disc with rays, no face |
| icon-cloud | a puffy cloud |
| icon-rain | a cloud with rain drops |
| icon-storm | a dark cloud with a lightning bolt |
| icon-cash | a folded dollar bill (no text or portrait) |
| icon-guests | two small cheerful park-goer silhouettes |
| icon-rating | a five-point star badge |
