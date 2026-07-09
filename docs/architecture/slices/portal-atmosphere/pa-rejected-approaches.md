# Rejected approaches — do not reintroduce

Permanent register of atmosphere/hero experiments the user rejected. Agents must read this before implementing hero or owl work.

| Date | Approach | Why rejected | Status |
|------|----------|--------------|--------|
| 2026-07-08 | **Single-owl preset** — one `guardian-sharp-full.png`, CSS `invert()` for light theme, two CSS ring pseudo-elements | Looked like copy-paste sticker, not comp-aligned design; light owl must be a real asset | **Removed** — code deleted |
| 2026-07-08 | **Laptop Hero Storybook** (`portal-atmosphere-laptop-hero.stories.tsx`) | Same failed approach packaged as stories | **Removed** |
| 2026-07-08 | **`.portal-atmosphere--laptop-hero`** height lock tied to single preset | Part of rejected experiment | **Removed** |
| 2026-07-09 | **Comp-laptop fixture shipped without comp pixel pass** — PA primitives composed, CSS guessed, visible placeholder copy, editorial/owl layout does not match `auth-hero-*.png` | Looked broken vs benchmark: TRUTH reads as "HI…", PROTECTED spans viewport, owl sticker on flat bg | **Incomplete** — see [`pa-hero-quality-benchmark.md`](./pa-hero-quality-benchmark.md) |

## What to do instead (when user asks again)

1. Read **[`pa-hero-quality-benchmark.md`](./pa-hero-quality-benchmark.md)** — sole definition of "done".
2. Match `public/brand/heroes/auth-hero-dark.png` and `auth-hero-light.png` at **1024px side-by-side** in Storybook.
3. Use separate dark/light owl assets (`owl-variants/allowed-base/*` or dedicated sharp crops) — not one image + filters.
4. Build layered CSS atmosphere (marble / celestial, geometry, typography) — not a pasted PNG.
5. Storybook fixtures first; **human sign-off** before any prod wiring.

## Updating this file

Add a row when the user rejects an approach by name or asks for complete removal.
