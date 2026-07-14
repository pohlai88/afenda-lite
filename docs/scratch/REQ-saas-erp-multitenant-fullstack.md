# SaaS ERP Multi-Tenancy Fullstack Requirements

> **Scratch / non-authoritative.** This document is working material under `docs/scratch/`. It is **not** a Living or Target source of truth. It must not be cited as controlled architecture. Promotion into an authoritative docs folder requires separate DOC-001 approval and a DOC-002 register entry.

| Field | Value |
|-------|-------|
| Title | SaaS ERP Multi-Tenancy Fullstack Requirements |
| Status | Draft |
| Owner | Product Architecture (provisional) |
| Updated | 2026-07-14 |
| Audience | Product, domain, engineering, security, data, operations, quality, and control reviewers |
| Action enabled | Define promotion-ready requirements and decide whether a release has sufficient current evidence for enterprise production |

---

## 1. Overview

### 1.1 What this document is

A **technical specification** (requirements) for a greenfield **multi-tenant SaaS ERP** at **enterprise production quality**. It defines functional, cross-cutting, fullstack technical, and non-functional requirements so implementers share one reference during the documentation stage.

### 1.2 What this document is not

- Not a controlled architecture document, ADR, OpenAPI catalog, or runbook.
- Not an end-user guide or marketing brief.
- Not a competing greenfield architecture. It derives requirements from the current controlled Afenda-Lite architecture; when this draft conflicts with a controlled document, the controlled document wins.

### 1.3 Enterprise production quality bar

**Definition:** Enterprise production quality is the demonstrated ability to operate an in-scope ERP capability safely and predictably for real organizations under expected load, failure, abuse, change, and recovery conditions. It is an evidence state—not a design adjective, deployment event, roadmap milestone, or documentation status.

A capability reaches this bar only when every applicable mandatory gate is **PASS** for the exact release revision in a production-equivalent environment.

| Gate | Non-negotiable release condition | Minimum evidence | Accountable owner | Maximum evidence age |
|------|----------------------------------|------------------|-------------------|----------------------|
| QG-01 Functional correctness | All acceptance criteria and adverse paths pass; no unresolved severity-1 or severity-2 defect | Automated acceptance results and reviewed exploratory summary | Product + Engineering | Release candidate |
| QG-02 Financial integrity | Posting, period, currency, tax, subledger, reversal, and reconciliation invariants produce zero unexplained variance | Golden-ledger tests and reconciliation report | Finance owner | Release candidate |
| QG-03 Tenant and authorization isolation | Cross-org and cross-role attempts fail closed across UI, BFF, jobs, reports, search, export, files, REST, webhooks, and cache scopes | Canary-based automated isolation suite and security review | Security + Platform | Release candidate |
| QG-04 Application security | Threat model and required ASVS controls pass; no known exploitable Critical or High vulnerability; no secret/PII leakage | SAST, dependency, secret, DAST and penetration-test evidence | Security | Scans on candidate; penetration test within 12 months or after boundary change |
| QG-05 Availability and resilience | SLO is achievable; dependency failures degrade safely; retry, timeout, circuit and queue recovery are tested | Load/failure report, SLO dashboard and alert exercise | Platform + Operations | 90 days and candidate for changed paths |
| QG-06 Backup and disaster recovery | Required RPO/RTO are demonstrated by restore and recovery—not inferred from provider configuration | Restore report, integrity checks and measured RPO/RTO | Platform + Data | Quarterly restore; annual regional exercise |
| QG-07 Performance and capacity | Latency targets pass throughout the declared workload without tenant starvation or exhausted pools | Load report, traces, query plans and saturation graphs | Platform | Candidate after material runtime/query change |
| QG-08 Observability and supportability | Material requests, jobs, postings, webhooks, and failures are diagnosable; alerts and runbooks are exercised | Dashboard/alert inventory, synthetic checks and incident exercise | Operations | 90 days |
| QG-09 Data lifecycle and audit | Retention, export, correction, archival, legal hold, immutable history, and privileged access are policy-backed and tested | Data-flow review, audit samples, retention/export tests | Data owner + Security | 12 months or policy/schema change |
| QG-10 Accessibility and i18n | Complete core processes conform to WCAG 2.2 AA; locale, timezone, currency, date and text-expansion behavior pass | Automated/manual accessibility report and locale matrix | Frontend + Design | Candidate for changed workflows |
| QG-11 Change and supply-chain safety | Reproducible build, migrations, artifact promotion, rollback/forward-fix, dependency provenance, and env validation pass | CI attestation, migration rehearsal, rollback exercise and dependency inventory | Engineering + Platform | Candidate |
| QG-12 Contract and integration quality | Schemas, errors, idempotency, compatibility, rate limits, signatures, retry and deprecation behavior pass | Contract, drift, replay and idempotency tests | API + Integration | Candidate |
| QG-13 Documentation and control | Authorities, procedures, traceability, owners, decisions, known limits and support handoff are current | Documentation-integrity report and release evidence index | Product Architecture + Operations | Candidate |
| QG-14 Identity lifecycle and separation of duties | MFA/step-up for privileged and financial actions, SSO enforcement, SCIM provisioning/deprovisioning, access recertification, no-self-approval, service-account ownership pass | Identity conformance report, access-review sample, break-glass audit | Identity + Security | 12 months or auth/federation change |
| QG-15 Privacy, residency and tenant exit | Data classification, residency, subprocessor inventory, key ownership, export/deletion, legal-hold precedence, breach-notification path pass | Data-flow review, export/deletion test, key-management audit | Data owner + Security + Legal | 12 months or policy/schema change |
| QG-16 Data quality and tenant referential integrity | Composite tenant constraints, migration/backfill tenant-safety, cross-tenant adverse test, cache/search/object-storage key scoping pass | Adverse cross-tenant test suite, migration rehearsal report, static-scan report | Data Platform + Security | Candidate for changed schema/migration |
| QG-17 Maintainability and evolvability | Module-boundary static checks, supported-runtime/dependency currency, upgrade and rollback rehearsal pass | Dependency-inventory report, boundary-check CI result, upgrade rehearsal log | Engineering + Platform | Candidate |
| QG-18 End-to-end business-process completeness | Order-to-cash, procure-to-pay, inventory-to-GL and record-to-report close through settlement, reconciliation and bank matching with zero unexplained variance | Process-level reconciliation report spanning all four cycles | Finance owner + Product | Release candidate |

#### Quality state model

| State | Meaning |
|-------|---------|
| PASS | Reproducible evidence satisfies the criterion for the named revision and environment. |
| FAIL | Evidence shows the criterion is not satisfied. |
| BLOCKED | Verification cannot complete because a named dependency or decision is unresolved. |
| NOT EVIDENCED | No current reproducible evidence exists; prose, configuration, wiring and historical success do not count. |
| NOT APPLICABLE | An owning authority excludes the criterion and records rationale and fail-closed behavior where relevant. |
| ACCEPTED RISK | A waivable requirement is not met, but production is permitted under a current, approved, time-bounded exception per §1.3.2. |

A release is **not enterprise-production-ready** if any mandatory gate is FAIL, BLOCKED, or NOT EVIDENCED. Missing or stale evidence defaults to NOT EVIDENCED. ACCEPTED RISK is not a synonym for PASS and must never be assigned to a non-waivable condition.

#### Non-waivable conditions

The following cannot be waived for production and can never be recorded as ACCEPTED RISK:

- cross-organization disclosure or authorization bypass;
- unbalanced posting or unexplained ledger/subledger variance;
- silent mutation or deletion of posted financial history;
- unvalidated restore for the required recovery objective;
- known exploitable Critical or High vulnerability;
- production secrets in source, client bundles, logs, or evidence;
- irreversible migration without approved restore or forward-fix; or
- inability to attribute privileged and financial actions to actor, organization, time, and correlation id.

### 1.3.1 Evidence applicability and inheritance

A gate whose Maximum evidence age exceeds "Release candidate" (QG-04 through QG-09, QG-14 through QG-17) may reuse prior evidence for a new revision only when a recorded **evidence applicability decision** exists for that revision. The decision must state:

| Field | Required content |
|-------|-------------------|
| Changed components / trust boundaries | Exact modules, adapters, or boundaries touched since the reused evidence was produced |
| Affected requirements | Requirement/gate IDs whose behavior could plausibly change |
| Unchanged-control attestation | Named reviewer attestation that the control implementation is unchanged |
| Configuration and dependency drift | Diff summary of runtime config, feature flags, and dependency versions |
| Environment equivalence | Confirmation the original evidence environment remains representative |
| Reason evidence remains valid | Explicit rationale, not a restatement of the freshness window |
| Approving reviewer | Named accountable owner distinct from the evidence producer |
| Mandatory rerun triggers | Conditions (e.g. trust-boundary change, dependency major-version bump, prior FAIL) that force a fresh run regardless of age |

Without an evidence applicability decision, aged evidence defaults to NOT EVIDENCED for the new revision, consistent with §8.3.

### 1.3.2 Exception and ACCEPTED RISK state

Temporary exceptions never silently convert to PASS. A requirement under an active exception is recorded as **ACCEPTED RISK** with:

- the specific waivable requirement or gate ID (non-waivable conditions above are never eligible);
- risk owner and business justification;
- compensating control in effect for the duration of the exception;
- rollback or disablement trigger if the compensating control fails;
- approval by every affected Product/Engineering/Security/Operations owner named in the requirement's verification routing (§15.1);
- maximum aggregate ACCEPTED RISK exceptions open per gate at any time (default: one, unless the owning authority records a higher limit with rationale);
- expiry date no more than 30 days from approval;
- automatic reversion to FAIL/BLOCKED/NOT EVIDENCED (never PASS) on expiry unless re-approved with updated justification;
- customer or regulator notification requirement, if the exception is customer-visible or compliance-relevant;
- forced feature disablement or rollback if the exception expires without re-approval.

A gate containing one or more ACCEPTED RISK requirements is reported as **ACCEPTED RISK** at the gate level, never rolled up silently into PASS.

#### Delivery sequencing is not quality reduction

Implementation may be incremental, but each production-exposed slice must satisfy every applicable gate. MVP, lite, thin, simple, or good enough never relax correctness, isolation, security, audit, accessibility, recovery, or operability.

### 1.4 Authority boundary

| Surface | Role of this draft |
|---------|--------------------|
| This file under docs/scratch | Non-authoritative requirements and quality-bar working material |
| Controlled ARCH documents | Own structure, stack, tenancy, package, runtime, data, auth, and deployment decisions |
| Controlled API documents | Own HTTP/Action contracts, schemas, errors, idempotency, compatibility, and resources |
| Controlled module spines | Own module requirements, evidence, operations, roadmap, and Module Enterprise Readiness |
| Controlled ADRs | Own one material decision, alternatives, consequences, and follow-up |
| Runbooks | Own executable operation, recovery, rollback, and escalation |

This draft cannot supersede or silently reopen a controlled decision. Conflicts are corrected here or raised as an explicit decision proposal.

### 1.4.1 Authority-conflict matrix (mandatory before promotion)

Architecture compatibility is **BLOCKED**, not presumed, until the accountable owner completes and attaches this matrix. It is not satisfied by this draft's own cross-references — it requires a reviewer with read access to the cited controlled documents to record a verdict.

| Requirement ID | Controlled authority | Compatible? | Conflict / assumption | Decision owner |
|----------------|----------------------|-------------|------------------------|-----------------|
| §5 module set (`REQ-F-PLT/MD/SAL/PUR/INV/FIN/RPT/INT/PAY/IMP/ENT`) | [ARCH-006](../architecture/ARCH-006-bounded-contexts.md) bounded-context map; [ARCH-022](../architecture/ARCH-022-system-overview.md) `modules/{platform,identity,declarations,fft}` Target tree | **No — confirmed conflict, not merely unreviewed** | ARCH-006's Living/Target bounded-context list is Identity, Declarations, Trade (Feed Farm Trade), and Platform. It has **no** Sales, Purchasing, Inventory, Finance, Master Data, Reporting, or Payments context, and ARCH-006 explicitly requires a new ADR before scaling to a new bounded context (§ "Scaling path (later — needs ADR)") and forbids inventing a context as a stepping stone. | Product Architecture — see [§12.2 OQ-20](#122-open-decisions) |
| Rest of §5–§10 requirement families | ARCH-010, ARCH-022–029, ARCH-031 | Not yet reviewed | — | Product Architecture (matrix incomplete beyond the row above) |

This row is the one concrete, evidence-backed exception to "architecture compatibility is BLOCKED, not presumed" in this draft: it was reviewed against the cited controlled documents and found **incompatible as scoped**, not merely unresolved. Every other row remains a template until an owner with read access completes the review. Until every row reads "Yes," §15.4 specification-completeness gate cannot pass and QG-13 remains BLOCKED.

### 1.5 Requirement quality contract

Normative terms: **must/must not** are release-blocking when applicable; **should** is the expected default and needs rationale to deviate; **may** permits an option without committing to it.

Every promoted requirement needs one stable ID, accountable owner, verification method/environment, objective pass/fail criterion, evidence artifact/revision/date/freshness, dependencies/assumptions, failure or recovery behavior, and a controlled owning authority.

Words such as support, enterprise-ready, secure, scalable, fast, periodically, or as appropriate are incomplete unless paired with an observable threshold or an authority that supplies it.
Severity-1 means active cross-tenant/security compromise, financial corruption, unrecoverable data loss, or total critical-service outage. Severity-2 means a critical business process is unavailable or materially incorrect without a safe workaround.

#### 1.5.1 Mandatory acceptance-case structure

Every `REQ-F-*` and `REQ-T-*` requirement in §5, §6, and §7 states its acceptance criteria as three columns instead of prose alone:

| Column | Content |
|--------|---------|
| Positive case | The state change, accounting/inventory effect, or event that must occur when preconditions and actor permission are satisfied |
| Adverse case | The forbidden path that must be rejected (wrong actor, wrong state, cross-tenant reference, invalid transition) |
| Recovery / concurrency case | The idempotency, optimistic-concurrency, reversal, or retry behavior required when the operation repeats, races, or fails partway |

A requirement row without all three populated is NOT EVIDENCED-eligible only, never PASS-eligible, per §15.4.

### 1.6 Assumptions and unknowns

- This is a requirements proposal for the controlled Afenda-Lite Target, not evidence of an implemented ERP product tree.
- The §8.1 workload is a proposed minimum acceptance envelope and remains BLOCKED until Product and Platform ratify it against demand and cost forecasts.
- Jurisdiction-specific tax, retention, legal hold, numbering, accessibility, and data-residency obligations remain subject to Legal/Compliance decisions in §12.2.
- Product code, production-like test environments, evidence artifacts, and release approvers are not established by this scratch document; current readiness is NOT EVIDENCED.
- Controlled documents remain authoritative for stack, tenancy, identity, API, module, environment, deployment, and anti-contamination decisions.
- The legal-entity/group model (§4.5, OQ-10) is unresolved; `REQ-F-ENT-*` is a candidate requirement set, not a selected architecture, until Product Architecture and Finance decide.
- The §1.4.1/§12.3 authority-conflict matrix is a template, not a completed review; architecture compatibility remains BLOCKED until an owner with read access to the controlled documents in §14.1 completes it.

---

## 2. Problem

Mid-market and enterprise operators need a single cloud ERP for sales, purchasing, inventory, and finance with:

- Strict **organization-level tenancy** so customer data never leaks across tenants.
- **Document workflow** (draft → approve → post → void/reverse) with financial integrity.
- **Integration** for EDI replacements, e-commerce, and bank/tax connectors via stable APIs.
- **Operational readiness**: audit, backup, observability, SSO, and RBAC suitable for regulated customers, and for multi-entity customers once [§4.5](#45-legal-entity--group-model-oq-10--open-release-blocking) resolves OQ-10.

Building these concerns ad hoc produces fragmented tools and broken books. This product exists to provide one modular SaaS ERP with production-grade boundaries from day one of implementation—not a disposable prototype.

---

## 3. Goals and non-goals

### 3.1 Goals

1. Deliver a multi-tenant SaaS ERP covering platform/IAM, master data, sales, purchasing, inventory, finance, reporting, and integration ([§5](#5-functional-requirements)).
2. Enforce hard tenant isolation on every read/write path ([§4](#4-actors-and-tenancy-model)).
3. Preserve financial correctness: postings, periods, multi-currency, tax hooks, and immutable audit for posted documents ([§5.6](#56-finance), [§6](#6-cross-cutting-requirements)).
4. Provide a fullstack system—first-party web UI, BFF, domain modules, PostgreSQL, jobs, files, public REST—that is operable in production ([§7](#7-fullstack-technical-requirements), [§8](#8-non-functional-requirements-and-acceptance-envelope)).
5. Keep one shared error/idempotency/audit vocabulary across UI adapters and public HTTP ([§7.3](#73-api-and-contracts)).

### 3.2 Non-goals (product boundary, not quality exception)

The following **product domains** are out of scope for this requirements set:

| Excluded domain | Notes |
|-----------------|--------|
| Native mobile apps | Responsive web only |
| Manufacturing MRP / MES | Not in this ERP core |
| Advanced WMS robotics / automation | Warehouse locations and stock yes; robotics no |
| CRM marketing automation | Customer master yes; campaigns no |
| Payroll / HRIS | Not in this ERP core |
| E-commerce storefront | Integration APIs may feed orders; no storefront UI |
| Marketplace / app store | No third-party extension marketplace |
| White-label theme marketplace | Tenant branding configuration is in-scope only as admin settings ([§5.1](#51-platform--tenancy)); not a theme marketplace |

---

## 4. Actors and tenancy model

### 4.1 Tenant definition

- The **organization** is the tenant boundary.
- All business data rows that belong to a tenant **must** carry `organization_id` (UUID or equivalent stable id).
- A user may belong to multiple organizations; every request **must** resolve an active organization context before domain work runs.

### 4.2 Actors

| Actor | Description |
|-------|-------------|
| Platform operator | Break-glass SaaS operator; tenant lifecycle, abuse response; never uses customer org data except via audited break-glass |
| Organization admin | Manages members, roles, org settings, numbering, fiscal calendar |
| Accountant / controller | COA, journals, periods, AR/AP, FX, closes |
| Sales user | Quotes, sales orders, deliveries, AR invoices, credit notes |
| Purchasing user | Requisitions, POs, receipts, AP bills |
| Warehouse user | Stock, adjustments, cycle counts, pick/pack/ship |
| Read-only auditor | View documents and reports; no posts |
| Integration client | Machine identity (API key or OAuth client credentials) scoped to one organization |

### 4.3 Isolation musts

| ID | Requirement |
|----|-------------|
| REQ-F-TEN-001 | Every tenant-scoped query/command **must** filter (or constrain) by the active `organization_id`. Cross-tenant reads/writes are forbidden. |
| REQ-F-TEN-002 | APIs and BFF adapters **must** reject requests that omit or forge organization context. |
| REQ-F-TEN-003 | Document numbers, sequences, and fiscal periods **must** be unique and configurable **per organization**. |
| REQ-F-TEN-004 | Background jobs and webhooks **must** carry organization context and enforce the same isolation rules as interactive requests. |
| REQ-F-TEN-005 | Search, export, and report jobs **must not** include rows from other organizations. |
| REQ-F-TEN-006 | Break-glass platform access **must** be authenticated, authorized, time-bounded, and fully audited. |

### 4.4 Data deployment model (inherited constraint)

**Controlled constraint:** Shared PostgreSQL schema with hard application-enforced organization_id predicates and production connection pooling, as owned by [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) and the Target data architecture.

This draft does not authorize schema-per-tenant, project-per-tenant, soft dual-mode tenancy, first-organization stamping, or ambient organization inference. Reconsideration requires an explicit controlled decision reopening the applicable ARCH-023 lock; this scratch requirement cannot do so.

### 4.5 Legal-entity / group model (OQ-10 — open, release-blocking)

§2 names "regulated and multi-entity customers" while §4.1–§4.4 scope isolation, numbering, fiscal periods, and credentials to one organization. Those statements are semantically incompatible until one model is selected. This section resolves the *shape* of both candidates so whichever is chosen has ready-to-promote requirements; it does **not** select one on the accountable owner's behalf.

| Model | Description | Additional requirements if selected |
|-------|-------------|--------------------------------------|
| **Model A — organization contains multiple legal entities** | An organization is a customer account; it may contain one or more legal entities, each with its own ledger. | REQ-F-ENT-001 through 006 below |
| **Model B — organization is one legal entity** | A separate enterprise/group control plane spans multiple organizations for consolidation and shared administration. | A new group-control-plane requirement set, out of scope for this draft until OQ-10 selects Model B |

**Candidate requirements — Model A (drafted; gated by OQ-10 selection):**

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-ENT-001 | Organizations **must** support one or more legal-entity records, each with its own base currency, fiscal calendar, and numbering series independent of sibling entities. | Creating a second entity under an organization does not alter the first entity's open fiscal period or numbering sequence. | Attempting to share a numbering series across two entities in the same organization is rejected. | Entity creation is idempotent under a client-supplied key; a retried create returns the original entity, not a duplicate. |
| REQ-F-ENT-002 | Every ledger-bearing document **must** carry an `entity_id` scoped within its `organization_id`; cross-entity references are forbidden unless the transaction is an explicit intercompany document. | A journal posted against entity A only affects entity A's trial balance. | A line item referencing an item or account belonging to a different entity in the same organization is rejected at post time. | A migration that backfills `entity_id` on existing rows is rehearsed against production-scale data with a tenant/entity-safety test before running in production. |
| REQ-F-ENT-003 | The system **must** support intercompany transactions (intercompany AR/AP pair, intercompany journal) that post balanced, mirrored entries in both entities. | Posting an intercompany sale creates a balanced receivable in the selling entity and a balanced payable in the buying entity in the same operation. | An intercompany document that would leave one side unbalanced or unposted is rejected atomically — neither side posts. | A partially failed intercompany post (one side committed, one side failed) is detected by reconciliation and is not resolved by silently completing or deleting the orphaned side. |
| REQ-F-ENT-004 | The system **must** support elimination entries and consolidated trial balance/P&L/balance sheet reporting across entities within one organization. | A consolidated report equals the sum of entity-level trial balances plus approved eliminations, ties to zero variance. | A consolidated report cannot be generated while an entity has an open, unreconciled intercompany balance beyond policy tolerance. | Re-running consolidation after a correcting entry reproduces a deterministic, reproducible consolidated result for the same revision and inputs. |
| REQ-F-ENT-005 | Entity-scoped authorization **must** be enforceable independently of organization-level roles (a user may hold different permissions per entity). | A controller with posting rights in entity A but read-only in entity B cannot post to entity B. | An attempt to post to an entity without entity-scoped permission fails closed even if the user holds an organization-admin role. | Role changes at the entity level take effect within the session-refresh interval defined by REQ-F-PLT-007; no stale-permission window beyond that interval. |
| REQ-F-ENT-006 | Entity and consolidated reporting **must** carry the same tenant-isolation guarantees as REQ-F-TEN-001 through 006 across organization boundaries. | A consolidated report never includes data outside its owning organization's entities. | A report request naming an entity outside the caller's organization is rejected before query execution. | Report generation is safe to retry; a retried report request does not duplicate delivery to a scheduled destination. |

Until OQ-10 is decided, REQ-F-ENT-001–006 remain candidate/BLOCKED and must not be represented as selected architecture, consistent with §12.2.

---

## 5. Functional requirements

Requirements use `REQ-F-*`. All are enterprise production requirements.

Each table below follows the §1.5.1 mandatory acceptance-case structure: Requirement states the invariant; Positive/Adverse/Recovery columns state the objective acceptance criteria required for PASS.

### 5.1 Platform / tenancy

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-PLT-001 | Organizations **must** support create, suspend, reactivate, and soft-close lifecycle states; hard delete is forbidden while posted financial history exists. | Suspending an organization blocks new sessions and mutations while preserving read access for authorized break-glass. | A hard-delete request against an organization with posted financial history is rejected regardless of caller role. | Reactivation restores the prior permission state without re-creating or duplicating existing records. |
| REQ-F-PLT-002 | The system **must** support member invite, accept, revoke, and role assignment scoped to one organization. | An accepted invite grants exactly the invited role and organization scope, no more. | A revoked member's existing sessions lose access within the session-refresh interval (REQ-F-PLT-007). | Re-sending an invite to the same address with the same token is idempotent and does not create duplicate pending invitations. |
| REQ-F-PLT-003 | The system **must** provide RBAC with least-privilege defaults; custom roles are defined against a documented, enumerable permission catalog. | A custom role can grant a named subset of catalog permissions and no undocumented permission. | Assigning a permission outside the documented catalog is rejected at role-save time, not silently ignored. | Concurrent edits to the same role definition fail safely (optimistic concurrency) rather than last-write-wins. |
| REQ-F-PLT-004 | The system **must** provide an OIDC/SAML federation path for enterprise tenants and a password/session path for other tenants, per OQ-06 permission catalog and QG-14. | An enterprise tenant with SSO enforced rejects password-based login for federated users. | A federation callback with an invalid or expired assertion is rejected without creating a session. | An identity-provider outage falls back to a defined, tested degraded mode (§10 IdP-outage risk row), not an open authentication bypass. |
| REQ-F-PLT-005 | The system **must** maintain a queryable, tenant-scoped audit log for authz denials, role changes, and break-glass events, retained per REQ-N-CMP-001. | Every denied authorization attempt produces one queryable log entry with actor, organization, permission, and timestamp. | The audit log is not writable or deletable through any tenant-facing interface. | Log-write failure fails the triggering security-relevant action closed (deny) rather than proceeding without an audit record. |
| REQ-F-PLT-006 | Organization admins **must** configure locale, timezone, base currency, and document-numbering series at organization (and, once OQ-10 resolves, entity) scope. | A configured base-currency change before the first posted transaction takes effect for all subsequent documents. | A base-currency change attempted after the first posted transaction is rejected per REQ-F-FIN item on base-currency immutability (§5.6). | Concurrent configuration writes to the same organization setting fail safely rather than silently overwriting one admin's change. |
| REQ-F-PLT-007 | Sessions **must** bind user + active organization; switching organization **must** re-authorize permissions within a defined interval (target: immediately on switch, verified ≤ 2 seconds p95). | Switching organizations immediately reflects the new organization's role and permission set in the next request. | A request using a stale organization context after switch is rejected, not silently served against the old organization. | A failed organization switch leaves the session in its prior, valid organization context rather than an ambiguous or unscoped state. |
| REQ-F-PLT-008 | Organization admins **must** configure tenant branding (logo, display name, primary color) as admin settings, consistent with the §3.2 non-goal boundary (admin configuration only, no theme marketplace). | A configured brand asset renders on the tenant's authenticated UI and outbound tenant-triggered email without affecting other tenants. | A branding asset upload exceeding size/type policy is rejected before storage. | Removing a branding asset reverts to the platform default without breaking existing document templates that referenced it. |

### 5.2 Master data

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-MD-001 | Organizations **must** manage customers and vendors with addresses, contacts, payment terms, tax categories, and credit controls where enabled. | A customer with a credit limit blocks a new order that would exceed the limit, per policy. | Creating a customer/vendor record without a required tax category (where the org's market requires one) is rejected at save. | Concurrent edits to the same customer/vendor record fail safely (version check) rather than last-write-wins. |
| REQ-F-MD-002 | Organizations **must** manage items/SKUs with UoM, costing attributes, inventory flags, and sales/purchase flags. | An item flagged inventory-tracked appears in stock-on-hand reports; a non-tracked item does not. | Changing an item's costing method after cost layers exist is rejected or requires an explicit, audited valuation-change procedure (§5.6 valuation-method-change requirement). | UoM conversion errors on order entry are rejected before the line is added, not corrected after posting. |
| REQ-F-MD-003 | Organizations **must** manage warehouses and storage locations. | A stock movement targeting an inactive location is rejected. | Deleting a warehouse with on-hand stock is rejected; deactivation is required instead. | N/A — master-data structural change, no concurrency-sensitive posting involved. |
| REQ-F-MD-004 | Organizations **must** manage price lists and currency-aware pricing. | An order priced from a currency-specific price list reflects that currency without silent conversion. | Applying a price list in a currency not configured for the organization is rejected. | Overlapping effective-dated price-list entries for the same item resolve deterministically (most specific/most recent wins, documented). |
| REQ-F-MD-005 | Master-data changes **must** be auditable (who/when/what); posted-document references **must not** be silently rewritten in a way that breaks historical integrity. | Renaming a customer updates the master record; a previously posted invoice still displays the customer name as it was at posting time (REQ-F-FIN-009 snapshot). | A master-data edit that would alter the legal representation of a posted document is rejected; the poster must use a corrective document instead. | Bulk master-data import failures roll back per-row without partially applying an invalid batch (§5.10 import requirements). |
| REQ-F-MD-006 | Soft-deactivation of master records **must** block new documents while preserving history on existing documents. | An inactive item cannot be added to a new sales order line. | Reactivating a record does not retroactively alter documents created while it was inactive (there should be none). | Deactivation is idempotent; repeating it on an already-inactive record is a no-op, not an error. |

### 5.3 Sales

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-SAL-001 | The system **must** implement quotes with states `draft → sent → accepted/expired/revised → converted`, versioning on revise, and a configurable expiry. | Converting an accepted quote creates a sales order carrying the quoted price and terms. | Converting an expired or already-converted quote is rejected. | Revising a sent quote creates a new version and preserves the prior version for audit; it does not mutate the original in place. |
| REQ-F-SAL-002 | The system **must** implement sales orders with the state machine `draft → confirmed → partial → complete → closed`, plus `cancelled` from any pre-complete state, with taxes, discounts, and promised dates. | Confirming an order with sufficient credit and stock allocation moves it to `confirmed` and creates a reservation (REQ-F-SAL-007). | A transition attempted out of sequence (e.g. `draft → complete`) is rejected by the domain service and, independently, by a database constraint. | Two concurrent confirm attempts on the same order (double-submit) result in exactly one confirmed order, not two, under the same idempotency key. |
| REQ-F-SAL-003 | The system **must** implement delivery/fulfillment documents linked to sales orders, updating reserved and shipped quantities. | Shipping a delivery reduces reserved quantity and increases shipped quantity in the same transaction as the stock-movement ledger entry. | A delivery quantity exceeding the order's open (unshipped) quantity is rejected. | A delivery that fails partway (e.g. stock-movement write fails after order update) rolls back atomically; no partially-shipped state persists. |
| REQ-F-SAL-004 | The system **must** implement AR invoices, sourced from order/delivery or standalone per org policy, with lifecycle `draft → approved → posted → void/reversed`. | Posting an AR invoice from a delivery carries forward quantities, prices, and tax exactly as fulfilled. | Posting an AR invoice into a closed fiscal period is rejected unless a controlled reopen is active (§5.6). | Reversing a posted AR invoice creates a balancing reversal document; it never mutates or deletes the original posted record. |
| REQ-F-SAL-005 | The system **must** implement credit notes with allocation to one or more AR invoices, up to the invoice's open balance. | Allocating a credit note to an invoice reduces the invoice's open balance by the allocated amount, exactly. | Allocating more than the invoice's open balance, or to an invoice in a different organization, is rejected. | A partially allocated credit note retains its remaining unallocated balance for later allocation or refund (§5.9). |
| REQ-F-SAL-006 | Posting an AR invoice **must** create the balanced accounting impact defined by finance posting rules (§5.6), in the same transaction as the invoice state change. | A posted invoice's journal debits AR and credits revenue/tax accounts with a zero net variance. | A posting attempt that would produce an unbalanced journal is rejected before the invoice state changes to `posted`. | A posting retry under the same idempotency key produces exactly one journal, not one per retry. |
| REQ-F-SAL-007 | Inventory reservation and release rules **must** be consistent across confirm, ship, and cancel paths. | Cancelling a confirmed, unshipped order releases its full reservation back to available stock. | Cancelling an order with a partially shipped delivery is rejected or requires an explicit partial-cancel path that reconciles shipped vs. reserved quantity. | A crash between reservation and order-state commit leaves no orphaned reservation; a compensating job or transaction boundary guarantees consistency. |

### 5.4 Purchasing

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-PUR-001 | The system **must** implement purchase requisitions with states `draft → submitted → approved/rejected → converted`, subject to organization approval policy (OQ-06) and no-self-approval (§6 REQ-F-X-009). | An approved requisition converts to a purchase order carrying its approved lines. | A requester approving their own requisition above the policy threshold is rejected. | Resubmitting a rejected requisition creates a new approval cycle; it does not silently reuse a stale approval. |
| REQ-F-PUR-002 | The system **must** implement purchase orders with states `draft → approved → sent → partial/complete → closed/cancelled` and receipt linkage. | Receiving against an open PO line reduces its open quantity and, when fully received, allows the line to close. | Receiving more than the PO's open quantity is rejected unless over-receipt tolerance is explicitly configured. | Two concurrent receipt postings against the same PO line serialize correctly; neither silently overwrites the other's quantity update. |
| REQ-F-PUR-003 | The system **must** implement goods receipts that update inventory on-hand and PO open quantity in the same transaction. | A posted goods receipt increases on-hand stock and reduces PO open quantity atomically. | A goods receipt referencing a PO line from a different organization is rejected at both service and database layers. | A goods receipt reversal (return-to-vendor) decreases on-hand stock and restores PO open quantity without deleting the original receipt record. |
| REQ-F-PUR-004 | The system **must** implement AP bills (vendor invoices) with lifecycle `draft → approved → posted → void/reversed`. | Posting an AP bill matched to a PO and receipt (three-way match, REQ-F-PUR-006) creates the configured accounting impact. | Posting an AP bill into a closed period without an active reopen is rejected. | Reversing a posted AP bill creates a balancing reversal; the original posted record is never mutated or deleted. |
| REQ-F-PUR-005 | The system **must** implement debit notes with application to one or more AP bills, up to the bill's open balance. | Applying a debit note to a bill reduces its open payable balance exactly by the applied amount. | Applying a debit note beyond the bill's open balance, or across organizations, is rejected. | A partially applied debit note retains its remaining balance for later application. |
| REQ-F-PUR-006 | Where price, quantity, and receipt data exist, **three-way match** **must** be enforceable by organization policy before AP bill posting, with configurable tolerance. | A bill within tolerance of PO price/quantity and confirmed receipt posts without manual intervention. | A bill outside tolerance is blocked from posting and routed to an exception queue with the variance recorded. | Re-matching after a receipt correction re-evaluates tolerance instead of relying on a stale match result. |
| REQ-F-PUR-007 | Posting an AP bill **must** create the balanced accounting impact per finance configuration, in the same transaction as the bill state change. | A posted bill's journal debits expense/asset and credits AP with zero net variance. | A posting attempt producing an unbalanced journal is rejected before the bill state changes to `posted`. | A posting retry under the same idempotency key produces exactly one journal. |

### 5.5 Inventory

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-INV-001 | The system **must** track on-hand, reserved, and available quantity per item per warehouse/location, where available = on-hand − reserved. | A reservation reduces available quantity without changing on-hand quantity until shipment. | A reservation that would drive available quantity negative is rejected unless REQ-F-INV-006 explicitly permits negative stock. | Concurrent reservations against the same item/location serialize (row-level locking or equivalent) rather than both succeeding and overselling. |
| REQ-F-INV-002 | The system **must** record all stock movements (receipt, issue, transfer, adjust) as immutable ledger lines; corrections use reversing movements. | Every on-hand change is traceable to exactly one movement ledger line with type, quantity, and reference document. | An attempt to update or delete a posted movement line (rather than reverse it) is rejected at the service and database layers. | A failed movement write rolls back the entire stock-affecting transaction; no partial quantity change persists. |
| REQ-F-INV-003 | Organizations **must** select one valuation method (moving average or FIFO) and apply it consistently to cost layers. | A receipt creates a new cost layer consistent with the selected method; an issue consumes layers per that method's rule. | Switching valuation method for an item with existing cost layers is rejected unless performed through the controlled valuation-change procedure (§5.6). | A costing calculation retried after a transient failure produces the same cost result (deterministic, not time-of-retry dependent). |
| REQ-F-INV-004 | The system **must** implement inventory adjustments with mandatory reason codes and RBAC restricted to authorized roles. | An adjustment with a valid reason code posts a movement line and, where configured, a variance journal. | An adjustment without a reason code, or from an unauthorized role, is rejected. | A duplicate adjustment submission under the same idempotency key produces one movement, not two. |
| REQ-F-INV-005 | The system **must** implement cycle-count workflows producing controlled variance postings within tolerance policy. | A completed cycle count within tolerance posts an approved variance adjustment automatically. | A count variance outside tolerance blocks automatic posting and requires explicit approval. | A cycle count interrupted mid-count preserves counted lines and can resume rather than restarting or double-counting. |
| REQ-F-INV-006 | Negative stock **must** be policy-gated: forbidden by default, allowed only with explicit organization setting and elevated permission. | With the setting enabled and permission granted, an issue exceeding available quantity posts and creates a negative-stock flag for reconciliation. | With the default setting, the same issue is rejected before the movement posts. | A subsequent receipt that resolves a negative-stock condition is reconciled and the flag is cleared with an audit record, not silently. |

### 5.6 Finance

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-FIN-001 | Organizations **must** maintain a full chart of accounts with account types and control accounts for subledgers (AR, AP, inventory, cash). | A subledger posting always targets its configured control account; the control account balance reconciles to the subledger detail. | Posting directly to a control account from a manual journal (bypassing the subledger) is rejected unless an explicit, audited override permission is used. | A reconciliation job comparing subledger detail to control-account balance is safe to re-run and produces the same variance result for the same revision. |
| REQ-F-FIN-002 | The system **must** implement manual journals with lifecycle `draft → posted`, enforcing balanced debit/credit in transaction currency and translated reporting currency. | A balanced journal posts and updates account balances atomically. | An unbalanced journal (in either transaction or reporting currency) is rejected before posting. | A posting retry under the same idempotency key produces exactly one journal entry. |
| REQ-F-FIN-003 | Subledger postings from sales, purchasing, inventory, and payments **must** generate journals per configurable posting rules, in the same transaction as the source document's state change. | A posted AR invoice's journal is visible immediately and ties to the invoice via a stable reference. | A source-document post that would fail journal generation is rejected atomically; the source document does not remain in `posted` state without its journal. | A failed posting rule evaluation defaults to blocking the post (fail closed), not posting without accounting impact. |
| REQ-F-FIN-004 | Organizations **must** define fiscal years and periods; period close **must** block new posts into closed periods except via a controlled, audited reopen. | A post attempted into an open period succeeds; the same post attempted after that period closes is rejected. | Reopening a closed period without the documented approval and audit trail is rejected. | An adjustment period between period close and year-end close is available per §5.6 adjustment-period requirement (below) without reopening the operating period. |
| REQ-F-FIN-005 | Multi-currency **must** be supported: document currency, organization base currency, effective-dated FX rates, and realized/unrealized FX handling for open items, with base currency immutable after first posting. | An open AR item revalued at period-end produces an unrealized-FX journal; settlement produces a realized-FX journal. | A base-currency change attempted after the first posted transaction is rejected (cross-reference REQ-F-PLT-006). | A missing FX rate for a required date blocks posting (fail closed) rather than defaulting to 1:1 or a stale rate. |
| REQ-F-FIN-006 | Tax **must** post via configurable tax categories and rates, with rounding authority (per-line or per-document, organization-configured) and posting hooks mandatory regardless of tax-engine vendor (OQ-01). | A multi-line invoice's tax total matches the configured rounding rule's expected result exactly. | A line or document tax calculation that cannot resolve a rate for the transaction date/jurisdiction blocks posting. | Re-running tax calculation after a rate correction produces a deterministic, reproducible result for the same inputs and revision. |
| REQ-F-FIN-007 | AR/AP aging reports **must** be available as of a date and exportable, tying to the control-account balance for that date. | An as-of aging report's total equals the control-account balance as of the same date. | Generating an aging report for an organization the caller does not belong to is rejected before query execution. | A scheduled aging report retried after a transient failure does not deliver duplicate copies to the destination. |
| REQ-F-FIN-008 | Posted financial documents **must not** be hard-deleted; corrections use void/reverse or corrective documents, preserving the original posted record. | Reversing a posted invoice creates a linked reversal document; querying the original still returns its original posted content. | A delete request against any posted financial document is rejected regardless of caller role. | A reversal posted twice under the same idempotency key produces one reversal, not two. |
| REQ-F-FIN-009 | Posted documents **must** snapshot customer, vendor, item, tax, and terms data as of posting time; later master-data edits **must not** alter a posted document's legal/accounting representation. | Renaming a customer after invoice posting leaves the posted invoice's displayed customer name unchanged. | Attempting to re-render a posted document using current (not snapshotted) master data is rejected by the rendering path. | Re-issuing a document copy after a master-data change reproduces the original snapshot, not the current master-data state. |
| REQ-F-FIN-010 | Organizations **must** support soft close, hard close, and module-level close, plus a defined adjustment period before year-end close, with documented gap/duplicate-post prevention. | An adjustment-period post after soft close but before hard close is accepted; the same post after hard close is rejected. | A duplicate post of the same source document (same idempotency key) during the adjustment period does not create a second journal. | Year-end close carries forward opening balances (below) in the same operation that closes the final period, with a rollback path if carry-forward fails validation. |
| REQ-F-FIN-011 | The system **must** support opening balances, retained earnings roll-forward, and recurring journals (accruals, prepayments) with defined start/end and auto-reversal rules. | A recurring accrual journal posts automatically on its scheduled date and auto-reverses on its defined reversal date. | A recurring journal template with an invalid or expired schedule does not post silently; it is flagged for review. | A missed scheduled run (e.g. job outage) is caught by redrive/backfill logic that posts the missed period without duplicating an already-posted one. |
| REQ-F-FIN-012 | Inventory-to-GL, AR/AP control-account, and bank/cash reconciliation (§5.9) **must** each have a defined tolerance policy and produce a reconciliation report with zero unexplained variance beyond that tolerance. | A reconciliation run within tolerance closes with a PASS-eligible report. | A reconciliation run outside tolerance blocks period close until the variance is investigated and resolved or explicitly accepted per §1.3.2. | Re-running reconciliation after a correcting entry reproduces a deterministic result for the same revision and inputs. |

### 5.7 Reporting / analytics

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-RPT-001 | The system **must** provide operational reports (open SO/PO, stock on hand, AR/AP open items) reflecting data as of the query time. | An open-SO report lists exactly the orders in a non-closed, non-cancelled state for the caller's organization. | A report request naming a resource outside the caller's organization is rejected before query execution. | A report query timeout returns a defined error, not a partial, silently truncated result set. |
| REQ-F-RPT-002 | The system **must** provide financial reports (trial balance, P&L, balance sheet) generated from posted journals only. | A trial balance's total debits equal total credits for the selected period. | A report including unposted (draft) journal data is rejected as a defect, not delivered as-is. | Regenerating the same report for the same period and revision reproduces identical figures. |
| REQ-F-RPT-003 | Reports **must** respect RBAC and tenant isolation at the row and field level, not only at the menu/route level. | A read-only auditor can view but not export a report field marked export-restricted, if such a restriction is configured. | A user without report permission cannot retrieve report data via a direct API call even if the UI route is hidden. | N/A — access-control check, not a stateful operation requiring recovery semantics. |
| REQ-F-RPT-004 | Users **must** export reports in at least CSV, with PDF where the report has a defined layout. | An exported CSV's row count and totals match the on-screen report for the same query. | An export request for a report type without a defined PDF layout falls back to CSV or is rejected with a clear reason, not a blank/corrupt file. | A failed export does not leave a partially written file visible to the requesting user. |
| REQ-F-RPT-005 | Scheduled report generation and delivery (email or secure download) **must** be available to authorized roles, with delivery retry and failure visibility. | A scheduled report delivers to its configured destination on schedule with a retained delivery record. | A schedule configured for a destination outside the organization's approved delivery list is rejected at save. | A failed delivery retries with backoff and surfaces in an inspectable failure queue rather than silently dropping. |
| REQ-F-RPT-006 | A dimensional BI warehouse/semantic layer may use an external vendor per OQ-04; in-app operational and financial reporting (REQ-F-RPT-001/002) remains mandatory regardless of that decision. | In-app financial reports function correctly with the BI warehouse decision unresolved or disabled. | The BI warehouse integration, if enabled, cannot read across organizations it is not authorized for. | N/A — vendor-integration availability does not gate mandatory in-app reporting. |

### 5.8 Integration

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-INT-001 | The system **must** expose authenticated public REST APIs for core resources per [§9](#9-interfaces), matching the BFF's error/idempotency vocabulary (REQ-T-API-002). | A public API call with a valid client credential returns the same resource shape as the internal BFF for the same underlying entity. | A public API call without a valid credential, or with a credential scoped to a different organization, is rejected before any domain logic runs. | A transient downstream failure returns a retryable error code, not an ambiguous 200 with partial data. |
| REQ-F-INT-002 | Integration clients **must** authenticate with API keys or OAuth 2.0 client credentials scoped to exactly one organization. | A client credential scoped to organization A cannot retrieve or mutate organization B's data even with a guessed/enumerated ID. | A revoked credential is rejected on the next request, not merely on the next token-refresh cycle. | Credential rotation supports a documented overlap window so in-flight integrations do not experience a hard cutover outage. |
| REQ-F-INT-003 | Mutation endpoints that create or post documents **must** accept an `Idempotency-Key` header, per REQ-T-API idempotency scope (§7.3). | Two identical requests with the same idempotency key return the same result and produce exactly one financial/domain effect. | Reusing the same idempotency key with a materially different payload is rejected with a defined conflict error, not silently processed as the first payload. | An idempotency key's stored result expires per a documented retention window; a request after expiry is treated as new. |
| REQ-F-INT-004 | The system **must** emit signed webhooks for material domain events (document posted, payment applied, stock adjusted) with a versioned event schema. | A subscriber can verify a webhook's signature using the current signing secret and process the event exactly once per delivery. | A webhook payload that fails signature verification is rejected by a compliant subscriber and is not required to be trusted blindly. | Redelivery of a previously delivered event (after subscriber-side failure) is safe because the event carries a stable event ID for subscriber-side deduplication. |
| REQ-F-INT-005 | Webhook delivery **must** retry with backoff and land failures in a dead-letter queue inspectable and redrivable by org admins/operators. | A failed delivery retries per the documented backoff schedule and succeeds once the subscriber recovers. | A subscriber endpoint failing repeatedly beyond a documented threshold is automatically disabled pending admin re-enable, not retried indefinitely. | An operator can redrive a dead-lettered event on demand; redrive is idempotent per REQ-F-INT-004's stable event ID. |
| REQ-F-INT-006 | Rate limiting **must** apply per organization and per client, with documented quotas, burst rules, and response headers. | A client under quota receives normal responses with remaining-quota headers populated. | A client exceeding quota receives a defined 429-equivalent response with a retry-after value, not a silent drop or generic 500. | A rate-limit counter reset (e.g. new window) is consistent across all serving instances; a client cannot bypass the limit by hitting different instances. |

### 5.9 Payments and cash management

Payments, cash application, and bank reconciliation are referenced elsewhere in this draft (finance subledger postings, idempotency, `payment applied` webhooks) but previously had no owning functional section. This closes that gap; it completes both order-to-cash (§5.3 AR) and procure-to-pay (§5.4 AP) through settlement.

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-PAY-001 | The system **must** implement customer receipts with lifecycle `draft → posted → allocated (full/partial) → closed`, supporting partial, over-, under-, and unidentified payments. | Recording a receipt and allocating it to an open AR invoice reduces the invoice's open balance and creates the balanced cash journal. | An allocation exceeding the receipt's unallocated amount, or targeting an invoice in a different organization, is rejected. | An unidentified receipt is held in a suspense account until matched; it is never silently allocated to an arbitrary invoice. |
| REQ-F-PAY-002 | The system **must** implement vendor payments with lifecycle `draft → approved → released → posted`, including payment runs (batch proposal, approval, disbursement) with separation of duties (no self-approval, cross-reference §6). | A payment run proposes eligible open AP bills; an authorized approver distinct from the preparer releases the batch for disbursement. | A preparer attempting to also approve their own payment run is rejected. | A payment-file generation retried after a transient failure produces the same file content for the same batch, not a duplicate disbursement. |
| REQ-F-PAY-003 | Payment application and unapplication **must** be idempotent under a defined key and reversible without deleting the original payment record. | Applying the same payment-application request twice under the same idempotency key produces one allocation, not two. | Unapplying an allocation restores the invoice's open balance exactly; it does not create a negative-balance state. | A duplicate-payment detector flags a second payment matching the same vendor/amount/reference within a configurable window before posting, per REQ-F-PAY-007. |
| REQ-F-PAY-004 | The system **must** implement refunds and reversals for failed, duplicate, or over-collected payments. | A refund against a posted receipt creates a balanced reversal journal and updates the customer's open-item balance. | A refund exceeding the original payment amount is rejected. | A failed refund disbursement (e.g. bank rejection) is visible in a failure queue with retry/redrive, not silently lost. |
| REQ-F-PAY-005 | The system **must** support bank-statement import (file or connector) with dry-run validation before posting. | A dry-run import reports row-level match/unmatch/reject status before any posting occurs. | An import file with unparseable rows rejects only those rows; valid rows are not blocked by invalid ones. | Re-importing the same statement file is deduplicated by statement/line identity; it does not double-post matched lines. |
| REQ-F-PAY-006 | The system **must** support automatic and manual bank matching such that every imported statement line is matched, explicitly unmatched, or explicitly rejected — no line silently disappears. | An automatically matched line ties a bank line to exactly one payment/receipt and updates the reconciled-balance calculation. | A statement line matched to two different payments is rejected as an integrity violation. | A previously auto-matched line can be unmatched and re-matched by an authorized user, with the change audited. |
| REQ-F-PAY-007 | The system **must** detect and block duplicate payments (same vendor/customer, amount, and reference within a configurable window) before posting, with an override path requiring separate permission and a recorded reason. | A near-duplicate payment attempt is blocked and surfaced for review before disbursement. | An override without the separate permission and reason is rejected. | An overridden duplicate is posted and flagged for post-hoc audit review, not silently indistinguishable from a normal payment. |
| REQ-F-PAY-008 | Reconciled bank-cash-account balances **must** tie to the general-ledger cash account with zero unexplained variance, per REQ-F-FIN-012. | A completed bank reconciliation's ending balance equals the GL cash-account balance for the same date. | A reconciliation with unexplained variance beyond tolerance blocks period close (cross-reference REQ-F-FIN-004). | Re-running reconciliation after a correcting entry reproduces a deterministic result for the same revision and inputs. |
| REQ-F-PAY-009 | The system **must** generate remittance advice for vendor payment runs and customer receipt allocations, on request or automatically per policy. | A generated remittance advice lists exactly the invoices/bills settled by that payment, with amounts matching the posted allocation. | Requesting remittance advice for a payment the caller's organization does not own is rejected. | Regenerating remittance advice for the same payment produces identical content (deterministic), not a redelivery-corrupted variant. |

### 5.10 Data imports

Imports are referenced in job and implementation sections but previously had no functional requirement set (dry run, row-level errors, partial failure, deduplication, rollback, audit).

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-IMP-001 | The system **must** support a dry-run mode for master-data and transactional imports that reports per-row validation results without writing any data. | A dry run against a file with 3 invalid rows out of 100 reports exactly those 3 rows with reasons, and writes nothing. | Attempting to commit an import that has not completed a passing (or explicitly acknowledged) dry run is rejected. | A dry run is safe to run repeatedly against the same file with no side effects. |
| REQ-F-IMP-002 | Import commit **must** apply row-level success/failure semantics: valid rows commit; invalid rows are skipped and reported, unless the organization configures all-or-nothing mode. | A commit with 3 invalid rows out of 100 imports 97 rows and reports the 3 failures with reasons and original row references. | An all-or-nothing import with any invalid row commits zero rows. | A partially committed import (row-level mode) that fails mid-batch due to an infrastructure error is resumable from the last successfully committed row, without re-applying already-committed rows (deduplicated by source-row identity). |
| REQ-F-IMP-003 | Imports **must** deduplicate against existing records using a documented natural or explicit key, with a configurable update-vs-skip policy for matches. | Re-importing the same file twice does not create duplicate master-data or transactional records. | An import row matching an existing record under skip policy does not silently overwrite fields the org intended to preserve. | A failed deduplication check (e.g. ambiguous match) is reported as a row-level error, not silently resolved by picking the first match. |
| REQ-F-IMP-004 | Imports affecting posted-document-adjacent data (e.g. opening balances) **must** be reversible via a documented rollback procedure that does not silently delete downstream posted transactions. | Rolling back an opening-balance import that has no dependent postings removes exactly the imported records. | Rolling back an import with dependent postings created after it is rejected or requires an explicit, audited reversal path instead of deletion. | A rollback retried after a partial failure completes without double-reversing already-rolled-back rows. |
| REQ-F-IMP-005 | Every import run **must** produce an audit record (actor, organization, source file identity, row counts, timestamp, and outcome) retained per REQ-N-CMP-001. | An import's audit record allows reconstructing exactly which rows succeeded, failed, or were skipped, and why. | An import run without a retained audit record is treated as NOT EVIDENCED for QG-16 purposes. | Audit-record write failure blocks the import commit from being reported as complete (fail closed, consistent with REQ-F-PLT-005). |

---

## 6. Cross-cutting requirements

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-F-X-001 | **Audit trail:** create/update/delete (or deactivate), status transitions, and financial posts **must** record actor, timestamp, organization, correlation id, and before/after or event payload sufficient for investigation. | An investigator can reconstruct a document's full state history from its audit trail alone. | An action that would change state without a corresponding audit write is rejected (fail closed). | Audit-write retries under the same correlation id do not create duplicate audit rows. |
| REQ-F-X-002 | **Idempotency:** posting and payment-application operations **must** be idempotent under the same key within a defined retention window. | A retried request with the same key returns the original result with no new side effect. | Reusing a key with a materially different payload is rejected with a defined conflict error. | After the retention window expires, the same key is treated as a new request, not silently rejected forever. |
| REQ-F-X-003 | **Void / reverse:** posted documents **must** support void or reverse paths that preserve audit history; silent delete of posted financial documents is forbidden. | Reversing a posted document creates a linked reversal; the original remains queryable in its original posted state. | A delete request against a posted financial document is rejected regardless of caller role. | Reversing an already-reversed document is rejected or is a no-op, not a double reversal. |
| REQ-F-X-004 | **Document numbering:** sequences **must** be per organization (and, once OQ-10 resolves, per entity), gap policy documented per OQ-07, and concurrency-safe. | Two concurrent document creates in the same organization receive two distinct, sequential numbers. | A number-allocation collision under concurrent load is prevented by the sequence mechanism, not resolved after the fact by renumbering. | A failed document create after number allocation either commits the number consumption per the documented gap policy or safely returns the number to the pool, consistently. |
| REQ-F-X-005 | **Optimistic concurrency:** concurrent edits of the same aggregate **must** fail safely (version/etag) rather than last-write-wins on financial aggregates. | Two concurrent edits to the same order: the second submission is rejected with a conflict, prompting a reload. | A stale-version write is rejected before it can silently overwrite a newer state. | The rejected submitter can reload the current version and reapply their change without data loss on their side. |
| REQ-F-X-006 | **Transactional outbox:** domain events destined for webhooks or jobs **must** be written in the same transaction as the business change (outbox pattern). | A posted invoice's outbox event is guaranteed to exist if the invoice commit succeeded, and vice versa. | A business-change commit that fails does not leave an orphaned outbox event. | An outbox relay crash after commit but before dispatch redelivers the event exactly once from the subscriber's perspective (via REQ-F-INT-004 stable event ID). |
| REQ-F-X-007 | **Correlation:** every request **must** carry or generate a correlation id propagated through logs, jobs, and outbound webhooks. | A single correlation id traces a request from UI action through BFF, domain service, job, and webhook delivery. | A request missing a correlation id has one generated at the edge; it is never silently omitted downstream. | N/A — propagation requirement, not a stateful recovery case. |
| REQ-F-X-008 | **Attachments:** document attachments **must** be encrypted at rest, tenant-scoped, and access-checked on download. | A download request by an authorized member of the owning organization succeeds. | A download request by a member of a different organization, even with a guessed URL, is rejected. | A short-lived download URL that expires mid-transfer requires re-authorization, not a permanently valid link. |
| REQ-F-X-009 | **Workflow-state taxonomy:** every document type's state machine **must** be drawn from one documented taxonomy (`draft → [approve] → post/confirm → void/reverse`, with `approve` explicit wherever organization policy requires separation of duties per OQ-06) — ad hoc per-document-type state names are forbidden. | A new document type's state machine maps onto the documented taxonomy without inventing an equivalent-but-differently-named state. | A document-type state machine that skips a required `approve` step where policy mandates SoD is rejected at design review, not merely at runtime. | A requester cannot self-approve above the policy threshold on any document type (cross-reference REQ-F-PUR-001, REQ-F-PAY-002). |
| REQ-F-X-010 | **Search and cache tenant isolation:** search indexes and caches **must** be keyed or filtered by `organization_id` (and entity, once OQ-10 resolves) with no cross-tenant result leakage, and **must** define a maximum staleness window relative to the source-of-truth write. | A search query returns only documents belonging to the caller's organization, even for terms common across tenants. | A cache key collision across organizations (e.g. a global cache key derived only from a document number) is prevented by construction, not by post-query filtering alone. | A cache invalidation failure after a write defaults to serving stale-but-correctly-scoped data within the documented staleness window, never cross-tenant data. |

---

## 7. Fullstack technical requirements

### 7.1 System shape

The shape below is a requirements view of the controlled Target in [ARCH-022](../architecture/ARCH-022-system-overview.md); it is not a second architecture decision.

```text
Browser → Web app (App Router)
        → BFF (Server Actions / Route Handlers)
        → Domain services by module
        → PostgreSQL (shared schema, organization_id)
        → Auth / SSO session
        → Background jobs + outbox
        → Encrypted object storage
        → Authenticated public REST (+ webhooks)
```

### 7.2 Frontend (REQ-T-UI)

| ID | Requirement |
|----|-------------|
| REQ-T-UI-001 | Primary UI **must** be a Next.js App Router TypeScript application. |
| REQ-T-UI-002 | Server Components **must** be the default for authenticated reads; Client Components for interactive grids, editors, and wizards. |
| REQ-T-UI-003 | Enterprise UX **must** include data grids, document forms, approval/post actions, and clear status machines. |
| REQ-T-UI-004 | Every interactive surface **must** provide production-ready loading, empty, and error states (no blank failures). |
| REQ-T-UI-005 | UI **must** meet accessibility baseline WCAG 2.2 AA for core workflows (login, documents, post, reports). |
| REQ-T-UI-006 | Secrets, API keys, and service credentials **must never** ship in client bundles. |
| REQ-T-UI-007 | Data grids **must** virtualize rows/columns so render cost is independent of the underlying result-set size at §8.1 scale (5M documents); a grid **must not** mount more DOM rows than are visible plus a documented overscan buffer. |
| REQ-T-UI-008 | An optimistic-concurrency conflict returned by REQ-F-X-005/REQ-T-API-009 **must** surface as a specific, actionable UI state (reload-and-diff or reload-and-reapply), never a generic error toast that discards the user's unsaved input. |
| REQ-T-UI-009 | The UI **must** detect and reconcile the same authenticated session open in multiple tabs/windows acting on the same aggregate: a stale tab **must** block or warn before submitting a write that a fresher tab has already superseded, consistent with REQ-T-API-009. |
| REQ-T-UI-010 | Core Web Vitals (LCP, INP, CLS) **must** be measured from real user sessions (RUM), not only synthetic lab runs, and **must** report against REQ-N-PERF-001 thresholds per route class (list, document, report). |

### 7.3 API and contracts (REQ-T-API)

| ID | Requirement |
|----|-------------|
| REQ-T-API-001 | First-party UI **must** use BFF adapters (Server Actions and/or Route Handlers) calling domain services—not raw cross-tenant SQL from the UI. |
| REQ-T-API-002 | Public REST **must** share the same domain services and error `code` vocabulary as the BFF. |
| REQ-T-API-003 | Input validation **must** occur at every external edge (Zod or equivalent schema validation). |
| REQ-T-API-004 | Dual parallel contract systems (e.g. GraphQL + REST as equal SSOT) are forbidden; one public HTTP catalog. |
| REQ-T-API-005 | Errors **must** return stable machine codes, human-safe messages, and correlation ids; no stack traces to clients in production. |
| REQ-T-API-006 | The public catalog **must** declare a versioning and backward-compatibility policy; breaking changes require a new version and a documented deprecation timeline with consumer notification. |
| REQ-T-API-007 | List endpoints **must** support pagination with stable cursors (not offset-only) and defined maximum page size; filtering and sorting semantics **must** be documented per resource. |
| REQ-T-API-008 | Mutation endpoints **must** support field projection or a documented default response shape, and bulk operations **must** run as asynchronous jobs with a pollable status resource, not a synchronous request that can time out. |
| REQ-T-API-009 | Optimistic-concurrency-sensitive resources **must** expose an ETag or version field; a conflicting update **must** return a defined conflict status, not overwrite silently. |
| REQ-T-API-010 | `Idempotency-Key` scope, expiry, and replay behavior **must** be documented per REQ-F-INT-003; reusing a key with a different payload **must** return a defined conflict, not the first payload's result. |
| REQ-T-API-011 | Rate-limit quotas, burst rules, and response headers (remaining quota, reset time) **must** be documented and consistent across all serving instances. |
| REQ-T-API-012 | Webhook signatures **must** use a documented algorithm and canonicalization method, a bounded replay window with timestamp validation, and a documented secret-rotation procedure with an overlap window. |
| REQ-T-API-013 | Webhook event schemas **must** be versioned; ordering is not guaranteed across events, and duplicate delivery **must** be tolerated by subscribers via the stable event ID in REQ-F-INT-004. |
| REQ-T-API-014 | The API test pack **must** verify object-level and property-level authorization (a caller with access to resource type X cannot access another organization's instance of X, and cannot read/write a field their role does not permit), not organization-membership checks alone. |
| REQ-T-API-015 | Deprecated endpoints/fields **must** be flagged in responses (header or documented field) for a minimum notice period before removal, per REQ-T-API-006. |
| REQ-T-API-016 | Request/response types **must** be inferred (`z.infer`) from the Zod schemas that already live at the adapter edge in `modules/*/schemas` (ARCH-022's sole validation pattern) and consumed identically by the BFF and any first-party client; hand-written DTOs parallel to those schemas are forbidden (ARCH-022 rejected alternative), and this requirement **must not** be satisfied by introducing a new shared package — ARCH-024's package list is closed at six and explicitly rejects a mega-package. A contract change whose schema is not updated in its owning module **must** fail CI, not surface as a runtime mismatch. |

### 7.4 Domain and modularity (REQ-T-DOM)

| ID | Requirement |
|----|-------------|
| REQ-T-DOM-001 | Backend **must** be a modular monolith in one primary deployable, with modules for platform, master data, sales, purchasing, inventory, finance, reporting, integration. |
| REQ-T-DOM-002 | Domain modules **must** expose ports; adapters implement persistence, auth, email, storage, and HTTP. |
| REQ-T-DOM-003 | Cross-module calls **must** use published application services or events—not reach into another module’s tables ad hoc. |
| REQ-T-DOM-004 | Financial posting **must** be centralized enough to enforce balance, period, and audit invariants. |

### 7.5 Data (REQ-T-DB)

| ID | Requirement |
|----|-------------|
| REQ-T-DB-001 | Primary datastore **must** be PostgreSQL. |
| REQ-T-DB-002 | Schema migrations **must** be versioned, reviewable, and reversible where data safety allows (forward-fix with expand/contract when needed). |
| REQ-T-DB-003 | Connection pooling **must** be mandatory in production. |
| REQ-T-DB-004 | Tenant tables **must** index `organization_id` for query paths that filter by tenant. |
| REQ-T-DB-005 | The controlled Target Drizzle/query layer **must** enforce the documented tenant-scoped entry pattern and **must not** provide an unscoped tenant-table bypass. |
| REQ-T-DB-006 | Domain-service query paths **must** avoid N+1 access patterns for list/detail views at §8.1 scale; a query-plan or trace review **must** be part of the REQ-N-PERF-003 candidate evidence for any changed list/report query. |
| REQ-T-DB-007 | Schema migrations **must** be rehearsed against a production-scale, tenant-representative dataset on an ephemeral database branch before promotion, consistent with the single-branch local-dev policy; the rehearsal branch **must** be discarded after producing its evidence artifact, never left as a second persistent environment. |

### 7.6 AuthN / AuthZ (REQ-T-AUTH)

| ID | Requirement |
|----|-------------|
| REQ-T-AUTH-001 | The controlled Neon Auth integration **must** support the approved email/password flow and an enterprise federation path without introducing a parallel identity authority. |
| REQ-T-AUTH-002 | Authorization **must** evaluate organization membership + permission before domain mutations. |
| REQ-T-AUTH-003 | Integration credentials **must** be rotatable, scoped, and revocable without recycling user passwords. |
| REQ-T-AUTH-004 | Session fixation / CSRF protections appropriate to cookie or bearer strategies **must** be in place for the BFF. |

### 7.7 Jobs and files (REQ-T-JOB / REQ-T-FILE)

| ID | Requirement |
|----|-------------|
| REQ-T-JOB-001 | Background processing **must** be durable (survive process restart) for webhooks, reports, imports, and FX revaluation. |
| REQ-T-JOB-002 | Failed jobs **must** be visible, redriveable, and alertable. |
| REQ-T-FILE-001 | Object storage **must** encrypt objects at rest; URLs **must** be short-lived and authorized. |
| REQ-T-FILE-002 | Malware scanning of uploads is required before making files generally downloadable; vendor choice is open ([§12.2](#122-open-decisions)). |

### 7.8 Deploy and observability (REQ-T-OPS)

| ID | Requirement |
|----|-------------|
| REQ-T-OPS-001 | Configuration **must** be env-validated at boot; missing critical secrets **must** fail fast. |
| REQ-T-OPS-002 | Structured logs, metrics, and distributed traces **must** be emitted with organization id where safe and correlation id always. |
| REQ-T-OPS-003 | Health and readiness endpoints **must** exist for orchestrators. |
| REQ-T-OPS-004 | Multi-environment promotion (dev → staging → prod) **must** be documentable with the same artifact. |
| REQ-T-OPS-005 | PII and secrets **must** be redacted from logs by default. |
| REQ-T-OPS-006 | Configuration **must** distinguish **critical** secrets (REQ-T-OPS-001 fail-fast: e.g. database, auth) from **optional third-party integration** configuration (tax engine per OQ-01, object-storage/malware-scan vendor per OQ-02, bank/payment connector per OQ-11, e-invoicing transmission per OQ-18). An unconfigured optional integration **must** degrade that specific capability to a defined "unavailable" state (blocked action with a clear reason, not a generic error) **without** failing application boot or unrelated capabilities. |

Positive/adverse/recovery detail for REQ-T-OPS-006: a deployment missing the e-invoicing vendor key still serves every non-e-invoicing workflow normally (**positive**); a user attempting an e-invoicing-dependent action against that deployment receives a defined "integration not configured" response, not a 500 or a silent no-op (**adverse**); configuring the missing key without a redeploy of unrelated capabilities re-enables the capability on next config read, and no data written while the integration was unavailable is lost or corrupted (**recovery**).

### 7.9 Search and cache (REQ-T-SRCH)

Search and cache isolation is a QG-03 requirement (§1.3); this subsection supplies the technical requirement set that was previously missing.

| ID | Requirement |
|----|-------------|
| REQ-T-SRCH-001 | Search indexes **must** key or filter every document by `organization_id` (and entity, once OQ-10 resolves); an unscoped index query path **must not** exist. |
| REQ-T-SRCH-002 | Cache keys for tenant-scoped data **must** include `organization_id` in the key composition, not rely on post-fetch filtering of a shared-key cache entry. |
| REQ-T-SRCH-003 | Search-index and cache staleness relative to the source-of-truth write **must** have a documented maximum window; invalidation failures **must** fail toward staleness within that window, never toward cross-tenant disclosure. |
| REQ-T-SRCH-004 | A static check or equivalent CI gate **must** prohibit introducing an unscoped repository/cache/search access path (cross-reference REQ-T-DB-005 and QG-16). |

### 7.10 Runtime and background-execution model (REQ-T-RUN)

The controlled hosting posture is Node-default on Vercel with Neon proximity (ARCH-010/ARCH-031). Vercel functions are stateless and time-bounded; REQ-T-JOB-001's durability requirement cannot be satisfied by an in-process timer or a long-lived in-request loop on that runtime. This subsection makes that constraint an explicit requirement rather than a silent assumption, and is a direct input to OQ-03.

| ID | Requirement |
|----|-------------|
| REQ-T-RUN-001 | Every HTTP-triggered route/action **must** complete (or hand off to a durable background mechanism) within the hosting platform's documented function-timeout budget; no request path may assume unbounded in-process execution time. |
| REQ-T-RUN-002 | Durable background work (webhooks, reports, imports, FX revaluation, payment runs, redrive) **must** run on a mechanism that survives function invocation boundaries and process restarts — an external queue/worker or equivalent durable-execution service selected under OQ-03 — not an in-memory scheduler tied to a single function instance's lifetime. |
| REQ-T-RUN-003 | Per ARCH-022's controlled runtime decision (Node default; Edge only as a documented exception, because Neon/DB drivers and the session model assume Node), routes **must** declare their runtime explicitly: webhook signature verification, database access via the Neon pooler, and cryptographic operations **must** run on Node. Any route proposing Edge **must** record it as a documented exception with the rationale for why it has no Node-only dependency, not a default choice. |
| REQ-T-RUN-004 | Each database-accessing invocation **must** acquire connections through the production pooler (`-pooler` `DATABASE_URL`, per the repository's Neon posture) and release them before the invocation ends; a request path that holds a connection across an awaited external call (e.g. webhook delivery, tax-vendor lookup) without an explicit timeout **must not** ship. |

### 7.11 Progressive delivery (REQ-T-FLAG)

§11's delivery-sequencing principle ("delivery sequencing is not quality reduction") requires a mechanism to expose a completed increment to a limited audience without redeploying or silently relaxing a gate. This subsection supplies that mechanism.

| ID | Requirement |
|----|-------------|
| REQ-T-FLAG-001 | Production-exposed increments from §11 **must** ship behind a feature flag evaluated per organization, defaulting to off, so a module can be dark-shipped and gated by pilot-organization allowlist per the §16.1 limited-organization-pilot stage. |
| REQ-T-FLAG-002 | A flag **must** have a documented owner, default state, and removal plan; a flag left permanently on for 100% of organizations without removal is a documentation defect, not a shipped feature toggle. |
| REQ-T-FLAG-003 | Flipping a flag off **must** fail closed for the gated capability (consistent with §16.2 rollback principles) without deleting or corrupting data already created while the flag was on. |

### 7.12 Monorepo build and package-boundary verification (REQ-T-MONO)

ARCH-022/ARCH-024 already decide the workspace shape (Turborepo + pnpm, one app, six named packages, no mega-package). This subsection does not restate that decision; it supplies the CI-enforceable acceptance criteria that make the decision's own stated failure modes (§ ARCH-024 "Failure modes": cross-package `src/` import, circular dependency, undeclared exports) into verifiable requirements rather than prose intent, and closes the monorepo-specific gaps (cache-boundary correctness, phantom dependencies, version drift) that ARCH-022/024 name as accepted costs but do not yet turn into gated checks.

| ID | Requirement | Positive case | Adverse case | Recovery / concurrency case |
|----|-------------|----------------|----------------|-------------------------------|
| REQ-T-MONO-001 | CI **must** enforce ARCH-024's package-boundary rules — no import of a package's `src/` internals, no relative `../../packages/*` import, `@afenda/*` name only — via a static check (Biome import-path rule or `publint`-equivalent) that blocks merge on violation. | A PR importing `@afenda/db` by its public export passes the check. | A PR importing `packages/db/src/client` directly, or via a relative path, fails CI with a rule-specific error, not a generic build failure. | Re-running the check on the same commit is deterministic; it does not pass on retry without a code change. |
| REQ-T-MONO-002 | `turbo.json` task `dependsOn`/`outputs` declarations **must** be verified periodically against actual build behavior: a change to a package's public surface **must** invalidate every dependent's cached build/test/typecheck result. | A change to `@afenda/db`'s public export invalidates the cached `apps/web` build on the next run. | A cache-correctness check that intentionally changes a public export and finds a stale cache hit on a dependent fails and blocks the QG-11 evidence claim. | Restoring an intentionally stale cache for testing does not leave the shared/remote cache corrupted for other branches. |
| REQ-T-MONO-003 | The workspace root **must** pin exactly one `packageManager` version (pnpm) and one Node engine range; no package may declare a conflicting `engines` value. | `pnpm install` on a fresh clone with the pinned Node version succeeds without a version-mismatch warning. | A package declaring a different `packageManager` or an incompatible `engines` range fails CI at install time, not at a later, harder-to-diagnose build step. | A CI runner using a mismatched pre-installed Node/pnpm version fails fast with a clear message, not a silent partial install. |
| REQ-T-MONO-004 | No package **must** import a dependency it has not declared in its own `package.json` (no phantom dependency reliance on pnpm's hoisting or a sibling package's transitive dependency). | A package's declared dependencies are sufficient to build it in isolation (e.g. via `pnpm --filter` with an isolated `node_modules`). | A package importing an undeclared dependency fails a phantom-dependency lint/check in CI, not only at a future pnpm-version upgrade. | Adding the missing declared dependency and re-running the check is deterministic and requires no other workaround. |
| REQ-T-MONO-005 | Root `package.json` **must** hold devDependencies only, per ARCH-022's explicit constraint; a runtime dependency added at root **must** fail a CI check, not merely a manual review. | The root `package.json`'s `dependencies` field is empty or absent; all runtime deps live in `apps/web` or the owning package. | A PR adding a runtime dependency to the root `package.json` fails CI with a rule-specific message. | N/A — structural/static check, not a stateful operation. |
| REQ-T-MONO-006 | Any new package beyond ARCH-024's six, or any new deployable beyond `apps/web`, **must not** be created without a preceding ADR; likewise, any new bounded context beyond ARCH-006's four **must not** be created without a preceding ADR (cross-reference OQ-20). A CI check **must** fail a PR that adds a new top-level `packages/*` or `apps/*` directory, or a new top-level `modules/*` directory, without a corresponding ADR reference in the PR description or an approved manifest entry. | A PR adding a reviewed, ADR-referenced new package passes the check because the ADR reference is present. | A PR adding an unreferenced new package or app directory fails the check, surfacing the missing-ADR reason explicitly. | N/A — structural/static check, not a stateful operation. |

---

## 8. Non-functional requirements and acceptance envelope

### 8.1 Minimum acceptance workload

This is the minimum production-readiness test envelope, not a sales forecast or unlimited-scale promise. Product and Platform must ratify it before controlled promotion.

| Dimension | Minimum test envelope |
|-----------|-----------------------|
| Organizations | 1,000 active organizations with tenant-size skew, including one at 100 times median data volume |
| Identities | 100,000 registered users and integration principals |
| Concurrency | 500 concurrent authenticated sessions |
| Request load | 100 requests/second sustained for 60 minutes; 300 requests/second burst for 15 minutes |
| Financial data | 10 million journal lines overall; at least 1 million for the largest test organization |
| Documents | 5 million business documents across sales, purchasing, inventory, and finance |
| Background work | 10,000 queued jobs with retry, poison-message, and redrive scenarios |
| Files | 1 million metadata records with representative encrypted object sizes |
| Isolation | At least two canary organizations and two roles per organization in every isolation run |

Results must name dataset, concurrency, traffic mix, region, build revision, database branch, cache state, and excluded third-party time.

### 8.2 Non-functional requirements

| ID | Requirement and measurable acceptance |
|----|-----------------------------------------|
| REQ-N-SEC-001 | External traffic must use TLS 1.2 or later; sensitive persisted data and object storage must use provider encryption at rest. Configuration and certificate checks run before promotion. |
| REQ-N-SEC-002 | The application must satisfy OWASP ASVS Level 2 as minimum baseline, with stronger risk-selected controls for privileged admin, isolation, financial posting, credentials, and audit. |
| REQ-N-SEC-003 | Candidate artifacts must pass secret, dependency, SAST, and applicable DAST checks. No known exploitable Critical or High finding may ship. Remediation targets: Critical 24 hours, High 7 days, Medium 30 days unless stricter policy applies. |
| REQ-N-SEC-004 | Independent penetration testing occurs before GA, annually, and after material trust-boundary/auth changes. Blocking findings close or satisfy §1.3 exception rules. |
| REQ-N-AVL-001 | Primary authenticated web and public API surfaces achieve 99.9% monthly availability. Exclusions and measurement source are defined before launch. |
| REQ-N-AVL-002 | Alerting detects objective-threatening availability, latency, correctness, queue, database, auth, and integration failures within 5 minutes and routes to a named owner. |
| REQ-N-DR-001 | Recovery demonstrates RPO no greater than 15 minutes and RTO no greater than 4 hours for a regional database/critical-state scenario. |
| REQ-N-DR-002 | A production-representative restore passes quarterly; a regional exercise passes annually with measured objectives, integrity/reconciliation results, gaps, and actions. |
| REQ-N-PERF-001 | At §8.1 load, core pages complete at p95 within 3 seconds and p99 within 5 seconds; API/BFF work excluding intentional async operations completes at p95 within 750 ms and p99 within 1.5 seconds. |
| REQ-N-PERF-002 | Posting a document up to 100 lines completes at p95 within 2 seconds excluding external tax/bank latency while preserving idempotency and financial invariants. |
| REQ-N-PERF-003 | The largest test organization cannot cause another organization to breach latency objectives or exhaust shared connections during §8.1 tests. |
| REQ-N-SCALE-001 | The system passes §8.1 without per-tenant deployables, manual sharding, leakage, connection exhaustion, or unbounded queue growth. |
| REQ-N-A11Y-001 | Complete core processes—auth, org switch, create/approve/post/reverse, reporting, error recovery—conform to WCAG 2.2 AA across supported responsive layouts. |
| REQ-N-I18N-001 | Strings are externalized. Locale, timezone, currency, number, date, sorting, text expansion, and fallback pass for primary and one structurally different secondary locale. |
| REQ-N-CMP-001 | Retention and legal-hold policies are configuration-backed and cannot remove posted financial or audit history contrary to policy. |
| REQ-N-CMP-002 | Authorized organization export is complete, isolated, encrypted, auditable, and deleted after its approved availability window. |
| REQ-N-OBS-001 | Material requests, jobs, postings, reports, file operations, and webhooks propagate a correlation id. Logs identify organization only where safe and redact secrets/sensitive values. |
| REQ-N-CHG-001 | The same immutable artifact is promoted through staging and production; differences are limited to validated external configuration. |
| REQ-N-CHG-002 | Schema changes are rehearsed against production-scale representative data and include expand/contract compatibility, verification, and restore or forward-fix instructions. |
| REQ-N-SUP-001 | Before release, ownership, escalation, diagnostics, runbooks, dashboards, alerts, limits, and customer-impact communication are reviewed and exercised. |

### 8.3 Measurement rules

- Use server and browser journey percentiles; averages cannot replace p95/p99.
- Availability uses successful eligible requests over all eligible requests from the agreed telemetry source.
- Include cold/warm paths, cache misses, contention, retry storms, dependency degradation, and failed deployment/migration rehearsal.
- Evidence without exact revision, environment, workload, scenario, artifact, date, and owner is NOT EVIDENCED.
- Threshold changes are requirement changes; do not tune them after failure merely to obtain PASS.

---

## 9. Interfaces

Resource catalog is **requirements-level** (names and verbs). It is **not** an OpenAPI SSOT until a controlled API pack is published.

### 9.1 Platform

| Resource | Verbs (indicative) |
|----------|--------------------|
| `/organizations` | create, get, patch, suspend |
| `/organizations/{id}/members` | list, invite, patch role, remove |
| `/organizations/{id}/roles` | list, create, patch |
| `/sessions` / auth provider callbacks | create, revoke (provider-specific) |

### 9.2 Master data

| Resource | Verbs |
|----------|-------|
| `/customers`, `/vendors` | CRUD-ish + deactivate |
| `/items`, `/uoms`, `/price-lists` | CRUD-ish |
| `/warehouses`, `/locations` | CRUD-ish |

### 9.3 Sales / purchasing / inventory

| Resource | Verbs |
|----------|-------|
| `/quotes`, `/sales-orders`, `/deliveries` | create, get, list, transition |
| `/ar-invoices`, `/credit-notes` | create, get, list, post, void/reverse |
| `/purchase-requisitions`, `/purchase-orders`, `/goods-receipts` | create, get, list, transition |
| `/ap-bills`, `/debit-notes` | create, get, list, post, void/reverse |
| `/stock-levels`, `/stock-movements`, `/cycle-counts` | get/list or create+post |

### 9.4 Finance / reporting / integration

| Resource | Verbs |
|----------|-------|
| `/accounts`, `/journals`, `/periods` | manage + post/close |
| `/fx-rates` | upsert effective-dated rates |
| `/reports/{type}` | run, export, schedule |
| `/webhooks`, `/api-clients` | manage subscriptions and credentials |
| Idempotency | header `Idempotency-Key` on posts |

### 9.5 Payments and bank reconciliation

| Resource | Verbs |
|----------|-------|
| `/customer-receipts` | create, get, list, allocate, unallocate, refund |
| `/vendor-payments` | create, get, list, submit-run, approve-run, release-run |
| `/payment-runs` | create, get, list, approve, disburse |
| `/bank-statements` | import (dry-run + commit), get, list |
| `/bank-matches` | list, match, unmatch, reject |
| `/remittance-advices` | get, list, regenerate |

### 9.6 Imports

| Resource | Verbs |
|----------|-------|
| `/imports/{resource}` | dry-run, commit, get status, list rows, rollback |

### 9.7 Contract detail (applies to every resource above)

| Concern | Requirement reference | Minimum contract detail |
|---------|------------------------|--------------------------|
| Versioning | REQ-T-API-006 | Version in path or header; deprecation notice period declared before removal |
| Pagination | REQ-T-API-007 | Cursor-based; documented maximum page size per resource |
| Idempotency | REQ-T-API-010, REQ-F-INT-003 | `Idempotency-Key` on every create/post/allocate verb; documented retention window |
| Concurrency | REQ-T-API-009 | ETag/version on every resource subject to REQ-F-X-005 |
| Rate limits | REQ-T-API-011 | Per-organization and per-client quota with response headers |
| Webhooks | REQ-T-API-012, REQ-T-API-013 | Signed, versioned, replay-window bounded, subscriber-deduplicated by stable event ID |
| Authorization test scope | REQ-T-API-014 | Object-level and property-level, not organization-membership alone |

All listed resources are **organization-scoped** unless explicitly platform-operator routes.

---

## 10. Risks and mitigations

| Risk | Impact | Leading signal / trigger | Required mitigation | Accountable owner | Release implication |
|------|--------|--------------------------|---------------------|-------------------|---------------------|
| Cross-tenant or cross-role disclosure | Critical legal/trust breach | Canary mismatch, missing org predicate, cache-scope collision, export anomaly | Hard predicates, permission checks, isolation tests across adapters/jobs/files, fail-closed cache policy | Security + Platform | Non-waivable stop |
| Incorrect financial posting | Material misstatement | Reconciliation variance, imbalance, duplicate post, closed-period write | Central invariants, idempotency, period locks, immutable reversal, golden-ledger suite | Finance owner | Non-waivable stop |
| Migration corruption | Data loss or outage | Rehearsal mismatch, long lock, failed backfill, checksum drift | Expand/contract, production-scale rehearsal, restore proof, forward-fix plan | Data + Platform | Stop until recovery passes |
| Dual write without outbox | Lost events/inconsistency | Business commit without outbox, retry divergence | Transactional outbox, idempotent consumer, retries, DLQ, reconciliation | Integration | Stop affected release |
| Noisy neighbor | Multi-tenant outage | Pool saturation, timeout growth, traffic skew | Budgets, timeouts, rate limits, index review, isolation load test | Platform | Stop if §8 fails |
| IdP outage/misconfiguration | Login or privileged-operation outage | Auth errors, token failure, provider incident | Tested dependency failure mode, session behavior, audited platform break-glass | Identity + Operations | Stop if recovery unverified |
| Tax/localization gap | Regulatory/accounting error | Unsupported jurisdiction, missing rounding/posting rule | Market gate, tax contract, jurisdiction review, reconciliation | Product + Finance | Blocks affected market |
| Queue poison/retry storm | Delayed work and exhaustion | Retry amplification, oldest-job age, DLQ growth | Retry budget, DLQ, circuit limits, redrive/reconciliation runbook | Operations + Integration | Stop if containment unverified |
| Scope expansion | Delivery/control failure | New excluded domain without decision | Enforce §3.2 and controlled scope decision | Product | Blocks unapproved scope |
| Legal-entity/tenant model ambiguity | Multi-entity customers cannot be onboarded correctly; consolidated reporting is unreliable | Customer request for entity-level ledgers, intercompany transactions attempted without entity model | Resolve OQ-10; implement REQ-F-ENT-\* only after selection | Product Architecture | Blocks multi-entity onboarding until OQ-10 closes |
| Payment/bank process gap | Order-to-cash and procure-to-pay cannot settle; unreconciled cash | Receipts/payments requested with no functional module | Implement §5.9 before GA claim of financial completeness | Finance owner | Blocks QG-02/QG-18 PASS |
| Identity/SoD control gap | Privileged or financial action taken without adequate assurance or approval separation | Missing MFA/step-up, self-approval observed in test | Implement QG-14 controls (§1.3) before privileged/financial GA | Identity + Security | Blocks QG-14 PASS |
| Evidence-inheritance ambiguity | Stale evidence misrepresented as current for a new revision | Aged evidence cited without an applicability decision | Enforce §1.3.1 evidence applicability decision before reuse | Release manager | Defaults to NOT EVIDENCED |
| Exception-state misuse | Waived requirement silently reported as PASS | ACCEPTED RISK requirement missing owner/expiry/compensating control | Enforce §1.3.2 exception fields; reject malformed exceptions | Release manager + affected owners | Blocks release sign-off until corrected |
| Serverless execution-model mismatch | REQ-T-JOB-001 durability requirement cannot be met by an in-process scheduler on a stateless, time-bounded function runtime | Job silently stops after a function invocation ends; missed FX/report/webhook runs with no error | Select and implement the OQ-03 durable queue/worker per §7.10 before any production-exposed background-dependent increment | Platform + Operations | Blocks QG-05/QG-11 PASS for the affected increment |
| Contract-drift between BFF and public REST | Frontend or integration client silently breaks on an unreflected contract change | Runtime type mismatch not caught by CI; a module's Zod schema (REQ-T-API-016) changed without its `z.infer` consumers being updated | Enforce a CI gate that fails when a schema change and its consumer types diverge; no new shared-contracts package (ARCH-024 closed package list) | API owner + Frontend | Blocks QG-12 PASS |
| **Module/bounded-context scope mismatch** | The §5 ERP module set has no home in ARCH-006's controlled bounded-context list; implementing against §11's delivery order without resolving OQ-20 would mean writing product code with no approved architectural home — a direct anti-contamination and "no invented bounded context" violation | Any attempt to start §11 increment 2+ before an ADR extends ARCH-006, or before an explicit scope-separation decision is recorded | Resolve OQ-20 (ADR extending ARCH-006, or explicit scope-separation ruling) before any implementation slice begins | Product Architecture + Platform | **Blocks all implementation** — this is a controlled-authority boundary, not a quality gate; §1.4 forbids this draft from silently reopening or superseding ARCH-006, so it is distinct from and does not expand the fixed §1.3 non-waivable-conditions list |
| Stale evidence | Unsupported readiness claim | Revision/date mismatch or missing artifact | Evidence index, freshness policy, candidate rerun | Release manager | Defaults to NOT EVIDENCED |

---

## 11. Implementation delivery order

Sequencing controls dependency order only. Every production-exposed increment must satisfy all applicable §1.3 quality gates.

| Order | Increment | Entry condition | Required exit evidence | Rollback / stop condition |
|-------|-----------|-----------------|------------------------|---------------------------|
| 1 | Controlled requirements and architecture | Scope, owners, assumptions, open decisions named | Approved controlled docs, traceable IDs, no competing authority | Stop on ownership/authority conflict |
| 2 | Platform, identity, tenancy | Controlled tenancy/auth architecture and threat model | Cross-org/role isolation, session switch, RBAC, audit, env, observability | Roll back exposure on isolation/auth bypass |
| 3 | Master data | Platform gates pass | Invariants, deactivate/history, import validation, audit, tenancy | Disable writes/imports on integrity/isolation failure |
| 4 | Inventory | Master-data integrity and posting design approved | Ledger immutability, concurrency, valuation, reversal, reconciliation | Stop posting; reverse through controlled documents |
| 5 | Sales and purchasing | Inventory and approval dependencies pass | State machines, exceptions, reservations, receipts, matching, idempotency, audit | Disable transition; never delete posted state |
| 6 | Finance | Posting, chart, periods, FX and tax decisions approved | Golden-ledger, balanced journals, subledger reconciliation, close/reopen, recovery | Stop posting on unexplained variance |
| 7 | Reporting and integration | Source ledgers/contracts stable | As-of reports, exports, RBAC, REST, signing, retry/DLQ, reconciliation | Disable delivery/integration; preserve ledgers |
| 8 | Hardening and launch | Functional increments complete in staging | Applicable QG-01…QG-13 PASS; restore/rollback exercised; support handoff signed | No launch with FAIL, BLOCKED, NOT EVIDENCED, or stale evidence |

A partial UI without isolation, posting without audit/reconciliation, REST without idempotency, or a deployed service without restore/support evidence is not a production increment.

---

## 12. Open decisions and resolved constraints

### 12.1 Resolved controlled constraints

These are not open vendor selections in this draft.

| Concern | Controlled position | Authority |
|---------|---------------------|-----------|
| System shape | One Next.js modular-monolith deployable with Hexagonal boundaries; Turborepo + pnpm workspace: exactly one app (`apps/web`, the sole Vercel deploy target) and six named packages (`@afenda/db`, `@afenda/auth`, `@afenda/env`, `@afenda/ui`, `@afenda/emails`, `@afenda/config`); **no mega-package** (`@afenda/shared`) — an explicitly rejected alternative; root `package.json` holds devDependencies only; cross-package imports use `@afenda/*` names only, never relative `../../packages/` paths or a package's `src/` internals | ARCH-022, ARCH-024 |
| Bounded contexts | Living/Target domain contexts are **Identity, Declarations, Trade (Feed Farm Trade), and Platform** under `apps/web/modules/{identity,declarations,fft,platform}`; a new bounded context requires a new ADR before code exists ("Scaling path — needs ADR"); inventing a context as a stepping stone (e.g. a placeholder `modules/trade/`-style path) is forbidden | ARCH-006 |
| Tenancy | Shared schema with hard organization_id predicates; no schema/project-per-tenant default | ARCH-023 |
| Data access | Target Drizzle ORM and approved Neon access; no parallel ORM | ARCH-025 / ARCH-031 |
| Authentication | Neon Auth; no custom JWT/Auth.js/Clerk/Supabase replacement | ARCH-026 / ARCH-031 |
| UI foundation | Controlled Afenda design-system/UI stack; no independent kit choice here | ARCH-015 / ARCH-017 / ARCH-018 / ARCH-031 |
| Public interface | One REST/port model; no parallel GraphQL or tRPC authority | ARCH-029 / API-001 |
| Runtime/hosting | Node default, Vercel posture and Neon proximity | ARCH-010 / ARCH-031 |

### 12.2 Open decisions

| ID | Decision required | Accountable owner | Decision evidence | Deadline / blocks |
|----|-------------------|-------------------|-------------------|-------------------|
| OQ-01 | Tax engine and jurisdiction strategy | Product + Finance + Legal | Jurisdiction matrix, posting contract, vendor/security assessment | Before taxable transactions per market |
| OQ-02 | Object storage and malware scanning | Platform + Security | Threat model, residency/cost review, scan/quarantine test | Before production file upload |
| OQ-03 | Durable job/queue implementation — required by REQ-T-RUN-002 because the controlled Vercel/Node runtime cannot host an in-process durable scheduler | Platform + Operations | Failure comparison, retry/DLQ/redrive proof, function-timeout-boundary test | Before reports, webhooks, imports, FX jobs, payment runs |
| OQ-04 | Advanced BI warehouse/semantic layer | Data + Product | Workload, latency, governance, cost decision | Does not block mandatory reports |
| OQ-05 | Regional DR topology beyond primary deployment | Platform + Risk | Threat analysis and recovery exercise design | Before multi-region commitment |
| OQ-06 | Permission and separation-of-duty catalog | Security + Domain owners | Actor-action-resource matrix and abuse review | Before module mutations |
| OQ-07 | Document-number gap policy by market | Finance + Legal | Jurisdiction policy and reversal/reissue rules | Before first financial posting per market |
| OQ-08 | Capacity forecast above §8.1 | Product + Platform | Customer forecast, workload, cost budget | Before commitments above tested envelope |
| OQ-09 | Retention maxima for audit, finance, files and exports | Legal + Security + Data owner | Jurisdiction/contract matrix and hold/deletion design | Before production retention config |
| OQ-10 | Legal-entity/group model — Model A (multi-entity organization) vs. Model B (organization = one entity, separate group plane) | Product Architecture + Finance | Customer-segment analysis, §4.5 model comparison, chosen model's requirement set ratified | Before onboarding any multi-entity customer; blocks REQ-F-ENT-\* |
| OQ-11 | Payment and bank-connector architecture (in-house vs. vendor rails, file format, connector security model) | Platform + Finance + Security | Vendor/security assessment, connector threat model, reconciliation proof | Before §5.9 payment/bank features reach production |
| OQ-12 | Database tenant defense-in-depth beyond application predicates (e.g. PostgreSQL RLS or equivalent) | Data Platform + Security | Threat model, adverse cross-tenant test suite result, performance impact assessment | Before QG-16 PASS |
| OQ-13 | Encryption/key-management model (key ownership, rotation, per-tenant keys vs. shared) | Security + Platform | Key-management design, rotation rehearsal, access-audit sample | Before QG-15 PASS |
| OQ-14 | Data residency and regional placement per market | Legal + Platform | Residency requirement matrix, region-to-data mapping | Before onboarding a customer in a residency-constrained market |
| OQ-15 | Supported markets and accounting frameworks (statutory chart-of-accounts variants, local GAAP/IFRS posture) | Product + Finance + Legal | Market-support matrix, framework gap analysis | Before marketing readiness in a given market |
| OQ-16 | Tenant termination and deletion procedure (export manifest, legal-hold precedence, cryptographic erasure where applicable) | Legal + Security + Data owner | Termination runbook, deletion/anonymization test, backup-deletion behavior proof | Before QG-15 PASS |
| OQ-17 | SaaS subscription, plan, and entitlement ownership (billing system, plan-to-permission mapping, quota enforcement) | Product + Platform | Entitlement model, billing-integration design | Before GA commercial launch |
| OQ-18 | E-invoicing and statutory reporting obligations per market | Product + Finance + Legal | Jurisdiction e-invoicing mandate matrix, format/transmission design | Before taxable transactions in a mandate market |
| OQ-19 | Supported browsers, locales, and the accessibility test matrix, including an i18n tooling decision (e.g. build-time-validated translation catalogs) if more than one locale ships | Frontend + Design + QA | Browser/locale support matrix, WCAG 2.2 AA test plan per REQ-N-A11Y-001, chosen i18n library/workflow | Before QG-10 PASS |
| OQ-20 | **Module/bounded-context mapping (release-blocking, confirmed conflict — see §1.4.1).** ARCH-006's Living/Target bounded-context list (Identity, Declarations, Trade/FFT, Platform) has no Sales, Purchasing, Inventory, Finance, Master Data, Reporting, Payments, or Integration context. Decide whether the §5 ERP module set becomes new bounded contexts under `apps/web/modules/*` via one or more ADRs, or whether this draft describes a distinct future product surface outside the current Afenda-Lite Target scope entirely. | Product Architecture + Platform | ADR(s) extending ARCH-006's context map, or an explicit scope-separation decision recorded against this draft | Before any §11 implementation increment begins — this blocks the entire delivery order, not one module |
| OQ-21 | Package publishing/versioning strategy if any `@afenda/*` package (e.g. `@afenda/ui`, or a future contract/type export) is ever published outside the private workspace | Platform | Semver policy, changeset/release-pipeline design, npm-publish threat model | Before any package crosses from private-workspace-only to externally published, per ARCH-024 "Known limits" |
| OQ-22 | Ownership home for cross-cutting concerns that comparable SaaS monorepo templates isolate into dedicated packages but that ARCH-024's closed six-package list does not name an owner for: request rate-limiting (REQ-F-INT-006), webhook signing/verification (REQ-F-INT-004/005), and durable scheduled/cron work (REQ-T-RUN-002, OQ-03). Decide whether each lives inside an existing package's public surface (e.g. rate-limiting inside `@afenda/auth` as a session-adjacent security concern), as `apps/web/modules/platform/*` domain code with no package export, or requires a new package — the last option needs an ADR extending ARCH-024's closed list, not a silent addition. | Platform + Backend Architecture | Ownership decision recorded against ARCH-024's package contract table (new ADR only if a new package is chosen) | Before REQ-F-INT-004/005/006 or REQ-T-RUN-002 reach production implementation |

Source note for OQ-22: this question surfaced from comparing this draft against a reference Turborepo SaaS template that isolates `rate-limit`, `webhooks`, and `cron` as their own packages — a structurally reasonable pattern in general, but not directly portable here because ARCH-024's package list is closed and explicitly rejects a mega-package; the decision is *where these concerns live inside the existing closed set or through a new ADR*, not whether to adopt the reference template's package split wholesale.

Open decisions remain BLOCKED or NOT EVIDENCED; they must not be represented as selected architecture. **OQ-20 is the most consequential entry in this table**: unlike OQ-01–OQ-19, it is not a pending choice among options — it is a confirmed scope conflict between this draft and the controlled bounded-context authority, and it gates every other open decision's practical relevance.

### 12.3 Authority-conflict matrix

The matrix lives in §1.4.1, not duplicated here. One row is already populated with a confirmed finding (the §5 module set vs. ARCH-006 bounded contexts, tracked as OQ-20); every other `REQ-F-*`/`REQ-T-*`/`QG-*` family against the controlled documents in §14.1 remains a template row pending accountable-owner review. A partially completed matrix keeps architecture compatibility at BLOCKED per §12.1's own framing — the resolved constraints in §12.1 describe direction, not a completed conflict review.

---

## 13. Authority and promotion boundary

| Concern | This scratch draft | Controlled authority |
|---------|--------------------|----------------------|
| Enterprise production quality definition | Working proposal | Approved cross-cutting quality/release authority after promotion |
| Product requirements | Working proposal | Owning module MOD-001…008 after scope approval |
| Evidence and readiness | Defines required shape only | Owning module MOD-009/010 and release governance |
| Tenancy and platform RBAC | Must conform; cannot redefine | ARCH-023 |
| System, packages, data, auth, environment, deployment | Must conform; cannot select alternatives | ARCH-010 and ARCH-022…028 |
| HTTP, Actions, errors, schemas, idempotency, compatibility | Requirements intent only | ARCH-029 and controlled docs/api |
| Module ownership and roadmap | Candidate list only | MOD-002 and each 10-MOD spine |
| Operations, incidents, recovery and rollback | Sets outcomes only | Controlled runbooks and module MOD-008 |
| Single material choices | May identify decision need | Controlled ADR |

Promotion requires an approved home and ID, explicit owner, bounded DOC-001 work, DOC-002 registration, authority-conflict review, assumptions resolved or blocked, and documentation-integrity validation. Until then, this file is never evidence that a capability is implemented or ready.

---

## 14. Standards and controlled references

### 14.1 Controlled repository authorities

- [DOC-001](../_control/DOC-001-documentation-control-standard.md) — documentation lifecycle, ID, version and control-state rules
- [DOC-003](../_control/DOC-003-controlled-document-template.md) — controlled-document structure
- [MOD-002](../modules/MOD-002-modules-index.md) — module requirement ownership, evidence semantics, Module Enterprise Readiness
- [ARCH-010](../architecture/ARCH-010-backend-conventions.md) — runtime and deployment conventions
- [ARCH-022](../architecture/ARCH-022-system-overview.md) — Target system shape
- [ARCH-023](../architecture/ARCH-023-multi-tenancy.md) — shared-schema tenancy and platform RBAC
- [ARCH-025](../architecture/ARCH-025-data-layer.md) — Target data layer
- [ARCH-026](../architecture/ARCH-026-auth-session.md) — authentication and session model
- [ARCH-028](../architecture/ARCH-028-implementation-slices.md) — implementation sequencing and anti-contamination
- [ARCH-029](../architecture/ARCH-029-interface-api-architecture.md) and [docs/api](../api/README.md) — interface and contract authority
- [ARCH-031](../architecture/ARCH-031-technology-stack-catalogue.md) — status-aware technology catalogue

### 14.2 External benchmarks (non-authoritative, versions pinned)

Benchmarks are pinned to an exact version so identifiers do not silently drift with a moving target. Re-pin explicitly (with a change-log entry) when a newer version is adopted — do not treat "latest" as the requirement.

| Benchmark | Pinned version | Applies to |
|-----------|-----------------|------------|
| [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/) | **ASVS 5.0.0** | REQ-N-SEC-002; Level 3 controls named explicitly for privileged/financial paths, not "stronger risk-selected controls" left undefined |
| [NIST SP 800-218 Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final) | **Version 1.1 (final)** | QG-11/QG-17 supply-chain and build practices; SSDF 1.2 remains draft and is tracked, not adopted |
| [NIST SP 800-63 Digital Identity Guidelines](https://pages.nist.gov/800-63-4/) | **SP 800-63-4** | QG-14 identity, authentication, and federation assurance profile |
| [W3C Web Content Accessibility Guidelines](https://www.w3.org/TR/WCAG22/) | **WCAG 2.2, Level AA** | REQ-N-A11Y-001, REQ-T-UI-005; applies to complete core processes including responsive variations, not isolated widgets |
| [ISO/IEC 25012 data quality model](https://www.iso.org/standard/35736.html) | **ISO/IEC 25012:2008** | QG-16 data-quality completeness, accuracy, consistency, traceability, and migration-quality grading |
| [ISO/IEC 25010:2023 product quality model](https://www.iso.org/standard/78176.html) | **ISO/IEC 25010:2023** | §1.3 gate design coverage check (compatibility, maintainability, flexibility, interaction capability, safety characteristics) |
| [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) | **CSF 2.0** | §10 risk register categorization (Govern, Identify, Protect, Detect, Respond, Recover) |
| [NIST SP 800-61 Computer Security Incident Handling Guide](https://csrc.nist.gov/pubs/sp/800/61/r3/final) | **Revision 3** | QG-08 incident-readiness exercise design |

These benchmarks inform completeness and verification. Controlled repository documents own Afenda decisions.

---

## 15. Verification, evidence, and release decision

### 15.1 Ownership and verification routing

This routing is provisional but mandatory until a controlled owner supersedes it.

| ID family | Accountable owner | Minimum verification classes |
|-----------|-------------------|------------------------------|
| REQ-F-TEN / REQ-F-PLT | Platform + Identity + Security | Architecture, integration, isolation/security, E2E |
| REQ-F-MD | Master Data owner | Unit, property/invariant, integration, audit, E2E |
| REQ-F-SAL | Sales owner | State machine, integration, reconciliation, E2E |
| REQ-F-PUR | Purchasing owner | State machine, integration, reconciliation, E2E |
| REQ-F-INV | Inventory owner | Property/invariant, concurrency, reconciliation, load, E2E |
| REQ-F-FIN | Finance owner | Golden ledger, property/invariant, reconciliation, migration, E2E |
| REQ-F-RPT | Reporting/Data owner | As-of reconciliation, authorization/isolation, performance, E2E |
| REQ-F-INT | Integration owner | Contract, auth, idempotency/replay, retry/DLQ, load |
| REQ-F-X | Product Architecture + affected domain | Cross-module integration, audit, concurrency, recovery |
| REQ-F-ENT | Product Architecture + Finance | Property/invariant (consolidation), integration, cross-entity isolation, E2E — BLOCKED pending OQ-10 |
| REQ-F-PAY | Finance owner + Security | Golden ledger, idempotency, reconciliation, duplicate-detection, E2E |
| REQ-F-IMP | Data Platform + Master Data owner | Row-level validation, dedup, rollback rehearsal, audit |
| REQ-T-UI | Frontend + Design | Component/integration, accessibility, browser E2E, performance |
| REQ-T-API | API owner + Security | Schema/contract, auth, idempotency, compatibility, load |
| REQ-T-DOM | Backend Architecture + domains | Boundary/static checks, unit, integration |
| REQ-T-DB | Data Platform | Migration, isolation, query plan/load, restore |
| REQ-T-AUTH | Identity + Security | Threat model, session/authz, abuse, isolation, E2E |
| REQ-T-JOB / REQ-T-FILE | Platform + Operations + Security | Durability, redrive, access, malware/quarantine, recovery |
| REQ-T-SRCH | Data Platform + Security | Isolation/security, staleness measurement, static-scan |
| REQ-T-RUN | Platform + Engineering | Function-timeout boundary test, durable-execution failure/redrive proof, runtime-declaration static check |
| REQ-T-FLAG | Platform + Product | Flag-owner/removal-plan audit, kill-switch rehearsal, rollback verification |
| REQ-T-MONO | Platform + Product Architecture | Package-boundary static check, cache-correctness rehearsal, phantom-dependency lint, root-devDeps and packageManager-drift check, ADR-reference gate for new packages/apps/contexts |
| REQ-T-OPS | Platform + Operations | Configuration, observability, deployment, rollback, incident exercise, optional-integration degradation test (missing-config path) |
| REQ-N-* | Owner named by the corresponding QG gate | Applicable security, load, restore, accessibility, audit, or release evidence |

Verification classes are cumulative minimums. The owning controlled document turns them into exact scenarios, thresholds, commands, and evidence references.

### 15.2 Requirement-to-evidence interface

Every promoted requirement and quality gate maps to exactly one current verdict row. An artifact may support several rows, but no row relies on prose alone.

| Field | Required content |
|-------|------------------|
| Evidence ID | Stable identifier |
| Requirement / gate IDs | Exact IDs covered |
| Revision | Commit, build, schema, migration and configuration identifiers |
| Environment | Production or named production-equivalent environment |
| Preconditions/workload | Dataset, tenant/role, traffic, dependency and feature state |
| Command/scenario | Reproducible command, test or operator procedure |
| Expected result | Objective threshold or invariant |
| Actual result | Measured value and PASS/FAIL/BLOCKED/NOT EVIDENCED/NOT APPLICABLE |
| Artifact reference | Retained report, log, trace, or signed record |
| Evidence date/expiry | ISO date and freshness deadline |
| Owner/reviewer | Producer and independent reviewer where required |
| Blocker/exception | Root cause, risk owner, control, expiry, next action |

Evidence is sanitized: no credentials, tokens, connection strings, personal data, or unrestricted tenant records.

### 15.3 Release decision rules

Production release is permitted only when:

1. exact revision and configuration are identified;
2. every in-scope requirement has an owner and verification mapping;
3. all applicable QG-01…QG-18 gates are PASS, ACCEPTED RISK (only for waivable requirements per §1.3.2), or NOT APPLICABLE with recorded rationale — never FAIL, BLOCKED, or NOT EVIDENCED;
4. every non-waivable condition passes and none is recorded as ACCEPTED RISK;
5. every gate relying on aged evidence has a current evidence applicability decision per §1.3.1, or the evidence defaults to NOT EVIDENCED;
6. migrations, restore, rollback/forward-fix, monitoring, and support handoff pass;
7. release-blocking open decisions (§12.2) close under controlled authority, including OQ-10 for any multi-entity customer;
8. the §1.4.1/§12.3 authority-conflict matrix is complete with no "No" or "Not yet reviewed" rows for in-scope requirements;
9. residual risks and ACCEPTED RISK exceptions are approved, within their expiry, and reported at the gate level (never rolled into PASS); and
10. Product, Engineering, Security, Operations, and affected domain owners sign off.

Lifecycle status, CI success, deployment, manifest presence, configured infrastructure, or a prior release does not independently authorize production.

### 15.4 Specification completeness gate

This draft is ready to propose for controlled promotion only when: every `REQ-F-*`/`REQ-T-*` row has a populated positive/adverse/recovery acceptance case per §1.5.1; IDs are unique and assigned to future owners; controlled decisions are not open; workload/SLO values are ratified; open decisions (§12.2, including OQ-10–OQ-19) have owners and deadlines; rollback/failure behavior is complete; references resolve; the §1.4.1/§12.3 authority-conflict matrix has no unresolved row; and no exception is recorded outside the §1.3.2 ACCEPTED RISK structure.

---

## 16. Rollout, rollback, and operational handoff

### 16.1 Rollout stages

| Stage | Entry gate | Exit gate |
|-------|------------|-----------|
| Design | Requirements and authority boundaries reviewed | Threat model, data model, contracts, migration and verification plan approved |
| Build | Controlled implementation slice authorized | Unit, integration, contract and isolation tests pass |
| Production-equivalent staging | Immutable candidate and representative data available | Full §8 workload, failure, restore, migration, and security gates pass |
| Limited organization pilot | Support, telemetry, rollback and reconciliation plan ready | Pilot observation passes without isolation or financial-integrity breach |
| General availability | Mandatory gates current and sign-off complete | SLO/support review scheduled; evidence retained |

### 16.2 Rollback principles

- Application rollback uses a previously verified immutable artifact and preserves migration compatibility.
- Database changes prefer expand/contract and forward-fix. Destructive rollback is forbidden when it discards valid business/financial history.
- Financial correction uses reversal/corrective documents; never delete or rewrite posted history to simulate rollback.
- Feature disablement fails closed for permissions, integrations, jobs, and tenant access.
- Rollback completes only after health, isolation, reconciliation, queues, integrations, and audit signals are reverified.
- Immediately contain and stop release for cross-tenant exposure, auth bypass, posting imbalance, unexplained variance, unrecoverable migration, secret exposure, or lost audit attribution.

### 16.3 Operational handoff

Before production, Operations receives ownership, dependency inventory, dashboards, alert routing, runbooks, restore/rollback procedures, diagnostics, limits, customer-impact communication paths, and evidence-retention locations. Handoff requires an exercised scenario, not publication alone.

---

## Change log (scratch)

| Date | Summary |
|------|---------|
| 2026-07-14 | **V2.3 — next-forge pattern-borrowing pass.** Reviewed the `next-forge` Turborepo SaaS reference template (a multi-app template with dedicated packages for auth, database, payments, rate-limit, webhooks, cron, feature-flags, i18n, etc.) against the controlled Afenda-Lite architecture (ARCH-006/022/024/025/026/027) to identify genuinely portable patterns without silently adopting incompatible structure. **Adopted:** `REQ-T-OPS-006` — graceful degradation for optional/third-party integration configuration (tax engine, storage/malware-scan vendor, bank connector, e-invoicing), sharpening REQ-T-OPS-001's fail-fast rule to apply only to *critical* secrets, borrowed from next-forge's "missing env var silently disables the feature" convention. **Flagged as a new open decision, not silently applied:** `OQ-22` — ownership home for rate-limiting, webhook signing, and cron/durable-scheduling concerns, which next-forge isolates into dedicated packages but which have no named owner in ARCH-024's closed six-package list; resolving this requires either fitting the concern into an existing package's public surface or a new ADR, not a same-shaped new package by default. Enriched `OQ-19`'s evidence column with an i18n-tooling decision input. **Explicitly rejected as non-portable without a new ADR** (recorded in this log, not as new requirements, to prevent future silent adoption): next-forge's multi-app split (`app`/`web`/`api`/`email`/`docs`/`storybook`/`studio` as separate Vercel deployables) conflicts with ARCH-022's closed "one deployable (`apps/web`) until a new ADR" decision; its Prisma ORM conflicts with ARCH-025's Drizzle decision; its Clerk/Stripe-coupled auth/payments conflict with ARCH-026's Neon Auth decision; and its per-concern package sprawl (analytics, observability, security, notifications, collaboration, ai, CMS as separate packages) conflicts with ARCH-024's explicit "no mega-package" *and* implicit closed-count constraint — each would need its own ADR, not a bulk import. Validated (no doc change needed, already correct): `@t3-oss/env-nextjs`-style per-package env validation already matches ARCH-027's `@afenda/env` Target design; Server-Components-first with client interactivity isolated to separate files already matches REQ-T-UI-002/ARCH-013; a dev-only React Email preview task already exists in ARCH-022's `turbo.json` (`email:dev`) without needing a separate deployable app. |
| 2026-07-14 | **V2.2 — monorepo-management governance pass.** Cross-checked this draft against the controlled Turborepo/package/bounded-context authorities (ARCH-006, ARCH-022, ARCH-024) rather than treating monorepo tooling as an open gap to freely re-specify. Confirmed and recorded a high-severity finding: the §5 ERP module set (Sales/Purchasing/Inventory/Finance/Master Data/Reporting/Payments/Integration) has **no corresponding bounded context** in ARCH-006's Living/Target list (Identity, Declarations, Trade/FFT, Platform) — populated the previously-template §1.4.1 authority-conflict matrix with this concrete row, added release-blocking `OQ-20` (module/bounded-context mapping) and `OQ-21` (package publishing/versioning per ARCH-024 "Known limits"), expanded the thin §12.1 system-shape row to cite ARCH-024's exact six-package/no-mega-package/root-devDeps-only/`@afenda/*`-only constraints, and added a non-quality-gate §10 risk row ("Module/bounded-context scope mismatch") that blocks all §11 implementation until OQ-20 resolves. Corrected two prior-pass requirements that had drifted from controlled authority: `REQ-T-API-016` now defers to the existing `modules/*/schemas` Zod/`z.infer` pattern instead of implying a new shared-contracts package (which ARCH-024's closed six-package list forbids), and `REQ-T-RUN-003` now cites ARCH-022's Node-default/Edge-exception decision as controlling rather than stating the rule freestanding. Added new §7.12 `REQ-T-MONO-001…006` turning ARCH-024's own named failure modes and ARCH-022's accepted costs (cross-package `src/` import, circular dependency, undeclared exports, stale Turborepo cache, phantom dependencies, root-devDeps drift, unauthorized new package/app/context) into CI-enforceable acceptance criteria, and updated §15.1 ownership routing accordingly. No product code, package, or app was created or restructured — this pass is documentation-only, per the ARCH-028 anti-contamination lock, and defers to ARCH-006/022/024 as controlling rather than superseding them. |
| 2026-07-14 | **V2.1 — fullstack-developer optimization pass.** Identified and closed 10 implementation-level gaps not raised by the ERP-process critique: frontend grid virtualization and Core-Web-Vitals/RUM (`REQ-T-UI-007…010`); generated/shared API types to prevent contract drift (`REQ-T-API-016`); N+1-query discipline and Neon-branch migration rehearsal (`REQ-T-DB-006/007`); a new §7.10 runtime/background-execution requirement set (`REQ-T-RUN-001…004`) making explicit that the controlled Vercel/Node hosting posture (ARCH-010/ARCH-031) cannot host an in-process durable scheduler, tightening OQ-03; a new §7.11 progressive-delivery/feature-flag requirement set (`REQ-T-FLAG-001…003`) to make §11's "delivery sequencing is not quality reduction" principle practically executable; two new §10 risk rows (serverless execution-model mismatch, contract drift); and §15.1 ownership-routing updates for the new families. No product code was written — this checkout remains docs-first under the ARCH-028 anti-contamination lock; these are requirement-level fixes only, gated by the same open-decision/BLOCKED discipline as the rest of this draft. |
| 2026-07-14 | **V2 — critique remediation.** Closed all 13 P0 items and the internal-omissions list from [response-to-saas-erp-fullstack.md](response-to-saas-erp-fullstack.md): added ACCEPTED RISK state, QG-14–QG-18, evidence-applicability/inheritance (§1.3.1), exception-state rules (§1.3.2), and a mandatory authority-conflict matrix (§1.4.1/§12.3); added §4.5 legal-entity/group model with OQ-10 and drafted `REQ-F-ENT-*`; restructured every `REQ-F-*`/`REQ-T-*` table with positive/adverse/recovery acceptance columns per §1.5.1; added §5.9 payments/cash management (`REQ-F-PAY-*`) and §5.10 imports (`REQ-F-IMP-*`); added `REQ-F-PLT-008` tenant branding and `REQ-F-X-009/010` workflow-taxonomy and search/cache isolation; added §7.9 search/cache technical requirements and expanded §7.3 API lifecycle (`REQ-T-API-006…015`); expanded §9 interfaces with payments/bank resources and a contract-detail table; added risk rows for entity-model ambiguity, payment/bank gap, identity/SoD gap, evidence-inheritance, and exception-state misuse; added open decisions OQ-10 through OQ-19; pinned exact versions for ASVS, SSDF, NIST SP 800-63, WCAG 2.2, and ISO/IEC 25012; updated §15 ownership routing and release-decision rules for the new gates/families. Audit note: the critique's claim that "Section 15.2 is absent" did not hold against this file's prior state — 15.1–15.4 were already present and are preserved; the critique's "120 requirement rows / 21 using support" was verified against the prior revision as 100 rows / 17 "must support" — directionally correct, numerically corrected here for the record. |
| 2026-07-14 | Defined measurable production-quality gates; added evidence states, non-waivable controls, workload envelope, release decision, rollout/rollback and support handoff; aligned resolved stack/tenancy decisions to controlled authorities. |
| 2026-07-14 | Initial scratch requirements: enterprise production-quality multi-tenant SaaS ERP fullstack |






