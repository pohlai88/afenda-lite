# Data-Governance Workflows

## Responsibility

This capability group owns governed data-change workflows around authoritative master records.

It owns:

* change-request drafting, submission, review, approval, rejection, cancellation, and application
* bulk-import ingestion, validation, approval, execution, retry, and result reporting
* approval-gated mutable-field allowlists
* duplicate detection and operator-review warnings
* merge requests, authorization, conflict resolution, and execution policy
* workflow decision evidence, reasons, actor separation, and version checks

These workflows protect master-data quality without splitting master ownership across packages or introducing alternative mutation paths.

## Authority

Data-governance workflows authorize and coordinate master-data changes. They do not replace the underlying domain commands.

Every applied change must continue to enforce:

* organization isolation
* authorization
* schema validation
* normalization
* lifecycle rules
* dependency checks
* uniqueness constraints
* version CAS
* audit recording
* domain-event creation
* production transaction atomicity

Approval permits a mutation to be attempted. It does not guarantee that the mutation remains valid when application begins.

## Boundaries

* Imports may create or update records only through package-owned commands.
* Import rows may modify only fields permitted by an approved, operation-specific mutable-field allowlist.
* Import matching is deterministic: normalized code is primary, approved external identifiers are optional, and fuzzy matches are warning/review evidence only.
* Import application is bounded by row count, payload size, and chunk policy; a batch must not hold one massive transaction across thousands of records.
* Change-request application requires an approved request and the relevant master-data application permission.
* Application must revalidate the current target version, lifecycle state, dependencies, authorization, and business invariants.
* Approval and application remain separate governance actions.
* Duplicate warnings inform operator review and must never trigger automatic merges or destructive mutations.
* Merge authorization and merge execution remain governed by `@afenda/master-data`.
* Merge policy must not be reimplemented in application features, adapters, transactional modules, or integration workers.
* Applications must not write directly to `md_change_request`, `md_import_batch`, governed extension tables, or authoritative master tables.
* Platform `ref_*` records are outside organization-scoped import and change-request mutation workflows.
* Search projections, uploaded files, user-interface state, and external-system records are not authoritative workflow evidence.

## Imports

Canonical import lifecycle:

```text
parsed
validated
approval_pending
approved
applying
partially_applied
applied
failed
cancelled
```

Canonical row evidence:

```text
row
├── source row number
├── raw payload
├── normalized payload
├── matched target ID
├── intended operation
├── validation errors
├── application result
└── resulting entity ID/version
```

Supported import modes are `create_only`, `update_existing`, and
`create_or_update`. Matching must be explicit: first normalized code, then an
approved external identifier when present and permitted. Fuzzy matching may
produce duplicate warnings or review candidates, but must not automatically
select update targets.

Import execution must support dry-run validation, immutable source snapshots,
actor and correlation tracking, idempotent resume, retry of failed rows,
partial-failure reporting, and bounded row/chunk transactions. Each successful
row or chunk must atomically persist the authoritative state change, audit fact,
and domain event through the package-owned command path.

## Core Governance Principles

### Approval is not mutation

An approval records a governance decision against one specific proposal version.

The authoritative master record changes only when the approved operation is successfully applied.

An approved request may fail application when:

* the target version has changed
* the target no longer exists
* the target lifecycle state has changed
* a dependency now blocks the operation
* a uniqueness conflict has appeared
* a referenced record is inactive or invalid
* the applying actor lacks current permission
* the request has expired, been cancelled, or been superseded
* the approved mutable-field policy is no longer applicable

### Approved proposals are immutable

After submission, the normalized proposal must not be materially edited.

A material change must:

* return the request to draft and invalidate existing reviews,
* create a replacement request, or
* create a superseding request linked to the previous request.

Every approval must identify the exact proposal version and allowlist version reviewed.

### Governance may strengthen, not weaken

Governance workflows may impose stricter controls than ordinary commands, including:

* four-eyes approval
* mandatory reasons
* restricted field allowlists
* additional dependency evidence
* limited application windows
* sensitive-field review

They must never bypass ordinary domain validation.

### Actor responsibilities are distinct

Workflow records should preserve separate actors for:

```text
requestedBy
submittedBy
reviewedBy
approvedBy
rejectedBy
appliedBy
cancelledBy
```

Organizations may enforce segregation rules such as:

```text
requestedBy != approvedBy
```

or:

```text
approvedBy != appliedBy
```

The rule must be enforced by policy, not assumed from user-interface behavior.

## Change Requests

A change request represents exactly one governed domain operation. It is not a
general patch document and must never permit arbitrary field mutation.

The shipped MDG v1 public command surface is intentionally narrow:

* `activate_party`
* `merge_parties`

Future change-request coverage may extend only to controlled master-data changes
such as sensitive field changes, tax identity changes, external identifier
changes, and duplicate-resolution merges. Imports, duplicate-warning review, and
mass-update batches use their own bounded governance records unless a named
master-data operation explicitly requires a change request. Platform `ref_*`
mutation, cross-module transaction workflows, UI state approvals, and arbitrary
JSON patch workflows are outside scope.

Canonical change-request evidence is:

```text
change request
├── target entity type
├── target entity id, nullable for create
├── operation type
├── before snapshot
├── proposed patch
├── reason
├── requested by
├── reviewed by
├── approval status
├── expected target version
├── decided at
└── applied at
```

Proposal content may be modified only while the request is in draft status.
Submission freezes request type, target identity, target expected version,
requested operation, normalized payload, before snapshot, mutable-field policy ID
and version, and proposal version. A changed proposal requires a new or
superseding request linked through `supersedesRequestId`.

Every transition must define allowed source states, resulting state, transition
authority, required actor permission when actor-driven, required reason, expected
workflow version, emitted event, audit action, and reversibility. Actor-driven
transitions and internal transitions must remain distinguishable. Applied and
failed outcomes may only be recorded by the authoritative application
orchestrator. Expiration is system-owned.

Applying a change request must reload the request and target under the same
organization, enforce request workflow CAS and target CAS inside the authoritative
transaction, resolve the current mutable-field policy, revalidate the policy
context and proposed fields, rerun current normalization and domain validation,
invoke the package-owned command, and atomically persist the authoritative
mutation, request outcome, audit fact, and domain event or outbox record.

`beforeSnapshot` is audit evidence, not an authoritative reconstruction of the
target record. The authoritative target must always be reloaded during
application.
