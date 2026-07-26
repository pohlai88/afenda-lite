<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/README.md -->


# Corporate Administration Greenfield Source Set

This source set replaces the removed Corporate Administration implementation plan with a completely new enterprise design.

## What is included

| File | Purpose |
|---|---|
| `00-CORPORATE-ADMINISTRATION-AUTHORITY.md` | Binding mission, ownership, identity, history, approval, security and completion rules |
| `01-DOMAIN-MODEL-AND-DATA-AUTHORITY.md` | Aggregate map and proposed authoritative/operational table inventory |
| `02-PACKAGE-ARCHITECTURE-AND-CONTRACTS.md` | Target source structure, dependencies, ports, permissions, events, errors and tests |
| `03-ROADMAP-INDEX.md` | Nine phases and 47 sequential greenfield coding slices |
| `phases/*.md` | Self-contained phase plans and paste-ready Codex prompts |
| `90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md` | Fourteen-boundary matrix, verification lanes and required handoff |
| `CORPORATE-ADMINISTRATION-ALL-IN-ONE.md` | Concatenated single-document version |
| `SOURCE-PLACEMENT.md` | Recommended locations inside the Afenda source tree |

A proposed package README is also supplied at:

```text
packages/erp/corporate-administration/README.md
```

## Recommended use

1. Copy the documentation folder to the matching `docs-V2/_scratch/erp/` path.
2. Review and promote authority through Afenda’s normal documentation process if required.
3. Use `03-ROADMAP-INDEX.md` to select the next `OPEN` slice.
4. Paste only that slice’s prompt into a fresh Codex mission.
5. Keep the module lifecycle `scaffolded` until all 47 slices and 14 acceptance boundaries are green.

## Greenfield assumptions

- No previous Corporate Administration code is relied on.
- No previous slice is treated as complete.
- `ca_legal_company` is owned directly by Corporate Administration.
- Master Data remains the authority for parties, tax registrations and platform references.
- Other ERP packages interact only through public ports, events or registered read contracts.
- Every phase begins `OPEN`.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/00-CORPORATE-ADMINISTRATION-AUTHORITY.md -->


# Corporate Administration — Greenfield Enterprise Authority

| Field | Value |
|---|---|
| Mission | `CA-GREENFIELD-ENTERPRISE-01` |
| Target package | `packages/erp/corporate-administration/` |
| Published package | `@afenda/corporate-administration` |
| Manifest id | `corporate-administration` |
| Category / band | `erp` / `R1-F` |
| Activation | `organization_toggle` |
| Table prefix | `ca_*` |
| Bounded context | Legal-company administration, corporate governance and statutory registers |
| Delivery posture | Greenfield; no legacy implementation is assumed |
| Quality bar | Enterprise production |
| Initial status | Every phase and slice is `OPEN` |
| Authority status | Scratch implementation authority pending promotion through normal Afenda documentation governance |
| Last composed | 2026-07-26 |

## 1. Mission

Build a complete Corporate Administration bounded context for Afenda that records and protects the legally effective identity, governance, authority, capital, ownership, obligations and evidentiary history of every legal company administered by an Afenda tenant.

The package is not a “company profile” feature. It is the statutory and corporate-secretarial system of record used to answer questions such as:

- What legal companies existed for this tenant on a given date?
- Under which jurisdiction, legal form, name and registration identifiers did a company operate?
- Who held a statutory office, board seat, mandate or signing authority at a particular time?
- Which meeting or written resolution approved a decision, and was notice, quorum and voting valid?
- What share capital and ownership position existed as of a date?
- Who was the beneficial owner or controlling party, through which chain, and what evidence supported the conclusion?
- Which licences, filings, insurance policies, charges, documents and agreements were current, expired, overdue, superseded or disputed?
- Which high-risk corporate action was requested, independently approved, legally effected and filed?
- Can the official register be reconstructed exactly as it was effective on one date and known to the system on another date?

## 2. Greenfield reset

This authority does not preserve or infer completion from any removed or prior Corporate Administration implementation.

The following rules are binding:

1. No phase is protected as previously complete.
2. No table, command, route, permission, migration, event or adapter is assumed to exist.
3. No legacy API compatibility is required unless a current consumer is found during implementation and explicitly documented.
4. Existing Afenda architecture and package-governance conventions remain constraints.
5. The implementation begins with authority, package registration, schema ownership and one small end-to-end vertical slice.
6. Every slice must inspect current disk state before editing because adjacent platform contracts may evolve.
7. A missing external dependency makes the affected verification lane `BLOCKED`, never silently passed.
8. Placeholder code, compile-only shells, skipped required tests and zero-test matches do not count as implementation.

## 3. Canonical identity model

| Identifier | Meaning | Authority |
|---|---|---|
| `organization_id` | Afenda tenant and security boundary | Platform/authentication |
| `legal_company_id` | Statutory legal entity administered inside the tenant | Corporate Administration |
| `legal_establishment_id` | Registered branch, representative office, foreign registration or other establishment of a legal company | Corporate Administration |
| `party_id` | Reusable identity of a person or organization such as director, shareholder, bank, regulator, insurer or counterparty | `@afenda/master-data` |
| `tax_registration_id` | Tax registration identity | `@afenda/master-data` |
| `country_code`, `currency_code`, `language_code`, `time_zone_id` | Platform reference values | `@afenda/master-data` reference APIs |
| `document_object_ref` | Opaque reference to stored binary content | Document/storage platform |
| `approval_request_id`, `approval_decision_id` | Generic maker-checker workflow identity | Approval platform |
| `payment_account_id`, `payment_id` | Operational payment account and money movement identity | `@afenda/payments` |
| `journal_id`, `asset_ledger_id` | Accounting posting and financial-asset identity | `@afenda/accounting` |

### 3.1 Legal-company authority

`ca_legal_company` is the authoritative legal-company root. Corporate Administration does not depend on an undeclared Master Data organization-dimension table.

Other packages may consume legal-company references only through:

- exported read contracts from `@afenda/corporate-administration`;
- an application-injected `LegalCompanyReferencePort`;
- registered domain events;
- approved projections or explicitly registered read edges.

Other packages must not mutate `ca_*` tables.

### 3.2 Party relationship

Every legal company should reference one organization-kind `md_party` identity for cross-ERP party use. The two records have different authority:

- Master Data owns the reusable party identity, operational name, addresses, contacts and roles.
- Corporate Administration owns statutory legal names, legal form, registered offices, company status and legal history.

A statutory name or registered-office fact may differ from current operational party data. Corporate Administration must not dual-write `md_party`; it emits events or exposes reconciliation findings when the records diverge.

## 4. Bounded-context ownership

### 4.1 Corporate Administration owns

- legal-company registry and legal lifecycle;
- jurisdiction profile, legal form and financial-year history;
- statutory names and non-tax corporate identifiers;
- registered offices, branches, representative offices and foreign establishments;
- governance bodies, memberships, statutory offices and officer appointments;
- officer consents, qualifications, declarations, disqualifications and conflicts;
- meeting notices, participants, quorum, voting, minutes references and resolutions;
- resolution execution and action tracking;
- delegation-of-authority policies, authority rules, mandates, signatories and powers of attorney;
- company seal/chop registers, custody and use;
- share classes, immutable capital transactions, holdings reconstruction and certificates;
- ownership encumbrances, nominee/trust relationships and voting/control relationships;
- beneficial-owner relationships, disclosures, attestations, discrepancies and review history;
- legal declaration of dividends/distributions and immutable entitlement snapshots;
- premises, title/property records, administrative corporate assets and intellectual property;
- insurance-policy administration and registered charges/security interests;
- licences and permits;
- masked administrative bank-account registrations and bank mandates;
- group-control graph, related-party classification and corporate structure;
- material-agreement administration and corporate-action cases;
- corporate-document metadata, versioning, links, retention and legal holds;
- statutory-register definitions and certified register snapshots;
- versioned compliance rule packs installed for the tenant;
- filing obligations, preparation, approvals, submissions and acknowledgement history;
- corporate-record search projections, reminders, imports, exports, reconciliation and entity-health projections, where these remain non-authoritative operational support.

### 4.2 Corporate Administration does not own

| Excluded responsibility | Owner / integration |
|---|---|
| Person or organization master identity | `@afenda/master-data` |
| Tax-registration master | `@afenda/master-data` |
| Country, currency, language or timezone reference maintenance | Platform reference authority |
| Employment and employee records | `@afenda/human-resources` |
| Money movement, bank balance or payment execution | `@afenda/payments` |
| Capitalization, depreciation, carrying value or journal entries | `@afenda/accounting` |
| Sales, procurement, employment or payroll transaction contracts | Owning transactional bounded context |
| Binary file storage, malware scanning or unrestricted signed URLs | Document/storage platform |
| Generic approval workflow engine | Approval platform |
| E-signature execution | Optional signature adapter/platform |
| Scheduler, email, SMS or push delivery | Platform scheduler/notification service |
| Search authorization or legal truth | Authoritative CA data; search is projection only |
| Legal advice or guaranteed regulatory interpretation | Qualified legal/compliance professionals |

## 5. Multi-jurisdiction design

The core domain must remain jurisdiction-neutral. Malaysia, Singapore, Vietnam and other jurisdictions are implemented through versioned compliance rule packs and adapters, not hard-coded branching throughout commands.

A rule pack records at minimum:

- jurisdiction and authority;
- legal-entity or establishment type;
- rule identifier and source citation/reference;
- source publication date;
- effective period;
- applicability predicate;
- required role, register, filing, document or approval;
- due-date calculation;
- recurrence;
- evidence requirements;
- severity and remediation guidance;
- supersession lineage;
- pack signature/checksum and importer identity.

Rule packs produce draft compliance profiles and filing obligations. Human administrators remain responsible for confirming applicability where the rule is ambiguous.

## 6. Historical truth and correction model

Corporate records require both business-effective time and system-recorded time.

### 6.1 Required temporal fields

Use where applicable:

- `effective_from`;
- `effective_to`;
- `recorded_at`;
- `recorded_by`;
- `supersedes_id`;
- `correction_reason`;
- `source_document_id`;
- `version` for mutable workflow/operational rows.

### 6.2 Query semantics

Important registers support:

- `asOf`: what was legally effective at a date;
- `knownAt`: what the system had recorded by an instant;
- combined `asOf` + `knownAt` for dispute and audit reconstruction;
- current-state list queries as optimized projections of the same authority.

### 6.3 Corrections

Activated statutory facts are not destructively overwritten. Corrections use one of:

- end dating;
- supersession;
- reversal;
- revocation;
- cancellation;
- release;
- retirement;
- dissolution;
- archival with preserved history.

Append-only ledgers never update posted facts. A correcting transaction references the fact it reverses or adjusts.

## 7. Mutation contract

Every material mutation must atomically persist:

1. the aggregate or immutable fact;
2. a durable idempotency receipt;
3. an audit fact with deterministic changed-field ordering;
4. a versioned outbox event with a redacted payload;
5. an approval binding when the operation requires maker-checker evidence.

### 7.1 Idempotency

- Same idempotency key plus same canonical fingerprint returns the original result.
- Same key plus a different fingerprint returns a deterministic idempotency-conflict error.
- A failed transaction leaves no durable receipt.
- A successful retry after rollback commits once.

### 7.2 Concurrency

- Mutable aggregates use monotonic `version` and `expectedVersion`.
- Natural-key, effective-range, graph and ledger invariants are enforced inside the authoritative transaction.
- Advisory locks or equivalent deterministic lock ordering protect multi-row invariants.
- Last-write-wins is forbidden for statutory records.
- Concurrency tests must use real simultaneous database operations, not sequential simulations.

### 7.3 Transaction topology

The production adapter writes entity/fact, receipt, audit and outbox through one Neon transaction. It must not compose sequential autocommit statements that can partially succeed.

## 8. Approval and segregation of duties

A confirmation dialog is not maker-checker control.

High-risk operations must be configurable to require a valid approval decision from the platform approval service. Examples include:

- legal-company activation, dissolution, restoration or archival;
- officer appointment or removal for protected roles;
- delegation-of-authority publication;
- bank-mandate grant or revocation;
- share-capital posting or reversal;
- UBO attestation or discrepancy override;
- dividend/distribution declaration;
- charge registration, variation or release;
- filing waiver or material due-date override;
- merger, conversion, strike-off, winding-up or dissolution action.

Rules:

- requester and final approver must be different users where segregation is required;
- the approval must match organization, legal company, command type, target, fingerprint and permitted validity window;
- a stale, withdrawn, rejected, reused or mismatched approval fails closed;
- the CA record stores only the approval reference and domain-specific evidence, not a shadow approval workflow;
- emergency override, where permitted, requires a dedicated permission, explicit reason, audit event and post-action review.

## 9. Security, privacy and data classification

### 9.1 Session authority

`organizationId`, `actorUserId`, correlation identity and permission context come from authenticated server composition. They are never trusted from browser form input.

### 9.2 Sensitive facts

Events, audits, search documents and normal exports must exclude:

- full government identity numbers;
- dates of birth unless explicitly required and authorized;
- unrestricted residential addresses;
- full bank-account details;
- document object URLs or credentials;
- signatures, PINs, tokens or online-banking secrets;
- confidential agreement clauses not approved for the target view.

Protected identity data should be resolved through a dedicated protected-identity port when required. Corporate Administration stores party references, masked values and filing-safe snapshots only.

### 9.3 Authorization

Authorization is fail-closed at both package command/query and application Action boundaries. Read permissions are separated from mutation, approval, attestation, posting, waiver, import, export and administration permissions.

## 10. Domain invariants

The following are non-negotiable examples; phase documents add detailed rules.

- A legal company belongs to exactly one tenant.
- A legal company cannot have overlapping effective statutory names of the same name type and language.
- Tax registrations are referenced, never duplicated as company identifiers.
- A registered establishment belongs to one legal company and cannot be active outside the company’s legal existence.
- Required statutory offices cannot be left vacant beyond configured grace rules without an explicit compliance finding.
- A governance meeting cannot be completed without notice status, participant record, quorum result and outcome.
- A resolution cannot become effective before the approving meeting or written-resolution completion.
- An authority decision cannot authorize itself when segregation is required.
- A share ledger must balance by transaction type and reconstruct the same holdings deterministically.
- Issued shares cannot become negative; a certificate cannot represent more than the holder’s eligible balance.
- Ownership/control percentages use canonical decimal strings and cannot use JavaScript floating point.
- Group-control graphs cannot contain prohibited cycles.
- A filing submission cannot predate the obligation or refer to a different tenant/company.
- Waivers, extensions, releases and reversals require evidence and preserve the prior fact.
- Search, health, reminders and dashboards never mutate authority.

## 11. Public API posture

The root barrel exports only:

- branded IDs;
- input/output schemas;
- command and query functions;
- public result types and semantic error codes;
- permission identifiers;
- event type names where consumer-safe;
- command/query options and required public ports.

Production adapters are exposed only through declared subpaths such as:

```text
@afenda/corporate-administration/adapters/drizzle
@afenda/corporate-administration/module-manifest
@afenda/corporate-administration/types
```

Never export raw Drizzle tables, `db`, SQL helpers or internal stores from the root.

## 12. Delivery phases

| Phase | Name | Slices | Outcome |
|---:|---|---:|---|
| 0 | Architecture and foundation | 4 | Registered package, authority, contracts, transactional kernel and test harness |
| 1 | Legal company and establishments | 5 | Complete legal-company registry and legal presence history |
| 2 | Governance and statutory offices | 5 | Bodies, officers, declarations, meetings, votes and resolutions |
| 3 | Authority, approvals and company seal | 4 | DoA, mandates, signatories, powers of attorney, seal custody and maker-checker |
| 4 | Capital, ownership and beneficial control | 6 | Capital ledger, certificates, encumbrances, UBOs and distributions |
| 5 | Assets, licences, insurance, charges and banking | 6 | Administrative asset and compliance registers plus banking boundary |
| 6 | Group structure, agreements and corporate actions | 5 | Control graph, related parties, material agreements and lifecycle cases |
| 7 | Documents, statutory registers, compliance and filings | 6 | Evidence, rule packs, obligations and filing lifecycle |
| 8 | Operational services and enterprise activation | 6 | Search, reminders, import/export, reconciliation, resilience and activation |
| **Total** |  | **47** | Greenfield enterprise Corporate Administration |

## 13. Definition of complete

The package may become active only when:

1. all 47 slices are `DONE`;
2. every phase closes at 14/14 acceptance boundaries;
3. all authoritative tables are registered in schema ownership and tenancy inventories;
4. all commands and queries have permission mappings and public contracts;
5. all material mutations prove same-transaction entity/fact, receipt, audit and outbox behavior;
6. cross-tenant reads and writes fail safely;
7. effective history, bitemporal reconstruction and immutable ledgers are verified;
8. high-risk operations prove maker-checker and segregation-of-duties behavior;
9. memory and Drizzle adapters pass shared parity suites;
10. Neon concurrency, rollback and migration lanes are green;
11. Actions and authenticated UI journeys use production composition;
12. events, audits, search and exports pass sensitive-data leakage checks;
13. jurisdiction rule packs, obligations and filings reconcile;
14. accessibility, performance, observability, recovery and production migration evidence are green;
15. no required test is skipped, zero-matched or converted to mock-only evidence;
16. manifest, workspace edges, permissions, events, schema ownership, exports, routes and navigation agree.

Anything less leaves the package `scaffolded` with an overall verdict of `NOT COMPLETE`.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/01-DOMAIN-MODEL-AND-DATA-AUTHORITY.md -->


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


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/02-PACKAGE-ARCHITECTURE-AND-CONTRACTS.md -->


# Corporate Administration — Package Architecture and Contracts

## 1. Target source layout

```text
packages/erp/corporate-administration/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── module.manifest.ts
│   ├── module-ids.ts
│   ├── permissions.ts
│   ├── authorization.ts
│   ├── command-options.ts
│   ├── ports.ts
│   ├── production-ports.ts
│   ├── resolve-store.ts
│   ├── error-codes.ts
│   ├── mutation-tables.ts
│   ├── types.ts
│   ├── kernel/
│   │   ├── brands.ts
│   │   ├── dates.ts
│   │   ├── decimals.ts
│   │   ├── effective-range.ts
│   │   ├── bitemporal.ts
│   │   ├── fingerprint.ts
│   │   ├── normalization.ts
│   │   ├── pagination.ts
│   │   ├── transaction.ts
│   │   └── validation.ts
│   ├── company/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── schemas.ts
│   │   ├── types.ts
│   │   ├── rules.ts
│   │   ├── store.ts
│   │   └── index.ts
│   ├── establishments/
│   ├── governance/
│   ├── officers/
│   ├── authority/
│   ├── capital/
│   ├── ownership/
│   ├── beneficial-ownership/
│   ├── distributions/
│   ├── assets/
│   ├── compliance-instruments/
│   ├── banking/
│   ├── group/
│   ├── agreements/
│   ├── corporate-actions/
│   ├── documents/
│   ├── registers/
│   ├── compliance-rules/
│   ├── filings/
│   ├── operations/
│   ├── adapters/
│   │   └── drizzle/
│   │       ├── index.ts
│   │       ├── transaction-context.ts
│   │       ├── company.ts
│   │       ├── governance.ts
│   │       ├── authority.ts
│   │       ├── capital.ts
│   │       ├── assets.ts
│   │       ├── compliance.ts
│   │       ├── group.ts
│   │       ├── documents.ts
│   │       ├── filings.ts
│   │       └── operations.ts
│   └── testing/
│       ├── index.ts
│       ├── memory-store.ts
│       ├── fixtures.ts
│       ├── parity-harness.ts
│       ├── failure-injection.ts
│       └── test-options.ts
└── __tests__/
    ├── contract/
    ├── domain/
    ├── parity/
    ├── database/
    ├── concurrency/
    ├── failure-injection/
    ├── security/
    └── integration/
```

### 1.1 Decomposition rules

- Each subdomain owns its schemas, types, rules and store contract.
- The root store composes narrow domain stores; it does not become a giant interface.
- `kernel/` contains only invariant primitives shared by three or more subdomains.
- Never create generic `common`, `utils`, `repository` or ORM dumping grounds.
- Drizzle remains behind the adapters subpath.
- Testing exports remain behind an explicit testing subpath when package governance permits.
- The root barrel does not export application Actions, UI components or raw persistence details.

## 2. Package dependencies

### 2.1 Expected platform dependencies

```text
@afenda/db
@afenda/errors
@afenda/audit
@afenda/events
@afenda/search              # only if approved for projections
@afenda/master-data
zod
server-only
```

The implementation must confirm actual allowed edges through Afenda’s module manifest and workspace-edge register. Physical proximity under `packages/erp/` grants no peer access.

### 2.2 Forbidden dependencies

The package must not import:

- `apps/*`;
- Next.js;
- UI packages;
- peer ERP `/src` paths;
- raw tables owned by Master Data, Payments, Accounting, HR or other bounded contexts;
- browser-only libraries;
- generic workflow implementations;
- binary-storage credentials.

## 3. Command options

Every command receives trusted request context separately from user input.

```ts
export interface CorporateAdministrationCommandOptions {
  readonly organizationId: OrganizationId;
  readonly actorUserId: UserId;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
  readonly idempotencyKey: string;
  readonly requestInstant: Date;
  readonly authorization: CorporateAdministrationAuthorizationContext;
  readonly approvalDecisionId?: string;
}
```

Rules:

- `organizationId` and `actorUserId` are not accepted inside command payload schemas.
- High-risk commands declare whether an approval is required.
- The canonical command fingerprint excludes transport-only correlation data but includes every business-relevant field and the legal target.
- Query options include organization, authorization, pagination and an injected clock where due-state calculation is required.

## 4. Required ports

| Port | Purpose | Constraint |
|---|---|---|
| `PartyReferencePort` | Resolve person/organization parties, roles, merge state and effective validity | Public Master Data contract only |
| `TaxRegistrationReadPort` | Read effective tax registrations for display/reconciliation | No tax dual-write |
| `ReferenceDataPort` | Countries, currencies, languages, timezones and other approved references | Read-only |
| `ProtectedIdentityPort` | Resolve authorized filing-safe identity attributes | Optional, strict field-level authorization |
| `ApprovalDecisionPort` | Verify approved maker-checker decision and segregation | Generic approval owner remains external |
| `DocumentObjectPort` | Validate object reference, checksum, malware/availability status | No binary in CA |
| `SearchProjectionPort` | Upsert/delete/rebuild redacted search documents | Search never authorizes |
| `ReminderDispatchPort` | Handoff deterministic reminder payloads | Scheduling/delivery remains external |
| `AccountingReferencePort` | Validate journal/asset references and consume legal-asset events | No accounting writes |
| `PaymentsReferencePort` | Validate payment-account/payment references for distributions or banking | No money movement |
| `SignatureEnvelopePort` | Optional e-signature envelope status/reference | No core dependency on vendor |
| `ComplianceRuleSourcePort` | Import/verify signed jurisdiction rule packs | Core can operate with tenant-authored packs |
| `ClockPort` | Deterministic current instant/date | Required for due/overdue and expiry behavior |

## 5. Store topology

Use narrow contracts such as:

```text
LegalCompanyStore
EstablishmentStore
GovernanceStore
OfficerStore
AuthorityStore
CapitalStore
OwnershipStore
BeneficialOwnershipStore
DistributionStore
AssetStore
ComplianceInstrumentStore
BankingAdministrationStore
GroupStore
AgreementStore
CorporateActionStore
DocumentStore
RegisterStore
ComplianceRuleStore
FilingStore
CorporateOperationsStore
```

A resolved composition object may expose these stores to commands. Do not require every command to depend on one oversized all-domain store.

### 5.1 Production atomicity

Production commands call a transaction-scoped Drizzle composition. The transaction context must provide:

- domain store methods;
- mutation receipt operations;
- platform audit append;
- platform outbox append;
- approval-binding persistence;
- deterministic lock helpers.

Memory implementations emulate the same all-or-nothing behavior for parity tests but are never production fallback.

## 6. Result and semantic error model

All operations return `@afenda/errors` `Result` values.

Minimum error catalog:

```text
CORPORATE_ADMINISTRATION_VALIDATION_FAILED
CORPORATE_ADMINISTRATION_NOT_FOUND
CORPORATE_ADMINISTRATION_FORBIDDEN
CORPORATE_ADMINISTRATION_REFERENCE_INVALID
CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE
CORPORATE_ADMINISTRATION_CONFLICT
CORPORATE_ADMINISTRATION_STALE_VERSION
CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT
CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP
CORPORATE_ADMINISTRATION_INVALID_TRANSITION
CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID
CORPORATE_ADMINISTRATION_LEDGER_UNBALANCED
CORPORATE_ADMINISTRATION_INSUFFICIENT_HOLDING
CORPORATE_ADMINISTRATION_GRAPH_CYCLE
CORPORATE_ADMINISTRATION_APPROVAL_REQUIRED
CORPORATE_ADMINISTRATION_APPROVAL_INVALID
CORPORATE_ADMINISTRATION_SEGREGATION_OF_DUTIES
CORPORATE_ADMINISTRATION_SENSITIVE_DATA_REJECTED
CORPORATE_ADMINISTRATION_RULE_PACK_INVALID
CORPORATE_ADMINISTRATION_RECONCILIATION_FAILED
CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE
```

Do not encode HTTP status in the package.

## 7. Permission model

Use stable, explicit permission IDs. A recommended catalog:

### 7.1 General and company

```text
corporate_administration.access
corporate_administration.company.read
corporate_administration.company.manage
corporate_administration.company.activate
corporate_administration.company.dissolve
corporate_administration.establishment.manage
```

### 7.2 Governance and authority

```text
corporate_administration.governance.read
corporate_administration.governance.manage
corporate_administration.officer.manage
corporate_administration.meeting.manage
corporate_administration.resolution.manage
corporate_administration.authority.read
corporate_administration.authority.manage
corporate_administration.authority.publish
corporate_administration.seal.manage
```

### 7.3 Capital and ownership

```text
corporate_administration.capital.read
corporate_administration.capital.configure
corporate_administration.capital.post
corporate_administration.capital.reverse
corporate_administration.ownership.read
corporate_administration.ownership.manage
corporate_administration.ubo.read
corporate_administration.ubo.manage
corporate_administration.ubo.attest
corporate_administration.distribution.declare
```

### 7.4 Assets, compliance and banking

```text
corporate_administration.assets.read
corporate_administration.assets.manage
corporate_administration.licence.manage
corporate_administration.charge.manage
corporate_administration.banking.read
corporate_administration.banking.manage
corporate_administration.bank_mandate.manage
```

### 7.5 Group, agreements, actions, documents and filings

```text
corporate_administration.group.read
corporate_administration.group.manage
corporate_administration.related_party.manage
corporate_administration.agreement.manage
corporate_administration.corporate_action.manage
corporate_administration.corporate_action.approve_effect
corporate_administration.document.read
corporate_administration.document.manage
corporate_administration.register.certify
corporate_administration.compliance_rule.manage
corporate_administration.filing.read
corporate_administration.filing.manage
corporate_administration.filing.waive
```

### 7.6 Operations and administration

```text
corporate_administration.import.prepare
corporate_administration.import.approve
corporate_administration.import.apply
corporate_administration.export
corporate_administration.reconcile
corporate_administration.sensitive_export
corporate_administration.module_admin
```

Every command/query must appear in a machine-checkable permission coverage test.

## 8. Event contract

Event names use:

```text
corporate_administration.<aggregate>.<past-tense-action>.v<version>
```

Examples:

```text
corporate_administration.legal_company.created.v1
corporate_administration.officer.appointed.v1
corporate_administration.resolution.adopted.v1
corporate_administration.authority_policy.published.v1
corporate_administration.capital_transaction.posted.v1
corporate_administration.beneficial_owner.attested.v1
corporate_administration.licence.renewed.v1
corporate_administration.corporate_action.effect_recorded.v1
corporate_administration.filing_submission.acknowledged.v1
```

Every event schema declares:

- event version;
- organization and legal company;
- aggregate type and ID;
- occurred/recorded timestamps;
- actor/correlation/causation;
- non-sensitive summary fields;
- no unrestricted document URL or protected identity payload.

Event catalog coverage must reconcile emitted names with registered schemas.

## 9. Query conventions

- `get*` returns one tenant-safe result.
- `list*` uses deterministic cursor pagination; page size is bounded.
- `find*AsOf` accepts effective date.
- Audit-sensitive queries may also accept `knownAt`.
- `resolve*` performs decision-oriented evaluation such as current signing authority.
- Query outputs are read models, not persistence entities.
- Current views include source/version metadata so clients can detect staleness.

Examples:

```text
getLegalCompany
listLegalCompanies
getLegalCompanyHistory
findLegalNameAsOf
listOfficersAsOf
resolveSigningAuthority
getShareholdingsAsOf
resolveBeneficialControl
listExpiringLicences
listDueFilings
getCorporateEntityHealth
```

## 10. Application composition and web boundary

Recommended route family:

```text
/o/[organizationSlug]/corporate
/o/[organizationSlug]/corporate/companies
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/overview
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/identity
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/establishments
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/governance
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/authority
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/capital
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/ownership
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/assets
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/compliance
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/banking
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/agreements
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/actions
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/documents
/o/[organizationSlug]/corporate/companies/[legalCompanyId]/filings
/o/[organizationSlug]/corporate/health
/o/[organizationSlug]/corporate/imports
/o/[organizationSlug]/corporate/exports
```

Server Actions:

- resolve session and permission context;
- parse browser input;
- call package commands/queries;
- translate `Result` to the application `ActionResult`;
- revalidate only affected routes/tags;
- never import Drizzle tables;
- never trust organization/actor from form data.

## 11. User-experience states

Every operator workflow must implement:

- loading;
- empty;
- forbidden;
- validation failure;
- reference unavailable;
- stale version;
- natural-key conflict;
- approval required/rejected/expired;
- successful idempotent replay;
- server/dependency failure;
- destructive/high-risk confirmation;
- accessible status announcement;
- persisted reload.

Read-only and operator views must not expose inert tabs.

## 12. Test architecture

### 12.1 Required lanes

| Lane | Purpose |
|---|---|
| Domain unit | Pure rule, state transition, chronology and calculation tests |
| Contract | Zod inputs/outputs, public exports, permissions and event schemas |
| Memory | Fast command/query behavior |
| Memory/Drizzle parity | Same scenario and semantic result across adapters |
| Fresh schema | Migration from empty database |
| Upgrade migration | Expand/backfill/contract from supported prior version |
| Neon integration | Real persistence and transaction behavior |
| Concurrency | Simultaneous writes and deterministic outcomes |
| Failure injection | Rollback at each mutation-fact stage |
| Security | Cross-tenant, authorization, approval and sensitive-data leakage |
| Action | Session stamping, permission mapping and result translation |
| Interaction/accessibility | Forms, dialogs, focus, keyboard and announcements |
| Authenticated journey | Production composition and persisted reload |
| Performance | Representative data volume and query plans |
| Recovery | Projector replay, reconciliation, retry and outbox lag recovery |

### 12.2 Shared adapter parity

Every domain store must be exercised by a common test suite. Adapter-specific tests may add SQL or constraint evidence but cannot replace shared semantic parity.

## 13. Migration posture

Greenfield does not mean production migration can be ignored.

Each schema phase must include:

- forward-only migration metadata;
- fresh-schema test;
- compatibility with deployed application during rollout;
- expand/migrate/contract approach for later changes;
- idempotent backfill;
- duplicate and invalid-row quarantine;
- rollback or forward-repair runbook;
- schema ownership and tenancy registration;
- production-like migration rehearsal before activation.

## 14. Observability

Minimum metrics and diagnostics:

- command success/error by semantic code;
- stale-version and natural-key conflict rate;
- approval rejection/mismatch rate;
- transaction rollback/failure-injection checkpoints;
- outbox lag and failed event publication;
- projector checkpoint lag;
- reminder dispatch backlog;
- import validation/apply failures;
- reconciliation finding counts/severity;
- overdue filing and expiring licence counts;
- database query latency and lock wait;
- authenticated journey health.

Logs must remain structured and redacted.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/03-ROADMAP-INDEX.md -->


# Corporate Administration — Greenfield Roadmap Index

This index is the execution controller for the greenfield module. Every slice begins `OPEN`; no removed or prior implementation is treated as evidence.

## Execution rule

Run one slice per controlled coding mission. Inspect current disk state before editing, implement the selected vertical completely, run every required lane, update only that slice’s evidence/status, return the standard handoff, and stop.

## Phase summary

| Phase | Name | Slices | Initial status | Outcome |
|---:|---|---:|---|---|
| 0 | Architecture and Foundation | 4 | OPEN | Create the package, close authority and dependency decisions, establish the transactional kernel, and prove one thin production-composed legal-company vertical. |
| 1 | Legal Company and Establishments | 5 | OPEN | Deliver complete statutory identity, legal-form, identifier, status, financial-year, establishment and registered-address history. |
| 2 | Governance and Statutory Offices | 5 | OPEN | Deliver governance bodies, statutory roles, officer evidence, meetings, quorum, voting, resolutions and implementation tracking. |
| 3 | Authority, Approvals and Company Seal | 4 | OPEN | Provide effective delegation-of-authority decisions, mandates, powers of attorney, seal control and real maker-checker enforcement. |
| 4 | Capital, Ownership and Beneficial Control | 6 | OPEN | Create a balanced immutable capital ledger, certificate register, ownership restrictions, UBO chain and legal distribution declarations. |
| 5 | Assets, Licences, Insurance, Charges and Banking | 6 | OPEN | Deliver legal/administrative asset, compliance-instrument and banking registers without invading Accounting or Payments. |
| 6 | Group Structure, Agreements and Corporate Actions | 5 | OPEN | Deliver a concurrency-safe group/control graph, related-party register, material agreements and evidence-driven corporate lifecycle cases. |
| 7 | Documents, Statutory Registers, Compliance and Filings | 6 | OPEN | Deliver versioned evidence, official register snapshots, jurisdiction rule packs, generated obligations and complete filing preparation/submission history. |
| 8 | Operational Services and Enterprise Activation | 6 | OPEN | Add rebuildable operational services, controlled data exchange, enterprise hardening and activate only after the complete matrix is green. |

## Slice register

| Slice | Phase | Title | Depends on | Initial status |
|---|---:|---|---|---|
| CA-0.1 | 0 | Authority, catalog and package scaffold | None | OPEN |
| CA-0.2 | 0 | Core contracts, permissions, errors and reference ports | CA-0.1 | OPEN |
| CA-0.3 | 0 | Database foundation and atomic mutation kernel | CA-0.2 | OPEN |
| CA-0.4 | 0 | First thin vertical — draft legal-company registration | CA-0.3 | OPEN |
| CA-1.1 | 1 | Legal-company registry and jurisdiction profile | Phase 0 DONE | OPEN |
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

- [Phase 0 — Architecture and Foundation](./phases/PHASE-0-ARCHITECTURE-AND-FOUNDATION.md)
- [Phase 1 — Legal Company and Establishments](./phases/PHASE-1-LEGAL-COMPANY-AND-ESTABLISHMENTS.md)
- [Phase 2 — Governance and Statutory Offices](./phases/PHASE-2-GOVERNANCE-AND-STATUTORY-OFFICES.md)
- [Phase 3 — Authority, Approvals and Company Seal](./phases/PHASE-3-AUTHORITY-APPROVALS-AND-SEAL.md)
- [Phase 4 — Capital, Ownership and Beneficial Control](./phases/PHASE-4-CAPITAL-OWNERSHIP-AND-BENEFICIAL-CONTROL.md)
- [Phase 5 — Assets, Licences, Insurance, Charges and Banking](./phases/PHASE-5-ASSETS-LICENCES-INSURANCE-CHARGES-AND-BANKING.md)
- [Phase 6 — Group Structure, Agreements and Corporate Actions](./phases/PHASE-6-GROUP-AGREEMENTS-AND-CORPORATE-ACTIONS.md)
- [Phase 7 — Documents, Statutory Registers, Compliance and Filings](./phases/PHASE-7-DOCUMENTS-REGISTERS-COMPLIANCE-AND-FILINGS.md)
- [Phase 8 — Operational Services and Enterprise Activation](./phases/PHASE-8-OPERATIONS-AND-ENTERPRISE-ACTIVATION.md)


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-0-ARCHITECTURE-AND-FOUNDATION.md -->


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
| CA-0.1 | Authority, catalog and package scaffold | None | OPEN |
| CA-0.2 | Core contracts, permissions, errors and reference ports | CA-0.1 | OPEN |
| CA-0.3 | Database foundation and atomic mutation kernel | CA-0.2 | OPEN |
| CA-0.4 | First thin vertical — draft legal-company registration | CA-0.3 | OPEN |

## CA-0.1 — Authority, catalog and package scaffold

**Status:** `OPEN`  
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
- Create the intended domain folder structure, package exports map and package README without stub commands or fake success.

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
- Create the intended domain folder structure, package exports map and package README without stub commands or fake success.

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

**Status:** `OPEN`  
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


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-1-LEGAL-COMPANY-AND-ESTABLISHMENTS.md -->


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


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-2-GOVERNANCE-AND-STATUTORY-OFFICES.md -->


# Phase 2 — Governance and Statutory Offices

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 2` |
| Initial status | `OPEN` |
| Slice count | 5 |
| Outcome | Deliver governance bodies, statutory roles, officer evidence, meetings, quorum, voting, resolutions and implementation tracking. |

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
| CA-2.1 | Governance bodies and memberships | Phase 1 DONE | OPEN |
| CA-2.2 | Statutory offices, appointments, qualifications and consent | CA-2.1 | OPEN |
| CA-2.3 | Officer declarations, disqualifications and conflicts | CA-2.2 | OPEN |
| CA-2.4 | Meetings, notices, participants and quorum | CA-2.3 | OPEN |
| CA-2.5 | Votes, resolutions, minutes and implementation actions | CA-2.4 | OPEN |

## CA-2.1 — Governance bodies and memberships

**Status:** `OPEN`  
**Depends on:** Phase 1 DONE  
**Goal:** Create effective governance bodies and membership history.

### Authoritative surface

- **Tables:** `ca_governance_body`, `ca_governance_membership`
- **Commands:** `createGovernanceBody`, `amendGovernanceBody`, `retireGovernanceBody`, `appointGovernanceMember`, `changeGovernanceMembership`, `endGovernanceMembership`
- **Queries:** `getGovernanceBody`, `listGovernanceBodiesAsOf`, `listGovernanceMembershipsAsOf`
- **Events:** `governance_body.created.v1`, `governance_membership.appointed.v1`, `governance_membership.ended.v1`

### Binding rules

- Body types include board, committee, shareholder body and configured statutory body.
- Membership references parties or permitted role-based seats.
- Voting entitlement, chair status and term are explicit.
- Membership cannot extend outside the body or company existence.
- Overlaps and duplicate active seats follow body rules.

### Required evidence

- Effective membership and term chronology
- Duplicate/chair constraints
- Party-kind/reference validation
- Concurrent appointment conflict
- Parity and tenant isolation

### Paste-ready Codex prompt

```text
Execute CA-2.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create effective governance bodies and membership history.

Authoritative tables/surfaces: `ca_governance_body`, `ca_governance_membership`.
Commands: `createGovernanceBody`, `amendGovernanceBody`, `retireGovernanceBody`, `appointGovernanceMember`, `changeGovernanceMembership`, `endGovernanceMembership`.
Queries: `getGovernanceBody`, `listGovernanceBodiesAsOf`, `listGovernanceMembershipsAsOf`.
Events: `governance_body.created.v1`, `governance_membership.appointed.v1`, `governance_membership.ended.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Body types include board, committee, shareholder body and configured statutory body.
- Membership references parties or permitted role-based seats.
- Voting entitlement, chair status and term are explicit.
- Membership cannot extend outside the body or company existence.
- Overlaps and duplicate active seats follow body rules.

Add direct evidence for:
- Effective membership and term chronology
- Duplicate/chair constraints
- Party-kind/reference validation
- Concurrent appointment conflict
- Parity and tenant isolation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Governance bodies and membership can be resolved accurately as-of any date.

## CA-2.2 — Statutory offices, appointments, qualifications and consent

**Status:** `OPEN`  
**Depends on:** CA-2.1  
**Goal:** Model jurisdiction-required offices and the evidence needed to hold them.

### Authoritative surface

- **Tables:** `ca_statutory_office`, `ca_officer_appointment`, `ca_officer_qualification`
- **Commands:** `defineStatutoryOffice`, `appointOfficer`, `amendOfficerAppointment`, `recordOfficerQualification`, `resignOfficer`, `removeOfficer`
- **Queries:** `listRequiredStatutoryOffices`, `listOfficersAsOf`, `getOfficerAppointment`, `getOfficerVacancyStatus`
- **Events:** `statutory_office.defined.v1`, `officer.appointed.v1`, `officer.resigned.v1`, `officer.removed.v1`

### Binding rules

- Office types are jurisdiction/rule-pack driven rather than hard-coded globally.
- Appointment requires consent, compatible party kind, method, appointing authority and source evidence.
- Qualifications have issuer, validity and verification status.
- Required-office vacancy and grace-period findings are deterministic.
- Protected roles can require maker-checker approval.

### Required evidence

- Required role and vacancy logic
- Qualification validity and expiry
- Consent/appointment chronology
- Approval and segregation
- Parity/Neon concurrency/atomicity

### Paste-ready Codex prompt

```text
Execute CA-2.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Model jurisdiction-required offices and the evidence needed to hold them.

Authoritative tables/surfaces: `ca_statutory_office`, `ca_officer_appointment`, `ca_officer_qualification`.
Commands: `defineStatutoryOffice`, `appointOfficer`, `amendOfficerAppointment`, `recordOfficerQualification`, `resignOfficer`, `removeOfficer`.
Queries: `listRequiredStatutoryOffices`, `listOfficersAsOf`, `getOfficerAppointment`, `getOfficerVacancyStatus`.
Events: `statutory_office.defined.v1`, `officer.appointed.v1`, `officer.resigned.v1`, `officer.removed.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Office types are jurisdiction/rule-pack driven rather than hard-coded globally.
- Appointment requires consent, compatible party kind, method, appointing authority and source evidence.
- Qualifications have issuer, validity and verification status.
- Required-office vacancy and grace-period findings are deterministic.
- Protected roles can require maker-checker approval.

Add direct evidence for:
- Required role and vacancy logic
- Qualification validity and expiry
- Consent/appointment chronology
- Approval and segregation
- Parity/Neon concurrency/atomicity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Statutory offices, appointments and qualifications are enforceable and auditable.

## CA-2.3 — Officer declarations, disqualifications and conflicts

**Status:** `OPEN`  
**Depends on:** CA-2.2  
**Goal:** Complete officer eligibility, independence and matter-specific conflict evidence.

### Authoritative surface

- **Tables:** `ca_officer_declaration`, `ca_officer_disqualification`, `ca_conflict_disclosure`
- **Commands:** `recordOfficerDeclaration`, `supersedeOfficerDeclaration`, `recordOfficerDisqualification`, `endOfficerDisqualification`, `discloseConflict`, `recordRecusal`
- **Queries:** `getOfficerEligibilityAsOf`, `listExpiringDeclarations`, `listActiveDisqualifications`, `listConflictsForMatter`
- **Events:** `officer.declaration_recorded.v1`, `officer.disqualified.v1`, `conflict.disclosed.v1`, `conflict.recusal_recorded.v1`

### Binding rules

- Declaration types include consent, eligibility, interest, independence, fit-and-proper and related-party declarations.
- Sensitive details are stored by reference/masked snapshot; events expose only classification/status.
- Active disqualification blocks incompatible appointment or exercise of authority.
- Conflict and recusal are linked to a meeting, resolution, transaction or corporate action.
- Expiry reminders are deterministic.

### Required evidence

- Eligibility resolution
- Sensitive-data leakage checks
- Conflict/recusal linkage
- Disqualification race with appointment
- Reminder eligibility

### Paste-ready Codex prompt

```text
Execute CA-2.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Complete officer eligibility, independence and matter-specific conflict evidence.

Authoritative tables/surfaces: `ca_officer_declaration`, `ca_officer_disqualification`, `ca_conflict_disclosure`.
Commands: `recordOfficerDeclaration`, `supersedeOfficerDeclaration`, `recordOfficerDisqualification`, `endOfficerDisqualification`, `discloseConflict`, `recordRecusal`.
Queries: `getOfficerEligibilityAsOf`, `listExpiringDeclarations`, `listActiveDisqualifications`, `listConflictsForMatter`.
Events: `officer.declaration_recorded.v1`, `officer.disqualified.v1`, `conflict.disclosed.v1`, `conflict.recusal_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Declaration types include consent, eligibility, interest, independence, fit-and-proper and related-party declarations.
- Sensitive details are stored by reference/masked snapshot; events expose only classification/status.
- Active disqualification blocks incompatible appointment or exercise of authority.
- Conflict and recusal are linked to a meeting, resolution, transaction or corporate action.
- Expiry reminders are deterministic.

Add direct evidence for:
- Eligibility resolution
- Sensitive-data leakage checks
- Conflict/recusal linkage
- Disqualification race with appointment
- Reminder eligibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Officer fitness, declarations and conflicts are represented without exposing protected identity data.

## CA-2.4 — Meetings, notices, participants and quorum

**Status:** `OPEN`  
**Depends on:** CA-2.3  
**Goal:** Create an evidentiary meeting process before decisions and resolutions.

### Authoritative surface

- **Tables:** `ca_governance_meeting`, `ca_meeting_notice`, `ca_meeting_participant`, `ca_meeting_quorum_result`
- **Commands:** `scheduleGovernanceMeeting`, `issueMeetingNotice`, `recordNoticeDelivery`, `waiveNotice`, `recordMeetingParticipant`, `openMeeting`, `recordQuorum`, `adjournMeeting`, `closeMeeting`
- **Queries:** `getGovernanceMeeting`, `listGovernanceMeetings`, `getMeetingAttendance`, `getMeetingQuorumStatus`
- **Events:** `governance_meeting.scheduled.v1`, `meeting_notice.issued.v1`, `governance_meeting.quorum_recorded.v1`

### Binding rules

- Support physical, virtual, hybrid and written-resolution procedures.
- Notice period and waiver rules derive from body/company policy or compliance rules.
- Participant records include attendance, proxy/representation and recusal.
- Quorum uses an immutable rule snapshot and eligible membership as-of the meeting time.
- A meeting cannot be completed without a quorum result or documented no-quorum outcome.

### Required evidence

- Notice timing and waiver
- Membership-as-of attendance eligibility
- Quorum calculations
- Concurrent open/close and stale version
- Authenticated accessible meeting workflow

### Paste-ready Codex prompt

```text
Execute CA-2.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create an evidentiary meeting process before decisions and resolutions.

Authoritative tables/surfaces: `ca_governance_meeting`, `ca_meeting_notice`, `ca_meeting_participant`, `ca_meeting_quorum_result`.
Commands: `scheduleGovernanceMeeting`, `issueMeetingNotice`, `recordNoticeDelivery`, `waiveNotice`, `recordMeetingParticipant`, `openMeeting`, `recordQuorum`, `adjournMeeting`, `closeMeeting`.
Queries: `getGovernanceMeeting`, `listGovernanceMeetings`, `getMeetingAttendance`, `getMeetingQuorumStatus`.
Events: `governance_meeting.scheduled.v1`, `meeting_notice.issued.v1`, `governance_meeting.quorum_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Support physical, virtual, hybrid and written-resolution procedures.
- Notice period and waiver rules derive from body/company policy or compliance rules.
- Participant records include attendance, proxy/representation and recusal.
- Quorum uses an immutable rule snapshot and eligible membership as-of the meeting time.
- A meeting cannot be completed without a quorum result or documented no-quorum outcome.

Add direct evidence for:
- Notice timing and waiver
- Membership-as-of attendance eligibility
- Quorum calculations
- Concurrent open/close and stale version
- Authenticated accessible meeting workflow

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Meeting validity evidence exists before any resolution is adopted.

## CA-2.5 — Votes, resolutions, minutes and implementation actions

**Status:** `OPEN`  
**Depends on:** CA-2.4  
**Goal:** Complete the governance decision chain from motion through implementation.

### Authoritative surface

- **Tables:** `ca_meeting_vote`, `ca_resolution`, `ca_resolution_action`
- **Commands:** `recordMeetingVote`, `adoptResolution`, `rejectResolution`, `recordWrittenResolution`, `supersedeResolution`, `assignResolutionAction`, `completeResolutionAction`, `recordMinutesDocument`
- **Queries:** `getResolution`, `listResolutionsAsOf`, `getResolutionExecutionStatus`, `listOverdueResolutionActions`
- **Events:** `meeting_vote.recorded.v1`, `resolution.adopted.v1`, `resolution.action_assigned.v1`, `resolution.action_completed.v1`

### Binding rules

- Votes preserve eligible votes, votes cast, abstentions and outcome basis.
- Resolution effectiveness cannot predate valid approval.
- Resolution text is represented by approved digest/metadata and linked versioned document.
- Supersession does not erase the prior resolution.
- Completion actions require evidence and can drive later corporate actions.

### Required evidence

- Vote arithmetic and threshold rules
- Resolution chronology and approval basis
- Written-resolution unanimity/configured threshold
- Action due/overdue and completion evidence
- Full Phase 2 journey, parity, failure injection and accessibility

### Paste-ready Codex prompt

```text
Execute CA-2.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Complete the governance decision chain from motion through implementation.

Authoritative tables/surfaces: `ca_meeting_vote`, `ca_resolution`, `ca_resolution_action`.
Commands: `recordMeetingVote`, `adoptResolution`, `rejectResolution`, `recordWrittenResolution`, `supersedeResolution`, `assignResolutionAction`, `completeResolutionAction`, `recordMinutesDocument`.
Queries: `getResolution`, `listResolutionsAsOf`, `getResolutionExecutionStatus`, `listOverdueResolutionActions`.
Events: `meeting_vote.recorded.v1`, `resolution.adopted.v1`, `resolution.action_assigned.v1`, `resolution.action_completed.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Votes preserve eligible votes, votes cast, abstentions and outcome basis.
- Resolution effectiveness cannot predate valid approval.
- Resolution text is represented by approved digest/metadata and linked versioned document.
- Supersession does not erase the prior resolution.
- Completion actions require evidence and can drive later corporate actions.

Add direct evidence for:
- Vote arithmetic and threshold rules
- Resolution chronology and approval basis
- Written-resolution unanimity/configured threshold
- Action due/overdue and completion evidence
- Full Phase 2 journey, parity, failure injection and accessibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-2.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 2 closes at 14/14 with an auditable chain from body membership to meeting, vote, resolution and executed action.

## Phase-close rule

Phase 2 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-3-AUTHORITY-APPROVALS-AND-SEAL.md -->


# Phase 3 — Authority, Approvals and Company Seal

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 3` |
| Initial status | `OPEN` |
| Slice count | 4 |
| Outcome | Provide effective delegation-of-authority decisions, mandates, powers of attorney, seal control and real maker-checker enforcement. |

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
| CA-3.1 | Delegation-of-authority policies and rules | Phase 2 DONE | OPEN |
| CA-3.2 | Mandates, signatories and powers of attorney | CA-3.1 | OPEN |
| CA-3.3 | Company seal/chop identity, custody and use | CA-3.2 | OPEN |
| CA-3.4 | Maker-checker enforcement and authority decision API | CA-3.3 | OPEN |

## CA-3.1 — Delegation-of-authority policies and rules

**Status:** `OPEN`  
**Depends on:** Phase 2 DONE  
**Goal:** Create versioned policies that answer who may approve or sign a subject/action at a date and threshold.

### Authoritative surface

- **Tables:** `ca_authority_policy`, `ca_authority_rule`
- **Commands:** `createAuthorityPolicyDraft`, `addAuthorityRule`, `amendAuthorityRule`, `publishAuthorityPolicy`, `retireAuthorityPolicy`
- **Queries:** `getAuthorityPolicy`, `listAuthorityPoliciesAsOf`, `resolveAuthorityRule`
- **Events:** `authority_policy.created.v1`, `authority_policy.published.v1`, `authority_rule.amended.v1`

### Binding rules

- Rules include legal company, subject, action, role/party, threshold, currency, joint-signature group and approval requirement.
- Only one applicable published policy may resolve for a scope/date unless deterministic precedence is configured.
- Published policies are immutable; amendments create a successor version.
- Threshold comparison uses canonical decimals and explicit currency behavior.
- Publication is high risk and approval gated.

### Required evidence

- Rule precedence and ambiguity
- Decimal/currency thresholds
- Effective supersession
- Approval/SoD publication
- Concurrent publish conflict

### Paste-ready Codex prompt

```text
Execute CA-3.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create versioned policies that answer who may approve or sign a subject/action at a date and threshold.

Authoritative tables/surfaces: `ca_authority_policy`, `ca_authority_rule`.
Commands: `createAuthorityPolicyDraft`, `addAuthorityRule`, `amendAuthorityRule`, `publishAuthorityPolicy`, `retireAuthorityPolicy`.
Queries: `getAuthorityPolicy`, `listAuthorityPoliciesAsOf`, `resolveAuthorityRule`.
Events: `authority_policy.created.v1`, `authority_policy.published.v1`, `authority_rule.amended.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Rules include legal company, subject, action, role/party, threshold, currency, joint-signature group and approval requirement.
- Only one applicable published policy may resolve for a scope/date unless deterministic precedence is configured.
- Published policies are immutable; amendments create a successor version.
- Threshold comparison uses canonical decimals and explicit currency behavior.
- Publication is high risk and approval gated.

Add direct evidence for:
- Rule precedence and ambiguity
- Decimal/currency thresholds
- Effective supersession
- Approval/SoD publication
- Concurrent publish conflict

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Authority policies resolve deterministically and preserve every published version.

## CA-3.2 — Mandates, signatories and powers of attorney

**Status:** `OPEN`  
**Depends on:** CA-3.1  
**Goal:** Record specific delegated instruments and their holders.

### Authoritative surface

- **Tables:** `ca_authority_mandate`, `ca_authority_mandate_holder`, `ca_power_of_attorney`, `ca_power_of_attorney_holder`
- **Commands:** `grantAuthorityMandate`, `amendAuthorityMandate`, `revokeAuthorityMandate`, `grantPowerOfAttorney`, `amendPowerOfAttorney`, `revokePowerOfAttorney`
- **Queries:** `listAuthorityMandatesAsOf`, `listPowersOfAttorneyAsOf`, `resolveAuthorizedSignatories`
- **Events:** `authority_mandate.granted.v1`, `authority_mandate.revoked.v1`, `power_of_attorney.granted.v1`, `power_of_attorney.revoked.v1`

### Binding rules

- Mandates and PoAs record scope, territory, limit, effective period, joint/several exercise and source document.
- Holders must be eligible parties/officers for the effective period.
- Revocation preserves prior exercise history.
- Overlapping instruments are allowed only when authority resolution remains deterministic.
- Grant/revocation can require approval.

### Required evidence

- Eligibility and effective-range rules
- Joint/several combinations
- Revocation/as-of resolution
- Concurrent conflicting grant
- Redacted events and parity

### Paste-ready Codex prompt

```text
Execute CA-3.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Record specific delegated instruments and their holders.

Authoritative tables/surfaces: `ca_authority_mandate`, `ca_authority_mandate_holder`, `ca_power_of_attorney`, `ca_power_of_attorney_holder`.
Commands: `grantAuthorityMandate`, `amendAuthorityMandate`, `revokeAuthorityMandate`, `grantPowerOfAttorney`, `amendPowerOfAttorney`, `revokePowerOfAttorney`.
Queries: `listAuthorityMandatesAsOf`, `listPowersOfAttorneyAsOf`, `resolveAuthorizedSignatories`.
Events: `authority_mandate.granted.v1`, `authority_mandate.revoked.v1`, `power_of_attorney.granted.v1`, `power_of_attorney.revoked.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Mandates and PoAs record scope, territory, limit, effective period, joint/several exercise and source document.
- Holders must be eligible parties/officers for the effective period.
- Revocation preserves prior exercise history.
- Overlapping instruments are allowed only when authority resolution remains deterministic.
- Grant/revocation can require approval.

Add direct evidence for:
- Eligibility and effective-range rules
- Joint/several combinations
- Revocation/as-of resolution
- Concurrent conflicting grant
- Redacted events and parity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Mandates and powers of attorney can be resolved as-of without ambiguity.

## CA-3.3 — Company seal/chop identity, custody and use

**Status:** `OPEN`  
**Depends on:** CA-3.2  
**Goal:** Protect physical or digital company seals and prove every custody transfer and use.

### Authoritative surface

- **Tables:** `ca_company_seal`, `ca_seal_custody_event`, `ca_seal_use_event`
- **Commands:** `registerCompanySeal`, `assignSealCustody`, `transferSealCustody`, `recordSealUse`, `markSealLost`, `retireCompanySeal`
- **Queries:** `getCompanySeal`, `getCurrentSealCustodian`, `listSealUseHistory`
- **Events:** `company_seal.registered.v1`, `company_seal.custody_transferred.v1`, `company_seal.used.v1`, `company_seal.lost.v1`

### Binding rules

- Seal specimen is an external object reference/checksum, not binary content.
- Use requires an authorized resolution/mandate/approval where configured.
- Custody transfers are append-only and must close the prior custody interval.
- Lost/retired seals cannot be used.
- Sensitive specimen access is separately authorized.

### Required evidence

- Custody chain integrity
- Unauthorized/lost seal use
- Concurrent custody transfer
- Document-object validation
- Sensitive export and event redaction

### Paste-ready Codex prompt

```text
Execute CA-3.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Protect physical or digital company seals and prove every custody transfer and use.

Authoritative tables/surfaces: `ca_company_seal`, `ca_seal_custody_event`, `ca_seal_use_event`.
Commands: `registerCompanySeal`, `assignSealCustody`, `transferSealCustody`, `recordSealUse`, `markSealLost`, `retireCompanySeal`.
Queries: `getCompanySeal`, `getCurrentSealCustodian`, `listSealUseHistory`.
Events: `company_seal.registered.v1`, `company_seal.custody_transferred.v1`, `company_seal.used.v1`, `company_seal.lost.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Seal specimen is an external object reference/checksum, not binary content.
- Use requires an authorized resolution/mandate/approval where configured.
- Custody transfers are append-only and must close the prior custody interval.
- Lost/retired seals cannot be used.
- Sensitive specimen access is separately authorized.

Add direct evidence for:
- Custody chain integrity
- Unauthorized/lost seal use
- Concurrent custody transfer
- Document-object validation
- Sensitive export and event redaction

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Every seal has a complete custody and use chain with no silent overwrite.

## CA-3.4 — Maker-checker enforcement and authority decision API

**Status:** `OPEN`  
**Depends on:** CA-3.3  
**Goal:** Integrate external approvals and expose one reliable authorization-resolution contract to Afenda composition roots.

### Authoritative surface

- **Tables:** `ca_action_approval_binding` plus Phase 3 authority tables
- **Commands:** `bindApprovedCorporateAction`, high-risk command wrappers across completed phases
- **Queries:** `resolveCorporateAuthority`, `explainCorporateAuthorityDecision`, `listPendingAuthorityExceptions`
- **Events:** `corporate_action.approval_bound.v1`, `authority.exception_recorded.v1`

### Binding rules

- Approval must match tenant, company, command, subject, canonical fingerprint and validity window.
- Requester cannot be final approver where SoD applies.
- Rejected, withdrawn, expired, mismatched or reused approvals fail closed.
- Decision output includes allowed/denied, required signatory set, approval requirement and evidence references.
- Consumers receive read-only decisions through public API/port, never authority-table access.

### Required evidence

- Approval matching and replay
- Segregation-of-duties matrix
- Authority decision explainability
- Cross-tenant approval rejection
- Full authenticated Phase 3 journey

### Paste-ready Codex prompt

```text
Execute CA-3.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Integrate external approvals and expose one reliable authorization-resolution contract to Afenda composition roots.

Authoritative tables/surfaces: `ca_action_approval_binding` plus Phase 3 authority tables.
Commands: `bindApprovedCorporateAction`, high-risk command wrappers across completed phases.
Queries: `resolveCorporateAuthority`, `explainCorporateAuthorityDecision`, `listPendingAuthorityExceptions`.
Events: `corporate_action.approval_bound.v1`, `authority.exception_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Approval must match tenant, company, command, subject, canonical fingerprint and validity window.
- Requester cannot be final approver where SoD applies.
- Rejected, withdrawn, expired, mismatched or reused approvals fail closed.
- Decision output includes allowed/denied, required signatory set, approval requirement and evidence references.
- Consumers receive read-only decisions through public API/port, never authority-table access.

Add direct evidence for:
- Approval matching and replay
- Segregation-of-duties matrix
- Authority decision explainability
- Cross-tenant approval rejection
- Full authenticated Phase 3 journey

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-3.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 3 closes at 14/14 with effective authority resolution and proven maker-checker enforcement.

## Phase-close rule

Phase 3 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-4-CAPITAL-OWNERSHIP-AND-BENEFICIAL-CONTROL.md -->


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


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-5-ASSETS-LICENCES-INSURANCE-CHARGES-AND-BANKING.md -->


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


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-6-GROUP-AGREEMENTS-AND-CORPORATE-ACTIONS.md -->


# Phase 6 — Group Structure, Agreements and Corporate Actions

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 6` |
| Initial status | `OPEN` |
| Slice count | 5 |
| Outcome | Deliver a concurrency-safe group/control graph, related-party register, material agreements and evidence-driven corporate lifecycle cases. |

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
| CA-6.1 | Group-control graph and ownership evidence | Phase 5 DONE | OPEN |
| CA-6.2 | Related-party relationships and declarations | CA-6.1 | OPEN |
| CA-6.3 | Material agreements and lifecycle events | CA-6.2 | OPEN |
| CA-6.4 | Corporate-action case framework | CA-6.3 | OPEN |
| CA-6.5 | Corporate-action effects and lifecycle journeys | CA-6.4 | OPEN |

## CA-6.1 — Group-control graph and ownership evidence

**Status:** `OPEN`  
**Depends on:** Phase 5 DONE  
**Goal:** Represent direct and indirect control among internal legal companies and external parties.

### Authoritative surface

- **Tables:** `ca_group_control_relationship`, `ca_group_control_evidence`
- **Commands:** `createGroupControlRelationship`, `amendGroupControlRelationship`, `endGroupControlRelationship`, `recordGroupControlEvidence`
- **Queries:** `getGroupStructureAsOf`, `resolveUltimateParent`, `resolveSubsidiariesAsOf`, `explainControlPath`
- **Events:** `group_control.relationship_created.v1`, `group_control.relationship_ended.v1`

### Binding rules

- Endpoints are internal legal companies or external organization parties.
- Basis includes ownership, voting, contractual, board-control and other configured grounds.
- Percentages are canonical decimals and effective-dated.
- Prohibited cycles are rejected inside a transaction; permitted circular cross-holdings require explicit classification and bounded calculation.
- Control evidence snapshots the calculation/rule basis.

### Required evidence

- Direct/indirect control traversal
- Concurrent cycle attempts
- Same-tenant internal endpoint rules
- Percentage and effective-range behavior
- Graph performance and parity

### Paste-ready Codex prompt

```text
Execute CA-6.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Represent direct and indirect control among internal legal companies and external parties.

Authoritative tables/surfaces: `ca_group_control_relationship`, `ca_group_control_evidence`.
Commands: `createGroupControlRelationship`, `amendGroupControlRelationship`, `endGroupControlRelationship`, `recordGroupControlEvidence`.
Queries: `getGroupStructureAsOf`, `resolveUltimateParent`, `resolveSubsidiariesAsOf`, `explainControlPath`.
Events: `group_control.relationship_created.v1`, `group_control.relationship_ended.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Endpoints are internal legal companies or external organization parties.
- Basis includes ownership, voting, contractual, board-control and other configured grounds.
- Percentages are canonical decimals and effective-dated.
- Prohibited cycles are rejected inside a transaction; permitted circular cross-holdings require explicit classification and bounded calculation.
- Control evidence snapshots the calculation/rule basis.

Add direct evidence for:
- Direct/indirect control traversal
- Concurrent cycle attempts
- Same-tenant internal endpoint rules
- Percentage and effective-range behavior
- Graph performance and parity

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Group structure and ultimate-control paths are deterministic under concurrent change.

## CA-6.2 — Related-party relationships and declarations

**Status:** `OPEN`  
**Depends on:** CA-6.1  
**Goal:** Record related-party classifications derived from group, officer, ownership or other policies.

### Authoritative surface

- **Tables:** `ca_related_party_relationship`, `ca_related_party_declaration`
- **Commands:** `classifyRelatedParty`, `supersedeRelatedPartyClassification`, `recordRelatedPartyDeclaration`, `resolveRelatedPartyDeclaration`
- **Queries:** `listRelatedPartiesAsOf`, `explainRelatedPartyClassification`, `listUnresolvedRelatedPartyDeclarations`
- **Events:** `related_party.classified.v1`, `related_party.declaration_recorded.v1`

### Binding rules

- Relationship basis and governing policy/rule version are explicit.
- Derived and manually declared relationships are distinguishable.
- Discrepancies are surfaced rather than overwritten.
- Sensitive personal relationships use protected classification/access.
- Classifications can feed agreement, resolution and transaction controls through read-only ports/events.

### Required evidence

- Group/officer/ownership-derived classifications
- Manual-vs-derived discrepancy
- Sensitive authorization
- Effective supersession
- Parity and reconciliation

### Paste-ready Codex prompt

```text
Execute CA-6.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Record related-party classifications derived from group, officer, ownership or other policies.

Authoritative tables/surfaces: `ca_related_party_relationship`, `ca_related_party_declaration`.
Commands: `classifyRelatedParty`, `supersedeRelatedPartyClassification`, `recordRelatedPartyDeclaration`, `resolveRelatedPartyDeclaration`.
Queries: `listRelatedPartiesAsOf`, `explainRelatedPartyClassification`, `listUnresolvedRelatedPartyDeclarations`.
Events: `related_party.classified.v1`, `related_party.declaration_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Relationship basis and governing policy/rule version are explicit.
- Derived and manually declared relationships are distinguishable.
- Discrepancies are surfaced rather than overwritten.
- Sensitive personal relationships use protected classification/access.
- Classifications can feed agreement, resolution and transaction controls through read-only ports/events.

Add direct evidence for:
- Group/officer/ownership-derived classifications
- Manual-vs-derived discrepancy
- Sensitive authorization
- Effective supersession
- Parity and reconciliation

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Related-party status is explainable, historical and usable by other modules without foreign-table reads.

## CA-6.3 — Material agreements and lifecycle events

**Status:** `OPEN`  
**Depends on:** CA-6.2  
**Goal:** Administer legally material agreements without replacing the transactional package that owns their business execution.

### Authoritative surface

- **Tables:** `ca_material_agreement`, `ca_material_agreement_party`, `ca_material_agreement_event`
- **Commands:** `registerMaterialAgreement`, `amendMaterialAgreement`, `renewMaterialAgreement`, `suspendMaterialAgreement`, `terminateMaterialAgreement`, `expireMaterialAgreement`
- **Queries:** `getMaterialAgreement`, `listMaterialAgreementsAsOf`, `listExpiringMaterialAgreements`, `listRelatedPartyAgreements`
- **Events:** `material_agreement.registered.v1`, `material_agreement.amended.v1`, `material_agreement.terminated.v1`

### Binding rules

- Agreement type, parties/roles, term, governing law, value/currency snapshot, owner and document are explicit.
- Transactional orders, payroll terms or payment execution remain with their owner.
- Related-party classification and approval requirements are resolved at registration/amendment.
- Events preserve amendment/renewal/termination lineage.
- Confidential fields are excluded from normal events/search.

### Required evidence

- Party/role and related-party controls
- Term and renewal chronology
- Confidentiality/redaction
- Concurrent amendment/termination
- Cross-package no-write boundaries

### Paste-ready Codex prompt

```text
Execute CA-6.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Administer legally material agreements without replacing the transactional package that owns their business execution.

Authoritative tables/surfaces: `ca_material_agreement`, `ca_material_agreement_party`, `ca_material_agreement_event`.
Commands: `registerMaterialAgreement`, `amendMaterialAgreement`, `renewMaterialAgreement`, `suspendMaterialAgreement`, `terminateMaterialAgreement`, `expireMaterialAgreement`.
Queries: `getMaterialAgreement`, `listMaterialAgreementsAsOf`, `listExpiringMaterialAgreements`, `listRelatedPartyAgreements`.
Events: `material_agreement.registered.v1`, `material_agreement.amended.v1`, `material_agreement.terminated.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Agreement type, parties/roles, term, governing law, value/currency snapshot, owner and document are explicit.
- Transactional orders, payroll terms or payment execution remain with their owner.
- Related-party classification and approval requirements are resolved at registration/amendment.
- Events preserve amendment/renewal/termination lineage.
- Confidential fields are excluded from normal events/search.

Add direct evidence for:
- Party/role and related-party controls
- Term and renewal chronology
- Confidentiality/redaction
- Concurrent amendment/termination
- Cross-package no-write boundaries

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Material agreements have complete administration and evidence without becoming duplicate transactional contracts.

## CA-6.4 — Corporate-action case framework

**Status:** `OPEN`  
**Depends on:** CA-6.3  
**Goal:** Create a bounded case mechanism for legal-company changes without building a generic workflow engine.

### Authoritative surface

- **Tables:** `ca_corporate_action_case`, `ca_corporate_action_step`, `ca_corporate_action_condition`, `ca_corporate_action_party`
- **Commands:** `openCorporateActionCase`, `addCorporateActionStep`, `assignCorporateActionStep`, `completeCorporateActionStep`, `addCorporateActionCondition`, `satisfyCorporateActionCondition`, `cancelCorporateActionCase`
- **Queries:** `getCorporateActionCase`, `listCorporateActionCases`, `getCorporateActionReadiness`, `listOverdueCorporateActionSteps`
- **Events:** `corporate_action.case_opened.v1`, `corporate_action.step_completed.v1`, `corporate_action.condition_satisfied.v1`

### Binding rules

- Supported types are discriminated and define required steps/conditions/effects.
- Steps reference external approval, document, filing or resolution evidence rather than reimplementing those engines.
- Case completion is blocked until required conditions and approvals are satisfied.
- Case version/CAS protects concurrent coordinators.
- Cancellation preserves completed evidence and reason.

### Required evidence

- Type-specific required-step generation
- Readiness and condition logic
- Stale/concurrent step completion
- External evidence unavailable
- Action UI and accessibility

### Paste-ready Codex prompt

```text
Execute CA-6.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Create a bounded case mechanism for legal-company changes without building a generic workflow engine.

Authoritative tables/surfaces: `ca_corporate_action_case`, `ca_corporate_action_step`, `ca_corporate_action_condition`, `ca_corporate_action_party`.
Commands: `openCorporateActionCase`, `addCorporateActionStep`, `assignCorporateActionStep`, `completeCorporateActionStep`, `addCorporateActionCondition`, `satisfyCorporateActionCondition`, `cancelCorporateActionCase`.
Queries: `getCorporateActionCase`, `listCorporateActionCases`, `getCorporateActionReadiness`, `listOverdueCorporateActionSteps`.
Events: `corporate_action.case_opened.v1`, `corporate_action.step_completed.v1`, `corporate_action.condition_satisfied.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Supported types are discriminated and define required steps/conditions/effects.
- Steps reference external approval, document, filing or resolution evidence rather than reimplementing those engines.
- Case completion is blocked until required conditions and approvals are satisfied.
- Case version/CAS protects concurrent coordinators.
- Cancellation preserves completed evidence and reason.

Add direct evidence for:
- Type-specific required-step generation
- Readiness and condition logic
- Stale/concurrent step completion
- External evidence unavailable
- Action UI and accessibility

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Corporate changes can be coordinated through a bounded, auditable case without generic workflow ownership.

## CA-6.5 — Corporate-action effects and lifecycle journeys

**Status:** `OPEN`  
**Depends on:** CA-6.4  
**Goal:** Implement legal effects for incorporation, name/form change, conversion, merger/reorganization, restoration, strike-off, winding-up and dissolution.

### Authoritative surface

- **Tables:** `ca_corporate_action_effect` plus affected authority tables
- **Commands:** `recordCorporateActionEffect`, `completeCorporateActionCase`, type-specific effect commands
- **Queries:** `getCorporateActionEffects`, `reconcileCorporateActionToCompanyHistory`, `listActionsAwaitingFiling`
- **Events:** `corporate_action.effect_recorded.v1`, `corporate_action.completed.v1` plus type-specific events

### Binding rules

- Effects are immutable, approval gated and applied through existing public domain commands in one controlled transaction or saga boundary.
- Name/form/status/capital/group effects cannot bypass their aggregate invariants.
- Merger/reorganization records predecessor/successor and transfer references without silently moving peer-owned transactions.
- Completion distinguishes legal effectiveness from filing acknowledgement.
- Failed partial effect application must be recoverable and reconciled.

### Required evidence

- Type-specific effect matrices
- Atomic or compensatable effect behavior
- Approval/SoD and evidence
- Reconciliation to company/capital/group history
- Full Phase 6 authenticated journey

### Paste-ready Codex prompt

```text
Execute CA-6.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Implement legal effects for incorporation, name/form change, conversion, merger/reorganization, restoration, strike-off, winding-up and dissolution.

Authoritative tables/surfaces: `ca_corporate_action_effect` plus affected authority tables.
Commands: `recordCorporateActionEffect`, `completeCorporateActionCase`, type-specific effect commands.
Queries: `getCorporateActionEffects`, `reconcileCorporateActionToCompanyHistory`, `listActionsAwaitingFiling`.
Events: `corporate_action.effect_recorded.v1`, `corporate_action.completed.v1` plus type-specific events.

Implement the slice as a production vertical. Apply these binding rules:
- Effects are immutable, approval gated and applied through existing public domain commands in one controlled transaction or saga boundary.
- Name/form/status/capital/group effects cannot bypass their aggregate invariants.
- Merger/reorganization records predecessor/successor and transfer references without silently moving peer-owned transactions.
- Completion distinguishes legal effectiveness from filing acknowledgement.
- Failed partial effect application must be recoverable and reconciled.

Add direct evidence for:
- Type-specific effect matrices
- Atomic or compensatable effect behavior
- Approval/SoD and evidence
- Reconciliation to company/capital/group history
- Full Phase 6 authenticated journey

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-6.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 6 closes at 14/14 with legal-company changes coordinated, effected and reconciled without bypassing domain authority.

## Phase-close rule

Phase 6 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-7-DOCUMENTS-REGISTERS-COMPLIANCE-AND-FILINGS.md -->


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


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/phases/PHASE-8-OPERATIONS-AND-ENTERPRISE-ACTIVATION.md -->


# Phase 8 — Operational Services and Enterprise Activation

| Field | Value |
|---|---|
| Mission phase | `CA-GREENFIELD-ENTERPRISE-01 / Phase 8` |
| Initial status | `OPEN` |
| Slice count | 6 |
| Outcome | Add rebuildable operational services, controlled data exchange, enterprise hardening and activate only after the complete matrix is green. |

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
| CA-8.1 | Search projectors, checkpoints and rebuild | Phase 7 DONE | OPEN |
| CA-8.2 | Reminder eligibility and dispatch handoff | CA-8.1 | OPEN |
| CA-8.3 | Controlled import workflow | CA-8.2 | OPEN |
| CA-8.4 | Exports, reconciliation and entity health | CA-8.3 | OPEN |
| CA-8.5 | Enterprise security, accessibility, performance, observability and recovery | CA-8.4 | OPEN |
| CA-8.6 | Full verification matrix, migration rehearsal and activation | CA-8.5 | OPEN |

## CA-8.1 — Search projectors, checkpoints and rebuild

**Status:** `OPEN`  
**Depends on:** Phase 7 DONE  
**Goal:** Provide redacted tenant-scoped search without making the index authoritative.

### Authoritative surface

- **Tables:** `ca_projector_checkpoint` and approved `@afenda/search` documents
- **Commands:** `rebuildCorporateSearchProjection`, `replayCorporateSearchProjection` (administrative)
- **Queries:** `searchCorporateRecords`, `getCorporateSearchProjectionStatus`
- **Events:** Consumes registered CA events; emits projector diagnostics only where governed

### Binding rules

- Projection application is idempotent and version/checkpoint aware.
- Duplicate/out-of-order events are handled deterministically.
- Only approved redacted fields are searchable.
- Rebuild starts from authority and reconciles counts/digests.
- Search results link back to permission-checked authoritative queries.

### Required evidence

- Replay, duplicate and out-of-order events
- Tenant isolation and redaction
- Full rebuild/reconciliation
- Stale checkpoint detection
- Search performance and authorization

### Paste-ready Codex prompt

```text
Execute CA-8.1 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Provide redacted tenant-scoped search without making the index authoritative.

Authoritative tables/surfaces: `ca_projector_checkpoint` and approved `@afenda/search` documents.
Commands: `rebuildCorporateSearchProjection`, `replayCorporateSearchProjection` (administrative).
Queries: `searchCorporateRecords`, `getCorporateSearchProjectionStatus`.
Events: Consumes registered CA events; emits projector diagnostics only where governed.

Implement the slice as a production vertical. Apply these binding rules:
- Projection application is idempotent and version/checkpoint aware.
- Duplicate/out-of-order events are handled deterministically.
- Only approved redacted fields are searchable.
- Rebuild starts from authority and reconciles counts/digests.
- Search results link back to permission-checked authoritative queries.

Add direct evidence for:
- Replay, duplicate and out-of-order events
- Tenant isolation and redaction
- Full rebuild/reconciliation
- Stale checkpoint detection
- Search performance and authorization

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.1 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Search is useful, rebuildable, redacted and incapable of authorizing or mutating legal truth.

## CA-8.2 — Reminder eligibility and dispatch handoff

**Status:** `OPEN`  
**Depends on:** CA-8.1  
**Goal:** Handoff deterministic reminders for expiries, due filings, declarations, actions and vacancies.

### Authoritative surface

- **Tables:** `ca_reminder_dispatch`
- **Commands:** `prepareCorporateReminders`, `recordReminderDispatchResult`
- **Queries:** `listPendingCorporateReminders`, `getReminderDispatchHistory`
- **Events:** `corporate_reminder.eligible.v1`, `corporate_reminder.dispatch_recorded.v1`

### Binding rules

- Eligibility derives from authoritative dates/status and injected clock/timezone.
- Dispatch identity is durable and deduplicated.
- Scheduling and delivery remain external.
- Payloads are redacted and recipient resolution is permission/contact-policy aware.
- Retry does not duplicate a successfully acknowledged dispatch.

### Required evidence

- Date/timezone boundaries
- Deduplication and replay
- External dispatch failure/retry
- Recipient redaction
- Backlog observability

### Paste-ready Codex prompt

```text
Execute CA-8.2 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Handoff deterministic reminders for expiries, due filings, declarations, actions and vacancies.

Authoritative tables/surfaces: `ca_reminder_dispatch`.
Commands: `prepareCorporateReminders`, `recordReminderDispatchResult`.
Queries: `listPendingCorporateReminders`, `getReminderDispatchHistory`.
Events: `corporate_reminder.eligible.v1`, `corporate_reminder.dispatch_recorded.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Eligibility derives from authoritative dates/status and injected clock/timezone.
- Dispatch identity is durable and deduplicated.
- Scheduling and delivery remain external.
- Payloads are redacted and recipient resolution is permission/contact-policy aware.
- Retry does not duplicate a successfully acknowledged dispatch.

Add direct evidence for:
- Date/timezone boundaries
- Deduplication and replay
- External dispatch failure/retry
- Recipient redaction
- Backlog observability

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.2 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Reminders are deterministic and reliable without embedding a fake scheduler or notification engine.

## CA-8.3 — Controlled import workflow

**Status:** `OPEN`  
**Depends on:** CA-8.2  
**Goal:** Import greenfield or migration data through validation, dry run, approval, quarantine and public commands.

### Authoritative surface

- **Tables:** `ca_import_batch`, `ca_import_row`
- **Commands:** `createCorporateImportBatch`, `validateCorporateImportBatch`, `approveCorporateImportBatch`, `applyCorporateImportBatch`, `retryCorporateImportRow`, `cancelCorporateImportBatch`
- **Queries:** `getCorporateImportBatch`, `listCorporateImportRows`, `getImportReconciliation`
- **Events:** `corporate_import.batch_created.v1`, `corporate_import.batch_applied.v1`, `corporate_import.row_quarantined.v1`

### Binding rules

- Source checksum, schema version, mode and mutable-field allowlist are explicit.
- Dry run produces normalized row errors and unresolved party/reference quarantine.
- Prepare/approve/apply permissions are segregated.
- Apply invokes public package commands; no direct authority-table bypass.
- Per-row atomicity, replay and batch reconciliation are mandatory.

### Required evidence

- Schema/checksum validation
- Dry run and quarantine
- Approval/SoD
- Partial failure/retry/idempotency
- Large batch performance and tenant security

### Paste-ready Codex prompt

```text
Execute CA-8.3 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Import greenfield or migration data through validation, dry run, approval, quarantine and public commands.

Authoritative tables/surfaces: `ca_import_batch`, `ca_import_row`.
Commands: `createCorporateImportBatch`, `validateCorporateImportBatch`, `approveCorporateImportBatch`, `applyCorporateImportBatch`, `retryCorporateImportRow`, `cancelCorporateImportBatch`.
Queries: `getCorporateImportBatch`, `listCorporateImportRows`, `getImportReconciliation`.
Events: `corporate_import.batch_created.v1`, `corporate_import.batch_applied.v1`, `corporate_import.row_quarantined.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Source checksum, schema version, mode and mutable-field allowlist are explicit.
- Dry run produces normalized row errors and unresolved party/reference quarantine.
- Prepare/approve/apply permissions are segregated.
- Apply invokes public package commands; no direct authority-table bypass.
- Per-row atomicity, replay and batch reconciliation are mandatory.

Add direct evidence for:
- Schema/checksum validation
- Dry run and quarantine
- Approval/SoD
- Partial failure/retry/idempotency
- Large batch performance and tenant security

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.3 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Imports are controlled, reviewable and incapable of bypassing domain invariants.

## CA-8.4 — Exports, reconciliation and entity health

**Status:** `OPEN`  
**Depends on:** CA-8.3  
**Goal:** Produce deterministic register exports and continuously expose discrepancies/completeness.

### Authoritative surface

- **Tables:** `ca_export_job`, `ca_reconciliation_run`, `ca_reconciliation_finding`, `ca_entity_health_projection`, optional `ca_register_projection`
- **Commands:** `requestCorporateExport`, `runCorporateReconciliation`, `resolveReconciliationFinding`, `rebuildEntityHealthProjection`
- **Queries:** `getCorporateExportJob`, `getReconciliationRun`, `listReconciliationFindings`, `getCorporateEntityHealth`
- **Events:** `corporate_export.requested.v1`, `corporate_reconciliation.completed.v1`, `entity_health.rebuilt.v1`

### Binding rules

- Exports are permission-gated, schema-versioned, redacted and deterministically ordered.
- Sensitive exports use dedicated permission, reason and audit.
- Reconciliation covers root/history, capital ledger/holdings/certificates, UBO chains, obligations/submissions, documents/registers and projections.
- Entity health shows missing roles, expired licences, overdue filings, unresolved UBO discrepancies, missing evidence and unreconciled facts.
- Findings never silently repair authority.

### Required evidence

- Deterministic export digests
- Sensitive-export controls
- Reconciliation discrepancy fixtures
- Health rebuild and projection reconciliation
- Large dataset streaming/performance

### Paste-ready Codex prompt

```text
Execute CA-8.4 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Produce deterministic register exports and continuously expose discrepancies/completeness.

Authoritative tables/surfaces: `ca_export_job`, `ca_reconciliation_run`, `ca_reconciliation_finding`, `ca_entity_health_projection`, optional `ca_register_projection`.
Commands: `requestCorporateExport`, `runCorporateReconciliation`, `resolveReconciliationFinding`, `rebuildEntityHealthProjection`.
Queries: `getCorporateExportJob`, `getReconciliationRun`, `listReconciliationFindings`, `getCorporateEntityHealth`.
Events: `corporate_export.requested.v1`, `corporate_reconciliation.completed.v1`, `entity_health.rebuilt.v1`.

Implement the slice as a production vertical. Apply these binding rules:
- Exports are permission-gated, schema-versioned, redacted and deterministically ordered.
- Sensitive exports use dedicated permission, reason and audit.
- Reconciliation covers root/history, capital ledger/holdings/certificates, UBO chains, obligations/submissions, documents/registers and projections.
- Entity health shows missing roles, expired licences, overdue filings, unresolved UBO discrepancies, missing evidence and unreconciled facts.
- Findings never silently repair authority.

Add direct evidence for:
- Deterministic export digests
- Sensitive-export controls
- Reconciliation discrepancy fixtures
- Health rebuild and projection reconciliation
- Large dataset streaming/performance

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.4 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Operators can export certified views and see exactly where corporate records are incomplete or inconsistent.

## CA-8.5 — Enterprise security, accessibility, performance, observability and recovery

**Status:** `OPEN`  
**Depends on:** CA-8.4  
**Goal:** Harden every shipped surface and prove operational recovery.

### Authoritative surface

- **Tables:** No new catch-all domain tables; indexes/diagnostic metadata only when evidence requires
- **Commands:** Existing commands only; operational repair commands must remain explicit and permission gated
- **Queries:** Coverage, health and diagnostics queries only
- **Events:** No unregistered events

### Binding rules

- Build command/query/permission/event/table/export/route coverage matrices.
- Scan logs, audits, events, search and exports for sensitive leakage.
- Run keyboard, focus, labels, dialogs, tables, announcements and destructive-action accessibility checks.
- Measure representative tenants; add only evidence-based indexes and deterministic cursor pagination.
- Add metrics/traces for command errors, conflicts, approvals, outbox/projector lag, reminders, imports, reconciliations and DB locks.
- Prove outbox replay, projector rebuild, reminder retry, import retry and forward-repair runbooks.

### Required evidence

- Security/authorization matrix
- Accessibility suite
- EXPLAIN/query-count/performance thresholds
- Observability assertions and redaction
- Recovery and disaster-rehearsal scenarios

### Paste-ready Codex prompt

```text
Execute CA-8.5 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Harden every shipped surface and prove operational recovery.

Authoritative tables/surfaces: No new catch-all domain tables; indexes/diagnostic metadata only when evidence requires.
Commands: Existing commands only; operational repair commands must remain explicit and permission gated.
Queries: Coverage, health and diagnostics queries only.
Events: No unregistered events.

Implement the slice as a production vertical. Apply these binding rules:
- Build command/query/permission/event/table/export/route coverage matrices.
- Scan logs, audits, events, search and exports for sensitive leakage.
- Run keyboard, focus, labels, dialogs, tables, announcements and destructive-action accessibility checks.
- Measure representative tenants; add only evidence-based indexes and deterministic cursor pagination.
- Add metrics/traces for command errors, conflicts, approvals, outbox/projector lag, reminders, imports, reconciliations and DB locks.
- Prove outbox replay, projector rebuild, reminder retry, import retry and forward-repair runbooks.

Add direct evidence for:
- Security/authorization matrix
- Accessibility suite
- EXPLAIN/query-count/performance thresholds
- Observability assertions and redaction
- Recovery and disaster-rehearsal scenarios

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.5 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Every surface is secure, accessible, observable, performant and recoverable under representative load.

## CA-8.6 — Full verification matrix, migration rehearsal and activation

**Status:** `OPEN`  
**Depends on:** CA-8.5  
**Goal:** Activate the module only when every required lane and governance register is green.

### Authoritative surface

- **Tables:** No new domain tables
- **Commands:** Module activation through governed platform mechanism only
- **Queries:** Final completeness and diagnostics reports
- **Events:** Module activation event if platform convention requires it

### Binding rules

- Run all package, DB, event, Master Data, web, governance, tenancy, migration, Neon and authenticated journey lanes.
- Reconcile manifest IDs, permissions, events, schema ownership, hard-tenant roots, exports, routes, navigation and generated catalogs.
- Rehearse fresh install and production-like upgrade/backfill.
- Produce the 14-boundary matrix for every phase and exact test counts/exit codes.
- Leave lifecycle `scaffolded` if any required row is partial, gap, blocked, skipped or zero-matched.

### Required evidence

- Full monorepo affected gates
- All Neon concurrency/atomicity suites
- All authenticated journeys
- Fresh and upgrade migration rehearsals
- Activation/rollback smoke

### Paste-ready Codex prompt

```text
Execute CA-8.6 only from the Corporate Administration greenfield authority.

Treat the Corporate Administration package as new. Do not preserve or rely on a
removed implementation. First inspect current AGENTS/package instructions, working-tree
changes, module governance, DB conventions, and the approved source documents.

Goal: Activate the module only when every required lane and governance register is green.

Authoritative tables/surfaces: No new domain tables.
Commands: Module activation through governed platform mechanism only.
Queries: Final completeness and diagnostics reports.
Events: Module activation event if platform convention requires it.

Implement the slice as a production vertical. Apply these binding rules:
- Run all package, DB, event, Master Data, web, governance, tenancy, migration, Neon and authenticated journey lanes.
- Reconcile manifest IDs, permissions, events, schema ownership, hard-tenant roots, exports, routes, navigation and generated catalogs.
- Rehearse fresh install and production-like upgrade/backfill.
- Produce the 14-boundary matrix for every phase and exact test counts/exit codes.
- Leave lifecycle `scaffolded` if any required row is partial, gap, blocked, skipped or zero-matched.

Add direct evidence for:
- Full monorepo affected gates
- All Neon concurrency/atomicity suites
- All authenticated journeys
- Fresh and upgrade migration rehearsals
- Activation/rollback smoke

Also enforce organization tenancy, fail-closed authorization, stable Result errors,
expectedVersion where mutable, canonical fingerprint/idempotency, same-transaction
domain + receipt + audit + outbox persistence, redacted events, memory/Drizzle parity,
and accessible real UI/Actions wherever this slice exposes a user workflow.

Run the smallest focused tests first, then every affected package/DB/events/web and
governance lane. Report exact commands, exit codes and passed/skipped counts. A missing
required external dependency is BLOCKED. Do not add stubs, fake adapters, direct peer
table writes, production memory fallback, skipped required tests or placeholder UI.

Mark CA-8.6 DONE only when its 14-boundary matrix is complete. Return the standard
handoff and stop; do not begin the next slice.
```

### Exit gate

Phase 8 and the module close only when all 47 slices and every 14-boundary row are DONE; otherwise return NOT COMPLETE with exact blockers.

## Phase-close rule

Phase 8 is `DONE` only when every slice above is `DONE`, the phase has 14/14 acceptance evidence, all required Neon and authenticated journey lanes are green, and no required test is skipped or blocked.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md -->


# Corporate Administration — Verification, Acceptance and Codex Handoff

## 1. Fourteen-boundary acceptance matrix

Every phase-closing slice must report all fourteen rows. A phase is complete only at 14/14.

| # | Boundary | Required evidence |
|---:|---|---|
| 1 | Authority and ownership | Bounded context, table authority, non-goals and external owners remain unambiguous. |
| 2 | Catalog and dependency governance | Manifest, lifecycle, activation, workspace edges, exports and generated catalog agree. |
| 3 | Public package contracts | Branded IDs, schemas, commands, queries, Result errors and root/subpath exports are complete. |
| 4 | Reference and peer boundaries | All foreign facts use public ports/registered edges; no peer writes or peer `/src` imports. |
| 5 | Schema and migrations | Constraints, indexes, migration metadata, fresh-schema and supported upgrade evidence are green. |
| 6 | Tenancy and data isolation | All reads/writes are organization-scoped; cross-tenant identifiers fail safely; hard roots are registered. |
| 7 | Authorization, approvals and SoD | Command/query permissions, high-risk approval matching and segregation rules are proven. |
| 8 | Domain behavior and historical truth | State transitions, chronology, effective/recorded time, correction lineage and as-of behavior are correct. |
| 9 | Idempotency, concurrency and atomicity | Fingerprints, replay/conflict, CAS/locks and same-TX domain/receipt/audit/outbox behavior are proven. |
| 10 | Events, audit and privacy | Registered versioned events, deterministic audits and sensitive-data redaction are complete. |
| 11 | Adapter parity and database semantics | Shared memory/Drizzle scenarios and DB constraint/error mapping produce equivalent semantic outcomes. |
| 12 | App composition and Server Actions | Session stamping, production ports, ActionResult mapping, targeted revalidation and no Drizzle access. |
| 13 | UI, journeys and accessibility | Real persisted workflows, permission visibility, failure states, keyboard/focus/labels/announcements. |
| 14 | Operations and production readiness | Reconciliation, observability, performance, recovery, migration rehearsal and exact gate evidence. |

### Status rules

- `DONE`: direct evidence exists and the exact command exited successfully.
- `PARTIAL`: some evidence exists but the boundary is incomplete.
- `GAP`: implementation/evidence is absent.
- `BLOCKED`: required external infrastructure is unavailable.
- `NOT_APPLICABLE`: only where the phase explicitly excludes the boundary.

No phase closes with `PARTIAL`, `GAP` or `BLOCKED`.

## 2. Test evidence hierarchy

Use evidence in this order:

1. pure domain tests;
2. contract and schema tests;
3. shared adapter parity;
4. database constraints and fresh migration;
5. real Neon transaction/failure/concurrency;
6. application Action tests;
7. interaction/accessibility tests;
8. authenticated production-composition journey;
9. full affected-package and governance gates;
10. performance/recovery/migration rehearsal at phase close.

Compile success alone is not behavioral evidence.

## 3. Required verification lanes

Exact scripts must be confirmed from the current repository. The following names reflect the supplied Afenda conventions.

### 3.1 Changed files

```powershell
pnpm exec biome check <changed-files>
git diff --check
```

### 3.2 Corporate Administration package

```powershell
pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test
pnpm --filter @afenda/corporate-administration check
```

Do not report a nonexistent script as successful. Use the package’s actual scripts and record the exact command.

### 3.3 Database/schema/tenancy

Run whenever schema, migration, index, transaction code or tenancy registration changes:

```powershell
pnpm --filter @afenda/db lint
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db test
pnpm audit:tenancy-nulls
```

Required evidence:

- fresh schema;
- supported upgrade migration;
- schema ownership registration;
- hard-tenant-root registration;
- same-tenant foreign-key/constraint behavior;
- Neon lane with `DATABASE_URL`.

### 3.4 Event contracts

Run whenever an event is added or changed:

```powershell
pnpm --filter @afenda/events lint
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events test
```

Event tests must reconcile emitted event names and versions against the registered catalog.

### 3.5 Master Data references

Run whenever Party, tax-registration or reference-data integration changes:

```powershell
pnpm --filter @afenda/master-data lint
pnpm --filter @afenda/master-data typecheck
pnpm --filter @afenda/master-data test
pnpm --filter @afenda/master-data check
```

The CA test must prove it uses public Master Data contracts and never writes `md_*`/`ref_*`.

### 3.6 Web/Actions/UI

Run whenever app composition, Actions, routes, navigation or UI changes:

```powershell
pnpm --filter @afenda/web lint
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test
pnpm --filter @afenda/web build
```

Authenticated journey and accessibility lanes are reported separately from unit tests.

### 3.7 Governance and full affected graph

At every phase close and final activation:

```powershell
pnpm validate:modules --write
pnpm governance:packages
pnpm check:docs-trunk-ban
pnpm exec turbo run lint typecheck test
git diff --check
```

Use the current repository generator command where `validate:modules --write` differs. Do not hand-edit generated files.

## 4. Required Neon evidence

A required Neon lane must report:

```text
command=<exact command>
environment=<database branch/schema identifier with secrets redacted>
exit=<code>
passed=<count>
failed=<count>
skipped=<count>
duration=<observed duration>
```

Required scenarios by affected mutation family:

- success writes aggregate/fact + receipt + audit + outbox;
- failure before domain write;
- failure after domain write;
- failure during receipt;
- failure during audit;
- failure during outbox;
- failure immediately before commit;
- retry after rollback;
- same-key/same-fingerprint replay;
- same-key/different-fingerprint conflict;
- stale `expectedVersion`;
- natural-key race;
- effective-range overlap race;
- relevant graph/ledger/numbering race.

An unavailable `DATABASE_URL` means `BLOCKED`.

## 5. Authenticated journey evidence

Each phase that exposes UI must include at least one production-composed journey that:

1. authenticates a user;
2. selects a tenant;
3. verifies permission visibility;
4. loads authoritative state;
5. performs a real Server Action mutation;
6. handles validation or conflict state;
7. reloads persisted state;
8. proves cross-tenant or unauthorized access fails;
9. verifies accessible labels, focus and status feedback;
10. confirms sensitive fields remain redacted.

Mocked package commands alone are not an authenticated journey.

## 6. Security and privacy checks

At phase close, scan:

- command inputs and outputs;
- domain events;
- audit diffs;
- structured logs;
- search documents;
- export schemas;
- error metadata;
- UI HTML/serialized props.

Forbidden leakage includes:

- government identifiers;
- unrestricted birth dates/residential addresses;
- full bank-account identity;
- signature/seal specimen URLs;
- document signed URLs or credentials;
- confidential agreement body text;
- approval-system secrets;
- raw SQL/stack traces shown to users.

## 7. Migration acceptance

Every migration-bearing phase reports:

| Evidence | Requirement |
|---|---|
| Fresh install | Empty database migrates and package tests pass |
| Upgrade path | Supported prior schema migrates without application-incompatible gap |
| Backfill | Idempotent and restartable |
| Invalid legacy data | Detected and quarantined/reported, not silently coerced |
| Concurrency | Deploying application versions remain safe during expand/migrate/contract |
| Recovery | Forward-repair or rollback procedure is documented and rehearsed |
| Reconciliation | Row counts/invariants before and after migration are compared |

## 8. Performance acceptance

Measure representative small, medium and large tenants. At minimum cover:

- legal-company list and history;
- officer/authority as-of;
- meeting/resolution list;
- holdings/capital reconstruction;
- ownership/UBO graph traversal;
- expiring instruments;
- due/overdue filings;
- group structure;
- document/register list;
- search;
- reconciliation;
- import/export streaming.

Requirements:

- deterministic cursor pagination;
- bounded query count;
- no unbounded in-memory materialization;
- evidence-based indexes;
- lock duration/ordering review;
- repository-standard EXPLAIN evidence;
- regression threshold recorded in tests or benchmark governance.

Do not invent universal millisecond targets before measuring the deployment environment.

## 9. Standard Codex handoff

Every slice response must use this structure:

```text
1. Verdict: COMPLETE | NOT COMPLETE | BLOCKED
2. Slice: <CA-X.Y>
3. Greenfield posture:
   - prior Corporate Administration implementation relied on: none
   - current disk baseline inspected: <files/commit/branch>
4. Working-tree baseline:
   - branch/commit:
   - pre-existing changed files:
5. Authority applied:
   - package ownership:
   - external boundaries:
   - high-risk approval rules:
6. Files changed by layer:
   - package contracts/domain
   - DB/schema/migration
   - events/governance
   - adapters/composition
   - Actions/UI
   - tests/evidence
7. Behavior delivered:
   - commands:
   - queries:
   - transitions/invariants:
   - user workflow:
8. Security, tenancy, history, idempotency, concurrency and atomicity evidence
9. Tests added:
   - file:
   - scenarios:
10. Verification:
   - <exact command> -> exit <code>; passed=<n>; failed=<n>; skipped=<n>
11. Fourteen-boundary matrix:
   - boundary | status | files | tests | command | exit | remaining gap
12. Migration impact:
13. Remaining gaps:
14. Next eligible slice: <ID>; do not start it
```

Do not report `COMPLETE` when any required boundary is not `DONE`.

## 10. Scope and repair rules

1. Fix root causes; do not silence TypeScript, Biome, SQL, authorization or tests.
2. No stubs, shims, fake adapters, inert UI, fabricated success, TODO throws or placeholder exports.
3. Preserve unrelated working-tree changes.
4. Do not commit or push unless requested.
5. Do not hand-edit generated files.
6. Keep commands thin, rules pure and persistence explicit.
7. Do not widen into HR, Payroll, Accounting, Payments or platform repairs unless a directly required contract cannot be satisfied.
8. When an upstream conflict is discovered, return `CONFUSION` with exact files and the smallest decision required.
9. A phase may add a required supporting migration or event contract, but must not opportunistically refactor unrelated packages.
10. Stop after the selected slice.


<!-- SOURCE: docs-V2/_scratch/erp/corporate-administration-greenfield/SOURCE-PLACEMENT.md -->


# Source Placement

The generated bundle mirrors the recommended repository paths.

## Documentation authority

Copy:

```text
docs-V2/_scratch/erp/corporate-administration-greenfield/
```

to the same path in the Afenda repository.

This is initially Scratch authority. Promote or link it through the repository’s documentation-governance process before treating it as Living authority.

## Package README

Copy:

```text
packages/erp/corporate-administration/README.md
```

when scaffolding the new package. Keep its lifecycle statement accurate as slices are delivered.

## Suggested first mission

Start with:

```text
CA-0.1 — Authority, catalog and package scaffold
```

Do not begin schema or business commands before the package manifest, module roadmap, dependency edges and ownership reservation are approved.

## Generated files

Do not hand-edit generated catalogs or manifests. Use the repository’s owning generators and then run governance validation.


<!-- SOURCE: packages/erp/corporate-administration/README.md -->


# `@afenda/corporate-administration`

Greenfield Afenda ERP bounded context for legal-company administration, corporate governance and statutory registers.

> **Lifecycle:** `scaffolded` until the full greenfield roadmap is complete. This README defines intended authority; it must be updated to describe only shipped behavior as slices are delivered.

## Purpose

This package will be the sole mutator of `ca_*` authority for:

- legal companies, legal forms, names, identifiers, statuses and establishments;
- governance bodies, statutory offices, meetings, votes, resolutions and actions;
- delegation of authority, mandates, powers of attorney and company seals;
- share capital, certificates, ownership restrictions, beneficial ownership and distributions;
- property/admin assets, IP, insurance, charges, licences and bank administration;
- group control, related parties, material agreements and corporate actions;
- corporate documents, statutory registers, compliance rules, filing obligations and submissions;
- rebuildable corporate search, reminders, imports, exports, reconciliation and entity health.

All operations use organization-scoped authority, `@afenda/errors` `Result` outcomes, effective history, version/CAS, canonical idempotency and same-transaction audit/outbox evidence.

## Identity and ownership

| Identity | Owner |
|---|---|
| `organization_id` tenant boundary | Platform/authentication |
| `legal_company_id` statutory entity | This package |
| Person/organization `party_id` | `@afenda/master-data` |
| Tax registrations | `@afenda/master-data` |
| Payment accounts and money movement | `@afenda/payments` |
| Capitalization, depreciation and journals | `@afenda/accounting` |
| Binary documents | Document/storage platform |
| Generic approvals | Approval platform |

Corporate Administration owns `ca_legal_company`; it does not depend on a Master Data legal-entity dimension. Consumers resolve legal companies through public CA queries, injected ports, registered events or approved projections.

## Package posture

- Published name: `@afenda/corporate-administration`
- Manifest id: `corporate-administration`
- Category/band: `erp` / `R1-F`
- Activation: `organization_toggle`
- Table prefix: `ca_*`
- Production database: shared organization-scoped Neon/Postgres
- Public imports: package root and declared subpaths only
- Forbidden: raw table exports, peer ERP `/src` imports, peer-table writes, Next.js inside the package

## Intended exports

| Path | Role |
|---|---|
| `@afenda/corporate-administration` | Public commands, queries, schemas, branded IDs, Result types, permissions and options |
| `@afenda/corporate-administration/types` | Consumer-safe domain/read-model types |
| `@afenda/corporate-administration/adapters/drizzle` | Production Drizzle composition |
| `@afenda/corporate-administration/module-manifest` | Module manifest |
| `@afenda/corporate-administration/testing` | Test-only memory composition and parity fixtures, only if governance permits |

The root must never export raw Drizzle tables, SQL helpers or application Actions.

## Core invariants

- Every authoritative row is scoped by `organization_id`.
- Every company child is scoped by `legal_company_id`.
- Cross-tenant identifiers return tenant-safe not-found behavior.
- Statutory facts are end-dated, superseded, reversed, revoked, released or archived rather than destructively rewritten.
- Important registers support effective `asOf`; audit-sensitive registers support `knownAt`.
- Mutable rows require `expectedVersion`.
- Material mutations atomically persist domain state, durable receipt, audit and versioned outbox event.
- Same key/same fingerprint replays; same key/different fingerprint conflicts.
- High-risk operations can require external approval and requester/approver segregation.
- Events, audits, search and normal exports are redacted.
- Memory and Drizzle adapters must pass shared parity.
- Production never falls back to memory.

## Delivery roadmap

The greenfield implementation is controlled by:

```text
docs-V2/_scratch/erp/corporate-administration-greenfield/
├── 00-CORPORATE-ADMINISTRATION-AUTHORITY.md
├── 01-DOMAIN-MODEL-AND-DATA-AUTHORITY.md
├── 02-PACKAGE-ARCHITECTURE-AND-CONTRACTS.md
├── 03-ROADMAP-INDEX.md
├── phases/
└── 90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md
```

There are nine phases and 47 controlled coding slices. Execute one slice per coding mission.

## Intended domain folders

```text
src/
├── kernel/
├── company/
├── establishments/
├── governance/
├── officers/
├── authority/
├── capital/
├── ownership/
├── beneficial-ownership/
├── distributions/
├── assets/
├── compliance-instruments/
├── banking/
├── group/
├── agreements/
├── corporate-actions/
├── documents/
├── registers/
├── compliance-rules/
├── filings/
├── operations/
├── adapters/drizzle/
└── testing/
```

Do not create a large all-domain `schemas.ts`, `store.ts` or adapter.

## Maintain

Once package scripts exist, expected local lanes are:

```bash
pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test
pnpm --filter @afenda/corporate-administration check
```

Repository governance:

```bash
pnpm validate:modules --write
pnpm governance:packages
pnpm audit:tenancy-nulls
```

Use actual current repository scripts and report exact exit codes. Never treat a missing script or skipped required lane as success.

## Activation condition

Keep lifecycle `scaffolded` until all 47 slices and all 14 acceptance boundaries are `DONE`, including Neon atomicity/concurrency, authenticated journeys, migration rehearsal, privacy, accessibility, performance, observability and recovery.
