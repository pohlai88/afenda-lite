# Phase 0 — Architecture and Foundation

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 0` |
| Initial status | `OPEN` |
| Slice count | 4 |
| Outcome | Create the package, close authority and dependency decisions, and establish durable transaction, idempotency, audit and outbox infrastructure without activating business capability. |

## Execution controls

1. Execute slices strictly in the listed order.
2. Treat the module as greenfield; do not import completion claims from removed code.
3. Inspect current repository instructions, manifests, schemas, migrations and working-tree changes before editing.
4. Implement one vertical slice completely across package, database, events, app composition, Actions, UI and tests where the slice requires those layers.
5. Preserve unrelated working-tree changes. Do not commit or push unless explicitly requested.
6. A required unavailable external lane is `BLOCKED`, not passed.
7. Stop after the selected slice and return the handoff defined in `90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md`.

## Slice summary

| Slice | Title | Depends on | Status |
|---|---|---|---|
| CA-0.1 | Authority, catalog and package scaffold | None | DONE |
| CA-0.2 | Core contracts and future catalog design | CA-0.1 | DONE |
| CA-0.3 | Runtime composition and mutation contracts | CA-0.2 | DONE |
| CA-0.4 | Durable infrastructure adapters and package boundaries | CA-0.3 | DONE |

## CA-0.1 — Authority, catalog and package scaffold

**Status:** `DONE`
**Depends on:** None  
**Goal:** Register the greenfield bounded context before domain coding and create a minimal buildable package with no fabricated behavior.

**Completion evidence:** Package scaffold, module identity, empty runtime permissions, behavior-free manifest and package-boundary tests are implemented in `packages/erp/corporate-administration`. Verified with `pnpm --filter @afenda/corporate-administration lint`, `typecheck` and `test`.

### Authoritative surface

- **Tables:** None
- **Commands:** None
- **Queries:** None
- **Events:** None

### Binding rules

- Create `packages/erp/corporate-administration` with published name `@afenda/corporate-administration`, manifest id `corporate-administration`, category `erp`, activation mode `organization_toggle`, lifecycle `scaffolded` and table prefix `ca_*`.
- Register the module roadmap, workspace edges, schema-ownership reservation and package catalog through their owning generators or governed files.
- Declare only approved platform dependencies; do not add lateral peer-ERP imports.
- Record the intended domain folder structure, create the package exports map and package README, and add physical domain folders only when a slice supplies real files—never placeholders or fake success.

### Required evidence

- Package lint/typecheck with zero placeholder behavior
- Module manifest/catalog validation
- Workspace-edge and package-governance gates
- Root-barrel import-boundary test

### Paste-ready Codex prompt

```text
Execute CA-0.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Register the greenfield bounded context before domain coding and create a minimal buildable package with no fabricated behavior.

Authoritative tables/surfaces: None.
Commands: None.
Queries: None.
Events: None.

Implement the slice as a production vertical. Apply these binding rules:
- Create `packages/erp/corporate-administration` with published name `@afenda/corporate-administration`, manifest id `corporate-administration`, category `erp`, activation mode `organization_toggle`, lifecycle `scaffolded` and table prefix `ca_*`.
- Register the module roadmap, workspace edges, schema-ownership reservation and package catalog through their owning generators or governed files.
- Declare only approved platform dependencies; do not add lateral peer-ERP imports.
- Record the intended domain folder structure, create the package exports map and package README, and add physical domain folders only when a slice supplies real files—never placeholders or fake success.

Add direct evidence for:
- Package lint/typecheck with zero placeholder behavior
- Module manifest/catalog validation
- Workspace-edge and package-governance gates
- Root-barrel import-boundary test

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-0.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

The package builds, is cataloged as scaffolded, has an approved dependency/ownership plan, and exposes no nonexistent capability.

## CA-0.2 — Core contracts and future catalog design

**Status:** `DONE`
**Depends on:** CA-0.1
**Goal:** Define stable greenfield contracts and retain future authorization design without activating unused permissions or ports.

**Completion evidence:** CA-0.2 kernel contracts are implemented for branded identifiers, canonical dates, decimals, effective ranges, canonical JSON/fingerprints, normalized codes, cursor pagination, governed errors, event-type identity, authorization, command/query options, the minimal `ClockPort`, behavior-free manifest and explicit public barrel. Runtime permissions, command IDs, query IDs, business events and manifest dependency surfaces remain empty. Verified with `pnpm --filter @afenda/corporate-administration lint`, `typecheck` and `test`.

### Authoritative surface

- **Tables:** None
- **Commands:** No business command; contract-only surface
- **Queries:** No business query; contract-only surface
- **Events:** Event naming/versioning helpers only

### Binding rules

- Create branded IDs, command/query options, authorization context, canonical date/decimal/code helpers, pagination, fingerprinting and tenant-safe error types.
- Keep the runtime permission catalog empty until a command/query slice activates a specific permission with coverage tests.
- Retain proposed permission names only in `FUTURE-PERMISSION-CATALOG.md`.
- Introduce integration ports only with the consuming command/query slice; CA-0.1/CA-0.2 must not publish speculative reference ports.
- Define the minimum semantic error catalog and forbid HTTP or Next.js concepts in the package.
- Keep production adapters and test-only utilities out of the root barrel.

### Required evidence

- Zod schema and brand tests
- Canonical serialization/fingerprint vectors
- Decimal/date/effective-range unit tests
- Empty runtime permission catalog scaffold
- Forbidden import and public-export tests

### Paste-ready Codex prompt

```text
Execute CA-0.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Define stable greenfield contracts and retain future authorization design without activating unused permissions or ports.

Authoritative tables/surfaces: None.
Commands: No business command; contract-only surface.
Queries: No business query; contract-only surface.
Events: Event naming/versioning helpers only.

Implement the slice as a production vertical. Apply these binding rules:
- Create branded IDs, command/query options, authorization context, canonical date/decimal/code helpers, pagination, fingerprinting and tenant-safe error types.
- Keep the runtime permission catalog empty until a command/query slice activates a specific permission with coverage tests.
- Retain proposed permission names only in `FUTURE-PERMISSION-CATALOG.md`.
- Introduce integration ports only with the consuming command/query slice; CA-0.1/CA-0.2 must not publish speculative reference ports.
- Define the minimum semantic error catalog and forbid HTTP or Next.js concepts in the package.
- Keep production adapters and test-only utilities out of the root barrel.

Add direct evidence for:
- Zod schema and brand tests
- Canonical serialization/fingerprint vectors
- Decimal/date/effective-range unit tests
- Empty runtime permission catalog scaffold
- Forbidden import and public-export tests

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-0.2 DONE only when its 14-boundary matrix is complete and the runtime catalog remains empty unless a consuming command/query is implemented. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Contracts compile, fingerprints are stable, future permissions are documented only as design, the runtime permission catalog is empty, and no package-layer boundary is violated.

## CA-0.3 — Runtime composition and mutation contracts

**Status:** `DONE`
**Depends on:** CA-0.2  
**Goal:** Define the fail-fast composed runtime and package-neutral transaction, idempotency, audit and pending-event contracts used by durable adapters.

### Authoritative surface

- **Tables:** None
- **Commands:** None
- **Queries:** None
- **Events:** Generic pending-event envelope only; no event catalog activation

### Binding rules

- Validate required runtime ports structurally without invoking them.
- Keep request facts separate from composed infrastructure.
- Use explicit commit/rollback transaction outcomes and prohibit nested transactions.
- Define organization/command/key-scoped idempotency with opaque reservation ownership.
- Keep all memory implementations inside test locations; production has no fallback.
- Keep environment access, database clients and adapter construction outside the package root composition validator.

### Required evidence

- Runtime rejects incomplete, unknown and unsupported dependency shapes.
- Runtime construction invokes no port methods and returns a readonly object.
- Transaction and idempotency contracts cover governed outcomes and stale ownership.
- Root exports expose stable contracts without implementation or database types.

### Exit gate

Application composition can supply complete infrastructure explicitly, and invalid wiring fails before any command or database operation begins.

## CA-0.4 — Durable infrastructure adapters and package boundaries

**Status:** `DONE`
**Depends on:** CA-0.3  
**Goal:** Persist infrastructure facts durably while proving that Corporate Administration still exposes no business capability.

**Completion evidence:** Local contracts, adapters, schema, migrations,
boundary tests and required Neon lanes passed on the explicit CA-0.4 demo
branch `br-fragrant-morning-aoywrnzr` with `REQUIRE_DATABASE_TESTS=1` and
zero skipped CA package tests.

### Authoritative surface

- **CA-owned tables:** `ca_mutation_receipt`
- **Shared platform tables used:** `platform_audit_log`, `platform_domain_event`
- **Commands:** None
- **Queries:** None
- **Permissions:** None
- **Business events:** None

### Binding rules

- Persist pending generic event envelopes only; do not publish, dispatch, retry, consume or activate event types.
- Use the shared platform audit facility. Do not create a CA audit table, snapshots, legal-company fields, unrestricted metadata, external transport or viewer.
- Require explicit durable adapter dependencies. Do not create database clients, read environment variables, install fallbacks or hide singleton connections inside the CA package or app factory.
- Translate idempotency conflict, stale reservation, unique conflict, database unavailability, transaction failure, serialization failure and known database-internal failure without exposing SQL or connection details. Programming errors remain observable exceptions.
- Keep `owns.aggregates`, commands, queries, permissions, authorization maps and manifest event lists empty.
- Register only `ca_mutation_receipt` as CA mutation ownership. Shared platform audit/outbox tables retain platform ownership.
- Keep the public root free of Drizzle adapters, database handles, tables, migrations, cleanup helpers and test doubles. Expose production adapters only through the declared adapter subpath.
- Keep cleanup organization-scoped, constraint-safe and complete for all three infrastructure tables.
- Prohibit executable business paths and peer ERP, UI, HTTP, event-bus, object-storage, signature and search dependencies.

### Required evidence

- Memory and Neon idempotency reservation, completion, release and replay contract.
- Real overlapping Neon first-reservation concurrency with exactly one acquisition and one row.
- Transaction-scoped pending outbox append with rollback and partial-failure evidence.
- Shared audit fact shape and sensitive metadata rejection.
- Migration, schema ownership, hard-tenancy and cleanup coverage.
- Production composition and package-boundary tests proving explicit dependencies and no business activation.

### Exit gate

The package can validate and compose durable idempotency, transaction, audit and pending-outbox adapters with no business aggregate or application workflow activated.

## Phase-close rule

Phase 0 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon lanes are green, and no required test is skipped or blocked. Action, UI and authenticated business-journey evidence are `NOT_APPLICABLE` because Phase 0 explicitly prohibits business capability.
