# Corporate Administration — Greenfield Roadmap Index

This index is the execution controller for the greenfield module. Every slice begins `OPEN`; no removed or prior implementation is treated as evidence.

## Execution rule

Run one slice per controlled coding mission. Inspect current disk state before editing, implement the selected vertical completely, run every required lane, update only that slice’s evidence/status, return the standard handoff, and stop.

## Phase summary

| Phase | Name | Slices | Status | Outcome |
|---:|---|---:|---|---|
| 0 | Architecture and Foundation | 4 | DONE | Create the package, close authority and dependency decisions, establish the transactional kernel, and prove durable infrastructure without activating business capability. |
| 1 | Legal Company and Establishments | 5 | DONE | Complete statutory identity, legal-form, identifier, status, financial-year, establishment and registered-address history are implemented and verified through package, app build and browser-authenticated Neon-backed Phase 1 journey evidence. |
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
| CA-1.2 | 1 | Effective legal names and legal forms | CA-1.1 | DONE |
| CA-1.3 | 1 | Corporate identifiers, financial years and registered activities | CA-1.2 | DONE |
| CA-1.4 | 1 | Registered offices, legal establishments and premises | CA-1.3 | DONE |
| CA-1.5 | 1 | Company status, financial lifecycle and Phase 1 journey | CA-1.4 | DONE |
| CA-2.1 | 2 | Governance bodies and memberships | Phase 1 DONE | DONE |
| CA-2.2 | 2 | Statutory offices, appointments, qualifications and consent | CA-2.1 | DONE |
| CA-2.3 | 2 | Officer declarations, disqualifications and conflicts | CA-2.2 | DONE |
| CA-2.4 | 2 | Meetings, notices, participants and quorum | CA-2.3 | DONE |
| CA-2.5 | 2 | Votes, resolutions, minutes and implementation actions | CA-2.4 | DONE |
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

## Implementation status audit

Last updated: 2026-07-28.

This audit records implementation posture without weakening the canonical
`Status` column above. Phase 1 was promoted only after package, app build and
browser-authenticated Neon-backed journey evidence all passed.

| Slice | Canonical status | Current implementation posture | Evidence |
|---|---|---|---|
| CA-1.2 | DONE | Effective legal-name and legal-form backend, Server Action and UI paths are implemented. The accepted browser-authenticated Phase 1 journey creates the legal name and legal form through the production app, reloads persisted Neon state, and proves they satisfy activation readiness. | `evidence/CA-1.2-EVIDENCE.md`; `evidence/CA-1.5-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration check` 46 passed, 11 skipped, 242 tests passed, 34 skipped; `pnpm --filter @afenda/web build` exit 0; Playwright CA Phase 1 journey exit 0 |
| CA-1.3 | DONE | Corporate identifier, financial-year and registered-activity backend, Server Action and UI paths are implemented. The accepted browser-authenticated Phase 1 journey creates each record through the production app, reloads persisted Neon state, and proves they satisfy activation readiness. | `evidence/CA-1.3-EVIDENCE.md`; `evidence/CA-1.5-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration check` 46 passed, 11 skipped, 242 tests passed, 34 skipped; `pnpm --filter @afenda/web build` exit 0; Playwright CA Phase 1 journey exit 0 |
| CA-1.4 | DONE | Registered-office, legal-establishment and premise backend plus app composition are implemented. The accepted browser-authenticated Phase 1 journey seeds Master Data address prerequisites, sets a registered office through the production app, reloads persisted Neon state, and proves registered office readiness. | `evidence/CA-1.4-EVIDENCE.md`; `evidence/CA-1.5-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration check` 46 passed, 11 skipped, 242 tests passed, 34 skipped; `pnpm --filter @afenda/web build` exit 0; Playwright CA Phase 1 journey exit 0 |
| CA-1.5 | DONE | Status lifecycle, activation completeness, idempotent durable status persistence, app lifecycle actions and the browser-authenticated Neon-backed Phase 1 activation journey are implemented and verified. Production composition now resolves CA reference/address reads through CA-owned ports instead of synthetic Master Data actors, and package input parsing normalizes optional object fields before command fingerprinting. | `evidence/CA-1.5-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration check` 46 passed, 11 skipped, 242 tests passed, 34 skipped; `pnpm --filter @afenda/web typecheck` exit 0; `pnpm --filter @afenda/web build` exit 0; Playwright CA Phase 1 journey exit 0 |
| CA-2.1 | DONE | Governance body and governance membership backend foundations are implemented with CA-owned schema tables, typed package contracts, durable command/query catalog wiring, memory and Drizzle stores, hard-tenant-root registration, and focused rule/store coverage. Phase 2 remains OPEN until the full phase-close authenticated journey, accessibility and acceptance lanes are completed. | `evidence/CA-2.1-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration test -- __tests__/governance/ca-2.1-contract-and-memory.test.ts` 1 file passed, 4 tests passed; `pnpm --filter @afenda/corporate-administration check` 47 passed, 11 skipped, 246 tests passed, 34 skipped |
| CA-2.2 | DONE | Statutory offices, officer appointments, officer qualifications and consent evidence are implemented with CA-owned schema tables, typed package contracts, durable command/query catalog wiring, memory and Drizzle stores, hard-tenant-root registration, and focused vacancy/qualification/approval coverage. Phase 2 remains OPEN until the full phase-close authenticated journey, accessibility and acceptance lanes are completed. | `evidence/CA-2.2-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration test -- __tests__/officers/ca-2.2-contract-and-memory.test.ts` 1 file passed, 5 tests passed; `pnpm --filter @afenda/corporate-administration check` 48 passed, 11 skipped, 251 tests passed, 34 skipped; `pnpm --filter @afenda/db typecheck` passed; `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts` 1 file passed, 14 tests passed |
| CA-2.3 | DONE | Officer declarations, disqualifications, conflict disclosures and recusals are implemented with CA-owned schema tables, typed package contracts, durable command/query catalog wiring, memory and Drizzle stores, redacted event payloads, hard-tenant-root registration, and focused eligibility/leakage/linkage/reminder coverage. Phase 2 remains OPEN until the full phase-close authenticated journey, accessibility and acceptance lanes are completed. | `evidence/CA-2.3-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration test -- __tests__/officers/ca-2.3-compliance-contract-and-memory.test.ts` 1 file passed, 4 tests passed; `pnpm --filter @afenda/corporate-administration check` 49 passed, 11 skipped, 255 tests passed, 34 skipped; `pnpm --filter @afenda/db lint` passed; `pnpm --filter @afenda/db typecheck` passed; `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts` 1 file passed, 14 tests passed |
| CA-2.4 | DONE | Governance meetings, notices, participants and quorum evidence are implemented with CA-owned schema tables, typed package contracts, durable command/query catalog wiring, memory and Drizzle stores, hard-tenant-root registration, and focused notice/waiver/attendance/quorum/stale-version coverage. Phase 2 remains OPEN until the full phase-close authenticated journey, accessibility and acceptance lanes are completed. | `evidence/CA-2.4-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration test -- __tests__/meetings/ca-2.4-meetings-contract-and-memory.test.ts` 1 file passed, 3 tests passed; `pnpm --filter @afenda/corporate-administration check` 50 passed, 11 skipped, 258 tests passed, 34 skipped; `pnpm --filter @afenda/db lint` passed; `pnpm --filter @afenda/db typecheck` passed; `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts` 1 file passed, 14 tests passed |
| CA-2.5 | DONE | Meeting votes, resolutions, minutes documents and implementation actions are implemented with CA-owned schema tables, typed package contracts, durable command/query catalog wiring, memory and Drizzle stores, hard-tenant-root registration, and focused vote-threshold/resolution/action coverage. Phase 2 remains OPEN until the full phase-close authenticated journey, accessibility and acceptance lanes are completed. | `evidence/CA-2.5-EVIDENCE.md`; `pnpm --filter @afenda/corporate-administration test -- __tests__/resolutions/ca-2.5-resolutions-contract-and-memory.test.ts` 1 file passed, 3 tests passed; `pnpm --filter @afenda/corporate-administration check` 51 passed, 11 skipped, 261 tests passed, 34 skipped; `pnpm --filter @afenda/db lint` passed; `pnpm --filter @afenda/db typecheck` passed; `pnpm --filter @afenda/db test -- __tests__/tenancy.test.ts` 1 file passed, 14 tests passed |

## Latest implementation update - 2026-07-28

- Implemented CA-2.5 meeting votes, resolutions, minutes documents and
  implementation actions in `@afenda/corporate-administration`, including
  CA-owned database schema, migration, command/query contracts, memory and
  Drizzle stores, mutation-table ownership, event/permission/catalog wiring,
  hard-tenant-root inventory, and focused CA-2.5 tests. Phase 2 remains OPEN
  until the full authenticated journey, accessibility and phase-close lanes are
  completed.
- Implemented CA-2.4 governance meetings, notices, participants and quorum in
  `@afenda/corporate-administration`, including CA-owned database schema,
  migration, command/query contracts, memory and Drizzle stores,
  mutation-table ownership, event/permission/catalog wiring,
  hard-tenant-root inventory, and focused CA-2.4 tests. Phase 2 remains OPEN
  until the full phase-close lanes are completed.
- Implemented CA-2.3 officer declarations, disqualifications, conflict
  disclosures and recusals in `@afenda/corporate-administration`, including
  CA-owned database schema, migration, command/query contracts, memory and
  Drizzle stores, mutation-table ownership, redacted event/permission/catalog
  wiring, hard-tenant-root inventory, and focused CA-2.3 tests. Phase 2 remains
  OPEN because CA-2.4 and CA-2.5 remain OPEN.
- Implemented CA-2.2 statutory offices, officer appointments and officer
  qualifications in `@afenda/corporate-administration`, including CA-owned
  database schema, migration, command/query contracts, memory and Drizzle stores,
  mutation-table ownership, event/permission/catalog wiring,
  hard-tenant-root inventory, and focused CA-2.2 tests. Phase 2 remains OPEN
  because CA-2.3 through CA-2.5 remain OPEN.
- Implemented CA-2.1 governance bodies and memberships in
  `@afenda/corporate-administration`, including CA-owned database schema,
  migration, command/query contracts, memory and Drizzle stores, mutation-table
  ownership, event/permission/catalog wiring, hard-tenant-root inventory, and
  focused CA-2.1 tests.
- Accepted browser-only Playwright coverage for the Phase 1 Corporate
  Administration journey at
  `e2e/journey/corporate-administration-phase-1.spec.ts`; it drives the
  authenticated production app from draft registration through active status,
  reads back Neon state and verifies cross-tenant isolation.
- Fixed CA package input canonicalization so optional object fields parsed by
  Zod are omitted before deterministic command fingerprinting. Focused parser
  and command-identity coverage is included in the full package check.
- Fixed production CA app composition so language/country/currency and party
  address reference reads use CA-owned read ports over `@afenda/db` instead of
  synthetic Master Data actors that lacked permissions in the browser journey.
- Current verification is green:
  `pnpm --filter @afenda/corporate-administration check`,
  `pnpm --filter @afenda/web typecheck`,
  `pnpm --filter @afenda/web build`, and
  `pnpm exec playwright test e2e/journey/corporate-administration-phase-1.spec.ts --project=journey`.

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
