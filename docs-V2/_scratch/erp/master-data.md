# Review verdict

This is a strong ownership README for a highly sensitive foundational package. It correctly establishes:

* one owner for all `md_*` mutations;
* platform-only UoM reference data;
* no shadow customer, supplier, item, or warehouse tables;
* optimistic concurrency;
* Party-role modeling instead of boolean flags;
* same-transaction audit and outbox intent;
* transactional packages as consumers, not co-owners.

**Current score: 8.4/10.**

The main gaps are more serious than ordinary README polish because `@afenda/master-data` is the identity spine for every ERP package. The package needs stronger rules for:

1. platform reference-data administration;
2. authorization and manifest coverage;
3. party merging;
4. import/upsert behavior;
5. master lifecycle and downstream references;
6. UoM conversion integrity;
7. production/test transaction symmetry.

---

# Blocking findings

## 1. Platform references and organization masters need separate mutation policies

The README groups these together:

```text
ref_* platform lookups
md_* organization masters
```

But their governance is fundamentally different.

| Data class                                                     | Scope                             | Expected mutation policy             |
| -------------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| `ref_country`, `ref_currency`, `ref_language`, `ref_time_zone` | Platform-global                   | Controlled system/admin or seed only |
| `ref_uom_dimension`, `ref_uom`                                 | Platform-global                   | Controlled catalog administration    |
| `md_party`, `md_item`, `md_warehouse`, etc.                    | Organization-scoped               | Organization-authorized commands     |
| Aggregate extensions                                           | Organization-scoped child records | Mutated through the owning aggregate |

The current statement:

> all org mutations use `runNeonHttpTransaction`

does not explain how `ref_*` records are written.

### Add an explicit policy

```text
Platform-reference mutations are never ordinary organization commands.

They resolve to one of:
- systemOnly idempotent seed;
- platform-admin command;
- controlled migration.

Organization actors cannot create or modify ref_country, ref_currency,
ref_language, ref_time_zone, ref_uom_dimension or ref_uom.
```

Platform-reference queries also need an explicit authorization policy:

```text
authenticated
approved public
or systemOnly
```

Do not leave them outside the operation authorization map merely because they are not tenant-owned.

---

## 2. Package-internal authorization is missing

Like Sales and Purchasing, Master Data must enforce authorization inside every public mutation and every organization-scoped query.

The README currently requires actor context but does not define:

* `MasterDataAuthorizationPort`;
* operation IDs;
* permission codes;
* command/query authorization mapping;
* system-only reference operations;
* module manifest.

### Recommended authorization port

```ts
export interface MasterDataAuthorizationPort {
  can(input: {
    organizationId?: string;
    actorUserId: string;
    permission: MasterDataPermission;
  }): Promise<boolean>;
}
```

The optional organization ID is useful only for platform-scoped operations. An alternative is to use separate platform and organization authorization ports.

### Suggested permission structure

Avoid one broad `master_data.manage` permission.

```ts
export const masterDataPermissions = {
  partyRead: "master_data.party.read",
  partyManage: "master_data.party.manage",
  partyMerge: "master_data.party.merge",

  itemRead: "master_data.item.read",
  itemManage: "master_data.item.manage",

  warehouseRead: "master_data.warehouse.read",
  warehouseManage: "master_data.warehouse.manage",

  paymentTermRead: "master_data.payment_term.read",
  paymentTermManage: "master_data.payment_term.manage",

  referenceRead: "master_data.reference.read",
  referenceAdmin: "master_data.reference.admin",
} as const;
```

`mergeParties` should have a separate high-risk permission.

---

## 3. `mergeParties` requires a much stronger contract

This is the highest-risk feature mentioned in the README:

> `mergeParties` + duplicate warnings

Master Data cannot merge parties by directly rewriting Sales, Purchasing, Receivables, Payables, or other transactional tables. Doing so would violate table ownership.

### Unsafe interpretation

```text
Master Data finds every party_id in every module and updates it itself.
```

That is forbidden.

### Recommended merge model

Master Data should own:

```text
surviving party
merged-party status
canonical-party reference
merge record
merge reason
merge evidence
external-id reconciliation
duplicate-resolution audit
```

Example:

```text
Party A survives.
Party B becomes merged.
Party B records canonical_party_id = Party A.
Party B remains historically addressable.
Master Data emits master_data.party.merged.v1.
```

Downstream packages then decide how to interpret the canonical identity through:

* owner queries;
* event-driven read-model updates;
* application-composed migration or saga;
* controlled reconciliation.

### Required invariants

```text
Parties must belong to the same organization.
A party cannot merge into itself.
A merged party cannot become a survivor.
Merge chains must collapse to one canonical party.
Historical transaction snapshots are never rewritten.
External identifiers cannot silently collide.
Roles, addresses and contacts require an explicit consolidation policy.
The source party is not hard-deleted.
The merge is irreversible through ordinary CRUD.
```

If unmerge is required, it needs a separately governed repair procedure—not a casual command.

---

## 4. Import upsert-by-code is underspecified

“Bounded import upsert-by-code” is useful, but this phrase hides major risks.

An import must not silently overwrite a master because its code matches.

### Define import modes

```ts
type ImportMode =
  | "create_only"
  | "update_existing"
  | "create_or_update";
```

### Required controls

* organization is fixed for the whole import;
* maximum batch size;
* idempotency key for the import;
* row-level validation;
* dry-run mode;
* explicit mutable-field allowlist;
* immutable-field rejection;
* duplicate normalized-code detection;
* external-ID conflict detection;
* per-row outcome;
* no partial invisible success;
* actor and correlation attribution;
* audit and outbox semantics;
* retry policy.

### Recommended behavior

```text
Matching by normalized code identifies a candidate record.

It does not authorize overwriting every supplied field.

Only fields declared mutable for that master type may update.
Lifecycle, canonical identity and protected reference fields require
their named commands.
```

The import path must not bypass:

* lifecycle;
* version checking;
* authorization;
* extension ownership;
* audit/outbox;
* same-organization validation.

---

## 5. Lifecycle behavior is not defined for each master

The README says “lifecycle + version CAS,” but only gives one Party activation rule.

That is insufficient for downstream transactional modules.

At minimum define lifecycle vocabularies for:

```text
Party
Party Role
Item
Item Group
Warehouse
Payment Term
Tax Registration
```

### Recommended baseline

```ts
type MasterLifecycle = "draft" | "active" | "inactive";
```

Some extensions may use:

```ts
type ExtensionLifecycle = "active" | "inactive";
```

### Required general rules

```text
Draft masters cannot be used by transactional modules.
Active masters may be referenced by new transactions.
Inactive masters remain readable for history but reject new use.
Referenced masters are never hard-deleted.
Codes are not silently recycled.
Reactivation is explicit and version-checked.
```

### Party-role invariant

The current rule says:

> Party activation requires at least one active role.

Also define the reverse:

```text
An active Party cannot lose its final active role unless the Party is
deactivated in the same controlled operation.
```

Otherwise, this invalid state becomes possible:

```text
Party = active
Active roles = zero
```

---

# Identity and extension boundaries

## 6. Extension mutation must pass through aggregate owners

The README calls these “aggregate extensions,” but it should explicitly forbid standalone mutation services that bypass their parent aggregate.

For example:

```text
Party owns:
- roles
- addresses
- contacts
- external IDs
- relationships

Item owns:
- UoM conversions
- barcodes
- aliases
- external IDs

Warehouse owns:
- external IDs
```

Recommended rule:

```text
An extension can have its own command, store method and table, but its
mutation authority remains the parent aggregate.

No extension record can exist across organizations or without its parent.
```

This also means authorization should normally be based on the aggregate:

```text
master_data.party.manage
master_data.item.manage
master_data.warehouse.manage
```

rather than creating dozens of extension-level permissions prematurely.

---

## 7. External-ID uniqueness needs an exact scope

For each external-ID table, define uniqueness across:

```text
organization
source system
entity type
external identifier
```

Recommended logical key:

```text
(organization_id, source_system, external_id)
```

Depending on requirements, the entity type may also be part of the key.

Required rules:

* one external ID cannot point to two active canonical masters in the same scope;
* merging reconciles or conflicts external IDs explicitly;
* external IDs are not normalized with the local master-code policy unless specified;
* source system is controlled, not arbitrary free text;
* import uses external ID before code when the source is authoritative.

---

## 8. Party relationships require semantic controls

`md_party_relationship` can become a generic graph with weak meaning unless constrained.

Define:

```text
relationship type
direction
effective start/end
organization scope
allowed party kinds
cycle policy
uniqueness policy
```

Examples:

```text
parent_of
subsidiary_of
contact_for
bill_to_for
ship_to_for
```

Do not allow callers to invent arbitrary relationship strings without a controlled catalog or typed constants.

---

# UoM contract

## 9. The platform-only UoM decision is correct but incomplete

This is a strong statement:

```text
ref_uom_dimension → ref_uom
md_item.base_uom_id → ref_uom
md_item_uom owns packaging conversions
```

Now define the conversion invariants.

### Required rules

```text
The base UoM must be dimensionally valid for the item.
An item has exactly one base UoM.
The base UoM conversion factor is exactly 1.
Every item UoM conversion resolves deterministically to the base UoM.
A conversion factor must be positive and non-zero.
Duplicate item/UoM conversions are forbidden.
Cross-dimension conversion is forbidden.
Rounding mode and scale are explicit.
Posted transactional snapshots retain the UoM and conversion used.
```

### Conversion representation

Avoid binary floating-point.

Prefer:

```ts
type UomConversion = {
  numerator: bigint;
  denominator: bigint;
};
```

or a controlled decimal representation.

For example:

```text
1 case = 24 each
numerator = 24
denominator = 1
```

Do not allow arbitrary reciprocal chains that introduce drift.

---

## 10. Barcode uniqueness must be governed

Specify whether an item barcode is unique:

* globally;
* per organization;
* per barcode type;
* per item UoM;
* across active records only.

A safe baseline is:

```text
An active normalized barcode identifies at most one active item/UoM
combination within an organization.
```

Global GTIN validation may be layered separately when required.

---

# Store and transaction architecture

## 11. Memory and Drizzle still use different mutation abstractions

The same concern remains:

```text
Memory:
  AuditFactPort + OutboxPort

Drizzle:
  embeds SQL and does not call those ports
```

The test adapter and production adapter are not exercising the same primary abstraction.

### Recommended outcome-oriented contract

Both stores guarantee:

```text
master mutation
+ audit fact
+ outbox event
= one atomic commit
```

The command should depend on a store contract that promises this outcome, not on ports that production ignores.

Possible structure:

```ts
export interface MasterDataMutationStore {
  createParty(input: CreatePartyPersistenceInput): Promise<Result<Party>>;
  activateParty(input: ActivatePartyPersistenceInput): Promise<Result<Party>>;
  createItem(input: CreateItemPersistenceInput): Promise<Result<Item>>;
  // ...
}
```

| Implementation | Atomicity mechanism                                   |
| -------------- | ----------------------------------------------------- |
| Drizzle        | Database transaction or atomic CTE                    |
| Memory         | Staged state and rollback-capable transaction harness |

If `MutationPorts` remain, they should either be genuinely invoked by both paths or be moved to testing infrastructure rather than presented as a universal store contract.

---

## 12. Root exports are too broad

The root barrel currently exports:

* commands;
* queries;
* schemas;
* store type;
* Drizzle store;
* production ports;
* lifecycle/code helpers.

A foundational package should make bypass difficult.

### Recommended export map

| Path                                   | Role                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `@afenda/master-data`                  | Public commands, queries, schemas, brands, operation IDs, permission codes, error codes and manifest |
| `@afenda/master-data/contracts`        | Ports required by authorized composition                                                             |
| `@afenda/master-data/adapters/drizzle` | Production persistence adapter                                                                       |
| `@afenda/master-data/testing`          | Memory store, fake authorization and fixtures                                                        |
| `@afenda/master-data/reference`        | Read-only reference-data query types, only when justified                                            |

Do not export the memory store or direct persistence adapters from the normal root barrel.

---

# Search projector concern

## 13. “Search projectors” need an ownership and dependency statement

The README says:

> search projectors (`md_*` → `@afenda/search`)

This wording could imply Master Data directly writes Search-owned tables.

Clarify the permitted model:

```text
Master Data decides and emits versioned master-data events.

Search owns its search indexes and projection writes.

Projector handlers are either:
- owned by @afenda/search; or
- wired in the application composition root.

Master Data never directly mutates Search persistence.
```

If the projector implementation physically lives in Master Data, it should only call a Search port authorized through the workspace-edge register. Event-driven projection is cleaner.

Also ensure that a search indexing failure does not roll back a committed master mutation unless that same-transaction behavior is explicitly designed and authorized.

---

# Error ownership

## 14. Master-specific errors belong in Master Data

Change:

```text
Result / error codes → @afenda/errors
```

to:

| Concern                                        | Owner                 |
| ---------------------------------------------- | --------------------- |
| Generic `Result` and platform error primitives | `@afenda/errors`      |
| Master Data-specific error codes               | `@afenda/master-data` |
| HTTP and ActionResult mapping                  | application adapter   |

Examples:

```ts
export const masterDataErrorCodes = {
  partyNotFound: "master_data.party.not_found",
  partyRoleRequired: "master_data.party.role_required",
  finalActiveRole: "master_data.party.final_active_role",
  itemNotFound: "master_data.item.not_found",
  invalidUomDimension: "master_data.item.invalid_uom_dimension",
  duplicateBarcode: "master_data.item.duplicate_barcode",
  versionConflict: "master_data.version_conflict",
  mergeConflict: "master_data.party.merge_conflict",
  referenceMutationForbidden: "master_data.reference.mutation_forbidden",
} as const;
```

---

# Queries and tenancy

## 15. Query contracts need stronger guarantees

The README mentions `pageSize ≤ 100`, which is good, but should also require:

* cursor-based pagination;
* stable deterministic ordering;
* allowlisted filters;
* allowlisted sorting;
* organization filter inside every `md_*` query;
* no N+1 extension loading;
* cross-tenant not-found behavior;
* lifecycle filtering;
* optional inclusion of inactive records only with permission.

Example:

```ts
await listParties({
  organizationId,
  actorUserId,
  correlationId,
  cursor,
  pageSize: 50,
  status: "active",
  role: "supplier",
  sort: "normalizedCode:asc",
});
```

For `ref_*` queries, explicitly state that they are not organization-filtered but remain governed by the declared public/authenticated policy.

---

# Code normalization policy

## 16. The code policy is useful but should name its boundaries

Current policy:

```text
Trim → Unicode NFC → uppercase
[A-Z0-9._-]
max 64
```

Clarify:

* this applies to local master `code`;
* it does not automatically apply to names;
* it does not automatically apply to external IDs;
* it does not automatically apply to barcodes;
* normalization occurs before uniqueness checks;
* the original display code is either retained or intentionally not retained.

Also consider confusable Unicode handling. Because the final character set is ASCII, NFC followed by uppercase and allowlist rejection is reasonable.

Recommended invariant:

```text
normalized_code is derived by the package and never accepted directly
from caller input.
```

---

# Module conformance section

Add:

````md
## Module conformance

`@afenda/master-data` exports `src/module.manifest.ts`.

The manifest declares:

- module id, package name, lifecycle, activation mode and R1-F band;
- owned aggregates and extensions;
- command and query IDs;
- `md_*` mutation-table ownership;
- emitted and consumed event IDs;
- Master Data permission codes;
- command/query authorization maps;
- required module dependencies;
- optional Search integration.

Platform-reference operations are explicitly mapped to `systemOnly`,
platform-admin permission, or an approved read policy.

Validate with:

```bash
pnpm validate:modules
````

````

One nuance: if your governance classifies Master Data as `R1-F ERP`, state that consistently. If it has a separate formal band, use that exact registered band rather than the generic “Rank-1 Platform.”

---

# Likely post-nesting link fixes

Assuming this README now lives at:

```text
packages/erp/master-data/README.md
````

the existing links are probably one level too shallow.

Likely corrections:

```md
../../../docs-V2/master-data/README.md
../../../docs-V2/master-data/master-data-dna.md
../../../docs-V2/monorepo/README.md
../../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md
../../../docs-V2/events/README.md
../../data-plane/events/README.md
../../../AGENTS.md
```

Run the docs link validator rather than relying only on visual review.

---

# Recommended ownership table

| Surface                                         | Owner                                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `md_*` and `ref_*` DDL/migrations               | `@afenda/db`                                               |
| Organization-master mutation authority          | `@afenda/master-data`                                      |
| Platform-reference mutation policy and commands | `@afenda/master-data`, under system/platform-admin control |
| Aggregate lifecycle and CAS                     | `@afenda/master-data`                                      |
| Aggregate extensions                            | Parent aggregate in `@afenda/master-data`                  |
| Canonical master identities and merge records   | `@afenda/master-data`                                      |
| Master Data operation IDs                       | `@afenda/master-data`                                      |
| Master Data permission codes                    | `@afenda/master-data`                                      |
| Master Data-specific errors                     | `@afenda/master-data`                                      |
| Generic `Result` primitives                     | `@afenda/errors`                                           |
| Event name/version/payload schemas              | `@afenda/events`                                           |
| Decision to emit Master Data events             | `@afenda/master-data`                                      |
| Search indexes and projection persistence       | `@afenda/search`                                           |
| Search handler wiring                           | Search package or application composition root             |
| HTTP and ActionResult mapping                   | `apps/web`                                                 |

---

# Recommended invariant section

```md
## Invariants

- Every `md_*` row belongs to exactly one organization.
- Every extension belongs to the same organization as its aggregate root.
- Platform `ref_*` rows are never organization-owned.
- Organization actors cannot mutate platform references through ordinary commands.
- Codes are normalized by the package before uniqueness checks.
- Active Parties require at least one active role.
- An active Party cannot lose its final active role.
- Inactive masters remain available for historical reads but reject new transactional use.
- Referenced masters are never hard-deleted.
- Party merges preserve historical identity and never directly rewrite peer-domain tables.
- Item UoM conversions are dimensionally valid, positive and deterministic.
- Every material mutation is authorized, version-checked and idempotent.
- Aggregate mutation, audit fact and outbox event commit or roll back together.
- No app or transactional package mutates `md_*`.
```

---

# Additional document recommendation

This package justifies one deeper contract document because the README cannot safely carry all identity-governance rules:

```text
docs-V2/master-data/operational-master-contract.md
```

It should contain:

1. data-class model: platform refs, org masters, extensions;
2. aggregate ownership;
3. lifecycle matrices;
4. Party-role invariants;
5. merge and canonical identity policy;
6. external-ID policy;
7. import/upsert policy;
8. UoM conversion and barcode rules;
9. inactive-master behavior for ERP consumers;
10. event matrix;
11. search projection boundary;
12. repair and recovery procedures.

Do not create separate documents for every individual master yet. Keep the deeper policy consolidated until a master requires materially distinct governance.

---

# Priority order

```text
1. Define platform-reference mutation and authorization policy
2. Define package-internal authorization and manifest mapping
3. Lock down mergeParties semantics
4. Specify import/upsert behavior
5. Define lifecycle rules for every master class
6. Correct UoM, external-ID and barcode invariants
7. Separate Search projection ownership
8. Repair production/test atomicity symmetry
9. Split root, production-adapter and testing exports
10. Correct post-nesting documentation links
```

The most urgent issue is **`mergeParties`**. It must preserve canonical identity without allowing Master Data to rewrite tables owned by Sales, Purchasing, Receivables, Payables, or other packages. A survivor/tombstone model plus a versioned merge event is the safest boundary.
