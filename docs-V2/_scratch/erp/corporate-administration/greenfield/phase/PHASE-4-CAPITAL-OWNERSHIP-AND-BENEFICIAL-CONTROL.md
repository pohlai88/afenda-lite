# Phase 4 — Capital, Ownership and Beneficial Control

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 4` |
| Initial status | `OPEN` |
| Slice count | 6 |
| Outcome | Create a balanced immutable capital ledger, certificate register, ownership restrictions, UBO chain and legal distribution declarations. |

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
| CA-4.1 | Share classes and class rights | Phase 3 DONE | OPEN |
| CA-4.2 | Immutable capital transaction ledger and holdings as-of | CA-4.1 | OPEN |
| CA-4.3 | Security certificates and certificate events | CA-4.2 | OPEN |
| CA-4.4 | Ownership encumbrances, nominee/trust and control relationships | CA-4.3 | OPEN |
| CA-4.5 | Beneficial-owner cases, disclosure, attestation and discrepancy | CA-4.4 | OPEN |
| CA-4.6 | Distributions, entitlement snapshots and Phase 4 reconciliation | CA-4.5 | OPEN |

## CA-4.1 — Share classes and class rights

**Status:** `OPEN`  
**Depends on:** Phase 3 DONE  
**Goal:** Define authorized security classes and rights without posting ownership yet.

### Authoritative surface

- **Tables:** `ca_share_class`, `ca_share_class_right`
- **Commands:** `createShareClass`, `amendShareClassRights`, `activateShareClass`, `retireShareClass`
- **Queries:** `getShareClass`, `listShareClassesAsOf`, `getShareClassRightsAsOf`
- **Events:** `share_class.created.v1`, `share_class.rights_amended.v1`, `share_class.activated.v1`

### Binding rules

- Class code is unique per company; currency and par/no-par model are explicit.
- Rights cover voting, dividend, preference, redemption and conversion.
- Activated class terms are corrected by successor version, not overwrite.
- Class changes requiring holder approval reference a resolution.
- Retirement is blocked while issued quantity or active instruments remain unless a legal conversion/cancellation action exists.

### Required evidence

- Class uniqueness and rights validation
- Effective rights history
- Resolution/approval requirement
- Concurrent activation
- Parity and tenant isolation

### Paste-ready Codex prompt

```text
Execute CA-4.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Define authorized security classes and rights without posting ownership yet.

Authoritative tables/surfaces: `ca_share_class`, `ca_share_class_right`.
Commands: `createShareClass`, `amendShareClassRights`, `activateShareClass`, `retireShareClass`.
Queries: `getShareClass`, `listShareClassesAsOf`, `getShareClassRightsAsOf`.
Events: `share_class.created.v1`, `share_class.rights_amended.v1`, `share_class.activated.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Class code is unique per company; currency and par/no-par model are explicit.
- Rights cover voting, dividend, preference, redemption and conversion.
- Activated class terms are corrected by successor version, not overwrite.
- Class changes requiring holder approval reference a resolution.
- Retirement is blocked while issued quantity or active instruments remain unless a legal conversion/cancellation action exists.

Add direct evidence for:
- Class uniqueness and rights validation
- Effective rights history
- Resolution/approval requirement
- Concurrent activation
- Parity and tenant isolation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-4.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Share classes and their legal rights are effective-dated and ready for ledger posting.

## CA-4.2 — Immutable capital transaction ledger and holdings as-of

**Status:** `OPEN`  
**Depends on:** CA-4.1  
**Goal:** Post balanced allotment, transfer, buyback, cancellation, redemption, conversion, split, consolidation, reduction and reversal transactions.

### Authoritative surface

- **Tables:** `ca_capital_transaction`, `ca_capital_transaction_leg`
- **Commands:** `postCapitalTransaction`, `reverseCapitalTransaction`
- **Queries:** `getCapitalTransaction`, `listCapitalTransactions`, `getShareholdingsAsOf`, `getIssuedCapitalAsOf`, `reconcileCapitalLedger`
- **Events:** `capital_transaction.posted.v1`, `capital_transaction.reversed.v1`

### Binding rules

- Transaction types use discriminated schemas and type-specific balancing rules.
- Posted rows and legs are immutable.
- Holder positions and issued quantities cannot become negative.
- Transfer preserves company-wide issued quantity; issue/cancellation types change it only as legally defined.
- Posting/reversal requires idempotency, lock ordering, approval and resolution/evidence references where configured.

### Required evidence

- Property-based ledger balancing
- Insufficient holding and negative prevention
- Concurrent transfer/allotment/reversal
- As-of holdings determinism
- Neon failure injection and high-risk approval

### Paste-ready Codex prompt

```text
Execute CA-4.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Post balanced allotment, transfer, buyback, cancellation, redemption, conversion, split, consolidation, reduction and reversal transactions.

Authoritative tables/surfaces: `ca_capital_transaction`, `ca_capital_transaction_leg`.
Commands: `postCapitalTransaction`, `reverseCapitalTransaction`.
Queries: `getCapitalTransaction`, `listCapitalTransactions`, `getShareholdingsAsOf`, `getIssuedCapitalAsOf`, `reconcileCapitalLedger`.
Events: `capital_transaction.posted.v1`, `capital_transaction.reversed.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Transaction types use discriminated schemas and type-specific balancing rules.
- Posted rows and legs are immutable.
- Holder positions and issued quantities cannot become negative.
- Transfer preserves company-wide issued quantity; issue/cancellation types change it only as legally defined.
- Posting/reversal requires idempotency, lock ordering, approval and resolution/evidence references where configured.

Add direct evidence for:
- Property-based ledger balancing
- Insufficient holding and negative prevention
- Concurrent transfer/allotment/reversal
- As-of holdings determinism
- Neon failure injection and high-risk approval

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-4.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

The capital ledger reconstructs identical holdings and issued capital under memory and Drizzle, including concurrent posting.

## CA-4.3 — Security certificates and certificate events

**Status:** `OPEN`  
**Depends on:** CA-4.2  
**Goal:** Maintain a legal certificate register tied to ledger-derived eligible holdings.

### Authoritative surface

- **Tables:** `ca_security_certificate`, `ca_security_certificate_event`
- **Commands:** `issueSecurityCertificate`, `endorseCertificateTransfer`, `splitCertificate`, `consolidateCertificates`, `markCertificateLost`, `replaceCertificate`, `cancelCertificate`
- **Queries:** `getSecurityCertificate`, `listCertificatesAsOf`, `getCertificateHistory`, `reconcileCertificatesToHoldings`
- **Events:** `security_certificate.issued.v1`, `security_certificate.replaced.v1`, `security_certificate.cancelled.v1`

### Binding rules

- Certificate number is company unique and governed by numbering policy.
- Issue quantity cannot exceed eligible uncertificated/available holding under configured model.
- Lost replacement preserves lineage and prevents both originals from remaining valid.
- Split/consolidation conserves quantity.
- Events are append-only and approval/evidence aware.

### Required evidence

- Quantity conservation
- Duplicate numbering and concurrent issue
- Lost/replacement lineage
- Certificate-to-holding reconciliation
- Authenticated certificate workflow

### Paste-ready Codex prompt

```text
Execute CA-4.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Maintain a legal certificate register tied to ledger-derived eligible holdings.

Authoritative tables/surfaces: `ca_security_certificate`, `ca_security_certificate_event`.
Commands: `issueSecurityCertificate`, `endorseCertificateTransfer`, `splitCertificate`, `consolidateCertificates`, `markCertificateLost`, `replaceCertificate`, `cancelCertificate`.
Queries: `getSecurityCertificate`, `listCertificatesAsOf`, `getCertificateHistory`, `reconcileCertificatesToHoldings`.
Events: `security_certificate.issued.v1`, `security_certificate.replaced.v1`, `security_certificate.cancelled.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Certificate number is company unique and governed by numbering policy.
- Issue quantity cannot exceed eligible uncertificated/available holding under configured model.
- Lost replacement preserves lineage and prevents both originals from remaining valid.
- Split/consolidation conserves quantity.
- Events are append-only and approval/evidence aware.

Add direct evidence for:
- Quantity conservation
- Duplicate numbering and concurrent issue
- Lost/replacement lineage
- Certificate-to-holding reconciliation
- Authenticated certificate workflow

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-4.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Certificates reconcile to the capital ledger with complete immutable history.

## CA-4.4 — Ownership encumbrances, nominee/trust and control relationships

**Status:** `OPEN`  
**Depends on:** CA-4.3  
**Goal:** Represent legal restrictions and differences between registered, economic and controlling ownership.

### Authoritative surface

- **Tables:** `ca_ownership_encumbrance`, `ca_ownership_encumbrance_event`, `ca_ownership_control_relationship`, `ca_nominee_or_trust_relationship`
- **Commands:** `registerOwnershipEncumbrance`, `varyOwnershipEncumbrance`, `releaseOwnershipEncumbrance`, `recordOwnershipControl`, `recordNomineeOrTrustRelationship`, `endOwnershipRelationship`
- **Queries:** `listOwnershipEncumbrancesAsOf`, `getAvailableTransferQuantity`, `resolveOwnershipControlChain`
- **Events:** `ownership_encumbrance.registered.v1`, `ownership_encumbrance.released.v1`, `ownership_control.recorded.v1`

### Binding rules

- Encumbrances identify affected class/holding/quantity, priority, secured party and restriction type.
- Transfer validation considers active restrictions.
- Nominee/trust facts distinguish registered holder, beneficial party and legal basis.
- Control relationships support voting, economic and contractual basis with canonical percentages.
- Graph traversal is deterministic and bounded.

### Required evidence

- Restricted transfer prevention
- Variation/release lineage
- Percentage/graph calculation
- Cycle and depth behavior
- Sensitive party data redaction

### Paste-ready Codex prompt

```text
Execute CA-4.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Represent legal restrictions and differences between registered, economic and controlling ownership.

Authoritative tables/surfaces: `ca_ownership_encumbrance`, `ca_ownership_encumbrance_event`, `ca_ownership_control_relationship`, `ca_nominee_or_trust_relationship`.
Commands: `registerOwnershipEncumbrance`, `varyOwnershipEncumbrance`, `releaseOwnershipEncumbrance`, `recordOwnershipControl`, `recordNomineeOrTrustRelationship`, `endOwnershipRelationship`.
Queries: `listOwnershipEncumbrancesAsOf`, `getAvailableTransferQuantity`, `resolveOwnershipControlChain`.
Events: `ownership_encumbrance.registered.v1`, `ownership_encumbrance.released.v1`, `ownership_control.recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Encumbrances identify affected class/holding/quantity, priority, secured party and restriction type.
- Transfer validation considers active restrictions.
- Nominee/trust facts distinguish registered holder, beneficial party and legal basis.
- Control relationships support voting, economic and contractual basis with canonical percentages.
- Graph traversal is deterministic and bounded.

Add direct evidence for:
- Restricted transfer prevention
- Variation/release lineage
- Percentage/graph calculation
- Cycle and depth behavior
- Sensitive party data redaction

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-4.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Registered holdings can be distinguished from encumbered, nominee, beneficial and controlling interests.

## CA-4.5 — Beneficial-owner cases, disclosure, attestation and discrepancy

**Status:** `OPEN`  
**Depends on:** CA-4.4  
**Goal:** Create an evidence-based UBO process rather than a single percentage field.

### Authoritative surface

- **Tables:** `ca_beneficial_owner_case`, `ca_beneficial_owner_relationship`, `ca_beneficial_owner_disclosure`, `ca_beneficial_owner_attestation`, `ca_beneficial_owner_discrepancy`
- **Commands:** `openBeneficialOwnerCase`, `recordBeneficialOwnerRelationship`, `recordBeneficialOwnerDisclosure`, `raiseBeneficialOwnerDiscrepancy`, `resolveBeneficialOwnerDiscrepancy`, `attestBeneficialOwnerCase`, `supersedeBeneficialOwnerAttestation`
- **Queries:** `getBeneficialOwnerCase`, `resolveBeneficialOwnersAsOf`, `listUnresolvedUboDiscrepancies`, `getUboEvidenceCompleteness`
- **Events:** `beneficial_owner.case_opened.v1`, `beneficial_owner.disclosure_recorded.v1`, `beneficial_owner.attested.v1`, `beneficial_owner.discrepancy_raised.v1`

### Binding rules

- Control basis includes ownership, voting, appointment, contractual and other configured bases.
- Derived chain and reported disclosure are stored separately and reconciled.
- Attestation is approval-gated and records rule-pack/version used.
- Sensitive identity attributes remain behind protected-identity controls.
- Unresolved material discrepancy prevents a clean compliance status.

### Required evidence

- Direct and indirect control chains
- Nominee/trust chain resolution
- Threshold/rule-pack versions
- Approval and SoD attestation
- Sensitive read/export and discrepancy workflow

### Paste-ready Codex prompt

```text
Execute CA-4.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create an evidence-based UBO process rather than a single percentage field.

Authoritative tables/surfaces: `ca_beneficial_owner_case`, `ca_beneficial_owner_relationship`, `ca_beneficial_owner_disclosure`, `ca_beneficial_owner_attestation`, `ca_beneficial_owner_discrepancy`.
Commands: `openBeneficialOwnerCase`, `recordBeneficialOwnerRelationship`, `recordBeneficialOwnerDisclosure`, `raiseBeneficialOwnerDiscrepancy`, `resolveBeneficialOwnerDiscrepancy`, `attestBeneficialOwnerCase`, `supersedeBeneficialOwnerAttestation`.
Queries: `getBeneficialOwnerCase`, `resolveBeneficialOwnersAsOf`, `listUnresolvedUboDiscrepancies`, `getUboEvidenceCompleteness`.
Events: `beneficial_owner.case_opened.v1`, `beneficial_owner.disclosure_recorded.v1`, `beneficial_owner.attested.v1`, `beneficial_owner.discrepancy_raised.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Control basis includes ownership, voting, appointment, contractual and other configured bases.
- Derived chain and reported disclosure are stored separately and reconciled.
- Attestation is approval-gated and records rule-pack/version used.
- Sensitive identity attributes remain behind protected-identity controls.
- Unresolved material discrepancy prevents a clean compliance status.

Add direct evidence for:
- Direct and indirect control chains
- Nominee/trust chain resolution
- Threshold/rule-pack versions
- Approval and SoD attestation
- Sensitive read/export and discrepancy workflow

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-4.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

UBO conclusions are traceable to relationship paths, evidence, rules and independent attestation.

## CA-4.6 — Distributions, entitlement snapshots and Phase 4 reconciliation

**Status:** `OPEN`  
**Depends on:** CA-4.5  
**Goal:** Own the legal declaration and entitlement basis while leaving payment execution to Payments.

### Authoritative surface

- **Tables:** `ca_distribution_declaration`, `ca_distribution_entitlement`, `ca_distribution_payment_reference`
- **Commands:** `declareDistribution`, `recordDistributionEntitlements`, `cancelDistribution`, `linkDistributionPaymentReference`
- **Queries:** `getDistribution`, `listDistributions`, `getDistributionEntitlements`, `reconcileDistributionToHoldingsAndPayments`
- **Events:** `distribution.declared.v1`, `distribution.entitlements_recorded.v1`, `distribution.cancelled.v1`

### Binding rules

- Declaration records class, amount/rate, currency, record date, entitlement basis, approval and payment date.
- Entitlements are an immutable snapshot derived from holdings as-of the record date and class rights.
- Money movement is not executed or posted by CA.
- Cancellation after entitlement requires explicit legal basis and approval.
- Reconciliation compares declaration, holdings snapshot and external payment references.

### Required evidence

- Record-date holdings and class rights
- Canonical monetary allocation/rounding policy
- Payments boundary test
- Approval/cancellation controls
- Full Phase 4 authenticated journey and reconciliation

### Paste-ready Codex prompt

```text
Execute CA-4.6 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Own the legal declaration and entitlement basis while leaving payment execution to Payments.

Authoritative tables/surfaces: `ca_distribution_declaration`, `ca_distribution_entitlement`, `ca_distribution_payment_reference`.
Commands: `declareDistribution`, `recordDistributionEntitlements`, `cancelDistribution`, `linkDistributionPaymentReference`.
Queries: `getDistribution`, `listDistributions`, `getDistributionEntitlements`, `reconcileDistributionToHoldingsAndPayments`.
Events: `distribution.declared.v1`, `distribution.entitlements_recorded.v1`, `distribution.cancelled.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Declaration records class, amount/rate, currency, record date, entitlement basis, approval and payment date.
- Entitlements are an immutable snapshot derived from holdings as-of the record date and class rights.
- Money movement is not executed or posted by CA.
- Cancellation after entitlement requires explicit legal basis and approval.
- Reconciliation compares declaration, holdings snapshot and external payment references.

Add direct evidence for:
- Record-date holdings and class rights
- Canonical monetary allocation/rounding policy
- Payments boundary test
- Approval/cancellation controls
- Full Phase 4 authenticated journey and reconciliation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-4.6 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 4 closes at 14/14 with capital, certificates, ownership, UBO and distribution authority fully reconciled.

## Phase-close rule

Phase 4 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.
