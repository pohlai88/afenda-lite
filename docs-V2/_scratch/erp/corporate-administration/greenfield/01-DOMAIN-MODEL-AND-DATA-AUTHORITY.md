# Corporate Administration — Canonical Domain Model and Data Authority

This document defines the greenfield aggregate map and proposed persistence inventory for `@afenda/corporate-administration`. It is an implementation authority, not a claim that any table already exists.

## 1. Modeling rules

1. Every authoritative `ca_*` row carries `organization_id`.
2. Every company-specific child carries `legal_company_id`.
3. Cross-package identities are opaque references validated through injected public ports.
4. Statutory facts use effective history and correction lineage.
5. Workflow rows use `version` and `expectedVersion`.
6. Ledgers and history events are append-only.
7. Decimal, percentage, quantity and monetary values are Postgres `numeric` and canonical strings at TypeScript boundaries.
8. Current-state projections are derived and rebuildable.
9. Binary content is never stored in `ca_*`.
10. Sensitive identifiers are tokenized, masked or resolved from a protected identity service.

## 2. Aggregate map

| Aggregate | Root | Principal children / facts | Temporal model |
|---|---|---|---|
| Legal company | `ca_legal_company` | names, legal forms, identifiers, statuses, financial years, jurisdiction profiles | Effective + recorded time |
| Legal establishment | `ca_legal_establishment` | registered addresses, establishment statuses | Effective + recorded time |
| Governance body | `ca_governance_body` | memberships | Effective + recorded time |
| Statutory office | `ca_statutory_office` | appointments, qualifications, consents, declarations | Effective + recorded time |
| Governance meeting | `ca_governance_meeting` | notices, participants, quorum, votes | Workflow version + immutable outcome facts |
| Resolution | `ca_resolution` | actions, implementation evidence | Effective + execution status |
| Authority policy | `ca_authority_policy` | rules, thresholds, signatory combinations | Effective + recorded time |
| Authority mandate | `ca_authority_mandate` | holders, amendments, revocations | Effective + recorded time |
| Power of attorney | `ca_power_of_attorney` | attorneys, scope, revocation | Effective + recorded time |
| Company seal | `ca_company_seal` | custody and use events | Root version + append-only events |
| Share class | `ca_share_class` | class rights and changes | Effective + recorded time |
| Capital ledger | `ca_capital_transaction` | balanced transaction legs | Immutable |
| Security certificate | `ca_security_certificate` | issue, split, consolidate, replace, cancel events | Root + append-only events |
| Ownership encumbrance | `ca_ownership_encumbrance` | variation/release events | Effective + append-only events |
| Beneficial ownership case | `ca_beneficial_owner_case` | relationships, disclosures, attestations, discrepancies | Effective + review workflow |
| Distribution | `ca_distribution_declaration` | entitlement snapshot and payment references | Immutable declaration/snapshot |
| Premise/property | `ca_premise`, `ca_property` | title and occupancy history | Effective + recorded time |
| Corporate asset | `ca_corporate_asset` | status events and external accounting references | Effective + append-only events |
| Intellectual property | `ca_intellectual_property` | applications, grants, renewals, assignments, expiry | Root + append-only events |
| Insurance policy | `ca_insurance_policy` | renewals, endorsements, cancellation | Root + append-only events |
| Registered charge | `ca_registered_charge` | variation, ranking, release, satisfaction | Root + append-only events |
| Licence/permit | `ca_licence_permit` | renewal, suspension, revocation | Root + append-only events |
| Bank registration | `ca_bank_account_registration` | lifecycle history | Effective + recorded time |
| Bank mandate | `ca_bank_mandate` | mandate holders and amendments | Effective + recorded time |
| Group control | `ca_group_control_relationship` | basis/evidence history | Effective + recorded time |
| Related-party classification | `ca_related_party_relationship` | declarations and review | Effective + recorded time |
| Material agreement | `ca_material_agreement` | parties, renewals, amendments, termination | Root + append-only events |
| Corporate action | `ca_corporate_action_case` | steps, conditions, effects, filings | Workflow version + immutable effects |
| Corporate document | `ca_corporate_document` | versions, links, retention, holds | Versioned metadata |
| Statutory register | `ca_statutory_register` | register definitions and certified snapshots | Definition version + immutable snapshots |
| Compliance rule pack | `ca_compliance_rule_pack` | rules and applicability | Versioned, signed, effective |
| Filing obligation | `ca_filing_obligation` | adjustments and work items | Effective due state + append-only adjustments |
| Filing submission | `ca_filing_submission` | acknowledgement/rejection events | Append-only |
| Import batch | `ca_import_batch` | rows, validation and apply results | Workflow version |
| Reconciliation run | `ca_reconciliation_run` | findings | Immutable run and finding set |

## 3. Proposed authoritative table inventory

The implementation may combine or split tables only when the resulting model preserves the same authority, history and invariants.

### 3.1 Foundation and mutation evidence

| Table | Purpose |
|---|---|
| `ca_mutation_receipt` | Durable idempotency key, canonical fingerprint, result reference and completion metadata |
| `ca_action_approval_binding` | Domain command/fingerprint to external approval request and decision evidence |
| `ca_numbering_policy` | Tenant/company-scoped numbering policies for certificates, resolutions, registers or cases |
| `ca_numbering_reservation` | Transaction-safe number reservation and consumption history |

`platform_audit_log` and `platform_domain_event` remain platform-owned tables written in the same transaction through approved infrastructure.

### 3.2 Legal company and establishments

| Table | Purpose |
|---|---|
| `ca_legal_company` | Legal-company aggregate root, linked organization-kind `party_id`, home jurisdiction and lifecycle |
| `ca_company_jurisdiction_profile` | Effective jurisdiction, entity type, regulator and compliance-profile selection |
| `ca_company_name` | Effective legal, former, translated and trading-name facts |
| `ca_company_legal_form_history` | Effective legal form/entity type history |
| `ca_company_identifier` | Non-tax registration, registry, LEI or other corporate identifier history |
| `ca_company_status_history` | Incorporation, active, suspended, struck-off, liquidation, dissolved, restored and archived facts |
| `ca_company_financial_year` | Financial-year-end and accounting-reference history |
| `ca_company_activity` | Registered objects, business activities and regulated-activity classifications |
| `ca_legal_establishment` | Branch, representative office, foreign registration or other legal establishment |
| `ca_establishment_status_history` | Registration, activation, suspension and closure history |
| `ca_registered_address` | Registered office, place of business and statutory service-address history |
| `ca_premise` | Operational/physical premise linked to a company or establishment without implying legal registration |

### 3.3 Governance and statutory offices

| Table | Purpose |
|---|---|
| `ca_governance_body` | Board, committee, shareholder body or other decision body |
| `ca_governance_membership` | Effective membership, role and voting entitlement |
| `ca_statutory_office` | Jurisdiction-defined office such as director, secretary, auditor or registered agent |
| `ca_officer_appointment` | Party appointment, consent, appointment method, effective period and cessation |
| `ca_officer_qualification` | Qualification/licence evidence required for an office |
| `ca_officer_declaration` | Consent, eligibility, independence, interest, related-party or fit-and-proper declaration |
| `ca_officer_disqualification` | Disqualification, restriction or suspension fact |
| `ca_conflict_disclosure` | Matter-specific conflict and recusal evidence |
| `ca_governance_meeting` | Meeting/written-resolution root and scheduling status |
| `ca_meeting_notice` | Notice issue, delivery and waiver evidence |
| `ca_meeting_participant` | Invitee, attendance, representation, proxy and recusal |
| `ca_meeting_quorum_result` | Quorum rule snapshot and result |
| `ca_meeting_vote` | Motion/choice, eligible votes, votes cast, abstentions and outcome |
| `ca_resolution` | Numbered resolution, text digest, approval basis, effective date and status |
| `ca_resolution_action` | Assigned implementation action, due date, completion and evidence |

### 3.4 Authority, mandates and seal

| Table | Purpose |
|---|---|
| `ca_authority_policy` | Versioned delegation-of-authority policy root |
| `ca_authority_rule` | Subject/action, threshold, currency, company, role, joint-signature and approval rule |
| `ca_authority_mandate` | Specific mandate or delegated authority instrument |
| `ca_authority_mandate_holder` | Authorized party/role, limits and effective period |
| `ca_power_of_attorney` | Legal instrument, scope, territory and effective period |
| `ca_power_of_attorney_holder` | Attorney party and joint/several exercise rules |
| `ca_company_seal` | Seal/chop identity, type, status and specimen object reference |
| `ca_seal_custody_event` | Custodian assignment, handover and return |
| `ca_seal_use_event` | Authorized use, document reference, approval and witness evidence |

### 3.5 Capital, ownership and beneficial control

| Table | Purpose |
|---|---|
| `ca_share_class` | Class code, currency, par/no-par configuration and rights |
| `ca_share_class_right` | Voting, dividend, redemption, conversion and preference rights |
| `ca_capital_transaction` | Immutable transaction header and legal basis |
| `ca_capital_transaction_leg` | Balanced party/class quantity and consideration movements |
| `ca_security_certificate` | Certificate identity, holder, class, quantity and current status |
| `ca_security_certificate_event` | Issue, transfer endorsement, split, consolidation, loss, replacement and cancellation |
| `ca_ownership_encumbrance` | Pledge, lien, charge, trust restriction or transfer restriction over holdings |
| `ca_ownership_encumbrance_event` | Variation, priority change, release or enforcement |
| `ca_ownership_control_relationship` | Direct voting, economic or contractual control relationship |
| `ca_nominee_or_trust_relationship` | Nominee, trustee, beneficiary and underlying-owner relationship |
| `ca_beneficial_owner_case` | Review root for a person/organization considered for beneficial ownership |
| `ca_beneficial_owner_relationship` | Control path, basis, percentage and effective period |
| `ca_beneficial_owner_disclosure` | Filing/reportable disclosure and evidence |
| `ca_beneficial_owner_attestation` | Reviewer/authorized attestation and approval reference |
| `ca_beneficial_owner_discrepancy` | Conflict, missing evidence, remediation and resolution history |
| `ca_distribution_declaration` | Dividend/distribution legal declaration, record date and approval |
| `ca_distribution_entitlement` | Immutable holder entitlement snapshot |
| `ca_distribution_payment_reference` | Read-only references to payment execution/results |

### 3.6 Assets, compliance instruments and banking administration

| Table | Purpose |
|---|---|
| `ca_property` | Legal/admin property or title register |
| `ca_property_interest_history` | Ownership, lease, licence-to-occupy or other legal interest |
| `ca_corporate_asset` | Non-ledger administrative asset register and accounting reference |
| `ca_corporate_asset_event` | Acquisition, transfer, impairment notice, disposal or retirement reference |
| `ca_intellectual_property` | Trademark, patent, design, domain or other IP root |
| `ca_intellectual_property_event` | Application, grant, renewal, assignment, opposition, expiry or abandonment |
| `ca_insurance_policy` | Insurer, policy number mask, coverage, insured objects and term |
| `ca_insurance_policy_event` | Renewal, endorsement, suspension, cancellation or expiry |
| `ca_registered_charge` | Security interest/charge root, secured party, amount ceiling and priority |
| `ca_registered_charge_event` | Registration, variation, ranking, satisfaction, release or enforcement |
| `ca_licence_permit` | Licence/permit root, authority, scope, number mask and validity |
| `ca_licence_permit_event` | Renewal, condition, suspension, revocation, surrender or expiry |
| `ca_bank_account_registration` | Masked administrative bank-account identity and purpose |
| `ca_bank_account_status_history` | Open, restricted, dormant and closed administrative history |
| `ca_bank_mandate` | Bank signing mandate, operation scope and effective period |
| `ca_bank_mandate_holder` | Holder, role, limit and joint-signature group |

### 3.7 Group, agreements and corporate actions

| Table | Purpose |
|---|---|
| `ca_group_control_relationship` | Parent/subsidiary or other control edge with percentage and basis |
| `ca_group_control_evidence` | Evidence and calculation snapshot supporting control |
| `ca_related_party_relationship` | Related-party classification under configured policy/rule |
| `ca_related_party_declaration` | Declaration, reviewer and resolution |
| `ca_material_agreement` | Agreement metadata, type, term, value snapshot and owner |
| `ca_material_agreement_party` | Counterparty and role |
| `ca_material_agreement_event` | Amendment, renewal, suspension, termination or expiry |
| `ca_corporate_action_case` | Incorporation/change/conversion/merger/restoration/closure case root |
| `ca_corporate_action_step` | Required step, owner, state, due date and evidence |
| `ca_corporate_action_condition` | Condition precedent/subsequent and satisfaction |
| `ca_corporate_action_effect` | Immutable legal effect produced by completion |
| `ca_corporate_action_party` | Applicant, transferor, transferee, regulator, adviser or other role |

### 3.8 Documents, registers, compliance and filings

| Table | Purpose |
|---|---|
| `ca_corporate_document` | Logical corporate document root and classification |
| `ca_corporate_document_version` | Checksum, object reference, language, signed/effective dates and status |
| `ca_document_link` | Typed link from a document/version to any approved CA subject |
| `ca_document_retention_rule` | Retention class and disposition requirements |
| `ca_legal_hold` | Hold scope, reason, authority, start and release |
| `ca_statutory_register` | Register definition, jurisdiction, content policy and numbering |
| `ca_register_snapshot` | Immutable certified snapshot metadata, checksum and object reference |
| `ca_compliance_rule_pack` | Imported/versioned ruleset identity, source, checksum and effective period |
| `ca_compliance_rule` | Applicability, requirement, recurrence and due-date rule |
| `ca_company_compliance_profile` | Company-specific activated rules and overrides |
| `ca_filing_obligation` | Required filing/return, period, due date, status and authority |
| `ca_filing_obligation_adjustment` | Extension, waiver, corrected due date or exemption evidence |
| `ca_filing_work_item` | Preparation, review, signatory and approval status |
| `ca_filing_submission` | Immutable submission attempt and evidence |
| `ca_filing_submission_event` | Acknowledged, rejected, queried, corrected or withdrawn event |
| `ca_regulatory_change_notice` | Rule-pack change impact and company review status |

### 3.9 Operational and projection tables

These tables support operation but do not replace domain authority.

| Table | Purpose |
|---|---|
| `ca_projector_checkpoint` | Per-projector event checkpoint and failure state |
| `ca_reminder_dispatch` | Deduplication and handoff evidence for reminders |
| `ca_import_batch` | Import source, checksum, schema version, mode and lifecycle |
| `ca_import_row` | Row validation, normalized payload, quarantine and apply result |
| `ca_export_job` | Requested export definition, status, schema version and object reference |
| `ca_reconciliation_run` | Reconciliation type, scope, result and timing |
| `ca_reconciliation_finding` | Discrepancy, severity, subject and remediation status |
| `ca_entity_health_projection` | Rebuildable company completeness/compliance score |
| `ca_register_projection` | Optional rebuildable current-register materialization where needed |

Search documents should normally live in `@afenda/search` rather than a CA-owned search table.

## 4. Standard column profiles

### 4.1 Aggregate root

```text
id
organization_id
legal_company_id?        # omitted for ca_legal_company itself
status
version
created_at / created_by
updated_at / updated_by
```

### 4.2 Effective statutory fact

```text
id
organization_id
legal_company_id
effective_from
effective_to
recorded_at / recorded_by
supersedes_id
correction_reason
source_document_id
```

### 4.3 Immutable event or ledger fact

```text
id
organization_id
legal_company_id
aggregate_id
sequence_no
occurred_at
recorded_at / recorded_by
idempotency_key
source_document_id
reverses_id?
```

### 4.4 Operational workflow

```text
id
organization_id
legal_company_id
status
version
assigned_to?
due_at?
created_at / created_by
updated_at / updated_by
```

## 5. Natural-key and uniqueness principles

- Unique legal-company code per tenant.
- A party may back at most one active legal company per tenant unless a documented exception is approved.
- Unique effective company identifier by identifier type, jurisdiction and normalized value.
- No overlapping effective legal names of the same name type/language for one company.
- No overlapping legal-form or jurisdiction-profile intervals.
- Establishment registration identifiers are unique within jurisdiction/type.
- Governance body code is unique per company.
- Meeting number and resolution number follow company-scoped numbering policy.
- Share-class code is unique per company.
- Capital transaction reference is immutable and unique per company.
- Certificate number is unique per company and cannot be silently reused.
- Licence, policy, charge, IP and agreement identifiers use type/jurisdiction/authority-aware uniqueness.
- Filing obligations are unique by rule, company/establishment, period and authority.
- Import source checksum plus mode prevents duplicate application.

## 6. Cross-aggregate invariants

### 6.1 Legal-company existence

No child fact may become effective outside the legal company’s effective existence, except pre-incorporation case preparation explicitly marked as provisional.

### 6.2 Party references

All referenced parties must:

- resolve in the same tenant;
- be active or valid for the effective date where required;
- possess a compatible party kind/role;
- not be merged into another party without resolution through the Master Data contract.

### 6.3 Approval matching

A high-risk command must verify that the approval:

- belongs to the same organization;
- targets the same legal company and subject;
- matches the canonical command fingerprint;
- was approved by an eligible different actor;
- remains valid and unused for a conflicting effect.

### 6.4 Graphs

Group control, nominee/trust paths and beneficial-control chains require:

- deterministic traversal;
- bounded depth;
- cycle detection where cycles are prohibited;
- explicit handling where circular cross-holdings are legally possible;
- percentage calculations with canonical decimal arithmetic;
- evidence snapshots for derived conclusions.

### 6.5 Capital ledger

Each capital transaction type defines a balancing rule. Examples:

- allotment increases issued capital and holder position;
- transfer nets to zero company-wide issued quantity;
- cancellation/buyback reduces eligible holder position and issued quantity;
- split/consolidation preserves economic interest under the defined ratio;
- conversion moves between classes without creating an unexplained quantity;
- reversal exactly references and offsets an eligible prior transaction.

## 7. Derived read models

The following are queries/projections, not mutation authority:

- current legal-company profile;
- legal-company history timeline;
- organization group chart;
- officer and authority matrix as-of;
- official current registers;
- shareholdings/capital summary as-of;
- beneficial-control chain;
- upcoming expiries and filing calendar;
- corporate-action dashboard;
- entity health/completeness score;
- unresolved reconciliation findings;
- search index;
- certified register pack.

Every derived model must have a rebuild or deterministic recomputation path from authority.
