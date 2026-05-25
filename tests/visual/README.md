# Visual regression — Hero claymorphism shadows

Guards the offset green shadow shared by the hero chips
(Colaboração / Matchmaking / Regenerativo) and the **Já tenho conta** button.
If a theme change (e.g. tokens in `src/index.css` or the
`.clay-shadow-hero{,-lg}` utilities) alters the rendered shadow, this check
fails with a pixel diff image.

## Setup (once)

```bash
npm i -D playwright pixelmatch pngjs
npx playwright install chromium
```

## Capture baselines

Start the dev server (`npm run dev`) so the landing page is reachable, then:

```bash
node scripts/visual-check-hero-shadows.mjs --update
git add tests/visual/baselines
```

Re-run `--update` intentionally whenever the design system changes the
shadow on purpose, and commit the new baselines.

## Verify after a change

```bash
node scripts/visual-check-hero-shadows.mjs
```

- Exits `0` when every target is within 0.5% of its baseline.
- Exits `1` and writes a colored diff PNG to `tests/visual/diffs/<name>.png`
  for each element that drifted.

Point at a different environment with the `URL` env var, e.g.
`URL=https://taskmates.app node scripts/visual-check-hero-shadows.mjs`.

## What is captured

Each target is screenshot with ~24px of padding **below** the element so the
offset shadow bar is part of the comparison, not just the surface color.

| Target              | Selector                                  |
| ------------------- | ----------------------------------------- |
| `chip-0..2`         | `[data-testid="hero-chip"]` (nth 0..2)    |
| `btn-have-account`  | `[data-testid="hero-have-account"]`       |
