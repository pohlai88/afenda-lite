# `@afenda/human-resources`

Enterprise HR bounded context for Afenda-Lite — workforce records, organization,
recruitment and lifecycle, leave and compensation, performance and learning,
compliance and employee relations, time and attendance, talent, and workforce
planning. Commands and queries return `@afenda/errors` `Result`. Canonical
operation and emission registries decide authorization, audit, transaction,
idempotency, and event behavior. Tables live in `@afenda/db`; this package owns
mutations of `hr_*` only.

## Who it is for

`apps/web` server actions and approved contract/testing consumers — not UI shells,
HTTP handlers, or payroll calculation engines.

## Stability

`Internal` — workspace-only package. Module manifest:
`lifecycle: "scaffolded"`, `activationMode: "organization_toggle"`.
Implemented local behavior and green package tests do not promote the lifecycle
or authorize launch. Open requirements and release evidence live in the
[Human Resources PRD](./docs/PRD.md) and
[development roadmap](./docs/development-roadmap.md).

Contract evidence fixtures:

| Fixture | Role |
| --- | --- |
| [`public-contract.fixture.json`](./__tests__/fixtures/public-contract.fixture.json) | Accepted root contract |
| [`registry-projection.fixture.json`](./__tests__/fixtures/registry-projection.fixture.json) | Canonical operation governance |
| [`consumer-inventory.fixture.json`](./__tests__/fixtures/consumer-inventory.fixture.json) | Consumer graph |
| [`architecture-debt.fixture.json`](./__tests__/fixtures/architecture-debt.fixture.json) | Reporting-only containment baseline (targets remain zero; not an allowlist) |

## Requires

- Node `24.x` | pnpm `>=10.33.4` (root `package.json` engines)
- Workspace consumption (`workspace:*`) for private `@afenda/*` packages

## Consume

```ts
import {
	createHumanResourcesCapabilityOptions,
	createEmployee,
	listEmployees,
	recordAttendanceEvent,
	submitTimesheet,
	type CreateEmployeeInput,
} from "@afenda/human-resources";

const execution = createHumanResourcesCapabilityOptions({
	authorization,
	currency,
	organizationDimensions,
});

const result = await createEmployee(input, execution);
```

Import from `@afenda/human-resources` or the declared `./testing` subpath only.
Never deep-import `@afenda/*/src/...`.

Create the opaque execution context once at the application composition boundary.
Business callers can carry the context but cannot inspect stores, transactions,
adapters, or integration wiring.

| Entrypoint | Role |
| --- | --- |
| `@afenda/human-resources` | Production facade: operations, domain contracts, schemas, events, projections, opaque execution context |
| `@afenda/human-resources/testing` | Test-only memory capabilities — never import from product code |

The root does not export stores, raw ports, resolvers, Drizzle constructors, SQL
builders, database handles, authorization-policy implementations, Next.js types,
or HTTP envelopes.

### Domain features

| Feature | Responsibility |
| --- | --- |
| `workforce-records` | People, workers, employees, employment, contracts, and assignments |
| `organization` | Departments, jobs, positions, and reporting lines |
| `recruitment` | Requisitions, candidates, interviews, and offers |
| `hire-to-employee` | Accepted-offer conversion into canonical workforce records |
| `employment-lifecycle` | Onboarding, probation, transfers, terminations, and offboarding |
| `leave` | Policies, entitlements, requests, and approvals |
| `compensation-benefits` | Grades, salary bands, reviews, and benefit enrollments |
| `performance` | Cycles, goals, reviews, and improvement plans |
| `learning` | Courses, sessions, assignments, and certifications |
| `talent` | Profiles, pools, career plans, and succession |
| `compliance` | Document requirements, work eligibility, and policy acknowledgements |
| `employee-relations` | Employee cases, actions, and appeals |
| `workforce-planning` | Headcount plans, reservations, and availability |
| `time` | Work calendars, shifts, attendance, timesheets, and overtime |
| `payroll-handoff` | Approved immutable payroll inputs, delivery, acknowledgement, and correction state |
| `privacy` | Field projection, evidence, retention, legal-hold, restriction (`restrictEmployeeData` / `liftEmployeeDataRestriction`), and deletion workflows |
| `reporting` | Reconciled HR read-model snapshots and feature-owned sources |
| `bulk-import` | Resumable validated imports and row-level outcomes |
| `bulk-export` | Field-allowlisted exports and privacy evidence |
| `bulk-jobs` | Durable claims, leases, acknowledgements, retries, dead letters, and recovery |

### Worker identity

```text
Person → Worker → Employee specialization
```

- `Person` remains stable before hiring and after employment ends.
- `Worker` is organization-scoped participation with type `employee`,
  `contractor`, `contingent_worker`, or `intern`.
- `Employee` is an optional specialization of an employee-type worker only.
- Worker status is explicit (`active`, `inactive`, or `former`); ending employment
  does not delete the person or worker.

**Security:** Commands require injected `HumanResourcesAuthorizationPort`. Input
schemas reject tenant-field injection — the composition root stamps
`organizationId`, `actorUserId`, and `correlationId` after validation.

**Tenancy:** Shared Neon schema with organization-scoped rows. Hard-tenant-root
names derive from `packages/data-plane/db/src/hard-tenant-roots.ts`. This is not
multi-DB isolation.

### Integration contracts

| Boundary | Contract |
| --- | --- |
| Permission | Composition injects authorization; Actions stamp org/actor/correlation and return `ActionResult`. Callers cannot supply tenant identity. |
| Events and audit | Audit before outbox; commands fail closed when either required fact cannot be recorded. |
| Privacy | Contextual authorization and field projection; bulk export is definition-bound and evidence-recorded. |
| Documents | Canonical `vault://` references only; document bytes stay outside this package. |
| Payroll | Single push/sync-ingest transport (below). HR owns queue, acknowledgement, and correction; Payroll owns `payroll_accepted_handoff` ingest. |

### HR ↔ Payroll transport (single path)

Identical wording on both package READMEs ([bridging B1](../../../docs/erp/hr-payroll-bridging.md)):

```text
HR command (queuePayrollDelivery)
  └─ hr_payroll_handoff_delivery row (status: pending) — one HR transaction
        │
apps/web producer (modules/platform/domain/human-resources-payroll-delivery.ts)
  ├─ 1. ingestApprovedPayrollHandoff(...)  → payroll_accepted_handoff row (idempotent)
  └─ 2. publish platform.human-resources.payroll-delivery.requested.v1
        (fan-out telemetry only — NOT the ingest path)
        │
HR feedback (recordPayrollDeliveryFeedback: acknowledged | rejected | correction_required)
```

| Operation | Role |
| --- | --- |
| `assembleApprovedPayrollHandoff` | Pre-queue dry-run assembly of the sealed handoff payload |
| `queuePayrollDelivery` | Persist pending delivery; corrections pass `supersedesDeliveryId` |
| `recordPayrollDeliveryFeedback` | Acknowledge, reject, or mark correction required |
| `recoverPendingPayrollDeliveries` | Bounded retry for pending deliveries (reliability worker) |

Payroll production composition does not pull from HR at calculation time.
Ingest and event publish share no transaction; safety depends on ingest
idempotency (`deliveryId` + payload hash — bridging C1).

Production HR source does not import `@afenda/payroll` and never calculates
gross-to-net, statutory deductions, net pay, or payslips.

### Product composition

| Journey or worker | Composition entry |
| --- | --- |
| HR administration | [`hr-admin-journeys.ts`](../../../apps/web/app/actions/_runtime/hr-admin-journeys.ts) |
| Employee self-service | [`hr-self-service-journeys.ts`](../../../apps/web/app/actions/hr-self-service-journeys.ts) |
| Manager self-service | [`hr-manager-journeys.ts`](../../../apps/web/app/actions/hr-manager-journeys.ts) |
| Recruitment | [`hr-recruitment.ts`](../../../apps/web/app/actions/hr-recruitment.ts) |
| HR operations | [`hr-operations.ts`](../../../apps/web/app/actions/hr-operations.ts) |
| Compensation | [`hr-compensation.ts`](../../../apps/web/app/actions/hr-compensation.ts) |
| Reporting and bulk import | [`hr-reporting-bulk.ts`](../../../apps/web/app/actions/_runtime/hr-reporting-bulk.ts) · [`human-resources-reporting-bulk-worker.ts`](../../../apps/web/lib/erp/human-resources-reporting-bulk-worker.ts) |
| Bulk export | [`hr-bulk-export.ts`](../../../apps/web/app/actions/_runtime/hr-bulk-export.ts) · [`human-resources-bulk-export-worker.ts`](../../../apps/web/lib/erp/human-resources-bulk-export-worker.ts) · [`human-resources-bulk-export-registry.ts`](../../../apps/web/lib/erp/human-resources-bulk-export-registry.ts) |
| Payroll delivery | [`hr-payroll-delivery.ts`](../../../apps/web/app/actions/hr-payroll-delivery.ts) · [`human-resources-payroll-delivery.ts`](../../../apps/web/modules/platform/domain/human-resources-payroll-delivery.ts) |
| Privacy deletion | [`hr-privacy-deletion.ts`](../../../apps/web/app/actions/hr-privacy-deletion.ts) · [`human-resources-privacy-deletion.ts`](../../../apps/web/lib/erp/human-resources-privacy-deletion.ts) |
| Reliability worker | [`human-resources-reliability-worker.ts`](../../../apps/web/modules/platform/domain/human-resources-reliability-worker.ts) |
| Observability | [`human-resources-observability.ts`](../../../apps/web/modules/platform/observability/human-resources-observability.ts) |

Manifest: [`src/composition/module.manifest.ts`](./src/composition/module.manifest.ts)
(repository-governance input, not a consumer subpath).

## Quickstart

```bash
pnpm --filter @afenda/human-resources check
```

## Maintain

| Command | Purpose |
| --- | --- |
| `pnpm --filter @afenda/human-resources lint` | Lint |
| `pnpm --filter @afenda/human-resources typecheck` | Types |
| `pnpm --filter @afenda/human-resources test` | Unit project (`human-resources-unit`; no Neon) |
| `pnpm --filter @afenda/human-resources check` | Typecheck + unit test |
| `pnpm --filter @afenda/human-resources test -- __tests__/feature-first-layout.test.ts` | Feature-first layout guard |

**Verify loops** (root scripts; see [`testing/README.md`](../../../testing/README.md)):

| Loop | Command | Notes |
| --- | --- | --- |
| Inner | `pnpm test:hr:unit` / `pnpm check:hr` | Parallel; memory only; no Neon |
| Package | `pnpm --filter @afenda/human-resources test` | Unit project only — Neon parity not included |
| Outer | `REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity` | Serial; parity, concurrency, failure-injection |

PowerShell outer loop: `$env:REQUIRE_DATABASE_TESTS = "1"; pnpm test:hr:parity`.

After manifest or register changes:

```bash
pnpm validate:modules
pnpm governance:packages
```

CI uses check-only `pnpm validate:modules`. Local regeneration, when a write path
exists again, is an explicit maintainer action — not the README default.

## Boundaries

| Owns | Does not own |
| --- | --- |
| HR domain commands, validation, business rules, and events for `hr_*` | Database schema host (`@afenda/db`) |
| Feature-owned persistence adapters and Zod contracts | Payroll calculation (`@afenda/payroll`) |
| **Compensation agreement** — `hr_employee_compensation`, `hr_allowance_entitlement`, `hr_bonus_eligibility`, benefit enrollment contribution **terms** | Pay-period calculated earnings/deductions/net; `payroll_*`, `journal*`, `payment*` writes |
| Approved immutable payroll handoff inputs and acknowledged delivery state | Gross-to-net, statutory pay math, payslip generation |
| Privacy projection and bulk export evidence for HR fields | UI shells (`@afenda/ui-system` in `apps/web`), raw `process.env` |

**Four-way ownership:** HR entitlement/agreement → Payroll calculation → Accounting
posting → Payments disbursement. Product boundary:
[Human Resources PRD](./docs/PRD.md).

**Dependencies:** `@afenda/db`, `@afenda/errors`, `@afenda/events`, `@afenda/audit`.
Currency and organization dimensions are injected by the app composition root;
Human Resources does not import master-data persistence or adapters.

## Authority

| Topic | Link |
| --- | --- |
| Product requirements | [docs/PRD.md](./docs/PRD.md) |
| Development roadmap | [docs/development-roadmap.md](./docs/development-roadmap.md) |
| Baseline verification | [docs/baseline-verification.md](./docs/baseline-verification.md) |
| Production readiness | [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) |
| HR ↔ Payroll closure guideline | [hr-payroll-bridging.md](../../../docs/erp/hr-payroll-bridging.md) |
| HR ↔ Payroll decisions register | [hr-payroll-decisions.md](../payroll/docs/hr-payroll-decisions.md) |
| Feature-first ERP method | [feature-first-erp.md](../../../.cursor/skills/afenda-semantic-registry-cutover/references/feature-first-erp.md) |
| Payroll PRD (boundary) | [PAYROLL-PRD-MY-VN.md](../payroll/docs/PAYROLL-PRD-MY-VN.md) |
| Package agent deltas | [AGENTS.md](./AGENTS.md) |
| ERP scaffold rules | [ERP-SCAFFOLDING.md](../ERP-SCAFFOLDING.md) |
| Kernel doctrine | [packages/KERNEL-GOVERNANCE.md](../../KERNEL-GOVERNANCE.md) |
| Agent checkout | [AGENTS.md](../../../AGENTS.md) |

## Support

| Topic | Where |
| --- | --- |
| Owning surface | Human Resources package maintainers |
| Report an issue | Repository issue tracker for `afenda-lite` |

## License

UNLICENSED — private workspace package unless published explicitly.
