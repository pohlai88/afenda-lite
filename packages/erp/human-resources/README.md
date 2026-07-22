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
  updateEmployee,
  createEmployment,
  amendEmployment,
  createEmploymentContract,
  createAssignment,
  endAssignment,
  getEmployeeById,
  listEmployees,
  type CreateEmployeeInput,
  type HumanResourcesCommandOptions,
} from "@afenda/human-resources";
```

Also shipped on the same barrel (schema-backed): organization structure (department / job / position / reporting-line), employment / contract / assignment helpers, and recruitment (requisition → offer accept). Naming follows ERP `create*` / verb conventions — not `startEmployment` / `recordEmploymentContract`.

**Shipped public API (missions HR-02 + HR-03 + HR-04):**

| Id | Kind | Permission | Slice |
| -- | ---- | ---------- | ----- |
| `human-resources.employee.create` | command | `employee.create` | HR-00 |
| `human-resources.employee.update` | command | `employee.update` | HR3 |
| `human-resources.employee.get` | query | `employee.read` | HR-00 |
| `human-resources.employee.list` | query | `employee.read` | HR3 |
| `human-resources.employment.create` | command | `employment.manage` | HR3 |
| `human-resources.employment.amend` | command | `employment.manage` | HR3 |
| `human-resources.employment.get` | query | `employee.read` | HR3 |
| `human-resources.employment-contract.create` | command | `employment.manage` | HR3 |
| `human-resources.employment-contract.get` | query | `employee.read` | HR3 |
| `human-resources.department.*` / `job.*` | command/query | `organization.manage` / `organization.read` | HR-03 |
| `human-resources.position.create` / `.update` / `.activate` / `.freeze` / `.close` | command | `organization.manage` | HR4 / HR-03 |
| `human-resources.position.get` / `.list` | query | `organization.read` | HR4 / HR-03 |
| `human-resources.reporting-line.*` / `organization.tree` | command/query | `organization.manage` / `organization.read` | HR-03 |
| `human-resources.assignment.create` / `.end` | command | `employment.manage` | HR4 |
| `human-resources.assignment.get` | query | `employee.read` | HR4 |
| `human-resources.requisition.*` | command/query | `requisition.create` | HR-04 |
| `human-resources.candidate.*` / `application.*` | command/query | `candidate.manage` | HR-04 |
| `human-resources.interview.*` / `interview-evaluation.get` | command/query | `interview.record` | HR-04 |
| `human-resources.offer.*` | command/query | `offer.approve` | HR-04 |

**Employment status (Q5):** `active` → `notice` \| `terminated`; `notice` → `terminated`; no exit from `terminated`. Stored on `hr_employment.status` (CHECK). Employee create does **not** auto-create employment. No `md_party` FK (Q4). Position status: `active` \| `frozen` \| `closed` — assignment create requires `active`. Department/job status: `active` \| `archived`. Position create requires active department + job. No headcount authority — not enforced. `employee.read` is **not** sufficient for organization-structure mutation.

**Recruitment (HR-04):** Requisition `draft` → `submitted` → `approved` → `open` ↔ `on_hold` → `closed` \| `cancelled`. Application `submitted` → `in_review` → `interviewing` → `offered` → `accepted` (or reject/withdraw). Offer `draft` → `issued` → `accepted` \| `declined` \| `expired` \| `withdrawn`. `acceptOffer` returns `OfferAcceptanceHandoff` and emits `offer.accepted.v1` — it does **not** create an employee. Evaluation `private_notes` are omitted from interview lists; `interview-evaluation.get` requires `interview.record`.

`HumanResourcesStore` (memory + drizzle) covers employee, employment, contract, department, job, position, assignment, reporting line, and recruitment aggregates. Remaining folders under lifecycle/time/leave/… stay markers until their DDL. Manifest: `@afenda/human-resources/module-manifest`.

**Authorization:** permission checks go through an injected `HumanResourcesAuthorizationPort` at the composition root — never import `@afenda/admin` here. Route-level checks in `apps/web` are not sufficient.

**Trusted mutation context (stamp last):** composition-root Actions must stamp `organizationId`, `actorUserId`, and `correlationId` onto the command input **after** any client/domain payload so client values cannot override tenancy. Do not forward a raw request body into HR commands.

```ts
const commandInput = {
  ...parsedDomainPayload,
  organizationId: session.organizationId,
  actorUserId: session.userId,
  correlationId,
};
```

Command schemas are `.strict()` and keep tenant fields only at the top level (no nested `organizationId` / `actorUserId` / `correlationId`). Store lookups are always organization-scoped.

### Tenancy (HR1)

| Rule | Detail |
| ---- | ------ |
| Org id shape | Opaque trusted `organization_id text NOT NULL` from the auth/composition layer — **no** FK to `neon_auth.organization` |
| Mutation roots | All **43** `hr_*` tables are `HARD_TENANT_ROOT` in `@afenda/db` (`hard-tenant-roots.ts`) and `pnpm audit:tenancy-nulls` |
| Lookup contract | Store methods require `organizationId`; bare-ID cross-org get is prohibited |
| Stamp last | Composition root stamps `organizationId` after client payload; DB `NOT NULL` is the final integrity boundary |
| Domain DDL (HR2 + HR-03 + HR-04) | Core workforce via `0036`; organization structure via `0037`; recruitment via `0038` (`hr_job_requisition` … `hr_employment_offer`); lifecycle/`hr_*` remain scaffold |
| Parent/child cross-org | Employment → employee; contract/assignment → employment + employee; assignment → active position; reporting → same-org employees — enforced in memory + Drizzle |
| Terminate closes open | Status → `terminated` always sets `ends_on` (caller value or startsOn) so open unique index releases; emits `employee.terminated.v1` |

**Integration:** Payroll consumes approved workforce facts via app-injected adapters (`PayrollEmployeeQueryPort` is owned by `@afenda/payroll` — not exported from this package). Auth and Admin reactions to HR events use app-saga orchestration — not peer ERP imports.

## Public surfaces

| Path | Role |
|------|------|
| `@afenda/human-resources` | Employee / employment / contract / position / assignment commands & queries, brands, schemas, permissions, errors, authz / mutation port types |
| `@afenda/human-resources/adapters/drizzle` | `createDrizzleHumanResourcesStore` + `HumanResourcesStore` type |
| `@afenda/human-resources/testing` | Memory + Drizzle store factories + `HumanResourcesStore` / `MutationPorts` types for Vitest (Neon Drizzle suites skip when `DATABASE_URL` is absent) |
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
