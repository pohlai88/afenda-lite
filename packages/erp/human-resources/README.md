# `@afenda/human-resources`

Enterprise HR bounded context for Afenda-Lite — workforce records, organizational structure, recruitment and lifecycle, leave and compensation, performance and learning, compliance and employee relations, time and attendance, talent, and workforce planning. Commands and queries return `@afenda/errors` `Result` types; mutations emit domain events for audit, notifications, and downstream payroll handoff.

**Who it's for:** `apps/web` server actions and sibling packages that need typed HR mutations — not UI shells, HTTP handlers, or payroll calculation engines.

**Requires:** Node 24.x · pnpm ≥10.33.4 (root `package.json` engines).

**Disk inventory (2026-07-28):** **348** commands · **198** queries · **113** permissions · **136** `hr_*` mutation / hard-tenant tables · **136/136** effective-truth classification register · emission registry **348/348**. Manifest `lifecycle: scaffolded`. Phases 0–12 are locally implemented. Phase 13 remediation remains open: the production scheduler/claim/acknowledgement path and permissioned recovery controls are present, while durable scheduled bulk import/export handling, same-revision full-suite/live-parity evidence, external certification, and controlled lifecycle approval remain outstanding — see [current evidence and dual scores](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/47-current-implementation-evidence-and-dual-scores.md) · [`00.hrm.md`](../../../docs-V2/_scratch/00.hrm.md).

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
| `reporting` | Reconciled HR read-model snapshots and Memory/Drizzle sources |
| `bulk` / `bulk-export` | Resumable imports, field-allowlisted exports, and privacy evidence |
| `integrations` | Platform work items, payroll delivery, accounting, and provisioning facts |
| `observability` / `reliability` | Bounded metrics, fair claims, leases, acknowledgements, retries, dead letters, cursor recovery, and server-derived connector health |

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

**Tenancy:** Shared Neon schema with organization-scoped rows (`organization_id` NOT NULL on **136** `hr_*` hard-tenant roots of **245** total repo roots; SSOT `packages/data-plane/db/src/hard-tenant-roots.ts`). The current null audit records **243 audited / 2 unrelated pending-DDL skips**. Not multi-DB isolation — see [docs-V2/tenancy](../../../docs-V2/tenancy/README.md).

## Public surface

| Entrypoint | Role |
|---------|------|
| `@afenda/human-resources` | Permanent production facade: explicit business operations, domain contracts, strict schemas, events, projections, opaque execution context, and semantic production capabilities |
| `@afenda/human-resources/testing` | Isolated test-only memory capabilities; never import from product code |

The root uses explicit exports. It does not export stores, raw ports, command options, resolvers, Drizzle constructors, SQL builders, database handles, authorization-policy implementations, Next.js types, or HTTP envelopes. Production consumers must not import package subpaths.

## Integration contracts

| Boundary | Consumer contract | Enforcement evidence |
|---|---|---|
| Permission | The composition root injects authorization into `HumanResourcesCapabilityOptions`; app Actions stamp organization, actor, and correlation context and return the standard `ActionResult` envelope. Callers cannot supply tenant identity. | `src/public-execution-context.ts` · `src/public-capabilities.ts` · `apps/web/app/actions/hr-action-runner.ts` |
| Events and audit | Mutation definitions classify audit-only versus domain-event behavior. Audit recording is required before outbox append; commands fail closed when either required fact cannot be recorded. | `src/emissions/mutation-outcome.ts` · `src/emissions/registry.ts` |
| Privacy | Sensitive queries use contextual authorization and field projection. Bulk exports use an allowlisted definition-bound permission and record privacy evidence before rows are released. | `src/shared/contextual-authorization.ts` · `src/bulk-export/` · `src/privacy/` |
| Document references | HR stores canonical `vault://` references only; object acceptance and immutable-version requirements are delegated through `DocumentReferencePort`. Document bytes remain outside this package. | `src/compliance/vault-document-reference-adapter.ts` · `src/ports.ts` |
| Payroll | HR publishes approved, immutable handoff facts and owns delivery acknowledgement/correction state. The payroll producer must deduplicate by `deliveryId + payloadHash`. | `src/handoff/` · `src/integrations/payroll-delivery/` |

`@afenda/payroll` is a test-only development dependency for contract verification. Production HR source does not import it and never calculates gross-to-net, statutory deductions, net pay, or payslips.

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
| Operational recovery | [`44-operational-recovery-runbooks.md`](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/44-operational-recovery-runbooks.md) |

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
| Approved, immutable payroll handoff inputs and acknowledged delivery state | Gross-to-net, statutory pay math, payslip generation |

**Allowance/deduction four-way ownership (Slice 8.6):** HR entitlement/agreement → payroll calculation → accounting posting → payments disbursement. SSOT: [allowance-deduction-ownership.md](../../../docs-V2/_scratch/erp/allowance-deduction-ownership.md).

**Dependencies:** `@afenda/db`, `@afenda/errors`, `@afenda/events`, `@afenda/audit`. Cross-domain reference capabilities such as currency and organization dimensions are injected by the application composition root; Human Resources does not import master-data persistence or adapters.

## Authority

| Topic | Link |
|-------|------|
| Bounded-context map (Scratch) | [human-resource.md](../../../docs-V2/_scratch/erp/human-resource.md) |
| Enterprise audit pack (Scratch) | [human-resources-enterprise-audit/](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/) — authority, scorecard, repair roadmap (Phase 0 exit MET) |
| Historical repair queue (Scratch) | [44-next-repair-mission.md](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/44-next-repair-mission.md) — retained as earlier repair evidence; current sequencing is the program roadmap |
| Program roadmap (Scratch) | [00.hrm.md](../../../docs-V2/_scratch/00.hrm.md) |
| Operational recovery (Scratch) | [44-operational-recovery-runbooks.md](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/44-operational-recovery-runbooks.md) — migration, outbox, payroll, attendance, privacy, correction, leakage, rollback |
| Current implementation evidence + dual scores (Scratch) | [47-current-implementation-evidence-and-dual-scores.md](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/47-current-implementation-evidence-and-dual-scores.md) — current gaps and certification gates; no lifecycle promotion |
| Historical architecture + dual scores (Scratch) | [45-architecture-composition-and-dual-scores.md](../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/45-architecture-composition-and-dual-scores.md) |
| Phase sequencing (Scratch) | [human-resources-roadmap.md](../../../docs-V2/_scratch/erp/human-resources-roadmap.md) |
| Time domain spec (Scratch) | [time.md](../../../docs-V2/_scratch/erp/time.md) · [time-slices-roadmap.md](../../../docs-V2/_scratch/erp/time-slices-roadmap.md) |
| Implementation audit (Scratch) | [human-resources-implementation-audit.md](../../../docs-V2/_scratch/erp/human-resources-implementation-audit.md) — **superseded** by enterprise-audit pack; 43-table snapshot only |
| Drizzle adapter audit / migration / validation (Scratch) | [AUDIT](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-audit.md) · [MIGRATION](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-migration.md) · [VALIDATION](../../../docs-V2/_scratch/erp/human-resources-drizzle-adapter-validation.md) |
| ERP scaffold rules | [SCAFFOLDING.md](../SCAFFOLDING.md) |
| Tenancy | [docs-V2/tenancy](../../../docs-V2/tenancy/README.md) |
| Package DAG | [docs-V2/monorepo](../../../docs-V2/monorepo/README.md) |
| Schema ownership | [SCHEMA-OWNERSHIP-MANIFEST.yaml](../../../docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml) |
| Agent checkout posture | [AGENTS.md](../../../AGENTS.md) |
