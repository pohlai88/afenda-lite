# `@afenda/human-resources`

Enterprise HR bounded context for Afenda-Lite — workforce records, organizational structure, recruitment and lifecycle, leave and compensation, performance and learning, compliance and employee relations, time and attendance, talent, and workforce planning. Commands and queries return `@afenda/errors` `Result` types; mutations emit domain events for audit, notifications, and downstream payroll handoff.

**Who it's for:** `apps/web` server actions and sibling packages that need typed HR mutations — not UI shells, HTTP handlers, or payroll calculation engines.

**Requires:** Node 24.x · pnpm ≥10.33.4 (root `package.json` engines).

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

**Security:** Commands require an injected `HumanResourcesAuthorizationPort`. Input schemas reject tenant-field injection — the composition root stamps `organizationId`, `actorUserId`, and `correlationId` after validation.

**Tenancy:** Shared Neon schema with organization-scoped rows (`organization_id` NOT NULL on **104** `hr_*` hard-tenant roots; SSOT `packages/data-plane/db/src/hard-tenant-roots.ts`). Not multi-DB isolation — see [docs-V2/tenancy](../../../docs-V2/tenancy/README.md).

## Public surfaces

| Subpath | Role |
|---------|------|
| `@afenda/human-resources` | Domain commands, queries, brands, schemas, permissions, port types, production wiring helpers |
| `@afenda/human-resources/adapters/drizzle` | `createDrizzleHumanResourcesStore`, per-domain Drizzle adapters, assignment-context and work-calendar lookups |
| `@afenda/human-resources/authorization` | Authorization port types and helpers |
| `@afenda/human-resources/brands` | Branded ID types for HR entities |
| `@afenda/human-resources/identity-resolver` | Actor / subject identity resolution port |
| `@afenda/human-resources/resolve-store` | Store resolver for composition roots |
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

**Dependencies:** `@afenda/db`, `@afenda/errors`, `@afenda/events`, `@afenda/master-data`, `@afenda/audit`.

## Authority

| Topic | Link |
|-------|------|
| Bounded-context map (Scratch) | [human-resource.md](../../../docs-V2/_scratch/erp/human-resource.md) |
| Phase sequencing (Scratch) | [human-resources-roadmap.md](../../../docs-V2/_scratch/erp/human-resources-roadmap.md) |
| Time domain spec (Scratch) | [time.md](../../../docs-V2/_scratch/erp/time.md) · [time-slices-roadmap.md](../../../docs-V2/_scratch/erp/time-slices-roadmap.md) |
| Implementation audit (Scratch) | [human-resources-implementation-audit.md](../../../docs-V2/_scratch/erp/human-resources-implementation-audit.md) |
| Drizzle adapter audit / migration / validation (Scratch) | [AUDIT](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-audit.md) · [MIGRATION](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-migration.md) · [VALIDATION](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-validation.md) |
| ERP scaffold rules | [SCAFFOLDING.md](../SCAFFOLDING.md) |
| Tenancy | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) |
| Schema ownership | [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
