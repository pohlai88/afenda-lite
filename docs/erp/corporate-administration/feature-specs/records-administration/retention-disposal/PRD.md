# Product Requirements Document: Retention and Disposal

> **Document purpose.**
> This PRD defines the `records-administration/retention-disposal` feature within Corporate Administration. It translates the approved domain architecture into an executable product and engineering contract without redefining module architecture.
>
> **Readiness notice.** Architecture-derived ownership, exclusions, paths, and repository contracts are authoritative. Record fields, detailed transition guards, retention periods, performance targets, and rollout values below are proposed and remain blocking until business and engineering approval.

---

## 0. Document control

```yaml
prd_id: CA-RECORDS-RETENTION_DISPOSAL-001
feature_id: retention-disposal
feature_name: Retention and Disposal
feature_group: records-administration
domain_id: corporate-administration
domain_name: Corporate Administration

package: "@afenda/corporate-administration"
package_path: packages/erp/corporate-administration
feature_source_path: src/features/records-administration/retention-disposal
prd_path: docs/erp/corporate-administration/feature-specs/records-administration/retention-disposal/PRD.md

spec_status: draft
implementation_status:
  backend: not-started
  database: not-started
  facade: not-started
  frontend: not-started
verification_status: unverified
activation_status: inactive
enterprise_status: not-assessed

version: 0.1.0
owner_business: Administration Department
owner_product: Corporate Administration Product Owner
owner_engineering: ERP Engineering
approved_by: []
approved_on: null
supersedes: null

tenancy_model: organization-scoped
privacy_class: internal
activation_model: organization-toggle

depends_on_features: []
depends_on_platform_capabilities:
  - trusted organization context
  - authorization provider
  - approval verifier where declared
  - audit and outbox execution protocol
required_ports: []
emitted_events:
  - RetentionRuleDefined
  - RetentionRuleActivated
  - LegalHoldPlaced
  - LegalHoldReleased
  - DisposalEligibilityReviewed
  - DisposalApproved
  - DisposalRecorded
  - RetentionRuleRetired
consumed_by: []
estimated_slices: 11
```

### 0.1 Governing architecture

This PRD is governed by:

```text
docs/erp/corporate-administration/corporate-administration-architecture.md
```

It inherits the architecture’s package-root facade, module-kernel execution, feature-owned `operation-registry.ts`, `@afenda/db` relational authority, organization tenancy, memory-first implementation, Drizzle parity, canonical `Result<Data, Code>`, and activation controls.

### 0.2 Authority precedence

1. Repository-wide architecture decisions and package policies.
2. Corporate Administration domain architecture.
3. This approved feature PRD.
4. Approved feature decisions.
5. Implementation slices.
6. Source code and tests.
7. Generated documentation and evidence.

### 0.3 PRD scope

This PRD is authoritative, once approved, for feature ownership, terminology, records, lifecycle, operations, business rules, permissions, events, persistence requirements, user experience, test acceptance, and exact write manifests. It does not redefine domain architecture or activate the feature.

# 1. Feature identity

| Field | Value |
| --- | --- |
| Feature name | Retention and Disposal |
| Feature identifier | `retention-disposal` |
| Feature group | `records-administration` |
| Domain | Corporate Administration |
| One-line definition | The system of record for retention rules, legal holds, review, and approved disposal |
| Primary business owner | Administration Department |
| Primary users | Corporate administrators, designated record owners, reviewers, approvers, auditors |
| Trigger for existence | The organization requires one authoritative, tenant-safe chronology for retention and disposal |
| Primary success signal | Percentage of active records complete, current, assigned, and supported by required evidence |

## 1.1 Architecture inventory trace

> Retention rules, legal holds, review, and approved disposal.

This PRD must not materially widen that responsibility.

## 1.2 Feature purpose

Retention and Disposal enables authorized users to:

* create and maintain the authoritative administrative record;
* control its approved lifecycle and chronology;
* assign accountable ownership and due actions;
* retain governed references and supporting evidence;
* identify exceptions, expiries, or incomplete records before control failure.

## 1.3 Non-goals

This feature does not own financial recognition, procurement execution, settlement, employee administration, technical identity configuration, investor administration, legal advice, or generic binary storage.

# 2. Problem statement

## 2.1 Current situation

The architecture establishes the need for a single semantic owner, but it does not provide verified current-process evidence, baseline volumes, failure rates, or user-research findings. These must be added before approval rather than invented.

## 2.2 Core problem

Administration users cannot reliably determine the current, authorized, organization-scoped truth for retention and disposal when records, dates, ownership, lifecycle decisions, and evidence are distributed or inconsistently maintained, resulting in missed obligations, ambiguous accountability, weak chronology, and costly assurance reconstruction.

## 2.3 Consequences

| Consequence | Business impact | Affected stakeholder |
| --- | --- | --- |
| Incomplete or stale records | Incorrect decisions and repeated manual verification | Administration Department |
| Unclear lifecycle and ownership | Missed actions, renewals, or control steps | Record owners and approvers |
| Missing evidence or chronology | Slow audits and disputed accountability | Audit, Legal, Compliance, Management |
| Duplicated foreign facts | Conflicting sources of truth | Finance, HR, IT, Purchasing, Operations |

## 2.4 Evidence

| Evidence | Source | Date | Confidence |
| --- | --- | --- | --- |
| Feature ownership and scope are approved architecture inputs | Corporate Administration architecture | 2026-08-03 | high |
| Operational baseline and user-research evidence | Not yet supplied | — | unavailable |

# 3. Users and jobs to be done

| User role | Responsibility | Uses this feature to |
| --- | --- | --- |
| Corporate administrator | Maintain authoritative records and chronology | Register, amend, monitor, and close records |
| Accountable owner | Ensure assigned facts and obligations remain current | Review dates, evidence, assignments, and exceptions |
| Reviewer or approver | Apply required governance decisions | Review protected transitions and approval evidence |
| Auditor or assurance reviewer | Examine control effectiveness | Trace lifecycle, decisions, evidence, and exceptions |

Primary jobs:

1. When a governed record is created or changes, I want to record the authorized fact and effective date so that one current source of truth exists.
2. When a deadline or lifecycle event approaches, I want accountable ownership and evidence to be visible so that the organization acts before failure.
3. When assurance is required, I want immutable chronology and governed references so that I can prove what happened without reconstructing it manually.

# 4. Ownership and boundaries

## 4.1 Ownership test

| Ownership question | Answer | Reason |
| --- | --- | --- |
| Is Administration accountable for the record? | yes | The architecture assigns this feature to Corporate Administration |
| Does it persist beyond one transaction? | yes | It has an administrative lifecycle and chronology |
| Does it have feature-specific lifecycle meaning? | yes | States and transitions are owned by this feature |
| Is the feature accountable for correctness and chronology? | yes | It is the authoritative semantic owner |
| Can other modules reference it without owning it? | yes | Cross-module use is by governed reference, event, port, or saga |
| Does it require feature-specific evidence or assurance? | yes | Evidence completeness and lifecycle proof are part of the domain mandate |

## 4.2 Authoritative facts

This feature solely owns the meaning and lifecycle of: `RetentionRule, LegalHold, DisposalAction`.

## 4.3 Governed foreign references

| Foreign record | Authoritative owner | Reference retained | Validation rule |
| --- | --- | --- | --- |
| organization | Platform / organization identity | trusted organization context | must match execution context |

## 4.4 Never-owned facts and negative assertions

The implementation must prove it does not store or own:

* general-ledger entries or accounting balances;
* supplier invoices or payment records;
* technical credentials or secrets;
* investor, shareholder, or securities information;

# 5. Scope

## 5.1 In scope

| Capability | Description | Operation reference |
| --- | --- | --- |
| Register or create | Establish an organization-scoped authoritative record | first create/register command in §10 |
| Maintain | Amend permitted business facts with chronology and expected version | update/amend command in §10 |
| Govern lifecycle | Execute only approved state transitions | lifecycle commands in §10 |
| Retrieve | Return one representation-safe record in permitted scope | `get` query in §10 |
| List and monitor | Return stable, filtered, cursor-paginated results | `list` query in §10 |
| Evidence and audit | Commit required audit/outbox effects with mutations | module-kernel execution protocol |

## 5.2 Out of scope for initial release

Bulk import, advanced analytics, automated third-party integrations, complex cross-organization sharing, and mass lifecycle actions remain deferred until volumes and business rules are evidenced.

## 5.3 Permanently out of scope

All facts identified in §4.4 and all architecture-level exclusions remain permanently out of scope.

# 6. Ubiquitous language

| Term | Exact meaning | Forbidden alternatives |
| --- | --- | --- |
| `retention-disposal` | Retention rules, legal holds, review, and approved disposal | Generic “admin item” or another module’s business term |
| record | The feature-owned aggregate or governed child record | document when the fact is not a document |
| effective date | Date the business fact takes effect | creation date |
| recorded date | Date the system captured the fact | effective date |
| governed reference | Opaque reference to another owner’s record | copied foreign record |

Operation definitions live in `operation-registry.ts`; public outcomes use `Result<Data, Code>`; production persistence uses `retention-disposal.drizzle.ts`; business operations remain in the feature root; events use completed facts in past tense.

# 7. Records and domain model

## 7.1 Record inventory

| Record | Type | Aggregate owner | Description |
| --- | --- | --- | --- |
| `RetentionRule` | aggregate | `RetentionDisposal` | Retention and disposal rule |
| `LegalHold` | entity | `RetentionDisposal` | Disposal-blocking hold |
| `DisposalAction` | history | `RetentionDisposal` | Approved disposal chronology |

## 7.2 Common aggregate fields

Every aggregate requires `id`, trusted `organizationId`, status, optimistic `version`, created/updated timestamps and actors, effective-date fields where applicable, and immutable chronology. Exact feature fields are a **blocking approval item** and must be completed before Slice 1.

## 7.3 Natural keys and uniqueness

Natural keys must be explicitly approved and scoped by organization. No global uniqueness may be assumed. Case and Unicode normalization must be stated per key.

## 7.4 Effective dating

Default proposal: `effective-range` for time-bound facts and immutable append-only chronology for changes. Exact overlap, correction, future-effective, and supersession rules require feature approval.

# 8. Lifecycle and state model

## 8.1 Proposed status vocabulary

| Status | Meaning | Entry/exit condition | Terminal |
| --- | --- | --- | --- |
| `draft` | Proposed lifecycle state; exact entry and exit guards require business approval | Defined by approved operations | no |
| `active` | Proposed lifecycle state; exact entry and exit guards require business approval | Defined by approved operations | no |
| `under-review` | Proposed lifecycle state; exact entry and exit guards require business approval | Defined by approved operations | no |
| `on-hold` | Proposed lifecycle state; exact entry and exit guards require business approval | Defined by approved operations | no |
| `eligible` | Proposed lifecycle state; exact entry and exit guards require business approval | Defined by approved operations | no |
| `disposed` | Proposed lifecycle state; exact entry and exit guards require business approval | Defined by approved operations | yes |
| `retired` | Proposed lifecycle state; exact entry and exit guards require business approval | Defined by approved operations | yes |

## 8.2 Proposed transition catalog

| Transition ID | From | Trigger | To | Guard | Permission | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| TR-01 | Current permitted state | `define-rule` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | no |
| TR-02 | Current permitted state | `activate-rule` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | no |
| TR-03 | Current permitted state | `place-hold` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | no |
| TR-04 | Current permitted state | `release-hold` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | no |
| TR-05 | Current permitted state | `review-eligibility` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | no |
| TR-06 | Current permitted state | `approve-disposal` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | yes |
| TR-07 | Current permitted state | `record-disposal` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | no |
| TR-08 | Current permitted state | `retire-rule` | Resulting state defined by approved lifecycle policy | Authorization, tenant lineage, required evidence, and expected version | `ca.retention-disposal.manage` | no |

Every absent transition is rejected with `CONFLICT`. The exact from/to state matrix is a blocking PRD-approval item.

# 9. Business rules and invariants

| Rule ID | Rule | Enforcement | Outcome |
| --- | --- | --- | --- |
| BR-01 | Every record belongs to the trusted execution-context organization | store and operation boundary | `NOT_FOUND` or `FORBIDDEN` according to operation posture |
| BR-02 | Client input must not control `organizationId` | schema and operation boundary | `VALIDATION_ERROR` |
| BR-03 | Every mutation supplies the expected aggregate version | operation and store | `CONCURRENCY_CONFLICT` |
| BR-04 | Only explicitly allowed lifecycle transitions succeed | policy | `CONFLICT` |
| BR-05 | Required authorization and approval are verified before mutation | module kernel | `FORBIDDEN` or approved fail-closed code |
| BR-06 | State, required audit, and required outbox records commit atomically | transaction protocol | `INTERNAL_ERROR` or `SERVICE_UNAVAILABLE` without partial effects |
| BR-07 | An idempotent replay returns the original observable result without duplicate effects | idempotency protocol | original result or `CONFLICT` on fingerprint mismatch |
| BR-08 | Foreign records remain governed references and are lineage-validated | operation and port | `VALIDATION_ERROR` or `NOT_FOUND` |
| BR-09 | Historical changes are appended, superseded, or corrected; never silently overwritten | model and store | `CONFLICT` |
| BR-10 | Excluded financial, technical, personnel, investor, or binary-storage fields are rejected | schemas, contracts, and ownership tests | `VALIDATION_ERROR` |

Feature invariants use `CA-RETENTION_DISPOSAL-INV-nn` and must include tenant ownership, one semantic owner, chronology preservation, adapter parity, and no secret storage.

# 10. Operation catalog

| Operation ID | Method | Kind | Input | Output | Permission | Approval | Txn | Idempotency | Audit | Emits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ca.records-administration.retention-disposal.define-rule` | `define_rule` | command | `DefineRuleRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | no | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.activate-rule` | `activate_rule` | command | `ActivateRuleRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | no | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.place-hold` | `place_hold` | command | `PlaceHoldRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | no | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.release-hold` | `release_hold` | command | `ReleaseHoldRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | no | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.review-eligibility` | `review_eligibility` | command | `ReviewEligibilityRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | no | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.approve-disposal` | `approve_disposal` | command | `ApproveDisposalRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | yes | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.record-disposal` | `record_disposal` | command | `RecordDisposalRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | no | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.retire-rule` | `retire_rule` | command | `RetireRuleRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.manage` | no | required | request ID | yes | `RetentionRuleDefined` |
| `ca.records-administration.retention-disposal.get` | `get` | query | `GetRetentionDisposalInput` | `RetentionDisposalView` | `ca.retention-disposal.read` | — | none | — | no | — |
| `ca.records-administration.retention-disposal.list` | `list` | query | `ListRetentionDisposalInput` | `Page<RetentionDisposalView>` | `ca.retention-disposal.read` | — | none | — | no | — |

All operation names and policy metadata remain **proposed** until approved. The feature-owned `operation-registry.ts` is the canonical implementation owner; the module manifest and facade project from it.

# 11. Validation and outcomes

Unknown fields are rejected; strings use explicit normalization; empty strings are not silently converted to null; identifiers are opaque; dates are explicit; collection and string limits require approval; client validation never replaces server validation.

Public operations return narrow `Promise<Result<Data, Code>>` unions using only canonical codes:

* `BAD_REQUEST` for malformed request shape;
* `VALIDATION_ERROR` for input or business-rule rejection;
* `NOT_FOUND` for tenancy-safe absence;
* `FORBIDDEN` for permission denial;
* `CONFLICT` for lifecycle or uniqueness conflict;
* `CONCURRENCY_CONFLICT` for stale expected version;
* `SERVICE_UNAVAILABLE` for required dependency failure;
* `INTERNAL_ERROR` only for unexpected unreachable failure.

# 12. Authorization, tenancy, privacy, and retention

Permissions:

| Permission | Grants |
| --- | --- |
| `ca.retention-disposal.read` | Approved get and list queries |
| `ca.retention-disposal.manage` | Approved mutations |

Authorization is enforced at the operation boundary. Approval-required operations fail closed. Store methods enforce organization scope. Cross-tenant reads disclose no existence. Default privacy is `internal`; field-level restricted or regulated classifications, retention periods, legal-hold behavior, and disposal authority are **blocking business decisions**.

The feature stores no secrets. Evidence files remain owned by the document platform; this feature stores only governed references and metadata.

# 13. Persistence requirements

```yaml
schema_authority: "@afenda/db"
migration_authority: "@afenda/db"
concurrency_model: optimistic-version
pagination: cursor
default_page_size: 50
maximum_page_size: 200
```

Proposed table prefix: `ca_retention_disposal`. Exact tables, columns, constraints, indexes, expected volumes, and migration identifiers require repository and schema-owner verification before approval. All tenant-owned tables require non-null `organization_id`; organization-leading indexes; organization-scoped natural-key uniqueness; stable cursor ordering; migration apply and recovery evidence.

# 14. Ports, integrations, and events

Cross-feature or cross-module effects use narrow ports, committed events, or application sagas. The feature must not import sibling adapters, write sibling or foreign tables, copy foreign lifecycle state, or invoke transport endpoints from domain logic.

## 14.1 Event catalog

| Event | Trigger | Payload | Consumers | Ordering |
| --- | --- | --- | --- | --- |
| `RetentionRuleDefined` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |
| `RetentionRuleActivated` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |
| `LegalHoldPlaced` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |
| `LegalHoldReleased` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |
| `DisposalEligibilityReviewed` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |
| `DisposalApproved` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |
| `DisposalRecorded` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |
| `RetentionRuleRetired` | Corresponding successful command | organization ID, aggregate ID, effective business facts, schema version | Declared application or module consumers | per aggregate |

Event payloads exclude database rows, ORM objects, secrets, unrestricted personal data, and another feature’s internal state. Required events commit through the outbox atomically with state.

# 15. Public facade and user experience

Production consumers import only from `@afenda/corporate-administration`. The root begins with `import "server-only";` and must not expose stores, adapters, Drizzle types, transactions, raw ports, or registry internals.

Proposed frontend route:

```text
/o/{organizationSlug}/corporate-administration/records-administration/retention-disposal
```

Navigation appears only when the organization capability is active, the actor has read permission, the backend is available, and the route exists. Required UI states: loading, never-populated empty, filtered empty, partial data, retryable error, terminal error, permission denial, stale conflict, optimistic pending, and inactive capability. Applications import UI only from `@afenda/ui-system`.

# 16. Non-functional requirements and observability

Performance targets, expected organization volumes, availability SLOs, and alert thresholds are not supported by the supplied architecture and must not be invented. Before approval, owners must define realistic targets and sources.

Structured logs may include operation, feature, organization, actor, outcome, duration, and correlation identifiers but never full sensitive payloads. Required metrics include operation rate, outcome rate by code, p95 latency, conflicts, approval wait, dependency failure, outbox backlog, audit parity, and tenant-boundary rejection.

# 17. Testing specification

Tests are executable acceptance criteria and must include:

* one named test per business rule and invariant;
* every allowed and rejected lifecycle transition;
* every operation happy path and declared outcome;
* authorization denial and approval fail-closed behavior;
* same-tenant success and cross-tenant non-disclosure;
* hostile input and spoofed organization attempts;
* idempotent replay and mismatched fingerprint;
* optimistic-concurrency conflict;
* atomic state/audit/outbox fault injection;
* identical memory and Drizzle scenario suites;
* migration apply and recovery;
* negative ownership and prohibited-export tests;
* all applicable frontend state, accessibility, keyboard, responsive, and i18n checks.

# 18. Exact implementation manifests

Canonical feature path:

```text
packages/erp/corporate-administration/src/features/records-administration/retention-disposal/
├── operation-registry.ts
├── run-operation.ts
├── schema.ts
├── policy.ts
├── guards.ts
├── store-contract.ts
├── <business-noun>.ts
├── adapters/
│   ├── retention-disposal.memory.ts
│   └── retention-disposal.drizzle.ts
└── __tests__/
```

Exact actual filenames, `@afenda/db` schema paths, migration paths, composition paths, facade paths, frontend paths, and consumer test paths must be verified on disk and approved before Slice 1. Do not create `definition.ts`, generic `operations.ts`, `commands/`, `queries/`, or `relational.ts`.

# 19. Implementation slices

| Slice | Outcome | Mandatory gate |
| ---: | --- | --- |
| 0 | PRD and architecture readiness | No blocking TBDs; exact manifests approved |
| 1 | Contracts, schemas, model, and guards | Contract and hostile-schema tests |
| 2 | Pure policy and lifecycle | All rules and transitions tested |
| 3 | Store contract and memory adapter | Tenancy, ordering, pagination, concurrency tests |
| 4 | Business operations and feature registry | Every operation and outcome green against memory |
| 5 | `@afenda/db` schema and migration | Apply and recovery evidence |
| 6 | Drizzle adapter | Full memory–Drizzle parity |
| 7 | Module-kernel execution guarantees | Idempotency, audit, outbox, and atomicity proof |
| 8 | Composition, manifest projections, and facade | Registry and consumer-contract parity |
| 9 | Frontend workflow, where included | UI-state and accessibility proof |
| 10 | Closure | Fresh full-gate evidence; activation remains separate |

A companion `IMPLEMENTATION-SLICES.md` should be generated only after the exact operation catalog, fields, lifecycle matrix, and write paths are approved.

# 20. Success metrics

Primary proposed metric: percentage of active retention and disposal records that are current, assigned, within required dates, and complete with required evidence.

Numerator, denominator, source, baseline, target, measurement window, and owner require business approval. No numerical target is asserted by this draft.

# 21. Definition of Done

The feature is implementation-complete only when:

* the architecture inventory and this PRD are approved;
* no blocking field, lifecycle, operation, retention, dependency, or manifest decision remains;
* every operation is implemented in the feature registry and no undocumented public operation exists;
* every rule, invariant, transition, and declared outcome has a named passing test;
* memory behavior is complete before Drizzle and full parity passes;
* tenancy, authorization, approval, concurrency, idempotency, atomicity, audit, outbox, and negative ownership gates pass;
* `@afenda/db` migration apply and recovery evidence exists;
* facade consumer contracts pass with no internal leakage or deep import;
* frontend state and accessibility gates pass where included;
* fresh canonical package, generator, manifest, governance, tenancy, and database commands are recorded;
* verification, activation, and enterprise-readiness statuses remain honest and separate.

# 22. Decisions and open questions

## 22.1 Proposed decisions

| Decision ID | Decision | Status |
| --- | --- | --- |
| FD-01 | Use `retention-disposal` as the canonical feature identifier under `records-administration` | proposed |
| FD-02 | Use feature-owned `operation-registry.ts`, memory-first behavior, and Drizzle parity | inherited from architecture |
| FD-03 | Use organization-scoped optimistic concurrency and cursor pagination | proposed |

## 22.2 Blocking questions

| Question ID | Question | Blocks | Owner |
| --- | --- | --- | --- |
| FQ-01 | What exact fields, natural keys, and normalization rules are required? | Slice 1 | Business owner and engineering |
| FQ-02 | What is the complete from/to lifecycle matrix and correction policy? | Slice 2 | Business owner |
| FQ-03 | Which proposed operations, permissions, approvals, and events are final? | Slice 4 | Product, security, and architecture |
| FQ-04 | What retention, privacy, legal-hold, and disposal rules apply? | Slice 1 and activation | Legal, privacy, and records owners |
| FQ-05 | What exact schema, migration, composition, facade, and frontend paths exist on disk? | Slice 0 | Engineering |
| FQ-06 | What current volumes, latency targets, baselines, and success targets are evidence-backed? | Approval and operational readiness | Product and operations |

# Appendix A — Requirement traceability seed

| Requirement | Operation/rule | Test | Implementation owner |
| --- | --- | --- | --- |
| Trusted tenant scope | BR-01, BR-02 | tenancy and hostile-input suites | feature operation and store |
| Valid lifecycle | BR-04 | transition matrix suite | policy |
| Atomic governed mutation | BR-05–BR-07 | authorization, idempotency, atomicity suites | module kernel and run-operation |
| No foreign ownership | BR-08, BR-10 | negative ownership suite | contracts and schemas |
| Adapter equivalence | architecture invariant | parity suite | memory and Drizzle adapters |
