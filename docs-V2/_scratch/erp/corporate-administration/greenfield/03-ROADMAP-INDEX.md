# Corporate Administration — Greenfield Roadmap Index

This index is the execution controller for the greenfield module. Every slice begins `OPEN`; no removed or prior implementation is treated as evidence.

## Execution rule

Run one slice per controlled coding mission. Inspect current disk state before editing, implement the selected vertical completely, run every required lane, update only that slice’s evidence/status, return the standard handoff, and stop.

## Phase summary

| Phase | Name | Slices | Status | Outcome |
|---:|---|---:|---|---|
| 0 | Architecture and Foundation | 4 | DONE | Create the package, close authority and dependency decisions, establish the transactional kernel, and prove durable infrastructure without activating business capability. |
| 1 | Legal Company and Establishments | 5 | IN_PROGRESS | Deliver complete statutory identity, legal-form, identifier, status, financial-year, establishment and registered-address history. |
| 2 | Governance and Statutory Offices | 5 | OPEN | Deliver governance bodies, statutory roles, officer evidence, meetings, quorum, voting, resolutions and implementation tracking. |
| 3 | Authority, Approvals and Company Seal | 4 | OPEN | Provide effective delegation-of-authority decisions, mandates, powers of attorney, seal control and real maker-checker enforcement. |
| 4 | Capital, Ownership and Beneficial Control | 6 | OPEN | Create a balanced immutable capital ledger, certificate register, ownership restrictions, UBO chain and legal distribution declarations. |
| 5 | Assets, Licences, Insurance, Charges and Banking | 6 | OPEN | Deliver legal/administrative asset, compliance-instrument and banking registers without invading Accounting or Payments. |
| 6 | Group Structure, Agreements and Corporate Actions | 5 | OPEN | Deliver a concurrency-safe group/control graph, related-party register, material agreements and evidence-driven corporate lifecycle cases. |
| 7 | Documents, Statutory Registers, Compliance and Filings | 6 | OPEN | Deliver versioned evidence, official register snapshots, jurisdiction rule packs, generated obligations and complete filing preparation/submission history. |
| 8 | Operational Services and Enterprise Activation | 6 | OPEN | Add rebuildable operational services, controlled data exchange, enterprise hardening and activate only after the complete matrix is green. |

## Slice register

| Slice | Phase | Title | Depends on | Status |
|---|---:|---|---|---|
| CA-0.1 | 0 | Authority, catalog and package scaffold | None | DONE |
| CA-0.2 | 0 | Core contracts and future catalog design | CA-0.1 | DONE |
| CA-0.3 | 0 | Runtime composition and mutation contracts | CA-0.2 | DONE |
| CA-0.4 | 0 | Durable infrastructure adapters and package boundaries | CA-0.3 | DONE |
| CA-1.1 | 1 | Legal-company registry and jurisdiction profile | Phase 0 DONE | DONE |
| CA-1.2 | 1 | Effective legal names and legal forms | CA-1.1 | OPEN |
| CA-1.3 | 1 | Corporate identifiers, financial years and registered activities | CA-1.2 | OPEN |
| CA-1.4 | 1 | Registered offices, legal establishments and premises | CA-1.3 | OPEN |
| CA-1.5 | 1 | Company status, financial lifecycle and Phase 1 journey | CA-1.4 | OPEN |
| CA-2.1 | 2 | Governance bodies and memberships | Phase 1 DONE | OPEN |
| CA-2.2 | 2 | Statutory offices, appointments, qualifications and consent | CA-2.1 | OPEN |
| CA-2.3 | 2 | Officer declarations, disqualifications and conflicts | CA-2.2 | OPEN |
| CA-2.4 | 2 | Meetings, notices, participants and quorum | CA-2.3 | OPEN |
| CA-2.5 | 2 | Votes, resolutions, minutes and implementation actions | CA-2.4 | OPEN |
| CA-3.1 | 3 | Delegation-of-authority policies and rules | Phase 2 DONE | OPEN |
| CA-3.2 | 3 | Mandates, signatories and powers of attorney | CA-3.1 | OPEN |
| CA-3.3 | 3 | Company seal/chop identity, custody and use | CA-3.2 | OPEN |
| CA-3.4 | 3 | Maker-checker enforcement and authority decision API | CA-3.3 | OPEN |
| CA-4.1 | 4 | Share classes and class rights | Phase 3 DONE | OPEN |
| CA-4.2 | 4 | Immutable capital transaction ledger and holdings as-of | CA-4.1 | OPEN |
| CA-4.3 | 4 | Security certificates and certificate events | CA-4.2 | OPEN |
| CA-4.4 | 4 | Ownership encumbrances, nominee/trust and control relationships | CA-4.3 | OPEN |
| CA-4.5 | 4 | Beneficial-owner cases, disclosure, attestation and discrepancy | CA-4.4 | OPEN |
| CA-4.6 | 4 | Distributions, entitlement snapshots and Phase 4 reconciliation | CA-4.5 | OPEN |
| CA-5.1 | 5 | Property interests and title register | Phase 4 DONE | OPEN |
| CA-5.2 | 5 | Corporate assets and intellectual property | CA-5.1 | OPEN |
| CA-5.3 | 5 | Insurance-policy administration | CA-5.2 | OPEN |
| CA-5.4 | 5 | Registered charges and security interests | CA-5.3 | OPEN |
| CA-5.5 | 5 | Licence and permit lifecycle | CA-5.4 | OPEN |
| CA-5.6 | 5 | Administrative bank registrations, mandates and boundary journey | CA-5.5 | OPEN |
| CA-6.1 | 6 | Group-control graph and ownership evidence | Phase 5 DONE | OPEN |
| CA-6.2 | 6 | Related-party relationships and declarations | CA-6.1 | OPEN |
| CA-6.3 | 6 | Material agreements and lifecycle events | CA-6.2 | OPEN |
| CA-6.4 | 6 | Corporate-action case framework | CA-6.3 | OPEN |
| CA-6.5 | 6 | Corporate-action effects and lifecycle journeys | CA-6.4 | OPEN |
| CA-7.1 | 7 | Corporate documents, versions and typed links | Phase 6 DONE | OPEN |
| CA-7.2 | 7 | Retention, legal holds and certified statutory registers | CA-7.1 | OPEN |
| CA-7.3 | 7 | Compliance rule packs and company profiles | CA-7.2 | OPEN |
| CA-7.4 | 7 | Filing obligations, adjustments and due engine | CA-7.3 | OPEN |
| CA-7.5 | 7 | Filing preparation, approval, submission and authority response | CA-7.4 | OPEN |
| CA-7.6 | 7 | Regulatory change impact, due/overdue journey and Phase 7 closure | CA-7.5 | OPEN |
| CA-8.1 | 8 | Search projectors, checkpoints and rebuild | Phase 7 DONE | OPEN |
| CA-8.2 | 8 | Reminder eligibility and dispatch handoff | CA-8.1 | OPEN |
| CA-8.3 | 8 | Controlled import workflow | CA-8.2 | OPEN |
| CA-8.4 | 8 | Exports, reconciliation and entity health | CA-8.3 | OPEN |
| CA-8.5 | 8 | Enterprise security, accessibility, performance, observability and recovery | CA-8.4 | OPEN |
| CA-8.6 | 8 | Full verification matrix, migration rehearsal and activation | CA-8.5 | OPEN |

## Status vocabulary

- `OPEN`: approved greenfield work not started.
- `IN_PROGRESS`: currently being implemented; never use as completion evidence.
- `DONE`: every required deliverable, test lane and acceptance boundary has direct evidence.
- `PARTIAL`: implementation exists but at least one required boundary is missing.
- `GAP`: no usable implementation exists.
- `BLOCKED`: an external prerequisite prevents required verification.
- `NOT_APPLICABLE`: allowed only where the phase document explicitly excludes a boundary.

Skipped tests, zero-test pattern matches, compile-only exports, TODO throws, placeholder adapters and mock-only external lanes do not count as `DONE`.

## Phase documents

- [Phase 0 — Architecture and Foundation](./phase/PHASE-0-ARCHITECTURE-AND-FOUNDATION.md)
- [Phase 1 — Legal Company and Establishments](./phase/PHASE-1-LEGAL-COMPANY-AND-ESTABLISHMENTS.md)
- [Phase 2 — Governance and Statutory Offices](./phase/PHASE-2-GOVERNANCE-AND-STATUTORY-OFFICES.md)
- [Phase 3 — Authority, Approvals and Company Seal](./phase/PHASE-3-AUTHORITY-APPROVALS-AND-SEAL.md)
- [Phase 4 — Capital, Ownership and Beneficial Control](./phase/PHASE-4-CAPITAL-OWNERSHIP-AND-BENEFICIAL-CONTROL.md)
- [Phase 5 — Assets, Licences, Insurance, Charges and Banking](./phase/PHASE-5-ASSETS-LICENCES-INSURANCE-CHARGES-AND-BANKING.md)
- [Phase 6 — Group Structure, Agreements and Corporate Actions](./phase/PHASE-6-GROUP-AGREEMENTS-AND-CORPORATE-ACTIONS.md)
- [Phase 7 — Documents, Statutory Registers, Compliance and Filings](./phase/PHASE-7-DOCUMENTS-REGISTERS-COMPLIANCE-AND-FILINGS.md)
- [Phase 8 — Operational Services and Enterprise Activation](./phase/PHASE-8-OPERATIONS-AND-ENTERPRISE-ACTIVATION.md)
