# `packages/`

Workspace home for **`@afenda/*`** libraries consumed by `apps/web` and (narrowly) `apps/docs`. Rank-1 Platform (with **bands**) and Rank-2 Surfaces packages live here; Application code stays under `apps/*`.

Import by package name only (`@afenda/<name>` or a declared `exports` subpath). Packages never import `apps/*`. Layer DAG and ERP governance: [docs-V2/monorepo](../docs-V2/monorepo/README.md) · [LAYERS.md](../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · [WORKSPACE-EDGE-REGISTER.yaml](../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml).

For engineers extending Platform or Surfaces; each package README is the consume / maintain entry. Agent checkout posture: [AGENTS.md](../AGENTS.md).

**Governance version:** `packages-catalog/2026-07-20` (Phase 1 classification — promoted from packages_refactor_v2.3). Phase 3 nesting and Phase 4 new ERP packages are **not** authorized.

## Layers

Imports flow **down** only. No cycles. `@afenda/config` is devDep / tsconfig / Biome extend only — not a runtime import. **Bands classify only; they never grant dependency rights.**

| Rank | Layer | Packages |
|------|-------|----------|
| 2 | Surfaces (R2) | [`ui-system`](./ui-system/README.md) · [`emails`](./emails/README.md) |
| 1 | Platform | See banded catalog below |

Application (`apps/web` · `apps/docs`) is Rank 3 — outside this folder. Physical paths stay flat (`packages/<name>`).

## Catalog

### Surfaces — Rank 2

| Package | Role |
|---------|------|
| [`@afenda/ui-system`](./ui-system/README.md) | Owned-source shadcn/Radix primitives + semantic tokens (flat barrel) |
| [`@afenda/emails`](./emails/README.md) | React Email templates for app-owned mail composition |

### Platform Foundation — Rank 1A

| Package | Role |
|---------|------|
| [`@afenda/config`](./config/README.md) | Shared Biome + TypeScript bases (dev-time only) |
| [`@afenda/env`](./env/README.md) | Typed env contract (`createEnv` + Zod) — sole product env SSOT |
| [`@afenda/errors`](./errors/README.md) | Transport-neutral `AppError` / codes / `Result` leaf |

### Runtime Infrastructure — Rank 1B

| Package | Role |
|---------|------|
| [`@afenda/logger`](./logger/README.md) | Pino Node logger + edge-safe emit |
| [`@afenda/http`](./http/README.md) | Fetch compose · correlation · pagination · rate-limit / timing headers |
| [`@afenda/security`](./security/README.md) | Security headers · CSP · CORS builders |
| [`@afenda/metrics`](./metrics/README.md) | Prometheus registry · HTTP/DB/cache instruments |
| [`@afenda/openapi`](./openapi/README.md) | Zod→OpenAPI glue · `{ data }` envelope · YAML emit |
| [`@afenda/rate-limit`](./rate-limit/README.md) | Sliding-window abuse limiter (Upstash / memory) |
| [`@afenda/cache`](./cache/README.md) | L1 process + Upstash Redis L2 cache |

### Data Plane — Rank 1C

| Package | Role |
|---------|------|
| [`@afenda/db`](./db/README.md) | Neon HTTP + Drizzle · living `platform_*` / domain schema |
| [`@afenda/audit`](./audit/README.md) | Sole `platform_audit_log` write/list/export SSOT |
| [`@afenda/events`](./events/README.md) | Sole `platform_domain_event` outbox SSOT |
| [`@afenda/search`](./search/README.md) | Sole `platform_search_document` Postgres FTS SSOT |
| [`@afenda/notifications`](./notifications/README.md) | Sole `platform_notification` IN_APP inbox SSOT |

### Identity and Control Plane — Rank 1D

| Package | Role |
|---------|------|
| [`@afenda/auth`](./auth/README.md) | Neon Auth adapter · session · BFF · Path A credentials |
| [`@afenda/admin`](./admin/README.md) | Org-console services · RBAC audit · health / provision |

### ERP — Rank 1F

| Package | Role |
|---------|------|
| [`@afenda/master-data`](./master-data/README.md) | `ref_*` + org masters (`md_party` · `md_item*` · `md_warehouse`) |
| [`@afenda/sales`](./sales/README.md) | Sales order/line consumer (ARCH-006) |

Peer R1-F packages do not import each other. Candidates (no package yet): [MODULE-ROADMAP.yaml](../docs-V2/modules/MODULE-ROADMAP.yaml).

### Intelligence — Rank 1X

| Package | Role |
|---------|------|
| [`@afenda/ai-the-machine`](./ai-the-machine/README.md) | AI SDK conversational engine (prompt-only assistants) |

## Consume

```ts
import { env } from "@afenda/env";
import { Button } from "@afenda/ui-system";
```

- Prefer package name / declared `exports` — never `../../packages/...` or `@afenda/*/src/...`
- Internal deps: `"workspace:*"` · shared externals: `"catalog:"` when listed
- New or changed workspace edges: update `package.json` **and** [WORKSPACE-EDGE-REGISTER.yaml](../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml) in the same mission
- Env: `@afenda/env` + `.env.local` — never raw `process.env` for product config
- UI: `@afenda/ui-system` barrel only — do not revive `@afenda/ui`
- Tenancy: organization-scoped rows (`organization_id`) on shared schema — never multi-DB / project-per-tenant isolation

## Maintain

**Engines:** Node.js `24.x` · pnpm `>=10.33.4` (root `package.json`).

```bash
pnpm --filter @afenda/<name> lint
pnpm --filter @afenda/<name> typecheck
pnpm --filter @afenda/<name> test
```

Add / rename packages only with a DAG update in [docs-V2/monorepo](../docs-V2/monorepo/README.md) and a WORKSPACE-EDGE-REGISTER row.

## Authority

| Topic | Link |
|-------|------|
| Layer DAG · ERP governance | [docs-V2/monorepo](../docs-V2/monorepo/README.md) · [LAYERS.md](../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Workspace edges | [WORKSPACE-EDGE-REGISTER.yaml](../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml) · [PACKAGE-GOVERNANCE.md](../docs-V2/modules/PACKAGE-GOVERNANCE.md) |
| Module roadmap | [MODULE-ROADMAP.yaml](../docs-V2/modules/MODULE-ROADMAP.yaml) |
| pnpm · catalog | [docs-V2/pnpm](../docs-V2/pnpm/README.md) |
| Tenancy · shared schema | [docs-V2/tenancy](../docs-V2/tenancy/README.md) |
| Accepted promotion reference | [packages_refactor_v2.3.md](../docs-V2/_scratch/packages_refactor_v2.3.md) |
| Repo quickstart | [README.md](../README.md) |
| Agent checkout | [AGENTS.md](../AGENTS.md) |
