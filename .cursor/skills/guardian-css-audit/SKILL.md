---
name: guardian-css-audit
description: Audit, stabilize, and normalize guardian-auth-facade.css. Use before editing this file to verify section order, token ownership, naming contract, and forbidden patterns. Use after editing to confirm no drift was introduced.
---

# Guardian CSS Audit

Read this skill before touching `components/auth/guardian-auth-facade.css`. Run the audit checklist after any edit.

## Canonical section order

Rules must appear in this exact order. Do not insert rules between sections or rename section comments.

| # | Section comment | What lives here |
|---|-----------------|-----------------|
| 1 | `/* ---------- Root facade ---------- */` | `.guardian-auth` base — layout grid, night-default tokens, size tokens |
| 2 | `/* ---------- Brand and toggle ---------- */` | `.guardian-auth__brand`, `.guardian-auth__brand-mark` |
| 3 | `/* ---------- Guardian Corner Panel ---------- */` | `.guardian-corner-panel`, `.guardian-corner-panel__org`, `.guardian-auth__org-link`, `.theme-toggle` |
| 4 | `/* ---------- Main zones ---------- */` | `.guardian-auth__left-panel`, `.guardian-auth__card-zone`, `.guardian-auth__access-panel`, `.bg-card` overrides, submit button |
| 5 | `/* ---------- Owl scene ---------- */` | `.owl-scene*` and all day/night owl variants |
| 6 | `/* ---------- Editorial copy — sky-cycle dual sentences (no flip) ---------- */` | `.editorial-copy*` |
| 7 | `/* ---------- Access Vault ---------- */` | `.access-vault*` Storybook mock |
| 8 | `/* ---------- Guardian shield ---------- */` | `.guardian-shield*` |
| 9 | `/* ---------- Motion ---------- */` | `@keyframes` for UI micro-interactions (spin, pulse, shimmer) |
| 10 | `/* ---------- Responsive — override director tokens only ---------- */` | `@media` breakpoints |
| 11 | `/* ---------- Living sky cycle (Ns ambient) ---------- */` | Ambient class animations and `@keyframes` for sky cycle |
| 12 | `/* ---------- Ambient timer ring ---------- */` | `@property`, timer `@keyframes`, `.guardian-corner-panel::after` ring |
| 13 | `@media (prefers-reduced-motion: reduce)` | Motion kill-switch — always last |

## Token ownership

| Scope | Owns |
|-------|------|
| `:root` | `--guardian-font-*`, `--guardian-ease`, `--guardian-morph-*`, `--guardian-gold`, `--guardian-blue`, `--guardian-green`, `--guardian-red`, `--guardian-amber` |
| `.guardian-auth` (night defaults) | `--scene-*`, `--guardian-plate`, `--guardian-sky-duration`, `--guardian-sky-ease`, `--g-*` layout/sizing tokens |
| `.guardian-auth--day` | Overrides of `--scene-*`, `--guardian-plate`, grain/owl scale tokens |
| `.guardian-auth--state-*` | Overrides of `--scene-shield`, `--scene-shield-soft`, `--scene-stars` only |

Never define `--scene-*` tokens in `:root`. They are mode-specific and must live in `.guardian-auth` or `.guardian-auth--day`.

## Naming contract

| Prefix | Scope |
|--------|-------|
| `.guardian-auth__*` | Facade layout slots (brand, brand-mark, left-panel, card-zone, access-panel, threshold, org-link) |
| `.guardian-corner-panel*` | Corner panel and its children |
| `.owl-scene__*` | Scene layers (atmosphere, owl, ghost, grain, geometry, particles, vignette) |
| `.editorial-copy__*` | Editorial poster copy (set--day, set--night, headline, subheadline, proofline) |
| `.access-vault__*` | Storybook mock card only — NOT used by Neon AuthView |
| `.guardian-shield__*` | Shield emblem and rings |
| `.theme-toggle` | Button-only; no layout properties |

## Forbidden patterns

- **Duplicate selector blocks** — every selector must appear exactly once. A second block for the same selector is always a bug. Merge before shipping.
- **`position: absolute` on `.guardian-corner-panel`** — the panel is flow-positioned inside the card-zone column. Absolute positioning causes viewport-coordinate drift.
- **`!important` outside `.bg-card` overrides** — the only sanctioned use of `!important` is overriding Neon AuthView / Tailwind utility classes on `.bg-card` descendants.
- **`@keyframes` outside sections 9 or 12** — motion must be centralized. Never declare keyframes inline near a component rule.
- **`--scene-*` tokens in `:root`** — these are mode-dependent; they belong only in `.guardian-auth` or `.guardian-auth--day`.
- **`position: absolute` without `z-index`** — every absolutely positioned element must declare its stacking layer explicitly.

## Audit checklist

Run after every edit to `guardian-auth-facade.css`:

```
1. Section order:
   rg "^\/\* -{3,}" components/auth/guardian-auth-facade.css
   → Sections must appear in the canonical order above. No extras.

2. Duplicate selectors:
   rg -c "\.guardian-auth__brand\b" components/auth/guardian-auth-facade.css
   → Must return 1 (or 2 if brand-mark is counted separately — check manually)

3. Keyframes location:
   rg -n "@keyframes" components/auth/guardian-auth-facade.css
   → Line numbers must all fall inside section 9 (Motion) or section 12 (Ambient timer ring)

4. No absolute corner panel:
   rg "guardian-corner-panel" components/auth/guardian-auth-facade.css | rg "absolute"
   → Must return no results

5. scene-token in :root:
   rg --multiline ":root\s*\{[^}]*--scene-" components/auth/guardian-auth-facade.css
   → Must return no results

6. Orphaned !important:
   rg "!important" components/auth/guardian-auth-facade.css
   → Review each hit — only .bg-card overrides are allowed
```

## When to read this skill

- Before adding any rule to `guardian-auth-facade.css`
- Before a theme-switch or sky-cycle change
- When a visual element drifts between Storybook and localhost
- When a reviewer reports a layout jump after a deploy

## Quick-fix table

| Symptom | Likely cause | Where to look |
|---------|--------------|---------------|
| Corner panel drifts on resize | `position: absolute` re-introduced | Section 3, `.guardian-corner-panel` |
| Theme flash on button | `background` not on `--scene-button` | Section 4, `button[type="submit"]` |
| Brand mark jumps | Duplicate `.guardian-auth__brand` block | Section 2 |
| Grain bleeds into card | Missing `mask-image` | Section 5, `.guardian-auth--day .owl-scene__grain` |
| Ambient cycle never shows | `focus-within` pause rule re-added | Section 11 — must NOT contain `:focus-within` |
| Timer ring missing | `guardian-corner-panel` not `position: relative` | Section 3 and Section 12 |
