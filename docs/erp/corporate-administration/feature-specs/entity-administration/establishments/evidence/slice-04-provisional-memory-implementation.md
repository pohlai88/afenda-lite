# Slice 1–4 Provisional Memory Implementation — Evidence Record

```yaml
feature_id: establishments
feature_group: entity-administration
prd_ref: docs/erp/corporate-administration/feature-specs/entity-administration/establishments/PRD.md
implementation_status:
  backend: implementation-complete-provisional
  database: not-started
  facade: implementation-complete-provisional
  frontend: not-started
verification_status: blocked
activation_status: inactive
manifest_lifecycle: scaffolded
recorded_on: 2026-08-03
```

## Status

Blocked pending PRD reconciliation (FQ-01, FQ-02) and approval-policy resolution
(CA-PQ-001). Do not begin Slice 5, Drizzle, frontend, or another feature until
this record is superseded by an approved reconciliation.

## What exists on disk

Package `packages/erp/corporate-administration` was deleted in full and
rescaffolded via `applyErpPackageScaffold` / `applyErpFeatureScaffold` (the
functions `turbo gen erp-generator-create-package` /
`erp-generator-add-feature` call), then the `establishments` feature was
built by hand on top of that scaffold.

```text
src/
├── index.ts                                    (facade root)
├── facade/
│   ├── contracts.ts                            (CommandOptions + resolveOpts)
│   └── capabilities.ts                         (public operation wrappers)
├── composition/
│   ├── module.manifest.ts
│   └── store/{contract.ts, compose-slices.ts}
├── kernel/
│   ├── contracts/domain.ts                     (Establishment, status enums)
│   ├── execution/{authorization.ts, approval.ts, async.ts}
│   ├── memory/state.ts
│   ├── operations/{types.ts, define-registry.ts, registry.ts}
│   ├── pagination.ts
│   ├── permissions.ts
│   └── validation/parse-input.ts
├── testing/memory-store.ts
└── features/entity-administration/
    ├── group.definition.ts
    └── establishments/
        ├── establishments.schema.ts
        ├── establishments.store.ts
        ├── establishments.rules.ts
        ├── establishments.memory.ts
        ├── establishments.operations.ts
        ├── operation-registry.ts
        └── index.ts
```

No `@afenda/db` schema, no Drizzle adapter, no migration, no frontend files
exist for this feature. `manifest_lifecycle` remains `scaffolded`, matching
that fact.

## Git status (packages/erp/corporate-administration, uncommitted)

251 deletions (the prior 7-feature package: company, establishments,
governance, meetings, officers, resolutions, authority — removed per explicit
instruction), 9 modifications, 17 new paths. Nothing committed.

## Commands run and exit codes

```text
pnpm --filter @afenda/corporate-administration lint       → exit 0
pnpm --filter @afenda/corporate-administration typecheck   → exit 0
pnpm --filter @afenda/corporate-administration test         → exit 0 (12/12 tests, 3 files)
```

`pnpm gen:doctor:erp` and `pnpm validate:modules` were not run to completion:
`gen:doctor:erp` requires an interactive TTY unavailable in this environment;
`validate:modules` currently skips unconditionally (`docs-V2` was removed
earlier this session and the script fails closed to a no-op skip rather than
validating). `pnpm governance:packages` therefore cannot presently exercise
module-catalog/DAG/sole-mutator validation for this feature — this is a real
gap, not a passing result, and is listed below as unresolved.

## Operations implemented

| Operation | Kind | Permission | Approval enforced |
| --- | --- | --- | --- |
| `registerEstablishment` | command | `corporate_administration.establishment.manage` | no (not approval-required per PRD §10) |
| `updateEstablishment` | command | `corporate_administration.establishment.manage` | no |
| `activateEstablishment` | command | `corporate_administration.establishment.manage` | **yes — fails closed (`SERVICE_UNAVAILABLE`) with no mutation when no approval verifier is supplied; `FORBIDDEN` with no mutation when the verifier declines** |
| `suspendEstablishment` | command | `corporate_administration.establishment.manage` | no (PRD §8.2 marks TR-04 approval: no) |
| `closeEstablishment` | command | `corporate_administration.establishment.manage` | no (PRD §8.2 marks TR-05 approval: no) |
| `getEstablishment` | query | `corporate_administration.establishment.read` | n/a |
| `listEstablishments` | query | `corporate_administration.establishment.read` | n/a |

All 7 match the PRD §10 operation catalog by name and permission. Event
emission (`EstablishmentRegistered`, etc., PRD §14.1) is **not implemented** —
`CORPORATE_ADMINISTRATION_EMITTED_EVENT_IDS` is an empty array.

## Transitions implemented

`draft → active` (activate), `draft|active|suspended → closed` (close),
`active → suspended` / `suspended → active` (suspend/reactivate via activate).
Every other from/to pair returns `CONFLICT`. This matrix is a **provisional
answer to FQ-02**, not an approved one — see Provisional Decisions below.

## Provisional decisions (not formally approved — this is the violation being corrected)

| ID (informal) | Decision made in code | PRD question it answers | Status |
| --- | --- | --- | --- |
| — | Status vocabulary: `draft, active, suspended, closed` (closed terminal) | FQ-02 (lifecycle matrix) | provisional, unapproved |
| — | Transition matrix: draft→{active,closed}; active→{suspended,closed}; suspended→{active,closed}; closed→{} | FQ-02 | provisional, unapproved |
| — | Establishment fields: id, organizationId, legalCompanyId, establishmentType, jurisdictionCode, registrationIdentifier (+normalized), displayName, status, registeredFrom, version, created/updated actor+timestamp | FQ-01 (exact fields, natural keys) | provisional, unapproved |
| — | Natural key: (organizationId, normalizedRegistrationIdentifier), normalized via trim/NFC/strip-separators/uppercase | FQ-01 | provisional, unapproved |
| — | `establishmentType` enum: `registered_office, branch, representative_office` | FQ-01 | provisional, unapproved |

These must be run through Step 2/3 reconciliation (discrepancy matrix, then
formal approval via PRD amendment or `DECISIONS.md` entry) before Slice 5.

## Approval limitation (now corrected, still formally unresolved)

`activateEstablishmentOperation` originally checked permission only and
proceeded regardless of approval availability. This has been corrected in
code to fail closed:

```text
authorization succeeds
→ approval verifier absent  → SERVICE_UNAVAILABLE, no store call, no mutation
→ approval verifier declines → FORBIDDEN, no store call, no mutation
→ approval verifier approves → proceeds to transitionEstablishment
```

`SERVICE_UNAVAILABLE` is used as the **fail-closed default**, not as a
resolution of CA-PQ-001 ("Which canonical error code represents an
unavailable required approval verifier?" — `docs/erp/corporate-administration/DECISIONS.md`).
CA-PQ-001 remains open. If the domain-level decision lands on a different
code, this call site changes to match — it does not retroactively become
correct because tests currently pass against it.

Test coverage added for this: fail-closed-on-absent-verifier (no mutation),
decline-by-verifier (no mutation), and the approved path (mutation occurs) —
see `__tests__/establishments/establishments-contract.test.ts`.

## Unauthorized or out-of-manifest changes

None identified. All new files sit under the PRD-consistent-with-repo-convention
path `src/features/entity-administration/establishments/**` (§18's *intent*,
reconciled to the repo's actual flat-file, dotted-suffix naming convention —
see the earlier facade-pattern discussion in this session) plus the
package-wide kernel/composition/testing/facade scaffolding every ERP package
shares. No sibling feature adapters, foreign tables, or transport calls were
touched.

## Discrepancy matrix (Step 2)

| Area | PRD | Implementation | Decision required |
| --- | --- | --- | --- |
| Fields | unresolved (FQ-01) | concrete fields exist (see above) | approve or revise |
| Natural key / normalization | unresolved (FQ-01) | (organizationId, normalizedRegistrationIdentifier) | approve or revise |
| Lifecycle | unresolved (FQ-02) | draft/active/suspended/closed, matrix above | approve or revise |
| Activation approval | required (TR-03), CA-PQ-001 open | permission enforced; approval enforced fail-closed with provisional error code | resolve CA-PQ-001; confirm fail-closed code |
| Suspend/close approval | not required (TR-04/TR-05) | permission-only, matches PRD | none — conforms |
| Operations catalog | 7 operations named in §10 | all 7 implemented, same names/permissions | confirm exact IDs on formal approval |
| Permissions | `ca.establishments.read` / `.manage` (PRD naming) | `corporate_administration.establishment.read` / `.manage` (repo permission-namespace convention) | confirm naming convention to use |
| Events | 5 events declared (§14.1) | none emitted | finalize event policy before Slice 5/7 |
| Persistence | `@afenda/db` schema not-started | memory-only, no Drizzle | Slice 5 blocked until fields approved |
| Facade | root-only import, no leaked internals | conforms (`@afenda/corporate-administration` exports only capabilities, types, memory test helper) | confirm exact export list on approval |
| Governance validation | `validate:modules`/`governance:packages` expected to pass | currently a no-op skip (docs-V2 absent) | separate repo-wide gap, not this feature's fault, but blocks an honest "governance green" claim |

## Test evidence

```text
Test Files  3 passed (3)
     Tests  12 passed (12)
```

Covers: draft registration, duplicate natural-key rejection, permission
denial, optimistic-concurrency conflict, fail-closed activation (no
verifier), declined activation (verifier rejects), full lifecycle walk with
an approving verifier, invalid-transition rejection, cross-tenant
non-disclosure, cursor pagination. Does **not** yet cover: idempotent replay,
atomicity under injected failure, audit/outbox commit, Drizzle parity,
migration apply/recovery, frontend states — all correctly deferred to Slices
5–9, not silently skipped.

## Next required action

Per the correct sequence: reconcile FQ-01/FQ-02/CA-PQ-001 to an approved
decision (PRD amendment or `DECISIONS.md` entry), re-run Slice 0 readiness,
then re-verify Slices 1–4 against the approved decisions before Slice 5
begins.
