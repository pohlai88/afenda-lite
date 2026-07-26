# `@afenda/human-resources`

Enterprise HR bounded context for Afenda-Lite — workforce records, organizational structure, recruitment and lifecycle, leave and compensation, performance and learning, compliance and employee relations, time and attendance, talent, and workforce planning. Commands and queries return `@afenda/errors` `Result` types; mutations emit domain events for audit, notifications, and downstream payroll handoff.

**Who it's for:** `apps/web` server actions and sibling packages that need typed HR mutations — not UI shells, HTTP handlers, or payroll calculation engines.

**Requires:** Node 24.x · pnpm ≥10.33.4 (root `package.json` engines).

**Disk inventory (2026-07-26):** **348** commands · **198** queries · **111** permissions · **129** `hr_*` mutation / hard-tenant tables · **129/129** effective-truth classification register · emission registry **348/348**. Manifest `lifecycle: scaffolded`. Enterprise Scratch program: Phase 0 exit **MET**; Phase 3 Slice 3.4 lifecycle emissions **DONE**; Phase 4 Slice 4.1 effective-truth classification **DONE** — see [enterprise-audit pack](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/) · [`00.hrm.md`](../../../docs-V2/_scratch/00.hrm.md).

## Consume

Workspace import from the root barrel:

```ts
import {
	createEmployee,
	listEmployees,
	requestLeave,
	recordAttendanceEvent,
	submitTimesheet,
	type CreateEmployeeInput,
	type HumanResourcesCommandOptions,
} from "@afenda/human-resources";
```

Wire the Drizzle store and command options at the app composition root (see `apps/web/lib/erp/human-resources-command-options.ts`):

```ts
import type { HumanResourcesCommandOptions } from "@afenda/human-resources";
import { createProductionAssignmentContextQuery } from "@afenda/human-resources";
import {
	createDrizzleAssignmentContextQuery,
	createDrizzleHumanResourcesStore,
} from "@afenda/human-resources/adapters/drizzle";
```

| Domain farm | Responsibility |
|-------------|----------------|
| `core` | Employees, employment, contracts, assignments |
| `organization` | Departments, jobs, positions, reporting lines |
| `recruitment` | Requisitions, candidates, interviews, offers |
| `lifecycle` | Onboarding, probation, transfers, terminations, offboarding |
| `leave` | Policies, entitlements, requests |
| `compensation-benefits` | Grades, salary bands, reviews, benefit enrollments |
| `performance` | Cycles, goals, reviews, improvement plans |
| `learning` | Courses, sessions, assignments, certifications |
| `talent` | Profiles, pools, career plans, succession |
| `compliance` | Document requirements, work eligibility, policy acknowledgements |
| `employee-relations` | Employee cases, actions, appeals |
| `time` | Work calendars, shifts, attendance, timesheets, overtime, payroll handoff ports |
| `workforce-planning` | Headcount plans, reservations, availability |

## Worker identity model

The workforce foundation separates the human being from workforce participation
and employee-specific identity:

```text
Person → Worker → Employee specialization
```

- `Person` remains stable before hiring and after employment ends.
- `Worker` records organization-scoped participation and an explicit worker type:
  `employee`, `contractor`, `contingent_worker`, or `intern`.
- `Employee` is an optional specialization of an employee-type worker. Contractors,
  contingent workers, and interns cannot carry an employee identifier.
- Worker status is explicit (`active`, `inactive`, or `former`); ending an
  employment does not delete the person or worker.
- Existing employee-oriented APIs remain available while callers migrate to the
  worker-aware contracts.

**Security:** Commands require an injected `HumanResourcesAuthorizationPort`. Input schemas reject tenant-field injection — the composition root stamps `organizationId`, `actorUserId`, and `correlationId` after validation.

**Tenancy:** Shared Neon schema with organization-scoped rows (`organization_id` NOT NULL on **129** `hr_*` hard-tenant roots of **222** total repo roots; SSOT `packages/data-plane/db/src/hard-tenant-roots.ts`). Not multi-DB isolation — see [docs-V2/tenancy](../../../docs-V2/tenancy/README.md).

## Public surfaces

| Subpath | Role |
|---------|------|
| `@afenda/human-resources` | Domain commands, queries, brands, schemas, permissions, port types, production wiring helpers |
| `@afenda/human-resources/adapters/drizzle` | `createDrizzleHumanResourcesStore`, per-domain Drizzle adapters, assignment-context and work-calendar lookups |
| `@afenda/human-resources/authorization` | Composition-root authorization port types and low-level helpers — not a domain entry; domain code uses `authorizeHumanResourcesOperation` |
| `@afenda/human-resources/brands` | Branded ID types for HR entities |
| `@afenda/human-resources/identity-resolver` | Actor / subject identity resolution port |
| `@afenda/human-resources/resolve-store` | Store resolver for composition roots |
| `@afenda/human-resources/schemas` | Domain-specific strict Zod schemas |
| `@afenda/human-resources/store` | Domain-specific store contracts |
| `@afenda/human-resources/testing` | Memory store factories and test harness ports (Vitest; Neon suites skip when `DATABASE_URL` is absent) |
| `@afenda/human-resources/module-manifest` | Module manifest (`band: R1-F`, `lifecycle: scaffolded`) |

The root barrel does not export raw Drizzle tables, SQL builders, database handles, Next.js types, or HTTP envelopes.

## Maintain

```bash
pnpm --filter @afenda/human-resources lint
pnpm --filter @afenda/human-resources typecheck
pnpm --filter @afenda/human-resources test
pnpm --filter @afenda/human-resources check
```

**Verify loops** (root scripts; see [`testing/README.md`](../../../testing/README.md)):

| Loop | Command | Notes |
|------|---------|-------|
| Inner | `pnpm test:hr:unit` / `pnpm check:hr` | Vitest `human-resources-unit` — parallel; memory only; no Neon |
| Package turbo | `pnpm --filter @afenda/human-resources test` | Unit project only — Neon parity is **not** included |
| Outer | `REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity` | Vitest `human-resources-parity` — serial; includes `*.parity.test.ts`, concurrency, and failure-injection suites |

PowerShell outer loop: `$env:REQUIRE_DATABASE_TESTS = "1"; pnpm test:hr:parity`.

After manifest or register changes:

```bash
pnpm validate:modules
pnpm governance:packages
```

## Boundaries

| Owns | Does not own |
|------|----------------|
| HR domain commands, validation, business rules, and events for `hr_*` tables | Database schema host (`@afenda/db` — `writeOwner` in SCHEMA-OWNERSHIP-MANIFEST) |
| Store adapters (`adapters/drizzle`, `adapters/memory`) | Payroll calculation (`@afenda/payroll`) |
| Zod input/output contracts under `src/schemas/` | UI (`@afenda/ui-system` in `apps/web` only) |
| **Compensation agreement** — `hr_employee_compensation`, `hr_allowance_entitlement`, `hr_bonus_eligibility`, benefit enrollment **contribution terms** on `hr_benefit_enrollment` | Pay-period calculated earnings/deductions/net; `payroll_*`, `journal*`, `payment*` writes |
| Gross-to-net, statutory pay math, payslip generation | — |

**Allowance/deduction four-way ownership (Slice 8.6):** HR entitlement/agreement → payroll calculation → accounting posting → payments disbursement. SSOT: [allowance-deduction-ownership.md](../../../docs-V2/_scratch/erp/allowance-deduction-ownership.md).

**Dependencies:** `@afenda/db`, `@afenda/errors`, `@afenda/events`, `@afenda/master-data`, `@afenda/audit`.

## Authority

| Topic | Link |
|-------|------|
| Bounded-context map (Scratch) | [human-resource.md](../../../docs-V2/_scratch/erp/human-resource.md) |
| Enterprise audit pack (Scratch) | [human-resources-enterprise-audit/](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/) — authority, scorecard, repair roadmap (Phase 0 exit MET) |
| Active mission queue (Scratch) | [44-next-repair-mission.md](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/44-next-repair-mission.md) · program [`00.hrm.md`](../../../docs-V2/_scratch/00.hrm.md) (Slice 1.4 **DONE**; next Phase 1 = Slice 1.5 cleanup) |
| Program roadmap (Scratch) | [00.hrm.md](../../../docs-V2/_scratch/00.hrm.md) |
| Architecture + dual scores (Scratch) | [45-architecture-composition-and-dual-scores.md](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/45-architecture-composition-and-dual-scores.md) |
| Phase sequencing (Scratch) | [human-resources-roadmap.md](../../../docs-V2/_scratch/erp/human-resources-roadmap.md) |
| Time domain spec (Scratch) | [time.md](../../../docs-V2/_scratch/erp/time.md) · [time-slices-roadmap.md](../../../docs-V2/_scratch/erp/time-slices-roadmap.md) |
| Implementation audit (Scratch) | [human-resources-implementation-audit.md](../../../docs-V2/_scratch/erp/human-resources-implementation-audit.md) — **superseded** by enterprise-audit pack; 43-table snapshot only |
| Drizzle adapter audit / migration / validation (Scratch) | [AUDIT](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-audit.md) · [MIGRATION](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-migration.md) · [VALIDATION](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-validation.md) |
| ERP scaffold rules | [SCAFFOLDING.md](../SCAFFOLDING.md) |
| Tenancy | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) |
| Schema ownership | [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
