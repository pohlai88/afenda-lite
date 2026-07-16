---
name: afenda-elite-ui-compose
description: >-
  Afenda product UI consistency lock — compose only from @afenda/ui-system,
  locked type/spacing/radius/color tables, anti-handroll. QUALITY ORDER:
  AUTHORITY → CONSISTENCY → CORRECT-COMPONENT → SUITABILITY → SCALABILITY →
  STABILITY. No local compensation for missing reusable barrel capability —
  issue UI-CAP-* findings. Use when building or changing visible features/*
  or product pages, fixing handrolled chrome, or enforcing visual consistency.
  Not a beauty pass.
---

# Afenda Elite — UI compose (consistency lock)

**Goal:** same look and same building blocks every time — not prettier screens, not a second design brief.

**Maturity:** Controlled Production Quality — details in [reference.md](reference.md) appendix. Next improvement = **evidence integrity** (docs gates ↔ Vitest ↔ representative routes stay synced), not more styling rules.

**Final refinements (shipped — do not re-architect):** (1) Gate-ID sync — `compose-gate-ids.test.ts` keeps F1–F8 / C1–C3 matched to Vitest (Risk A). (2) **Representative route** defined under the verification matrix (Risk B). (3) A11y method may use `frontend-ui-engineering`; **completion stays here** until scoped evidence is green (Risk C).

## QUALITY ORDER (binding — every product UI turn)

A visually improved screen that violates a higher rule is a **failed change**.

```text
1. AUTHORITY-FIRST          Confirm the authority (ADR / barrel / tokens / Geist)
2. CONSISTENCY-FIRST        Preserve the design language
3. CORRECT-COMPONENT-FIRST  Select the intended barrel component
4. SUITABILITY-FIRST        Confirm it suits the workflow
5. SCALABILITY-FIRST        Reject local duplication when shared capability is inadequate
6. STABILITY-FIRST          Verify the final (non-compensating) solution is stable
```

1. **AUTHORITY-FIRST** — Follow the controlled architecture, package boundary, live tokens, and barrel (ADR-010, ARCH-024, `tokens.css`, `src/index.ts`, Geist map on disk).
2. **CONSISTENCY-FIRST** — Match the existing type, spacing, radius, color, and density system (lock tables below).
3. **CORRECT-COMPONENT-FIRST** — Use the existing barrel component intended for the job before composing or creating alternatives.
4. **SUITABILITY-FIRST** — Among valid components, choose the interaction pattern that best fits the user's task and information density (recipe = default; workflow evidence may justify another barrel option or a dedicated page).
5. **SCALABILITY-FIRST** — When shared barrel capability is inadequate, do not compensate in `apps/web`; issue a `UI-CAP-*` finding and route correctly (policy below). Must precede STABILITY.
6. **STABILITY-FIRST** — Preserve public APIs, RSC boundaries, accessibility behavior, Tailwind emission, package tests, and the consuming application build (verification matrix). Never used to bless a compensating local workaround.

Do not skip ahead. A later step cannot override an earlier one. This skill encodes authority — it does not outrank ADR-010 / ARCH-024 / tokens.css / the barrel; on conflict, stop and align under Docs or package ownership.

| Step | Means | Rejects |
|------|-------|---------|
| AUTHORITY-FIRST | Disk Tier A / package SSOT wins over skill prose, plans, or vendor aesthetics | New tokens or parallel UI because skill text sounds nicer |
| CONSISTENCY-FIRST | Locked type / spacing / radius / color / density | Freestyle scales, `p-8` shells, rogue title sizes |
| CORRECT-COMPONENT-FIRST | Intended barrel export for the job | Fake Button / bordered tabular lists / handrolled chrome |
| SUITABILITY-FIRST | Recipe is the **default**, not an absolute; C1–C3 gates in [reference.md](reference.md) | Mechanical Sheet-for-every-edit; Dialog-for-destroy; Button>Link without asChild; clickable Card root |
| SCALABILITY-FIRST | Capability gate + promotion rule; shared gaps → `@afenda/ui-system`; product gaps → feature | Local substitutes for reusable capability; fake/disabled actions; premature ui-system pollution |
| STABILITY-FIRST | Public APIs, RSC, runtime interaction, a11y, emit, typecheck, app build | Breaks hydration, client boundaries, keyboard, props, emit, or build; green tests on a duplicated substitute |

### SCALABILITY-FIRST

When the intended `@afenda/ui-system` primitive or compound lacks an essential reusable capability, do not compensate inside `apps/web`.

Issue a structured `UI-CAP-*` finding and route the gap to its correct owner:

* reusable visual, interaction, accessibility, responsive or state behavior → `@afenda/ui-system`;
* product data, permissions, routes, server commands or domain semantics → owning product feature;
* unsuitable interaction model → another approved barrel component or a controlled shared-component decision.

Feature-local composition remains permitted when it uses existing barrel primitives for genuinely product-specific behavior and does not reproduce a reusable UI-system responsibility.

Do not add fake, decorative, permanently disabled or placeholder actions to simulate completeness. An honest list-only or read-only surface is preferable to invented product capability.

Composition resumes only after the required shared capability or real product port exists, unless the approved outcome is explicitly list-only, read-only or product-local.

**Three critical truths:**

1. Do not weaken the product because shared primitives are inadequate.
2. Do not pollute the UI system with domain-specific behavior.
3. Do not pretend missing product capability exists through fake frontend controls.

Apply the **Promotion decision rule** (shared vs product-local) in [reference.md](reference.md). Do not run or claim STABILITY evidence for a compensating local substitute of a shared gap. Full capability gate, `UI-CAP-01…08`, finding template, and composition statuses: [reference.md](reference.md).

**STABILITY-FIRST** applies only after AUTHORITY…SCALABILITY clear (or after an explicit `LIST_ONLY_PERMITTED` / `READ_ONLY_PERMITTED` / `LOCAL_COMPOSITION_PERMITTED` / product-gap outcome with no fake controls).

### Efficiency versus rigidity (binding interpretation)

Strictness is intentional for this product. SUITABILITY-FIRST and SCALABILITY-FIRST keep it usable:

| Layer | Controls |
|-------|----------|
| CONSISTENCY | Visual language (type, spacing, radius, color, density) |
| CORRECT-COMPONENT | Available building blocks (barrel for the job) |
| SUITABILITY | Which approved pattern fits the task and information density |
| SCALABILITY | Shared capability vs product-local; no local compensation for reusable gaps |
| STABILITY | Whether the (non-compensating) change can safely ship |

Reject **too loose** (“make it look professional / use shadcn where possible”) — that produces drift. Reject **too rigid** (“every edit is a Sheet / every list is DataTable / every screen identical composition”) — that produces poor usability. Recipes are defaults; workflow evidence may justify another barrel option or a dedicated page. Reject local workarounds that duplicate shared UI responsibility.

```text
LOAD:
  docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md
  docs/architecture/ARCH-024-package-boundaries.md  (#afendaui-system)
  packages/ui-system/src/styles/tokens.css
  packages/ui-system/src/index.ts
  apps/web/app/layout.tsx
  apps/web/globals.css
  .cursor/rules/ui-system.mdc
  reference.md  (recipes + F* + C* — Vitest gate SSOT)
SKIP:
  beauty / brand campaigns / motion flourishes beyond duration tokens
  rebuilding org-admin / Identity screens as part of this skill
  Storybook / playground / private registries
  forking frontend-ui-engineering into an Elite-named twin
  promoting scratch architecture to Living docs
  inventing parallel token files or type scales
  copying auth-surface.css into operator/client product layouts
```

**Companion (gate SSOT):** [reference.md](reference.md) — recipes, F1–F8, C1–C3, UI composition capability findings (`UI-CAP-*`), promotion rule, allowlists, export naming. Must stay aligned with `compose-redflags.test.ts`, `compose-suitability.test.ts`, `export-naming.test.ts`. ID sync enforced by `compose-gate-ids.test.ts` (Risk A). Machine gates stay F1–F8 / C1–C3 only — capability gaps are findings, not new F*/C* IDs.

## Skill / farm authority ladder (binding)

```text
1. ADR-010 + ARCH-024 + tokens.css + apps/web Geist map   (Tier A / disk)
2. afenda-elite-ui-compose                                 (consistency lock — this file)
3. afenda-elite-frontend-scaffold                          (routes / features shape)
4. frontend-ui-engineering                                 (a11y, state, responsive method ONLY)
5. Vendor shadcn / Vercel aesthetic defaults                (last; drop on conflict)
```

On conflict (dark-by-default, Inter, purple primary, `rounded-2xl` chrome, raw hex): **higher tier wins**. Skill prose never outranks row 1.

## Ownership split

| Concern | Owner |
|---------|-------|
| Font, radius, type scale, semantic color, density, barrel recipes, anti-handroll | **this skill** |
| Route tree, scaffold templates, wipe, FE↔BE boundaries | `afenda-elite-frontend-scaffold` |
| Keyboard, focus, ARIA, loading/empty patterns, state choice | Method: `frontend-ui-engineering`. **Completion:** this skill (Risk C) |
| Add/regenerate primitive source | ADR-010 workflow (point here; do not re-author CLI docs) |

## Extract / use (binding SSOT)

| Layer | Source | Use for |
|-------|--------|---------|
| Primitives + thin compounds | `packages/ui-system` via barrel `src/index.ts` | Buttons, inputs, tables, dialogs, form chrome |
| Semantic color / radius / density / motion | `tokens.css` (`@afenda/ui-system/styles.css`) | Semantic utilities, heights, gaps, shadows |
| Brand fonts | `apps/web/app/layout.tsx` + `globals.css` `@theme` | Product typography — **app owns fonts** |
| Add/regenerate primitives | `pnpm --filter @afenda/ui-system ui:add` (new-york, `radix-ui`, lucide, **no registries**) | Owned source inside the package |
| Recipes / F* / C* | [reference.md](reference.md) | Gate SSOT |

**Do not extract as the design system:** handrolled CTAs; auth-surface as product kit; Neon Auth internals; vendor aesthetic defaults (purple / Inter / forced dark).

## Locked design hierarchy (disk values — mandatory)

These values are **already on disk**. This skill makes them mandatory; it does not invent a second token file.

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

Controls: prefer `rounded-md`. **Card-only exception:** `Card` root may use `rounded-xl`. Do not invent `rounded-2xl` / `rounded-full` for product chrome unless the primitive already uses it (e.g. Avatar).

### Spacing / density

| Token | Value | Use |
|-------|-------|-----|
| `--field-gap` | `1rem` | Between form fields |
| `--section-gap` | `2rem` | Between page sections |
| `--control-height` | `2.25rem` | Default control |
| `--control-height-sm` | `2rem` | Compact control |
| `--table-row-height` | `3rem` | Tables (default) |
| `--table-row-height-compact` | `2.5rem` | Tables (compact) |

**One density per page:** comfortable (`gap-6` / `p-6`) **or** compact (`gap-4` / `p-4`). **Forbidden:** page shell `p-8`.

### Type scale

| Level | Classes | Use |
|-------|---------|-----|
| Page title | `text-2xl font-semibold tracking-tight` | One per route (`h1`) |
| Section / card / empty title | `text-lg font-medium` | Section headers, `CardTitle`, `Empty` title |
| Body | `text-sm` | Default copy |
| Muted / helper | `text-sm text-muted-foreground` | Descriptions, meta, `CardDescription` |
| Eyebrow / brand (auth island only) | `text-sm font-medium tracking-[0.18em] uppercase text-muted-foreground` | Auth chrome only |

### Color / surface / motion

Semantic classes only: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, status tokens. No raw `#hex` / `rgb` / `hsl` in feature TSX. Elevation: `--shadow-raised` / `--shadow-overlay` / `--shadow-dialog`. Duration: `--duration-fast` (150ms) / `--duration-normal` (250ms).

## Suitability (pointer)

- Recipe = **default**, not absolute — workflow evidence may justify Dialog, page, or another barrel option ([reference.md](reference.md) recipes).
- F1–F8 regex bans + C1–C3 AST suitability live **only** in [reference.md](reference.md) (Vitest SSOT). Do not expand into a full composition linter.
- Regex discipline: keep narrow; fail with path + gate ID; review allowlists; AST for high-risk semantics only.

## Hard rules (consistency)

1. **Compose only** from `import { … } from "@afenda/ui-system"`.
2. **Never** handroll Button / Input / Alert chrome when a barrel export exists. Navigation CTAs use `Button asChild` + Next.js `Link`.
3. **Never** `apps/web/components/ui/**` or product-wide parallel CSS kits.
4. **Auth island** CSS stays route-scoped; not a product layout kit.
5. Missing primitive → `ui:add` in package → relative imports → barrel → tests — never feature-local copies.
6. Use **only** the locked type / spacing / radius / color tables above.
7. **One density per page** (comfortable XOR compact).
8. **One page title** (`text-2xl…`); section = `text-lg font-medium`.
9. Reject AI / vendor aesthetic defaults that conflict with Afenda tokens.
10. This skill does **not** ask agents to “make it beautiful” — only to **match**.
11. **Done = SCALABILITY clear + stability evidence green** — capability check (or approved `LIST_ONLY` / `READ_ONLY` / `LOCAL_COMPOSITION` / product-gap outcome) then verification matrix + checklist (not greps alone). Never mark done on a compensating local substitute.
12. **Never silently change** public behavior or props of a barrel export. Additive → tests. Rename/removal/default/semantic → all consumers migrated in the **same** change.
13. **Export names must communicate role** — ban exact `Panel`, `Container`, `Box`, `Item`, `Wrapper`, `View` (compounds like `DropdownMenuItem` OK). Keep one flat barrel (ADR-010). **Risk D:** do **not** split based on component count alone. A future barrel-shape review requires an Approved ADR **and** measurable evidence such as: repeated naming ambiguity; slow editor tooling; slow build analysis; export collisions; unreliable tree-shaking; recurring incorrect component selection.
14. **DataTable stays generic** — presentation + interaction only. Feature owns fetch, URL state, permissions, domain actions, persistence, server ops.
15. **NO LOCAL CAPABILITY COMPENSATION**

When the correct barrel primitive or compound lacks an essential reusable
capability, stop and issue a UI-system capability finding. Do not reproduce
the missing behavior in apps/web, add a feature-local substitute, or invent
fake domain controls. Reusable capability is upgraded in @afenda/ui-system;
domain capability is supplied by the owning product feature.

A feature-local composition of existing barrel primitives is still allowed when
the behavior is genuinely product-specific and does not duplicate a reusable
component responsibility.

| Allowed | Forbidden |
|---------|-----------|
| Product-specific arrangement of approved primitives | Reimplementing a missing reusable primitive or compound |
| Feature-owned domain workflow | Generic table, selector, dialog, or metric behavior duplicated locally |
| One-off domain presentation | Parallel UI-system layer |
| Passing real routes/actions through component ports | Fake or disabled actions added for appearance |

Applies beyond lists: tables, metric strips, forms, selectors, steppers, bulk actions, empty/error states, etc. The clarification does **not** waive `UI-CAP-*` escalation when the missing piece is reusable across features. Classification codes, finding template, and promotion rule: [reference.md](reference.md).

## STABILITY-FIRST (binding)

Hard rule 12 + interaction smoke for touched overlays/forms/tables + proportional matrix below. Package interactive changes: `overlays.interaction` / `a11y.axe.interaction` as applicable. Emit: static class strings; `tailwind-emit` when tokens/classes change.

**Accessibility (Risk C — binding):** method belongs to `frontend-ui-engineering`; completion remains in **this** skill. Invoking `frontend-ui-engineering` does **not** satisfy completion. The current task remains incomplete until the scoped accessibility evidence is green (package axe/interaction when interactive package files change; FE checklist applied to the touched product surface).

### Stability verification matrix (proportional)

Union rows when multi-layer. Always apply hard rule 12 and C1–C3 when product TSX or barrel exports are in scope.

| Change type | Required verification | Concrete evidence |
|-------------|----------------------|-------------------|
| Token change (`tokens.css`) | Package tests + web Tailwind emit + representative route | `@afenda/ui-system` test; `tailwind-emit.test.ts`; representative route |
| Static primitive | Typecheck + render/consistency | `@afenda/ui-system` typecheck test |
| Interactive primitive | Typecheck + interaction/axe + consuming app tests | Package `*.interaction` / axe; `@afenda/web` test or `check:ui-system` |
| Compound | Package tests + feature integration | Package green; representative route (or `features/*` mounted on one) |
| Barrel export | Barrel coverage + web import test | Package consistency; `ui-boundary.test.ts` |
| RSC boundary | RSC test + web build | `rsc-boundary.test.ts`; `pnpm --filter @afenda/web build` |
| Structural package change | Package tests + web build | `@afenda/ui-system` test; `pnpm --filter @afenda/web build` |
| Global CSS or font map | Web build + representative route | `pnpm --filter @afenda/web build`; confirm type/font/surface on that route |
| DataTable | Interaction + representative route | Representative route that mounts `DataTable` |
| Product compose only | F* + C* + web typecheck/test | `pnpm check:ui-system` |

**Representative route (Risk B — binding):** a real **non-auth** product route that imports the affected barrel export or token path and exercises the changed visual or interaction behavior. A placeholder route, dead code, or isolated test-only component does **not** count. Prefer an existing operator/client route under `apps/web/app/(operator|client)/**` (or equivalent product group) that already consumes the surface; do not invent a throwaway page for evidence.

**Floor vs peak:** `pnpm check:ui-system` is the usual floor. Web **build** only when the matrix requires it (RSC, structural, CSS/font) or emit/compile risk is clear.

## Agent flow

```text
Need product UI
  → /using-afenda-elite-skills
  → afenda-elite-ui-compose (this skill)
  → QUALITY ORDER (AUTHORITY → … → SCALABILITY → STABILITY)
  → tokens.css + Geist map + barrel + reference.md (recipes / F* / C* / UI-CAP)
  → capability check (reference.md) before composing shared surfaces
  → if UI-SYSTEM GAP / PRODUCT GAP / UNSUITABLE: issue UI-CAP finding; do not compensate locally
  → frontend-ui-engineering (a11y / state / responsive method only — does not mark done)
  → compose in apps/web features/* only when CAPABLE or approved reduced / product-local outcome
  → if primitive missing: ui:add → barrel → then feature (not feature-local substitute)
  → verification matrix for changed layer(s) + scoped a11y evidence green
  → pnpm check:ui-system   (usual floor)
  → pnpm --filter @afenda/web build   (RSC / structural / CSS-font / clear emit risk)
```

## Verify checklist

- [ ] **QUALITY ORDER** applied (SCALABILITY before STABILITY); prettier that breaks a higher rule = failed
- [ ] Authority: ADR-010 / barrel / tokens / Geist map (no parallel SSOT)
- [ ] Barrel chrome only; imports `@afenda/ui-system`; type/density/radius/color locks
- [ ] Recipes / F* / C* per [reference.md](reference.md); DataTable scope (rule 14); export naming (rule 13)
- [ ] **SCALABILITY / rule 15:** capability check run; no local compensation for reusable gaps; no fake actions; `UI-CAP-*` issued when blocked
- [ ] Hard rule 12 if barrel API touched; RSC boundaries intact
- [ ] Verification matrix rows green; emit as scoped — never on a compensating local substitute
- [ ] **A11y (Risk C):** scoped evidence green — loading FE skill alone is not done
- [ ] **Representative route** (when matrix requires): real non-auth product route exercising the change — not placeholder/dead/test-only
- [ ] `pnpm check:ui-system` when floor applies; web **build** when matrix requires

Advisory greps in [reference.md](reference.md) do **not** replace Vitest gates or the app build.
