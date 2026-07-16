# `@afenda/ui-system` Architecture

> **Scratch / non-authoritative.** Working material under `docs/scratch/`. Not a DOC-001 controlled document, Living, or Target SSOT. Does not reopen [ADR-010](../architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) or [ARCH-024](../architecture/ARCH-024-package-boundaries.md). Binding decisions live there; this file explains structure, boundaries, and how to keep the flat-barrel model consistent and scalable.

| Field | Value |
| ----- | ----- |
| **Audience** | Engineers composing or extending UI in `apps/web` / `packages/ui-system` |
| **Action enabled** | Understand the design-system shape; add primitives safely; compose product UI without inventing parallel trees |
| **Status** | Scratch (repo-backed working notes) |
| **Updated** | 2026-07-16 |

---

## Context

Afenda-Lite ships a **simple, owned** design system optimized for AI-assisted coding and enterprise product screens:

- One package: `packages/ui-system` → `@afenda/ui-system`
- One public import door: the flat barrel + stylesheet
- Owned shadcn **new-york** / **Radix** (`radix-ui`) source — no paid registries, no Storybook, no handrolled `/playground`
- Consistency enforced by committed guardrail tests, not by a multi-package "DS platform"

**Objective outcomes (consistency + scale)** come from a narrow public API, semantic tokens, regenerable primitives, and demand-driven compounds — not from a second package tree, workbench app, or contract layer.

---

## Responsibilities and boundaries

### In scope (`@afenda/ui-system`)

| Responsibility | Where |
| -------------- | ----- |
| Semantic color / radius / chart / sidebar tokens | `src/styles/tokens.css` (exported as `@afenda/ui-system/styles.css`) |
| Owned UI primitives and thin ERP compounds | `src/components/ui/*.tsx` |
| Class merge helper | `cn` from `src/lib/utils.ts` via barrel |
| Package-local shadcn CLI workflow | `components.json`, `pnpm --filter @afenda/ui-system ui:add` |

### Out of scope (do not put here)

| Concern | Owner |
| ------- | ----- |
| Tailwind compilation, Preflight, `@source`, brand fonts | `apps/web/globals.css` |
| Product routes, feature layouts, RHF/Zod forms, domain widgets | `apps/web` features / modules |
| Auth, RBAC visual policy, tenancy | [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) / `@afenda/auth` — not UI variants |
| Storybook, private registries, playground harness | Forbidden / slice-gated ([ADR-010](../architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) §2.2, [AGENTS.md](../../AGENTS.md)) |

### Consumer rules

| Allowed | Forbidden |
| ------- | --------- |
| `import { Button, DataTable } from "@afenda/ui-system"` | Deep imports (`@afenda/ui-system/components/…`) |
| `import "@afenda/ui-system/styles.css"` (via app globals) | Handrolled `apps/web/components/ui/**` |
| Compose compounds in features when not shared | Parallel UI packages or restored `@afenda/ui` |

Enforced by `apps/web/__tests__/ui-boundary.test.ts` and package consistency tests.

---

## Components

### Package layout

```text
packages/ui-system/
├── components.json          # shadcn: new-york, lucide, no registries
├── package.json             # exports: "." + "./styles.css" only
├── src/
│   ├── index.ts             # flat barrel (no "use client")
│   ├── styles/tokens.css    # @theme inline + :root + .dark
│   ├── lib/utils.ts         # cn()
│   ├── components/ui/       # owned primitives (~51)
│   └── hooks/               # package hooks if any
└── __tests__/               # consistency, RSC boundary, interaction smoke
```

### Public API

`package.json` exports (entire public surface):

```json
{
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./styles.css": "./src/styles/tokens.css"
  }
}
```

Consumers never import package internals. CLI aliases (`#components`, `#lib/utils`) exist for `shadcn add` only; generated files are converted to **relative** imports before commit.

### Layering (simple model)

```text
Tier 0  Tokens          tokens.css
Tier 1  Primitives      Button, Input, Dialog, Table, …
Tier 2  Thin compounds  DataTable, Combobox, FormField, MetricCard, StatusBadge, …
Tier 3  Product UI      apps/web features / modules (not in this package)
```

Scale by deepening Tier 2 when multiple features share a pattern. Do **not** invent `packages/erp-patterns` or per-component export maps.

### Tier 2 promotion rule

A composition remains in `apps/web` until it satisfies at least one promotion condition:

1. It is used by **two or more independent feature modules**; or
2. An authoritative architecture decision identifies it as mandatory shared platform chrome.

Before promotion, remove domain names, route assumptions, feature-specific permissions, backend access, and business workflow decisions. A promoted compound should expose typed data, state, slot, and callback inputs rather than import feature services directly.

### Primitive buckets (inventory snapshot)

| Bucket | Examples |
| ------ | -------- |
| Actions / chrome | Button, ButtonGroup, Toggle*, Separator, Kbd, Breadcrumb, Tabs, Sidebar, ScrollArea |
| Forms | Input, Textarea, Label, Checkbox, RadioGroup, Switch, Select, NativeSelect, InputGroup, Field*, FormField, FormError, Slider, Calendar |
| Overlays | Dialog, AlertDialog, Sheet, Popover, DropdownMenu, ContextMenu, HoverCard, Tooltip, Command, Combobox |
| Feedback | Alert, Badge, StatusBadge, Progress, Spinner, Empty, Skeleton, Sonner |
| Data display | Table, DataTable, Pagination, Card, KeyValue*, MetricCard*, Avatar, Accordion, Collapsible |

\* Family prefix (e.g. `Toggle` / `ToggleGroup`, `Field` / related field helpers).

Exact count is disk-driven (~51 `src/components/ui/*.tsx`); barrel coverage tests fail if a file is missing from `src/index.ts`.

### `DataTable` boundary

`DataTable` is shared presentation infrastructure, not an application data layer.

| `DataTable` may own | `DataTable` must not own |
| ------------------- | ------------------------ |
| Generic column rendering and row composition | API requests, server actions, or repository access |
| Sorting, pagination, selection, and visibility callback contracts | URL search-parameter ownership or route navigation |
| Generic loading, empty, no-result, and error presentation | Invoice-, customer-, inventory-, or module-specific filters |
| Toolbar, filter, cell, and row-action slots | Domain permissions or approval authority |
| Generic column visibility and row-selection presentation | Saved-view persistence tied to business storage |

Feature modules own data fetching, URL synchronization, permissions, saved-view persistence, and domain-specific actions.

### Stack pins

| Concern | Choice |
| ------- | ------ |
| Style | shadcn `new-york` |
| Primitives | Unified `radix-ui` (not Base UI for product surface) |
| Icons | `lucide-react` only |
| React | Peer ≥19; RSC-aware (`"use client"` on interactive leaves only) |
| Styling | Tailwind v4 utilities against semantic tokens; app compiles CSS |
| Delivery | Source package via Next `transpilePackages` + `optimizePackageImports` — no `dist` build |

---

## Data / request flow

UI has no backend. The relevant flow is **compose → compile → render**:

```mermaid
flowchart LR
  subgraph package [packages/ui-system]
    Tokens[tokens.css]
    Prim[components/ui]
    Barrel[src/index.ts]
    Prim --> Barrel
  end
  subgraph app [apps/web]
    Globals[globals.css]
    Next[Next transpilePackages]
    Route[App Router pages / features]
  end
  Tokens -->|import styles.css| Globals
  Globals -->|@source package src| TW[Tailwind v4 emit]
  Barrel --> Next
  Next --> Route
  TW --> Route
```

1. App imports Tailwind + `tw-animate-css` + `@afenda/ui-system/styles.css`.
2. App registers `@source "../../packages/ui-system/src"` so utilities in package TSX emit.
3. Routes import named exports from `@afenda/ui-system` only.
4. Interactive primitives keep their own `"use client"`; the barrel never adds one (RSC boundary).

---

## Key decisions

Summarized from [ADR-010](../architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) (authoritative). Do not re-decide here.

| Decision | Choice | Consistency / scale rationale |
| -------- | ------ | ----------------------------- |
| Public API | Flat barrel + one CSS subpath | One obvious door; agents and humans cannot deep-import drift |
| Package count | Single UI SSOT | Avoid dual distribution (tokens package + patterns package + registry) |
| Primitive base | Radix / new-york | Mature a11y primitives; regenerable from shadcn CLI |
| Registries | None | Minimal third-party influence; free shadcn items only |
| CSS ownership | App compiles; package tokens only | One Tailwind owner; package stays portable source |
| Contracts | No `*Contract` layer | Types live on components; less indirection than ADR-009 |
| Harness | No Storybook / playground by default | Prove UI on real product routes + package tests |
| Compounds | Demand-driven inside this package | Scale shared ERP chrome without a second package |
| Public API changes | Atomic monorepo migration | Add freely with tests; rename or remove only when all consumers migrate in the same change |

### How "simple" still scales

| Mechanism | Effect |
| --------- | ------ |
| Barrel + boundary tests | Every new primitive is exported or CI fails |
| Semantic tokens | Theme and ERP state colors stay consistent across screens |
| Owned source | Customize once; regenerate with relative-import discipline |
| Thin compounds | Shared table/form/picker behavior lands once, not per feature |
| Feature ownership of Tier 3 | Domain widgets stay out of the design system |
| Real-route proof | Shared compounds are validated in an actual `apps/web` consumer before completion |

---

## Failure modes

| Failure | Symptom | Mitigation |
| ------- | ------- | ---------- |
| Deep import or handrolled `components/ui` | Boundary test fail / review reject | Use barrel only |
| Forgot barrel export after `shadcn add` | Consistency test fail | Export from `src/index.ts` |
| `"use client"` on barrel | RSC discipline broken | Keep directive on leaf files only |
| Raw colors in TSX | Consistency test fail | Use semantic token classes |
| Registry key added to `components.json` | Consistency / policy fail | Remove; use built-in shadcn items |
| Dynamic Tailwind classes | Missing styles at runtime | Static complete class strings |
| Library unused in product | UI drift when first screen lands | A new compound must be consumed by a real feature or bounded integration route before completion |
| Unused alternate primitive dep | Noise / wrong base confusion | Prefer `radix-ui`; drop unused Base UI when touching deps |

---

## Operational considerations

### Add or regenerate a primitive

```bash
pnpm --filter @afenda/ui-system ui:add <name>
# Convert generated #/ or @/ imports to relative paths
# Export from src/index.ts
pnpm --filter @afenda/ui-system test
pnpm --filter @afenda/web test   # ui-boundary / tailwind-emit when relevant
```

Prefer inspecting with `shadcn docs` / `view` / `--diff` before overwrite. Pin/lockfile the CLI; avoid casual unpinned `latest` for routine adds.

### Verify locally

| Command | Purpose |
| ------- | ------- |
| `pnpm --filter @afenda/ui-system test` | Consistency, RSC boundary (+ interaction when configured) |
| `pnpm --filter @afenda/ui-system typecheck` | Package types |
| `pnpm --filter @afenda/web test` | Barrel-only boundary + Tailwind emit smoke |
| `pnpm check:ui-system` | Aggregate package + web verification gate (root script) |

Root gate (already present):

```json
{
  "scripts": {
    "check:ui-system": "turbo run typecheck test --filter=@afenda/ui-system... --filter=@afenda/web"
  }
}
```

### Completion gate for a new thin compound

A new Tier 2 compound is complete only when:

1. Package typecheck and relevant interaction tests pass.
2. It is exported through `src/index.ts`.
3. It is consumed by at least one real `apps/web` feature or a bounded integration route.
4. The app-level Tailwind emit test proves that its package classes compile.
5. It contains no domain service imports, route ownership, or feature-specific permission decisions.

### RSC allowlist

Server-safe leaves (no `"use client"`) are listed in `__tests__/rsc-boundary.test.ts` — currently: `alert`, `badge`, `breadcrumb`, `button`, `button-group`, `card`, `input`, `kbd`, `native-select`, `pagination`, `skeleton`, `textarea`. Every other `components/ui/*` must declare `"use client"`.

### Public API change rule

- Additive exports are allowed when package tests and barrel coverage pass.
- Renames and removals require migration of all monorepo consumers in the same change.
- A short-lived deprecated export alias is allowed only when an atomic migration is not reasonably possible.
- No independent package-release process is required while every consumer remains in the same monorepo.
- Changes to shared behavior must identify affected product consumers in the final implementation report.

### Diagnostic routes

A permanent parallel playground or design-system application remains out of scope. A time-bounded internal diagnostic route is allowed for a migration or difficult interaction when it has a named purpose, is excluded from production navigation, and is removed or explicitly retained after verification.

### Agent / rule surfaces

- [`.cursor/rules/ui-system.mdc`](../../.cursor/rules/ui-system.mdc) — globs for web + package
- Frontend overlay: compose from barrel; ADR-010 workflow for adds
- Do not restore retired `@afenda/ui` / design-system gateway skills

---

## Known limits / future changes

These are **backlog-shaped**, not architecture reopeners:

| Gap | Direction |
| --- | --------- |
| Thin compounds (DataTable, Combobox, FormField, Calendar) | Deepen in-package when product demand lands (filters, multi-select, DatePicker composition) |
| Density / shadow / motion tokens | Extend `tokens.css`; apply to controls and table chrome |
| A11y program | Expand interaction + axe coverage; prove on product routes |
| App proof | First real screens must import the barrel end-to-end; every new compound needs one real consumer before completion |
| Hygiene | Remove unused `@base-ui/react` when next touching dependencies |

**Explicit non-goals for this architecture:** private registry, Storybook restore, `apps/ds-workbench`, split `tokens` / `erp-patterns` packages, anti-barrel subpath public API, domain ERP modules inside this package.

---

## References

| Doc | Role |
| --- | ---- |
| [ADR-010](../architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md) | Binding decision (Closed) |
| [ARCH-024 § `@afenda/ui-system`](../architecture/ARCH-024-package-boundaries.md#afendaui-system) | Package boundary SSOT |
| [AGENTS.md](../../AGENTS.md) | Checkout posture / UI import rules |
| [ui.shadcn.com](https://ui.shadcn.com) | Upstream component / CLI reference |