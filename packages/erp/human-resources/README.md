# `@afenda/human-resources`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/human-resources` · Lifecycle: **scaffolded**

Sole mutator for organization-scoped workforce relationship data: employees, employment, recruitment, lifecycle, learning, and compensation-benefits **agreements** (43 `hr_*` tables). Outcomes use `@afenda/errors` `Result` — this package does not own HTTP status lines, `NextResponse`, or Action envelopes.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `hr_*` from `apps/web` or peer ERP packages. HR must not calculate gross-to-net payroll or insert into `payroll_*`, `payment`, or `journal` tables. Platform / app server code consumes this package when wiring authorization ports and public commands as they land on the barrel.

Toolchain: root `engines` **Node 24.x** · **pnpm ≥10.33.4** (`packageManager` pin); run package checks from the repository root.

## Consume

Workspace dependency — import permissions, port types, brands, shipped commands/queries, and tenant schemas from the root barrel:

```ts
import {
  createEmployee,
  getEmployeeById,
  HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
  type HumanResourcesAuthorizationPort,
  type MutationPorts,
} from "@afenda/human-resources";
```

**Shipped public API (HR-00 disk truth):**

| Id | Kind | Permission |
| -- | ---- | ---------- |
| `human-resources.employee.create` | command | `human-resources.employee.create` |
| `human-resources.employee.get` | query | `human-resources.employee.read` |

`HumanResourcesStore` (memory + drizzle) implements the employee create / get / idempotency path. Other capability folders under `src/{organization,recruitment,lifecycle,time,leave,performance,talent,learning,compensation-benefits}/` remain aggregate boundary markers until their domain DDL and commands land. Operation IDs, mutation tables, permission codes, and event emits live in `src/module.manifest.ts` (export `@afenda/human-resources/module-manifest`).

**Authorization:** permission checks go through an injected `HumanResourcesAuthorizationPort` at the composition root — never import `@afenda/admin` here. Route-level checks in `apps/web` are not sufficient.

**Integration:** Payroll consumes approved workforce facts via app-injected adapters (`PayrollEmployeeQueryPort` is owned by `@afenda/payroll` — not exported from this package). Auth and Admin reactions to HR events use app-saga orchestration — not peer ERP imports.

## Public surfaces

| Path | Role |
|------|------|
| `@afenda/human-resources` | Shipped `createEmployee` / `getEmployeeById`, permission codes, brands, error codes, authorization / mutation port types, tenant schemas |
| `@afenda/human-resources/adapters/drizzle` | `HumanResourcesStore` type (Drizzle adapter surface) |
| `@afenda/human-resources/testing` | Test helpers export surface |
| `@afenda/human-resources/module-manifest` | Module manifest (`band: R1-F`, `lifecycle: scaffolded`) |

The root surface never exports raw Drizzle tables, query builders, database handles, Next.js types, or HTTP envelopes.

## Maintain

Manifest SSOT: `src/module.manifest.ts`. Capability folders under `src/{core,organization,recruitment,lifecycle,time,leave,performance,talent,learning,compensation-benefits}/` hold aggregate boundary markers; time / leave / performance / talent have folder + aggregate names without matching `hr_*` mutation tables yet (see roadmap GATE-TL).

```bash
pnpm --filter @afenda/human-resources lint
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test
pnpm --filter @afenda/human-resources check
```

After manifest edits:

```bash
pnpm validate:modules
pnpm validate:modules:write
pnpm governance:packages
```

## Ownership

| Surface | Owner |
|---------|-------|
| `hr_*` schema · organization-scoped `organization_id` | `@afenda/db` |
| HR mutation authority (43 tables) · permissions · error codes | `@afenda/human-resources` |
| Mutation table list | `src/mutation-tables.ts` · [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Generic `Result` and error primitives | `@afenda/errors` |
| Party / master lookups (reference only) | `@afenda/master-data` |
| HR event contracts | `@afenda/events` |
| Grants and authorization evaluation | authorization subsystem via injected adapter |
| ActionResult adapters · HR UI | `apps/web` |

**Anti-goals:** gross-to-net payroll calculation; writes to `payroll_*`, `payment`, `journal`; shadow employee master tables outside `hr_*`; peer ERP package imports.

Must not import Surfaces, `apps/*`, or Next.js. See [docs-V2/monorepo](../../../docs-V2/monorepo/README.md).

## Authority

| Topic | Link |
|-------|------|
| HR-00 implementation audit (Scratch) | [human-resources-implementation-audit.md](../../../docs-V2/_scratch/erp/human-resources-implementation-audit.md) |
| Bounded-context architecture (Scratch) | [human-resource.md](../../../docs-V2/_scratch/erp/human-resource.md) |
| Phase sequencing (Scratch) | [human-resources-roadmap.md](../../../docs-V2/_scratch/erp/human-resources-roadmap.md) |
| ERP scaffold rules | [SCAFFOLDING.md](../SCAFFOLDING.md) |
| Tenancy · shared schema · org-scoped rows | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) |
| Schema ownership | [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
