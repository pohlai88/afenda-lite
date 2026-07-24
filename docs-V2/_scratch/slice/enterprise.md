# Human Resources enterprise-readiness audit and implementation strategy

| Field | Value |
|---|---|
| Scope | `@afenda/human-resources`, HR-owned `hr_*` schema, `apps/web` composition |
| Audit date | 2026-07-24 |
| Evidence basis | Current working tree plus live checks listed below |
| Authority | `AGENTS.md`, Afenda farm companions, `docs-V2/**`, disk |
| Execution index | [final.md](./final.md) remains the sole wave/mission status index |
| Status | Audit complete; Phase 5 shared-platform boundaries implemented and scoped evidence green; package-wide verification remains separate |

This file evaluates the enterprise-readiness proposal against the current
codebase. It is not a second mission tracker. Apply accepted phase/status
changes to [final.md](./final.md) after the current working-tree slice is
stabilized and verified.

## Executive verdict

`@afenda/human-resources` is a broad, strongly typed HR domain kernel, but it is
not yet an enterprise HR product.

The package currently has:

- 106 HR mutation tables in the hard-tenant registry;
- 284 command IDs, 138 query IDs, and 98 permission codes;
- Zod schemas, branded IDs, audit/outbox ports, memory and Drizzle adapters;
- resource-aware authorization in selected sensitive flows;
- 35 Time Server Actions and 15 Learning Server Actions;
- a newly implemented person/worker foundation and historical org-context path;
- 397 passing unit tests in the current unit project, with 2 skipped.

The production claim remains blocked by three things:

1. the canonical historical org-context query does not yet resolve real legal
   entity and cost-centre dimensions;
2. shared privacy, workflow, document, integration, reporting, and operations
   capabilities are absent or only represented by narrow ports/helpers;
3. product surfaces are mostly Action contracts, not employee, manager, HR
   administrator, or candidate experiences.

Keep `lifecycle: scaffolded`. A lifecycle label is not an enterprise-readiness
claim, and Living MOD-009/MOD-010 evidence is unavailable while the Docs lane is
dormant.

## Corrections to the previous assessment

| Prior statement | Current disk truth | Classification |
|---|---|---|
| 177 total hard-tenant roots | Registry is **179 total**, including **106 `hr_*`** | Corrected |
| 177 audited, 0 skipped | Current configured DB audit is **179 audited, 0 skipped** after `0008`; dated `0006`/`0007` evidence remains 176/177 | Corrected and verified |
| Person/worker abstraction is missing | Person/worker DDL, contracts, commands, memory/Drizzle adapters, and tests are present and production-backed | Implemented and verified |
| Canonical `asOf` org context is missing | `resolveEmployeeOrgContextAsOf` and assignment `asOf` queries exist | Partial |
| Structural duplicate facades remain | Root `work-calendar.ts`, `store.ts`, `schemas.ts`, and root vault adapter are removed in the working tree; canonical domain paths remain | Implemented, gate green |
| No app entry points | Time and Learning Actions exist | Partial; no HR product UI |
| Authorization is only broad command permission | Resource-aware authorization exists for compensation and sensitive leave; employee-relations has separate case access control; compliance masks document identifiers | Partial, not package-wide |

## Evidence baseline

| Area | Evidence | Result |
|---|---|---|
| Tenancy registry | `HARD_TENANT_ROOT_TABLE_NAMES`; tenancy test | 179 total / 106 HR |
| HR persistence surface | `HUMAN_RESOURCES_MUTATION_TABLES` | 106 tables |
| Public contract | `module-ids.ts`, `permissions.ts` | 284 commands / 138 queries / 98 permissions |
| Lifecycle | `src/module.manifest.ts` | `scaffolded` |
| Package boundary | `package.json#exports` | Root plus 9 declared subpaths |
| Product adapters | `apps/web/app/actions/hr-time.ts`, `hr-learning.ts` | 50 Actions; no HR feature/route surface |
| Worker foundation | schema, migration `0008`, memory/Drizzle adapters, commands, parity test | Production-backed; ledger 9/9; foundation parity 2/2 |
| Tenancy live state | `pnpm audit:tenancy-nulls` | **PASS**: 179 audited, 0 skipped |
| Historical org context | `src/core/org-context.ts` | Present but dimension semantics incomplete |
| Structure cleanup | `Test-Path` on duplicate roots | Canonical folders/files only in working tree |
| Package gate | `pnpm check:hr` | **PASS**: lint checked 330 files; typecheck passed; 38 unit files / 397 tests passed, 2 skipped |
| Neon parity | `REQUIRE_DATABASE_TESTS=1 pnpm test:hr:parity` with `DATABASE_URL` loaded from `.env.local` | **PASS**: 25 files / 178 tests passed, 1 skipped |
| Module validation | `pnpm validate:modules` | **PASS**: 12 manifests; 7 generated registers matched; 21 negative fixtures proven |
| Package governance | `pnpm governance:packages` | **PASS** |
| Editor posture | `pnpm check:editor-biome` | **PASS** |

The worktree was already materially dirty before this audit. All implementation
observations refer to that current working tree; none of those user-owned code
changes were altered by this audit.

## Gap matrix

| ID | Requirement | Implemented | Verified | Finding | Severity | Required action |
|---|---|---:|---:|---|---|---|
| HR-ENT-01 | Tenancy inventory is accurate | Yes | Yes | Registry and configured DB agree: 179 roots / 106 HR; 0 skipped | Pass | Retain audit in migration exit gates |
| HR-ENT-02 | Lifecycle remains honest | Yes | Yes | Manifest remains `scaffolded` | Pass | Keep until formal gate |
| HR-ENT-03 | Person/worker foundation | Yes | Yes | `0008` applied; tables, constraints, stores, adapters, DB tests, and foundation parity pass | Pass | Preserve production-backed parity |
| HR-ENT-04 | Deterministic historical org context | Partial | Unit scenario | `costCentreKey` is always `null`; `legalEntityKey` is sourced from calendar jurisdiction | Major | Add governed dimension contracts and parity |
| HR-ENT-05 | Package-wide effective truth | Yes | Focused shared/domain evidence | Machine-enforced adoption matrix classifies every inventoried mutable definition/assignment; shared selectors fail closed on malformed range and lineage histories | Pass | Retain the matrix/evidence gate as aggregates evolve |
| HR-ENT-06 | Contextual and field authorization | Partial | Selected tests | Resource-aware checks are concentrated in compensation/leave; no unified sensitive-field policy | Major | Generalize authorization and projections |
| HR-ENT-07 | Privacy, retention, legal hold | Partial | Narrow tests | Identifier hashing/masking and case redaction exist; no retention/DSAR/hold lifecycle | Major | Define platform boundary and HR metadata |
| HR-ENT-08 | Shared workflow/tasks/approvals | No shared owner | No | Domain workflows exist, but no reusable orchestration/task capability | Major | Architecture gate, then platform integration |
| HR-ENT-09 | Document/e-signature capability | Port only | No | Vault reference validation is not storage, scanning, ACL, retention, or signing | Major | Platform document boundary |
| HR-ENT-10 | Integration and bulk data | No | No | No HR bulk import/export, webhook, cursor, reconciliation, or connector framework | Major | Build platform integration contracts |
| HR-ENT-11 | Reporting/read projections | Partial queries only | No | Transactional queries are not a reporting/analytics model | Major | Add permission-aware projections |
| HR-ENT-12 | HR product surfaces | Actions only | Action tests only | No ESS/MSS/HR-admin/candidate feature routes | Major | Build RSC/Action product slices |
| HR-ENT-13 | HR operational readiness | Partial | No complete evidence | Audit/outbox exist; HR-specific metrics, queues, SLOs, load/recovery evidence are absent | Major | Add ops instrumentation and runbooks |
| HR-ENT-14 | Production attendance ingestion | Fail-closed | No live connector evidence | Safe default, but not a production connector | Major | Connector or explicit API/manual scope |
| HR-ENT-15 | Structural ownership is singular | Yes | Package gate green | Duplicate roots are removed and canonical domain paths pass lint/typecheck/unit | Pass | Preserve canonical paths |
| HR-ENT-16 | Domain depth | Mixed | Mixed | Time is strongest; other domains have broad but uneven depth | Major | Execute prioritized domain completion |
| HR-ENT-17 | Module Enterprise Readiness evidence | No Living pack | N/A | MOD evidence/claim work is blocked while Docs lane is dormant | Observation | Do not claim module readiness |
| HR-ENT-18 | Package quality gates | Yes | Yes | `check:hr` and database-enforced parity pass on the stabilized working tree | Pass | Keep gates green per mission |
| HR-ENT-19 | Monorepo/module governance | Yes | Yes | Module validation and package governance pass; seven generated registers match | Pass | Regenerate registers from manifests when contracts change |

## Best implementation strategy

Use vertical, evidence-closing missions. Do not add another broad set of HR
tables before the current foundation is green.

Each mission should follow the existing package pattern:

```text
schema + reviewed migration
  → branded IDs + strict Zod schema
  → store contract
  → memory adapter
  → Drizzle adapter
  → command/query returning Result<T>
  → permission + manifest authorization map
  → audit/outbox mutation ports
  → memory/Drizzle parity + cross-tenant/failure tests
  → apps/web composition port
  → Server Action returning ActionResult<T>
  → RSC/product surface when user-facing
```

Cross-cutting services stay outside the HR package. HR owns HR state
transitions, policy snapshots, evidence references, and stable events. Generic
workflow, document storage, e-signature, identity provisioning, notification
delivery, search, and analytics orchestration require platform owners.

Creating a new workspace package or a new cross-package dependency requires the
existing ARCH-024 process, `WORKSPACE-EDGE-REGISTER.yaml`, `workspace:*`, and a
passing `pnpm validate:modules`. If the owner requires a new architecture
decision, reopen the Docs lane instead of inventing a package from Scratch
authority.

## Ordered implementation plan

### Phase 0 — Stabilize the current slice

**Mission:** `HR-ENT-00-STABILIZE`

**Status:** Complete — exact evidence is recorded in
[final.md](./final.md#slice-closeout--hr-ent-00-stabilize).

1. Resolve the 9 current Biome import/export ordering failures without changing
   behavior.
2. Re-run `pnpm check:hr`.
3. Run `pnpm test:hr:parity` to completion with `DATABASE_URL`.
4. Run `pnpm validate:modules` and `pnpm governance:packages` to completion.
5. Record exact results in [final.md](./final.md); do not close a phase from
   file presence alone.

**Exit:** lint, typecheck, unit, parity, and module governance are green on one
revision.

### Phase 1 — Apply and prove the workforce foundation

**Mission:** `HR-ENT-01-WORKFORCE-CLOSE`

**Status:** Complete — exact operator evidence is recorded in
[final.md](./final.md#slice-closeout--hr-ent-01-workforce-close).

**Wave 1A reconciliation (2026-07-24):** Phases 1–3 and 5 are complete.
Phases 4 and 6 are partial: real legal-entity/cost-centre semantics and a
distinct restructure replay remain assigned to `HR-ENT-02-ORG-CONTEXT`.
This does not weaken the Phase 1 exit: migration `0008` is applied through the
guarded path, the ledger is 9/9 with 0 pending, tenancy is 179 audited / 0
skipped, DB package tests are 20 files / 80 tests, and database-enforced
workforce parity is 1 file / 2 tests.

1. Confirm the approved Neon branch and explicitly authorize the migration
   operation.
2. Apply `0008_hr_workforce_foundation.sql`.
3. Run `pnpm audit:tenancy-nulls`; require **179 audited, 0 skipped**.
4. Run the DB migration contract test and workforce foundation parity tests.
5. Reconcile [final.md](./final.md) Phase 1–6 statuses against the verified
   revision.

**Exit:** person/worker DDL exists in the configured database, not only in
source and journal files.

### Phase 2 — Close historical organization semantics

**Mission:** `HR-ENT-02-ORG-CONTEXT`

1. Decide the authoritative owner for legal entity, business unit, location,
   cost centre, and project dimensions. Current `@afenda/master-data` does not
   expose all of these as governed masters.
2. Define typed, tenant-safe directory ports in HR. Wire adapters at
   `apps/web`; do not let HR query peer tables directly.
3. Persist effective-dated assignment references/snapshots sufficient to
   reproduce past decisions.
4. Remove the semantic shortcut that maps calendar `jurisdiction` to
   `legalEntityKey`; resolve a real legal-entity key.
5. Resolve `costCentreKey` from governed assignment context instead of returning
   a constant `null`.
6. Add ambiguity, gap, overlap, cross-tenant, transfer, restructure, and
   historical replay tests in memory and Drizzle.

**Exit:** `resolveEmployeeOrgContextAsOf` returns one deterministic historical
answer or a typed fail-closed error for every required dimension.

### Phase 3 — Standardize effective truth

**Mission:** `HR-ENT-03-EFFECTIVE-TRUTH`

1. Build an adoption matrix for every mutable definition/assignment.
2. Reuse `effective-range.ts` and `effective-lineage.ts`; do not create
   domain-specific selection algorithms.
3. Close domains in this order: core/organization, leave, compensation,
   compliance, talent/workforce planning, then remaining mutable definitions.
4. For each aggregate, add effective range, successor/predecessor identity,
   reason/source, optimistic concurrency, overlap/branch rejection, and `asOf`
   queries where applicable.
5. Require memory/Drizzle parity and historical dispute scenarios per domain.

**Exit:** the adoption matrix has no unclassified mutable aggregate and every
in-scope row has passing evidence.

**Implementation status:** Phase 3 code and its focused 24-test gate are
complete. Package-wide and database-parity closure remains blocked by the
separately owned Phase 2 organization-dimension migration and concurrent Phase
4 authorization work; see [final.md](./final.md#phase-3-verification-status).

**Implementation evidence (2026-07-24):**

- `src/effective-truth-adoption.ts` is the machine-enforced adoption matrix for
  workforce foundation, core/organization, leave, compensation, compliance,
  talent/workforce planning, Time, learning, and performance
  definitions/assignments.
- Every temporal row declares its range or effective-point fields, lineage
  identity where applicable, provenance, optimistic concurrency, fail-closed
  rejection semantics, resolution mode, and concrete unit/parity evidence.
- `resolveUniqueEffectiveRangeRecord` and
  `resolveEffectiveLineageRecord` expose typed malformed-history reasons while
  compatibility selectors continue to fail closed as `null`.
- Core employment/assignment and organization reporting-line `asOf` reads use
  the shared range resolver. Leave policy history uses the shared lineage
  resolver across published and superseded rows.
- `effective-truth-adoption.test.ts`, `effective-range.test.ts`,
  `effective-lineage.test.ts`, and `leave-policy-lineage.test.ts` are the
  focused classification and historical-dispute gate. The sole execution index
  and package-wide gate status remain in [final.md](./final.md).

### Phase 4 — Contextual authorization and privacy

**Mission:** `HR-ENT-04-AUTH-PRIVACY`

1. Generalize the resource-aware authorization pattern beyond compensation and
   sensitive leave.
2. Define subject, manager, matrix manager, HRBP, recruiter, compensation,
   benefits, investigator, legal/compliance, executive planner, and integration
   scopes.
3. Extend field projections for identifiers, medical data, compensation,
   employee-relations evidence, background checks, and succession data.
4. Add self-approval prevention, delegated authority dates, separation of
   duties, break-glass reason/audit, and terminated-actor revocation.
5. Define HR retention classifications and ports for subject export,
   rectification, anonymization, legal hold, and downstream redaction.
6. Add tenant-safe composite FK coverage and systematic foreign-reference
   isolation tests.

**Exit:** every sensitive command/query has an explicit subject/field policy and
cross-tenant denial evidence.

### Phase 5 — Shared platform boundaries

**Mission group:** `HR-ENT-05-PLATFORM-*`

Run one architecture and implementation mission per capability:

| Order | Capability | Reuse/owner strategy | HR integration |
|---|---|---|---|
| 5.1 | Workflow/tasks | Architecture gate for platform owner | Transition + policy snapshot + outcome events |
| 5.2 | Documents/e-signature | Platform document service | Governed immutable references only |
| 5.3 | Notifications | Extend `@afenda/notifications` + app handlers | Notification intent from HR events |
| 5.4 | Identity provisioning | Identity/IAM adapter in `apps/web` | Joiner/mover/leaver facts |
| 5.5 | Bulk/integrations | Platform integration boundary | Dry-run, row results, idempotency, reconciliation |
| 5.6 | Reporting/search | `@afenda/events`, `@afenda/search`, analytical projections | Permission-aware stable HR facts |

**Exit:** no generic platform infrastructure is duplicated inside
`@afenda/human-resources`; each integration has retry, replay, failure, and
tenant-isolation evidence.
#### Phase 5 implementation record — 2026-07-24

The architecture gate assigns cross-domain delivery and recovery to
`@afenda/events`, notification persistence to `@afenda/notifications`, search
persistence to `@afenda/search`, and application composition to
`apps/web/modules/platform`. HR retains only HR aggregate state, policy
snapshots, immutable evidence references, and deterministic projections.

| Mission | Implemented boundary | Recovery and tenant evidence |
|---|---|---|
| 5.1 Workflow/tasks | Onboarding/offboarding transitions project policy snapshots and outcomes into deduplicated platform outbox facts | Source failures remain failed outbox rows; retry/replay is org-scoped and derived facts use `source-event:{id}` deduplication |
| 5.2 Documents/e-signature | HR commands require canonical `vault://organizations/{org}/{kind}/{id}?version=...` references and never store binary or signature lifecycle state | Cross-org, malformed, disallowed-kind, and mutable references fail closed; injected platform object-policy failures propagate |
| 5.3 Notifications | HR event intents are recorded by `@afenda/notifications`; migration `0010` adds org/user/module-scoped deduplication | Replayed handlers return the existing notification; recorder failure leaves source delivery retryable |
| 5.4 Identity provisioning | Joiner/mover/leaver facts are emitted by the app-owned adapter as deduplicated identity events | Causation, correlation, org, fact version, and source event are preserved; publisher tenant mismatch fails closed |
| 5.5 Bulk/integrations | Attendance import dry-run returns row-level acceptance/rejection, deterministic reconciliation key, and performs no fetch or write; the Server Action stamps org/actor/correlation from session | Import idempotency remains package-owned; dry-run duplicates and invalid timezones are explicit row failures |
| 5.6 Reporting/search | Every HR event yields a stable permission-tagged reporting fact; employee search rebuilds pagewise into `@afenda/search` | Cross-tenant source rows fail before upsert; outbox facts and search upserts are replay-safe |

Shared recovery foundation:

- migration `0015_platform_domain_event_deduplication.sql` adds tenant-scoped
  producer deduplication to the domain-event outbox;
- failed and processed events can be requeued only with matching organization,
  id, and expected state; processed replay requires the literal
  `REPLAY_PROCESSED_EVENT` confirmation;
- platform handler failures throw into the dispatcher so attempts, failure
  reason, retry, and replay remain visible in the outbox rather than being
  swallowed.

Scoped verification evidence:

- `@afenda/events`: 6 files / 32 tests passed; typecheck passed;
- `@afenda/notifications`: 3 files / 10 tests passed; typecheck passed;
- HR Phase 5 unit contracts: 3 files / 13 tests passed;
- app platform/notification integrations: 2 files / 9 tests passed;
- attendance dry-run Server Action: 1 focused test passed;
- platform deduplication migrations: 1 file / 2 tests passed;
- `@afenda/db` typecheck passed.

Repository-wide gates remain separate from this scoped closeout: the concurrent
working tree currently makes `db:check` report a duplicate unrelated journal
index `14`, and `validate:modules` reports unrelated `QUERY-REGISTER` drift.
Neither failure is in a Phase 5 artifact.

This closes the Phase 5 HR/platform boundary mission and does not change the HR
module lifecycle or claim that every future platform document, workflow, IAM,
connector, or analytical consumer is already present.

### Phase 6 — Domain depth

**Mission group:** `HR-ENT-06-DOMAIN-*`

Prioritize by dependency and risk:

1. core and organization;
2. leave and lifecycle;
3. compliance and employee relations;
4. compensation and benefits;
5. recruitment;
6. performance and learning;
7. talent and workforce planning;
8. Time closure evidence and production attendance scope.

Do not close a domain by aggregate count. Close it only when its material
aggregates satisfy the enterprise definition of done below.

### Phase 7 — Product and operations

**Mission group:** `HR-ENT-07-PRODUCT-OPS`

1. Build employee, manager, HR administrator, and candidate slices under
   `apps/web/features/**`.
2. Use RSC for reads and thin Server Actions for mutations; validate with Zod,
   stamp session org/actor, and return `ActionResult<T>`.
3. Consume UI only from the `@afenda/ui-system` flat barrel.
4. Add accessibility, localization, timezone, responsive, and secure error-state
   verification.
5. Add HR metrics, outbox/workflow/integration queue health, alerts, SLOs,
   pagination/load tests, repair/reconciliation tools, and recovery drills.
6. Run the formal HR16 lifecycle gate. Module Enterprise Readiness evidence
   remains separate and requires a reopened Docs lane.

**Exit:** user journeys and operational recovery are verified, then and only
then consider `lifecycle: active`.

## Enterprise definition of done per material aggregate

- authoritative schema and reviewed migration;
- tenant-safe unique constraints and foreign relationships;
- branded IDs and strict Zod boundaries;
- typed command/query contracts returning `Result<T>`;
- contextual and field-level authorization;
- effective-date/history semantics where material;
- concurrency and retry idempotency;
- audit plus transactional domain-event publication;
- memory/Drizzle parity;
- cross-tenant and failure-injection tests;
- production composition;
- metrics and retention classification;
- user-facing or integration-facing entry point;
- accurate Scratch evidence and, when reopened, controlled readiness evidence.

## Check coverage

```text
Applicable controls:       19
Controls with checks:       8
Checks executed:            8
Checks passed:              8
Checks failed:              0
Controls without checks:   11
Unevaluated controls:       0

Coverage status: Incomplete
```

The stabilization checks are green: structural inspection, HR lint, typecheck,
unit tests, database-enforced parity, module validation, package governance, and
editor posture. Coverage remains incomplete because eleven enterprise
capabilities still lack implementation-level checks; those are sequenced in the
remaining phases rather than treated as stabilization failures.

## Immediate next mission

Plan **`HR-ENT-02-ORG-CONTEXT`**. Its first step is an explicit architecture
decision for the authoritative owners of legal entity, business unit, location,
cost centre, and project dimensions; do not encode those dimensions in HR
before that ownership decision is accepted.
