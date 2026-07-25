# Corporate Administration — Integrated Module Implementation Authority

| Field | Decision |
|---|---|
| Repository reviewed | `pohlai88/afenda-lite` |
| Review baseline | `main` at `d07f6751fe31da07a2c27814313f15ef7ff90f76` |
| Target package | `packages/erp/corporate-administration/` |
| Published name | `@afenda/corporate-administration` |
| Manifest id | `corporate-administration` |
| Product label | **Corporate Administration** |
| Bounded-context name | **Corporate Administration and Statutory Registers** |
| Manifest category | `erp` |
| Band | `R1-F` |
| Activation | `organization_toggle` |
| Table prefix | `ca_*` |
| Quality posture | Enterprise production; no stubs, shims, TODO paths, fake adapters, or partial-completion claims |
| Status of this document | Implementation-ready authority and repair mission |

---

## 1. Executive verdict

The attached draft has the correct strategic direction: Afenda needs a dedicated organization-scoped bounded context for legal companies, corporate records, ownership, governance, premises, property, non-stock corporate assets, licences, charges, banking administration, group structure, documents, and statutory filings.

It is **not yet safe to implement unchanged**. The following repairs are mandatory:

1. Use existing manifest category `erp`; do not introduce a new `governance` catalog category for a business-domain package.
2. Close overlap with `@afenda/master-data` for legal-entity dimensions, organization parties, party addresses, party relationships, external identifiers, and tax registrations.
3. Close overlap with `@afenda/payments` for operational payment accounts.
4. Replace directly editable shareholding rows with an immutable share-transaction ledger and derived as-of holdings.
5. Add effective-dated legal names and company-status history.
6. Add omitted corporate-governance facts: boards/committees, memberships, authority mandates, signatories, meetings, resolutions, and powers of attorney.
7. Add omitted asset and compliance facts: intellectual-property rights, insurance policies, material agreement register, filing obligations, and filing submissions.
8. Make historical truth, optimistic concurrency, idempotency, tenancy, audit, outbox, authorization, deterministic serialization, and privacy controls explicit.
9. Include a minimum production UI in CA-1. Package plus Actions without a usable route is not an end-to-end full-stack slice.
10. Add a strict plan-to-code completeness ledger. The module must not be called complete merely because its package compiles.

### Runtime completion at the reviewed baseline

The current repository contains no executable Corporate Administration boundary: no package, manifest, schema, migration, events, permission catalog entries, Actions, feature route, or tests. The current executable implementation completion is therefore **0 of 12 required runtime boundaries**. The attached document is planning evidence, not implementation evidence.

---

## 2. Decisions — all former open questions resolved

| Question | Binding decision | Reason |
|---|---|---|
| Package name | `@afenda/corporate-administration` | Explicit, discoverable, and aligned with folder/id naming rules. |
| Product/bounded-context terminology | Product label **Corporate Administration**; bounded context **Corporate Administration and Statutory Registers** | Aligns product label with the bounded context and prevents the domain from becoming a miscellaneous “admin” drawer. |
| Manifest category | `erp` | Existing HR and payroll use `erp`; a new `governance` category would add taxonomy without adding an ownership boundary. |
| Jurisdiction model | Generic multi-jurisdiction core in CA-1 | Malaysia/SSM or other e-filing profiles belong in explicit jurisdiction policies/adapters. No fake external integration. |
| Legal-entity dimension | Exactly one effective `md_organization_dimension(kind = legal_entity)` per CA legal company | The dimension remains the cross-module scope key; CA owns rich registry facts. |
| Organization party | Draft may be created with the legal-entity dimension; activation requires an active `md_party(kind = organization)` linked as the company’s commercial/legal party | This closes intercompany, counterparty, address, regulator, bank, shareholder, and filing relationships without a shadow party table. |
| Company and party names/numbers | CA is authoritative for the tenant’s own legal-company registry history; `md_party` remains the reusable operational party and may hold a current snapshot | No CA direct write to `md_*`; synchronization is an app saga or disposable projection, never dual mutation. |
| Tax registrations | `md_tax_registration` remains authoritative | `ca_company_identifier` must not duplicate TIN/VAT/GST registrations. CA reads and displays tax registrations through the master-data port. |
| Officers/shareholders/UBOs | Controlled parties only through `md_party` | No authoritative free-text identity. Import rows with unresolved parties remain quarantined and cannot activate or post ownership facts. |
| Property and corporate assets | Separate aggregates | Property has title, tenure, land, encumbrance, and ownership rules that do not fit a generic asset row. |
| Intellectual property | Separate typed register | Jurisdiction, registration number, classes, renewal, expiry, and ownership require dedicated invariants. |
| Share ownership | Immutable transaction header + legs; holdings derived as-of | Prevents drift, supports transfers, allotments, cancellation, splits, consolidations, redemption, and audit reconstruction. |
| Bank accounts | CA owns a **bank-account registration and mandate register**; Payments owns operational `payment_account` and money movement | No duplicate operational account authority. CA records masked legal/admin facts only. |
| Group structure | CA owns effective-dated legal control relationships between companies; master-data party relationships remain generic operational relationships | Legal control requires percentage, control basis, dates, evidence, and cycle rules. |
| UI in CA-1 | Required | CA-1 must include operator and tenant routes, list/detail/create/edit/activate flows, navigation, empty/error/loading states, and permission checks. |
| Hard deletion | Forbidden for activated statutory facts | Correct by supersession, end dating, reversal, dissolution, release, cancellation, or archival. |
| Custom fields/EAV | Forbidden for authoritative core facts | Add typed columns or typed extension tables. A bounded metadata object may exist only for non-authoritative integration annotations. |
| Idempotency | Required for every material create or irreversible mutation | Replay must return the original result; mismatched fingerprints must fail. |
| Concurrency | `expectedVersion` required for mutable records; append-only ledgers use immutable transaction references and idempotency | Prevents silent lost updates. |

---

## 3. Bounded context and ownership map

A tenant organization may administer many legal companies. Every CA row is constrained first by `organization_id`, then by `legal_company_id` where applicable.

```text
Tenant organization
└── Legal company
    ├── Legal identity and registration history
    ├── Governance and delegated authority
    ├── Share capital, transactions, certificates, holdings, UBO disclosures
    ├── Registered premises and places of business
    ├── Property, corporate assets, IP, insurance, and charges
    ├── Licences and permits
    ├── Bank-account registrations and mandates
    ├── Group-control relationships
    ├── Material agreement register
    ├── Corporate documents
    └── Filing obligations and submissions
```

### 3.1 Canonical ownership boundaries

| Concern | Canonical owner | CA rule |
|---|---|---|
| Tenant identity and membership | Auth/platform | Receive `organizationId` and actor from the app session; never create shadow organizations. |
| Legal-entity scope key | `@afenda/master-data` organization dimension | Require and stamp an effective `legal_entity` dimension. |
| Reusable person/organization identity | `@afenda/master-data` party | Officers, holders, UBOs, banks, regulators, insurers, counterparties, and the legal company itself reference parties. |
| Tax registrations | `@afenda/master-data` | Read-only display/validation; no `ca_*` duplicate. |
| Legal-company statutory registry | `@afenda/corporate-administration` | Sole mutator. |
| Corporate legal ownership and control | `@afenda/corporate-administration` | Share ledger, UBO disclosures, group control, evidence, and history. |
| Inventory items, stock, warehouse balances | `@afenda/inventory` / master data | CA does not count stock or mutate stock. |
| Operational payment accounts and money movement | `@afenda/payments` | CA bank registration is administrative only; no payment posting. |
| Capitalization, depreciation, journals, carrying value | `@afenda/accounting` | CA may emit asset events; no journal or depreciation engine. |
| Employee/work assignment/custodian | `@afenda/human-resources` | CA does not own employee custody or maintenance workflows. Optional references must be supplied by app-level projections later. |
| Binary document storage, OCR, malware scanning | Platform document/blob service | CA stores metadata, checksum, classification, version, and external reference only. |
| Search index | `@afenda/search` | Disposable projection, never mutation authority. |
| E-filing to SSM/Companies House/etc. | Future integration adapter | CA records obligation/submission facts but does not pretend to file externally in core. |

### 3.2 Anti-corruption rules

- CA never inserts, updates, or deletes `md_*`, `payment_*`, accounting, HR, inventory, or other peer-owned tables.
- CA does not import peer ERP internals or `/src` paths.
- Master lookups occur through the registered public `@afenda/master-data` edge and an injected `CorporateAdministrationMasterLookupPort`.
- Future accounting/payments/HR integrations use events, read projections, or an app saga; no concealed peer write.
- CA does not create `ca_person`, `ca_bank`, `ca_regulator`, `ca_insurer`, or `ca_counterparty` shadow tables.

---

## 4. Capability inventory

### 4.1 Legal company and registrations

- Tenant-local company code.
- One-to-one legal-entity dimension binding.
- Organization-party binding.
- Jurisdiction and legal-form code.
- Incorporation/registration date.
- Commencement, dormant, suspended, dissolved, struck-off, and archived states.
- Fiscal-year-end statutory fact.
- Legal-name, former-name, and trading-name history.
- Corporate registration identifiers, LEI, branch registration, and other corporate identifiers.
- Tax registrations displayed from master data rather than duplicated.
- Current-profile and as-of queries.

### 4.2 Governance and authority

- Director, company secretary, auditor, public officer, authorized representative, and other appointment types.
- Board and committee definitions.
- Effective-dated memberships and chair roles.
- Signing authority, bank mandates, powers of attorney, limits, joint-signature rules, and revocation.
- Meetings, attendance metadata, quorum result, minutes document reference, and closure.
- Resolutions, approval result, effective date, supersession/revocation, and supporting evidence.

### 4.3 Capital, shareholders, and beneficial ownership

- Share classes, currency, par value, rights, authorization limits, and class lifecycle.
- Immutable share transactions with balanced holder legs.
- Allotment, transfer, cancellation, redemption, conversion, split, consolidation, treasury movement, and correction/reversal.
- Share certificates, replacements, cancellations, and document references.
- Holdings calculated as-of a date/time from posted transactions.
- Nominee capacity and beneficial-owner disclosures.
- Nature-of-control codes, effective dates, verification status, and evidence.
- No direct editing of a “current holding” number.

### 4.4 Premises, property, assets, IP, insurance, and charges

- Registered office, principal place of business, branch, records office, and other statutory premises.
- Address reference plus immutable address snapshot for historical truth.
- Land, building, strata, leasehold, freehold, title number, ownership percentage, acquisition/disposal, and valuation reference.
- Non-stock legal/admin corporate assets: vehicles, plant, equipment, artwork, digital assets, and other registered assets.
- Intellectual-property rights: trademark, patent, design, domain, copyright registration, plant variety, and other rights.
- Insurance policies with insurer party, covered subject, dates, limit/currency, status, and evidence.
- Charges, mortgages, liens, debentures, security interests, affected subject, secured party, amount/currency, creation, variation, and release.
- CA stores acquisition/registration facts; accounting remains authoritative for book value and depreciation.

### 4.5 Licences, banking, group structure, and agreements

- Licences and permits, authority, number, subject, validity, renewal, suspension, revocation, and evidence.
- Bank-account registration: bank party, masked account identity, country, currency, account purpose, open/close date, and status.
- Bank mandates and signatory rules.
- Legal parent/subsidiary/associate/joint-control/control-by-agreement relationships, ownership/control percentage, evidence, and effective dates.
- Material agreement register: shareholder agreement, joint venture, lease, financing, guarantee, franchise, distribution, management, and other governance-significant agreements.
- Agreement register stores metadata and document references; it does not replace purchasing, sales, payroll, or payment execution.

### 4.6 Documents, obligations, filings, and reminders

- Constitution, certificate, resolution, minutes, register extract, filing receipt, licence, title, policy, agreement, and other document metadata.
- External object reference, version, checksum, classification, signed/effective/expiry dates, retention class, and supersession.
- Filing obligation definition separated from filing submission history.
- Due date, period, jurisdiction, authority, status, assignee reference, waiver, extension, submission, acknowledgement, rejection, and evidence.
- Deterministic due/overdue queries.
- Reminder jobs may consume CA queries/events later; CA core must not contain a fake scheduler.

---

## 5. Canonical persistence model

Use singular snake-case table names. Every table below is organization-scoped and BA-owned unless explicitly described as a future projection.

### 5.1 Slice CA-1 — legal-company registry

| Table | Role | Critical invariants |
|---|---|---|
| `ca_legal_company` | Aggregate root and current lifecycle snapshot | Unique tenant code; unique legal-entity dimension; dimension kind must be `legal_entity`; active company requires active organization party and primary legal name/registration; versioned CAS updates. |
| `ca_company_name` | Effective-dated legal/former/trading names | Legal-name ranges do not overlap; normalized name stored; corrections supersede rather than overwrite historical rows. |
| `ca_company_identifier` | Corporate regulatory identifiers excluding tax registrations | Type/jurisdiction/authority/value normalized; active uniqueness; tax identifier types rejected and delegated to `md_tax_registration`. |
| `ca_company_status_history` | Append-only lifecycle history | Each transition records from/to, effective date, reason, resolution/evidence, actor, and correlation. Root status equals latest effective transition. |

Recommended root fields:

```text
id · organization_id · code · normalized_code
legal_entity_dimension_id · legal_entity_key_snapshot · legal_entity_name_snapshot
legal_party_id · legal_party_code_snapshot · legal_party_name_snapshot
jurisdiction_country_id · legal_form_code · legal_form_name_snapshot
incorporation_date · commencement_date · fiscal_year_end_month · fiscal_year_end_day
status · version
created_by · updated_by · created_at · updated_at
activated_at/by · suspended_at/by · dissolved_at/by · archived_at/by
create_idempotency_key · create_request_fingerprint
```

### 5.2 Slice CA-2 — governance and premises

| Table | Role | Critical invariants |
|---|---|---|
| `ca_officer_appointment` | Effective-dated officer/auditor/secretary appointment | Party is same tenant and active when appointed; end date is not before start; overlapping exclusive roles can be restricted by jurisdiction policy. |
| `ca_governance_body` | Board or committee | Unique active body code per company; explicit body type and lifecycle. |
| `ca_governance_membership` | Effective-dated membership | Member party or officer appointment required; no overlapping duplicate membership. |
| `ca_authority_mandate` | Signing authority/power of attorney | Typed scope, amount/currency limits, single/joint rule, effective range, grant evidence, and revocation evidence. |
| `ca_company_premise` | Registered office/branch/records location | Address reference plus snapshot; no overlapping primary registered office; effective-dated retirement. |
| `ca_governance_meeting` | Meeting/minutes metadata | Date/time, body, quorum result, status, minutes document; closed meetings are immutable except a correction record. |
| `ca_resolution` | Resolution and authority evidence | Resolution number unique within company/year; approved resolution cannot be deleted; revoke/supersede explicitly. |

### 5.3 Slice CA-3 — capital and ownership

| Table | Role | Critical invariants |
|---|---|---|
| `ca_share_class` | Share class definition | Unique active class code; decimal quantities and values; closed class cannot accept new transactions. |
| `ca_share_transaction` | Immutable transaction header | Unique transaction reference/idempotency; typed transaction; posting/reversal lifecycle; company/class scoped. |
| `ca_share_transaction_leg` | Holder quantity deltas | Party required; non-zero decimal delta; transfer-like transactions sum to zero; issuance/cancellation rules validate total delta; no resulting negative holding. |
| `ca_share_certificate` | Certificate lifecycle | Unique active certificate number; issue/replacement/cancellation evidence; links to holder, class, and source transaction. |
| `ca_beneficial_owner_disclosure` | UBO/PSC disclosure | Party required; nature-of-control codes; effective range; verification and evidence; no destructive rewrite. |

Do **not** create a mutable `ca_shareholding` source-of-truth table. Implement:

```text
holding(asOf) = SUM(posted, unreversed share_transaction_leg.quantity_delta)
```

A `ca_shareholding_balance` projection may be added only after measured need. It must be rebuildable, reconciled against the ledger, and never accepted as mutation authority.

### 5.4 Slice CA-4 — property, assets, IP, insurance, and charges

| Table | Role | Critical invariants |
|---|---|---|
| `ca_property_holding` | Real-property title/tenure register | Title identity normalized; ownership percentage in range; acquisition/disposal chronology; company ownership cannot overlap inconsistently. |
| `ca_corporate_asset` | Non-stock legal/admin asset register | Stable asset code/identifier; category; acquisition/disposal/write-off lifecycle; no depreciation or inventory quantity. |
| `ca_intellectual_property_right` | IP right and renewal register | Right type, jurisdiction, registration/application number, owner, filing/grant/expiry dates, status, renewal facts. |
| `ca_insurance_policy` | Corporate insurance register | Insurer party, policy number, covered subject, effective range, limit/currency, status, document. |
| `ca_charge` | Charge/encumbrance/security register | Secured party, affected subject, amount/currency, priority, creation/variation/release, evidence; released charges remain historical. |

### 5.5 Slice CA-5 — licences, banking, group control, and agreements

| Table | Role | Critical invariants |
|---|---|---|
| `ca_licence_permit` | Licence/permit lifecycle | Authority party, jurisdiction, number, scope, validity, renewal/suspension/revocation, evidence. |
| `ca_bank_account_registration` | Administrative register of a company bank account | Bank party, masked/tokenized account identity, country/currency, purpose, open/close date; never payment credentials or transaction balance. |
| `ca_bank_mandate` | Signatory and joint-signature mandate | References bank registration and authority mandate/parties; effective-dated; revoked rather than deleted. |
| `ca_group_control_relationship` | Legal group/control relationship | Internal company or external organization party endpoint; no self-link; duplicate-range and cycle checks for control relationships; percentage and control basis. |
| `ca_material_agreement` | Governance-significant agreement metadata | Typed agreement, parties, dates, status, value snapshot when relevant, renewal/termination, external document reference. |

### 5.6 Slice CA-6 — documents and statutory filing

| Table | Role | Critical invariants |
|---|---|---|
| `ca_corporate_document` | Versioned metadata and external object reference | No binary; checksum/version/classification; sensitive fields excluded from events; supersession chain. |
| `ca_filing_obligation` | Due/compliance requirement | Unique obligation/period/authority scope; due date and extension/waiver history; deterministic status. |
| `ca_filing_submission` | Append-only submission/acknowledgement history | Links obligation; submitted/acknowledged/rejected timestamps and references; no fake e-filing claim. |

### 5.7 Optional import tables — add only with a complete import slice

| Table | Rule |
|---|---|
| `ca_import_batch` | Own batch status, source checksum, counts, actor, correlation, and idempotency. |
| `ca_import_row` | Validation outcome, normalized payload, unresolved party/dimension references, and applied entity reference. |

Do not add empty import shells. A batch is shippable only with validation, dry-run, apply, reconciliation, row-level errors, idempotency, authorization, and tests.

---

## 6. Database and serialization invariants

### 6.1 Tenancy

- `organization_id TEXT NOT NULL` on every CA table.
- Every primary-key lookup also filters `organization_id`.
- Every child also carries `legal_company_id` and `organization_id` for auditability and indexes.
- Use same-tenant composite foreign keys where the referenced schema supports them.
- Register every CA table in hard-tenant roots and the null-tenancy audit.
- Cross-tenant IDs must return a tenant-safe not-found result, never leak existence.

### 6.2 Identity, codes, and normalization

- UUIDs are branded at the package boundary.
- Business codes are trim-normalized and Unicode-normalized through one shared helper.
- Names are never used as identifiers.
- Natural identifier normalization is type-aware; do not globally strip meaningful characters.
- Retired identifiers are not silently recycled.

### 6.3 Dates and time

- Statutory dates use ISO `YYYY-MM-DD` strings.
- Event and audit timestamps use UTC instants.
- Effective ranges are inclusive start/exclusive end where timestamps are used; document the rule once.
- `effectiveTo` cannot precede `effectiveFrom`.
- As-of queries use one canonical predicate helper.
- Range overlap checks run under a transaction/advisory lock; use a DB exclusion constraint only if the required extension is already approved.

### 6.4 Numbers and money

- Never use JavaScript floating point for share quantity, ownership percentage, money, or exchange values.
- Persist Postgres `numeric`; expose canonical decimal strings.
- ISO currency code is required wherever a monetary value exists.
- Percentage scale and bounds are explicit.

### 6.5 Lifecycle and historical truth

- Mutable roots carry a monotonic `version`.
- Commands require `expectedVersion` and use compare-and-swap.
- Effective-dated facts are superseded/end-dated, not overwritten.
- Share transactions and filing submissions are append-only.
- Corrections use a reversal/supersession reference and reason.
- Activated statutory records are never hard-deleted.

### 6.6 Idempotency and deterministic fingerprints

- Every material mutation includes `idempotencyKey`.
- Fingerprints use a single canonical serializer: stable key ordering, normalized strings, canonical decimal text, and normalized null handling.
- Same key + same fingerprint returns the original result.
- Same key + different fingerprint fails with `corporate-administration.idempotency.conflict`.
- Never derive idempotency solely from `correlationId` in package APIs; Actions may form a stable key from a durable client request identity.

### 6.7 Sensitive data

- Never store bank login details, passwords, tokens, PINs, card data, or online-banking credentials.
- Bank account identity is masked or tokenized; list responses expose only safe display values.
- Government personal identifiers remain in approved party identity surfaces; CA stores party references and only legally necessary snapshots.
- Audit changes and event payloads redact sensitive values.
- Documents expose classification and reference, not binary content or signed URLs from domain events.

### 6.8 JSON policy

- Core statutory facts use typed columns.
- No EAV table and no uncontrolled custom-field engine.
- A small `integration_metadata JSONB` may contain non-authoritative connector annotations only, with a size limit, version, and schema validation.
- JSON cannot determine lifecycle, permissions, ownership, amounts, due dates, or legal identity.

---

## 7. Package architecture

Split by domain from the first slice. Do not create a giant `schemas.ts`, `store.ts`, or Drizzle adapter that becomes the next file-length repair mission.

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
│   ├── brands.ts
│   ├── parse-input.ts
│   ├── contracts/
│   │   ├── context.ts
│   │   ├── pagination.ts
│   │   ├── reasons.ts
│   │   └── snapshots.ts
│   ├── shared/
│   │   ├── as-of.ts
│   │   ├── code.ts
│   │   ├── decimal.ts
│   │   ├── effective-range.ts
│   │   ├── fingerprint.ts
│   │   ├── lifecycle.ts
│   │   └── redact.ts
│   ├── company/
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   ├── commands.ts
│   │   └── queries.ts
│   ├── governance/
│   ├── ownership/
│   ├── premises/
│   ├── assets/
│   ├── compliance/
│   ├── banking/
│   ├── group-structure/
│   ├── documents/
│   ├── store/
│   │   ├── index.ts
│   │   ├── company-store.ts
│   │   ├── governance-store.ts
│   │   ├── ownership-store.ts
│   │   ├── asset-store.ts
│   │   ├── compliance-store.ts
│   │   └── document-store.ts
│   ├── adapters/
│   │   └── drizzle/
│   │       ├── index.ts
│   │       ├── transactions.ts
│   │       ├── company.ts
│   │       ├── governance.ts
│   │       ├── ownership.ts
│   │       ├── assets.ts
│   │       ├── compliance.ts
│   │       └── documents.ts
│   └── testing/
│       ├── index.ts
│       ├── memory-store.ts
│       ├── memory-masters.ts
│       └── test-ports.ts
└── __tests__/
    ├── manifest.test.ts
    ├── authorization.test.ts
    ├── company.domain.test.ts
    ├── company.parity.test.ts
    ├── tenancy.test.ts
    ├── idempotency.test.ts
    ├── concurrency.test.ts
    └── mutation-atomicity.test.ts
```

### 7.1 Store composition

Use small domain store contracts and compose them:

```text
CorporateAdministrationStore =
  CompanyStore
  & GovernanceStore
  & OwnershipStore
  & AssetStore
  & ComplianceStore
  & DocumentStore
```

Rules:

- A domain file implements only its own store surface.
- `adapters/drizzle/index.ts` composes domain adapters; it does not reimplement methods.
- The memory adapter implements the same contracts, not a reduced fake API.
- Contract/parity tests execute the same scenarios against memory and Drizzle.
- No production fallback to memory.

### 7.2 Public exports

Root `.` exports only:

- commands and queries;
- public input schemas and domain result types;
- branded IDs;
- permission and semantic error constants;
- authorization port type;
- command/query options types.

Subpaths:

- `./adapters/drizzle`
- `./testing`
- `./module-manifest`

Do not export internal store implementations from the root barrel.

---

## 8. Ports and prerequisites

### 8.1 Required ports

```text
CorporateAdministrationAuthorizationPort
CorporateAdministrationMasterLookupPort
MutationPorts { audit, outbox }
```

The master lookup port must support:

- one effective legal-entity dimension by ID as-of a date;
- one effective legal-entity dimension by key as-of a date;
- party by ID;
- party active/kind checks;
- party address by ID when a premise uses a master address;
- tax registrations by company party for read composition;
- optional reference country/currency lookup.

### 8.2 Mandatory master-data prerequisite repair

The current master-data organization-dimension API resolves a complete five-dimension key set. CA needs a focused public query and must not fake it by directly selecting `md_organization_dimension`.

Add a public master-data query such as:

```text
master-data.organization-dimension.get-effective
```

Input:

```ts
{
  organizationId: string;
  actorUserId: string;
  id?: string;
  kind: "legal_entity";
  key?: string;
  asOf: string;
}
```

Validation requires exactly one of `id` or `key`. Result is `OrganizationDimensionReference | null`. Wire module IDs, permission mapping, manifest query list, root export, memory/Drizzle tests, cross-tenant rejection, ambiguous-range detection, and as-of behavior.

### 8.3 Mutation atomicity

In production, aggregate mutation, audit fact, and outbox event must commit or roll back as one unit. A successful entity mutation with a failed audit/event append is prohibited.

Acceptable implementation shapes:

1. A Drizzle transaction-scoped store and transaction-scoped mutation ports supplied by `runNeonHttpTransaction`; or
2. A package UoW abstraction that exposes store/audit/outbox bound to one transaction.

Do not call independent autocommit adapters sequentially and describe the result as atomic.

---

## 9. Command, query, permission, and event model

Define IDs once in `module-ids.ts`. Reuse constants in the manifest, authorization map, Actions, tests, and documentation. Permission strings should equal the corresponding command/query risk boundary wherever practical.

### 9.1 Company commands

```text
corporate-administration.company.create
corporate-administration.company.update
corporate-administration.company.activate
corporate-administration.company.suspend
corporate-administration.company.dissolve
corporate-administration.company.archive
corporate-administration.company-name.add
corporate-administration.company-name.end
corporate-administration.company-identifier.add
corporate-administration.company-identifier.update
corporate-administration.company-identifier.retire
```

Queries:

```text
corporate-administration.company.get
corporate-administration.company.list
corporate-administration.company.get-as-of
corporate-administration.company-name.list
corporate-administration.company-identifier.list
corporate-administration.company-status.list
corporate-administration.company-tax-registration.list
```

### 9.2 Governance and premises commands

```text
corporate-administration.officer.appoint
corporate-administration.officer.amend
corporate-administration.officer.end
corporate-administration.governance-body.create
corporate-administration.governance-body.update
corporate-administration.governance-body.retire
corporate-administration.governance-membership.appoint
corporate-administration.governance-membership.end
corporate-administration.authority-mandate.grant
corporate-administration.authority-mandate.amend
corporate-administration.authority-mandate.revoke
corporate-administration.premise.register
corporate-administration.premise.update
corporate-administration.premise.retire
corporate-administration.meeting.record
corporate-administration.meeting.close
corporate-administration.resolution.record
corporate-administration.resolution.approve
corporate-administration.resolution.revoke
```

Queries use `.get`, `.list`, and `.get-as-of` equivalents under each aggregate namespace.

### 9.3 Ownership commands

```text
corporate-administration.share-class.create
corporate-administration.share-class.update
corporate-administration.share-class.close
corporate-administration.share-transaction.record
corporate-administration.share-transaction.post
corporate-administration.share-transaction.reverse
corporate-administration.share-certificate.issue
corporate-administration.share-certificate.replace
corporate-administration.share-certificate.cancel
corporate-administration.beneficial-owner.declare
corporate-administration.beneficial-owner.update
corporate-administration.beneficial-owner.end
```

Queries:

```text
corporate-administration.share-class.list
corporate-administration.share-transaction.get
corporate-administration.share-transaction.list
corporate-administration.shareholding.list-as-of
corporate-administration.shareholding.get-holder-as-of
corporate-administration.share-certificate.list
corporate-administration.beneficial-owner.list-as-of
```

### 9.4 Asset, compliance, banking, group, document, and filing commands

Use the same stable pattern:

```text
property.register | update | dispose
asset.register | update | dispose | write-off
intellectual-property.register | update | renew | expire | dispose
insurance-policy.register | update | renew | cancel
charge.register | amend | release
licence.register | update | renew | suspend | revoke
bank-account.register | update | close
bank-mandate.grant | amend | revoke
group-control.create | update | end
material-agreement.register | update | renew | terminate
document.register | supersede | retire
filing-obligation.create | update | extend | waive
filing-submission.record | acknowledge | reject
```

Prefix every ID with `corporate-administration.` and provide `.get`, `.list`, `.list-as-of`, `.list-due`, or `.list-expiring` queries as appropriate.

### 9.5 Semantic error catalog

Platform `Result` retains generic transport-neutral error codes. Attach CA semantic detail through one field, for example `details.corporateAdministrationCode`.

Required semantic errors include:

```text
corporate-administration.company.not_found
corporate-administration.company.code_conflict
corporate-administration.company.dimension_not_effective
corporate-administration.company.dimension_already_bound
corporate-administration.company.party_not_active
corporate-administration.company.party_kind_invalid
corporate-administration.company.invalid_transition
corporate-administration.company.version_conflict
corporate-administration.identifier.conflict
corporate-administration.tax_identifier.foreign_owner
corporate-administration.effective_range.overlap
corporate-administration.party.cross_tenant
corporate-administration.idempotency.conflict
corporate-administration.share.transaction_unbalanced
corporate-administration.share.insufficient_holding
corporate-administration.share.class_closed
corporate-administration.share.certificate_conflict
corporate-administration.group.self_reference
corporate-administration.group.control_cycle
corporate-administration.asset.invalid_transition
corporate-administration.charge.invalid_transition
corporate-administration.filing.invalid_transition
corporate-administration.sensitive_value.forbidden
```

Centralize messages/reason helpers. Do not duplicate magic error strings in Actions, memory stores, Drizzle adapters, and tests.

### 9.6 Initial events

```text
corporate-administration.company.created.v1
corporate-administration.company.updated.v1
corporate-administration.company.activated.v1
corporate-administration.company.status-changed.v1
corporate-administration.company.dissolved.v1
corporate-administration.officer.appointed.v1
corporate-administration.officer.ended.v1
corporate-administration.authority-mandate.granted.v1
corporate-administration.authority-mandate.revoked.v1
corporate-administration.resolution.approved.v1
corporate-administration.share-transaction.posted.v1
corporate-administration.share-transaction.reversed.v1
corporate-administration.beneficial-owner.changed.v1
corporate-administration.property.registered.v1
corporate-administration.property.disposed.v1
corporate-administration.asset.registered.v1
corporate-administration.asset.disposed.v1
corporate-administration.intellectual-property.renewed.v1
corporate-administration.charge.registered.v1
corporate-administration.charge.released.v1
corporate-administration.licence.renewed.v1
corporate-administration.bank-account.registered.v1
corporate-administration.bank-account.closed.v1
corporate-administration.group-control.changed.v1
corporate-administration.document.registered.v1
corporate-administration.filing-submission.recorded.v1
corporate-administration.filing-submission.acknowledged.v1
```

Event payload rules:

- Stable IDs, organization ID, legal company ID, version, actor ID, correlation ID, and minimal stamped display values.
- No full bank number, personal government identifier, unrestricted address, or document URL.
- Event schema lives in `@afenda/events`; manifest imports constants from its public schema export.

---

## 10. Full-stack web integration

### 10.1 Composition root

```text
apps/web/lib/erp/corporate-administration-command-options.ts
apps/web/lib/erp/corporate-administration-authorization-port.ts
apps/web/lib/erp/corporate-administration-master-lookup-port.ts
```

The app composition root injects:

- session-backed fail-closed authorization;
- production Drizzle store/UoW;
- audit/outbox adapters;
- master-data public lookups.

### 10.2 Actions

CA-1 minimum Actions:

```text
apps/web/app/actions/create-legal-company.ts
apps/web/app/actions/update-legal-company.ts
apps/web/app/actions/activate-legal-company.ts
apps/web/app/actions/suspend-legal-company.ts
apps/web/app/actions/dissolve-legal-company.ts
apps/web/app/actions/get-legal-company.ts
apps/web/app/actions/list-legal-companies.ts
apps/web/app/actions/add-company-name.ts
apps/web/app/actions/add-company-identifier.ts
```

Each Action:

1. Uses `"use server"`.
2. Resolves session organization and actor; never accepts them from `FormData`.
3. Uses `runOperatorPermissionAction` or the approved tenant permission runner.
4. Parses a narrow Action schema.
5. Calls the package with correlation ID and stable idempotency key.
6. Maps package `Result` through `mapPackageResult`.
7. Revalidates only affected routes/tags.
8. Returns `ActionResult<T>`.
9. Never imports DB tables or Drizzle.
10. Never weakens package authorization because the route already checked permission.

### 10.3 Feature structure

```text
apps/web/features/corporate-administration/
├── corporate-administration-shell.tsx
├── legal-company-list.tsx
├── legal-company-table.tsx
├── legal-company-form.tsx
├── legal-company-detail.tsx
├── company-profile-panel.tsx
├── company-status-timeline.tsx
├── company-identifiers-panel.tsx
├── company-tabs.tsx
├── empty-state.tsx
└── error-state.tsx
```

Later slices add domain panels without expanding one mega component.

### 10.4 Routes and navigation

```text
apps/web/app/(operator)/admin/corporate-administration/page.tsx
apps/web/app/(client)/client/(workspace)/corporate-administration/page.tsx
```

- Add `corporate-administration` to `ShellNavModuleId`.
- Add permission-gated operator and client navigation entries.
- Operator may mutate according to permissions.
- Tenant/client routes may mutate only where the current product authorization policy permits; otherwise they remain read-only.
- Both routes reuse feature components and package queries.

### 10.5 Information architecture

Legal-company detail tabs:

1. Overview
2. Registration
3. Governance
4. Ownership
5. Premises
6. Property
7. Corporate assets
8. Intellectual property
9. Licences
10. Banking
11. Group structure
12. Agreements
13. Documents
14. Filings

Only shipped capabilities appear. Do not render non-working placeholder tabs.

### 10.6 UX and accessibility

- Loading, empty, forbidden, validation, conflict, stale-version, and server-error states are distinct.
- Forms retain safe values after validation failure.
- Version conflicts explain that the record changed and require refresh/review.
- Sensitive values are masked by default.
- Keyboard access, labels, descriptions, focus management, table captions, and accessible status text are required.
- Destructive/high-risk actions require explicit confirmation and reason; dissolution, share reversal, charge release, and filing waiver must not be one-click accidents.

---

## 11. Governance and repository change map

### 11.1 Control-plane files

- `docs-V2/_scratch/erp/corporate-administration/corporate-administration.md` — replace draft/open questions with this approved authority.
- `docs-V2/modules/MODULE-ROADMAP.yaml` — add candidate/approved row before scaffolding; remove it only when promoted according to repository governance.
- `packages/erp/README.md` — add Corporate Administration under `erp`.
- `packages/README.md` — add package catalog entry.
- `scripts/validate-modules/checks.mjs` — add `LIVING_ERP_MANIFEST_PACKAGES` entry and every CA schema symbol/table mapping.
- `docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml` — approve CA edges to DB, errors, audit, events, and master data; add app dependency edge where governance requires it.
- `docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml` — register every BA-owned mutation table.
- Generated module, dependency, event, permission, and table registers — regenerate; never hand-edit generated files.

### 11.2 DB and event files

- `packages/data-plane/db/src/schema/corporate-administration.ts`
- `packages/data-plane/db/src/schema/index.ts`
- `packages/data-plane/db/src/hard-tenant-roots.ts`
- `packages/data-plane/db/src/platform-permission-catalog.ts`
- `packages/data-plane/db/drizzle/<next>_corporate_administration_*.sql`
- Drizzle journal/meta required by repository convention
- DB schema/migration/tenancy tests
- `packages/data-plane/events/src/schemas/corporate-administration.events.ts`
- Events schema/barrel/register tests

### 11.3 Master-data prerequisite files

- `packages/erp/master-data/src/module-ids.ts`
- `packages/erp/master-data/src/permissions.ts`
- `packages/erp/master-data/src/authorization.ts`
- `packages/erp/master-data/src/module.manifest.ts`
- `packages/erp/master-data/src/organization-dimension.ts` or a focused query file
- `packages/erp/master-data/src/index.ts`
- organization-dimension domain/Drizzle tests

### 11.4 New package and tests

- Complete package tree in Section 7.
- `testing/vitest.config.ts` named project `corporate-administration` with `server-only` alias.
- Package scripts: `lint`, `typecheck`, `test`, `check`.
- No unlisted workspace dependencies.

### 11.5 Web files

- Add `@afenda/corporate-administration` to `apps/web/package.json`.
- Add composition-root ports/options.
- Add Actions, feature files, operator/client routes, navigation, and tests.
- Add action contract, authorization, route smoke, and interaction tests.

---

## 12. Delivery program

Every slice is vertically complete: schema, migration, ownership, package contracts, memory and Drizzle implementations, permissions, events, Actions, UI, tests, and documentation. Shrink scope, never quality.

| Slice | Scope | Exit condition |
|---|---|---|
| **CA-0 — Authority and governance** | Resolve decisions; roadmap; package/catalog registration plan; ownership and dependency maps | No open architecture question that changes CA-1; governance accepts the planned package. |
| **CA-0.5 — Master-data prerequisite** | Focused effective legal-entity query and tests | CA can resolve one legal-entity dimension without direct `md_*` SQL. |
| **CA-1 — Legal-company registry** | Company, names, identifiers, status history; create/update/activate/suspend/dissolve/get/list/as-of; minimal full UI | Tenant can create and activate a company end-to-end; audit/outbox same transaction; memory/Drizzle parity green. |
| **CA-2 — Governance and premises** | Officers, bodies, memberships, mandates, premises, meetings, resolutions | Effective-dated governance truth and UI complete. |
| **CA-3 — Share capital and ownership** | Share classes, transaction ledger/legs, certificates, holdings as-of, UBO disclosures | No negative holdings, unbalanced transfers, direct holding edits, or destructive ledger changes. |
| **CA-4 — Property and corporate assets** | Property, corporate assets, IP, insurance, charges | Legal/admin asset register complete without inventory/accounting drift. |
| **CA-5 — Licences, banking, group control, agreements** | Licences, bank registrations/mandates, group control, material agreements | Payments boundary proven; group cycles and sensitive-data leakage prevented. |
| **CA-6 — Documents and filings** | Document metadata, filing obligations, submissions, due/overdue UX | No binary storage or fake e-filing; compliance history reconstructable. |
| **CA-7 — Search, reminders, import/export, reconciliation** | Search projection, due/expiry projectors, complete import/export if approved, reconciliation reports | Projections rebuildable; import rows reconciled; no hidden source of truth. |
| **CA-8 — Enterprise closeout** | Cross-layer audit, performance indexes, accessibility, security/redaction, failure injection, full matrix closure | All planned rows Done with evidence; all required commands exit 0; no omitted/stubbed surface. |

### Slice discipline

- Do not scaffold all future tables with no behavior.
- Do not add manifest commands that have no implementation.
- Do not add UI tabs that call no real Action/query.
- Do not mark the package `active` before CA-1 is vertically usable.
- Do not call the overall module “complete” before CA-8.

---

## 13. Test and stabilization contract

### 13.1 Domain tests

- Valid and invalid lifecycle transitions.
- Activation prerequisites.
- Effective-range overlap/gap policy.
- Name/identifier normalization and uniqueness.
- Same-party/same-tenant checks.
- Stale version vs not-found distinction.
- Idempotent replay vs fingerprint conflict.
- Share transaction balance and insufficient holding.
- Group self-link/cycle prevention.
- Masking and event redaction.

### 13.2 Store parity

Run the same behavior suite against:

- `MemoryCorporateAdministrationStore`
- Drizzle/Neon adapter

Parity must cover successful mutations, reads, list order, as-of resolution, idempotency, conflicts, and error details. Do not make memory semantics more permissive than production.

### 13.3 Concurrency

- Concurrent duplicate company code.
- Concurrent duplicate identifier.
- Concurrent activation.
- Concurrent effective-range insert.
- Concurrent share transfer from the same holding.
- Concurrent filing status update.
- Concurrent idempotency replay.

Expected outcome is one committed authority and deterministic conflict/replay results, not last-write-wins.

### 13.4 Atomicity/failure injection

Inject failures at:

- entity insert/update;
- audit append;
- outbox append;
- post-mutation mapping.

Assert no partial entity/audit/event state survives.

### 13.5 Tenancy and authorization

- Cross-org get/list/update/end/reverse must fail tenant-safely.
- Missing authorization port fails closed.
- Command/query manifest map has complete key parity.
- App Action permission string matches the package/catalog permission.
- Client routes cannot bypass operator-only mutation policy.

### 13.6 Web tests

- Action input parsing and session stamping.
- Package-result mapping.
- Revalidation paths.
- Route permission visibility.
- Create/edit/activate interaction.
- Empty/error/stale conflict states.
- Accessibility for forms, dialogs, tabs, tables, and status announcements.

### 13.7 Migration and reconciliation tests

- Fresh schema creation.
- Constraint/index presence.
- Migration idempotence policy according to repo convention.
- Hard-tenant-root parity.
- Schema ownership vs manifest mutation-table parity.
- Share ledger reconciliation.
- Root status vs status-history reconciliation.
- Projection rebuild/reconciliation when projections are introduced.

---

## 14. Verification commands

Run from a clean branch/worktree based on the selected commit. Capture exact exit codes and concise failure evidence.

```bash
pnpm validate:modules --write
pnpm governance:packages

pnpm --filter @afenda/db lint
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db test

pnpm --filter @afenda/events lint
pnpm --filter @afenda/events typecheck
pnpm --filter @afenda/events test

pnpm --filter @afenda/master-data check

pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test
pnpm --filter @afenda/corporate-administration check

pnpm --filter @afenda/web lint
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test

pnpm audit:tenancy-nulls
pnpm exec turbo run lint typecheck test
```

Where Neon parity suites require `DATABASE_URL`, report separately:

```text
unit lane exit: <code>
Neon parity lane exit: <code>
full package lane exit: <code>
```

Never report a name-pattern command that matched zero tests as evidence of a passing target.

---

## 15. Plan-to-code completeness matrix

### 15.1 Reviewed baseline

| Boundary | Planned | Actual at reviewed baseline | Verdict |
|---|---:|---:|---|
| Approved authority/decisions | 1 | Draft with open questions | Partial |
| Module roadmap/catalog registration | 1 | Absent | Gap |
| Package shell/manifest | 1 | Absent | Gap |
| Master-data focused legal-entity lookup | 1 | Absent | Gap |
| DB schema/migrations | 1 | Absent | Gap |
| Ownership/tenancy registration | 1 | Absent | Gap |
| Events/permissions/auth map | 1 | Absent | Gap |
| Domain commands/queries | 1 | Absent | Gap |
| Memory/Drizzle adapters | 1 | Absent | Gap |
| App composition/Actions | 1 | Absent | Gap |
| UI/routes/navigation | 1 | Absent | Gap |
| Tests/reconciliation/green gates | 1 | Absent | Gap |

**Executable completeness: 0/12.**

The attached draft provides useful design intent, but it cannot be counted as runtime completion.

### 15.2 Required final report

For every slice, return a matrix with these statuses only:

- `DONE` — implemented and verified with exact evidence.
- `PARTIAL` — some required boundary missing; list it.
- `GAP` — no implementation.
- `BLOCKED` — external prerequisite prevents verification; provide evidence and no success claim.
- `NOT_APPLICABLE` — only when this authority explicitly excludes the item.

Each row must include:

```text
plan requirement
files changed
tests covering it
verification command
exit code
remaining gap
```

The completion percentage is calculated from `DONE` rows only. `PARTIAL`, skipped tests, placeholders, generated declarations without behavior, and zero-test matches count as incomplete.

---

## 16. Repair rules

1. Fix the root cause; do not silence TypeScript, lint, SQL, auth, or test failures.
2. No `any`, unsafe broad casts, `@ts-ignore`, blanket lint disables, or swallowed exceptions.
3. No `throw new Error("TODO")`, mock production adapter, inert UI, or method returning fabricated success.
4. No compatibility shim unless a named public compatibility contract requires it and tests prove the migration path.
5. No duplicate store/schema/type definitions across domains; extract a small shared helper only after real duplication exists.
6. Do not create a generic “common” dumping ground. Shared code must have one clear invariant.
7. Keep commands thin, domain rules pure, persistence explicit, and Actions transport-only.
8. Do not mix unrelated HR/payroll repairs into this mission.
9. Do not rewrite generated files manually.
10. Do not claim green if any required lane fails, skips unexpectedly, or matches zero tests.

---

## 17. Final implementation mission for the coding agent

### Mission ID

`BA-ENTERPRISE-INTEGRATED-01`

### Objective

Implement `@afenda/corporate-administration` as the sole tenant-scoped owner of corporate administration and statutory registers, beginning with CA-0, CA-0.5, and CA-1 as one verified vertical cut. Close every architecture and code gap required for a tenant to create, view, update, and activate legal-company records through production UI, with master-data references, strict authorization, tenant isolation, optimistic concurrency, idempotency, same-transaction audit/outbox, memory/Drizzle parity, migrations, permissions, navigation, and tests.

### Mandatory authority decisions

Use the decisions in Section 2 without reopening them unless current disk evidence proves a direct conflict. If a conflict appears, stop and report the exact authority/file conflict before changing scope.

### First implementation cut

1. Finalize the Scratch authority and roadmap row.
2. Add focused master-data legal-entity lookup.
3. Scaffold the governed package and register workspace edges.
4. Add CA-1 schema and migration:
   - `ca_legal_company`
   - `ca_company_name`
   - `ca_company_identifier`
   - `ca_company_status_history`
5. Register ownership, tenancy roots, schema symbols, permissions, and events.
6. Implement company create/update/activate/suspend/dissolve/get/list/get-as-of.
7. Implement real memory and Drizzle adapters.
8. Guarantee entity + audit + outbox atomicity.
9. Add server Actions, operator/client routes, navigation, shell, list/detail/form/timeline UI.
10. Add package, DB, event, master-data, web, parity, concurrency, tenancy, auth, and failure-injection tests.
11. Run every verification command and return exact exit codes.
12. Return the plan-to-code matrix with no omitted row.

### CA-1 activation invariants

A company cannot activate unless:

- its legal-entity dimension exists, is effective as-of activation date, is same tenant, and has kind `legal_entity`;
- its linked legal party exists, is same tenant, is active, and has kind `organization`;
- it has one effective primary legal name;
- it has the required primary corporate registration identifier for its jurisdiction profile;
- no active company already binds the dimension or conflicting identifier;
- `expectedVersion` matches;
- authorization succeeds;
- audit and outbox can commit in the same transaction.

### Forbidden implementation shortcuts

- Direct `md_*` SQL inside CA.
- CA writes to `payment_account`, accounting, inventory, or HR tables.
- Free-text authoritative shareholder/officer records.
- Mutable current shareholding source table.
- Tax registration duplicated in `ca_company_identifier`.
- Full bank account secrets.
- Placeholder future aggregate files exported as implemented.
- App Action or UI direct DB access.
- Success report without full evidence.

### Required completion response

```text
1. Executive verdict: COMPLETE | NOT COMPLETE
2. Baseline commit and final commit/working tree state
3. Authority decisions applied
4. Files changed by layer
5. Schema/migration and ownership evidence
6. Public command/query/permission/event surface
7. Tests added and scenarios covered
8. Verification commands with exact exit codes
9. Plan-to-code completeness matrix
10. Remaining gaps: must be “none” for the selected slice, or the verdict is NOT COMPLETE
```

---

## 18. Definition of “complete”

The selected slice is complete only when a real tenant user with the required permission can:

1. Open the Corporate Administration route.
2. List tenant-scoped legal companies.
3. Create a draft company linked to an effective legal-entity dimension.
4. Add legal name and corporate identifier facts.
5. Link the active organization party.
6. Activate the company.
7. Reopen and view the exact persisted record and status history.
8. Receive deterministic validation/conflict/stale-version responses.
9. Replay a request safely through idempotency.
10. Be prevented from accessing or mutating another tenant’s record.
11. Produce one atomic entity mutation, audit fact, and outbox event.
12. Pass memory/Drizzle parity, web tests, tenancy audit, module governance, lint, typecheck, and full required test lanes.

Anything less is `PARTIAL`, not complete.
