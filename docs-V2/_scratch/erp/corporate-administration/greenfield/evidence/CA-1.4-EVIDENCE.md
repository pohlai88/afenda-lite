# CA-1.4 - Evidence

## Result

`PARTIAL` - the CA backend slice is production-implemented and CA-owned backend
evidence is green against the repaired demo branch. CA-1.4 is not marked
`DONE` because the demo branch still reports pending forward migration ledger
rows; no drift remains, but the branch is not ledger-applied through the current
journal.

CA-1.5 is not eligible.

## Current audit - 2026-07-28

Context-engineering refresh loaded the CA authority, package README, Phase 1
roadmap and current disk state before verification.

| Command | Exit | Evidence |
|---|---:|---|
| guarded demo repair: `pnpm --filter @afenda/db db:repair-ca-demo-foundation` with `AFENDA_ALLOW_DB_MIGRATE=1`, `AFENDA_ALLOW_CA_FOUNDATION_REPAIR=1`, `AFENDA_DATABASE_TEST_TARGET=demo` | 0 | repaired missing CA foundation tables on demo branch; subsequent run reported tables already present and recorded-range invariants repaired |
| focused CA Neon set with demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` | 0 | 5 files passed; 9 tests passed |
| `pnpm --filter @afenda/corporate-administration check` with demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` | 0 | lint clean; typecheck green; 54 files passed; 268 tests passed |
| `pnpm --filter @afenda/db lint` | 0 | 93 files checked; no fixes applied |
| `pnpm --filter @afenda/db typecheck` | 0 | DB package compiled |
| `pnpm --filter @afenda/db test` | 0 | 51 files passed; 186 tests passed |
| `git diff --check` | 0 | no whitespace errors |
| `pnpm --filter @afenda/db db:migration-status` against demo `DATABASE_URL` | 0 | journal entries: 28; DB ledger rows: 1; pending forward: 28; no drift issues |
| `pnpm --filter @afenda/db db:sync-migration-ledger` with demo `DATABASE_URL` and `AFENDA_ALLOW_DB_MIGRATE=1` | 1 | fails closed: no DDL probe for `0000_damp_blue_shield`; use `db:migrate` instead |

## Delivered Backend Surface

- Transaction-backed company identity commands now bump the legal-company
  aggregate version for names, legal forms, identifiers, financial years and
  activities.
- Legal-form commands validate against the current jurisdiction profile rather
  than a historical effective-date probe that rejected valid same-transaction
  CA flows.
- Regulated company activities accept uppercase authority/regulator codes while
  preserving schema validation.
- Identifier supersession has a database-level one-successor guard.
- Recorded-range checks allow zero-width recorded intervals for same-instant
  supersession/retirement writes while preserving effective-time chronology.
- Failure-injection coverage now asserts that event-append failure rolls back
  domain rows and completed receipts while releasing the idempotency reservation
  per the retained-fingerprint contract.
- Demo-only foundation repair is guarded by explicit operator flags and demo
  target validation; it does not target production by default.

## Demo Branch

- Project: `young-hat-54755363`
- Branch name: `ca-0-4-demo`
- Branch ID: `br-fragrant-morning-aoywrnzr`
- Parent production branch: `br-tiny-hill-ao82jp6f`
- Local env documentation: `.env.local` keys `NEON_CA_0_4_DEMO_*`
- Production was not targeted.

## Fourteen-Boundary Matrix

| # | Boundary | Status | Evidence | Remaining gap |
|---:|---|---|---|---|
| 1 | Authority and ownership | DONE | CA package and DB schema own legal-company and establishment surfaces | None |
| 2 | Catalog and dependency governance | DONE | Package check and CA DB suites green | None |
| 3 | Public package contracts | DONE | Exported command/query contracts typecheck | None |
| 4 | Reference and peer boundaries | DONE | CA flows continue through ports and public package imports | None |
| 5 | Schema and migrations | PARTIAL | CA schema/tests green; forward CA migration added; migration-status has no journal drift | Demo branch still has 28 pending forward ledger rows |
| 6 | Tenancy and data isolation | DONE | CA-specific DB suites include tenancy hard-root coverage | None |
| 7 | Authorization, approvals and SoD | DONE | Existing command permission contracts remain green | None |
| 8 | Domain behavior and historical truth | DONE | Full CA suite green against demo database | None |
| 9 | Idempotency, concurrency and atomicity | DONE | Focused Neon concurrency/failure set green; full CA suite green | None |
| 10 | Events, audit and privacy | DONE | Outbox/audit atomicity tests green | None |
| 11 | Adapter parity and database semantics | DONE | Memory/Drizzle package tests green | None |
| 12 | App composition and Server Actions | NOT IN SLICE | This pass was backend-only | None for backend slice |
| 13 | UI, journeys and accessibility | NOT IN SLICE | This pass was backend-only | None for backend slice |
| 14 | Operations and production readiness | PARTIAL | CA backend gates green; DB package gates green; guarded demo repair available | Demo branch ledger/apply remains pending forward |

## Remaining Gap

Resolve the demo branch pending-forward state through the governed DB lane.
`db:sync-migration-ledger` currently fails closed for the 0000-0027 set because
there are no DDL probes for those tags; use `db:migrate` or add explicit probes
before backfilling ledger rows. Then rerun:

```bash
pnpm --filter @afenda/db db:migration-status
pnpm --filter @afenda/db test
```

Only after those global gates exit 0 may CA-1.4 be promoted to `DONE` and
CA-1.5 become eligible.

## Next Eligible Slice

None. Stop at CA-1.4.
