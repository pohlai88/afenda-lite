# `@afenda/corporate-administration`

Corporate Administration is an organization-scoped greenfield bounded context.
Phase 0 is closed. The package remains governed by the greenfield roadmap under
`docs-V2/_scratch/erp/corporate-administration/greenfield`.

## Slice position

- CA-0.1 established package identity, authority, exports and the reserved
  `ca_*` namespace.
- CA-0.2 established canonical kernel contracts and fail-closed execution
  context contracts.
- CA-0.3 established application runtime infrastructure.
- CA-0.4 established durable idempotency, transaction, shared audit/outbox and
  the first narrow draft-company persistence path. Required Neon parity ran on
  demo branch `br-fragrant-morning-aoywrnzr`.
- CA-1.1 established legal-company registry and jurisdiction-profile behavior.
- CA-1.2 implements effective legal names and legal forms, but the slice is not
  `DONE` until current demo-branch Neon parity is re-established.
- CA-1.3 implements authority-aware identifiers, financial-year history and
  activity classifications, but the slice is not `DONE` until current
  demo-branch Neon parity is re-established.
- CA-1.4 implements registered offices, legal establishments and premises. Its
  CA-owned backend lanes are green against the repaired demo branch, but slice
  closure is blocked by the demo branch pending-forward migration ledger state
  recorded in `CA-1.4-EVIDENCE.md`.

## Lifecycle

The module manifest must remain:

```ts
lifecycle: "scaffolded";
activationMode: "organization_toggle";
```

Durable persistence and draft registration do not activate the full Corporate
Administration module or imply incorporation/production legal capability.

## Execution model

Corporate Administration uses the composed-service model. Runtime ports are
constructed at the app composition root and validated by the package. Per-call
options carry request facts only: organization, actor, correlation,
authorization, idempotency key and optional causation.

The package owns `ca_*` mutation tables only through its stores and adapters.
Shared audit and pending-event infrastructure remains platform-owned.

## Public exports

- `@afenda/corporate-administration` — package contracts, domain commands,
  queries and runtime contracts
- `@afenda/corporate-administration/module-manifest` — governed manifest
- `@afenda/corporate-administration/adapters/drizzle` — production adapter
  factories for app composition
- `@afenda/corporate-administration/adapters/memory` — non-production parity
  stores

Consumers must not deep-import `src/*`.

## Validation

```powershell
pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test
```

Required Neon parity uses the documented CA demo branch from `.env.local`:

```powershell
$env:DATABASE_URL=$env:NEON_CA_0_4_DEMO_DATABASE_URL
$env:AFENDA_DATABASE_TEST_TARGET="demo"
$env:REQUIRE_DATABASE_TESTS="1"
pnpm --filter @afenda/corporate-administration test
```
