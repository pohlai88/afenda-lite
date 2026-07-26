# Phase 0 — Architecture and Foundation

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 0` |
| Initial status | `OPEN` |
| Slice count | 4 |
| Outcome | Create the package, close authority and dependency decisions, establish the transactional kernel, and prove one thin production-composed legal-company vertical. |

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
| CA-0.2 | Core contracts, permissions, errors and reference ports | CA-0.1 | DONE |
| CA-0.3 | Database foundation and atomic mutation kernel | CA-0.2 | OPEN |
| CA-0.4 | First thin vertical — draft legal-company registration | CA-0.3 | OPEN |

## CA-0.1 — Authority, catalog and package scaffold

**Status:** `DONE`
**Depends on:** None  
**Goal:** Register the greenfield bounded context before domain coding and create a minimal buildable package with no fabricated behavior.

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

## CA-0.2 — Core contracts, permissions, errors and reference ports

**Status:** `DONE`
**Depends on:** CA-0.1
**Goal:** Define the stable greenfield contracts used by every later vertical.

### Authoritative surface

- **Tables:** None
- **Commands:** No business command; contract-only surface
- **Queries:** No business query; contract-only surface
- **Events:** Event naming/versioning helpers only

### Binding rules

- Create branded IDs, command/query options, authorization context, canonical date/decimal/code helpers, pagination, fingerprinting and tenant-safe error types.
- Create the initial permission catalog and machine-checkable command/query-to-permission registry.
- Define `PartyReferencePort`, `TaxRegistrationReadPort`, `ReferenceDataPort`, `ProtectedIdentityPort`, `ApprovalDecisionPort`, `DocumentObjectPort`, `ClockPort` and optional projection/integration ports.
- Define the minimum semantic error catalog and forbid HTTP or Next.js concepts in the package.
- Keep production adapters and test-only utilities out of the root barrel.

### Required evidence

- Zod schema and brand tests
- Canonical serialization/fingerprint vectors
- Decimal/date/effective-range unit tests
- Permission ID uniqueness and coverage scaffold
- Forbidden import and public-export tests

### Paste-ready Codex prompt

```text
Execute CA-0.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Define the stable greenfield contracts used by every later vertical.

Authoritative tables/surfaces: None.
Commands: No business command; contract-only surface.
Queries: No business query; contract-only surface.
Events: Event naming/versioning helpers only.

Implement the slice as a production vertical. Apply these binding rules:
- Create branded IDs, command/query options, authorization context, canonical date/decimal/code helpers, pagination, fingerprinting and tenant-safe error types.
- Create the initial permission catalog and machine-checkable command/query-to-permission registry.
- Define `PartyReferencePort`, `TaxRegistrationReadPort`, `ReferenceDataPort`, `ProtectedIdentityPort`, `ApprovalDecisionPort`, `DocumentObjectPort`, `ClockPort` and optional projection/integration ports.
- Define the minimum semantic error catalog and forbid HTTP or Next.js concepts in the package.
- Keep production adapters and test-only utilities out of the root barrel.

Add direct evidence for:
- Zod schema and brand tests
- Canonical serialization/fingerprint vectors
- Decimal/date/effective-range unit tests
- Permission ID uniqueness and coverage scaffold
- Forbidden import and public-export tests

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-0.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Contracts compile, fingerprints are stable, permissions and errors are cataloged, and no package-layer boundary is violated.

## CA-0.3 — Database foundation and atomic mutation kernel

**Status:** `OPEN`  
**Depends on:** CA-0.2  
**Goal:** Build the same-transaction infrastructure required before material statutory writes.

### Authoritative surface

- **Tables:** `ca_mutation_receipt`, `ca_action_approval_binding`, `ca_numbering_policy`, `ca_numbering_reservation`
- **Commands:** Internal transaction/mutation-fact helpers only
- **Queries:** Internal receipt and numbering resolution only
- **Events:** Platform audit/outbox integration smoke event

### Binding rules

- Add schema, constraints, migration metadata, schema ownership and hard-tenant registration.
- Implement transaction-scoped Drizzle context that can persist domain rows, durable receipt, audit fact, outbox event and approval binding in one Neon transaction.
- Implement deterministic idempotency replay/conflict behavior and company-scoped numbering reservation.
- Implement memory equivalents for shared parity without allowing production fallback.
- Add failure-injection checkpoints before/after domain write, receipt, audit, outbox and commit.

### Required evidence

- Fresh-schema and tenancy audit
- Idempotency replay/conflict in memory and Neon
- Failure-injection rollback at every checkpoint
- Concurrent numbering reservation
- Transaction context does not autocommit participating writes

### Paste-ready Codex prompt

```text
Execute CA-0.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Build the same-transaction infrastructure required before material statutory writes.

Authoritative tables/surfaces: `ca_mutation_receipt`, `ca_action_approval_binding`, `ca_numbering_policy`, `ca_numbering_reservation`.
Commands: Internal transaction/mutation-fact helpers only.
Queries: Internal receipt and numbering resolution only.
Events: Platform audit/outbox integration smoke event.

Implement the slice as a production vertical. Apply these binding rules:
- Add schema, constraints, migration metadata, schema ownership and hard-tenant registration.
- Implement transaction-scoped Drizzle context that can persist domain rows, durable receipt, audit fact, outbox event and approval binding in one Neon transaction.
- Implement deterministic idempotency replay/conflict behavior and company-scoped numbering reservation.
- Implement memory equivalents for shared parity without allowing production fallback.
- Add failure-injection checkpoints before/after domain write, receipt, audit, outbox and commit.

Add direct evidence for:
- Fresh-schema and tenancy audit
- Idempotency replay/conflict in memory and Neon
- Failure-injection rollback at every checkpoint
- Concurrent numbering reservation
- Transaction context does not autocommit participating writes

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-0.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

The transactional kernel proves all-or-nothing persistence and deterministic idempotency under real database failure and concurrency.

## CA-0.4 — First thin vertical — draft legal-company registration

**Status:** `OPEN`  
**Depends on:** CA-0.3  
**Goal:** Prove the complete package-to-database-to-Action-to-UI path with a real, deliberately narrow domain operation.

### Authoritative surface

- **Tables:** `ca_legal_company` (minimal root columns required for later expansion)
- **Commands:** `registerLegalCompanyDraft`
- **Queries:** `getLegalCompany`, `listLegalCompanies`
- **Events:** `corporate_administration.legal_company.draft_registered.v1`

### Binding rules

- Require same-tenant active organization-kind party, normalized company code, home jurisdiction and explicit draft state.
- Do not activate the company or imply incorporation.
- Persist company, receipt, audit and event atomically.
- Create memory and Drizzle stores, production port composition, one Server Action and a minimal accessible list/create UI.
- Return tenant-safe not-found and fail closed on authorization.

### Required evidence

- Domain validation and duplicate code
- Memory/Drizzle parity
- Cross-tenant and permission denial
- Neon atomicity and concurrent duplicate registration
- Action session stamping and authenticated persisted-reload journey

### Paste-ready Codex prompt

```text
Execute CA-0.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Prove the complete package-to-database-to-Action-to-UI path with a real, deliberately narrow domain operation.

Authoritative tables/surfaces: `ca_legal_company` (minimal root columns required for later expansion).
Commands: `registerLegalCompanyDraft`.
Queries: `getLegalCompany`, `listLegalCompanies`.
Events: `corporate_administration.legal_company.draft_registered.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Require same-tenant active organization-kind party, normalized company code, home jurisdiction and explicit draft state.
- Do not activate the company or imply incorporation.
- Persist company, receipt, audit and event atomically.
- Create memory and Drizzle stores, production port composition, one Server Action and a minimal accessible list/create UI.
- Return tenant-safe not-found and fail closed on authorization.

Add direct evidence for:
- Domain validation and duplicate code
- Memory/Drizzle parity
- Cross-tenant and permission denial
- Neon atomicity and concurrent duplicate registration
- Action session stamping and authenticated persisted-reload journey

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-0.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

A permitted user can register and reload one draft legal company through production composition, with complete mutation evidence and no cross-tenant leakage.

## Phase-close rule

Phase 0 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
