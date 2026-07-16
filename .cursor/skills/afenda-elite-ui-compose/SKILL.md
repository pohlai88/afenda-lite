---
name: afenda-elite-ui-compose
description: >-
  Afenda product UI consistency lock — compose only from @afenda/ui-system with
  locked type/spacing/radius/color. QUALITY ORDER: AUTHORITY → CONSISTENCY →
  CORRECT-COMPONENT → SUITABILITY → SCALABILITY → STABILITY. Compose Score out
  of 100% with Path to 100%. Issues UI-CAP-* when reusable barrel capability is
  missing (no local compensation). Use when building or changing features/* or
  product pages, fixing handroll, auditing/rating UI, or enforcing visual
  consistency. Not a beauty pass.
---

# Afenda Elite — UI compose (consistency lock)

**Goal:** same look and same building blocks — match, do not beautify.

**Done:** SCALABILITY clear (or approved reduced status) + stability evidence green + **Compose Score** emitted. Floor: `pnpm check:ui-system`. Details: [reference.md](reference.md).

## QUALITY ORDER (binding)

A visually improved screen that violates a higher rule is a **failed change**. Do not skip ahead. Skill prose never outranks ADR-010 / ARCH-024 / `tokens.css` / the barrel.

```text
1. AUTHORITY-FIRST          ADR / barrel / tokens / Geist
2. CONSISTENCY-FIRST        Locked type · spacing · radius · color · density
3. CORRECT-COMPONENT-FIRST  Intended barrel export for the job
4. SUITABILITY-FIRST        Task-fit pattern (recipe = default, not absolute)
5. SCALABILITY-FIRST        No local compensation for reusable gaps → UI-CAP-*
6. STABILITY-FIRST          Matrix + a11y evidence (never blesses a substitute)
```

| Step | Rejects |
|------|---------|
| AUTHORITY | New tokens / parallel UI because prose “sounds nicer” |
| CONSISTENCY | Freestyle scales, `p-8`, rogue titles, raw hex |
| CORRECT-COMPONENT | Fake Button, bordered tabular `<ul>`, handrolled chrome |
| SUITABILITY | Mechanical Sheet-everywhere; Dialog-for-destroy; Button>Link without `asChild`; clickable Card |
| SCALABILITY | Local substitutes; fake/disabled actions; domain pollution of ui-system |
| STABILITY | Broken RSC/a11y/emit/build; green tests on a duplicated substitute |

Reject too loose (“shadcn where possible”) and too rigid (“every edit is a Sheet”). Recipes default; workflow may justify Dialog, page, or another barrel option.

```text
LOAD:
  docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md
  docs/architecture/ARCH-024-package-boundaries.md  (#afendaui-system)
  packages/ui-system/src/styles/tokens.css
  packages/ui-system/src/index.ts
  apps/web/app/layout.tsx · apps/web/globals.css
  .cursor/rules/ui-system.mdc
  reference.md  (recipes · F* · C* · UI-CAP · score rubric)
SKIP:
  beauty campaigns · Storybook / playground · private registries
  forking frontend-ui-engineering · scratch → Living docs
  parallel tokens / type scales · auth-surface as product kit
```

## Authority ladder · ownership · extract

```text
1. ADR-010 + ARCH-024 + tokens.css + Geist map     (Tier A / disk)
2. afenda-elite-ui-compose                          (this skill)
3. afenda-elite-frontend-scaffold                   (routes / features)
4. frontend-ui-engineering                          (a11y/state/responsive method ONLY)
5. Vendor shadcn / Vercel aesthetics                (last; drop on conflict)
```

| Concern | Owner |
|---------|-------|
| Font, radius, type, color, density, recipes, anti-handroll, Compose Score | **this skill** |
| Route tree, scaffold, FE↔BE | `afenda-elite-frontend-scaffold` |
| A11y/state/responsive method | `frontend-ui-engineering` — **completion stays here** (Risk C) |
| Add/regenerate primitives | ADR-010 `ui:add` → relative imports → barrel → tests |

| Layer | Source |
|-------|--------|
| Primitives / compounds | `@afenda/ui-system` barrel (`src/index.ts`) |
| Semantic tokens | `tokens.css` via `@afenda/ui-system/styles.css` |
| Brand fonts | `apps/web` `layout.tsx` + `globals.css` `@theme` (app owns fonts) |
| Recipes / F* / C* / UI-CAP | [reference.md](reference.md) (Vitest SSOT; Risk A gate-ID sync) |

## Locked design hierarchy (disk — mandatory)

Confirm values on disk; do not invent a second token file.

| Lock | Rule |
|------|------|
| Font | `font-sans` → Geist Sans; `font-mono` → Geist Mono. No Inter/Roboto/system brand. Never “fix” package fonts for brand. |
| Radius | Prefer `rounded-md`. Card root may `rounded-xl`. No `rounded-2xl` / `rounded-full` product chrome unless the primitive already uses it (e.g. Avatar). `--radius` = `0.625rem` (+ sm/md/lg/xl calcs in `tokens.css`). |
| Density | One per page: comfortable (`gap-6`/`p-6`) **XOR** compact (`gap-4`/`p-4`). Forbidden: shell `p-8`. Use `--field-gap` / `--section-gap` / `--control-height*` / `--table-row-height*`. |
| CSS custom properties on utilities | When the value is a bare custom property, write Tailwind v4 canonical `utility-(--token)` (e.g. `gap-(--field-gap)`). Forbidden for new writes: `utility-[var(--token)]`. Prefer theme semantic utilities when the token is already in `@theme`. Keep `-[…]` only for non–custom-property or multi-part arbitrary values. Complete static class strings only. After `ui:add`, keep CLI `-(--…)` forms — do not rewrite to `[var(--…)]`. Syntax SSOT: Tailwind docs + IntelliSense `suggestCanonicalClasses` (do not invent a parallel Tailwind guide). |
| Type | Page `h1`: `text-2xl font-semibold tracking-tight`. Section/`CardTitle`/`Empty`: `text-lg font-medium`. Body: `text-sm`. Primary body ink: `text-foreground`. Secondary body: `text-foreground-secondary`. Caption / tertiary: `text-foreground-tertiary`. Muted chrome: `text-sm text-muted-foreground`. Auth eyebrow only on auth island. Never invent `--foreground-quaternary`. |
| Color / motion | Semantic classes only from `tokens.css` / `@theme` — registry (`bg-background`, `text-muted-foreground`, …) **plus** shipped ERP utilities: `bg-canvas` / `bg-surface-sunken` / `bg-surface-raised`; status `bg-*-subtle` · `text-*-subtle-foreground` · `border-*-border` (`success`\|`warning`\|`info`\|`destructive`); table `bg-table-row-hover` / `bg-table-stripe`. No raw `#hex`/`rgb`/`hsl` in feature TSX. Elevation/duration tokens from `tokens.css`. Recipe SSOT: [reference.md](reference.md#erp-token-utilities-shipped). |

## Hard rules

1. Compose only: `import { … } from "@afenda/ui-system"`.
2. Never handroll Button/Input/Alert when barrel exists. Nav CTA: `Button asChild` + `Link`.
3. Never `apps/web/components/ui/**` or product-wide parallel CSS kits.
4. Auth-island CSS stays route-scoped — not a product layout kit.
5. Missing primitive → `ui:add` → barrel → tests — never feature-local copies.
6. Locked type/spacing/radius/color only (table above).
7. One density per page.
8. One page title (`text-2xl…`); section = `text-lg font-medium`.
9. Reject vendor aesthetics that conflict with Afenda tokens.
10. Match — do not “make beautiful”.
11. Done = SCALABILITY clear + stability green + Compose Score — never on a compensating substitute.
12. No silent barrel API/behavior change. Additive → tests. Rename/removal/default/semantic → migrate all consumers same change.
13. Export names communicate role — ban exact `Panel`/`Container`/`Box`/`Item`/`Wrapper`/`View`. Flat barrel; no split on count alone (Risk D — ADR + measurable evidence only).
14. `DataTable` = presentation + interaction only; feature owns fetch/URL/permissions/domain/server.
15. **NO LOCAL CAPABILITY COMPENSATION** — stop; issue `UI-CAP-*`; upgrade `@afenda/ui-system` or supply product ports. Product-local compose of existing primitives OK when not duplicating reusable responsibility. Codes, template, promotion rule: [reference.md](reference.md).

## SCALABILITY-FIRST (summary)

Before composing shared surfaces, run the capability gate in [reference.md](reference.md). Outcomes: `CAPABLE` | `UI-SYSTEM GAP` | `PRODUCT GAP` | `UNSUITABLE`. Honest `LIST_ONLY_PERMITTED` / `READ_ONLY_PERMITTED` / `LOCAL_COMPOSITION_PERMITTED` beat fake CTAs. Do not claim STABILITY on a local substitute for a shared gap.

## STABILITY-FIRST

Hard rule 12 + interaction smoke for touched overlays/forms/tables. Package interactive: `overlays.interaction` / axe as applicable. Emit: static class strings; `tailwind-emit` when tokens/classes change.

**Risk C:** `frontend-ui-engineering` is method only — task incomplete until scoped a11y evidence is green.

| Change type | Required verification |
|-------------|----------------------|
| Token (`tokens.css`) | Package test + `tailwind-emit` + representative route |
| Static primitive | Package typecheck/consistency |
| Interactive primitive | Package interaction/axe + web test or `check:ui-system` |
| Compound | Package green + representative route |
| Barrel export | Package consistency + `ui-boundary.test.ts` |
| RSC / structural package | Package tests + `pnpm --filter @afenda/web build` |
| Global CSS / font map | Web build + representative route |
| DataTable | Interaction + representative route mounting it |
| Product compose only | `pnpm check:ui-system` (F*+C*+web/package tests) |

**Representative route (Risk B):** real non-auth product route under `apps/web/app/(operator|client)/**` (or equivalent) that exercises the change — not placeholder/dead/test-only.

**Floor vs peak:** usual floor `pnpm check:ui-system`. Web build only when matrix requires RSC/structural/CSS-font or clear emit risk.

## Compose Score (binding — out of 100)

Emit after audit / evaluate / maximize / ship-complete for a scoped surface. Measures QUALITY ORDER — not beauty.

| Dimension | Max | Dimension | Max |
|-----------|-----|-----------|-----|
| AUTHORITY | 15 | SUITABILITY | 15 |
| CONSISTENCY | 20 | SCALABILITY | 15 |
| CORRECT-COMPONENT | 20 | STABILITY | 15 |

**Caps:** F* fail → ≤70 · C* fail → ≤75 · fake/disabled actions → ≤60 · local compensation → ≤50 and STABILITY=0 · missing matrix evidence → STABILITY=0.

Reduced status may score high on the *approved* surface; full product 100% needs cleared `UI-CAP-*` — say so in Path to 100%.

```text
### Compose Score: <N>% / 100%
| Dimension | Score | Note |
| AUTHORITY | x/15 | … |
| CONSISTENCY | x/20 | … |
| CORRECT-COMPONENT | x/20 | … |
| SUITABILITY | x/15 | … |
| SCALABILITY | x/15 | … |
| STABILITY | x/15 | … |
**Path to 100%:** <one short sentence, or two max>
```

If already 100%: `**Path to 100%:** None — hold the locks; do not restyle.`

Rubric + examples: [reference.md](reference.md#compose-score-rubric).

## Agent flow

```text
Need product UI
  → /using-afenda-elite-skills → this skill
  → QUALITY ORDER → LOAD disk SSOT + reference.md
  → capability gate → UI-CAP if blocked (no local substitute)
  → frontend-ui-engineering (method only)
  → compose when CAPABLE or approved reduced/product-local
  → missing primitive: ui:add → barrel → feature
  → matrix + scoped a11y green → pnpm check:ui-system
  → web build if matrix requires → Compose Score + Path to 100%
```

## Verify checklist

- [ ] QUALITY ORDER (SCALABILITY before STABILITY)
- [ ] Authority + barrel imports + lock tables
- [ ] Recipes / F* / C* / DataTable scope / export naming
- [ ] Capability check; no fake actions; `UI-CAP-*` when blocked
- [ ] Hard rule 12 if barrel API touched; RSC intact
- [ ] Matrix + Risk C a11y green; representative route when required
- [ ] `pnpm check:ui-system` (build when matrix requires)
- [ ] Compose Score + Path to 100%

Greps in [reference.md](reference.md) do **not** replace Vitest or the app build.
