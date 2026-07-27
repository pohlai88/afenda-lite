# CA-0.4 — Evidence

## Result

`DONE` — required durable infrastructure verification ran on the explicit
non-production Neon demo branch.

## Demo branch

- Project: `young-hat-54755363`
- Branch name: `ca-0-4-demo`
- Branch ID: `br-fragrant-morning-aoywrnzr`
- Parent production branch: `br-tiny-hill-ao82jp6f`
- Compute: `ep-long-paper-aoztgs80`
- Local env documentation: `.env.local` keys `NEON_CA_0_4_DEMO_*`
- Required DB test environment:
  `AFENDA_DATABASE_TEST_TARGET=demo`,
  `REQUIRE_DATABASE_TESTS=1`,
  `DATABASE_URL=$env:NEON_CA_0_4_DEMO_DATABASE_URL`

## Delivered surface

- CA-owned `ca_mutation_receipt` infrastructure table and Drizzle adapter.
- Shared platform audit and outbox adapters using `platform_audit_log` and
  `platform_domain_event`.
- CA transaction adapter with explicit commit/rollback outcome, nested
  transaction rejection, and redacted known infrastructure failure mapping.
- Organization-scoped cleanup for receipt, audit, outbox and CA legal-company
  facts used by parity tests.
- Explicit app runtime composition with no production memory fallback.

## Verification

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm --filter @afenda/corporate-administration test` with demo DB env | 0 | 16 files; 166 passed; 0 skipped |
| `pnpm --filter @afenda/corporate-administration lint` | 0 | 73 files checked |
| `pnpm --filter @afenda/corporate-administration typecheck` | 0 | package compiled |
| `pnpm --filter @afenda/web typecheck` | 0 | app composition compiled |
| `pnpm --filter @afenda/db typecheck` | 0 | DB schema compiled |
| `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts __tests__/corporate-administration-mutation-receipt-migration.test.ts` | 0 | 2 files; 18 passed |
| `pnpm --filter @afenda/events test -- __tests__/pending-appender.test.ts` | 0 | 1 file; 3 passed |

## Fourteen-boundary matrix

| # | Boundary | Status | Evidence | Remaining gap |
|---:|---|---|---|---|
| 1 | Authority and ownership | DONE | CA owns only approved `ca_*` mutation tables; platform audit/outbox remain shared | None |
| 2 | Catalog and dependency governance | DONE | Package and DB typecheck/lint lanes passed | None |
| 3 | Public package contracts | DONE | CA root and adapter subpath tests passed in package suite | None |
| 4 | Reference and peer boundaries | DONE | No peer ERP writes; shared platform contracts used | None |
| 5 | Schema and migrations | DONE | 0058/0059 applied to demo branch; DB tests passed | None |
| 6 | Tenancy and data isolation | DONE | Hard-root tests and organization-scoped cleanup passed | None |
| 7 | Authorization, approvals and SoD | DONE | Business command/query permissions introduced with fail-closed package checks during CA-0.4 vertical | None |
| 8 | Domain behavior and historical truth | DONE | Draft legal-company registration remains explicit draft; no activation claim | None |
| 9 | Idempotency, concurrency and atomicity | DONE | Required demo-branch idempotency/transaction suite passed | None |
| 10 | Events, audit and privacy | DONE | Shared audit/outbox, redaction and privacy tests passed | None |
| 11 | Adapter parity and database semantics | DONE | Memory plus Drizzle/durable suites passed | None |
| 12 | App composition and Server Actions | DONE | Web typecheck and action composition passed | None |
| 13 | UI, journeys and accessibility | DONE | Minimal legal-company draft workflow exists; web typecheck passed | None |
| 14 | Operations and production readiness | DONE | Non-production demo branch separated from production in `.env.local`; no production DB was migrated | None |

## Migration impact

Adds organization-scoped CA infrastructure and draft-company persistence used by
the greenfield module. The production `DATABASE_URL` remains unchanged; the
demo branch URL is documented for explicit per-command parity runs only.
