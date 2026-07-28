# CA-1.2 - Evidence

## Result

`PARTIAL` - effective legal names and legal-form history are implemented in the
package and exercised by demo-branch package tests and focused CA web tests. The
slice is not `DONE` because complete 14-boundary product evidence, including
authenticated journey and accessibility closure, is not yet recorded for this
slice.

## Current audit - 2026-07-28

| Command | Exit | Evidence |
|---|---:|---|
| demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` + `pnpm --filter @afenda/corporate-administration check` | 0 | 145 files checked; typecheck green; 54 test files passed; 268 tests passed |
| `pnpm --filter @afenda/corporate-administration check` | 0 | 152 files checked; typecheck green; 46 files passed, 11 skipped; 240 tests passed, 34 skipped |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration/phase-1-real-package.journey.test.ts` | 0 | 1 file passed; 1 test passed; uses real CA package commands with app-composed dependencies to seed legal name and legal form, reload persisted state and activate through the lifecycle Server Action |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration __tests__/corporate-administration-legal-company-actions.test.ts __tests__/corporate-administration-company-identity-actions.test.ts __tests__/corporate-administration-jurisdiction-profile-form.test.ts` | 0 | 20 files passed; 64 tests passed; includes `company-name-legal-form.journey.test.ts` for authenticated name/legal-form workflow, persisted reload rendering, unauthorized denial and validation feedback |
| `pnpm --filter @afenda/web typecheck` | 0 | web TypeScript gate green |
| `pnpm --filter @afenda/db db:migration-status` against demo `DATABASE_URL` | 0 | 28 journal entries, 5 DB ledger rows, applied through `0026_ca_recorded_range_zero_width`, 24 pending forward |

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

Record complete 14-boundary product evidence before promoting CA-1.2 to `DONE`.
Focused app journey evidence exists, and the real-package Phase 1 journey now
proves app-composed package commands persist legal-name and legal-form state
before activation. Browser-authenticated/Neon-backed journey proof, any required
Neon race/failure evidence and the full 14-boundary phase-close matrix still
need to be recorded. The previous demo-branch `ca_company_activity` blocker is
resolved for the CA package check; later pending forward migrations remain
outside this CA backend lane.
