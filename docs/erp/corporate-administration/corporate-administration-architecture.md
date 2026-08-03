# Corporate Administration Architecture

> **Document purpose.**
> This document defines the permanent business boundary, semantic ownership, architectural rules, integration model, and delivery governance for `corporate-administration`.
>
> It is the authoritative architecture document for the domain as a whole. It is not an implementation plan for an individual feature.
>
> Each feature listed in this document requires its own approved `PRD.md` before implementation.

---

## 0. Document control

```yaml
document_id: CA-DOMAIN-ARCH-001
domain_id: corporate-administration            # kebab-case; equals the manifest `id`
domain_name: Corporate Administration
package: "@afenda/corporate-administration"
package_path: packages/erp/corporate-administration

status: review
# draft | review | approved | superseded | retired

version: 1.0.0
owner_domain: Administration Department
owner_architecture: ERP Architecture
approved_by: []
approved_on: null
supersedes: null
last_reviewed_on: 2026-08-03
next_review_due_on: null

tenancy_model: organization-scoped
runtime_model: modular-monolith
public_api: package-root-facade

# The four fields below are projections of `AfendaModuleManifest`
# (packages/data-plane/db/src/module-manifest-contract.ts). They must match
# src/composition/module.manifest.ts exactly — this block is not a second source.
band: R1-F
lifecycle: scaffolded             # scaffolded | active | deprecated | retired
activation_mode: organization_toggle   # core | organization_toggle
schema_owner: "@afenda/db"
```

### 0.1 Authority

This document is authoritative for:

* the domain mission;
* bounded-context ownership;
* feature classification;
* permanent source structure;
* package dependency direction;
* facade rules;
* cross-feature coordination;
* integration boundaries;
* tenancy and privacy posture;
* domain-wide implementation controls;
* architectural Definition of Done.

This document is not authoritative for:

* individual feature fields;
* feature state machines;
* feature-specific operations;
* feature-specific permissions;
* database columns;
* migration identifiers;
* frontend screen details;
* implementation status;
* verification evidence.

Those belong to individual feature PRDs, implementation records, source code, tests, and evidence.

### 0.2 Authority precedence

When two artifacts conflict, apply the following precedence:

1. Repository-wide architectural decisions and package policies.
2. This domain architecture.
3. Approved individual feature PRDs.
4. Approved domain or feature decision records.
5. Implementation-slice plans.
6. Source code and tests.
7. Generated inventories and README summaries.
8. Historical evidence.

A lower-level artifact may implement or prove a higher-level requirement. It may not silently override it.

A contradiction with a higher authority blocks the affected implementation slice until:

* the lower-level artifact is corrected; or
* the higher-level authority is formally amended or superseded.

### 0.3 Repository binding

This template is generic in shape but bound to this repository's canonical vocabulary. Where a term below is given, use it verbatim — a synonym is a defect, not a style choice.

| Concept | Canonical term in this repository | Authority |
| --- | --- | --- |
| Package scope | `@afenda/corporate-administration` | root `package.json`, `AfendaModuleManifest.packageName` |
| Domain unit at runtime | **module** (`id`, `moduleId`) | `packages/data-plane/db/src/module-manifest-contract.ts` |
| Module manifest | `src/composition/module.manifest.ts` satisfying `AfendaModuleManifest` | same |
| Result type | `Result<Data, Code>` from `@afenda/errors`, discriminant `ok` | `packages/foundation/errors/src/public-types.ts` |
| Error identity | `CanonicalErrorCode` union | `packages/foundation/errors/src/contract/registry.ts` |
| Production persistence adapter | **Drizzle** — `<feature>.drizzle.ts` | `packages/erp/*/src/features/**/adapters/` |
| Schema and migration owner | `@afenda/db` | `AfendaModuleManifest.persistence.schemaOwner` (typed literal) |
| Tenant column | `organization_id` (SQL) · `organizationId` (Drizzle) | `packages/data-plane/db/src/schema/**` |
| Hard tenant root registry | `packages/data-plane/db/src/hard-tenant-roots.ts` | ARCH-023 |
| Dependency authorization | `docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml` | ARCH-024 |
| Schema write-ownership | `docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml` | — |
| Design system | `@afenda/ui-system` (sole UI import surface) | `CLAUDE.md` / `AGENTS.md` hard stops |
| Configuration | `@afenda/env` — never raw `process.env` for product config | same |

Two words are overloaded in this repository. Use the qualified form in this document:

* **kernel** — *module kernel* means `src/kernel/` inside one ERP package (this document's §8.2). It is unrelated to the *kernel package family* (`packages/{foundation,runtime,data-plane,control-plane}`, see `packages/KERNEL-SCAFFOLDING.md`) and to the `kernel-generator`.
* **domain** — used here for the business boundary. The runtime and manifest term for the same unit is **module**. Prefer *module* in code, identifiers, and manifests; *domain* only in business prose.

---

# 1. Executive architecture decision

## 1.1 Recommendation

Approve Corporate Administration as the organization-scoped system of record for:

1. corporate entity and establishment administration;
2. governance bodies, officers, meetings, resolutions, and authority instruments;
3. statutory filings, licences, permits, recurring obligations, and administrative assurance;
4. administrative agreements, service subscriptions, insurance, and legal instruments;
5. administrative assets, assignments, physical access resources, and verification;
6. premises, occupancy, facilities services, and premises-access projections;
7. controlled records, document registration, retention, disposal, and evidence packs.

The module provides governed records and operations required for an organization to remain legally constituted, properly governed, administratively operational, contractually aware, adequately insured, licensed, compliant, and audit-ready.

Corporate Administration must not become the owner of investor or shareholder information, securities or holdings, general-ledger accounting, fixed-asset valuation, procurement transactions, invoices, payments, employee records, payroll, technical identity configuration, production inventory, tax computation, litigation strategy, or generic file storage.

## 1.2 Architecture style

```yaml
architecture_style: feature-first-modular-monolith
semantic_owner: individual-feature
feature_group_role: classification-only
execution_policy_owner: module-kernel
composition_owner: module-composition-layer
consumer_entrypoint: package-root-facade
persistence_boundary: feature-owned-store-contract
relational_authority: "@afenda/db"
```

## 1.3 Permanent architecture statement

> Corporate Administration is the Administration Department’s organization-scoped system of record for entity administration, governance, compliance obligations, administrative agreements and subscriptions, administrative resource custody, premises administration, controlled corporate records, and the evidence supporting those facts over time.

## 1.4 Permanent ownership principle

> Feature groups organize the domain. Individual features own business meaning. The operation registry governs execution. The package facade protects consumers. Other modules own their financial, technical, personnel, operational, legal-advisory, and investor consequences.

# 2. Domain mission

## 2.1 Mission

Corporate Administration exists to ensure that:

* the organization’s legal identities and establishments are current and traceable;
* governance bodies, officers, meetings, resolutions, and delegated authority are administered consistently;
* statutory filings, licences, permits, renewals, and administrative obligations remain visible and controlled;
* administrative agreements, subscriptions, insurance, and legal instruments have accountable owners and complete chronology;
* administrative resources and access credentials have clear custody, assignment, return, loss, and verification records;
* premises, occupancy, services, and access relationships remain administratively controlled;
* controlled corporate records retain classification, evidence, retention, legal-hold, and disposal governance.

## 2.2 Business accountability

The primary accountable business function is:

```text
Administration Department
```

Supporting stakeholders include:

| Stakeholder | Relationship to domain |
| --- | --- |
| Board and company secretarial functions | Approve, review, and consume governance and statutory records |
| Legal and compliance functions | Advise, review, and consume governed references and evidence |
| Finance and Accounting | Consume references and events; own financial recognition and valuation |
| Purchasing, Payables, and Payments | Own procurement, invoices, and settlement while referencing CA agreements |
| Human Resources | Own employee and employment facts while providing governed person references |
| IT, Identity, and Security | Own technical provisioning, credentials, and security configuration |
| Internal Audit and Assurance | Review chronology, controls, exceptions, and evidence packs |
| Operational departments | Maintain accountable ownership for premises, resources, subscriptions, and obligations |

## 2.3 Business outcomes

| Outcome | Expected improvement |
| --- | --- |
| Record completeness | Required administrative records and evidence become measurable and assignable |
| Processing consistency | Common lifecycle, authorization, tenancy, and chronology rules replace ad-hoc records |
| Control effectiveness | Renewal, authority, custody, and evidence exceptions become visible before failure |
| Renewal or deadline visibility | Upcoming obligations have accountable owners, dates, and escalation posture |
| Audit readiness | Evidence packs and immutable chronology reduce manual reconstruction |
| Operational accountability | Every governed record has one semantic owner and one accountable business owner |

## 2.4 Domain success indicators

Domain-wide indicators include:

* percentage of active records with complete required evidence;
* percentage of upcoming obligations assigned to an accountable owner;
* overdue obligations by severity and age;
* records with unresolved ownership or invalid foreign references;
* expired licences, permits, subscriptions, policies, or instruments still marked active;
* exceptions remaining beyond approved service-level targets;
* failed or incomplete lifecycle transitions;
* rejected cross-tenant access attempts;
* adapter-parity, registry-parity, and architecture-gate status.

Individual feature KPIs belong in their approved feature PRDs.

# 3. Bounded-context definition

## 3.1 Domain boundary

The domain owns facts whose primary meaning is legal-entity administration, governance administration, administrative compliance, recurring obligations, administrative agreements, administrative resource custody, premises administration, controlled records, or administrative assurance.

The domain may reference foreign records where necessary, but it must not duplicate or reinterpret another module’s authoritative business meaning.

## 3.2 Ownership test

A record or operation belongs to Corporate Administration when most of the following are true:

1. The Administration Department or delegated corporate-administration function is accountable for maintaining it.
2. The record persists beyond a single purchase, invoice, payment, or workflow execution.
3. The record has a legal, governance, compliance, agreement, custody, premises, record-control, renewal, or evidence lifecycle.
4. Corporate Administration is accountable for its correctness and chronology.
5. Other modules can reference it without owning its meaning.
6. It requires administrative custody, assignment, approval, renewal, evidence, retention, or assurance.
7. Failure to maintain it is primarily an administration or governance failure.

A proposed capability that does not satisfy the ownership test must not be added merely because it is convenient.

## 3.3 Inclusion criteria

Corporate Administration may own:

* legal entities, establishments, and administrative group relationships;
* governance bodies, statutory officers, meetings, resolutions, and authority instruments;
* statutory-filing administration, licences, permits, recurring obligations, and assurance exceptions;
* administrative agreements, service subscriptions, insurance policies, and legal instruments;
* administrative asset identity, custody, assignment, condition, location, and physical verification;
* keys, badges, access cards, and other physical administrative access resources;
* premises identity, occupancy facts, facility-service arrangements, and premises-access projections;
* controlled-record classification, document registration, retention, legal hold, disposal, and evidence-pack membership;
* stable governed references to records owned by other modules.

## 3.4 Exclusion criteria

Corporate Administration must not own records whose primary purpose is:

* investor, shareholder, securities, holdings, or beneficial-ownership administration;
* general-ledger recognition, lease accounting, depreciation, impairment, capitalization, or financial disposal;
* requisition, purchase order, sourcing, supplier invoice, payment, or settlement execution;
* employee lifecycle, compensation, payroll, personnel files, or employment contracts;
* technical identity, single sign-on, application provisioning, device security, or secret management;
* production execution, stock quantity, maintenance execution, or manufacturing quality control;
* tax calculation or return preparation;
* legal advice, litigation strategy, or legal-case management;
* generic file storage, email archiving, or analytics-only projections.

## 3.5 Governed references

The domain may retain opaque identifiers, source module, reference type, permitted display-safe labels, relationship purpose, validation status, and explicitly governed snapshots.

The domain must not copy foreign lifecycle state as its own state, accounting values, technical credentials, another module’s approval decision, mutable foreign business rules, or sensitive data not required for the administrative purpose.

# 4. Domain terminology

## 4.1 Ubiquitous language

| Term | Canonical meaning | Forbidden or misleading alternatives |
| --- | --- | --- |
| Company | A legal organizational entity administered by the module | Tenant, account, customer |
| Establishment | A registered office, branch, representative office, or administratively registered operating presence | Site when legal registration is intended |
| Governance body | A board, committee, or formally constituted decision body | Team, department |
| Officer | A person holding a statutory or formally governed office | Employee when employment is the intended meaning |
| Authority instrument | A delegation, signing mandate, bank mandate, power of attorney, or approved monetary authority | Generic approval |
| Obligation | A dated administrative duty requiring ownership, evidence, completion, renewal, or escalation | Reminder, task |
| Administrative agreement | A governed service, support, facility, or administrative vendor agreement | Purchase order, invoice |
| Service subscription | A recurring administrative entitlement or service arrangement such as phone, internet, Zoom, SaaS, or utility service | Customer subscription, recurring invoice |
| Administrative asset | A resource whose administrative identity, custody, assignment, location, condition, or verification is governed here | Fixed asset when accounting valuation is intended |
| Access resource | A key, badge, access card, or physical administrative credential whose custody lifecycle is governed here | Technical credential, password, token |
| Controlled record | A corporate record governed by classification, version, approval, access, retention, hold, or disposal rules | File, attachment |
| Evidence pack | A governed collection of references proving a filing, renewal, review, governance event, or assurance outcome | Folder, archive |

## 4.2 Naming rules

* One business concept has one canonical name.
* Feature identifiers use kebab-case.
* Record names use singular nouns.
* Operation definitions live in `operation-registry.ts`.
* Commands and queries are named for business meaning and remain in the feature root.
* Events describe completed facts in past tense.
* Permission identifiers use the `corporate-administration` namespace.
* Database names follow `@afenda/db` naming policy and use `organization_id` for tenancy.
* UI language must not redefine backend terminology.

## 4.3 Terminology changes

Changing a canonical domain term requires an approved decision record, impact analysis, compatibility or migration plan, and explicit supersession of the former term.

# 5. Capability and feature model

## 5.1 Capability groups

A feature group is a classification and navigation boundary. It is not a runtime owner.

| Feature group | Purpose |
| --- | --- |
| `entity-administration` | Legal identity, establishments, and administrative group relationships |
| `governance-administration` | Governance bodies, officers, meetings, resolutions, and authority instruments |
| `compliance-administration` | Filings, licences, permits, obligations, renewals, exceptions, and assurance |
| `agreement-administration` | Administrative agreements, service subscriptions, insurance, and legal instruments |
| `resource-administration` | Administrative assets, assignments, access resources, and physical verification |
| `premises-administration` | Premises, occupancy, facility services, and premises-access projections |
| `records-administration` | Controlled records, document registration, retention, disposal, and evidence packs |

## 5.2 Feature inventory

| Feature group | Feature | Semantic responsibility | Lifecycle status |
| --- | --- | --- | --- |
| `entity-administration` | `company` | Legal identity, jurisdiction, names, identifiers, activities, lifecycle, and chronology | planned |
| `entity-administration` | `establishments` | Registered offices, branches, representative offices, registrations, and status history | existing; status requires evidence |
| `entity-administration` | `group-structure` | Parent, subsidiary, controlled-entity, and administrative legal relationships | planned |
| `governance-administration` | `governance-bodies` | Boards, committees, constitution, membership structure, and body lifecycle | existing; status requires evidence |
| `governance-administration` | `officers` | Statutory offices, appointments, declarations, eligibility, conflicts, and disqualifications | existing; status requires evidence |
| `governance-administration` | `meetings` | Notice, agenda, attendance, quorum, adjournment, and closure | existing; status requires evidence |
| `governance-administration` | `resolutions` | Voting, written decisions, adoption, rejection, supersession, and implementation references | existing; status requires evidence |
| `governance-administration` | `authority` | Delegations, signing mandates, bank mandates, powers of attorney, and limits | existing; status requires evidence |
| `compliance-administration` | `obligations-calendar` | Shared deadline, notice-period, renewal-window, ownership, and escalation engine | planned |
| `compliance-administration` | `statutory-filings` | Filing requirements, preparation, submission, acknowledgement, and evidence | planned |
| `compliance-administration` | `licences-permits` | Licences, permits, registrations, certificates, conditions, and renewals | planned |
| `compliance-administration` | `compliance-assurance` | Administrative reviews, exceptions, remediation, and evidence completeness | planned |
| `agreement-administration` | `administrative-agreements` | Administrative vendor, service, support, and facility agreements | planned |
| `agreement-administration` | `service-subscriptions` | Phone, internet, Zoom, SaaS, utilities, recurring service entitlement, assignment, renewal, and termination | planned |
| `agreement-administration` | `insurance` | Policies, coverage periods, insured subjects, renewal, and claims references | planned |
| `agreement-administration` | `legal-instruments` | Deeds, guarantees, declarations, undertakings, and formal instruments | planned |
| `resource-administration` | `administrative-assets` | Administrative identity, custody, location, condition, transfer, loss, and retirement from use | planned |
| `resource-administration` | `resource-assignments` | Allocation and return of devices, lines, equipment, and administrative resources | planned |
| `resource-administration` | `access-resources` | Sole ownership of key, badge, access-card issue, custody, return, loss, and revocation | planned |
| `resource-administration` | `physical-verification` | Counts, confirmations, discrepancies, missing resources, and evidence | planned |
| `premises-administration` | `premises` | Administrative premises identity and responsible company | planned |
| `premises-administration` | `occupancy` | Lease or occupancy period, usable areas, and administrative occupancy facts | planned |
| `premises-administration` | `facility-services` | Cleaning, security, internet, utilities, waste, and maintenance-service arrangements | planned |
| `premises-administration` | `premises-access` | Premises-level access grants referencing access resources; no credential lifecycle ownership | planned |
| `records-administration` | `controlled-records` | Controlled versions, classification, approval state, access policy, and supersession | planned |
| `records-administration` | `document-register` | Registered corporate documents and governed file references | planned |
| `records-administration` | `retention-disposal` | Retention rules, legal holds, review, and approved disposal | planned |
| `records-administration` | `evidence-packs` | Compiled evidence for audits, filings, renewals, and governance events | planned |

The multidimensional status model and manifest-lifecycle rules below remain authoritative. Existing source files are evidence to inspect, not proof that a feature is verified, activated, or enterprise-ready.

## 5.3 Feature ownership rule

Each individual feature owns its terminology, public business contracts, schemas, business rules, lifecycle, operations, errors, events, store contract, required ports, adapters, and tests.

Feature groups own only identity, label, membership projection, documentation classification, navigation classification, and completeness validation.

## 5.4 Feature eligibility rule

A planned feature is eligible only when ownership, exclusions, dependencies, approved feature PRD, exact manifests, blocking decisions, and preceding gates are complete. Empty directories and placeholder files are prohibited.

# 6. Ownership matrix

## 6.1 Domain ownership

| Business fact or action | Corporate Administration | External owner | Relationship |
| --- | ---: | --- | --- |
| Legal company identity and establishment chronology | Owns | — | Authoritative |
| Governance body, officer appointment, meeting, resolution, and authority instrument | Owns | — | Authoritative |
| Entity-bound statutory obligation and renewal administration | Owns | — | Authoritative |
| Person-bound officer declaration, conflict, eligibility, or disqualification | Owns in `officers` | — | Authoritative |
| Administrative agreement, entitlement, notice period, and renewal decision | Owns | — | Authoritative |
| Phone, internet, Zoom, SaaS, or utility subscription and business assignment | Owns | — | Authoritative administrative lifecycle |
| Purchase requisition and purchase order | References | Purchasing | Opaque governed reference |
| Supplier invoice | References | Payables | Opaque governed reference |
| Payment and settlement | References | Payments | Opaque governed reference |
| Expense, prepayment, lease accounting, depreciation, or impairment | Excluded | Accounting / Asset Accounting | No mutation or duplication |
| Employee and employment record | References | Human Resources | Opaque governed person reference |
| Technical account, SSO, provisioning, device configuration, or secret | Excluded | IT / Identity / Security | Event or request reference only |
| Investor, shareholder, holding, or beneficial-owner information | Excluded | Investor Relations | No storage |
| Binary document content | References | Document platform | Opaque file reference and governed metadata |
| Key, badge, or access-card lifecycle | Owns in `access-resources` | — | Sole authoritative owner |
| Premises access grant | Owns in `premises-access` | — | References credential owned by `access-resources` |
| Administrative asset custody, assignment, condition, and verification | Owns | — | Authoritative administrative lifecycle |
| Capitalized value, depreciation, impairment, or financial disposal | Excluded | Asset Accounting | No mutation or duplication |

## 6.2 Cross-domain boundaries

| External domain | Owns | Corporate Administration may | Corporate Administration must not |
| --- | --- | --- | --- |
| Accounting | Recognition, balances, prepayments, leases, depreciation, impairment, disposal | Emit facts and reference entries | Post ledgers or calculate balances |
| Purchasing | Requisitions, sourcing, purchase orders, commitments | Reference procurement records and emit agreement facts | Create or mutate purchase orders |
| Payables and Payments | Supplier invoices and settlement | Reference invoice and payment outcomes | Own invoice or settlement lifecycle |
| Human Resources | Employee and employment lifecycle | Reference trusted person or employment identifiers | Duplicate personnel records or employment terms |
| IT, Identity, and Security | Technical accounts, SSO, provisioning, secrets, device security | Emit provisioning/deprovisioning facts or store opaque references | Store credentials, tokens, or security configuration |
| Investor Relations | Investors, shareholders, securities, holdings, and beneficial ownership | Reference an approved legal entity where necessary | Store investor or holding information |
| Inventory and Operations | Stock quantity, production assets, maintenance execution, and operational use | Reference an approved operational resource | Own stock or production lifecycle |
| Document platform | Binary files, storage, preview, and retrieval | Store governed file references, classifications, and evidence requirements | Become generic file storage |
| Platform Approvals | Approval execution and verification | Declare approval policy and retain approval reference | Create a parallel approval workflow |

## 6.3 Resolved ownership conflicts

1. `resource-administration/access-resources` is the sole owner of key, badge, and access-card issue, custody, return, loss, and revocation. `premises-administration/premises-access` owns only premises-level access grants and projections referencing those credentials.
2. `governance-administration/officers` owns person-bound declarations, conflicts, eligibility, and disqualifications. `compliance-administration` owns entity-bound obligations and may reference an officer without copying officer compliance state.
3. `compliance-administration/obligations-calendar` is the shared renewal, deadline, notice-period, ownership, and escalation engine. Features register obligations into it rather than implementing divergent schedulers.
4. `agreement-administration/service-subscriptions` owns the administrative entitlement and assignment lifecycle; Purchasing, Payables, Payments, Accounting, and IT own their respective transactional, financial, and technical consequences.
5. `resource-administration/administrative-assets` owns custody and physical administration; Asset Accounting owns capitalization, valuation, depreciation, impairment, and financial disposal.

## 6.4 Conflict-resolution rule

When ownership is disputed, identify accountability for correctness, the lifecycle that gives the fact meaning, and the module that can expose it without copying another lifecycle. Assign exactly one semantic owner and define references, events, or projections for all others. Shared ownership of mutable business meaning is prohibited.

# 7. Permanent source architecture

## 7.1 Package structure

Specifications live outside the package; production source lives inside it.

```text
docs/erp/corporate-administration/
├── corporate-administration-architecture.md
├── corporate-administration-prd.md              # optional portfolio/product summary; not a feature PRD
├── decisions/
├── feature-specs/
│   └── <feature-group>/
│       └── <feature>/
│           ├── PRD.md
│           ├── IMPLEMENTATION-SLICES.md
│           ├── DECISIONS.md
│           └── evidence/
└── runbooks/

packages/erp/corporate-administration/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── facade/
│   ├── kernel/
│   ├── composition/
│   │   └── module.manifest.ts
│   ├── features/
│   │   ├── entity-administration/
│   │   ├── governance-administration/
│   │   ├── compliance-administration/
│   │   ├── agreement-administration/
│   │   ├── resource-administration/
│   │   ├── premises-administration/
│   │   └── records-administration/
│   └── testing/
├── __tests__/
└── scripts/                                      # module-specific projections only
```

Notes:

* The `__tests__/` subdirectories are concern labels, not mandatory directories. Create one when it holds a real suite.
* **Do not add local layout, ownership, or deep-import checkers under `scripts/`.** Layout and structural governance are owned by the ERP generator (`turbo/generators/erp-generator/`); a local `feature-first-layout.mjs` is reported as superseded (`AFG-ERP-103`). Run `pnpm gen:doctor:erp` instead. `scripts/` is for projections the shared generator does not already own.
* Feature PRDs must not live inside production source directories.
* `docs-V2/` remains the scratch-ops surface. Placing specifications under `docs/erp/corporate-administration/` matches current practice (`docs/erp/corporate-administration/`).

## 7.2 Permanent feature rule

```text
src/features/<feature-group>/<feature>/<files>
```

The four levels are:

1. `features`;
2. feature group;
3. individual feature;
4. semantic files and directories owned by that feature.

## 7.3 Standard feature capsule

```text
<feature>/
├── index.ts                  # private projection when composition needs it
├── operation-registry.ts     # canonical operation definitions — present in every feature
├── run-operation.ts          # feature execution entrypoint, where the kernel protocol is used
├── schema.ts                 # ingress validation derived from owned contracts
├── policy.ts                 # authorization / privacy / workflow policy
├── guards.ts                 # invariant enforcement
├── store-contract.ts         # smallest persistence capability
├── <business-noun>.ts        # domain model and use cases, named for the business term
│
├── adapters/
│   ├── <feature>.memory.ts   # semantic-parity adapter
│   └── <feature>.drizzle.ts  # production persistence adapter
│
└── __tests__/
```

This is a default shape, not a requirement to create empty files.

Naming is bound to what the repository actually ships — verify against `packages/erp/human-resources/src/features/leave/` (the exemplar) before inventing a name:

* **`operation-registry.ts`** is the canonical per-feature operation owner. `definition.ts` is not used anywhere in `packages/erp/**`.
* The production adapter is **`drizzle`**, never `relational`. Both flat (`<feature>.drizzle.ts`) and nested (`adapters/<feature>.drizzle.ts`) forms exist; pick one per package and stay consistent.
* **Do not create `commands/` or `queries/` directories.** No ERP package has them. They are the generic layer farm that `packages/erp/ERP-SCAFFOLDING.md` §12 rejects — commands and queries are named for their business meaning and live in the feature root.
* `ports.ts` is normally a *kernel* or *composition* surface (`src/kernel/contracts/ports.ts`); add a feature-level `ports.ts` only for a genuinely feature-owned external capability.
* Accounting uses `<feature>.store.ts` where Human Resources uses `store-contract.ts`. Prefer `store-contract.ts` for new work; the contract, not the filename, is what matters.

Rules:

* omit files with no semantic content;
* group small operations when that improves readability;
* split complex operations into dedicated files;
* do not create placeholder directories;
* do not introduce feature-specific infrastructure already provided by the module kernel;
* do not place feature PRDs inside production source directories.

---

# 8. Layer responsibilities

## 8.1 Feature layer

The feature layer owns business meaning.

It may depend on:

* approved foundation contracts;
* domain kernel types intentionally exposed to features;
* its own contracts and ports;
* representation-safe shared primitives.

It must not depend on:

* facade;
* composition;
* testing utilities in production code;
* sibling concrete adapters;
* application code;
* transport frameworks;
* database implementation details in public contracts.

## 8.2 Kernel layer

The domain kernel owns reusable execution mechanics that apply consistently across features.

Typical responsibilities:

```text
kernel/
├── authorization/
├── execution/
├── operations/
├── emissions/
├── tenancy/
├── privacy/
├── validation/
└── internal/
```

The kernel may own:

* operation-definition contracts;
* operation registry;
* authorization enforcement;
* approval verification policy;
* transaction policy;
* idempotency protocol;
* audit protocol;
* outbox protocol;
* trusted execution context;
* input parsing;
* error translation;
* projection rules.

The kernel must not own:

* feature-specific statuses;
* feature-specific business rules;
* feature-specific field schemas;
* feature-specific records;
* feature-specific decisions disguised as generic infrastructure.

## 8.3 Composition layer

The composition layer owns runtime assembly.

It may:

* bind feature ports to providers;
* construct memory and relational runtimes;
* compose feature operation definitions;
* provide a shared opaque unit of work;
* wire authorization, audit, outbox, and dependency implementations;
* validate the completed operation registry.

It must not:

* redefine feature business rules;
* become a package-wide domain service;
* expose raw stores to consumers;
* bypass feature contracts;
* mutate another domain’s tables.

## 8.4 Facade layer

The facade is the stable package business API.

It exposes:

* explicit command and query capabilities;
* representation-safe contracts;
* opaque execution context;
* stable runtime interfaces;
* approved schemas needed at trusted ingress;
* canonical result outcomes.

It must not expose:

* stores;
* SQL or Drizzle types;
* database handles;
* transactions;
* concrete adapters;
* raw dependency ports;
* internal event envelopes;
* registry implementation details;
* composite mutable context objects.

## 8.5 Testing layer

The testing layer may provide:

* builders;
* fixtures;
* memory runtime;
* parity harness;
* hostile-input scenarios;
* contract-test suites;
* fault-injection helpers.

Production feature code must not import the testing layer.

---

# 9. Dependency rules

## 9.1 Permitted direction

```text
consumer
  → package root
    → facade
      → composition
        → feature
          → feature contracts
          → feature store contracts
          → feature ports
```

At runtime:

```text
composition
  → binds feature store contract to adapter
  → binds required port to provider
  → supplies kernel execution services
```

## 9.2 Prohibited dependencies

A feature must not import:

* the package facade;
* composition;
* another feature’s concrete adapter;
* another feature’s internal handler;
* a package-wide composite store;
* an application route or controller;
* a peer ERP package not approved as a dependency;
* transport response types;
* raw Drizzle or SQL types in its public API.

## 9.3 Cross-feature coordination

Cross-feature coordination must use one of:

1. a narrow capability port;
2. a committed domain event;
3. domain composition using an opaque shared unit of work;
4. an application-owned saga where multiple packages participate.

The architecture must not rely on:

* direct writes to another feature’s tables;
* imports from sibling adapter implementations;
* duplicated records;
* hidden calls between handlers;
* shared mutable singleton state.

## 9.4 Cross-domain coordination

Effects crossing package boundaries should normally use:

* committed domain events;
* application orchestration;
* approved read-only capability ports;
* explicit application sagas.

A domain package must not directly mutate another package’s persistence.

---

# 10. Operation architecture

## 10.1 Canonical ownership

The canonical chain is:

```text
Approved feature PRD
    ↓ specifies
Feature-owned operation definitions
    ↓ composed into
Domain operation registry
    ↓ projected into
Facade, authorization, audit, events, documentation, and checks
```

## 10.2 Feature operation definitions

Each feature defines its operations in:

```text
src/features/approved feature group/<feature>/operation-registry.ts
```

or an equivalent set of operation files. `operation-registry.ts` is the name used by every shipped ERP feature; prefer it over `operations.ts` or `definition.ts`.

Each operation declares:

* operation identifier;
* feature owner;
* command or query kind;
* input and output contracts;
* permission;
* approval policy;
* transaction policy;
* idempotency policy;
* audit policy;
* emission policy;
* retry classification where relevant.

## 10.3 Domain operation registry

The domain registry:

* composes feature-owned definitions;
* rejects duplicate identifiers;
* verifies every operation has an owning feature;
* verifies every public facade operation is registered;
* verifies every registered operation is implemented;
* derives policy projections;
* exposes an immutable validated registry.

The central registry must not manually duplicate feature definitions.

### 10.3.1 Module manifest projection

`src/composition/module.manifest.ts` is the registry's governed projection and the only module surface the platform reads. It satisfies `AfendaModuleManifest` and is validated by `pnpm validate:modules`.

Fields the domain must fill honestly:

| Field | Content |
| --- | --- |
| `id` · `packageName` · `category` | module identity; `packageName` is `` `@afenda/${string}` `` |
| `band` | `R1-F` (the only accepted value today) |
| `lifecycle` | `scaffolded` until verified — see §5.2 |
| `activationMode` | `core` or `organization_toggle` |
| `owns` | `aggregates`, `commandNamespace`, `commands`, `queryNamespace`, `queries` |
| `persistence` | `schemaOwner: "@afenda/db"` plus the exact `mutationTables` this module writes |
| `events` | `namespace`, `emits`, `consumes` |
| `permissions` | `namespace` and `codes` |
| `authorization` | command and query permission maps |
| `moduleDependencies.required` | must match `package.json` and the workspace-edge register |
| `optionalIntegratesWith` | `{ moduleId, style }` where style is `events`, `ports`, or `app-saga` — the executable form of §9.4 |

`commands`, `queries`, `emits`, `codes`, and the authorization maps are spread from the feature-owned registries. They are never retyped as literals in the manifest.

## 10.4 Transaction policy

Every state-mutating operation declares its transaction policy.

Feature-owned state mutations must atomically commit:

* state changes;
* required audit records;
* required outbox records;
* package-local effects explicitly declared atomic.

A non-transactional command requires an explicit rationale and must not partially mutate feature-owned state.

## 10.5 Idempotency

Every retryable mutation defines:

* idempotency-key source;
* scope;
* fingerprint inputs;
* result replay behavior;
* conflict behavior when a key is reused with different inputs;
* retention period;
* event and audit replay rules.

An idempotent replay returns the original observable outcome and must not:

* repeat the state mutation;
* emit a duplicate event;
* create duplicate audit evidence;
* bypass authorization or tenancy checks.

---

# 11. Outcome and error architecture

## 11.1 Result contract

Public feature operations return the canonical typed result from `@afenda/errors`:

```ts
import type { Result } from "@afenda/errors";

Promise<Result<JournalLine, "NOT_FOUND" | "VALIDATION_ERROR">>
```

The shape (`packages/foundation/errors/src/public-types.ts`):

```ts
type ResultSuccess<Data> = Readonly<{ data: Data; ok: true }>;
type Result<Data, Code extends CanonicalErrorCode = CanonicalErrorCode> =
	ResultSuccess<Data> | ResultFailure<Code>;
```

Binding rules:

* The discriminant is **`ok`**. `{ success, data }` is prohibited repository-wide.
* The success payload field is **`data`**.
* The second type parameter is a **`CanonicalErrorCode`** union, not an error class. There is **no `DomainError` type** — do not introduce one.
* Failure is flattened, not wrapped: a failure carries `code`, `message`, `messageKey`, and optional `details` alongside `ok: false`. There is no `result.error` object.
* Narrow the `Code` parameter to the codes an operation can actually produce. Leaving it at the default widens every consumer's exhaustiveness check to the whole registry.
* Construct results with the `errorResult` capability (`{ ok, fail }`), not object literals.
* Expected business outcomes must not escape as unclassified thrown errors.

Server Actions in `apps/web` alias this same type as `ActionResult`; it is an import alias, not a separate contract:

```ts
import { type Result as ActionResult, errorResult } from "@afenda/errors";
```

## 11.2 Domain error vocabulary

The domain reasons in business terms, but every business outcome must resolve to one canonical code. Domains do **not** define their own error taxonomy.

The canonical codes are fixed in `packages/foundation/errors/src/contract/registry.ts`:

```text
BAD_REQUEST · UNAUTHORIZED · FORBIDDEN · NOT_FOUND · CONFLICT
CONCURRENCY_CONFLICT · VALIDATION_ERROR · RATE_LIMITED
INTERNAL_ERROR · SERVICE_UNAVAILABLE
```

Map each domain outcome to a code, and record the mapping here:

| Domain outcome | Canonical code | Notes |
| --- | --- | --- |
| Input or business-rule rejection | `VALIDATION_ERROR` | `BAD_REQUEST` only for malformed requests, not failed rules |
| Record unavailable in the permitted scope | `NOT_FOUND` | also the tenancy-safe absence outcome — see §11.3 |
| Actor lacks permission | `FORBIDDEN` | `UNAUTHORIZED` means unauthenticated, not unauthorized |
| Required approval missing or unavailable | `SERVICE_UNAVAILABLE` | genuinely ambiguous — record the choice as a decision, do not vary it per feature |
| Lifecycle movement not permitted | `CONFLICT` | the record exists; its current state forbids the move |
| Version, uniqueness, or concurrent-change conflict | `CONFLICT` / `CONCURRENCY_CONFLICT` | reserve `CONCURRENCY_CONFLICT` for optimistic-concurrency loss |
| Required external capability unavailable | `SERVICE_UNAVAILABLE` | pairs with the fail-closed posture in §14.3 |
| A protected domain invariant would be violated | `CONFLICT` | `INTERNAL_ERROR` only when the state should have been unreachable |

Adding a canonical code is a change to `@afenda/errors`, not a domain decision.

The internal `ErrorCategory` enum (`authentication`, `authorization`, `availability`, `concurrency`, `internal`, `request`, `resource`) classifies codes inside the errors contract layer. It is **not exported** from the package root — domain code must not import or reproduce it.

HTTP, RPC, queue, or UI mappings belong to consuming adapters and are projected by `errorWire` / `errorOpenApi`.

## 11.3 Tenancy-safe absence

Cross-tenant record access returns the domain’s non-disclosing absence outcome unless an explicit cross-organization policy grants access.

The system must not reveal that a record exists in another tenant.

---

# 12. Persistence architecture

## 12.1 Semantic versus relational ownership

The feature owns:

* record meaning;
* lifecycle;
* store contract;
* persistence invariants;
* query semantics;
* required uniqueness;
* required indexes as business/query requirements.

The relational authority owns:

* Drizzle schema declarations;
* database-specific types;
* migration files;
* database constraints;
* physical indexes;
* migration execution tooling.

In this repository the authority is fixed, not per-domain — `AfendaModuleManifest.persistence.schemaOwner` is the typed literal `"@afenda/db"`:

```yaml
relational_schema_authority: "@afenda/db"     # packages/data-plane/db/src/schema/**
migration_authority: "@afenda/db"
schema_write_ownership_register: docs-V2/modules/SCHEMA-OWNERSHIP-MANIFEST.yaml
migration_execution_owner: Database Operations under approved migration authority
```

The module is the sole business mutator of the tables registered to it in the schema-ownership register. It does not host DDL.

## 12.2 Store contracts

Feature store contracts must be:

* persistence-agnostic;
* tenant-aware;
* explicit about ordering;
* explicit about concurrency;
* explicit about not-found behavior;
* explicit about pagination;
* free from public SQL or Drizzle types.

## 12.3 Adapter policy

Each persistent feature should normally provide:

1. a deterministic memory adapter — `<feature>.memory.ts`;
2. a production Drizzle adapter — `<feature>.drizzle.ts`.

The same behavioral suite must run against both.

A feature adapter implements its own feature store contract. It never names, accepts, constructs, or imports the composite package store.

## 12.4 Memory-first rule

Implementation order:

```text
approved PRD
→ contracts and schemas
→ policy and lifecycle tests
→ store contract
→ memory adapter
→ operations and contract tests
→ Drizzle schema and migration
→ Drizzle adapter
→ parity verification
```

SQL is not where business behavior is discovered.

## 12.5 Adapter parity

Parity requires identical observable behavior for:

* successful results;
* error codes;
* tenancy isolation;
* uniqueness;
* sorting;
* pagination boundaries;
* state transitions;
* optimistic concurrency;
* idempotent replay;
* emitted facts;
* chronology.

A parity failure blocks feature closure.

## 12.6 Migration policy

Migrations must follow repository rules and include:

* forward path;
* rollback or explicit irreversibility;
* expand–backfill–contract ordering where applicable;
* existing-row strategy;
* row-count expectations;
* constraint sequencing;
* verification procedure;
* restored-snapshot evidence where required.

No feature PRD may invent migration paths inconsistent with the repository’s relational authority.

The canonical migration path is fixed and gated:

```bash
pnpm db:generate
pnpm db:check
AFENDA_ALLOW_DB_MIGRATE=1 pnpm --filter @afenda/db db:migrate
```

`db:push` and `db:pull` are prohibited. A domain architecture must not describe an alternative apply path.

---

# 13. Tenancy architecture

## 13.1 Trusted organization identity

Organization identity must come from server-trusted execution context.

Client-supplied organization identity must not be accepted as authority.

## 13.2 Store-level enforcement

Organization scope must be enforced at the store or persistence boundary, not merely in handlers or UI filters.

The tenant column is `organization_id` in SQL and `organizationId` in Drizzle. Every hard tenant root declares it `NOT NULL` and is registered in `packages/data-plane/db/src/hard-tenant-roots.ts` (authority: ARCH-023). Registration is not optional — `pnpm audit:tenancy-nulls` asserts zero null `organization_id` values across registered roots.

Related gates: `pnpm check:tenancy-residue`, `pnpm check:tenant-sql-safety`.

## 13.3 Relationship lineage

Relationships between records must satisfy approved tenant-lineage rules.

At minimum:

* records related within the domain belong to the same organization unless explicitly approved otherwise;
* foreign references are checked for permitted organization relationship;
* cross-organization access is explicit, logged, and reviewable;
* tenant scope leads relevant query and index design.

## 13.4 Required tests

Every feature must test:

* same-organization success;
* cross-organization read rejection;
* cross-organization mutation rejection;
* spoofed organization input;
* absent trusted organization context;
* organization-scoped uniqueness;
* organization-scoped pagination.

---

# 14. Authorization and approval architecture

## 14.1 Permission model

Permissions are:

* defined using canonical identifiers;
* assigned to feature operations;
* enforced at the operation boundary;
* projected to the UI only as a convenience;
* never trusted solely because an action is hidden in the frontend.

## 14.2 Approval separation

The domain distinguishes:

* authority facts owned by a business feature;
* approval execution owned by the platform approval capability;
* operation authorization owned by the domain execution boundary.

A feature must not create an informal approval mechanism when the platform approval service is authoritative.

## 14.3 Failure posture

Security-sensitive dependencies fail closed.

Examples:

* unavailable authorization provider: deny;
* unavailable approval verifier: do not perform the protected mutation;
* missing tenant context: reject;
* unverifiable authority: reject or return the declared approval outcome.

## 14.4 Auditability

Authorization and approval decisions should record, where permitted:

* operation identifier;
* actor identifier;
* organization identifier;
* decision outcome;
* approval reference;
* decision timestamp;
* policy version or relevant authority reference.

Sensitive tokens or payload bodies must not be logged.

---

# 15. Privacy, retention, and records architecture

## 15.1 Privacy classification

Each feature PRD classifies its fields as:

* public;
* internal;
* restricted;
* regulated.

The architecture must define:

* default classification;
* permitted projections;
* event exclusions;
* export rules;
* log-redaction rules;
* cross-domain disclosure requirements.

## 15.2 Secrets prohibition

The domain must not store:

* passwords;
* API keys;
* private tokens;
* cryptographic secrets;
* session credentials;
* technical authentication material.

Where required, store only a platform-owned secret handle.

## 15.3 Retention

Each feature PRD defines:

* retention period;
* archival requirements;
* legal-hold interaction;
* disposal conditions;
* disposal authority;
* chronology preservation;
* fields that must be redacted rather than deleted.

## 15.4 Evidence versus files

A file-storage platform owns binary file storage.

The domain may own:

* record classification;
* evidence requirement;
* file reference;
* version relationship;
* approval state;
* retention rule;
* legal hold;
* evidence-pack membership.

The domain must not become a generic document repository.

---

# 16. Event architecture

## 16.1 Event ownership

A feature emits facts about its own completed state changes.

Events must:

* use past-tense fact names;
* identify their owning feature;
* carry representation-safe payloads;
* exclude secrets;
* avoid internal store or Drizzle row shapes;
* be additively versioned;
* use the domain outbox where delivery is required.

## 16.2 Event intent

Events inform consumers. They do not command another domain to violate its ownership boundary.

Example:

```text
SubscriptionTerminationInitiated
```

may inform IT, Purchasing, or Accounting.

It must not directly mutate their records.

## 16.3 Ordering and deduplication

Each feature PRD defines:

* aggregate or stream identifier;
* ordering requirement;
* event identifier;
* schema version;
* deduplication expectation;
* replay behavior;
* consumer compatibility posture.

## 16.4 Atomicity

Where an event represents a committed domain mutation, the state change and outbox record commit atomically.

---

# 17. Public facade architecture

## 17.1 Consumer rule

Production consumers import from:

```text
@afenda/corporate-administration
```

Deep imports are prohibited unless an explicit supported subpath is approved and declared in `package.json` `exports`.

`src/index.ts` begins with `import "server-only";` — all twelve shipped ERP packages do this, and it is what keeps a Node-only module out of a client bundle.

## 17.2 Permitted exports

The package root may expose:

* stable runtime construction;
* explicit feature commands and queries;
* approved public contracts;
* canonical result and error types;
* opaque execution context;
* ingress-safe schemas where justified;
* feature availability or capability projections.

## 17.3 Prohibited exports

The package root must not expose:

* internal stores;
* concrete adapters;
* Drizzle or SQL constructors and database schema types;
* transactions;
* raw ports;
* internal event envelopes;
* private registry structures;
* internal feature handlers;
* mutable global runtime objects.

## 17.4 Facade evolution

Facade changes require:

* an approved feature PRD;
* consumer impact assessment;
* compatibility decision;
* consumer-contract tests;
* release-note or migration guidance when breaking.

---

# 18. Frontend architecture boundary

## 18.1 Backend and frontend separation

The domain architecture defines frontend integration contracts and navigation rules, but individual feature PRDs define screens and interactions.

Backend implementation and frontend implementation must have separate:

* file manifests;
* delivery statuses;
* test gates;
* ownership;
* activation decisions.

A backend feature may be verified while its frontend remains planned, provided status reporting says so explicitly.

## 18.2 Navigation

Navigation should be projected from activated feature definitions.

A planned or merely scaffolded feature must not appear as a live empty screen.

## 18.3 Standard feature states

Individual frontend feature PRDs must address:

* loading;
* empty before any data;
* empty filtered result;
* partial data;
* retryable error;
* terminal error;
* permission denial;
* stale or concurrent conflict;
* optimistic pending;
* unavailable or inactive capability where applicable.

## 18.4 Design-system rule

Applications import UI exclusively from `@afenda/ui-system`:

```ts
import { … } from "@afenda/ui-system";
```

This is a repository hard stop, not a preference. A domain feature must not create an ungoverned parallel component system, and must not reach into `@afenda/ui-blocks` or a design-token package directly.

Configuration follows the same rule: read `import { env } from "@afenda/env"`, never raw `process.env` for product config.

---

# 19. Observability architecture

## 19.1 Structured logs

Domain operation logs may include:

* operation identifier;
* feature identifier;
* organization identifier;
* actor identifier;
* outcome code;
* duration;
* correlation identifier;
* dependency status.

They must not include:

* credentials;
* full payload bodies;
* unrestricted personal data;
* binary evidence;
* sensitive document contents.

## 19.2 Metrics

Domain-wide metrics may include:

* command and query rate;
* outcomes by error category;
* p50, p95, and p99 latency;
* approval-wait duration;
* idempotent replay count;
* conflict rate;
* dependency failure rate;
* outbox backlog;
* audit-to-mutation parity;
* tenant-boundary rejection rate.

## 19.3 Tracing

Where supported, traces should cover:

```text
facade
→ execution boundary
→ authorization and approval
→ feature operation
→ store
→ required capability port
→ audit and outbox
```

## 19.4 Alert ownership

For each operational alert, define:

* threshold;
* severity;
* accountable team;
* escalation path;
* runbook;
* suppression or maintenance policy.

---

# 20. Domain-wide quality gates

## 20.1 Architecture gates

The package should permanently verify:

* valid feature layout;
* declared feature ownership;
* valid feature-group membership;
* operation-registry parity;
* facade-to-registry parity;
* projection parity;
* forbidden deep imports;
* prohibited dependency direction;
* empty-file and placeholder prohibition;
* package-root export stability.

Most of this is already executable. Use the shared gates rather than writing per-package equivalents:

```bash
pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test

pnpm gen:doctor:erp          # layout, manifest, and projection authority
pnpm validate:modules        # module manifest conformance
pnpm governance:packages     # package governance
pnpm audit:tenancy-nulls     # when tenant roots change
pnpm checks                  # local aggregate gate
```

A grep or source-pattern test is a guard, not behavior proof.

## 20.2 Behavioral gates

Each feature must verify:

* every operation;
* every documented outcome;
* every state transition;
* every rejected transition;
* every numbered business rule;
* tenancy isolation;
* authorization denial;
* approval failure posture;
* idempotency;
* concurrency;
* audit and outbox atomicity;
* adapter parity;
* hostile input;
* excluded-field assertions.

## 20.3 Database gates

Database closure requires:

* approved schema location;
* migration review;
* migration apply evidence;
* rollback or recovery evidence;
* constraints and indexes verified;
* row-count expectations checked;
* parity suite against the Drizzle adapter.

## 20.4 Consumer gates

Facade closure requires:

* public contract review;
* no internal type leakage;
* consumer-contract tests;
* compatibility assessment;
* deep-import check;
* documentation regeneration.

---

# 21. Feature PRD contract

## 21.1 Required location

```text
docs/erp/corporate-administration/feature-specs/<feature-group>/<feature>/PRD.md
```

Feature PRDs live in the specification tree, never inside `packages/erp/corporate-administration/src/**`. Use the companion template `docs/template/feature-PRD.md`.

## 21.2 Required feature PRD content

Each feature PRD must define:

1. feature identity;
2. problem and user jobs;
3. semantic ownership;
4. scope and exclusions;
5. users and permissions;
6. records and value objects;
7. lifecycle and transitions;
8. operations;
9. numbered business rules;
10. invariants;
11. errors and outcomes;
12. persistence requirements;
13. events and integrations;
14. tenancy and privacy;
15. frontend behavior;
16. observability;
17. testing and acceptance;
18. exact write manifests;
19. implementation slices;
20. Definition of Done;
21. open questions and decisions.

## 21.3 Feature PRD approval test

A feature PRD is ready for implementation only when:

* no blocking section contains `TBD`;
* operation names are final;
* business rules are numbered;
* exclusions can become negative tests;
* lifecycle transitions are explicit;
* required ports have identified providers;
* persistence authority is known;
* file manifests are exhaustive;
* tests can be derived from the document;
* open questions identify whether and what they block.

## 21.4 Prohibition against architecture reinvention

An individual feature PRD must not redefine:

* the package directory model;
* package facade rules;
* kernel responsibilities;
* operation-registry architecture;
* tenancy source;
* adapter-parity policy;
* public error architecture;
* database authority;
* cross-domain dependency direction.

A required exception must be proposed as a domain architecture decision first.

---

# 22. Delivery strategy

## 22.1 Greenfield assumption

Unless current-state evidence is explicitly attached and verified, planning must assume:

* no feature is implemented;
* no schema is production-ready;
* no migration is approved;
* no facade capability is stable;
* no operation registry is complete;
* no frontend screen is activated;
* no feature is verified;
* no production rollout has occurred.

Existing files are evidence to examine, not proof of completion.

## 22.2 Mandatory build order

Recommended domain sequence:

### Phase 0 — Architecture foundation

* approve domain boundary;
* approve feature inventory;
* approve ownership and exclusions;
* freeze source architecture;
* identify relational authority;
* implement architecture checks;
* implement and test kernel mechanics;
* implement composition skeleton;
* preserve or create the root facade contract.

### Phase 1 — Golden feature

Use `entity-administration/establishments` as the golden feature, provided current-state inspection confirms it remains the approved exemplar. It must exercise:

* tenancy;
* authorization;
* commands and queries;
* lifecycle;
* memory adapter;
* Drizzle adapter;
* audit;
* outbox;
* facade exposure;
* consumer tests.

Take it through complete closure.

### Phase 2 — Mechanical replication

Every later feature follows:

```text
approved feature PRD
→ feature capsule
→ memory behavior
→ contract tests
→ relational implementation
→ parity
→ facade integration
→ optional frontend delivery
→ verification evidence
```

### Phase 3 — Cross-feature capabilities

Implement shared domain capabilities only when at least one approved feature requires them.

They must live in:

* an explicit feature when they own business meaning; or
* the kernel when they provide generic execution mechanics.

### Phase 4 — Activation

* migration authority;
* role rollout;
* pilot organization;
* runbooks;
* recovery drill;
* operational evidence;
* enterprise-readiness review.

## 22.3 Golden-feature selection criteria

The golden feature should:

* represent the domain’s central ownership model;
* contain meaningful commands and queries;
* require tenancy and authorization;
* exercise lifecycle transitions;
* have manageable external dependencies;
* require both memory and Drizzle adapters;
* be understandable to human reviewers;
* avoid being the most complex feature in the domain.

## 22.4 No half-feature rule

A feature slice should not leave behind:

* placeholder handlers;
* empty adapters;
* untested operations;
* migrations without behavior;
* active routes without backend capability;
* registry entries without implementations;
* documentation claiming completion before verification.

---

# 23. Rollout and activation architecture

## 23.1 Lifecycle separation

The following decisions are distinct:

* specification approval;
* implementation completion;
* verification;
* deployment;
* organization activation;
* pilot acceptance;
* enterprise readiness.

None implies the next automatically.

## 23.2 Activation model

Define:

```yaml
activation_scope: organization
default_state: inactive
activation_authority: approved Corporate Administration activation authority
feature_flag_source: organization module activation service
emergency_disable_supported: true
```

## 23.3 Rollout stages

| Stage                  | Required gate                           | Rollback or containment             |
| ---------------------- | --------------------------------------- | ----------------------------------- |
| Schema prepared        | Migration evidence approved             | Restore or approved reversal        |
| Code deployed inactive | Contract and consumer tests green       | Disable capability                  |
| Pilot                  | Pilot scope and exit criteria approved  | Deactivate pilot                    |
| General activation     | Pilot accepted and runbooks ready       | Organization-level disable          |
| Enterprise-ready       | Operational and assurance review passed | Suspend capability if controls fail |

## 23.4 Operational readiness

Activation requires, where applicable:

* support ownership;
* runbooks;
* data migration reconciliation;
* access-role assignment;
* monitoring;
* alert thresholds;
* recovery procedure;
* retention configuration;
* audit review;
* user training;
* evidence of pilot acceptance.

---

# 24. Architecture Definition of Done

The domain architecture is approved only when:

* [ ] Mission and business owner are explicit.
* [ ] Inclusion and exclusion boundaries are explicit.
* [ ] Cross-domain ownership is resolved.
* [ ] Canonical terminology is defined.
* [ ] Feature groups and feature inventory are approved.
* [ ] Feature groups are classification-only.
* [ ] Features are declared semantic owners.
* [ ] Permanent source structure is approved.
* [ ] Facade, kernel, composition, and feature responsibilities are separated.
* [ ] Dependency directions are explicit and enforceable.
* [ ] Operation-definition and registry ownership is unambiguous.
* [ ] Transaction and idempotency policies are defined.
* [ ] Relational schema and migration authority are identified.
* [ ] Memory-first and adapter-parity policy is approved.
* [ ] Tenancy identity source and enforcement boundary are defined.
* [ ] Authorization and approval responsibilities are separated.
* [ ] Privacy, retention, and secrets rules are defined.
* [ ] Event and outbox policy is defined.
* [ ] Frontend and backend delivery statuses are separated.
* [ ] Architecture checks are identified.
* [ ] Greenfield delivery phases are approved.
* [ ] Golden-feature criteria are established.
* [ ] Activation and enterprise-readiness rules are distinct.
* [ ] Open architectural decisions identify their blockers.
* [ ] No section falsely claims implementation or verification without evidence.

---

# 25. Architecture invariants

The following must remain true throughout the domain’s lifetime.

> **Identifier namespace.** These are domain **invariants** and use the `<MODULE>-INV-nn` series — for example `HR-INV-01`, `CA-INV-01`. Do **not** number them `ARCH-nn`: this repository already uses `ARCH-001`…`ARCH-028` for repository-wide *architecture decision records* (for example ARCH-023 hard tenant roots, ARCH-024 workspace edges). Two meanings separated only by zero-padding is a collision, and it breaks any grep or traceability matrix over the decision series.

* `<MODULE>-INV-01` Every mutable business fact has exactly one semantic owner.
* `<MODULE>-INV-02` Feature groups classify; they do not own runtime business behavior.
* `<MODULE>-INV-03` Consumers use the package facade rather than internal feature paths.
* `<MODULE>-INV-04` Features do not import facade or composition.
* `<MODULE>-INV-05` Features do not mutate sibling or foreign-module tables.
* `<MODULE>-INV-06` Organization identity is server-trusted.
* `<MODULE>-INV-07` Store operations enforce tenant scope.
* `<MODULE>-INV-08` Public contracts do not expose Drizzle or database types.
* `<MODULE>-INV-09` Expected business outcomes use `Result<Data, Code>` from `@afenda/errors`.
* `<MODULE>-INV-10` Transport status mappings remain outside domain errors.
* `<MODULE>-INV-11` State, required audit, and required outbox effects commit atomically.
* `<MODULE>-INV-12` Idempotent replay does not duplicate state, audit, or events.
* `<MODULE>-INV-13` Feature operation definitions are composed, not manually duplicated.
* `<MODULE>-INV-14` The memory and Drizzle adapters have equivalent observable behavior.
* `<MODULE>-INV-15` Secrets and technical credentials are not stored by domain features.
* `<MODULE>-INV-16` Planned features do not render as active empty capabilities.
* `<MODULE>-INV-17` Documentation status does not substitute for implementation evidence.
* `<MODULE>-INV-18` A failed closure gate blocks dependent forward progress.
* `<MODULE>-INV-19` Module kernel changes are reviewed independently from feature implementation.
* `<MODULE>-INV-20` An individual feature requires an approved PRD before implementation.

Architecture tests should reference these identifiers. Where an invariant is enforced by an existing repository decision or gate, cite it alongside — for example `<MODULE>-INV-07` is enforced by ARCH-023 and `pnpm audit:tenancy-nulls`.

---

# 26. Architecture risks

| Risk                                          | Consequence                             | Control                                    |
| --------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| Domain becomes a miscellaneous module         | Ambiguous ownership and duplication     | Ownership test and explicit exclusions     |
| Feature groups acquire business logic         | Hidden mega-modules                     | Classification-only checks                 |
| Registry definitions are duplicated           | Policy drift                            | Compose feature-owned definitions          |
| Feature PRDs redesign architecture            | Structural divergence                   | Authority precedence and architecture gate |
| SQL drives behavior                           | Inconsistent adapters                   | Memory-first and parity                    |
| Tenant filtering occurs only in handlers      | Data exposure                           | Store-boundary enforcement                 |
| Facade leaks adapters or Drizzle types        | Consumer coupling                       | Export checks and consumer contracts       |
| External records are copied for convenience   | Stale and conflicting truth             | Governed-reference policy                  |
| Status reporting is overstated                | False readiness                         | Multidimensional lifecycle status          |
| Shared kernel becomes a domain dumping ground | Generic abstractions hide feature rules | Kernel admission criteria                  |
| Planned folders imply progress                | Misleading delivery state               | No-empty-scaffold rule                     |
| Frontend and backend completion are conflated | Incomplete feature called done          | Separate surface status                    |

---

# 27. Decision log

| Decision ID | Decision | Alternatives rejected | Rationale | Status | Date |
| --- | --- | --- | --- | --- | --- |
| CA-ADR-001 | Use `src/features/<feature-group>/<feature>/<files>` permanently | Flat feature list; group-owned runtime modules | Preserves classification while keeping semantic ownership in individual features | proposed | 2026-08-03 |
| CA-ADR-002 | Keep specifications under `docs/erp/corporate-administration/` | PRDs inside production package | Prevents specifications from being shipped or mistaken for runtime authority | proposed | 2026-08-03 |
| CA-ADR-003 | Use repository generator governance rather than package-local structural checkers | Six bespoke CA layout scripts | Avoids duplicate governance and aligns with `pnpm gen:doctor:erp` | proposed | 2026-08-03 |
| CA-ADR-004 | Use `operation-registry.ts` in every feature and project into the module manifest | `definition.ts`; manually duplicated central lists | Matches repository vocabulary and prevents policy drift | proposed | 2026-08-03 |
| CA-ADR-005 | Use Drizzle adapters named `<feature>.drizzle.ts` | `relational.ts` | Matches repository persistence terminology and existing patterns | proposed | 2026-08-03 |
| CA-ADR-006 | `obligations-calendar` is the shared renewal and deadline feature | Separate renewal engine in each feature | Prevents divergent scheduling semantics | proposed | 2026-08-03 |
| CA-ADR-007 | `access-resources` solely owns physical credential lifecycle | Duplicated ownership in `premises-access` | Establishes one mutable semantic owner | proposed | 2026-08-03 |
| CA-ADR-008 | `officers` owns person-bound compliance facts | Duplicated ownership in compliance administration | Person-bound facts follow the office-holder lifecycle | proposed | 2026-08-03 |
| CA-ADR-009 | Administrative asset custody is separate from financial asset accounting | One broad asset mega-model | Preserves bounded-context clarity and accounting authority | proposed | 2026-08-03 |
| CA-ADR-010 | Administrative subscriptions are separate from invoice and accounting lifecycles | Recurring invoice as subscription owner | Supports entitlement, assignment, notice, renewal, and deprovisioning without duplicating financial truth | proposed | 2026-08-03 |

Material approved decisions should move to dedicated decision records.

# 28. Open architectural questions

| Question ID | Question | Blocks | Owner | Required by | Resolution |
| --- | --- | --- | --- | --- | --- |
| CA-AQ-001 | Which current CA source files are authoritative exemplars after repository inspection? | Golden-feature confirmation and exact manifests | ERP Architecture | Before CA-1 implementation planning | unresolved |
| CA-AQ-002 | What canonical error code represents unavailable or missing required approval in the existing CA execution protocol? | Approval-required feature PRDs | Errors / CA architecture owners | Before next approval-protected mutation | unresolved |
| CA-AQ-003 | Which exact existing composition and facade files are approved write targets? | Feature implementation manifests | CA engineering owner | Before each feature Slice 0 approval | unresolved |
| CA-AQ-004 | What is the approved naming convention for the existing abbreviated `CA-*` documents versus spelled-out kebab-case names? | Documentation normalization only | Docs architecture owner | Before creating additional CA architecture/portfolio files | unresolved |
| CA-AQ-005 | Which existing features are implemented, verified, activated, or blocked based on fresh evidence? | Honest roadmap and lifecycle reporting | CA engineering and assurance owners | Before status publication | unresolved |

Rules:

* an unresolved blocking question stops the affected work;
* implementers must not invent answers;
* non-blocking questions must state why work may proceed safely;
* resolved questions become decisions or architecture amendments.

# 29. Architecture change process

A proposed change to this document must include:

1. problem statement;
2. affected architectural sections;
3. affected features and consumers;
4. compatibility impact;
5. migration impact;
6. security and tenancy impact;
7. alternatives considered;
8. decision and rationale;
9. required updates to checks, templates, and exemplars;
10. supersession information.

A feature implementation must not smuggle an architectural change into its own slice.

---

# Appendix A — Feature admission checklist

Before adding a feature to the inventory:

1. What exact business meaning does it own?
2. Who is accountable for maintaining it?
3. What lifecycle does it own?
4. Which facts must it never own?
5. Is another existing feature already authoritative?
6. Can it be represented as a governed reference instead?
7. Does it require independent commands, queries, rules, and persistence?
8. Does it belong in this domain according to the ownership test?
9. What external ports or events does it require?
10. Can its completion be proven independently?

A feature that lacks distinct semantic ownership should not be created.

---

# Appendix B — Kernel admission checklist

A capability belongs in the kernel only when:

* it is execution mechanics rather than business meaning;
* at least two features require identical semantics;
* feature-specific vocabulary is absent;
* it can be tested independently;
* centralization reduces policy drift;
* it does not require knowledge of a feature status or record type.

Otherwise, it belongs in the owning feature.

---

# Appendix C — New feature workflow

```text
1. Confirm feature ownership.
2. Add or approve feature inventory entry.
3. Author individual feature PRD.
4. Resolve blocking questions.
5. Approve exact write manifests.
6. Implement contracts and rules.
7. Prove behavior with memory adapter.
8. Implement relational schema and migration.
9. Pass relational parity.
10. Compose operation definitions into registry.
11. Expose approved facade capabilities.
12. Implement frontend separately where planned.
13. Record verification evidence.
14. Decide activation independently.
```

---

# Appendix D — Architecture review checklist

A reviewer should be able to answer:

1. What does this domain own?
2. What does it explicitly not own?
3. Who is accountable for its records?
4. What are its feature groups?
5. Which individual features own business meaning?
6. How do consumers access the package?
7. Where is execution policy enforced?
8. Where do feature operation definitions live?
9. Who owns relational schemas and migrations?
10. How is tenant isolation enforced?
11. How do features coordinate without direct coupling?
12. How are state, audit, and events committed?
13. How is memory-versus-relational parity proven?
14. What must exist before a feature can be implemented?
15. What distinguishes implemented, verified, activated, and enterprise-ready?

If these cannot be answered clearly, the architecture is not ready for approval.

---

# Appendix E — File name and location

```text
docs/erp/corporate-administration/corporate-administration-architecture.md
```

Kebab-case, matching the module id and the repository's `namingPolicy.files: kebab-case`. Examples:

```text
docs/erp/corporate-administration/corporate-administration-architecture.md
docs/erp/human-resources/human-resources-architecture.md
docs/erp/payments/payments-architecture.md
docs/erp/inventory/inventory-architecture.md
docs/erp/master-data/master-data-architecture.md
```

> **Open naming decision.** The first consumer on disk uses an abbreviated prefix — `docs/erp/corporate-administration/CA-PRD.md` and `CA-architecture.md` (currently empty). That conflicts with the spelled-out kebab-case form above and with lowercase file naming. Settle on one convention and rename the existing pair before more domains are authored; record it as a decision in §27 rather than letting both forms spread.
