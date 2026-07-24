# @afenda/payroll implementation plan

## Target walking skeleton

A synthetic employee can be resolved through an injected HR query port, included in a payroll period, supplied with one variable earning input, calculated deterministically, reviewed, finalized transactionally, issued a payslip record, and represented by payment/posting request events—without Payroll mutating HR, Payments, or Accounting tables.

## Phase 0 — Repository alignment

Deliver a report identifying canonical repository patterns. Do not write production code until these are known:

- package manifest and lifecycle conventions;
- package exports and TypeScript project references;
- schema/migration ownership;
- store and transaction interfaces;
- IDs, dates, money/decimal, validation, errors;
- authorization and command metadata;
- event envelopes and transactional outbox;
- module activation/toggle handling;
- test framework and architecture checks.

Exit gate: every new abstraction maps to an existing repository convention or has a recorded architecture decision.

## Phase 1 — Package shell and public contract

Create only the package shell and compile-time contract:

- `package.json`, `tsconfig.json`, `README.md`;
- `src/index.ts`;
- `module.manifest.ts`, `module-ids.ts`;
- `permissions.ts`, `authorization.ts`;
- `command-options.ts`;
- `brands.ts`, `types.ts`, `schemas.ts`, `parse-input.ts`;
- `error-codes.ts`;
- `ports.ts`, `production-ports.ts`;
- `store.ts`, `resolve-store.ts`;
- empty capability folders only when required by repository conventions.

Exit gate: package typechecks; exports are intentional; manifest and permissions tests pass; no peer package imports.

## Phase 2 — Schema and persistence foundation

Implement setup and run persistence in migrations sized for review.

Required database properties:

- organization-scoped primary/unique keys;
- effective-date validity checks;
- immutable or protected finalized records;
- optimistic concurrency version on mutable aggregates;
- unique idempotency keys for commands and events;
- foreign keys only within approved ownership boundaries;
- indexes for organization + status + period/pay-group queries;
- exact decimal/numeric types or lossless integer minor units according to repository standards;
- timestamps and actor/audit metadata.

Implement both memory and Drizzle stores against the same store contract tests.

Exit gate: migrations apply on an empty database; constraints are integration-tested; memory and Drizzle stores pass identical contract tests.

## Phase 3 — Setup vertical slice

Implement:

1. payroll calendar;
2. pay group;
3. payroll period;
4. earning rule;
5. deduction rule;
6. statutory rule registration/versioning.

Keep rule definitions effective-dated and immutable after use by a finalized run.

Exit gate: create/read/update/retire behavior, date overlap constraints, permissions, and organization isolation pass.

## Phase 4 — Employee assignment and inputs

Implement payroll-specific assignment and inputs without taking ownership of HR master data.

- Resolve approved employee facts through `PayrollEmployeeQueryPort`.
- Store Payroll-specific assignment configuration.
- Snapshot HR facts at calculation time.
- Support recurring payroll-owned items and variable inputs with provenance.
- Make external-source imports idempotent through source type + source ID uniqueness.

Exit gate: duplicate inputs are rejected/idempotently returned; effective-date and cutoff rules pass; HR facts are not copied as mutable master data.

## Phase 5 — Run lifecycle

Start with the smallest state machine:

```text
draft -> calculating -> calculated -> finalized -> reversed
                   \-> failed
```

Add review/approval states only when the repository's maker-checker policy is defined.

Implement:

- unique run identity for organization + pay group + period + run type + sequence;
- explicit transition functions;
- blocking exceptions;
- optimistic concurrency;
- command/request idempotency;
- audit trail.

Exit gate: invalid transitions, duplicate starts, concurrent calculations, and concurrent finalizations are tested.

## Phase 6 — Pure calculation engine

Pipeline shape:

1. validate employee eligibility and currency;
2. assemble snapshot and applicable rule versions;
3. calculate base and variable earnings;
4. calculate configured pre-tax deductions;
5. derive statutory/tax bases;
6. calculate employee statutory/tax results;
7. calculate post-tax deductions;
8. calculate employer contributions;
9. derive gross, total employee deductions, employer cost, and net;
10. generate exceptions and a calculation trace.

Rules vary by jurisdiction. Keep jurisdiction-specific order, thresholds, caps, and rounding behind versioned rule calculators rather than hard-coding one country's law into generic orchestration.

Exit gate: deterministic golden fixtures pass; rerunning the same snapshot produces byte-equivalent normalized results; employer contributions do not reduce net.

## Phase 7 — Finalization and integration events

Finalization transaction must:

1. lock/reload the run and verify expected version/status;
2. verify no unresolved blocking exceptions;
3. verify calculation snapshot/hash and totals;
4. mark result records immutable/finalized;
5. create payslip metadata or publication work items;
6. write `payroll.run.finalized.v1`;
7. write `payroll.payment-requested.v1`;
8. write `payroll.posting-requested.v1`;
9. commit all records and outbox events atomically.

Event payloads should use semantic references, line categories, dimensions, amount strings, currency, dates, and source IDs. Accounting applies posting profiles; Payroll must not create journals. Payments owns payment execution and bank interaction.

Exit gate: fault-injection tests prove there is no partial finalization or partial event publication.

## Phase 8 — Payslips and reconciliation

Implement:

- versioned payslip view model;
- renderer/storage ports if documents are generated outside the pure package;
- own/all authorization separation;
- payment and accounting reconciliation records driven by downstream references/events;
- discrepancy thresholds and exception workflow.

Exit gate: payslip access tests, tamper/hash tests where applicable, and reconciliation mismatch cases pass.

## Phase 9 — Reversal and adjustments

Implement reversal as compensation:

- preserve original run/results;
- create reversal/adjustment records linked to originals;
- produce opposite payment/posting semantics where business rules permit;
- emit `payroll.run.reversed.v1` and downstream correction requests;
- require reason, actor, authorization, and audit metadata.

Exit gate: original data remains unchanged; totals reconcile across original + reversal; duplicate reversal requests are idempotent.

## Phase 10 — Production hardening

- authorization and segregation-of-duties review;
- threat model and sensitive-data review;
- query/index review with realistic synthetic volume;
- retry/idempotency review;
- observability with redacted structured logs and safe metrics;
- migration rollback/forward-fix plan;
- statutory calculator sign-off by qualified domain reviewers;
- disaster recovery and reproducibility drill.
