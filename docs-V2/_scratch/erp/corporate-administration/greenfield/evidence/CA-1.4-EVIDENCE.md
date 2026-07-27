# CA-1.4 - Evidence

## Result

`PARTIAL` - the production vertical is implemented and every CA-owned focused
lane is green. CA-1.4 is not marked `DONE` because the required repository-wide
web lint gate exits 1 on 15 pre-existing Human Resources errors. CA-1.5 is not
eligible.

## Demo branch

- Project: `young-hat-54755363`
- Branch name: `ca-0-4-demo`
- Branch ID: `br-fragrant-morning-aoywrnzr`
- Parent production branch: `br-tiny-hill-ao82jp6f`
- Local env documentation: `.env.local` keys `NEON_CA_0_4_DEMO_*`
- Applied only additive CA migrations `0003_glorious_madelyne_pryor.sql` and
  `0004_even_tigra.sql`; production was not targeted.
- Demo permission catalog reconciled to 213 governed permissions.

## Delivered surface

- Tables: `ca_legal_establishment`, `ca_establishment_status_history`,
  `ca_registered_address`, `ca_premise`.
- Commands: registration/update, activate/suspend/close, registered-address
  history, and premise registration/end dating.
- Queries: tenant-scoped establishment get/list-as-of, address-as-of and
  premise-list-as-of.
- Memory and Drizzle adapters share effective-time, tenant, stale-version and
  overlap semantics; database constraints guard concurrent histories.
- Shared platform audit/outbox remains platform-owned. Domain writes,
  idempotency completion, audit and events participate in the same transaction.
- Authenticated Actions derive organization and actor from session and expose a
  real accessible legal-presence workspace with persisted reload evidence.

## Verification

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm --filter @afenda/corporate-administration check` | 0 | lint/typecheck green; 44 files passed, 10 skipped; 236 tests passed, 32 policy-skipped |
| focused CA-1.4 Neon test with demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1` and `AFENDA_DATABASE_TEST_TARGET=demo` | 0 | 1 file, 1 simultaneous-concurrency test passed, 0 skipped |
| `pnpm --filter @afenda/db lint` and `typecheck` plus four focused DB suites | 0 | 4 files, 27 tests passed |
| `DATABASE_URL='' pnpm --filter @afenda/db test` | 0 | 50 files, 171 tests passed |
| `pnpm --filter @afenda/events lint`, `typecheck`, `test` | 0 | 8 files, 49 tests passed |
| three focused CA-1.4 web suites | 0 | 3 files, 8 tests passed |
| `pnpm --filter @afenda/web typecheck` | 0 | app composition, Actions and UI compiled |
| targeted Biome check for CA-1.4 web files | 0 | 5 files clean |
| `pnpm validate:modules` | 0 | 7 registers matched; 22 negative fixtures proven |
| `git diff --check` | 0 | no whitespace errors; unrelated line-ending warnings only |
| `pnpm --filter @afenda/web lint` | 1 | 605 files checked; 15 errors, 2 warnings and 1 info, all reported under unrelated Human Resources files |

The full DB suite against the CA demo URL additionally exposes one unrelated HR
live invariant failure because the branch intentionally received the additive
CA migrations, not the reset chain's HR tenant-FK migration. The required CA
Neon concurrency test itself is green and organization-scoped cleanup is
guaranteed.

## Fourteen-boundary matrix

| # | Boundary | Status | Evidence | Remaining gap |
|---:|---|---|---|---|
| 1 | Authority and ownership | DONE | Four CA tables; Master Data address facts consumed through a public read port | None |
| 2 | Catalog and dependency governance | DONE | Scaffolded lifecycle preserved; manifest/register validation green | None |
| 3 | Public package contracts | DONE | Branded IDs, schemas, eight commands, four queries and barrels compile | None |
| 4 | Reference and peer boundaries | DONE | Party/address and jurisdiction checks use ports; no peer-table writes | None |
| 5 | Schema and migrations | DONE | Additive migrations, composite tenant FKs, checks, indexes and exclusions tested | None |
| 6 | Tenancy and data isolation | DONE | Scoped stores, cross-tenant tests, hard-root registration and cleanup | None |
| 7 | Authorization, approvals and SoD | DONE | Read/manage permissions fail closed; Actions deny before mutation | None |
| 8 | Domain behavior and historical truth | DONE | Company chronology, statuses, as-of addresses and premises tested | None |
| 9 | Idempotency, concurrency and atomicity | DONE | Same-TX completion plus real Neon simultaneous duplicate with one winner | None |
| 10 | Events, audit and privacy | DONE | Versioned redacted establishment/address/premise events; no address lines in events | None |
| 11 | Adapter parity and database semantics | DONE | Memory contracts and Drizzle/Neon constraints map deterministic conflicts | None |
| 12 | App composition and Server Actions | DONE | Session stamping, ActionResult mapping, production ports and targeted revalidation | None |
| 13 | UI, journeys and accessibility | DONE | Authenticated persisted-reload journey, stale/denied states, labels and announcements | None |
| 14 | Operations and production readiness | PARTIAL | Demo rehearsal, cleanup, full DB/events/type/governance gates green | Repository-wide web lint is red in unrelated HR worktree files |

## Migration impact

Expand-only CA schema on the non-production demo branch. The tables are hard
tenant roots, use tenant-coherent company references, reject invalid chronology,
and prevent overlapping status/address histories. No production migration was
run.

## Remaining gap

Repair the existing Human Resources web lint failures in their owning mission,
then rerun `pnpm --filter @afenda/web lint`. Only after that command exits 0 may
CA-1.4 be promoted to `DONE` and CA-1.5 become eligible.

## Next eligible slice

None. Stop at CA-1.4.
