# CA-2.3 Evidence — Officer Declarations, Disqualifications and Conflicts

Date: 2026-07-28

## Implementation

- Added CA-owned tables: `ca_officer_declaration`, `ca_officer_disqualification`, `ca_conflict_disclosure`.
- Added officer compliance schemas, rules, commands, queries, store contracts, memory adapter and Drizzle adapter in `@afenda/corporate-administration`.
- Added command/query/permission/event/module manifest wiring for declaration, disqualification, conflict and recusal workflows.
- Added hard-tenant-root registration and null-org audit mirror entries for the three CA-2.3 tables.

## Verification

- `pnpm --filter @afenda/corporate-administration test -- __tests__/officers/ca-2.3-compliance-contract-and-memory.test.ts`
  - 1 file passed
  - 4 tests passed
- `pnpm --filter @afenda/corporate-administration check`
  - lint passed
  - typecheck passed
  - 49 test files passed, 11 skipped
  - 255 tests passed, 34 skipped
- `pnpm --filter @afenda/db lint`
  - passed
- `pnpm --filter @afenda/db typecheck`
  - passed
- `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts`
  - 1 file passed
  - 14 tests passed

## Boundary Coverage

- Officer eligibility is resolved from required declaration coverage and active disqualification state.
- Sensitive declaration and conflict detail is stored by reference/masked summary; event payloads carry classification/status only.
- Conflict disclosures and recusals require a typed matter link to a meeting, resolution, transaction or corporate action.
- Active disqualifications are listed deterministically and block eligibility as-of the effective date.
- Declaration expiry reminder eligibility is deterministic and tenant isolated.
