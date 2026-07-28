# CA-2.5 Evidence — Votes, Resolutions, Minutes and Implementation Actions

Date: 2026-07-28

## Implementation

- Added CA-owned tables: `ca_meeting_vote`, `ca_resolution`, `ca_resolution_action`.
- Added `@afenda/corporate-administration` resolution subdomain with strict schemas, vote/resolution rules, commands, queries, store contracts, memory adapter and Drizzle adapter.
- Added command/query/permission/event/module manifest wiring for meeting votes, adopted/rejected/written resolutions, supersession, minutes documents and resolution implementation actions.
- Added hard-tenant-root registration and null-org audit mirror entries for the three CA-2.5 tables.

## Verification

- `pnpm --filter @afenda/corporate-administration test -- __tests__/resolutions/ca-2.5-resolutions-contract-and-memory.test.ts`
  - 1 file passed
  - 3 tests passed
- `pnpm --filter @afenda/corporate-administration check`
  - lint passed
  - typecheck passed
  - 51 test files passed, 11 skipped
  - 261 tests passed, 34 skipped
- `pnpm --filter @afenda/db lint`
  - passed
- `pnpm --filter @afenda/db typecheck`
  - passed
- `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts`
  - 1 file passed
  - 14 tests passed

## Boundary Coverage

- Vote arithmetic for simple-majority, supermajority, unanimous and invalid overcast votes.
- Resolution chronology, approval basis, written-resolution threshold and supersession retention.
- Resolution action due/overdue detection and completion evidence.
- Minutes document recording with optimistic version protection.
- Tenant isolation in memory store and hard-tenant-root DB inventory.
