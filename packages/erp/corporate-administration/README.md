# `@afenda/corporate-administration`

Corporate Administration is the organization-scoped system of record for legal
entities, statutory administration, governance, corporate authority, and the
evidence supporting those facts over time.

## Authority

- [PRD.md](PRD.md) defines product scope, ownership, requirements, and acceptance.
- [DEVELOPMENT-ROADMAP.md](DEVELOPMENT-ROADMAP.md) defines sequencing, eligibility,
  and closure work.
- [IMPLEMENTATION-SLICES.md](IMPLEMENTATION-SLICES.md) defines the authorized
  controlled-beta workspace and parallel closure evidence.
- Feature operation definitions own executable command/query semantics.

The current enterprise closure matrix is exactly five `DONE` and nine non-`DONE`
rows. `CA-APP-01` may now ship the implemented cohort as a controlled beta; it
does not grant an enterprise seal, expose the `authority` capability, or
authorize new CA-FR-007 through CA-FR-013 semantics.

## Living capabilities

The implemented feature owners are:

| Feature | Capability |
| --- | --- |
| `company` | Legal-company identity, jurisdiction, names, forms, identifiers, financial years, activities, lifecycle, chronology, and completeness |
| `establishments` | Registered offices, branches, representative offices, foreign registrations, establishments, premises, and status chronology |
| `governance` | Governance bodies, memberships, roles, tenure, and voting entitlements |
| `officers` | Statutory offices, appointments, qualifications, declarations, disqualifications, conflicts, recusals, vacancy, and eligibility |
| `meetings` | Scheduling, notices, attendance, quorum, opening, adjournment, closure, and meeting queries |
| `resolutions` | Voting, written decisions, adoption/rejection/supersession, minutes references, and implementation actions |
| `authority` | Corporate authority mandates: signing authority, bank mandates, powers of attorney, delegated authority, monetary limits, and revocation |

The package also implements the canonical operation registry, authorization,
durable-command execution, idempotency, transaction, audit, outbox,
observability, opaque pagination, memory adapters, and Drizzle composition needed
by those capabilities.

Implementation does not imply enterprise closure. The authorized application slice
turns this cohort into a usable workspace while parallel evidence covers production
approval integration, adapter parity, atomicity, hostile tenant coverage,
migrations/recovery, and operations. Exact status lives only in the PRD matrix.

Planned statutory filings, legal instruments, group structure, agreements,
controlled records, work management, and assurance capabilities are defined in
the PRD but are not eligible for implementation yet. No placeholder feature
capsules exist for them.

Investor Relations owns securities, capital, investors, shareholders, holdings,
beneficial ownership, certificates, distributions, and investor communications.
Asset Management and Accounting own asset operations and financial recognition.
Corporate Administration owns only the related legal facts and governed
references described by the PRD.

## Architecture

Business behavior is organized under `src/features/<feature>`. Each feature owns
its contracts, schemas, rules, operations, narrow store capability, and memory and
Drizzle adapters. Package-wide semantic policy lives under `src/kernel`, runtime
assembly and the module manifest under `src/composition`, and isolated test
capabilities under `src/testing`.

The package exposes one business capability style through
`createCorporateAdministrationRuntime`. The private command/query kernels derive
permission, approval, transaction, idempotency, audit, emission, privacy, and
observability behavior from canonical operation definitions. Domain handlers do
not reinterpret shared execution policy or depend on the composite package store.

Approval-required behavior fails closed. Application composition must not install
an allow-all, synthetic, or CA-local approval verifier. A production verifier can
be integrated only after `PLATFORM-APPROVALS-01` publishes the canonical platform
contract.

All organization and actor identities are trusted server facts. Browser input
cannot replace them. The package is the only business mutator of `ca_*` state;
shared audit and pending-event infrastructure remain platform-owned.

## Lifecycle

The module manifest remains:

```ts
lifecycle: "scaffolded";
activationMode: "organization_toggle";
```

Durable persistence and implemented feature behavior do not activate the module
or imply incorporation, production migration approval, or enterprise readiness.

## Public exports

- `@afenda/corporate-administration` — permanent business facade and durable
  contracts
- `@afenda/corporate-administration/module-manifest` — governed manifest
- `@afenda/corporate-administration/adapters/drizzle` — application composition
  factories and structural dependency contracts
- `@afenda/corporate-administration/testing` — non-production fixtures, parity
  harnesses, and memory stores

Consumers must not deep-import `src/*`, concrete adapters, feature stores,
registry representation, or database structure.

## Validation

```powershell
pnpm --filter @afenda/corporate-administration check
```

Neon parity requires an explicitly isolated non-production target:

```powershell
$env:DATABASE_URL="<isolated-preview-connection>"
$env:AFENDA_DATABASE_TEST_TARGET="preview"
$env:REQUIRE_DATABASE_TESTS="1"
pnpm test:corporate-administration:parity
```

Database evidence must record the branch/schema identity with secrets redacted.
This package mission does not authorize applying migrations 0034–0046 and 0050.
