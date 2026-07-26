# Phase 5 — Assets, Licences, Insurance, Charges and Banking

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 5` |
| Initial status | `OPEN` |
| Slice count | 6 |
| Outcome | Deliver legal/administrative asset, compliance-instrument and banking registers without invading Accounting or Payments. |

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
| CA-5.1 | Property interests and title register | Phase 4 DONE | OPEN |
| CA-5.2 | Corporate assets and intellectual property | CA-5.1 | OPEN |
| CA-5.3 | Insurance-policy administration | CA-5.2 | OPEN |
| CA-5.4 | Registered charges and security interests | CA-5.3 | OPEN |
| CA-5.5 | Licence and permit lifecycle | CA-5.4 | OPEN |
| CA-5.6 | Administrative bank registrations, mandates and boundary journey | CA-5.5 | OPEN |

## CA-5.1 — Property interests and title register

**Status:** `OPEN`  
**Depends on:** Phase 4 DONE  
**Goal:** Record property/title and occupancy interests separately from financial asset accounting.

### Authoritative surface

- **Tables:** `ca_property`, `ca_property_interest_history`
- **Commands:** `registerProperty`, `updateProperty`, `recordPropertyInterest`, `supersedePropertyInterest`, `disposeOrEndPropertyInterest`
- **Queries:** `getProperty`, `listPropertiesAsOf`, `findPropertyInterestAsOf`, `reconcilePropertyAccountingReferences`
- **Events:** `property.registered.v1`, `property.interest_recorded.v1`, `property.interest_ended.v1`

### Binding rules

- Property identifier/title uniqueness is jurisdiction and type aware.
- Interest types include owned, leased, licensed, mortgaged or other configured legal interest.
- Valuation, depreciation and journals are external accounting authority.
- Title and address evidence uses document references.
- Effective interests cannot overlap incompatibly.

### Required evidence

- Title uniqueness and effective overlap
- Accounting no-write boundary
- Property/disposal chronology
- Concurrent interest change
- Parity/atomicity/security

### Paste-ready Codex prompt

```text
Execute CA-5.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Record property/title and occupancy interests separately from financial asset accounting.

Authoritative tables/surfaces: `ca_property`, `ca_property_interest_history`.
Commands: `registerProperty`, `updateProperty`, `recordPropertyInterest`, `supersedePropertyInterest`, `disposeOrEndPropertyInterest`.
Queries: `getProperty`, `listPropertiesAsOf`, `findPropertyInterestAsOf`, `reconcilePropertyAccountingReferences`.
Events: `property.registered.v1`, `property.interest_recorded.v1`, `property.interest_ended.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Property identifier/title uniqueness is jurisdiction and type aware.
- Interest types include owned, leased, licensed, mortgaged or other configured legal interest.
- Valuation, depreciation and journals are external accounting authority.
- Title and address evidence uses document references.
- Effective interests cannot overlap incompatibly.

Add direct evidence for:
- Title uniqueness and effective overlap
- Accounting no-write boundary
- Property/disposal chronology
- Concurrent interest change
- Parity/atomicity/security

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-5.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Property legal interests are complete without duplicating accounting valuation.

## CA-5.2 — Corporate assets and intellectual property

**Status:** `OPEN`  
**Depends on:** CA-5.1  
**Goal:** Maintain administrative asset and IP rights history with accounting/document references.

### Authoritative surface

- **Tables:** `ca_corporate_asset`, `ca_corporate_asset_event`, `ca_intellectual_property`, `ca_intellectual_property_event`
- **Commands:** `registerCorporateAsset`, `recordCorporateAssetEvent`, `retireCorporateAsset`, `registerIntellectualProperty`, `recordIntellectualPropertyEvent`, `renewIntellectualProperty`, `assignIntellectualProperty`, `abandonIntellectualProperty`
- **Queries:** `getCorporateAsset`, `listCorporateAssetsAsOf`, `getIntellectualProperty`, `listIntellectualPropertyAsOf`, `listExpiringIntellectualProperty`
- **Events:** `corporate_asset.registered.v1`, `intellectual_property.registered.v1`, `intellectual_property.renewed.v1`

### Binding rules

- Asset codes are company unique; accounting references are opaque and read-only.
- IP types, jurisdictions, registration/application numbers and owner party/company are explicit.
- IP events are append-only and enforce legal chronology.
- Assignment must identify transferor/transferee and source instrument.
- Expiry/renewal calculations use jurisdiction/timezone-aware dates.

### Required evidence

- IP chronology and duplicate registration
- Concurrent renewal/assignment
- Accounting/document boundary
- Expiry queries and reminders
- Failure injection and parity

### Paste-ready Codex prompt

```text
Execute CA-5.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Maintain administrative asset and IP rights history with accounting/document references.

Authoritative tables/surfaces: `ca_corporate_asset`, `ca_corporate_asset_event`, `ca_intellectual_property`, `ca_intellectual_property_event`.
Commands: `registerCorporateAsset`, `recordCorporateAssetEvent`, `retireCorporateAsset`, `registerIntellectualProperty`, `recordIntellectualPropertyEvent`, `renewIntellectualProperty`, `assignIntellectualProperty`, `abandonIntellectualProperty`.
Queries: `getCorporateAsset`, `listCorporateAssetsAsOf`, `getIntellectualProperty`, `listIntellectualPropertyAsOf`, `listExpiringIntellectualProperty`.
Events: `corporate_asset.registered.v1`, `intellectual_property.registered.v1`, `intellectual_property.renewed.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Asset codes are company unique; accounting references are opaque and read-only.
- IP types, jurisdictions, registration/application numbers and owner party/company are explicit.
- IP events are append-only and enforce legal chronology.
- Assignment must identify transferor/transferee and source instrument.
- Expiry/renewal calculations use jurisdiction/timezone-aware dates.

Add direct evidence for:
- IP chronology and duplicate registration
- Concurrent renewal/assignment
- Accounting/document boundary
- Expiry queries and reminders
- Failure injection and parity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-5.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Administrative assets and IP rights have full legal event history and safe accounting boundaries.

## CA-5.3 — Insurance-policy administration

**Status:** `OPEN`  
**Depends on:** CA-5.2  
**Goal:** Track corporate insurance coverage, insured subjects and renewal history.

### Authoritative surface

- **Tables:** `ca_insurance_policy`, `ca_insurance_policy_event`
- **Commands:** `registerInsurancePolicy`, `endorseInsurancePolicy`, `renewInsurancePolicy`, `suspendInsurancePolicy`, `cancelInsurancePolicy`
- **Queries:** `getInsurancePolicy`, `listInsurancePoliciesAsOf`, `listExpiringInsurancePolicies`, `getInsuranceCoverageForSubject`
- **Events:** `insurance_policy.registered.v1`, `insurance_policy.renewed.v1`, `insurance_policy.cancelled.v1`

### Binding rules

- Insurer is an organization party; policy identity is masked where required.
- Coverage subjects use typed CA references and cannot point cross-tenant.
- Renewals and endorsements preserve policy lineage.
- Premium payment and accounting posting are external.
- Cancellation/expiry changes coverage resolution immediately at the effective date.

### Required evidence

- Coverage-subject validation
- Renewal lineage and date gaps
- Concurrent renewal
- Payments/accounting no-write boundary
- Expiry/reminder and redaction

### Paste-ready Codex prompt

```text
Execute CA-5.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Track corporate insurance coverage, insured subjects and renewal history.

Authoritative tables/surfaces: `ca_insurance_policy`, `ca_insurance_policy_event`.
Commands: `registerInsurancePolicy`, `endorseInsurancePolicy`, `renewInsurancePolicy`, `suspendInsurancePolicy`, `cancelInsurancePolicy`.
Queries: `getInsurancePolicy`, `listInsurancePoliciesAsOf`, `listExpiringInsurancePolicies`, `getInsuranceCoverageForSubject`.
Events: `insurance_policy.registered.v1`, `insurance_policy.renewed.v1`, `insurance_policy.cancelled.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Insurer is an organization party; policy identity is masked where required.
- Coverage subjects use typed CA references and cannot point cross-tenant.
- Renewals and endorsements preserve policy lineage.
- Premium payment and accounting posting are external.
- Cancellation/expiry changes coverage resolution immediately at the effective date.

Add direct evidence for:
- Coverage-subject validation
- Renewal lineage and date gaps
- Concurrent renewal
- Payments/accounting no-write boundary
- Expiry/reminder and redaction

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-5.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Insurance coverage can be resolved by subject/date without storing payment or accounting authority.

## CA-5.4 — Registered charges and security interests

**Status:** `OPEN`  
**Depends on:** CA-5.3  
**Goal:** Maintain charge/security-interest registration, priority, variation and release.

### Authoritative surface

- **Tables:** `ca_registered_charge`, `ca_registered_charge_event`
- **Commands:** `registerCharge`, `varyCharge`, `changeChargePriority`, `recordChargeSatisfaction`, `releaseCharge`, `recordChargeEnforcement`
- **Queries:** `getRegisteredCharge`, `listRegisteredChargesAsOf`, `listChargesForSubject`, `reconcileChargeStatus`
- **Events:** `registered_charge.registered.v1`, `registered_charge.varied.v1`, `registered_charge.released.v1`

### Binding rules

- Secured party, secured subject, amount ceiling/currency, priority and registration authority are explicit.
- Variations/releases are append-only and approval/evidence controlled.
- Release cannot precede registration or occur twice.
- Subject references can include property, asset, IP or ownership interest.
- Accounting liability values are not owned.

### Required evidence

- Priority and chronology
- Duplicate/release concurrency
- Subject/reference validation
- Approval and failure injection
- Reconciliation with root status

### Paste-ready Codex prompt

```text
Execute CA-5.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Maintain charge/security-interest registration, priority, variation and release.

Authoritative tables/surfaces: `ca_registered_charge`, `ca_registered_charge_event`.
Commands: `registerCharge`, `varyCharge`, `changeChargePriority`, `recordChargeSatisfaction`, `releaseCharge`, `recordChargeEnforcement`.
Queries: `getRegisteredCharge`, `listRegisteredChargesAsOf`, `listChargesForSubject`, `reconcileChargeStatus`.
Events: `registered_charge.registered.v1`, `registered_charge.varied.v1`, `registered_charge.released.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Secured party, secured subject, amount ceiling/currency, priority and registration authority are explicit.
- Variations/releases are append-only and approval/evidence controlled.
- Release cannot precede registration or occur twice.
- Subject references can include property, asset, IP or ownership interest.
- Accounting liability values are not owned.

Add direct evidence for:
- Priority and chronology
- Duplicate/release concurrency
- Subject/reference validation
- Approval and failure injection
- Reconciliation with root status

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-5.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Charges and releases form a complete legal chain with deterministic current status.

## CA-5.5 — Licence and permit lifecycle

**Status:** `OPEN`  
**Depends on:** CA-5.4  
**Goal:** Track company/establishment licences, conditions, renewals and adverse status.

### Authoritative surface

- **Tables:** `ca_licence_permit`, `ca_licence_permit_event`
- **Commands:** `registerLicencePermit`, `addLicenceCondition`, `renewLicencePermit`, `suspendLicencePermit`, `revokeLicencePermit`, `surrenderLicencePermit`
- **Queries:** `getLicencePermit`, `listLicencePermitsAsOf`, `listExpiringLicencePermits`, `listLicenceComplianceGaps`
- **Events:** `licence_permit.registered.v1`, `licence_permit.renewed.v1`, `licence_permit.suspended.v1`, `licence_permit.revoked.v1`

### Binding rules

- Authority, jurisdiction, licensed activity, covered establishment and number are explicit.
- Conditions are versioned/effective and can generate compliance findings.
- Renewal, suspension, revocation and surrender preserve history.
- Licence validity cannot exceed establishment/company existence without documented post-closure handling.
- Reminder eligibility is timezone aware.

### Required evidence

- Authority/number uniqueness
- Condition and validity chronology
- Concurrent renewal/adverse transition
- Expiring/compliance queries
- Parity, atomicity and Action tests

### Paste-ready Codex prompt

```text
Execute CA-5.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Track company/establishment licences, conditions, renewals and adverse status.

Authoritative tables/surfaces: `ca_licence_permit`, `ca_licence_permit_event`.
Commands: `registerLicencePermit`, `addLicenceCondition`, `renewLicencePermit`, `suspendLicencePermit`, `revokeLicencePermit`, `surrenderLicencePermit`.
Queries: `getLicencePermit`, `listLicencePermitsAsOf`, `listExpiringLicencePermits`, `listLicenceComplianceGaps`.
Events: `licence_permit.registered.v1`, `licence_permit.renewed.v1`, `licence_permit.suspended.v1`, `licence_permit.revoked.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Authority, jurisdiction, licensed activity, covered establishment and number are explicit.
- Conditions are versioned/effective and can generate compliance findings.
- Renewal, suspension, revocation and surrender preserve history.
- Licence validity cannot exceed establishment/company existence without documented post-closure handling.
- Reminder eligibility is timezone aware.

Add direct evidence for:
- Authority/number uniqueness
- Condition and validity chronology
- Concurrent renewal/adverse transition
- Expiring/compliance queries
- Parity, atomicity and Action tests

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-5.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Licences and conditions are complete, searchable and ready for compliance obligation generation.

## CA-5.6 — Administrative bank registrations, mandates and boundary journey

**Status:** `OPEN`  
**Depends on:** CA-5.5  
**Goal:** Record masked bank identity and signing mandates while proving CA never moves money.

### Authoritative surface

- **Tables:** `ca_bank_account_registration`, `ca_bank_account_status_history`, `ca_bank_mandate`, `ca_bank_mandate_holder`
- **Commands:** `registerAdministrativeBankAccount`, `updateAdministrativeBankAccount`, `restrictAdministrativeBankAccount`, `closeAdministrativeBankAccount`, `grantBankMandate`, `amendBankMandate`, `revokeBankMandate`
- **Queries:** `getAdministrativeBankAccount`, `listAdministrativeBankAccountsAsOf`, `resolveBankSignatories`, `listBankMandatesAsOf`
- **Events:** `bank_account_registration.registered.v1`, `bank_account_registration.closed.v1`, `bank_mandate.granted.v1`, `bank_mandate.revoked.v1`

### Binding rules

- Store masked/tokenized identity only; reject credentials, PINs, tokens, card data and unrestricted full account values.
- Bank is a Master Data organization party; country/currency use reference ports.
- Mandates reuse effective authority/party references and support joint signature groups and limits.
- Operational payment accounts and money movement remain Payments authority.
- Grant/revocation is approval gated and events/audits are redacted.

### Required evidence

- Sensitive input rejection and leakage scan
- Bank/party/reference validation
- Joint-signatory resolution
- Payments table no-write boundary
- Full Phase 5 authenticated journey, concurrency and failure injection

### Paste-ready Codex prompt

```text
Execute CA-5.6 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Record masked bank identity and signing mandates while proving CA never moves money.

Authoritative tables/surfaces: `ca_bank_account_registration`, `ca_bank_account_status_history`, `ca_bank_mandate`, `ca_bank_mandate_holder`.
Commands: `registerAdministrativeBankAccount`, `updateAdministrativeBankAccount`, `restrictAdministrativeBankAccount`, `closeAdministrativeBankAccount`, `grantBankMandate`, `amendBankMandate`, `revokeBankMandate`.
Queries: `getAdministrativeBankAccount`, `listAdministrativeBankAccountsAsOf`, `resolveBankSignatories`, `listBankMandatesAsOf`.
Events: `bank_account_registration.registered.v1`, `bank_account_registration.closed.v1`, `bank_mandate.granted.v1`, `bank_mandate.revoked.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Store masked/tokenized identity only; reject credentials, PINs, tokens, card data and unrestricted full account values.
- Bank is a Master Data organization party; country/currency use reference ports.
- Mandates reuse effective authority/party references and support joint signature groups and limits.
- Operational payment accounts and money movement remain Payments authority.
- Grant/revocation is approval gated and events/audits are redacted.

Add direct evidence for:
- Sensitive input rejection and leakage scan
- Bank/party/reference validation
- Joint-signatory resolution
- Payments table no-write boundary
- Full Phase 5 authenticated journey, concurrency and failure injection

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-5.6 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 5 closes at 14/14 with complete asset/compliance/banking administration and proven Accounting/Payments boundaries.

## Phase-close rule

Phase 5 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
