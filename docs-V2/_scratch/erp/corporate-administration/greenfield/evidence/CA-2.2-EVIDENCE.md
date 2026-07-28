# CA-2.2 Evidence — Statutory Offices, Appointments, Qualifications and Consent

Date: 2026-07-28

## Implementation

- Added CA-owned tables: `ca_statutory_office`, `ca_officer_appointment`, `ca_officer_qualification`.
- Added `@afenda/corporate-administration` officer subdomain with strict schemas, commands, queries, rules, store contracts, memory adapter and Drizzle adapter.
- Added command/query/permission/event/module manifest wiring for statutory office and officer appointment workflows.
- Added hard-tenant-root registration and null-org audit mirror entries for the three CA-2.2 tables.

## Verification

- `pnpm --filter @afenda/corporate-administration test -- __tests__/officers/ca-2.2-contract-and-memory.test.ts`
  - 1 file passed
  - 5 tests passed
- `pnpm --filter @afenda/corporate-administration check`
  - lint passed
  - typecheck passed
  - 48 test files passed, 11 skipped
  - 251 tests passed, 34 skipped
- `pnpm --filter @afenda/db typecheck`
  - passed
- `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts`
  - 1 file passed
  - 14 tests passed

## Boundary Coverage

- Required office and deterministic vacancy/grace-period logic.
- Officer appointment consent/source evidence and person-party compatibility.
- Appointment chronology and overlapping/max-holder conflict checks.
- Qualification issuer, validity range and verification status checks.
- Protected-role approval segregation through the CA approval decision port.
- Tenant isolation in the memory store and hard-tenant-root DB inventory.
