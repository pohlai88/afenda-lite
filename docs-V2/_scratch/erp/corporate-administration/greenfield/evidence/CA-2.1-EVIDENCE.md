# CA-2.1 Evidence — Governance Bodies And Memberships

Status: DONE
Date: 2026-07-28

## Implemented

- Added CA-owned governance persistence tables:
  - `ca_governance_body`
  - `ca_governance_membership`
- Added package governance subdomain:
  - schemas, types, rules, store contracts
  - governed commands and queries
  - memory and Drizzle adapters
  - mutation table, manifest, permission, event and public export wiring
- Added hard-tenant-root inventory entries for both governance tables.

## Acceptance Evidence

- `pnpm --filter @afenda/corporate-administration test -- __tests__/governance/ca-2.1-contract-and-memory.test.ts`
  - 1 file passed
  - 4 tests passed
- `pnpm --filter @afenda/corporate-administration check`
  - lint passed
  - typecheck passed
  - 47 files passed, 11 skipped
  - 246 tests passed, 34 skipped

## Covered Boundaries

- Strict command input excludes tenant and actor fields.
- Governance body code normalization is deterministic.
- Body effective range bounds membership terms.
- Duplicate active body natural keys are rejected per tenant/company.
- Concurrent chair overlap and duplicate active member seats are rejected.
- Governance body and membership memory stores preserve tenant isolation.
- Membership as-of reads respect term start/end lifecycle.
- Manifest, mutation ownership, event types and authorization catalogs include CA-2.1.

## Remaining Phase 2 Scope

Phase 2 remains OPEN. CA-2.2 through CA-2.5 are not implemented by this evidence file.
