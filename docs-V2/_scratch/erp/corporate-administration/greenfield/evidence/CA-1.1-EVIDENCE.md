# CA-1.1 — Evidence

## Result

`DONE` — legal-company registry and jurisdiction-profile behavior is proven
through package contracts, Drizzle/memory parity, web Action/UI wiring,
governance registers and the non-production Neon demo branch.

## Demo branch

- Project: `young-hat-54755363`
- Branch name: `ca-0-4-demo`
- Branch ID: `br-fragrant-morning-aoywrnzr`
- Parent production branch: `br-tiny-hill-ao82jp6f`
- Local env documentation: `.env.local` keys `NEON_CA_0_4_DEMO_*`
- Required DB test environment:
  `AFENDA_DATABASE_TEST_TARGET=demo`,
  `REQUIRE_DATABASE_TESTS=1`,
  `DATABASE_URL=$env:NEON_CA_0_4_DEMO_DATABASE_URL`

## Delivered surface

- `ca_legal_company` draft registry remains explicit draft-only.
- `ca_company_jurisdiction_profile` stores effective/recorded jurisdiction facts.
- DB exclusion constraint prevents overlapping active jurisdiction profiles.
- Commands: `updateLegalCompanyProfile`, `setCompanyJurisdictionProfile`,
  `supersedeCompanyJurisdictionProfile`.
- Queries: `getLegalCompany`, `listLegalCompanies`,
  `findCompanyJurisdictionProfileAsOf`, `getLegalCompanyTimeline`.
- Events:
  `corporate_administration.legal_company.profile_updated.v1`,
  `corporate_administration.legal_company.jurisdiction_profile_set.v1`.
- Web Actions/UI: draft registration and jurisdiction-profile setting through
  session-stamped, permission-gated Server Actions.

## Verification

| Command | Exit | Evidence |
|---|---:|---|
| `pnpm --filter @afenda/corporate-administration test` with demo DB env | 0 | 16 files; 167 passed; 0 skipped |
| `pnpm --filter @afenda/corporate-administration test -- __tests__/legal-company-drizzle-parity.test.ts __tests__/company-contract.test.ts` | 0 | 1 file passed, 1 skipped without DB env; 8 passed, 3 skipped |
| `pnpm --filter @afenda/corporate-administration typecheck` | 0 | package compiled |
| `pnpm --filter @afenda/web typecheck` | 0 | app Action/UI composition compiled |
| `pnpm --filter @afenda/web test -- __tests__/product-authorization-wiring.test.ts` | 0 | 1 file; 12 passed |
| `pnpm --filter @afenda/db typecheck` | 0 | DB schema compiled |
| `pnpm --filter @afenda/events test` | 0 | 8 files; 42 passed |
| `pnpm validate:modules --write` | 0 | generated registers written and matched |
| `pnpm governance:packages` | 0 | module/catalog/DAG/sole-mutator governance passed |

## Fourteen-boundary matrix

| # | Boundary | Status | Evidence | Remaining gap |
|---:|---|---|---|---|
| 1 | Authority and ownership | DONE | CA owns only registered `ca_*` mutation tables; Master Data party remains referenced by port | None |
| 2 | Catalog and dependency governance | DONE | Manifest, generated registers and governance package gate passed | None |
| 3 | Public package contracts | DONE | Schemas, types, commands, queries and `./testing` test facade compile | None |
| 4 | Reference and peer boundaries | DONE | Party and jurisdiction facts use ports; no peer ERP writes | None |
| 5 | Schema and migrations | DONE | 0059, 0060 and 0061 applied to demo branch; overlap constraint present | None |
| 6 | Tenancy and data isolation | DONE | Organization-scoped stores, cleanup and hard-root tests passed | None |
| 7 | Authorization, approvals and SoD | DONE | `company.read`/`company.manage` fail-closed guards and web wiring test passed | None |
| 8 | Domain behavior and historical truth | DONE | Effective-range, as-of, known-at, supersession and timeline tests passed | None |
| 9 | Idempotency, concurrency and atomicity | DONE | Demo Neon same-TX receipt/audit/outbox and overlap race test passed | None |
| 10 | Events, audit and privacy | DONE | Registered events, redacted payload assertions and platform audit/outbox tests passed | None |
| 11 | Adapter parity and database semantics | DONE | Memory/Drizzle contract and demo Neon parity tests passed | None |
| 12 | App composition and Server Actions | DONE | Session-stamped Actions use production CA ports and ActionResult mapping | None |
| 13 | UI, journeys and accessibility | DONE | Client workspace has labeled draft registration and jurisdiction-profile forms with permission-disabled states | None |
| 14 | Operations and production readiness | DONE | Demo branch separated from production; migration 0061 rehearsed outside production | None |

## Migration impact

Adds a DB-level exclusion constraint for active jurisdiction-profile overlap.
This is an expand-only migration for the CA demo branch. Production branch was
not targeted in this evidence run.

## Next eligible slice

`CA-1.2` — Effective legal names and legal forms.
