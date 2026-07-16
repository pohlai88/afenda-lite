# ARCH-024 Package Boundaries

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-024     |
| **Category**      | Architecture |
| **Version**       | 1.7.0        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Platform     |
| **Updated**       | 2026-07-17   |

---

# 1. Purpose

Living package boundary SSOT after ARCH-028 Checkpoint G (2026-07-15): the six shared `packages/*` workspace members, each one's declared public export surface, and the cross-package import direction rule that `apps/web` and every package must follow.

**Audience:** engineers adding a package export, wiring a new cross-package import, or adding a primitive to the `@afenda/ui-system` design system.
**Action enabled:** know exactly which subpath is legal to import from each package, and how the `@afenda/ui-system` flat barrel + owned-token surface works.
**When NOT to edit:** do not duplicate package schema/business-logic detail — that lives in [ARCH-025](ARCH-025-data-layer.md) (data) and [ARCH-001](ARCH-001-backend-architecture.md) (backend layers); this document owns the *boundary*, not the *content*, of each package.

---

# 2. Scope

## 2.1 In Scope

- The six `packages/*` workspace members and their npm names
- Each package's declared public `package.json#exports` surface and forbidden internals
- Cross-package / app-to-package import direction (one-way: `apps/web` → `packages/*`, never reverse)
- The `@afenda/ui-system` flat public barrel (`@afenda/ui-system`) and single stylesheet (`@afenda/ui-system/styles.css`), and the app-owned CSS split
- Failure modes and operational rules for adding/changing a package export

## 2.2 Out of Scope

- Package internal business logic, schema definitions ([ARCH-025](ARCH-025-data-layer.md)), or backend layering ([ARCH-001](ARCH-001-backend-architecture.md))
- Multi-tenancy / RBAC decision lock ([ARCH-023](ARCH-023-multi-tenancy.md))
- The historical Next.js `/playground` harness name collision (those routes are **absent** on disk as of 2026-07-15; the `@afenda/ui` playground gateway that once shared the word is retired — see [ADR-010](adr/ADR-010-afenda-ui-system-flat-barrel.md))
- Adding a new primitive to `@afenda/ui-system` (each addition is its own bounded change via the shadcn CLI)

---

# 3. Package Architecture

## Dependency graph

```
apps/web
  ├── @afenda/db
  ├── @afenda/auth  ──→  @afenda/db
  ├── @afenda/env
  ├── @afenda/ui-system
  └── @afenda/emails

@afenda/config    (devDep only — not a runtime import)
```

Cross-package runtime imports flow in one direction only. `@afenda/db` does not import `@afenda/auth`. No cycles.

## Package contracts

| Package | npm name | Public exports | Must not |
|---------|----------|---------------|---------|
| `packages/db` | `@afenda/db` | `db`, `schema`, `withOrg(orgId)` | Import from `@afenda/auth` or `@afenda/env` |
| `packages/auth` | `@afenda/auth` | `getSession()`, `requireRole(role)`, `inviteOrgMember()` | Contain DB schema definitions |
| `packages/env` | `@afenda/env` | `env` | Contain runtime business logic |
| `packages/ui-system` | `@afenda/ui-system` | `.` (flat barrel: every `components/ui/*` primitive + `cn`), `./styles.css` (semantic tokens) | Contain server-only code or DB calls; import Tailwind itself; expose any deep `./components/*`, `./lib/*`, `./hooks/*` subpath publicly |
| `packages/emails` | `@afenda/emails` | all template components | Be imported in client components |
| `packages/config` | `@afenda/config` | `biome.json`, `tsconfig/*.json` | Be imported at runtime |

## Components

### `@afenda/db`

```
packages/db/
├── src/
│   ├── schema/
│   │   ├── platform.ts       ← organizations, users, platform RBAC tables
│   │   ├── declarations.ts   ← Living tenant roots per ARCH-023 / ARCH-025
│   │   └── fft.ts            ← Living FFT tenant roots per ARCH-023 / ARCH-025
│   ├── client.ts             ← neon() pooler connection, withOrg()
│   └── index.ts              ← public re-exports
├── drizzle/                  ← generated migration files
└── package.json              ← exports: { ".": "./src/index.ts" }
```

### `@afenda/auth`

```
packages/auth/
├── src/
│   ├── session.ts            ← getSession() → Session
│   ├── rbac.ts               ← requireRole(role) — redirects if unmet
│   ├── invitations.ts        ← inviteOrgMember() via Neon Auth org invite
│   └── index.ts
└── package.json
```

### `@afenda/env`

```
packages/env/
├── src/
│   └── web.ts                ← @t3-oss/env-nextjs schema (server + client blocks)
└── package.json
```

### `@afenda/ui-system`

```
packages/ui-system/
├── src/
│   ├── index.ts              ← the ONLY component door: flat barrel re-exporting every primitive + cn
│   ├── components/ui/        ← owned shadcn/Radix (new-york) primitives — not a public subpath
│   ├── hooks/                ← internal hooks (e.g. use-mobile) — not public
│   ├── lib/utils.ts          ← cn() (re-exported from the barrel)
│   └── styles/tokens.css     ← `@afenda/ui-system/styles.css`: semantic tokens only (no Tailwind import)
├── components.json           ← style: new-york (Radix / unified radix-ui), lucide, NO registries
└── package.json              ← exports: { ".": src/index.ts, "./styles.css": src/styles/tokens.css }
```

**One flat barrel, one stylesheet — the entire public API.** Consumers import components only from `@afenda/ui-system` (the flat barrel re-exporting every `components/ui/*` primitive plus `cn`) and tokens only from `@afenda/ui-system/styles.css`. There is no gateway subpath, no `*Contract` type, and no deep-import surface: anything under `./components/*`, `./hooks/*`, or `./lib/*` is not in the exports map and fails to resolve for any outside consumer (Node `exports` is the hard enforcement). The barrel carries no `"use client"`; each interactive primitive keeps its own directive, preserved across re-export.

**CSS ownership is split (see [ADR-010](adr/ADR-010-afenda-ui-system-flat-barrel.md) § D4).** The consuming app owns Tailwind compilation: `apps/web/globals.css` runs `@import "tailwindcss"`, imports the animation layer (`tw-animate-css`), imports `@afenda/ui-system/styles.css`, registers the package via `@source "../../packages/ui-system/src"`, and owns brand typography. The package's `styles.css` owns **only** the semantic token layer (`@theme inline`, `:root`, `.dark`, `@custom-variant dark`) and never imports Tailwind. Primitives are owned source generated by the shadcn CLI (`style: new-york` → unified `radix-ui`); on generation, `@/` aliases are converted to relative imports so resolution needs no `paths`/`imports` map. The retired `@afenda/ui` playground gateway and the Next.js `/playground` harness are gone — neither may be handrolled back; a future browser harness returns only via an explicit **Shadcn Studio MCP** slice.

**ERP token families (19) — same SSOT, no parallel file.** Values and `@theme` maps live only in [`packages/ui-system/src/styles/tokens.css`](../../packages/ui-system/src/styles/tokens.css); lock list `packages/ui-system/__tests__/erp-tokens.test.ts`. Binding decision: [ADR-010](adr/ADR-010-afenda-ui-system-flat-barrel.md) § D4.1. Compose guidance: `/afenda-elite-ui-compose`. Scratch brand lanes (including Aerospace Ceramic) are not Living authority.

| Family | CSS variables | Theme utilities agents must name |
|--------|---------------|----------------------------------|
| Surface | `--surface-sunken`, `--surface-raised`, `--canvas` | `bg-surface-sunken`, `bg-surface-raised`, `bg-canvas` |
| Ink ladder | `--foreground-secondary`, `--foreground-tertiary` | `text-foreground-secondary`, `text-foreground-tertiary` (with registry `text-foreground` / `text-muted-foreground`) |
| Status subtle / border | `--{success\|warning\|info\|destructive}-subtle`, `-subtle-foreground`, `-border` (12) | `bg-*-subtle`, `text-*-subtle-foreground`, `border-*-border` |
| Table chrome | `--table-row-hover`, `--table-stripe` | `bg-table-row-hover`, `bg-table-stripe` |

**Do not ship `--foreground-quaternary`.** Solid status pairs (`--success` / `--warning` / `--info` + foregrounds) and density / shadow / motion slots remain in the same `tokens.css`; they are outside the 19-count ERP family set.

### `@afenda/emails`

```
packages/emails/
├── src/
│   ├── onboarding-invite.tsx
│   ├── password-reset.tsx
│   └── index.ts
└── package.json
```

### `@afenda/config`

```
packages/config/
├── biome.json
├── tsconfig/
│   ├── base.json
│   ├── nextjs.json
│   └── react-library.json
└── package.json              ← no exports — consumed via extends/extends paths
```

## Data / request flow

Imports always flow from `apps/web` → `packages/*`. Never the reverse.

**In-app layering (GUIDE-018 I2.2):** `features/*` and thin `app/actions/*` → `modules/*/domain` → `@afenda/db`. Features and adapters must never import `@afenda/db` (or deep `packages/db` paths). Enforced by `apps/web/__tests__/feature-db-boundary.test.ts`.

```
apps/web/features/declarations/declarations-shell.tsx
  │
  import { listSurveys } from '@/modules/declarations/domain/list-surveys'   ✓
  import { withOrg } from '@afenda/db'   ✗  (feature ↛ db)

apps/web/modules/declarations/domain/list.ts
  │
  import { withOrg } from '@afenda/db'   ✓
  import { getSession } from '@afenda/auth'  ✓
  import { env } from '@afenda/env'   ✓
  import { Button, Card } from '@afenda/ui-system'   ✓
  │
  import { withOrg } from '../../packages/db/src/client'  ✗  (internal path)
  import { Button } from '@afenda/ui-system/components/ui/button'  ✗  (not a public subpath)
  import '@afenda/ui-system/src/styles/tokens.css'  ✗  (use @afenda/ui-system/styles.css)
```

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Package isolation over shared `lib/` | [ARCH-022](ARCH-022-system-overview.md) § Workspace |
| `src/` internals unreachable from outside | [ARCH-022](ARCH-022-system-overview.md) § Workspace |
| No mega-package (`@afenda/shared`) | This doc |
| `@afenda/ui-system` flat barrel as the sole public UI door (supersedes the ADR-009 gateway) | [ADR-010](adr/ADR-010-afenda-ui-system-flat-barrel.md) |
| ERP token families (19) live in `tokens.css` only — surface · ink ladder · status-subtle/border · table chrome | [ADR-010](adr/ADR-010-afenda-ui-system-flat-barrel.md) § D4.1 · this doc § `@afenda/ui-system` |
| Feature / adapter ↛ `@afenda/db` (domain only) | This doc § Data / request flow · GUIDE-018 I2.2 |

## Failure modes

| Failure | Detection |
|---------|-----------|
| Cross-package `src/` import | `publint` or Biome import path rule in CI |
| Circular dependency | `turbo run build` fails with cycle error |
| Package exports not declared | TypeScript `moduleResolution: bundler` throws at import |
| `features/*` or `app/actions/*` imports `@afenda/db` | `feature-db-boundary` Vitest (GUIDE-018 I2.2) |

## Operational considerations

- Adding a new export: update `package.json#exports`, update this document's contract table, create a PR.
- Adding a new package: new directory under `packages/`, add to `pnpm-workspace.yaml` includes (already covered by `packages/*` glob), add a row to this document.

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-022 | System Overview — Turborepo | Workspace decision this doc implements |
| ARCH-023 | Multi-Tenancy and Platform RBAC | Org isolation (out of scope here) |
| ARCH-025 | Data Layer | `@afenda/db` schema detail |
| ADR-010 | `@afenda/ui-system` Flat-Barrel Radix Design System | Binding decision record for the flat barrel + owned tokens |
| ADR-009 | `@afenda/ui` Playground Gateway | Superseded by ADR-010 (history) |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.7.0 | 2026-07-17 | Documented 19 shipped ERP token families under `@afenda/ui-system` (surface · ink ladder · status-subtle/border · table chrome) with path citation to `packages/ui-system/src/styles/tokens.css` and compose utility names; linked ADR-010 § D4.1. |
| 1.6.0 | 2026-07-16 | Design-system replacement per [ADR-010](adr/ADR-010-afenda-ui-system-flat-barrel.md): `@afenda/ui` (`packages/design-system`) playground gateway retired; `@afenda/ui-system` (`packages/ui-system`) flat barrel + `./styles.css` is the sole public UI surface; app-owned CSS split documented; contract table, graph, flow example, decisions + references repointed. |
| 1.5.2 | 2026-07-15 | Bounded reopen (I2.2 audit repair): document feature/adapter ↛ `@afenda/db`; domain-only import + Vitest gate pointer. |
| 1.5.1 | 2026-07-15 | Harness absence honesty: Next.js `/playground` trees removed; disambiguation paragraph updated (gateway unchanged). |
| 1.5.0 | 2026-07-15 | DOC-003 six-section retrofit (content unchanged from 1.4.0 except "Known limits / future changes" moved to § 6 Notes) — this document's own 1.4.0 revision was the material change that crossed the retrofit threshold; ARCH-022/025/026/027/028 remain explicitly grandfathered per DOC-001 §3.8 (see DOC-002 register). |
| 1.4.0 | 2026-07-15 | Reopened/closed same-turn: `@afenda/ui` exports trimmed to `.`, `./style.css`, `./playground`, `./playground/providers`, `./playground/types`; added `@afenda/ui/playground` vs `/playground` routes disambiguation paragraph; `*Contract`/`extends` pattern documented; forbidden-imports table updated. See [ADR-009](adr/ADR-009-afenda-ui-playground-gateway.md). |
| 1.3.0 | 2026-07-15 | Checkpoint G: Status Target→Living; packages present on disk. |
| 1.2.1 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.2.0 | 2026-07-14 | Integrity remediation: parseable Change Log; schema path labels defer to ARCH-023/025 Living roots. |
| 1.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.0.0 | 2026-07-13 | Initial Target package boundaries |

---

# 6. Notes

## Known limits / future changes

- Packages are private workspace packages. If a package needs to be published to npm (e.g., `@afenda/ui-system` as a design system), a separate publishing pipeline and semver strategy are required.
- `@afenda/config` is consumed via file path (`extends: "@afenda/config/tsconfig/nextjs.json"`), not via the module system — it is not a runtime import.
