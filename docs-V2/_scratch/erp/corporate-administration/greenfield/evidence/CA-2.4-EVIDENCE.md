# CA-2.4 Evidence — Meetings, Notices, Participants and Quorum

Date: 2026-07-28

## Implementation

- Added CA-owned tables: `ca_governance_meeting`, `ca_meeting_notice`, `ca_meeting_participant`, `ca_meeting_quorum_result`.
- Added `@afenda/corporate-administration` meeting subdomain with strict schemas, rules, commands, queries, store contracts, memory adapter and Drizzle adapter.
- Added command/query/permission/event/module manifest wiring for scheduling, notice, attendance, opening, quorum, adjournment and closing workflows.
- Added hard-tenant-root registration and null-org audit mirror entries for the four CA-2.4 tables.

## Verification

- `pnpm --filter @afenda/corporate-administration test -- __tests__/meetings/ca-2.4-meetings-contract-and-memory.test.ts`
  - 1 file passed
  - 3 tests passed
- `pnpm --filter @afenda/corporate-administration check`
  - lint passed
  - typecheck passed
  - 50 test files passed, 11 skipped
  - 258 tests passed, 34 skipped
- `pnpm --filter @afenda/db lint`
  - passed
- `pnpm --filter @afenda/db typecheck`
  - passed
- `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts`
  - 1 file passed
  - 14 tests passed

## Boundary Coverage

- Physical, virtual, hybrid and written-resolution meeting procedure contracts.
- Notice period and waiver evidence, including stale-version protection.
- Membership-as-of attendance eligibility through governance membership history.
- Immutable quorum rule snapshot with deterministic eligible/present/required counts.
- Tenant isolation in memory store and hard-tenant-root DB inventory.
