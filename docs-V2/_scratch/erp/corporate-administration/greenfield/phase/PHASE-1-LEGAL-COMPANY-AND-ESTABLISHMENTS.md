# Phase 1 — Legal Company and Establishments

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 1` |
| Initial status | `OPEN` |
| Slice count | 5 |
| Outcome | Deliver complete statutory identity, legal-form, identifier, status, financial-year, establishment and registered-address history. |

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
| CA-1.1 | Legal-company registry and jurisdiction profile | Phase 0 DONE | OPEN |
| CA-1.2 | Effective legal names and legal forms | CA-1.1 | OPEN |
| CA-1.3 | Corporate identifiers, financial years and registered activities | CA-1.2 | OPEN |
| CA-1.4 | Registered offices, legal establishments and premises | CA-1.3 | OPEN |
| CA-1.5 | Company status, financial lifecycle and Phase 1 journey | CA-1.4 | OPEN |

## CA-1.1 — Legal-company registry and jurisdiction profile

**Status:** `OPEN`  
**Depends on:** Phase 0 DONE  
**Goal:** Expand the thin draft root into a jurisdiction-aware legal-company aggregate.

### Authoritative surface

- **Tables:** `ca_legal_company`, `ca_company_jurisdiction_profile`
- **Commands:** `updateLegalCompanyProfile`, `setCompanyJurisdictionProfile`, `supersedeCompanyJurisdictionProfile`
- **Queries:** `getLegalCompany`, `listLegalCompanies`, `findCompanyJurisdictionProfileAsOf`, `getLegalCompanyTimeline`
- **Events:** `legal_company.profile_updated.v1`, `legal_company.jurisdiction_profile_set.v1`

### Binding rules

- Separate tenant, legal company and Master Data party identities.
- Enforce jurisdiction/entity-type compatibility through reference/rule ports.
- Support effective and recorded time, future-dated changes and retroactive corrections by supersession.
- Prevent overlapping jurisdiction profiles.
- Expose `asOf` and `knownAt` reconstruction.

### Required evidence

- Effective-range and bitemporal resolution
- Reference invalid/inactive cases
- Stale version and idempotency
- Neon overlap concurrency
- Parity and tenant isolation

### Paste-ready Codex prompt

```text
Execute CA-1.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Expand the thin draft root into a jurisdiction-aware legal-company aggregate.

Authoritative tables/surfaces: `ca_legal_company`, `ca_company_jurisdiction_profile`.
Commands: `updateLegalCompanyProfile`, `setCompanyJurisdictionProfile`, `supersedeCompanyJurisdictionProfile`.
Queries: `getLegalCompany`, `listLegalCompanies`, `findCompanyJurisdictionProfileAsOf`, `getLegalCompanyTimeline`.
Events: `legal_company.profile_updated.v1`, `legal_company.jurisdiction_profile_set.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Separate tenant, legal company and Master Data party identities.
- Enforce jurisdiction/entity-type compatibility through reference/rule ports.
- Support effective and recorded time, future-dated changes and retroactive corrections by supersession.
- Prevent overlapping jurisdiction profiles.
- Expose `asOf` and `knownAt` reconstruction.

Add direct evidence for:
- Effective-range and bitemporal resolution
- Reference invalid/inactive cases
- Stale version and idempotency
- Neon overlap concurrency
- Parity and tenant isolation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-1.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

The legal-company profile and jurisdiction can be reconstructed deterministically for any supported effective/recorded time.

## CA-1.2 — Effective legal names and legal forms

**Status:** `OPEN`  
**Depends on:** CA-1.1  
**Goal:** Record multilingual statutory names and legal-form history without rewriting the party master.

### Authoritative surface

- **Tables:** `ca_company_name`, `ca_company_legal_form_history`
- **Commands:** `addCompanyName`, `supersedeCompanyName`, `retireCompanyName`, `setCompanyLegalForm`, `supersedeCompanyLegalForm`
- **Queries:** `listCompanyNames`, `findCompanyNameAsOf`, `findCompanyLegalFormAsOf`
- **Events:** `legal_company.name_added.v1`, `legal_company.name_superseded.v1`, `legal_company.legal_form_changed.v1`

### Binding rules

- Name types include legal, former, translated and trading; language is explicit.
- Normalize comparison values while preserving display form.
- Prevent overlapping effective names by type/language and overlapping legal-form history.
- Do not dual-write `md_party`; emit reconciliation-friendly facts.
- Name/legal-form changes require source evidence and, when configured, approval.

### Required evidence

- Unicode normalization and duplicate detection
- Multilingual and former-name history
- Overlap and chronology concurrency
- Party boundary tests
- Redacted audit/event snapshots

### Paste-ready Codex prompt

```text
Execute CA-1.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Record multilingual statutory names and legal-form history without rewriting the party master.

Authoritative tables/surfaces: `ca_company_name`, `ca_company_legal_form_history`.
Commands: `addCompanyName`, `supersedeCompanyName`, `retireCompanyName`, `setCompanyLegalForm`, `supersedeCompanyLegalForm`.
Queries: `listCompanyNames`, `findCompanyNameAsOf`, `findCompanyLegalFormAsOf`.
Events: `legal_company.name_added.v1`, `legal_company.name_superseded.v1`, `legal_company.legal_form_changed.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Name types include legal, former, translated and trading; language is explicit.
- Normalize comparison values while preserving display form.
- Prevent overlapping effective names by type/language and overlapping legal-form history.
- Do not dual-write `md_party`; emit reconciliation-friendly facts.
- Name/legal-form changes require source evidence and, when configured, approval.

Add direct evidence for:
- Unicode normalization and duplicate detection
- Multilingual and former-name history
- Overlap and chronology concurrency
- Party boundary tests
- Redacted audit/event snapshots

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-1.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Statutory names and legal forms are complete, effective-dated and independent from operational party-master mutation.

## CA-1.3 — Corporate identifiers, financial years and registered activities

**Status:** `OPEN`  
**Depends on:** CA-1.2  
**Goal:** Complete the remaining legal-company identity facts while protecting Master Data tax authority.

### Authoritative surface

- **Tables:** `ca_company_identifier`, `ca_company_financial_year`, `ca_company_activity`
- **Commands:** `registerCompanyIdentifier`, `supersedeCompanyIdentifier`, `retireCompanyIdentifier`, `setCompanyFinancialYear`, `registerCompanyActivity`, `endCompanyActivity`
- **Queries:** `listCompanyIdentifiers`, `findCompanyIdentifierAsOf`, `findCompanyFinancialYearAsOf`, `listCompanyActivitiesAsOf`
- **Events:** `legal_company.identifier_registered.v1`, `legal_company.financial_year_set.v1`, `legal_company.activity_registered.v1`

### Binding rules

- Explicitly reject tax-identifier types and direct users to `md_tax_registration`.
- Apply authority/jurisdiction-aware identifier uniqueness.
- Financial-year changes preserve history and cannot create ambiguous periods.
- Activities support registered-object, regulated and operational classifications.
- Validate country/currency/reference values only through public ports.

### Required evidence

- Tax-boundary rejection and read-only reconciliation
- Natural-key and effective-range uniqueness
- Financial-year chronology
- Reference-port failure mapping
- Parity/concurrency/atomicity

### Paste-ready Codex prompt

```text
Execute CA-1.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Complete the remaining legal-company identity facts while protecting Master Data tax authority.

Authoritative tables/surfaces: `ca_company_identifier`, `ca_company_financial_year`, `ca_company_activity`.
Commands: `registerCompanyIdentifier`, `supersedeCompanyIdentifier`, `retireCompanyIdentifier`, `setCompanyFinancialYear`, `registerCompanyActivity`, `endCompanyActivity`.
Queries: `listCompanyIdentifiers`, `findCompanyIdentifierAsOf`, `findCompanyFinancialYearAsOf`, `listCompanyActivitiesAsOf`.
Events: `legal_company.identifier_registered.v1`, `legal_company.financial_year_set.v1`, `legal_company.activity_registered.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Explicitly reject tax-identifier types and direct users to `md_tax_registration`.
- Apply authority/jurisdiction-aware identifier uniqueness.
- Financial-year changes preserve history and cannot create ambiguous periods.
- Activities support registered-object, regulated and operational classifications.
- Validate country/currency/reference values only through public ports.

Add direct evidence for:
- Tax-boundary rejection and read-only reconciliation
- Natural-key and effective-range uniqueness
- Financial-year chronology
- Reference-port failure mapping
- Parity/concurrency/atomicity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-1.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Non-tax identifiers, financial-year history and registered activities are complete without shadowing Master Data.

## CA-1.4 — Registered offices, legal establishments and premises

**Status:** `OPEN`  
**Depends on:** CA-1.3  
**Goal:** Distinguish statutory establishments from physical premises and preserve legal-address history.

### Authoritative surface

- **Tables:** `ca_legal_establishment`, `ca_establishment_status_history`, `ca_registered_address`, `ca_premise`
- **Commands:** `registerLegalEstablishment`, `updateLegalEstablishment`, `activateLegalEstablishment`, `suspendLegalEstablishment`, `closeLegalEstablishment`, `setRegisteredAddress`, `registerPremise`, `endPremise`
- **Queries:** `getLegalEstablishment`, `listLegalEstablishmentsAsOf`, `findRegisteredAddressAsOf`, `listPremisesAsOf`
- **Events:** `legal_establishment.registered.v1`, `legal_establishment.status_changed.v1`, `registered_address.set.v1`, `premise.registered.v1`

### Binding rules

- Types include branch, representative office, foreign registration and other configured establishment.
- An establishment cannot be active outside the legal company’s existence.
- Registered office/service/place-of-business address types are distinct.
- Address snapshots are statutory facts; no direct write to `md_party_address`.
- Establishment registration identifiers are jurisdiction/type unique.

### Required evidence

- Company-existence and chronology guards
- Address effective-range overlap
- Cross-tenant party/address reference protection
- Concurrent duplicate establishment
- Authenticated establishment workflow

### Paste-ready Codex prompt

```text
Execute CA-1.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Distinguish statutory establishments from physical premises and preserve legal-address history.

Authoritative tables/surfaces: `ca_legal_establishment`, `ca_establishment_status_history`, `ca_registered_address`, `ca_premise`.
Commands: `registerLegalEstablishment`, `updateLegalEstablishment`, `activateLegalEstablishment`, `suspendLegalEstablishment`, `closeLegalEstablishment`, `setRegisteredAddress`, `registerPremise`, `endPremise`.
Queries: `getLegalEstablishment`, `listLegalEstablishmentsAsOf`, `findRegisteredAddressAsOf`, `listPremisesAsOf`.
Events: `legal_establishment.registered.v1`, `legal_establishment.status_changed.v1`, `registered_address.set.v1`, `premise.registered.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Types include branch, representative office, foreign registration and other configured establishment.
- An establishment cannot be active outside the legal company’s existence.
- Registered office/service/place-of-business address types are distinct.
- Address snapshots are statutory facts; no direct write to `md_party_address`.
- Establishment registration identifiers are jurisdiction/type unique.

Add direct evidence for:
- Company-existence and chronology guards
- Address effective-range overlap
- Cross-tenant party/address reference protection
- Concurrent duplicate establishment
- Authenticated establishment workflow

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-1.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Legal presence, registered addresses and physical premises are separately modeled and historically reconstructable.

## CA-1.5 — Company status, financial lifecycle and Phase 1 journey

**Status:** `OPEN`  
**Depends on:** CA-1.4  
**Goal:** Close legal-company lifecycle with controlled activation, suspension, strike-off, liquidation, dissolution, restoration and archival.

### Authoritative surface

- **Tables:** `ca_company_status_history` plus Phase 1 tables
- **Commands:** `activateLegalCompany`, `suspendLegalCompany`, `markCompanyStruckOff`, `enterLiquidation`, `dissolveLegalCompany`, `restoreLegalCompany`, `archiveLegalCompany`
- **Queries:** `findCompanyStatusAsOf`, `listCompaniesByStatus`, `getCompanyCompletenessForActivation`
- **Events:** `legal_company.activated.v1`, `legal_company.suspended.v1`, `legal_company.dissolved.v1`, `legal_company.restored.v1`

### Binding rules

- Activation requires configured minimum identity, name, identifier, legal form, registered address and evidence.
- High-risk transitions require approval and explicit reason.
- Dissolution/end states prevent new effective child facts except correction, filing or restoration workflows.
- Restoration preserves the original identity and status lineage.
- Archive is an administrative state, not a legal dissolution substitute.

### Required evidence

- Transition matrix and activation completeness
- Approval/SoD for high-risk statuses
- Concurrent transitions and stale versions
- As-of/known-at timeline
- Authenticated end-to-end Phase 1 journey and accessibility

### Paste-ready Codex prompt

```text
Execute CA-1.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Close legal-company lifecycle with controlled activation, suspension, strike-off, liquidation, dissolution, restoration and archival.

Authoritative tables/surfaces: `ca_company_status_history` plus Phase 1 tables.
Commands: `activateLegalCompany`, `suspendLegalCompany`, `markCompanyStruckOff`, `enterLiquidation`, `dissolveLegalCompany`, `restoreLegalCompany`, `archiveLegalCompany`.
Queries: `findCompanyStatusAsOf`, `listCompaniesByStatus`, `getCompanyCompletenessForActivation`.
Events: `legal_company.activated.v1`, `legal_company.suspended.v1`, `legal_company.dissolved.v1`, `legal_company.restored.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Activation requires configured minimum identity, name, identifier, legal form, registered address and evidence.
- High-risk transitions require approval and explicit reason.
- Dissolution/end states prevent new effective child facts except correction, filing or restoration workflows.
- Restoration preserves the original identity and status lineage.
- Archive is an administrative state, not a legal dissolution substitute.

Add direct evidence for:
- Transition matrix and activation completeness
- Approval/SoD for high-risk statuses
- Concurrent transitions and stale versions
- As-of/known-at timeline
- Authenticated end-to-end Phase 1 journey and accessibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-1.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 1 closes at 14/14 with complete legal-company and establishment history through real Actions and persisted UI.

## Phase-close rule

Phase 1 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
