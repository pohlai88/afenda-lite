# Corporate Administration Product Requirements

| Field | Value |
| --- | --- |
| Status | Accepted implementation authority; enterprise closure in progress |
| Owner | Corporate Administration |
| Audience | Product engineering, platform engineering, security, operations, and reviewers |
| Updated | 2026-08-02 |
| Decision enabled | Build and close the Corporate Administration bounded context without importing Investor Relations ownership or exposing internal persistence structure |

## Overview

Corporate Administration is Afenda's organization-scoped statutory and corporate-secretarial system of record. It owns legal-entity identity, governance, authority, statutory records, and the operational evidence required to administer a company over time.

This document is the permanent product and acceptance authority for `@afenda/corporate-administration`. Package behavior, tests, the module manifest, application composition, and the Corporate Administration skill must remain aligned with it.

## Problem

An enterprise needs one durable account of the legal entities it administers: what each entity is, where and under which law it exists, who may govern or bind it, which decisions were made, and what evidence supports those facts. Those concepts must not be reconstructed independently in application code, persistence adapters, or adjacent ERP modules.

The package therefore needs a stable consumer facade backed by feature-owned domain semantics and narrow persistence contracts. Infrastructure may change without forcing consumers to learn database, registry, or adapter details.

## Goals

- Provide the canonical organization-scoped legal-company registry and historical truth.
- Provide governance bodies, memberships, statutory offices, officers, meetings, voting, resolutions, minutes references, and implementation actions.
- Provide corporate-authority capabilities for delegations, mandates, signatories, powers of attorney, and company-seal administration.
- Provide entity-administration capabilities for premises, property and administrative assets, intellectual property, insurance, charges, licences, permits, and masked bank registrations.
- Provide legal-entity structure, related-party, material-agreement, document, filing, statutory-register, search, reminder, reconciliation, health, and recovery capabilities.
- Keep one canonical operation registry for command/query identity, permissions, approval policy, events, and diagnostics.
- Preserve a small permanent root facade while features own their schemas, rules, commands, queries, store contracts, and adapters.
- Prove tenant isolation, authorization, approval, idempotency, concurrency, atomicity, audit, event, privacy, adapter parity, migration safety, and operational recovery before enterprise closure.

## Non-goals

- Securities, share capital, investors, shareholders, holdings, certificates, beneficial ownership, distributions, and investor communications. These belong to Investor Relations.
- Reimplementing platform approval decisions inside Corporate Administration.
- Direct writes to another ERP package's tables or direct imports of peer ERP implementation code.
- Browser-supplied organization or actor identity.
- A second command registry, approval policy map, error vocabulary, public runtime, or compatibility facade.
- Applying production migrations as part of a package-structure or documentation cutover.
- Activating the module or beginning CA-3.1 through CA-3.4 before the closure matrix permits it.

## Investor Relations exclusion

Investor Relations is the canonical owner of securities, capital, investors,
shareholders, holdings, certificates, beneficial ownership, distributions, and
investor communications. Corporate Administration must not create shadow
commands, stores, tables, or projections for those concepts.

## Ownership and semantic model

### Canonical owner

`@afenda/corporate-administration` is the sole semantic owner and business mutator of `ca_*` state. `@afenda/db` hosts Drizzle schema and migrations but does not own business mutation behavior. The application composition root injects approved platform capabilities and does not reinterpret Corporate Administration policy.

### Permanent consumer facade

The supported public surfaces are:

- `@afenda/corporate-administration` for domain commands, queries, schemas, durable result contracts, and `createCorporateAdministrationRuntime`;
- `@afenda/corporate-administration/module-manifest` for the governed module projection;
- `@afenda/corporate-administration/adapters/drizzle` for production adapter factories and structural dependency contracts;
- `@afenda/corporate-administration/testing` for non-production fixtures and parity harnesses.

Consumers must not import `src/*`, concrete adapter classes, database clients, registry storage, or feature store contracts.

### Internal normalization boundary

External input is validated at the command/query boundary and normalized once into branded identifiers, canonical dates and instants, canonical decimal values, normalized codes, and opaque pagination cursors. Historical wire aliases, if introduced, must live in an ingress alias ledger and normalize immediately to the canonical representation. Aliases must never become a second construction API.

### Derived projections

Command and query identifiers, permissions, approval requirements, registered events, audit classifications, observability labels, and manifest inventories derive from the canonical operation registry. Cursor validation and serialization derive from the package cursor contract. Consumers may request or carry these projections but must not recreate their mappings.

### Serialization ownership

The package owns serialization and deserialization of its durable command fingerprint, event envelope, canonical scalar values, and opaque cursors. The root `@afenda/errors` facade owns shared `Result` and error wire semantics. Application code maps approved package results into its transport envelope without interpreting package internals.

## Feature requirements

### CA-FR-001 — Legal-company registry

The system shall register an organization-scoped legal-company draft and maintain jurisdiction, legal names, legal forms, identifiers, financial years, activities, lifecycle status, completeness, and effective/known-time history. Natural keys and effective ranges must be tenant-scoped and race-safe.

### CA-FR-002 — Establishments and premises

The system shall administer legal establishments, registered addresses, branches, representative offices, foreign registrations, and premises with effective chronology and status history.

### CA-FR-003 — Governance bodies and membership

The system shall administer governance bodies, memberships, roles, voting entitlements, tenure, and conflicts while retaining complete-set capabilities for decisions that cannot operate on a paginated subset.

### CA-FR-004 — Statutory offices and officers

The system shall define statutory offices and administer officer appointments, qualifications, declarations, disqualifications, recusals, resignation, removal, vacancy, and eligibility. Protected-role appointment must fail closed unless the canonical approval boundary verifies an independent decision.

### CA-FR-005 — Meetings and resolutions

The system shall schedule, notice, open, adjourn, and close meetings; record attendance, quorum and votes; adopt, reject, and supersede resolutions; store minutes-document references; and track resolution actions to completion. Vote arithmetic, quorum, chronology, and resolution state are package-owned.

### CA-FR-006 — Corporate authority

The system shall administer delegations, mandates, signatories, powers of attorney, and company-seal custody and use. High-risk grants and revocations require registry-owned approval policy and platform-issued decisions.

### CA-FR-007 — Entity administration

The system shall administer non-securities entity instruments: property and administrative assets, intellectual property, insurance, charges, licences, permits, and masked bank registrations. Secret material and unrestricted banking identity must not enter events, logs, search projections, or public results.

### CA-FR-008 — Structure, agreements, documents, and compliance

The system shall maintain the legal-entity group graph, related parties, material agreements, non-securities corporate actions, document metadata and versions, legal holds, statutory registers, jurisdiction rule packs, and filing evidence.

### CA-FR-009 — Enterprise operations

The system shall provide bounded search, reminders, imports, exports, reconciliation, entity-health reporting, observability, recovery, and deployment evidence. Operational exports must apply tenant, permission, approval, and privacy policy.

## Architecture constraints

- Source uses `src/features/<feature>/` capsules. Each feature owns its schema, types, rules, commands, queries, narrow store contract, and memory/Drizzle adapters.
- `src/kernel/` owns cross-feature semantic registries, authorization, execution contracts, normalization, canonical values, durable-command mechanics, emissions, and internal query mechanics.
- `src/composition/` assembles infrastructure adapters and the module manifest. Features never import composition.
- `src/testing/` owns non-production fixtures and parity helpers.
- The package root facade remains the only business API. Auxiliary exports remain limited to module manifest, production composition, and testing.
- Feature adapters implement only their feature-owned store contract. A composite package store must not become a feature dependency.
- Feature imports may point inward to their own files or downward to kernel capabilities; upward imports to facade, composition, or testing are forbidden.
- No direct peer ERP imports, deep `@afenda/*/src` imports, application imports, or framework/UI dependencies.
- Every organization-scoped command and query receives trusted organization context and enforces the canonical operation permission.
- Approval-required behavior fails closed until the separate platform approval capability satisfies `CorporateAdministrationApprovalDecisionPort` in production.

## Interfaces and dependencies

Approved runtime dependencies are the root capabilities of `@afenda/errors`, `@afenda/audit`, and `@afenda/db`, plus the injected application-owned event/outbox and authorization composition described by the package contracts. Any new workspace edge requires both `package.json` and workspace-edge-register approval.

The application stamps organization, actor, correlation, idempotency, and causation facts from the authenticated server context. Browser input cannot replace them. Foreign domain facts enter through narrow public ports, registered events, or governed projections.

## Security and failure behavior

- Required permission is derived from the operation registry before domain access.
- Approval-required commands reject missing, expired, revoked, replayed, tenant-mismatched, fingerprint-mismatched, requester-mismatched, subject-mismatched, or non-independent decisions.
- Durable mutations reserve idempotency, execute domain writes, audit, and outbox work under the transaction contract, then complete the reservation. Any required failure rolls back the unit.
- Expected failures return the canonical `Result` contract. Unexpected infrastructure failures are normalized without exposing SQL, stack traces, payloads, approval secrets, or credentials.
- Audit, event, log, search, export, and UI projections must redact government identifiers, unrestricted PII, banking identity, document credentials, and agreement body text.

## Rollout and rollback

Package-only refactors may ship when the public facade digest and consumer contract tests prove zero business-contract change. Database rollout is a separate deployment-review lane.

Migrations 0034–0046 must not be applied until the release lane records inventory and checksums, impact classification, backup and restore proof, fresh-schema and upgrade rehearsals, compatibility analysis, lock estimates, domain approvals, post-deploy verification, rollback or roll-forward instructions, and an approved maintenance window.

Rollback of an internal structure cutover is the ordinary version-control reversal of the bounded commit. Database rollback must follow the approved release runbook and must never rely on destructive ad hoc commands.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Distributed permission, event, or approval meaning | Derive projections from the operation registry and enforce repository guards |
| Feature coupling through a broad store | Feature-owned narrow store contracts and adapter contract tests |
| Cross-tenant data exposure | Hard organization predicates, adversarial database tests, and server-stamped identity |
| Partial durable mutation | Transaction failure injection across domain write, audit, outbox, and receipt completion |
| Memory/Drizzle behavioral drift | Shared parity harnesses for every supported command and query |
| Unsafe migration deployment | Independent migration/recovery lane with rehearsals and approvals |
| Accidental Investor Relations duplication | Explicit exclusion plus source/table/operation ownership checks |
| Internal refactor leaks to consumers | Frozen facade, export snapshot, zero deep imports, and affected-consumer verification |

## Enterprise closure matrix

This row-level matrix is the source of truth. It contains exactly five `DONE` rows and nine non-`DONE` rows. A row changes only when new evidence satisfies the complete boundary or an explicit, approved `NOT_APPLICABLE` disposition is recorded.

| # | Boundary | Status | Current evidence or closure requirement |
| ---: | --- | --- | --- |
| 1 | Authority and ownership | DONE | Package owns CA semantics and `ca_*` mutations; Investor Relations exclusion is explicit |
| 2 | Catalog and dependency governance | BLOCKED | Rerun repository governance after unrelated repository blockers are resolved or formally isolated |
| 3 | Public package contracts | DONE | Root, manifest, Drizzle composition, and testing surfaces are contract-tested |
| 4 | Reference and peer boundaries | DONE | No peer ERP implementation import or direct foreign mutation ownership |
| 5 | Schema and migrations | BLOCKED | Validate migrations 0034–0046 through the separate deployment-review lane; do not apply here |
| 6 | Tenancy and data isolation | PARTIAL | Legal-company database evidence exists; all supported features, exports, and adversarial paths remain |
| 7 | Authorization, approvals and segregation of duties | BLOCKED | Command authorization is complete; production platform approval verifier and integrated SoD evidence remain |
| 8 | Domain behavior and historical truth | DONE | Implemented capabilities retain canonical chronology, effective truth, and complete-set decision paths |
| 9 | Idempotency, concurrency and atomicity | PARTIAL | Core contracts exist; database-backed failure injection, replay, and concurrency coverage remain |
| 10 | Events, audit and privacy | PARTIAL | Contracts exist; persisted evidence and redaction coverage remain for broader workflows and exports |
| 11 | Adapter parity and database semantics | PARTIAL | Supported cohort evidence exists; governance tables await deployment-lane availability |
| 12 | App composition and Server Actions | DONE | Composition and trusted server identity boundaries are implemented and focused-tested |
| 13 | UI, journeys and accessibility | BLOCKED | Authenticated production-composed journeys and integrated accessibility evidence remain |
| 14 | Operations and production readiness | BLOCKED | Runbooks, recovery, deployment sequencing, monitoring, and production verification remain |

## Acceptance and sequencing

1. Integrate and verify the external platform approval-verifier boundary when `PLATFORM-APPROVALS-01` is available.
2. Establish Neon adapter parity for every supported command and query.
3. Add database-backed transaction atomicity and failure-injection evidence.
4. Prove database-backed tenant isolation and adversarial cross-organization rejection.
5. Validate migrations 0034–0046, recovery, restore, and deployment sequencing in the separate release lane.
6. Complete operational-readiness evidence and runbooks.

The sequence is a priority order, not a global serial lock. Independent database evidence may proceed while approval integration remains blocked. Approval-related rows cannot close from unrelated evidence, and approval-required behavior must continue to fail closed.

CA-3.1 through CA-3.4 remain ineligible until every applicable matrix row is `DONE` or has an explicitly approved and evidenced `NOT_APPLICABLE` disposition. No enterprise seal may be emitted before then.

## Verification requirements

At minimum, changes run package lint, typecheck, unit/contract tests, the feature-layout guard, semantic-surface inspection, affected web contract tests, module governance, documentation-trunk checks, and diff integrity. Database claims additionally require the isolated preview target, explicit database-test guard, recorded branch/schema identity, pass/fail/skip counts, and no production migration application.

## Open questions

- Which canonical platform package will own `PLATFORM-APPROVALS-01`, and what versioned decision contract will it publish?
- Which approved maintenance window and recovery objective will govern migrations 0034–0046?
- Which authenticated test identities provide positive, denied, and conflicting-role browser journeys without weakening production policy?

These questions block only their corresponding closure evidence. They do not authorize alternate CA-local implementations.
