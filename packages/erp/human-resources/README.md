# `@afenda/human-resources`

**Complete workforce management for enterprise applications.** Handles employees, employment contracts, organizational structure, recruitment workflows, lifecycle events, and compensation agreements with organization-scoped data isolation and enterprise-grade permissions.

This package provides the core commands and queries for all HR operations while maintaining strict boundaries — it owns mutation authority for 43 `hr_*` tables but delegates database schema to `@afenda/db` and payroll calculations to `@afenda/payroll`. All operations return `@afenda/errors` `Result` types for consistent error handling.

**Requirements:** Node 24.x · pnpm ≥10.33.4 (specified in root `package.json` engines).

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

**Key capabilities:**

- **Core workforce:** Employee records, employment contracts, job assignments
- **Organization structure:** Departments, positions, reporting relationships 
- **Recruitment:** Requisitions, candidates, interviews, offers
- **Lifecycle management:** Onboarding, probation, transfers, terminations
- **Compensation:** Salary bands, compensation reviews, benefit enrollments
- **Workforce planning:** Headcount capacity, reservations, planning scopes

All operations follow ERP `create*`/`update*`/`list*` conventions and emit domain events for integration with payroll, notifications, and audit systems.

**Security:** All commands require authorization via injected `HumanResourcesAuthorizationPort` and organization-scoped data access. Commands use strict schemas that prevent tenant field injection — the composition root stamps `organizationId`, `actorUserId`, and `correlationId` after client payload validation.

**Data isolation:** Uses organization-scoped rows with hard `organization_id` tenancy boundaries. All 43 `hr_*` tables enforce organization isolation at the database level. See [tenancy documentation](../../../docs-V2/tenancy/README.md) for full details.

## Public surfaces

| Path | Role |
|------|------|
| `@afenda/human-resources` | Employee / employment / contract / position / assignment commands & queries, brands, schemas, permissions, errors, authz / mutation port types |
| `@afenda/human-resources/adapters/drizzle` | `createDrizzleHumanResourcesStore` + `HumanResourcesStore` type |
| `@afenda/human-resources/testing` | Memory + Drizzle store factories + `HumanResourcesStore` / `MutationPorts` types for Vitest (Neon Drizzle suites skip when `DATABASE_URL` is absent) |
| `@afenda/human-resources/module-manifest` | Module manifest (`band: R1-F`, `lifecycle: scaffolded`) |

The root surface never exports raw Drizzle tables, query builders, database handles, Next.js types, or HTTP envelopes.

## Maintain

Run package checks with Node 24.x and pnpm ≥10.33.4:

```bash
pnpm --filter @afenda/human-resources lint
pnpm --filter @afenda/human-resources typecheck  
pnpm --filter @afenda/human-resources test
pnpm --filter @afenda/human-resources check
```

After module manifest changes:

```bash
pnpm validate:modules
pnpm governance:packages
```

## Boundaries

**This package owns:** HR domain commands, business rules, validation, and events for 43 `hr_*` tables.

**Dependencies:** Database schema (`@afenda/db`), error handling (`@afenda/errors`), master data lookups (`@afenda/master-data`), domain events (`@afenda/events`).

**Anti-goals:** Payroll calculations, financial journal entries, UI components, HTTP handlers. See [monorepo documentation](../../../docs-V2/monorepo/README.md) for package boundaries.

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
