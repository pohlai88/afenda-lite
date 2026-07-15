# ARCH-024 Package Boundaries

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-024     |
| **Category**      | Architecture |
| **Version**       | 1.5.1        |
| **Status**        | Living       |
| **Control State** | Closed       |
| **Owner**         | Platform     |
| **Updated**       | 2026-07-15   |

---

# 1. Purpose

Living package boundary SSOT after ARCH-028 Checkpoint G (2026-07-15): the six shared `packages/*` workspace members, each one's declared public export surface, and the cross-package import direction rule that `apps/web` and every package must follow.

**Audience:** engineers adding a package export, wiring a new cross-package import, or promoting a `packages/design-system` template into the public UI surface.
**Action enabled:** know exactly which subpath is legal to import from each package, and where the `@afenda/ui` gateway/contract pattern lives.
**When NOT to edit:** do not duplicate package schema/business-logic detail — that lives in [ARCH-025](ARCH-025-data-layer.md) (data) and [ARCH-001](ARCH-001-backend-architecture.md) (backend layers); this document owns the *boundary*, not the *content*, of each package.

---

# 2. Scope

## 2.1 In Scope

- The six `packages/*` workspace members and their npm names
- Each package's declared public `package.json#exports` surface and forbidden internals
- Cross-package / app-to-package import direction (one-way: `apps/web` → `packages/*`, never reverse)
- The `@afenda/ui` gateway barrel (`@afenda/ui/playground`, `@afenda/ui/playground/providers`) and `*Contract extends` pattern
- Failure modes and operational rules for adding/changing a package export

## 2.2 Out of Scope

- Package internal business logic, schema definitions ([ARCH-025](ARCH-025-data-layer.md)), or backend layering ([ARCH-001](ARCH-001-backend-architecture.md))
- Multi-tenancy / RBAC decision lock ([ARCH-023](ARCH-023-multi-tenancy.md))
- The historical Next.js `/playground` harness name collision (disambiguation only — those routes are **absent** on disk as of 2026-07-15; see § 3 `@afenda/ui`)
- Promoting additional `packages/design-system/src/**` templates into the gateway (each promotion is its own bounded change)

---

# 3. Package Architecture

## Dependency graph

```
apps/web
  ├── @afenda/db
  ├── @afenda/auth  ──→  @afenda/db
  ├── @afenda/env
  ├── @afenda/ui
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
| `packages/design-system` | `@afenda/ui` | `.` (`cn`), `./style.css`, `./playground` (gateway barrel), `./playground/providers`, `./playground/types` (contracts) | Contain server-only code or DB calls; expose `./components/*`, `./shared/*`, `./layout/*`, `./providers`, `./hooks/*`, `./lib/*`, `./utils/*`, `./configs/*`, `./contexts/*`, `./types/*`, `./store/*`, `./views/*`, `./fake-db/*`, `./assets/*` publicly |
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

### `@afenda/ui`

```
packages/design-system/
├── src/
│   ├── playground/           ← the ONLY public runtime door (see below)
│   │   ├── index.ts          ← gateway barrel: primitives (Button, ProfileDropdown, …)
│   │   ├── providers.ts      ← Providers alone (Next.js-bundler-only font chain)
│   │   └── types.ts          ← *Contract types + shared boundary-test constants
│   ├── components/           ← shadcn primitives + afenda shell components (not public)
│   ├── views/, fake-db/, …   ← template surface, on disk, not public until promoted
│   └── styles/style.css      ← Tailwind v4 CSS variables and design tokens
├── components.json
└── package.json
```

**`@afenda/ui/playground` vs the `/playground` Next.js routes — two different things sharing a name.** `@afenda/ui/playground` (this package's `src/playground/`) is the exports-map-enforced, always-bundled runtime gateway: the only path any consumer may use to reach a UI primitive. It is unrelated to env-gating and carries no `PLAYGROUND_ENABLED` semantics. The Next.js `/playground` routes and trees (`apps/web/app/playground/`, `apps/web/features/playground/`) were a separate, local-only developer harness; **both trees were removed 2026-07-15** and must **not** be handrolled back. Any future browser harness may return only via an explicit **Shadcn Studio MCP** install + promote slice. `PLAYGROUND_*` keys may remain in `@afenda/env` / local env (see [ARCH-027](ARCH-027-env-model.md)) as reserved toggles for that future slice — they do not imply routes exist today. `Providers` lives at the dedicated `./playground/providers` subpath, not the primitives barrel, because its dependency chain (`settingsContext` → `fonts.ts` → `next/font/google` / `geist/font/pixel`) is a Next.js compiler-only construct that cannot be evaluated outside Next's own bundler; each gateway member's own `Props` type `extends` a curated `*Contract` type from `./playground/types`, enforced structurally by `tsc`, not by a runtime validator. Anything not re-exported from `./playground` or `./playground/providers` (i.e. `./components/*`, `./shared/*`, `./layout/*`, `./providers`, `./hooks/*`, `./lib/*`, `./utils/*`, `./configs/*`, `./contexts/*`, `./types/*`, `./store/*`, `./views/*`, `./fake-db/*`, `./assets/*`) is not part of the public exports map and fails to resolve for any consumer outside the package.

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

```
apps/web/modules/declarations/domain/list.ts
  │
  import { withOrg } from '@afenda/db'   ✓
  import { getSession } from '@afenda/auth'  ✓
  import { env } from '@afenda/env'   ✓
  import { Button } from '@afenda/ui/playground'   ✓
  import { Providers } from '@afenda/ui/playground/providers'   ✓
  │
  import { withOrg } from '../../packages/db/src/client'  ✗  (internal path)
  import { Button } from '@afenda/ui/components/button'  ✗  (removed from public exports)
  import Providers from '@afenda/ui/providers'  ✗  (removed from public exports)
```

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Package isolation over shared `lib/` | [ARCH-022](ARCH-022-system-overview.md) § Workspace |
| `src/` internals unreachable from outside | [ARCH-022](ARCH-022-system-overview.md) § Workspace |
| No mega-package (`@afenda/shared`) | This doc |
| `@afenda/ui` playground gateway as the sole public UI door | [ADR-009](adr/ADR-009-afenda-ui-playground-gateway.md) |

## Failure modes

| Failure | Detection |
|---------|-----------|
| Cross-package `src/` import | `publint` or Biome import path rule in CI |
| Circular dependency | `turbo run build` fails with cycle error |
| Package exports not declared | TypeScript `moduleResolution: bundler` throws at import |

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
| ADR-009 | `@afenda/ui` Playground Gateway | Binding decision record for the gateway/contract pattern |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
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

- Packages are private workspace packages. If a package needs to be published to npm (e.g., `@afenda/ui` as a design system), a separate publishing pipeline and semver strategy are required.
- `@afenda/config` is consumed via file path (`extends: "@afenda/config/tsconfig/nextjs.json"`), not via the module system — it is not a runtime import.
