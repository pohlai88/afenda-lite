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

### 2.1 Retired pre-greenfield implementation

The pre-greenfield Corporate Administration source is removed. Migration
`0050_drop_corporate_administration_module.sql` drops every legacy `ca_*` table.
Earlier CA SQL migrations remain only as immutable forward-migration history; they
are not schemas, contracts, or implementation evidence for this greenfield package.
The DB schema barrel exports no CA tables, the obsolete TypeScript schema source is
absent, and legacy `corporate-administration.*` permission codes are cleanup-only
entries excluded from the living permission catalog.

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
- command and query functions only when a slice implements them;
- public result types and semantic error codes;
- permission identifiers only when activated with a command/query coverage test;
- event type names where consumer-safe;
- command/query options and required public ports only when backed by a consuming slice.

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
