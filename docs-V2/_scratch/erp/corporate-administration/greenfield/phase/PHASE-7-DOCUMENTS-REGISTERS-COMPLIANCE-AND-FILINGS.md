# Phase 7 — Documents, Statutory Registers, Compliance and Filings

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 7` |
| Initial status | `OPEN` |
| Slice count | 6 |
| Outcome | Deliver versioned evidence, official register snapshots, jurisdiction rule packs, generated obligations and complete filing preparation/submission history. |

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
| CA-7.1 | Corporate documents, versions and typed links | Phase 6 DONE | OPEN |
| CA-7.2 | Retention, legal holds and certified statutory registers | CA-7.1 | OPEN |
| CA-7.3 | Compliance rule packs and company profiles | CA-7.2 | OPEN |
| CA-7.4 | Filing obligations, adjustments and due engine | CA-7.3 | OPEN |
| CA-7.5 | Filing preparation, approval, submission and authority response | CA-7.4 | OPEN |
| CA-7.6 | Regulatory change impact, due/overdue journey and Phase 7 closure | CA-7.5 | OPEN |

## CA-7.1 — Corporate documents, versions and typed links

**Status:** `OPEN`  
**Depends on:** Phase 6 DONE  
**Goal:** Create a secure metadata authority for documents connected to every CA subject.

### Authoritative surface

- **Tables:** `ca_corporate_document`, `ca_corporate_document_version`, `ca_document_link`
- **Commands:** `registerCorporateDocument`, `addCorporateDocumentVersion`, `supersedeCorporateDocumentVersion`, `retireCorporateDocument`, `linkCorporateDocument`, `unlinkCorporateDocument`
- **Queries:** `getCorporateDocument`, `listCorporateDocuments`, `getCurrentDocumentVersion`, `listDocumentsForSubject`
- **Events:** `corporate_document.registered.v1`, `corporate_document.version_added.v1`, `corporate_document.linked.v1`

### Binding rules

- Store classification, checksum and opaque object reference only.
- Version chain is immutable and checksum/object validation is required.
- Typed links use an allowlisted CA subject registry.
- Signed, effective, expiry and language metadata are explicit.
- Normal events/search never expose object URLs.

### Required evidence

- Checksum/version lineage
- Object-reference validation
- Subject-link allowlist and tenant safety
- Sensitive URL leakage scan
- Concurrent version add

### Paste-ready Codex prompt

```text
Execute CA-7.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create a secure metadata authority for documents connected to every CA subject.

Authoritative tables/surfaces: `ca_corporate_document`, `ca_corporate_document_version`, `ca_document_link`.
Commands: `registerCorporateDocument`, `addCorporateDocumentVersion`, `supersedeCorporateDocumentVersion`, `retireCorporateDocument`, `linkCorporateDocument`, `unlinkCorporateDocument`.
Queries: `getCorporateDocument`, `listCorporateDocuments`, `getCurrentDocumentVersion`, `listDocumentsForSubject`.
Events: `corporate_document.registered.v1`, `corporate_document.version_added.v1`, `corporate_document.linked.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Store classification, checksum and opaque object reference only.
- Version chain is immutable and checksum/object validation is required.
- Typed links use an allowlisted CA subject registry.
- Signed, effective, expiry and language metadata are explicit.
- Normal events/search never expose object URLs.

Add direct evidence for:
- Checksum/version lineage
- Object-reference validation
- Subject-link allowlist and tenant safety
- Sensitive URL leakage scan
- Concurrent version add

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-7.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Documents are securely versioned and linked to legal facts without binary storage leakage.

## CA-7.2 — Retention, legal holds and certified statutory registers

**Status:** `OPEN`  
**Depends on:** CA-7.1  
**Goal:** Protect retention/disposition and generate immutable certified register evidence.

### Authoritative surface

- **Tables:** `ca_document_retention_rule`, `ca_legal_hold`, `ca_statutory_register`, `ca_register_snapshot`
- **Commands:** `setDocumentRetentionRule`, `placeLegalHold`, `releaseLegalHold`, `defineStatutoryRegister`, `certifyRegisterSnapshot`
- **Queries:** `getRetentionStatus`, `listActiveLegalHolds`, `renderStatutoryRegisterAsOf`, `getCertifiedRegisterSnapshot`
- **Events:** `legal_hold.placed.v1`, `legal_hold.released.v1`, `statutory_register.snapshot_certified.v1`

### Binding rules

- Legal hold blocks disposition regardless of normal retention expiry.
- Register definitions specify source aggregates, columns, ordering, jurisdiction and redaction policy.
- Snapshot generation is deterministic, permission gated and checksum backed.
- Certification records actor, approval, as-of/known-at and source version set.
- Snapshot binary/object generation stays in document/export infrastructure.

### Required evidence

- Hold precedence
- Deterministic register rendering
- Snapshot checksum and source-version capture
- Certification approval/SoD
- Large register streaming/access control

### Paste-ready Codex prompt

```text
Execute CA-7.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Protect retention/disposition and generate immutable certified register evidence.

Authoritative tables/surfaces: `ca_document_retention_rule`, `ca_legal_hold`, `ca_statutory_register`, `ca_register_snapshot`.
Commands: `setDocumentRetentionRule`, `placeLegalHold`, `releaseLegalHold`, `defineStatutoryRegister`, `certifyRegisterSnapshot`.
Queries: `getRetentionStatus`, `listActiveLegalHolds`, `renderStatutoryRegisterAsOf`, `getCertifiedRegisterSnapshot`.
Events: `legal_hold.placed.v1`, `legal_hold.released.v1`, `statutory_register.snapshot_certified.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Legal hold blocks disposition regardless of normal retention expiry.
- Register definitions specify source aggregates, columns, ordering, jurisdiction and redaction policy.
- Snapshot generation is deterministic, permission gated and checksum backed.
- Certification records actor, approval, as-of/known-at and source version set.
- Snapshot binary/object generation stays in document/export infrastructure.

Add direct evidence for:
- Hold precedence
- Deterministic register rendering
- Snapshot checksum and source-version capture
- Certification approval/SoD
- Large register streaming/access control

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-7.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Official registers can be reconstructed and certified with immutable evidence.

## CA-7.3 — Compliance rule packs and company profiles

**Status:** `OPEN`  
**Depends on:** CA-7.2  
**Goal:** Install versioned jurisdiction rules and determine company-specific applicability.

### Authoritative surface

- **Tables:** `ca_compliance_rule_pack`, `ca_compliance_rule`, `ca_company_compliance_profile`
- **Commands:** `importComplianceRulePack`, `verifyComplianceRulePack`, `activateComplianceRulePack`, `buildCompanyComplianceProfile`, `approveComplianceOverride`, `retireComplianceRulePack`
- **Queries:** `getComplianceRulePack`, `listApplicableComplianceRules`, `getCompanyComplianceProfile`, `explainRuleApplicability`
- **Events:** `compliance_rule_pack.imported.v1`, `compliance_rule_pack.activated.v1`, `company_compliance_profile.built.v1`

### Binding rules

- Pack source, version, checksum/signature, citations and effective period are mandatory.
- Applicability uses jurisdiction profile, entity/establishment type, status, activities and other approved facts.
- Rules cannot execute arbitrary code; use a safe declarative predicate/due-date model.
- Tenant override requires reason, approval and preserved baseline rule.
- Rule supersession triggers impact analysis, not silent obligation rewrite.

### Required evidence

- Signature/checksum and schema validation
- Safe predicate evaluation
- Applicability explanations
- Override approval/SoD
- Rule-version and effective-date behavior

### Paste-ready Codex prompt

```text
Execute CA-7.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Install versioned jurisdiction rules and determine company-specific applicability.

Authoritative tables/surfaces: `ca_compliance_rule_pack`, `ca_compliance_rule`, `ca_company_compliance_profile`.
Commands: `importComplianceRulePack`, `verifyComplianceRulePack`, `activateComplianceRulePack`, `buildCompanyComplianceProfile`, `approveComplianceOverride`, `retireComplianceRulePack`.
Queries: `getComplianceRulePack`, `listApplicableComplianceRules`, `getCompanyComplianceProfile`, `explainRuleApplicability`.
Events: `compliance_rule_pack.imported.v1`, `compliance_rule_pack.activated.v1`, `company_compliance_profile.built.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Pack source, version, checksum/signature, citations and effective period are mandatory.
- Applicability uses jurisdiction profile, entity/establishment type, status, activities and other approved facts.
- Rules cannot execute arbitrary code; use a safe declarative predicate/due-date model.
- Tenant override requires reason, approval and preserved baseline rule.
- Rule supersession triggers impact analysis, not silent obligation rewrite.

Add direct evidence for:
- Signature/checksum and schema validation
- Safe predicate evaluation
- Applicability explanations
- Override approval/SoD
- Rule-version and effective-date behavior

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-7.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Compliance requirements are versioned, explainable and safe to use for obligation generation.

## CA-7.4 — Filing obligations, adjustments and due engine

**Status:** `OPEN`  
**Depends on:** CA-7.3  
**Goal:** Generate and maintain statutory obligations from applicable rules and corporate events.

### Authoritative surface

- **Tables:** `ca_filing_obligation`, `ca_filing_obligation_adjustment`
- **Commands:** `generateFilingObligations`, `createManualFilingObligation`, `extendFilingObligation`, `waiveFilingObligation`, `correctFilingDueDate`, `cancelFilingObligation`
- **Queries:** `getFilingObligation`, `listFilingObligations`, `listDueFilings`, `listOverdueFilings`, `explainFilingDueDate`
- **Events:** `filing_obligation.generated.v1`, `filing_obligation.extended.v1`, `filing_obligation.waived.v1`

### Binding rules

- Unique scope is rule, company/establishment, authority and period/event.
- Due calculation is deterministic, timezone/calendar aware and records the rule version/input facts.
- Extensions, waivers and corrections are append-only evidence.
- Waiver/material override is high risk and approval gated.
- Regeneration is idempotent and cannot duplicate obligations.

### Required evidence

- Recurring/event-driven due calculations
- Timezone/weekend/calendar behavior
- Idempotent generation and concurrent duplicate prevention
- Waiver/extension approval
- Due/overdue clock determinism

### Paste-ready Codex prompt

```text
Execute CA-7.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Generate and maintain statutory obligations from applicable rules and corporate events.

Authoritative tables/surfaces: `ca_filing_obligation`, `ca_filing_obligation_adjustment`.
Commands: `generateFilingObligations`, `createManualFilingObligation`, `extendFilingObligation`, `waiveFilingObligation`, `correctFilingDueDate`, `cancelFilingObligation`.
Queries: `getFilingObligation`, `listFilingObligations`, `listDueFilings`, `listOverdueFilings`, `explainFilingDueDate`.
Events: `filing_obligation.generated.v1`, `filing_obligation.extended.v1`, `filing_obligation.waived.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Unique scope is rule, company/establishment, authority and period/event.
- Due calculation is deterministic, timezone/calendar aware and records the rule version/input facts.
- Extensions, waivers and corrections are append-only evidence.
- Waiver/material override is high risk and approval gated.
- Regeneration is idempotent and cannot duplicate obligations.

Add direct evidence for:
- Recurring/event-driven due calculations
- Timezone/weekend/calendar behavior
- Idempotent generation and concurrent duplicate prevention
- Waiver/extension approval
- Due/overdue clock determinism

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-7.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Filing obligations are generated once, explainable and historically adjusted without destructive rewrite.

## CA-7.5 — Filing preparation, approval, submission and authority response

**Status:** `OPEN`  
**Depends on:** CA-7.4  
**Goal:** Complete the filing lifecycle without falsely claiming regulator e-filing.

### Authoritative surface

- **Tables:** `ca_filing_work_item`, `ca_filing_submission`, `ca_filing_submission_event`
- **Commands:** `startFilingPreparation`, `submitFilingForReview`, `approveFilingForSubmission`, `recordFilingSubmission`, `recordFilingAcknowledgement`, `recordFilingRejection`, `recordFilingQuery`, `recordCorrectedSubmission`, `withdrawFilingSubmission`
- **Queries:** `getFilingWorkItem`, `getFilingSubmissionHistory`, `getFilingStatus`, `listFilingsAwaitingAction`
- **Events:** `filing.preparation_started.v1`, `filing.approved_for_submission.v1`, `filing_submission.recorded.v1`, `filing_submission.acknowledged.v1`, `filing_submission.rejected.v1`

### Binding rules

- Preparation/review/signatory/approval states are explicit.
- External submission is recorded only with receipt/evidence or a real adapter result.
- Submission and authority responses are append-only.
- Approver/signatory eligibility resolves through authority contracts.
- Obligation status is derived from authoritative adjustments and latest valid submission response.

### Required evidence

- Workflow transition matrix
- Signatory/approval resolution
- Submission chronology and idempotency
- Rejected/corrected chains
- Obligation/submission reconciliation

### Paste-ready Codex prompt

```text
Execute CA-7.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Complete the filing lifecycle without falsely claiming regulator e-filing.

Authoritative tables/surfaces: `ca_filing_work_item`, `ca_filing_submission`, `ca_filing_submission_event`.
Commands: `startFilingPreparation`, `submitFilingForReview`, `approveFilingForSubmission`, `recordFilingSubmission`, `recordFilingAcknowledgement`, `recordFilingRejection`, `recordFilingQuery`, `recordCorrectedSubmission`, `withdrawFilingSubmission`.
Queries: `getFilingWorkItem`, `getFilingSubmissionHistory`, `getFilingStatus`, `listFilingsAwaitingAction`.
Events: `filing.preparation_started.v1`, `filing.approved_for_submission.v1`, `filing_submission.recorded.v1`, `filing_submission.acknowledged.v1`, `filing_submission.rejected.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Preparation/review/signatory/approval states are explicit.
- External submission is recorded only with receipt/evidence or a real adapter result.
- Submission and authority responses are append-only.
- Approver/signatory eligibility resolves through authority contracts.
- Obligation status is derived from authoritative adjustments and latest valid submission response.

Add direct evidence for:
- Workflow transition matrix
- Signatory/approval resolution
- Submission chronology and idempotency
- Rejected/corrected chains
- Obligation/submission reconciliation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-7.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Filing preparation and external-response history are complete and honest about adapter boundaries.

## CA-7.6 — Regulatory change impact, due/overdue journey and Phase 7 closure

**Status:** `OPEN`  
**Depends on:** CA-7.5  
**Goal:** Detect rule changes, assess affected companies/obligations and close the compliance user journey.

### Authoritative surface

- **Tables:** `ca_regulatory_change_notice` plus Phase 7 tables
- **Commands:** `assessRegulatoryChangeImpact`, `acceptRegulatoryChangeImpact`, `remediateRegulatoryChangeImpact`
- **Queries:** `listRegulatoryChangeImpacts`, `getComplianceCalendar`, `getComplianceCompleteness`
- **Events:** `regulatory_change.impact_assessed.v1`, `regulatory_change.impact_accepted.v1`

### Binding rules

- Rule-pack supersession compares old/new requirements and identifies affected profiles, registers and obligations.
- No existing filed history is rewritten.
- Open obligations are changed only through explicit adjustment/cancellation/new obligation facts.
- Impact acceptance records accountable user and approval where material.
- UI shows due, overdue, waived, submitted, rejected and acknowledged states with explanations.

### Required evidence

- Rule-pack diff and impact determinism
- Historical non-rewrite
- Obligation adjustment generation
- Cross-tenant compliance calendar
- Full authenticated Phase 7 journey and accessibility

### Paste-ready Codex prompt

```text
Execute CA-7.6 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Detect rule changes, assess affected companies/obligations and close the compliance user journey.

Authoritative tables/surfaces: `ca_regulatory_change_notice` plus Phase 7 tables.
Commands: `assessRegulatoryChangeImpact`, `acceptRegulatoryChangeImpact`, `remediateRegulatoryChangeImpact`.
Queries: `listRegulatoryChangeImpacts`, `getComplianceCalendar`, `getComplianceCompleteness`.
Events: `regulatory_change.impact_assessed.v1`, `regulatory_change.impact_accepted.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Rule-pack supersession compares old/new requirements and identifies affected profiles, registers and obligations.
- No existing filed history is rewritten.
- Open obligations are changed only through explicit adjustment/cancellation/new obligation facts.
- Impact acceptance records accountable user and approval where material.
- UI shows due, overdue, waived, submitted, rejected and acknowledged states with explanations.

Add direct evidence for:
- Rule-pack diff and impact determinism
- Historical non-rewrite
- Obligation adjustment generation
- Cross-tenant compliance calendar
- Full authenticated Phase 7 journey and accessibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-7.6 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 7 closes at 14/14 with evidence, rules, obligations and filing history fully reconciled.

## Phase-close rule

Phase 7 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
