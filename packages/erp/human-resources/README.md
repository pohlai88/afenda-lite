# `@afenda/human-resources`

Enterprise HR bounded context for Afenda-Lite — workforce records, organizational structure, recruitment and lifecycle, leave and compensation, performance and learning, compliance and employee relations, time and attendance, talent, and workforce planning. Commands and queries return `@afenda/errors` `Result` types; the canonical operation and emission registries decide authorization, audit, transaction, idempotency, and event behavior.

**Who it's for:** `apps/web` server actions and approved contract/testing consumers — not UI shells, HTTP handlers, or payroll calculation engines.

**Requires:** Node 24.x · pnpm ≥10.33.4 (root `package.json` engines).

## Current status

### Implemented package behavior

The reviewed [public-contract](__tests__/fixtures/public-contract.fixture.json), [registry-projection](__tests__/fixtures/registry-projection.fixture.json), and [consumer-inventory](__tests__/fixtures/consumer-inventory.fixture.json) fixtures enumerate the accepted root contract, canonical operation governance, and consumer graph. The package exposes one production root and one isolated `./testing` entrypoint. The module manifest remains `lifecycle: "scaffolded"`.

The package implements broad local behavior for workforce records, organization, planning, recruitment, hire conversion, employment lifecycle, leave, time, compensation, performance, learning, talent, compliance, employee relations, privacy, reporting, bulk processing, reliability, and approved Payroll handoff. The [Human Resources PRD](../../../docs/_scratch/human-resources/human-resources-prd.md) is the Scratch classification of implemented behavior versus open requirements; names or locally green tests do not establish product completeness.

### Open product and architecture work

- HR-to-Payroll still requires dedicated recurring allowance and bonus agreement facts, complete per-source lineage, and a Payroll-owned historical-version ingress ledger.
- Candidate-facing recruitment, governed calendar scheduling, production attendance channels, complete persona journeys, and several reporting/operational workflows remain open requirements.
- The reporting-only [architecture baseline](__tests__/fixtures/architecture-debt.fixture.json) records nonzero depth, upward-import, composite-store, cross-feature, cycle, testing-leakage, and retired-path debt. Every target remains zero; the baseline is not an allowlist.
- Semantic containment must reach zero upward imports, zero feature composite-store dependencies, and zero cycles before the final shallow structural cutover.

### Release evidence not yet achieved

Same-revision live Drizzle parity, transactional rollback and tenant-hostility evidence, durable recovery drills, approved scale/SLO results, migration rehearsal, accessibility evidence, jurisdiction-specific legal/privacy/security review, and independent release approval remain outstanding. Malaysia and Vietnam are the selected first-launch jurisdictions, but the launch entities, worker cohorts, localization obligations, attendance/privacy constraints, and named sign-off owners remain open. Package-local verification cannot promote the lifecycle or authorize launch.

## Consume

Workspace import from the root barrel:

```ts
import {
	createHumanResourcesCapabilityOptions,
	createEmployee,
	listEmployees,
	recordAttendanceEvent,
	submitTimesheet,
	type CreateEmployeeInput,
} from "@afenda/human-resources";
```

Create the opaque execution context once at the application composition boundary. Business callers can carry the context but cannot inspect stores, transactions, adapters, or integration wiring:

```ts
const execution = createHumanResourcesCapabilityOptions({
	authorization,
	currency,
	organizationDimensions,
});

const result = await createEmployee(input, execution);
```

| Feature capsule | Responsibility |
|-----------------|----------------|
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
| `privacy` | Field projection, evidence, retention, and deletion workflows |
| `reporting` | Reconciled HR read-model snapshots and feature-owned sources |
| `bulk-import` | Resumable validated imports and row-level outcomes |
| `bulk-export` | Field-allowlisted exports and privacy evidence |
| `bulk-jobs` | Durable claims, leases, acknowledgements, retries, dead letters, and recovery |

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

**Tenancy:** Shared Neon schema with organization-scoped rows. HR hard-tenant-root names, table objects, and audit SQL derive from `packages/data-plane/db/src/hard-tenant-roots.ts`; the README does not duplicate that volatile inventory. This is not multi-DB isolation.
## Public surface

| Entrypoint | Role |
|---------|------|
| `@afenda/human-resources` | Permanent production facade: explicit business operations, domain contracts, strict schemas, events, projections, opaque execution context, and semantic production capabilities |
| `@afenda/human-resources/testing` | Isolated test-only memory capabilities; never import from product code |

The root uses explicit exports. It does not export stores, raw ports, command options, resolvers, Drizzle constructors, SQL builders, database handles, authorization-policy implementations, Next.js types, or HTTP envelopes. Production consumers must not import package subpaths.

## Internal architecture

The package root is the only production consumer entrypoint. Internal representation changes stay behind the facade; package-wide semantic registries live in the kernel; capability vocabulary belongs with the feature that owns its meaning. The top-level layer-first roots have been removed, but semantic containment and the final shallow cutover remain incomplete.

```text
src/
├── index.ts                         # explicit package-root exports only
├── facade/                          # permanent consumer capability surface
│   ├── capabilities.ts
│   ├── context.ts                   # opaque execution context
│   ├── contracts.ts
│   └── production-capabilities.ts
├── kernel/                          # package-wide canonical semantics
│   ├── authorization/               # authorization registry and shared policy mechanics
│   ├── emissions/                   # canonical mutation-emission projections
│   ├── events/                      # event catalog and validation
│   ├── execution/                   # cross-feature execution primitives and ports
│   ├── identity/                    # branded identifiers and normalization
│   ├── observability/               # operation-level observability semantics
│   ├── operations/                  # operation registry and governance projections
│   ├── privacy/                     # shared field-projection primitives
│   ├── reliability/                 # retry, lease, and recovery semantics
│   ├── temporal/                    # effective-dated truth primitives
│   └── validation/                  # cross-feature validation primitives
├── features/                        # business ownership; no layer-first roots
│   ├── workforce-records/           # person, worker, employee, employment, contracts
│   ├── organization/
│   ├── recruitment/
│   ├── hire-to-employee/
│   ├── employment-lifecycle/
│   ├── leave/
│   ├── compensation-benefits/
│   ├── performance/
│   ├── learning/
│   ├── talent/
│   ├── compliance/
│   ├── employee-relations/
│   ├── workforce-planning/
│   ├── time/
│   ├── payroll-handoff/
│   ├── privacy/
│   ├── reporting/
│   ├── bulk-import/
│   ├── bulk-export/
│   └── bulk-jobs/
├── composition/                     # aggregate stores, production wiring, integrations
└── testing/                         # isolated test capabilities and verification harnesses
```

The package has no root `shared/`, `schemas/`, `store/`, or `adapters/` layer, and
The `feature-first layout` unit test and the ERP generator doctor reject restoration of those superseded roots.
That guard proves only the top-level layout. The architecture-debt report separately
tracks deep paths, upward imports, composite-store dependencies, cross-feature
edges, cycles, testing leakage, deep consumer imports, and retired filesystem paths.
Until those counts reach zero, the current tree is transitional rather than the
final feature-first structure.

### Feature ownership during containment

Phase 1 keeps files at their current paths while each business term is assigned one
feature owner, projections derive from that owner, handlers receive narrow store or
port capabilities, and composition alone constructs the aggregate. The final Phase
2 cutover then moves production files once into `src/<file>` or
`src/<approved-surface-or-feature>/<file>` and rejects any third directory level.
Memory and Drizzle implementations remain paired through descriptive filenames;
no empty capsule placeholders or generic layer farms are introduced. See the
[development roadmap](../../../docs/_scratch/human-resources/development-roadmap.md)
and reusable [feature-first ERP semantic method](../../../.cursor/skills/afenda-semantic-registry-cutover/references/feature-first-erp.md).

## Integration contracts

| Boundary | Consumer contract | Enforcement evidence |
|---|---|---|
| Permission | The composition root injects authorization into `HumanResourcesCapabilityOptions`; app Actions stamp organization, actor, and correlation context and return the standard `ActionResult` envelope. Callers cannot supply tenant identity. | `src/facade/context.ts` · `src/facade/capabilities.ts` · `apps/web/app/actions/hr-action-runner.ts` |
| Events and audit | Mutation definitions classify audit-only versus domain-event behavior. Audit recording is required before outbox append; commands fail closed when either required fact cannot be recorded. | `src/kernel/emissions/mutation-outcome.ts` · `src/kernel/emissions/registry.ts` |
| Privacy | Sensitive queries use contextual authorization and field projection. Bulk exports use an allowlisted definition-bound permission and record privacy evidence before rows are released. | `src/kernel/authorization/contextual-authorization.ts` · `src/features/bulk-export/` · `src/features/privacy/` |
| Document references | HR stores canonical `vault://` references only; object acceptance and immutable-version requirements are delegated through `DocumentReferencePort`. Document bytes remain outside this package. | `src/features/compliance/vault-document-reference-adapter.ts` · `src/kernel/execution/ports.ts` |
| Payroll | HR publishes approved, immutable handoff facts and owns delivery acknowledgement/correction state. The payroll producer must deduplicate by `deliveryId + payloadHash`. | `src/features/payroll-handoff/` · `src/features/payroll-handoff/delivery/` |

Production HR source does not import `@afenda/payroll` and never calculates gross-to-net, statutory deductions, net pay, or payslips. Payroll contract tests consume HR's public handoff shape without creating a peer ERP runtime dependency.

## Product composition

| Journey or worker | Composition entry |
|---|---|
| HR administration | [`hr-admin-journeys.ts`](../../../apps/web/app/actions/hr-admin-journeys.ts) |
| Employee self-service | [`hr-self-service-journeys.ts`](../../../apps/web/app/actions/hr-self-service-journeys.ts) |
| Manager self-service | [`hr-manager-journeys.ts`](../../../apps/web/app/actions/hr-manager-journeys.ts) |
| Recruitment | [`hr-recruitment.ts`](../../../apps/web/app/actions/hr-recruitment.ts) |
| HR operations | [`hr-operations.ts`](../../../apps/web/app/actions/hr-operations.ts) |
| Compensation | [`hr-compensation.ts`](../../../apps/web/app/actions/hr-compensation.ts) |
| Reporting and bulk import | [`hr-reporting-bulk.ts`](../../../apps/web/app/actions/hr-reporting-bulk.ts) · [`human-resources-reporting-bulk-worker.ts`](../../../apps/web/lib/erp/human-resources-reporting-bulk-worker.ts) |
| Bulk export | [`hr-bulk-export.ts`](../../../apps/web/app/actions/hr-bulk-export.ts) · [`human-resources-bulk-export-worker.ts`](../../../apps/web/lib/erp/human-resources-bulk-export-worker.ts) · [`human-resources-bulk-export-registry.ts`](../../../apps/web/lib/erp/human-resources-bulk-export-registry.ts) |
| Payroll delivery | [`hr-payroll-delivery.ts`](../../../apps/web/app/actions/hr-payroll-delivery.ts) · [`human-resources-payroll-delivery.ts`](../../../apps/web/modules/platform/domain/human-resources-payroll-delivery.ts) |
| Privacy deletion | [`hr-privacy-deletion.ts`](../../../apps/web/app/actions/hr-privacy-deletion.ts) · [`human-resources-privacy-deletion.ts`](../../../apps/web/lib/erp/human-resources-privacy-deletion.ts) |
| Reliability worker | [`human-resources-reliability-worker.ts`](../../../apps/web/modules/platform/domain/human-resources-reliability-worker.ts) |
| Observability | [`human-resources-observability.ts`](../../../apps/web/modules/platform/observability/human-resources-observability.ts) |

## Maintain

```bash
pnpm --filter @afenda/human-resources test -- __tests__/feature-first-layout.test.ts
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
| Feature-owned persistence adapters under `src/features/*/adapters/` | Payroll calculation (`@afenda/payroll`) |
| Feature-owned Zod contracts under `src/features/*/schema.ts` and `src/features/*/schemas/` | UI (`@afenda/ui-system` in `apps/web` only) |
| **Compensation agreement** — `hr_employee_compensation`, `hr_allowance_entitlement`, `hr_bonus_eligibility`, benefit enrollment **contribution terms** on `hr_benefit_enrollment` | Pay-period calculated earnings/deductions/net; `payroll_*`, `journal*`, `payment*` writes |
| Approved, immutable payroll handoff inputs and acknowledged delivery state | Gross-to-net, statutory pay math, payslip generation |

**Allowance/deduction four-way ownership:** HR entitlement/agreement → Payroll calculation → Accounting posting → Payments disbursement. The product boundary and non-duplication rules are defined in the [Human Resources PRD](../../../docs/_scratch/human-resources/human-resources-prd.md).

**Dependencies:** `@afenda/db`, `@afenda/errors`, `@afenda/events`, `@afenda/audit`. Cross-domain reference capabilities such as currency and organization dimensions are injected by the application composition root; Human Resources does not import master-data persistence or adapters.

## Authority

| Topic | Link |
|-------|------|
| Feature-first ERP semantic method | [feature-first-erp.md](../../../.cursor/skills/afenda-semantic-registry-cutover/references/feature-first-erp.md) |
| Product requirements and bounded-context map (Scratch) | [human-resources-prd.md](../../../docs/_scratch/human-resources/human-resources-prd.md) |
| Development roadmap and delivery gates (Scratch) | [development-roadmap.md](../../../docs/_scratch/human-resources/development-roadmap.md) |
| Payroll product requirements (Scratch) | [PAYROLL-PRD-MY-VN.md](../../../docs/_scratch/payroll/PAYROLL-PRD-MY-VN.md) |
| Public contract evidence | [`public-contract.fixture.json`](__tests__/fixtures/public-contract.fixture.json) · [`consumer-inventory.fixture.json`](__tests__/fixtures/consumer-inventory.fixture.json) |
| Registry and architecture evidence | [`registry-projection.fixture.json`](__tests__/fixtures/registry-projection.fixture.json) · [`architecture-debt.fixture.json`](__tests__/fixtures/architecture-debt.fixture.json) |
| Module lifecycle | [`module.manifest.ts`](src/composition/module.manifest.ts) |
| ERP scaffold rules | [ERP-SCAFFOLDING.md](../ERP-SCAFFOLDING.md) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
