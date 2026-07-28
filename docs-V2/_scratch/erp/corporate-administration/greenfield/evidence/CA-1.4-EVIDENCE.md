# CA-1.4 - Evidence

## Result

`PARTIAL` for the product slice and `DONE for backend` - the CA backend slice is
production-implemented and CA-owned backend evidence is green against the
repaired demo branch. Focused establishment Action/UI journey evidence is also
green. The demo ledger is proven through the current CA migration
`0026_ca_recorded_range_zero_width`. The branch still reports later pending
forward migrations outside this CA backend lane, so this file does not promote
any non-CA work.

## Current audit - 2026-07-28

Context-engineering refresh loaded the CA authority, package README, Phase 1
roadmap and current disk state before verification.

| Command | Exit | Evidence |
|---|---:|---|
| guarded demo repair: `pnpm --filter @afenda/db db:repair-ca-demo-foundation` with `AFENDA_ALLOW_DB_MIGRATE=1`, `AFENDA_ALLOW_CA_FOUNDATION_REPAIR=1`, `AFENDA_DATABASE_TEST_TARGET=demo` | 0 | repaired missing CA foundation tables on demo branch; subsequent run reported tables already present and recorded-range invariants repaired |
| focused CA Neon set with demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` | 0 | 5 files passed; 9 tests passed |
| `pnpm --filter @afenda/corporate-administration check` with demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` | 0 | lint clean; typecheck green; 54 files passed; 268 tests passed |
| `pnpm --filter @afenda/corporate-administration check` | 0 | 152 files checked; typecheck green; 46 files passed, 11 skipped; 240 tests passed, 34 skipped |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration/phase-1-real-package.journey.test.ts` | 0 | 1 file passed; 1 test passed; uses real CA package commands with app-composed dependencies to seed registered-office address state, reload persisted state and activate through the lifecycle Server Action |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration __tests__/corporate-administration-legal-company-actions.test.ts __tests__/corporate-administration-company-identity-actions.test.ts __tests__/corporate-administration-jurisdiction-profile-form.test.ts` | 0 | 20 files passed; 64 tests passed; includes `legal-establishment.journey.test.ts` for authenticated establishment registration, persisted reload rendering, stale feedback and unauthorized denial |
| `pnpm --filter @afenda/web typecheck` | 0 | web TypeScript gate green |
| `pnpm --filter @afenda/db lint` | 0 | 93 files checked; no fixes applied |
| `pnpm --filter @afenda/db typecheck` | 0 | DB package compiled |
| `pnpm --filter @afenda/db test` | 0 | 51 files passed; 186 tests passed |
| `git diff --check` | 0 | no whitespace errors |
| `pnpm --filter @afenda/db db:sync-migration-ledger -- 0001_ca_relational_invariants 0003_glorious_madelyne_pryor 0004_even_tigra 0026_ca_recorded_range_zero_width` with demo `DATABASE_URL` and `AFENDA_ALLOW_DB_MIGRATE=1` | 0 | guarded DDL probes recorded all CA forward migration tags in `drizzle.__drizzle_migrations` |
| `pnpm --filter @afenda/db db:migration-status` against demo `DATABASE_URL` | 0 | journal entries: 28; DB ledger rows: 5; applied through: `0026_ca_recorded_range_zero_width`; pending forward: 24; no drift issues |

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
- Migration DDL probes now cover the CA forward tags used for ledger backfill:
  `0001_ca_relational_invariants`, `0003_glorious_madelyne_pryor`,
  `0004_even_tigra` and `0026_ca_recorded_range_zero_width`.
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
| 5 | Schema and migrations | DONE | CA schema/tests green; forward CA migration added; demo ledger applied through `0026_ca_recorded_range_zero_width` | None for CA backend |
| 6 | Tenancy and data isolation | DONE | CA-specific DB suites include tenancy hard-root coverage | None |
| 7 | Authorization, approvals and SoD | DONE | Existing command permission contracts remain green | None |
| 8 | Domain behavior and historical truth | DONE | Full CA suite green against demo database | None |
| 9 | Idempotency, concurrency and atomicity | DONE | Focused Neon concurrency/failure set green; full CA suite green | None |
| 10 | Events, audit and privacy | DONE | Outbox/audit atomicity tests green | None |
| 11 | Adapter parity and database semantics | DONE | Memory/Drizzle package tests green | None |
| 12 | App composition and Server Actions | NOT IN SLICE | This pass was backend-only | None for backend slice |
| 13 | UI, journeys and accessibility | NOT IN SLICE | This pass was backend-only | None for backend slice |
| 14 | Operations and production readiness | DONE for backend | CA backend gates green; DB package gates green; guarded demo repair and guarded CA ledger probes available | Later non-CA forward migrations remain pending on demo branch |

## Non-CA Pending Work

The demo branch still reports 24 pending forward migrations after the CA ledger
proof. Those rows are outside the CA backend lane. Resolve them through their
own governed DB slices with `db:migrate` or explicit DDL probes, then rerun:

```bash
pnpm --filter @afenda/db db:migration-status
pnpm --filter @afenda/db test
```

Do not use this CA backend evidence to promote unrelated pending DB work.

## Next Eligible Slice

Backend CA-1.4 is complete and focused app journey evidence exists. Product
slice promotion still requires complete 14-boundary product evidence. The
real-package Phase 1 journey now proves app-composed package commands persist
registered-office state before activation, but browser-authenticated/Neon-backed
journey proof and any required phase-close race/failure proof still need to be
recorded.
