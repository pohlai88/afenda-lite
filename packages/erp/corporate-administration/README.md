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
  CA-owned backend lanes are green against the repaired demo branch, and the
  demo ledger is proven through `0026_ca_recorded_range_zero_width` as recorded
  in `CA-1.4-EVIDENCE.md`.

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

The root exposes one runtime factory, `createCorporateAdministrationRuntime`.
After parsing and before any domain read, a private command capability derives
the required permission from the operation registry and returns a registry-bound
authorization token. The internal durable kernel accepts that token as its only
source of operation identity and request facts; callers cannot authorize one
operation and persist, audit, emit or observe another. The kernel then owns
approval checks, idempotency reservation, transaction execution, audit
recording, outbox append and idempotency completion. Domain handlers supply
domain behavior; they do not reinterpret shared execution policy or depend on
another domain's store contract.

Approval semantics are registry-owned and evaluated by the command kernel:
optional approval is enforced whenever a verifier is configured, legal-company
lifecycle transitions always require a verified maker-checker decision, and
officer appointment requires one when the resolved statutory office is a
protected role. Required approval fails closed when the verifier, binding IDs,
tenant/fingerprint match, affirmative decision or independent approver is
missing. Application composition does not install an allow-all or synthetic
approval verifier.

Operation diagnostics are registry-driven and emitted once by the private
command and query kernels. Every accepted operation invocation records a
terminal `success`, governed `failure` with its canonical error code, or
redacted `exception` observation. The private query kernel also owns the
registry-ID-to-permission decision; query facades retain input parsing and
domain behavior but cannot interpret authorization policy.
The required runtime observability port is implemented at the application
composition root through `@afenda/logger`; package code does not depend on the
logger implementation or expose tenant, actor, payload, approval, SQL or stack
data through the observation contract.

Operation meaning is owned by the domain operation definitions composed into
the canonical registry. Command/query identifiers, permissions, registered
events and manifest inventories derive from that registry. Application
consumers request a permission through
`corporateAdministrationPermissionFor(operationId)` and cannot consume the
registry's internal permission maps or low-level permission guard from the
package root.

The package owns `ca_*` mutation tables only through its stores and adapters.
Shared audit and pending-event infrastructure remains platform-owned.

## Public exports

- `@afenda/corporate-administration` — package contracts, domain commands,
  queries and runtime contracts
- `@afenda/corporate-administration/module-manifest` — governed manifest
- `@afenda/corporate-administration/adapters/drizzle` — production adapter
  factories and structural dependency contracts for app composition; concrete
  adapter classes remain private implementation details
- `@afenda/corporate-administration/testing` — non-production fixtures, parity
  harnesses and memory stores

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
