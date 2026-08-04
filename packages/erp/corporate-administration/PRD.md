# Corporate Administration Product Requirements

| Field | Value |
| --- | --- |
| Status | Accepted product authority |
| Owner | Corporate Administration |
| Delivery plan | [DEVELOPMENT-ROADMAP.md](DEVELOPMENT-ROADMAP.md) · [IMPLEMENTATION-SLICES.md](IMPLEMENTATION-SLICES.md) |
| Updated | 2026-08-03 |

## Product outcome

Corporate Administration is the tenant-scoped system of record for legal entities,
governance, statutory offices, meetings, resolutions, and the legal evidence that
supports those facts over time. An authorized user must be able to administer an
entity without interpreting legal status, permission, approval, or persistence
policy in the application.

## Ownership boundary

| Corporate Administration owns | Adjacent owner |
| --- | --- |
| Legal-company identity, establishments, governance, statutory offices, meetings, resolutions, corporate authority, statutory administration, legal records, and CA assurance | — |
| Approval decisions, delegation validity, expiry, revocation, replay, persistence | Platform Approvals |
| Authentication, organization membership, roles | Identity and Admin |
| Binary storage, malware scanning, signature execution | Platform document and signature capabilities |
| Asset acquisition, maintenance, disposal, depreciation, valuation | Asset Management and Accounting |
| Securities, capital, investors, shareholders, holdings, certificates, beneficial ownership, distributions | Investor Relations |

Corporate Administration never creates shadow Investor Relations records, makes
peer ERP table writes, accepts browser-controlled organization or actor identity,
or exposes a second business facade, registry, adapter, or error contract.

## Requirements

| ID | Requirement | Living status |
| --- | --- | --- |
| CA-FR-001 | Legal-company registry: jurisdiction, names, forms, identifiers, financial years, activities, lifecycle, completeness, effective/known-time history | Implemented |
| CA-FR-002 | Establishments and premises: registered offices, branches, representative offices, foreign registrations, premises, chronology | Implemented |
| CA-FR-003 | Governance bodies and membership: bodies, roles, tenure, voting rights, complete-set decisions | Implemented |
| CA-FR-004 | Statutory offices and officers: appointments, qualifications, declarations, conflicts, eligibility, departure | Implemented; protected actions fail closed pending platform approvals |
| CA-FR-005 | Meetings and resolutions: notices, attendance, quorum, votes, decisions, minutes references, actions, history | Implemented |
| CA-FR-006 | Corporate authority and mandates | Implemented; protected mandates fail closed pending platform approvals; not exposed by CA-APP-01 |
| CA-FR-007 | Statutory obligations, filings, and regulatory cases | Planned; not authorized for new semantics |
| CA-FR-008 | Legal instruments and asset-administration interests | Planned; not authorized for new semantics |
| CA-FR-009 | Legal-group structure and related parties | Planned; not authorized for new semantics |
| CA-FR-010 | Material agreements and non-securities corporate actions | Planned; not authorized for new semantics |
| CA-FR-011 | Statutory records, execution evidence, and legal holds | Planned; not authorized for new semantics |
| CA-FR-012 | Entity-administration work management | Planned; not authorized for new semantics |
| CA-FR-013 | Reporting, reconciliation, and assurance | Planned; not authorized for new semantics |
| CA-FR-014 | Production composition, persistence, usability, and operational readiness | In progress |

## Technical contract

- The permanent consumer facade is `@afenda/corporate-administration`; declared
  composition and testing subpaths remain isolated to their named consumers.
- Feature definitions own commands, queries, validation, history, and narrow store
  contracts. Package-wide operation, permission, approval, audit, event, privacy,
  idempotency, transaction, and observability policy derives from canonical
  definitions.
- Input is parsed from `unknown` and normalized once. Durable fingerprints, event
  envelopes, opaque cursors, and CA export projections serialize canonically.
- Server Actions stamp trusted organization, actor, correlation, causation, and
  idempotency facts; they call the root facade and return canonical `ActionResult`.
- Required durable facts, audit, outbox, and idempotency completion share one
  transaction. Approval-gated behavior fails closed until the platform capability
  exists.

## Release posture

Two decisions are deliberately separate:

| Decision | Required proof |
| --- | --- |
| Controlled beta for the implemented cohort | A production-composed, authenticated end-to-end workflow with real persistence, authorization, tenant isolation, canonical errors, history/audit, and accessibility for exposed screens |
| Enterprise seal | Every applicable row in the closure matrix is `DONE` or has an approved, evidenced `NOT_APPLICABLE` disposition |

`CA-APP-01` is authorized now to expose CA-FR-001 through CA-FR-005 only. It must
not expose CA-FR-006, add CA-FR-007 through CA-FR-013 semantics, bypass
unavailable approval, or apply pending migrations. Exact paths and beta
acceptance are in `IMPLEMENTATION-SLICES.md`.

## Enterprise closure matrix

This row-level matrix is the authority for enterprise readiness. It remains exactly
seven `DONE` and seven non-`DONE` rows until direct evidence changes a row.

| # | Boundary | Status | Remaining condition |
| ---: | --- | --- | --- |
| 1 | Authority and ownership | DONE | — |
| 2 | Catalog and dependency governance | BLOCKED | Resolve or formally isolate unrelated repository blockers |
| 3 | Public package contracts | DONE | — |
| 4 | Reference and peer boundaries | DONE | — |
| 5 | Schema and migrations | BLOCKED | Separate 0034–0046 and 0050 deployment-review lane; do not apply here |
| 6 | Tenancy and data isolation | DONE | CA-APP-01 Neon hostile cross-org evidence recorded 2026-08-05 (`ca-app-01-tenant-isolation.neon.test.ts` + legal-company neon isolation). Approval binding remains CA-CL-01 |
| 7 | Authorization, approvals and segregation of duties | BLOCKED | Real platform approval verifier and integrated SoD evidence |
| 8 | Domain behavior and historical truth | DONE | — |
| 9 | Idempotency, concurrency and atomicity | PARTIAL | Outbox-failure atomicity DONE for CA-APP-01 exposed commands (CA-CL-03, 2026-08-05). Still need replay/conflict and concurrency evidence |
| 10 | Events, audit and privacy | PARTIAL | Persisted evidence and redaction coverage for exposed workflows |
| 11 | Adapter parity and database semantics | DONE | CA-APP-01 cohort memory/Drizzle/Neon parity recorded 2026-08-05 (`ca-0-4-demo`, 52 passed / 0 failed) |
| 12 | App composition and Server Actions | DONE | — |
| 13 | UI, journeys and accessibility | BLOCKED | Authenticated workflow evidence for the beta cohort |
| 14 | Operations and production readiness | BLOCKED | Runbooks, recovery, deployment sequencing, monitoring, and production verification |

No enterprise seal is emitted while a required row remains non-`DONE`.
