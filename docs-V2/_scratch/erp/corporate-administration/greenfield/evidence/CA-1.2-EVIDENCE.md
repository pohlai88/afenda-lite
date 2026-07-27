# CA-1.2 - Evidence

## Result

`PARTIAL` - effective legal names and legal-form history are implemented in the
package and exercised by local package tests and focused CA web tests. The slice
is not `DONE` because current full demo-branch Neon parity fails before the
CA-1.2 database/concurrency/failure assertions can complete.

## Current audit - 2026-07-28

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm --filter @afenda/corporate-administration check` | 0 | 145 files checked; typecheck green; 44 test files passed, 10 skipped; 236 tests passed, 32 skipped |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration` | 0 | 16 files passed; 55 tests passed |
| full CA package test with demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1` and `AFENDA_DATABASE_TEST_TARGET=demo` | 1 | 12 files failed; 31 tests failed because demo branch lacks `ca_company_activity` |
| `pnpm --filter @afenda/db db:migration-status` against demo `DATABASE_URL` | 0 | 26 journal entries, 1 DB ledger row, 26 pending forward |

## Delivered surface on disk

- Tables in schema source: `ca_company_name`,
  `ca_company_legal_form_history`.
- Commands: `addCompanyName`, `supersedeCompanyName`, `retireCompanyName`,
  `setCompanyLegalForm`, `supersedeCompanyLegalForm`.
- Queries: `listCompanyNames`, `findCompanyNameAsOf`,
  `findCompanyLegalFormAsOf`.
- Events in manifest: `corporate_administration.legal_company.name_added.v1`,
  `corporate_administration.legal_company.name_superseded.v1`,
  `corporate_administration.legal_company.legal_form_changed.v1`.

## Remaining gap

Restore current demo-branch schema/ledger parity through the governed DB lane and
rerun the full demo Neon package tests before promoting CA-1.2 to `DONE`.

