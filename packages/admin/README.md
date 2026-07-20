# `@afenda/admin`

Rank-1 Platform org-console + ops services for Afenda-Lite: Neon Auth organization list / provision / hard-delete, sole `platform_rbac_audit` write·list SSOT, health/readiness probes, and active-org usage metrics — **server-only**, returning `@afenda/errors` `Result`.

Use this package from Server Actions, RSC shells, and Platform domain adapters under `apps/web`. Prefer the **subpath exports** (`./audit` · `./health` · `./usage`) when you do not need org-console APIs — those entry points avoid loading the Neon Auth org client. Org APIs live on the root barrel only (there is no `@afenda/admin/org` export). Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import by export path:

```ts
// Prefer subpaths when you only need audit / health / usage
import {
  recordRbacAudit,
  listRbacAudit,
  MEMBER_INVITE_AUDIT_ACTION,
} from "@afenda/admin/audit";
import {
  getLivenessSnapshot,
  getReadinessSnapshot,
} from "@afenda/admin/health";
import { getOrganizationUsageMetrics } from "@afenda/admin/usage";

// Org-console (root barrel — pulls Neon Auth org client)
import {
  listOrganizations,
  provisionOrganization,
  deleteOrganization,
  provisionOrganizationInputSchema,
} from "@afenda/admin";
```

Outcomes are `Result<T>` (`ok: true | false`). Map to product `ActionResult` at Actions — do not invent `{ success, data }` envelopes.

**Living consumers:** `apps/web` — `@afenda/admin/audit` (invite + assign/revoke audited ports); `@afenda/admin/health` (`modules/platform/domain/health`); `@afenda/admin/usage` + root org APIs (org-admin shell + provision/delete/usage Actions). Do **not** dual-write `platform_rbac_audit` from `apps/web`.

## Maintain

```bash
pnpm --filter @afenda/admin lint
pnpm --filter @afenda/admin typecheck
pnpm --filter @afenda/admin test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/admin` | Org-console (`listOrganizations` · `createOrganization` · `provisionOrganization` · `deleteOrganization`) + Zod input/result schemas + re-exports of audit/health/usage |
| `@afenda/admin/audit` | `recordRbacAudit` · `listRbacAudit` · `deleteRbacAuditRow` + action constants — **no** Neon Auth org client |
| `@afenda/admin/health` | Liveness / readiness / DB inspect + `latencyMs` SSOT — **no** Neon Auth org client |
| `@afenda/admin/usage` | `getOrganizationUsageMetrics` · `buildUsagePosition` · `usagePeriodUtcBounds` (active session org + `YYYY-MM` position matrix) |

**Org-console notes**

| API | Behavior |
|-----|----------|
| `listOrganizations` | Session memberships + `lastActivityAt` from audit max |
| `provisionOrganization` | Create → `persistActiveOrganization` → invite first admin; partial failures return `INTERNAL_ERROR` + disposition (no fake rollback) |
| `deleteOrganization` | Neon Auth **hard-delete** — not soft-deactivate |
| `getOrganizationUsageMetrics` | Active org only; living counts + ops bands/alerts for a UTC month (not SKU / module limits) |

## Ownership

| Surface | Owner |
|---------|-------|
| Org-console Neon Auth ops · RBAC audit SSOT · health probes · usage position | `@afenda/admin` |
| Session / invite / membership primitives | `@afenda/auth` |
| Drizzle schema · `platform_*` tables | `@afenda/db` |
| ActionResult adapters · org-admin UI | `apps/web` |

**Layer:** Rank-1 Platform (`@afenda/auth` · `@afenda/db` · `@afenda/env` · `@afenda/errors`). Must not import Surfaces or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: dual audit writers, soft-delete org flags, client/UI components, tutorial REST envelopes, OpenAPI document ownership, or a second tenancy model (shared schema · hard `organization_id` only — never multi-DB / project-per-tenant isolation).

## Authority

| Topic | Link |
|-------|------|
| Tenancy · pooler · shared schema (Scratch; Living ARCH-023 dormant) | [docs-V2/tenancy](../../docs-V2/tenancy/README.md) · [neon-optimize](../../docs-V2/tenancy/neon-optimize.md) |
| Auth / Neon Auth ops | [docs-V2/auth](../../docs-V2/auth/README.md) |
| ActionResult · API wire | [docs-V2/api](../../docs-V2/api/README.md) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
