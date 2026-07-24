# Payroll implementation workflow

Use one prompt per phase. Review the plan and diff before proceeding. Do not build the entire package in one task.

**Authority:** [SKILL.md](SKILL.md) · [package-tree.md](package-tree.md) · Scratch pack [`docs-V2/_scratch/payroll-cursor-agent-pack/docs/payroll/IMPLEMENTATION_PLAN.md`](../../../docs-V2/_scratch/payroll-cursor-agent-pack/docs/payroll/IMPLEMENTATION_PLAN.md)

**Subagents:** Plan / discovery → [payroll-architect](../../agents/payroll-architect.md) · Phase gate / pre-merge → [payroll-verifier](../../agents/payroll-verifier.md)

**Structural rule:** Use sliced `schemas/`, `store/`, `adapters/` farms — never root `schemas.ts`, `store.ts`, `drizzle-store.ts`, or `memory-store.ts`.

## Prompt 00 — Repository discovery only

```text
Use Plan Mode and the read-only payroll-architect subagent.

We are working on packages/erp/payroll (@afenda/payroll). Do not edit files yet.

LOAD afenda-elite-payroll companions and inspect the repository for canonical examples:
- an existing independent R1-F ERP package;
- module manifests, module IDs, activation toggles and dependencies;
- permissions and authorization;
- command options/idempotency metadata;
- brands/IDs, dates, money/decimal and validation;
- domain errors and public error mapping;
- store interfaces, memory stores, Drizzle stores and transaction handling;
- schema and migration ownership;
- event envelopes, event naming and transactional outbox;
- ports and app composition adapters;
- package exports, tsconfig references and package scripts;
- unit, store-contract, database integration and architecture-boundary tests.

Pay special attention to peer ERP import restrictions and mutation ownership.

Produce a repository alignment report (Scratch path or plan output) containing:
1. canonical files to copy patterns from;
2. exact conventions to follow;
3. dependencies already available;
4. proposed files for the first walking skeleton;
5. risks/open decisions;
6. a commit-by-commit plan;
7. explicit non-goals.

Do not generate production code, migrations or dependencies.
```

## Prompt 01 — Guardrails and package shell

```text
Read afenda-elite-payroll companions, the repository alignment report, and applicable payroll .cursor rules.

Implement Phase 1 only: the @afenda/payroll package shell and public compile-time contract. Reuse repository patterns exactly. Do not add a new dependency unless it is unavoidable and explained first.

Required manifest:
- id: payroll
- category: erp
- packageName: @afenda/payroll
- band: R1-F
- lifecycle: active
- activationMode: organization_toggle
- moduleDependencies: [human-resources]
- optionalIntegratesWith: [payments, accounting, payables]

Implement payroll permissions, stable error codes, PayrollEmployeeQueryPort, infrastructure ports discovered in the repository, and intentional public exports. Use sliced schemas/store/adapters per package-tree.md — not root monoliths. Do not implement calculations or database tables yet.

Add focused tests for manifest identity, permission uniqueness, exports and package-boundary rules. Run typecheck, lint and tests. Summarize changed files and any deviations.
```

## Prompt 02 — Schema proposal before migration

```text
Use Plan Mode and payroll-architect. Do not write a migration yet.

Design the minimum schema for the walking skeleton:
payroll_calendar, payroll_pay_group, payroll_period, payroll_employee_assignment, payroll_earning_rule, payroll_deduction_rule, payroll_statutory_rule, payroll_variable_input, payroll_run, payroll_run_employee, payroll_result_line, payroll_statutory_result, payroll_exception, payroll_payslip, payroll_adjustment and payroll_reconciliation.

For each table specify columns, exact types using repository conventions, primary/foreign keys, organization scoping, unique constraints, checks, effective-date rules, immutable/finalized behavior, optimistic versioning, indexes and audit fields.

Explain which suggested tables can be deferred from the first migration and why. Confirm no foreign key or direct mutation crosses into HR, Payments or Accounting ownership. Save the reviewed design to Scratch (docs-V2/_scratch/...) — not Living docs/payroll/.
```

## Prompt 03 — Persistence foundation

```text
Implement only the reviewed first migration and store foundation from the schema design.

Create sliced store contracts, memory store, Drizzle store and resolver following canonical repository patterns. Keep store methods aggregate-oriented rather than exposing generic table mutation.

Add shared contract tests that run against memory and Drizzle stores, plus database tests for organization isolation, unique run identity, effective-date overlap prevention, monetary precision, optimistic versioning and finalized immutability.

Do not implement calculation behavior. Run migration checks, typecheck, lint and tests. Stop on any failing existing test rather than weakening it.
```

## Prompt 04 — Setup slice

```text
Implement setup/calendar.ts, setup/pay-group.ts, setup/earning-rule.ts, setup/deduction-rule.ts and setup/statutory-rule.ts as a coherent slice.

Requirements:
- validate inputs at the package boundary;
- enforce authorization;
- scope by organization;
- use effective-dated, versioned rules;
- prevent overlapping active versions where the business key requires exclusivity;
- prevent changing a rule version referenced by a finalized run;
- emit only repository-approved setup events, if setup events are already a convention.

Add unit, store-contract and database integration tests. Keep UI/API transport concerns outside this package.
```

## Prompt 05 — Assignment, HR port and variable input

```text
Implement the employee payroll assignment and one variable earning input vertical slice.

Use PayrollEmployeeQueryPort to validate an employee at an effective date. Do not import HR code or HR schema. Persist only Payroll-owned configuration and external source references. At calculation time, create a reproducibility snapshot of the HR facts used.

Variable input must support idempotent ingestion via sourceType + sourceId, amount as the canonical lossless money/decimal type, currency, earning rule code/version resolution, effective period, status, actor and audit metadata.

Test terminated/ineligible employees, wrong pay group, currency mismatch, duplicate source input, cutoff behavior and organization isolation.
```

## Prompt 06 — Run lifecycle

```text
Implement payroll-period and payroll-run orchestration with explicit pure transition functions.

Initial states:
draft -> calculating -> calculated -> finalized -> reversed
calculating -> failed

Add blocking payroll exceptions, optimistic concurrency, unique run identity, command idempotency and audit records. A finalized run and its results must be immutable.

Do not build statutory law yet. Use a test calculator port or a minimal generic earning-only calculator so the lifecycle can be verified independently.

Test every allowed and rejected transition, duplicate commands, stale versions, concurrent calculate attempts and concurrent finalize attempts.
```

## Prompt 07 — Deterministic calculation engine

```text
Implement a pure, deterministic calculation engine for the first supported rule set.

Inputs must be immutable snapshots containing employee facts, variable inputs, applicable rule versions, currency, period, calculation version and rounding policy. Outputs must contain normalized result lines, statutory results, totals, exceptions and a trace/provenance record.

Never use JavaScript number for money. Make rounding explicit. Employer contributions must not reduce employee net. Preserve rule code/version and source references on each result line.

Add human-readable golden fixtures, rounding-boundary tests, zero/negative validation, reproducibility tests and accounting-identity assertions. Do not claim statutory production readiness until domain specialists approve the jurisdiction implementation.
```

## Prompt 08 — Transactional finalization and events

```text
Implement finalization as one atomic transaction using the repository's canonical outbox.

Before finalizing, reload/lock the run, verify expected version/status, verify snapshot hash and totals, and reject unresolved blocking exceptions. Mark final records immutable and write these events exactly once:
- payroll.run.finalized.v1
- payroll.payment-requested.v1
- payroll.posting-requested.v1

Payment event: use payee/source references, amount string, currency, requested date and idempotency/reference data; no bank details.
Posting event: use semantic posting categories/dimensions and amount strings; no journal insert and no direct account mutation unless the established contract explicitly requires approved posting keys.

Add fault-injection, rollback, duplicate-finalize, outbox uniqueness and sensitive-payload tests.
```

## Prompt 09 — Payslip, reconciliation and reversal

```text
Implement versioned payslip records/view models, own-vs-all authorization, payment/accounting reconciliation, and compensating reversal behavior.

Do not embed payslip content or sensitive employee data in integration events. Preserve the original finalized run. Reversal creates linked compensating records/events and requires reason, actor, authorization and idempotency.

Add access-control, tamper/hash where supported, mismatch, partial downstream completion, duplicate reversal and original-immutability tests.
```

## Prompt 10 — Independent verification

```text
Invoke the read-only payroll-verifier on the full branch diff against the base branch.

Run all non-destructive package and repository checks. Report BLOCKER/HIGH/MEDIUM/LOW findings and a PASS/PASS WITH FOLLOW-UPS/FAIL verdict. Do not edit files during this review.

Explicitly verify package boundaries, monetary arithmetic, rule versioning, reproducibility snapshots, state transitions, concurrency, finalization/outbox atomicity, reversal semantics, authorization, sensitive-data minimization, migration constraints and test coverage.
```

## Prompt 11 — Fix verified findings only

```text
Read the payroll-verifier report. Fix only confirmed BLOCKER and HIGH findings first. For each fix, add a regression test that fails before the fix and passes after it. Avoid unrelated refactors. Re-run the verifier after tests pass.
```
