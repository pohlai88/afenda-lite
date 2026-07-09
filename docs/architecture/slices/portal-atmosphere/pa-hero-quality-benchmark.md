# PA Hero Quality Benchmark — what the user actually wants

**Read this before any hero/atmosphere UI work.** This is the user's quality bar, not a suggestion.

---

## Verification story (one sentence)

The user is building a **laptop auth hero** that **visually matches the PNG comps** in `public/brand/heroes/` at **1024px width**, composed from portal-atmosphere primitives in **Storybook first**, with **no prod auth wiring** until the user signs off a side-by-side comp comparison.

**This is not:** "compose existing PA components and ship."  
**This is:** "match the comp PNGs until a human says yes."

---

## Quality benchmark (sole visual authority)

| File | Role |
|------|------|
| [`public/brand/heroes/auth-hero-dark.png`](../../../../public/brand/heroes/auth-hero-dark.png) | **Dark theme** — midnight vault, navy editorial, celestial rings, owl left-of-center |
| [`public/brand/heroes/auth-hero-light.png`](../../../../public/brand/heroes/auth-hero-light.png) | **Light theme** — archival ivory, marble wash, inverted TRUTH mark, owl center-back |
| [`public/brand/heroes/auth-hero-dual.png`](../../../../public/brand/heroes/auth-hero-dual.png) | **Extraction source** for sharp owl crops (`npm run brand:extract-sharp-owl`) |

**If Storybook at 1024px does not look like these PNGs, the work is not done.**  
Tests passing, build green, and "uses correct components" are necessary but **not sufficient**.

---

## What the comp shows (zone map)

Both themes share the same **three-zone laptop layout** at ≥1024px:

```
┌─────────────────────────────────────────────────────────────┐
│  [toolbar: logo + theme toggle]                    (top)      │
├──────────────────────────┬──────────────────────────────────┤
│  EDITORIAL (left ~40%)   │  ACCESS VAULT (right ~26–28rem)  │
│  TRUTH                   │  shield + "Access Vault"         │
│  ─ IS ─                  │  email / password                │
│  PROTECTED               │  Unlock (+ Google on prod)       │
│  seal line               │  Create account…                 │
│                          │                                  │
│         OWL + ATMOSPHERE (center-back, behind both)         │
│         integrated — not a floating square sticker          │
└─────────────────────────────────────────────────────────────┘
                    100svh · no vertical scroll
```

### Editorial (left column)

- Words **stack vertically in the left column** — not spanning the full viewport width.
- **Dark:** TRUTH (navy) · IS · PROTECTED (gold) — PROTECTED may use inversion per [`portal-editorial-inversion.contract`](../../../../components/portal-atmosphere/contracts/portal-editorial-inversion.contract.ts).
- **Light:** inverted TRUTH is a **designed mark in a fixed box** (reads as intentional upside-down TRUTH, not clipped garbage like "HI…").
- Poster typography is **large but contained** — it must not blow up to fill the entire screen or shove PROTECTED to the bottom edge.
- Seal: `SECURE · CONFIDENTIAL · VERIFIED` under the poster, small caps.

### Owl + atmosphere (center-back)

**Comp-laptop Storybook (user direction):**

- **Base unit:** removebg PNG per theme — `owl-variants/darkbg-removebg-preview2.png` (dark) · `owl-variants/whitebg-removebg-preview2.png` (light) via `PortalCompLaptopOwl`.
- **Deco top-up:** CSS only — `PortalCelestialDeco` (`__wash`, `__rings`, `__glow`). No pasted hero PNG stickers.
- Integrated behind editorial + vault — tune position/opacity in `portal-atmosphere.comp-laptop.css` until side-by-side matches comp.

**Production auth (until sign-off):** `PortalGuardianOwl preset="sharp"` + `guardian-sharp-*.png`.

- **Forbidden:** one image + CSS `invert()` / hue-rotate for theme switching.

### Access Vault (right column)

- Card matches comp proportions: shield icon, **one** title "Access Vault", realistic form chrome.
- **Dark:** glass vault, blue Unlock gradient, Google row (prod only).
- **Light:** white card, navy title, olive/brown Unlock, subtle borders.
- **Forbidden in visual review stories:** meta copy like "Design review placeholder…" visible on screen — that is dev scaffolding, not comp fidelity.

### Viewport

- **Laptop target:** 1024–1440px width, **100svh**, **no vertical scrollbar**.
- Below 1024px: existing PA-P8 mobile order applies; do not break it with laptop-only hacks on global `.portal-atmosphere`.

---

## Definition of done (agent checklist)

Work is **done** only when **all** are true:

| # | Gate | Evidence required |
|---|------|-------------------|
| 1 | Side-by-side comp compare | Storybook story with live fixture **next to** `auth-hero-*.png` at 1024px; user can judge visually |
| 2 | Dark matches `auth-hero-dark.png` | Editorial left · owl integrated · vault right · no scroll |
| 3 | Light matches `auth-hero-light.png` | Inverted TRUTH reads correctly · marble atmosphere · owl soft · vault right |
| 4 | No rejected shortcuts | No invert filter, no single-owl preset, no pasted hero PNG sticker — see [`pa-rejected-approaches.md`](./pa-rejected-approaches.md) |
| 5 | Storybook boundary clean | `npm run check:storybook-auth-boundary` pass |
| 6 | Assets on disk | `npm run test:unit -- lib/portal-brand.assets.test.ts` pass |
| 7 | Human sign-off | User explicitly approves before **any** `PortalAuthLayout` / prod wiring |

**Do not mark todos complete or declare Phase 5 done without row 7.**

---

## What the user rejected (do not repeat)

Documented in [`pa-rejected-approaches.md`](./pa-rejected-approaches.md). Summary:

| Rejected | Why |
|----------|-----|
| Single owl + CSS invert for light | Copy-paste sticker, not comp quality |
| Composing PA primitives without pixel pass | Produces broken layout: PROTECTED spanning bottom, TRUTH reading as "HI…", square owl sticker, flat background |
| Thin CSS rings as "the whole atmosphere" | Not celestial/marble from comp |
| Wiring experiments into `PortalAuthLayout` before sign-off | Scope violation |
| Declaring done because tests pass | Tests don't measure comp fidelity |

**Comp Laptop Hero v2 (2026-07-09):** structurally wired in Storybook but **failed visual benchmark** — treat as incomplete until comp-aligned CSS/layout pass, not as approved design.

---

## Allowed workflow (only path)

1. **Plan** — name the reference PNG and zone map (this doc).
2. **Storybook fixture** — `components/portal-atmosphere/fixtures/` + `stories/ui-evaluation/`.
3. **Compare** — `ReferenceComparisonDark` / `ReferenceComparisonLight` pattern (live + static PNG side-by-side).
4. **Tune CSS** — scoped modifier (e.g. `.portal-atmosphere--comp-laptop`), token-driven, layered atmosphere.
5. **Stop** — wait for user "looks good" before prod.
6. **Prod wiring** — separate PR, optional prop on `PortalAuthLayout`, PA-P10 only.

---

## Verification procedure (agents)

Run in order. **Stop at first failure.**

```bash
# 1. Assets exist
npm run brand:extract-sharp-owl   # if guardian-sharp-*.png missing
npm run test:unit -- lib/portal-brand.assets.test.ts

# 2. Storybook compiles
npm run build-storybook
npm run check:storybook-auth-boundary

# 3. Visual (mandatory — cannot be skipped)
npm run storybook
# Open: Portal Atmosphere / Comp Laptop Hero
# Viewport: laptop1024
# Compare: DarkLaptop1024 vs ReferenceComparisonDark
# Compare: LightLaptop1024 vs ReferenceComparisonLight
```

**Checking:** Does live Storybook match the PNG at 1024px?  
**Evidence:** Side-by-side screenshot or explicit user approval.  
**Next:** If no match → fix layout/CSS; do not add features or wire prod.

---

## Skills routing (what leads design vs hygiene)

| Role | Skill / doc | Does NOT do |
|------|-------------|-------------|
| **Visual authority** | **This doc + `public/brand/heroes/*.png`** | — |
| **Architecture** | ADR-Portal-BG-001, PA slices | Pick colors or layout |
| **Forbidden patterns** | `pa-rejected-approaches.md`, `.cursor/rules/portal-atmosphere-design.mdc` | — |
| **Workflow** | `using-agent-skills`, `incremental-implementation` | Design decisions |
| **Hygiene only** | `frontend-ui-engineering`, WIG, WCAG | Match comps, approve visuals |

**`frontend-ui-engineering` is not the design lead.** It prevents AI slop and a11y bugs; it does not interpret the hero PNGs.

---

## Anti-patterns (instant fail)

- "Stories render without errors" = done
- Reusing default `PortalEditorialHero` poster CSS without comp-scoped layout overrides
- Owl positioned with guessed `%` values without side-by-side PNG review
- Visible placeholder/dev copy on visual review surfaces
- `100svh` + `overflow: hidden` on global `.portal-atmosphere` (clips focus rings; use scoped modifier only)
- Any approach listed in `pa-rejected-approaches.md`

---

## Related

- [ADR-Portal-BG-001](../../adr/ADR-Portal-BG-001-portal-atmosphere-system.md)
- [pa-rejected-approaches.md](./pa-rejected-approaches.md)
- [PA-P7 design review baselines](../../../ui-evaluation/portal-atmosphere/README.md)
- Cursor: `.cursor/rules/portal-atmosphere-design.mdc`, `.cursor/rules/agent-workflow.mdc`
