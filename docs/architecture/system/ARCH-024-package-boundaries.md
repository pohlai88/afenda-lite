# ARCH-024 Package Boundaries

| Field | Value |
|-------|-------|
| ID | ARCH-024 |
| Category | Architecture |
| Version | 1.2.0 |
| Status | Target |
| Control State | Closed |
| Owner | Platform |
| Updated | 2026-07-14 |

> **Forward-writing / Target.** Describes the intended Turborepo system. Authoritative for new work. Missing `apps/` or `packages/` on disk is expected until implementation.

## Context

The Turborepo workspace has six shared packages under `packages/`. Each package has a declared public surface. App code (`apps/web`) and inter-package dependencies may only import from that public surface — never from a package's `src/` internals. Workspace decision (Turborepo + pnpm): [ARCH-022](ARCH-022-system-overview.md) § Workspace .

## Responsibilities and boundaries

### Dependency graph

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

### Package contracts

| Package | npm name | Public exports | Must not |
|---------|----------|---------------|---------|
| `packages/db` | `@afenda/db` | `db`, `schema`, `withOrg(orgId)` | Import from `@afenda/auth` or `@afenda/env` |
| `packages/auth` | `@afenda/auth` | `getSession()`, `requireRole(role)`, `inviteOrgMember()` | Contain DB schema definitions |
| `packages/env` | `@afenda/env` | `env` | Contain runtime business logic |
| `packages/ui` | `@afenda/ui` | all components, `globals.css` | Contain server-only code or DB calls |
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
packages/ui/
├── src/
│   ├── components/           ← shadcn primitives + afenda shell components
│   └── globals.css           ← Tailwind v4 CSS variables and design tokens
├── components.json
└── package.json
```

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
  │
  import { withOrg } from '../../packages/db/src/client'  ✗  (internal path)
```

## Key decisions

| Decision | Where recorded |
|----------|---------------|
| Package isolation over shared `lib/` | [ARCH-022](ARCH-022-system-overview.md) § Workspace |
| `src/` internals unreachable from outside | [ARCH-022](ARCH-022-system-overview.md) § Workspace |
| No mega-package (`@afenda/shared`) | This doc |

## Failure modes

| Failure | Detection |
|---------|-----------|
| Cross-package `src/` import | `publint` or Biome import path rule in CI |
| Circular dependency | `turbo run build` fails with cycle error |
| Package exports not declared | TypeScript `moduleResolution: bundler` throws at import |

## Operational considerations

- Adding a new export: update `package.json#exports`, update this document's contract table, create a PR.
- Adding a new package: new directory under `packages/`, add to `pnpm-workspace.yaml` includes (already covered by `packages/*` glob), add a row to this document.

## Known limits / future changes

- Packages are private workspace packages. If a package needs to be published to npm (e.g., `@afenda/ui` as a design system), a separate publishing pipeline and semver strategy are required.
- `@afenda/config` is consumed via file path (`extends: "@afenda/config/tsconfig/nextjs.json"`), not via the module system — it is not a runtime import.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.2.0 | 2026-07-14 | Integrity remediation: parseable Change Log; schema path labels defer to ARCH-023/025 Living roots. |
| 1.1.1 | 2026-07-14 | Added mandatory Control State header field (Closed); lifecycle Status unchanged. |
| 1.0.0 | 2026-07-13 | Initial Target package boundaries |
