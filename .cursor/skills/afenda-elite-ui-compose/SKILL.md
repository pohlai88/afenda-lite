---
name: afenda-elite-ui-compose
description: >-
  Afenda product UI consistency lock — compose only from @afenda/ui-system,
  locked type/spacing/radius/color tables, anti-handroll. Use when building or
  changing visible features/* or product pages, fixing handrolled chrome, or
  enforcing visual consistency. Not a beauty pass; match existing tokens.
---

# Afenda Elite — UI compose (consistency lock)

**Goal:** same look and same building blocks every time — not prettier screens, not a second design brief.

## Decision order (binding — every product UI turn)

```text
1. CONSISTENCY-FIRST        → match lock tables (type, density, tokens, barrel)
2. CORRECT-COMPONENT-FIRST  → barrel export exists? use it; never fake chrome
3. SUITABILITY-FIRST        → among valid barrel options, pick the job-fit recipe
```

Do not skip ahead to markup that violates 1 or 2.

```text
LOAD:
  docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md
  docs/architecture/ARCH-024-package-boundaries.md  (#afendaui-system)
  packages/ui-system/src/styles/tokens.css
  packages/ui-system/src/index.ts
  apps/web/app/layout.tsx
  apps/web/globals.css
  .cursor/rules/ui-system.mdc
  reference.md  (recipes + forbidden patterns — regex source for Vitest)
SKIP:
  beauty / brand campaigns / motion flourishes beyond duration tokens
  rebuilding org-admin / Identity screens as part of this skill
  Storybook / playground / private registries
  forking frontend-ui-engineering into an Elite-named twin
  promoting scratch architecture to Living docs
  inventing parallel token files or type scales
  copying auth-surface.css into operator/client product layouts
```

**Companion:** [reference.md](reference.md) — recipes → barrel + forbidden patterns (must match `apps/web/__tests__/compose-redflags.test.ts`).

## Authority order (binding)

```text
1. ADR-010 + ARCH-024 + tokens.css + apps/web Geist map   (Tier A / disk)
2. afenda-elite-ui-compose                                 (consistency lock)
3. afenda-elite-frontend-scaffold                          (routes / features shape)
4. frontend-ui-engineering                                 (a11y, state, responsive method ONLY)
5. Vendor shadcn / Vercel aesthetic defaults                (last; drop on conflict)
```

On conflict (dark-by-default, Inter, purple primary, `rounded-2xl` chrome, raw hex): **higher tier wins**. Do not blend.

## Ownership split

| Concern | Owner |
|---------|-------|
| Font, radius, type scale, semantic color, density, barrel recipes, anti-handroll | **this skill** |
| Route tree, scaffold templates, wipe, FE↔BE boundaries | `afenda-elite-frontend-scaffold` |
| Keyboard, focus, ARIA, loading/empty patterns, state choice | `frontend-ui-engineering` (after this skill) |
| Add/regenerate primitive source | ADR-010 workflow (point here; do not re-author CLI docs) |

## Extract / use (binding SSOT)

| Layer | Source | Use for |
|-------|--------|---------|
| Primitives + thin compounds | `packages/ui-system/src/components/ui/*` via barrel `src/index.ts` | Buttons, inputs, tables, dialogs, form chrome |
| Semantic color / radius / density / motion | `tokens.css` (`@afenda/ui-system/styles.css`) | `bg-background`, `text-muted-foreground`, `rounded-*`, heights, gaps, shadows |
| Brand fonts | `apps/web/app/layout.tsx` (Geist Sans/Mono) + `globals.css` `@theme` | Product typography — **app owns fonts** |
| Add/regenerate primitives | `pnpm --filter @afenda/ui-system ui:add` (shadcn **new-york**, unified `radix-ui`, lucide, **no registries**) | Owned source inside the package |
| Composition recipes | [reference.md](reference.md) | Settings, CRUD, confirm, loading, etc. |

### Do **not** extract as “the design system”

| Surface | Why |
|---------|-----|
| Handrolled CTAs / links in public `page.tsx` | Fake Button — drift seed |
| Raw `rounded-md border…` anchors in auth/error shells | Use `Button` / `Alert` from barrel |
| `auth-surface.css` | Neon Auth **island** chrome only — not a product layout kit |
| Vendor Neon Auth UI internals | Stay behind `@neondatabase/auth-ui` |
| Generic Vercel/shadcn defaults (force dark, purple, Inter) | Conflict with Afenda tokens (neutral, light `:root`, Geist) |

## Locked design hierarchy (disk values — mandatory)

These values are **already on disk**. This skill makes them mandatory; it does not invent a second token file. Package compounds must match this table (`packages/ui-system` consistency tests enforce key rows).

### Font

| Role | Token / class | Source of truth |
|------|---------------|-----------------|
| UI body / headings | `font-sans` → Geist Sans (`--font-geist-sans`) | `layout.tsx` + `globals.css` |
| IDs, code, metrics, timestamps | `font-mono` → Geist Mono | same |
| Package default `ui-sans-serif` in tokens.css | Overridden by app `@theme` | **Never “fix” fonts inside the package for brand** |

No Inter / Roboto / system as intentional brand. No competing display serifs on product routes.

### Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.625rem` |
| `--radius-sm` | `calc(var(--radius) - 4px)` |
| `--radius-md` | `calc(var(--radius) - 2px)` |
| `--radius-lg` | `var(--radius)` |
| `--radius-xl` | `calc(var(--radius) + 4px)` |

Controls: prefer shadcn/new-york defaults (`rounded-md` on inputs/buttons). Do not invent `rounded-2xl` / `rounded-full` for product chrome unless the primitive already uses it (e.g. Avatar).

**Card-only exception:** `Card` root may use `rounded-xl` (maps to `--radius-xl`). Do not copy `rounded-xl` onto buttons, inputs, or handrolled chrome.

### Spacing / density (semantic)

| Token | Value | Use |
|-------|-------|-----|
| `--field-gap` | `1rem` | Between form fields |
| `--section-gap` | `2rem` | Between page sections |
| `--control-height` | `2.25rem` | Default control |
| `--control-height-sm` | `2rem` | Compact control |
| `--table-row-height` | `3rem` | Tables (default) |
| `--table-row-height-compact` | `2.5rem` | Tables (compact) |

**One density per page:** comfortable (`gap-6` / `p-6`) **or** compact (`gap-4` / `p-4`). Do not mix. **Forbidden:** page shell `p-8`.

### Type scale

| Level | Classes | Use |
|-------|---------|-----|
| Page title | `text-2xl font-semibold tracking-tight` | One per route (`h1`) |
| Section / card / empty title | `text-lg font-medium` | Section headers, `CardTitle`, `Empty` title |
| Body | `text-sm` | Default copy |
| Muted / helper | `text-sm text-muted-foreground` | Descriptions, meta, `CardDescription` |
| Eyebrow / brand (auth island only) | `text-sm font-medium tracking-[0.18em] uppercase text-muted-foreground` | Auth chrome only |

### Color / surface

Use semantic classes only: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, status tokens (`success` / `warning` / `info` / `destructive`). No raw `#hex` / `rgb` / `hsl` in feature TSX.

### Motion / elevation

| Token | Role |
|-------|------|
| `--shadow-raised` / `--shadow-overlay` / `--shadow-dialog` | Elevation |
| `--duration-fast` (150ms) / `--duration-normal` (250ms) | Transitions |
| `--ease-standard` / enter / exit | Easing |

## Forbidden patterns (product `features/*` + product `app/**`)

These are **banned**. Regexes live in [reference.md](reference.md) and are enforced by `apps/web/__tests__/compose-redflags.test.ts`. Auth island paths are allowlisted there.

| Forbidden | Required instead |
|-----------|------------------|
| Fake CTA (`inline-flex` + `h-9` + primary fill on non-`Button`) | `Button` / `Button asChild` + Next.js `Link` |
| Page shell `p-8` | comfortable `p-6` or compact `p-4` only |
| Rogue page titles (`text-3xl` / `text-xl font-semibold` as route H1) | `text-2xl font-semibold tracking-tight` |
| Bordered handrolled `<ul>` for tabular rows (≥2 fields or row actions) | `DataTable` |
| Plain loading copy without barrel chrome | `Spinner` and/or `Skeleton` |
| Deep `@afenda/ui-system/…` (except `styles.css`) | flat barrel `@afenda/ui-system` |
| `apps/web/components/ui/**` | never |
| Importing `auth-surface.css` outside `(public)/auth` (+ join layout allowlist) | keep island-scoped |

## Hard rules (consistency)

1. **Compose only** from `import { … } from "@afenda/ui-system"`.
2. **Never** handroll Button / Input / Alert chrome when a barrel export exists. Navigation CTAs use `Button asChild` + Next.js `Link` — there is no barrel `Link` primitive.
3. **Never** `apps/web/components/ui/**` or product-wide parallel CSS kits.
4. **Auth island** CSS stays route-scoped; not a product layout kit.
5. Missing primitive → `ui:add` in package → relative imports → barrel → tests — never feature-local copies.
6. Use **only** the locked type / spacing / radius / color tables above — no freestyle scales.
7. **One density per page** (comfortable `gap-6`/`p-6` XOR compact `gap-4`/`p-4`).
8. **One page title** (`text-2xl…`); do not skip heading levels; section = `text-lg font-medium`.
9. Reject AI / vendor aesthetic defaults that conflict with Afenda tokens (purple, cream-serif, broadsheet, forced dark dashboard).
10. This skill **does not** ask agents to “make it beautiful” — only to make it **match**.
11. **Done = gates green** — `pnpm check:ui-system` (compose-redflags + ui-system consistency), not greps alone.

## Agent flow

```text
Need product UI
  → /using-afenda-elite-skills
  → afenda-elite-ui-compose (this skill)
  → tokens.css + Geist map + barrel
  → frontend-ui-engineering (a11y / state / responsive method only)
  → compose in apps/web features/*
  → if primitive missing: ui:add in packages/ui-system → barrel → then feature
  → pnpm check:ui-system must pass
```

## Consistency verify checklist

Before claiming UI work done:

- [ ] Decision order applied (consistency → correct component → suitability)
- [ ] All interactive chrome from barrel (no fake buttons)
- [ ] Imports are `@afenda/ui-system` only for UI primitives
- [ ] Type classes match the lock table
- [ ] Gaps/padding match chosen density; no `p-8` shells
- [ ] Tabular rows use `DataTable` (no bordered handrolled `<ul>` for that job)
- [ ] Loading uses `Spinner` / `Skeleton`
- [ ] Colors are semantic token classes only
- [ ] Radius follows lock + Card `rounded-xl` exception only
- [ ] No new font families; Geist via app map only
- [ ] Auth-surface patterns not copied into operator/client product layouts
- [ ] **`pnpm check:ui-system` green**

Advisory greps in [reference.md](reference.md) help while editing; they do **not** replace the Vitest gates.
