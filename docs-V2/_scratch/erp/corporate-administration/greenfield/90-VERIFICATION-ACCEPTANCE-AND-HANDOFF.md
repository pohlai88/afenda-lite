# Corporate Administration — Verification, Acceptance and Codex Handoff

## 1. Fourteen-boundary acceptance matrix

Every phase-closing slice must report all fourteen rows. A phase is complete only at 14/14.

| # | Boundary | Required evidence |
|---:|---|---|
| 1 | Authority and ownership | Bounded context, table authority, non-goals and external owners remain unambiguous. |
| 2 | Catalog and dependency governance | Manifest, lifecycle, activation, workspace edges, exports and generated catalog agree. |
| 3 | Public package contracts | Branded IDs, schemas, commands, queries, Result errors and root/subpath exports are complete. |
| 4 | Reference and peer boundaries | All foreign facts use public ports/registered edges; no peer writes or peer `/src` imports. |
| 5 | Schema and migrations | Constraints, indexes, migration metadata, fresh-schema and supported upgrade evidence are green. |
| 6 | Tenancy and data isolation | All reads/writes are organization-scoped; cross-tenant identifiers fail safely; hard roots are registered. |
| 7 | Authorization, approvals and SoD | Command/query permissions, high-risk approval matching and segregation rules are proven. |
| 8 | Domain behavior and historical truth | State transitions, chronology, effective/recorded time, correction lineage and as-of behavior are correct. |
| 9 | Idempotency, concurrency and atomicity | Fingerprints, replay/conflict, CAS/locks and same-TX domain/receipt/audit/outbox behavior are proven. |
| 10 | Events, audit and privacy | Registered versioned events, deterministic audits and sensitive-data redaction are complete. |
| 11 | Adapter parity and database semantics | Shared memory/Drizzle scenarios and DB constraint/error mapping produce equivalent semantic outcomes. |
| 12 | App composition and Server Actions | Session stamping, production ports, ActionResult mapping, targeted revalidation and no Drizzle access. |
| 13 | UI, journeys and accessibility | Real persisted workflows, permission visibility, failure states, keyboard/focus/labels/announcements. |
| 14 | Operations and production readiness | Reconciliation, observability, performance, recovery, migration rehearsal and exact gate evidence. |

### Status rules

- `DONE`: direct evidence exists and the exact command exited successfully.
- `PARTIAL`: some evidence exists but the boundary is incomplete.
- `GAP`: implementation/evidence is absent.
- `BLOCKED`: required external infrastructure is unavailable.
- `NOT_APPLICABLE`: only where the phase explicitly excludes the boundary.

No phase closes with `PARTIAL`, `GAP` or `BLOCKED`.

## 2. Test evidence hierarchy

Use evidence in this order:

1. pure domain tests;
2. contract and schema tests;
3. shared adapter parity;
4. database constraints and fresh migration;
5. real Neon transaction/failure/concurrency;
6. application Action tests;
7. interaction/accessibility tests;
8. authenticated production-composition journey;
9. full affected-package and governance gates;
10. performance/recovery/migration rehearsal at phase close.

Compile success alone is not behavioral evidence.

## 3. Required verification lanes

Exact scripts must be confirmed from the current repository. The following names reflect the supplied Afenda conventions.

### 3.1 Changed files

```powershell
pnpm exec biome check <changed-files>
git diff --check
```

### 3.2 Corporate Administration package

```powershell
pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test
pnpm --filter @afenda/corporate-administration check
```

Do not report a nonexistent script as successful. Use the package’s actual scripts and record the exact command.

### 3.3 Database/schema/tenancy

Run whenever schema, migration, index, transaction code or tenancy registration changes:

```powershell
pnpm --filter @afenda/db lint
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db test
pnpm audit:tenancy-nulls
```

Required evidence:

- fresh schema;
- supported upgrade migration;
- schema ownership registration;
- hard-tenant-root registration;
- same-tenant foreign-key/constraint behavior;
- Neon lane with `DATABASE_URL`.

### 3.4 Event contracts

Run whenever an event is added or changed:

```powershell
pnpm --filter @afenda/events lint
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events test
```

Event tests must reconcile emitted event names and versions against the registered catalog.

### 3.5 Future Master Data references

CA-0.1 has no Master Data dependency or reference port. Run these only when a later slice introduces Party, tax-registration or reference-data integration:

```powershell
pnpm --filter @afenda/master-data lint
pnpm --filter @afenda/master-data typecheck
pnpm --filter @afenda/master-data test
pnpm --filter @afenda/master-data check
```

The CA test must prove it uses public Master Data contracts and never writes `md_*`/`ref_*`.

### 3.6 Web/Actions/UI

Run whenever app composition, Actions, routes, navigation or UI changes:

```powershell
pnpm --filter @afenda/web lint
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test
pnpm --filter @afenda/web build
```

Authenticated journey and accessibility lanes are reported separately from unit tests.

### 3.7 Governance and full affected graph

At every phase close and final activation:

```powershell
pnpm validate:modules --write
pnpm governance:packages
pnpm check:docs-trunk-ban
pnpm exec turbo run lint typecheck test
git diff --check
```

Use the current repository generator command where `validate:modules --write` differs. Do not hand-edit generated files.

## 4. Required Neon evidence

A required Neon lane must report:

```text
command=<exact command>
environment=<database branch/schema identifier with secrets redacted>
exit=<code>
passed=<count>
failed=<count>
skipped=<count>
duration=<observed duration>
```

Required scenarios by affected mutation family:

- success writes aggregate/fact + receipt + audit + outbox;
- failure before domain write;
- failure after domain write;
- failure during receipt;
- failure during audit;
- failure during outbox;
- failure immediately before commit;
- retry after rollback;
- same-key/same-fingerprint replay;
- same-key/different-fingerprint conflict;
- stale `expectedVersion`;
- natural-key race;
- effective-range overlap race;
- relevant graph/ledger/numbering race.

An unavailable `DATABASE_URL` means `BLOCKED`.

## 5. Authenticated journey evidence

Each phase that exposes UI must include at least one production-composed journey that:

1. authenticates a user;
2. selects a tenant;
3. verifies permission visibility;
4. loads authoritative state;
5. performs a real Server Action mutation;
6. handles validation or conflict state;
7. reloads persisted state;
8. proves cross-tenant or unauthorized access fails;
9. verifies accessible labels, focus and status feedback;
10. confirms sensitive fields remain redacted.

Mocked package commands alone are not an authenticated journey.

## 6. Security and privacy checks

At phase close, scan:

- command inputs and outputs;
- domain events;
- audit diffs;
- structured logs;
- search documents;
- export schemas;
- error metadata;
- UI HTML/serialized props.

Forbidden leakage includes:

- government identifiers;
- unrestricted birth dates/residential addresses;
- full bank-account identity;
- signature/seal specimen URLs;
- document signed URLs or credentials;
- confidential agreement body text;
- approval-system secrets;
- raw SQL/stack traces shown to users.

## 7. Migration acceptance

Every migration-bearing phase reports:

| Evidence | Requirement |
|---|---|
| Fresh install | Empty database migrates and package tests pass |
| Upgrade path | Supported prior schema migrates without application-incompatible gap |
| Backfill | Idempotent and restartable |
| Invalid legacy data | Detected and quarantined/reported, not silently coerced |
| Concurrency | Deploying application versions remain safe during expand/migrate/contract |
| Recovery | Forward-repair or rollback procedure is documented and rehearsed |
| Reconciliation | Row counts/invariants before and after migration are compared |

## 8. Performance acceptance

Measure representative small, medium and large tenants. At minimum cover:

- legal-company list and history;
- officer/authority as-of;
- meeting/resolution list;
- holdings/capital reconstruction;
- ownership/UBO graph traversal;
- expiring instruments;
- due/overdue filings;
- group structure;
- document/register list;
- search;
- reconciliation;
- import/export streaming.

Requirements:

- deterministic cursor pagination;
- bounded query count;
- no unbounded in-memory materialization;
- evidence-based indexes;
- lock duration/ordering review;
- repository-standard EXPLAIN evidence;
- regression threshold recorded in tests or benchmark governance.

Do not invent universal millisecond targets before measuring the deployment environment.

## 9. Standard Codex handoff

Every slice response must use this structure:

```text
1. Verdict: COMPLETE | NOT COMPLETE | BLOCKED
2. Slice: <CA-X.Y>
3. Greenfield posture:
   - prior Corporate Administration implementation relied on: none
   - current disk baseline inspected: <files/commit/branch>
4. Working-tree baseline:
   - branch/commit:
   - pre-existing changed files:
5. Authority applied:
   - package ownership:
   - external boundaries:
   - high-risk approval rules:
6. Files changed by layer:
   - package contracts/domain
   - DB/schema/migration
   - events/governance
   - adapters/composition
   - Actions/UI
   - tests/evidence
7. Behavior delivered:
   - commands:
   - queries:
   - transitions/invariants:
   - user workflow:
8. Security, tenancy, history, idempotency, concurrency and atomicity evidence
9. Tests added:
   - file:
   - scenarios:
10. Verification:
   - <exact command> -> exit <code>; passed=<n>; failed=<n>; skipped=<n>
11. Fourteen-boundary matrix:
   - boundary | status | files | tests | command | exit | remaining gap
12. Migration impact:
13. Remaining gaps:
14. Next eligible slice: <ID>; do not start it
```

Do not report `COMPLETE` when any required boundary is not `DONE`.

## 10. Scope and repair rules

1. Fix root causes; do not silence TypeScript, Biome, SQL, authorization or tests.
2. No stubs, shims, fake adapters, inert UI, fabricated success, TODO throws or placeholder exports.
3. Preserve unrelated working-tree changes.
4. Do not commit or push unless requested.
5. Do not hand-edit generated files.
6. Keep commands thin, rules pure and persistence explicit.
7. Do not widen into HR, Payroll, Accounting, Payments or platform repairs unless a directly required contract cannot be satisfied.
8. When an upstream conflict is discovered, return `CONFUSION` with exact files and the smallest decision required.
9. A phase may add a required supporting migration or event contract, but must not opportunistically refactor unrelated packages.
10. Stop after the selected slice.
