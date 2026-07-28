# CA-1.3 - Evidence

## Result

`PARTIAL` - non-tax identifiers, financial-year history and activity
classification are implemented in the package and exercised by local package
tests and focused CA web tests. The slice is not `DONE` because complete
14-boundary product evidence, including authenticated journey and accessibility
closure, is not yet recorded for this slice.

## Current audit - 2026-07-28

| Command | Exit | Evidence |
|---|---:|---|
| demo `DATABASE_URL`, `REQUIRE_DATABASE_TESTS=1`, `AFENDA_DATABASE_TEST_TARGET=demo` + `pnpm --filter @afenda/corporate-administration check` | 0 | 145 files checked; typecheck green; 54 test files passed; 268 tests passed |
| `pnpm --filter @afenda/corporate-administration check` | 0 | 152 files checked; typecheck green; 46 files passed, 11 skipped; 240 tests passed, 34 skipped |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration/phase-1-real-package.journey.test.ts` | 0 | 1 file passed; 1 test passed; uses real CA package commands with app-composed dependencies to seed identifier, financial year and activity state, reload persisted state and activate through the lifecycle Server Action |
| `pnpm --filter @afenda/web test -- __tests__/corporate-administration __tests__/corporate-administration-legal-company-actions.test.ts __tests__/corporate-administration-company-identity-actions.test.ts __tests__/corporate-administration-jurisdiction-profile-form.test.ts` | 0 | 20 files passed; 64 tests passed; includes `company-identity-ca-1-3.journey.test.ts` for authenticated identifier, financial-year and activity workflow, persisted reload rendering, tax-boundary rejection, duplicate conflict feedback and unauthorized denial |
| `pnpm --filter @afenda/web typecheck` | 0 | web TypeScript gate green |
| `pnpm --filter @afenda/db db:migration-status` against demo `DATABASE_URL` | 0 | 28 journal entries, 5 DB ledger rows, applied through `0026_ca_recorded_range_zero_width`, 24 pending forward |

## Delivered surface on disk

- Tables in schema source: `ca_company_identifier`,
  `ca_company_financial_year`, `ca_company_activity`.
- Commands: `registerCompanyIdentifier`, `supersedeCompanyIdentifier`,
  `retireCompanyIdentifier`, `setCompanyFinancialYear`,
  `registerCompanyActivity`, `endCompanyActivity`.
- Queries: `listCompanyIdentifiers`, `findCompanyIdentifierAsOf`,
  `findCompanyFinancialYearAsOf`, `listCompanyActivitiesAsOf`.
- Events in manifest:
  `corporate_administration.legal_company.identifier_registered.v1`,
  `corporate_administration.legal_company.financial_year_set.v1`,
  `corporate_administration.legal_company.activity_registered.v1`.

## Remaining gap

Record complete 14-boundary product evidence before promoting CA-1.3 to `DONE`.
Focused app journey evidence exists, and the real-package Phase 1 journey now
proves app-composed package commands persist identifier, financial-year and
activity state before activation. Browser-authenticated/Neon-backed journey
proof, any required Neon race/failure evidence and the full 14-boundary
phase-close matrix still need to be recorded. The previous demo-branch
`ca_company_activity` blocker is resolved for the CA package check; later
pending forward migrations remain outside this CA backend lane.
