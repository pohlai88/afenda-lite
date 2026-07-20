# Master Data DNA — ERP Reference and Operational Master Spine

| Field      | Value                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface    | `docs-V2/master-data/master-data-dna.md`                                                                                                          |
| Authority  | **Scratch** — monorepo discipline · data craftsmanship · disk truth in `@afenda/master-data`, `@afenda/db`, `@afenda/events`, and `@afenda/audit` |
| Source DNA | `_reference/packages/master-data` (`@vierp/master-data`) — historical, read-only, non-authoritative                                               |
| Updated    | 2026-07-20                                                                                                                                        |
| Status     | Proposed implementation authority for the named master-data slice only                                                                            |

Borrow, adapt, or reject patterns for Afenda’s ERP reference-data and operational-master spine.

Operator path: [README.md](README.md).

---

## 1. Verdict

**Create `@afenda/master-data` as the sole application-domain owner of reusable ERP operational masters.**

The package shall own:

- Organization-scoped operational masters.
- Controlled shared-reference lookups consumed by those masters.
- Stable identifiers and natural business codes.
- Validation and lifecycle rules.
- Tenant-safe repositories and commands.
- Dependency checks before archive or retirement.
- Idempotent write contracts.
- Optimistic concurrency.
- External identifiers and aliases.
- Transactional audit facts and outbox intents.
- Bounded search and deterministic pagination.
- Import-ready validation without embedding file parsing or web concerns.

The package shall **not** own:

- Authentication identities or workforce accounts.
- Transactional documents.
- Inventory balances or stock movements.
- Prices, quotations, orders, invoices, journals, or payments.
- HTTP routes, server actions, session parsing, or request headers.
- Search-engine copies as an alternative source of truth.
- Message-bus consumers.
- In-memory production repositories.
- Uncontrolled custom-field engines.
- Cross-module workflow orchestration.

`@afenda/db` owns schema definitions and database primitives.

`@afenda/master-data` owns domain semantics and permitted mutations.

`apps/web` owns session resolution, authorization presentation, and transport adaptation.

`@afenda/audit` owns durable audit records.

`@afenda/events` owns outbox schemas, dispatch, retries, and consumer delivery.

---

## 2. Architectural classification

Afenda shall distinguish four data classes instead of treating every reusable value as the same kind of master.

| Class                           | Ownership                             | Examples                                                              | Mutation policy                                        |
| ------------------------------- | ------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Platform reference data         | Platform-managed                      | Country, currency, language, ISO unit dimension, time zone            | Versioned seed or controlled administrator maintenance |
| Organization operational master | One organization                      | Party, item, warehouse, item group, payment term                      | Organization-authorized commands                       |
| Organization extension          | One organization attached to a master | Address, contact point, party role, item barcode, external identifier | Mutated through aggregate owner                        |
| Transactional data              | Business module                       | Sales order, purchase order, stock movement, invoice                  | Never owned by `@afenda/master-data`                   |

Shared reference data may be read across organizations.

Operational masters must always be resolved through an explicit organization context.

Cross-organization sharing must be an intentional policy, not the accidental result of nullable tenancy.

---

## 3. Initial bounded context

### 3.1 Platform reference data

Initial controlled reference data:

- `ref_country`
- `ref_currency`
- `ref_language`
- `ref_time_zone`
- `ref_uom_dimension`
- `ref_uom`

These records are not tenant-created duplicates.

Organizations may configure whether a platform reference is allowed or active for their use, but must not redefine its underlying ISO or canonical identity.

### 3.2 Organization operational masters

Initial organization-owned aggregates:

- `md_party`
- `md_item`
- `md_item_group`
- `md_warehouse`
- `md_payment_term`
- `md_tax_registration`, when required by the tax architecture

### 3.3 Aggregate extensions

Initial child and association records:

- `md_party_role`
- `md_party_address`
- `md_party_contact`
- `md_party_external_id`
- `md_party_relationship`
- `md_item_uom`
- `md_item_barcode`
- `md_item_external_id`
- `md_item_alias`
- `md_warehouse_external_id`

Do not promote every child record into an independently editable root.

---

## 4. Core design principles

### 4.1 One authoritative owner

Each master concept has exactly one authoritative package and one canonical table family.

Modules may reference master IDs but must not recreate shortened copies such as:

- `sales_customer`
- `purchase_supplier`
- `inventory_product`
- `finance_vendor`
- `crm_account`

Projection tables are permitted only when they are explicitly disposable, rebuildable read models and are never used as mutation authorities.

### 4.2 Surrogate identity plus business code

Every organization-owned master shall have:

- Branded UUID `id`.
- Required organization-local `code`.
- Human-readable `name`.
- Explicit lifecycle `status`.
- Monotonic `version`.
- Creation and modification attribution.
- Creation and modification timestamps.

The UUID is the relational identity.

The code is the stable business-facing key used by people, files, EDI, APIs, and legacy integrations.

Names are descriptive and may change; they are never identifiers.

### 4.3 Code normalization and uniqueness

Codes shall be:

- Trimmed.
- Unicode-normalized.
- Compared using an explicitly defined case policy.
- Validated against an entity-specific character and length policy.
- Unique within their declared ownership scope.
- Indexed by organization and normalized code.
- Immutable after transactional use unless changed through a governed rename operation.

Recommended uniqueness:

```text
UNIQUE (organization_id, normalized_code)
WHERE retired_at IS NULL
  AND merged_into_id IS NULL
```

Do not silently recycle a retired code.

A former code shall be retained as an alias when required for historical imports or external integrations.

### 4.4 Explicit organization boundary

Every organization-owned root contains a non-null `organization_id`.

Every read and write must include the organization context:

```text
WHERE id = :id
  AND organization_id = :organizationId
```

An ID by itself is never sufficient authority.

Child tables must either:

1. carry `organization_id` and enforce composite same-organization foreign keys; or
2. be reachable only through an organization-bound aggregate repository with database constraints preventing cross-organization attachment.

For high-assurance tables, prefer explicit `organization_id` on children for indexing, tenancy auditing, and row-level security.

### 4.5 Lifecycle before deletion

ERP masters use an explicit lifecycle:

```text
draft → active → inactive → retired
                 ↘ blocked
```

Suggested semantics:

| Status     | Meaning                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| `draft`    | Incomplete and unavailable for normal transactions                        |
| `active`   | Available for permitted transactions                                      |
| `inactive` | Temporarily unavailable for new use                                       |
| `blocked`  | Prohibited because of compliance, credit, quality, or governance controls |
| `retired`  | Permanently closed for new transactions but retained historically         |

`deleted_at` is reserved for erroneous, unreferenced records or administrative recovery cases.

Normal business closure uses `inactive`, `blocked`, or `retired`, not deletion.

A record referenced by a posted or immutable transaction cannot be hard-deleted.

### 4.6 Dependency-safe retirement

Before retirement, deletion, or merge, the domain must check known dependencies.

The operation shall return structured blockers such as:

```ts
type MasterDependency = {
  module: string;
  entity: string;
  count: number;
  blocking: boolean;
};
```

The master-data package must not import every transactional module to perform these checks.

Use a registered dependency-inspector contract or database-level reference registry maintained by authorized modules.

No force-delete escape hatch is permitted in ordinary application code.

### 4.7 Optimistic concurrency

Every mutable aggregate includes a `version` integer.

Updates must use compare-and-swap semantics:

```sql
UPDATE md_party
SET
  name = $name,
  version = version + 1,
  updated_at = now(),
  updated_by = $actor_id
WHERE id = $id
  AND organization_id = $organization_id
  AND version = $expected_version;
```

A zero-row update returns `MASTER_VERSION_CONFLICT`.

Last-write-wins is not acceptable for enterprise master-data maintenance.

### 4.8 Idempotent commands

Create, import, merge, and externally initiated update commands must support idempotency.

Idempotency ownership belongs to the command boundary, using:

- Organization.
- Operation type.
- Caller or integration source.
- Idempotency key.
- Request fingerprint.
- Stored result reference.

Repeating the same request returns the original result.

Reusing the same key with a different payload fails closed.

---

## 5. Party model

### 5.1 Unified party aggregate

Use one `md_party` aggregate for organizations and persons that participate in business relationships.

```text
party_kind:
- organization
- person
```

Do not split customer, supplier, carrier, manufacturer, or agent into duplicate root records.

SAP’s governed master-data model similarly organizes customer and supplier information around Business Partner master data rather than requiring unrelated duplicated identities.

### 5.2 Extensible roles, not fixed booleans

Do not use only:

```text
is_customer
is_supplier
```

Use `md_party_role` with a closed initial catalog:

```text
customer
supplier
carrier
manufacturer
agent
distributor
franchisee
landlord
bank
regulator
other_authorized_role
```

Rules:

- A party must have at least one active role before activation.
- Role activation and retirement are independently audited.
- Module-specific settings attach to the party-role relation or remain in the owning module.
- Adding a role must not duplicate the party.
- The role catalog is closed in code and extended only through architecture review.

Customer credit rules remain in Sales or Credit Management.

Supplier qualification remains in Purchasing or Quality.

Carrier operating details remain in Logistics.

The master package owns identity and role membership, not every role-specific process.

### 5.3 Names and legal identity

The party aggregate distinguishes:

- Legal name.
- Trading name.
- Display name.
- Registration number.
- Registration country.
- Tax identifiers through controlled child records.
- Party kind.
- Preferred language.
- Default currency, where commercially appropriate.

Sensitive identifiers must be access-controlled and redacted from general event payloads.

### 5.4 Addresses and contacts

Addresses and contact points are children of the party aggregate.

An address shall support:

- Address type or permitted usages.
- Country reference.
- Administrative subdivisions.
- Postal code.
- Validity period.
- Verification status.
- Default flags per permitted usage.

Contact points shall support:

- Contact type.
- Value.
- Purpose.
- Verification state.
- Primary flag.
- Validity period.

Do not store a single universal address or phone number directly on `md_party`.

### 5.5 Duplicate detection and merge

Party creation shall support warning-level duplicate detection using normalized combinations such as:

- Registration country plus registration number.
- Tax identifier.
- Normalized legal name plus locality.
- Verified email or telephone.
- External-system identifier.

Duplicate detection does not automatically merge records.

A governed merge operation shall:

1. lock both source and target;
2. verify the same organization;
3. verify compatible party kinds;
4. determine the surviving record;
5. preserve former codes and external identifiers;
6. redirect permitted references;
7. record field-level decisions;
8. set `merged_into_id` on the source;
9. publish a distinct merge event;
10. remain reversible only through a controlled repair procedure.

---

## 6. UoM model

### 6.1 Canonical UoM

A UoM belongs to a dimension such as:

- count
- mass
- volume
- length
- area
- time

Canonical unit conversion may be defined only between units of the same dimension.

Use exact decimal ratios, never binary floating point.

### 6.2 Item-specific UoM

Each item has one base inventory UoM.

Additional item UoMs belong in `md_item_uom` and may include:

- Purchase UoM.
- Sales UoM.
- Packaging UoM.
- Conversion numerator and denominator.
- Barcode.
- Rounding rule.
- Minimum quantity.
- Effective dates.

ERPNext distinguishes an item’s stock UoM from purchasing UoMs and allows transaction-specific UoM use. It also treats item prices as UoM-specific.

Therefore:

```text
1 kg = 1,000 g
```

may be a canonical dimension conversion, while:

```text
1 carton of Item A = 24 pieces
1 carton of Item B = 12 pieces
```

must be item-specific.

Do not define “carton,” “box,” “bag,” or “pallet” as globally fixed quantity conversions.

### 6.3 UoM safeguards

- Base UoM cannot change after posted inventory use without a governed conversion migration.
- Conversion ratios must be positive.
- Circular conversion chains are forbidden.
- The system must resolve each item conversion to its base UoM deterministically.
- Fractional quantities may be prohibited for indivisible units.
- Rounding policy must be explicit and domain-owned.

---

## 7. Item model

### 7.1 Item identity

`md_item` represents a procurable, saleable, stockable, consumable, service, or non-stock business item.

Suggested item types:

```text
stock
non_stock
service
asset_candidate
expense
```

Manufacturing semantics such as BOM, routing, work order, formulas, and production yield remain outside master data.

### 7.2 Required relationships

An active item requires:

- Organization.
- Code.
- Name.
- Item type.
- Base UoM.
- Item group or classification.
- Lifecycle status.

Optional controlled relationships may include:

- Brand.
- Manufacturer party.
- Default tax classification.
- Commodity or regulatory classification.
- Country of origin.
- Shelf-life metadata.
- Weight or dimensions.
- Default procurement or sales settings.

Transactional defaults must not be mistaken for transaction truth.

A purchase order or sales order snapshots the relevant commercial values at creation or posting time.

### 7.3 Variants and attributes

Do not overload one item row with arbitrary JSON variants.

When variants are introduced:

- A template defines allowed attributes.
- Every sellable or stock-tracked variant receives its own item ID and code.
- Attribute combinations are unique within the template.
- Historical variants remain resolvable after retirement.
- Transaction modules reference the concrete variant item.

Variant capability may be a named follow-on slice if not required by the initial mission.

### 7.4 Classification hierarchy

`md_item_group` may be hierarchical.

Rules:

- No cycles.
- Materialized path, closure table, or another proven hierarchy strategy must be selected explicitly.
- Moving a group is audited.
- Group retirement is blocked while active children depend on it.
- Hierarchy depth must be bounded.
- Transactional accounting or tax behavior must not be silently inherited without an explainable resolved value.

---

## 8. Warehouse and location model

`md_warehouse` is a hierarchical logistics-location master.

It may represent:

- Site.
- Warehouse.
- Zone.
- Aisle.
- Rack.
- Bin, only if the inventory architecture chooses master-managed bins.

It owns:

- Code.
- Name.
- Parent location.
- Location type.
- Address reference.
- Operating status.
- Organization and, where required, legal-entity/company scope.
- Permitted operational capabilities.

It does not own:

- On-hand quantity.
- Reserved quantity.
- Available-to-promise quantity.
- Lot or serial balances.
- Stock valuation.
- Inventory movements.
- Reorder calculations.

Those belong to Inventory.

Warehouse hierarchy rules:

- No cycles.
- A child must belong to the same organization.
- Legal-entity scope must be compatible.
- Parent type must permit the child type.
- Retirement must be blocked when active inventory or open transactions exist.
- Codes remain historically resolvable.

ERP systems commonly distinguish warehouse setup from the transactional operations that consume it; ERPNext, for example, lists Warehouse and UoM under stock masters while work orders and stock processes are separate transactional concepts.

---

## 9. External identities and aliases

Every integration-facing aggregate may have external identifiers:

```ts
type ExternalIdentifier = {
  organizationId: OrganizationId;
  entityType: MasterEntityType;
  entityId: MasterEntityId;
  system: ExternalSystemCode;
  namespace: string;
  externalId: string;
};
```

Required uniqueness:

```text
organization + entity type + system + namespace + external ID
```

Use external identifiers for:

- Legacy ERP IDs.
- EDI partner codes.
- Marketplace IDs.
- Supplier catalog codes.
- Customer-specific item codes.
- Government registration references.
- Migration source keys.

Do not pollute the canonical `code` with every external system’s identifier.

Aliases retain former codes and accepted alternate lookup values.

Alias resolution must be deterministic and must never silently resolve ambiguous values.

---

## 10. Temporal validity

Use effective dating only where business meaning requires it.

Suitable examples:

- Addresses.
- Party roles.
- Tax registrations.
- Item-UoM conversions.
- Regulatory classifications.
- External relationships.

Suggested fields:

```text
valid_from
valid_to
```

Rules:

- `valid_to` is exclusive.
- Invalid ranges are rejected.
- Overlapping active ranges are rejected where only one value may apply.
- Current-state queries use an explicit effective timestamp.
- Historical transaction snapshots are not reconstructed solely from today’s master values.

Do not add temporal columns to every table without a real lifecycle requirement.

---

## 11. Mutation architecture

### 11.1 Command/query separation

Exports shall distinguish commands from queries.

Example commands:

```ts
createParty(command);
updateParty(command);
activateParty(command);
blockParty(command);
retireParty(command);
restoreParty(command);
mergeParties(command);

createItem(command);
updateItem(command);
activateItem(command);
retireItem(command);

createWarehouse(command);
moveWarehouse(command);
retireWarehouse(command);
```

Example queries:

```ts
getPartyById(query);
getPartyByCode(query);
findPartyByExternalId(query);
listParties(query);

getItemById(query);
getItemByCode(query);
listItems(query);
```

Do not expose generic unrestricted repositories to product modules.

### 11.2 Transaction boundary

One logical mutation uses one database transaction containing:

1. Current-state read and lock where required.
2. Authorization-independent domain validation.
3. Organization and foreign-key validation.
4. State mutation.
5. Audit fact creation.
6. Outbox record creation.
7. Idempotency completion.
8. Commit.

The event must not be published directly before commit.

The audit record must not be an asynchronous best-effort side effect.

### 11.3 Field-level changes

The package shall produce a typed change set:

```ts
type FieldChange = {
  path: string;
  operation: "add" | "replace" | "remove";
  before?: AuditScalar;
  after?: AuditScalar;
  classification?: "public" | "internal" | "confidential" | "restricted";
};
```

Requirements:

- Sensitive values are masked or represented by a change indicator.
- Derived display values are not treated as authoritative changes.
- Child collection changes have stable identity.
- Field changes are deterministic.
- Large blobs are not copied into audit or event payloads.

### 11.4 Typed failures

Use one established Afenda result vocabulary.

Suggested domain error codes:

```text
MASTER_NOT_FOUND
MASTER_CODE_CONFLICT
MASTER_EXTERNAL_ID_CONFLICT
MASTER_VERSION_CONFLICT
MASTER_INVALID_STATE
MASTER_DEPENDENCY_BLOCKED
MASTER_CROSS_ORG_REFERENCE
MASTER_INVALID_UOM_CONVERSION
MASTER_DUPLICATE_SUSPECTED
MASTER_MERGE_CONFLICT
MASTER_IDEMPOTENCY_CONFLICT
MASTER_VALIDATION_FAILED
```

Do not introduce:

- `{ success, data }`
- thrown strings
- package-local incompatible error brands
- HTTP status codes inside the domain package

Transport layers map domain failures to their own response model.

---

## 12. Query and pagination standards

Every list query must be bounded.

```text
default page size: 25
maximum page size: 100
```

Prefer cursor pagination using a deterministic composite sort:

```text
(normalized_code, id)
```

or:

```text
(updated_at, id)
```

Requirements:

- A stable tie-breaker is mandatory.
- Sort fields are allowlisted.
- Filters are typed.
- Full-table unbounded exports are forbidden through ordinary list APIs.
- Export and bulk extraction use a named asynchronous/export capability.
- Search projections may improve discovery but cannot become authoritative.

Exact lookup order:

1. Canonical ID.
2. Canonical normalized code.
3. External identifier with explicit system and namespace.
4. Alias.
5. Search result requiring user selection.

Never select the first fuzzy match as transaction truth.

---

## 13. Import and bulk-operation readiness

File parsing belongs to the importer or application boundary.

`@afenda/master-data` shall expose reusable validation and bulk command primitives.

The importer lifecycle shall support:

```text
uploaded → parsed → validated → approved → applied → reconciled
```

Bulk upsert-by-code must:

- Require organization context.
- Require source-system identity.
- Support dry-run validation.
- Return row-level results.
- Detect duplicate codes within the file.
- Detect external-ID conflicts.
- Preserve idempotency.
- Use bounded batches.
- Avoid one database transaction for an arbitrarily large file.
- Produce an import reconciliation report.
- Never silently overwrite a newer version.
- Distinguish create, update, unchanged, rejected, and conflicted rows.

Bulk APIs are a named importer slice, not required to be fully exposed in the initial package scaffold unless explicitly included.

---

## 14. Events and outbox

### 14.1 Event names

Use versioned event contracts:

```text
master_data.party.created.v1
master_data.party.updated.v1
master_data.party.activated.v1
master_data.party.blocked.v1
master_data.party.retired.v1
master_data.party.restored.v1
master_data.party.merged.v1

master_data.item.created.v1
master_data.item.updated.v1
master_data.item.retired.v1

master_data.warehouse.created.v1
master_data.warehouse.moved.v1
master_data.warehouse.retired.v1
```

Restore is never emitted as create.

Merge is never emitted as delete.

### 14.2 Minimal payload

Outbox payloads contain identity and routing facts, not full master snapshots:

```ts
type MasterDataEventV1 = {
  eventId: string;
  occurredAt: string;
  organizationId: OrganizationId;
  entityType: MasterEntityType;
  entityId: MasterEntityId;
  code: string;
  version: number;
  actorId: ActorId;
  correlationId: string;
  causationId?: string;
  changedPaths?: string[];
};
```

Consumers needing current details re-read the authoritative source through an approved query or projection pipeline.

Consumers needing historical state use the audit record or an explicit event snapshot contract.

Do not assume that re-reading the current master reproduces the state at the time of an old event.

### 14.3 Delivery semantics

Outbox delivery is at least once.

Therefore:

- Event IDs are globally unique.
- Consumers are idempotent.
- Ordering is guaranteed only within a declared aggregate stream if implemented.
- Failed delivery is retried by `@afenda/events`.
- Domain code does not contain NATS, Kafka, JetStream, or transport-specific handlers.

---

## 15. Security and privacy

Master data is not automatically non-sensitive.

Potentially sensitive fields include:

- Personal contact details.
- Tax identifiers.
- Registration documents.
- Bank references.
- Compliance blocks.
- Personal addresses.
- Government identifiers.

Requirements:

- Classify fields.
- Apply permission checks in the application/service boundary.
- Redact restricted fields from logs.
- Exclude restricted values from generic events.
- Encrypt selected values where required by the security architecture.
- Record reads of highly restricted fields when mandated.
- Retain only necessary personal data.
- Distinguish organization parties from natural-person parties.

The package receives a trusted actor and organization context; it does not derive trust from client-provided headers.

---

## 16. Database and indexing rules

Organization-owned root tables require, at minimum:

```text
PRIMARY KEY (id)
INDEX (organization_id, id)
INDEX (organization_id, status)
UNIQUE/INDEX (organization_id, normalized_code)
INDEX (organization_id, updated_at, id)
```

Additional rules:

- Same-organization relationships use composite constraints where practical.
- Foreign-key delete behavior is explicit; avoid accidental cascades.
- Audit and outbox rows are append-only.
- JSONB is permitted only for bounded, non-authoritative metadata with a documented schema.
- Core searchable and relational fields must remain typed columns.
- Money, quantity, and conversion values use precision-safe numeric types.
- Timestamps use a consistent UTC-capable database type.
- Database constraints backstop Zod validation.
- Zod validation does not replace database integrity.
- Database triggers are used only when architecture authority explicitly assigns invariants to the database.

Org-partitioned indexes are mandatory.

Physical table partitioning is deferred until measured scale justifies it; logical tenant isolation must not depend on future partitioning.

---

## 17. Cache and search behavior

Caches and search indexes are derived infrastructure.

Rules:

- Cache keys include organization, entity type, identifier, and version where appropriate.
- Mutation commit invalidates or advances the derived cache.
- Cache absence falls back to the authoritative database.
- Search results contain canonical IDs and organization context.
- Search cannot authorize access.
- Search cannot accept writes.
- Search-document loss must be recoverable by rebuilding from the SSOT.
- No module may continue operating from a stale private copy after the authoritative master is retired or blocked.

---

## 18. Governance readiness

The initial slice need not implement a complete Master Data Governance workflow, but the model must not block one.

Future governance may introduce:

- Change requests.
- Maker-checker approval.
- Data stewardship queues.
- Duplicate-review queues.
- Field ownership.
- Data-quality rules.
- Scheduled attestations.
- Controlled mass change.
- Approval policies by entity, field, organization, and risk.

SAP documents master-data governance as controlled central or distributed maintenance of supplier and customer master information.

Do not hard-code every update as requiring approval inside the package.

Instead, allow the application policy layer to decide whether a validated command may execute directly or must first become a change request.

---

## 19. Data-quality standards

Each master type shall declare:

- Required fields.
- Conditional fields.
- Uniqueness rules.
- Normalization rules.
- Reference validity.
- Activation prerequisites.
- Completeness score inputs, where useful.
- Duplicate-detection signals.
- Retirement blockers.
- Sensitive-field classification.

Data-quality results shall distinguish:

```text
error   — mutation prohibited
warning — mutation permitted with surfaced concern
info    — non-blocking enrichment opportunity
```

Warnings must not be silently discarded.

Quality scoring is advisory and must not replace specific validation rules.

---

## 20. Absorb

| Source idea                 | Afenda implementation                                                       |
| --------------------------- | --------------------------------------------------------------------------- |
| Shared master SSOT          | One authoritative package and canonical table family                        |
| Stable natural key          | Scoped normalized `code` plus branded UUID                                  |
| Unified business partner    | Party aggregate plus extensible roles                                       |
| UoM before item             | Canonical UoM reference plus item-specific conversions                      |
| Organization isolation      | Non-null organization boundary and same-org constraints                     |
| Soft-delete history         | Explicit lifecycle first; deletion only for exceptional unreferenced errors |
| Restore semantics           | Distinct restore command and event                                          |
| Change diffs                | Typed, deterministic, classification-aware field changes                    |
| Outbox fan-out              | Transactional minimal events; authoritative re-read where appropriate       |
| Bounded lists               | Cursor pagination, default 25, maximum 100                                  |
| Integration lookup          | Canonical code, aliases, and namespaced external IDs                        |
| Concurrent editing          | Required optimistic version checks                                          |
| Repeat-safe integration     | Idempotent command boundary                                                 |
| Duplicate handling          | Detection warnings plus governed merge                                      |
| Cross-company reference use | Explicit platform reference versus organization-master classification       |

Microsoft’s current Finance and Operations documentation describes cross-company data sharing specifically as a mechanism for shared reference and group data, supporting explicit rather than accidental sharing policies.

---

## 21. Reject — do not port

| Pattern                                                      | Reason                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Prisma plus `as any`                                         | Afenda stack is Drizzle plus Zod with typed contracts                    |
| NATS or JetStream handlers                                   | Transport lock violation; use PostgreSQL outbox through `@afenda/events` |
| `createEntityRoutes` inside domain package                   | Couples master semantics to HTTP                                         |
| `x-tenant-id` trust                                          | Tenancy derives from authenticated application context                   |
| Supplier or item `Map` stores                                | Non-durable production stub                                              |
| Separate Customer and Supplier roots                         | Duplicates legal identities and fragments relationships                  |
| Customer/supplier booleans as final model                    | Cannot scale to additional party roles or role lifecycle                 |
| Employee master                                              | Workforce identity belongs to identity/HR architecture                   |
| ID-only update, archive, restore, or merge                   | Tenant-escape risk                                                       |
| Generic unrestricted repository exports                      | Allows modules to bypass invariants                                      |
| Restore published as created                                 | Breaks downstream lifecycle semantics                                    |
| Merge published only as delete                               | Loses survivorship and redirection meaning                               |
| In-memory ChangeRecord                                       | Fake audit trail                                                         |
| `{ success, data }` envelopes                                | Conflicts with Afenda Result/ActionResult                                |
| `@vierp/shared` mega-types                                   | Creates ambiguous ownership and broad coupling                           |
| Universal global “box/carton/pallet” conversions             | Packaging conversion is item-specific                                    |
| Automatic fuzzy-match selection                              | Can post transactions against the wrong master                           |
| Reusing retired codes silently                               | Breaks integrations and historical interpretation                        |
| Hard delete of referenced masters                            | Destroys ERP traceability                                                |
| Unbounded list or export queries                             | Operational and denial-of-service risk                                   |
| Arbitrary JSON custom fields in the first slice              | Weakens schema, search, governance, and migration discipline             |
| Full snapshots in every outbox event                         | Payload growth, privacy leakage, and stale duplication                   |
| BOM, work order, stock quantity, price, or chart of accounts | Transactional or separately governed domain concepts                     |
| Global row-level sharing by nullable `organization_id`       | Ambiguous ownership and tenancy failure                                  |
| Last-write-wins updates                                      | Silent loss of concurrent changes                                        |
| Cross-module cascade delete                                  | Uncontrolled historical damage                                           |

---

## 22. Hard stops

| Stop                                                             | Why                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| No shadow masters in business modules                            | Divergent codes and identities break ERP joins                           |
| No nullable organization on organization masters                 | Creates unowned or cross-tenant records                                  |
| No production in-memory repositories                             | Fails durability and audit requirements                                  |
| No direct message-bus publishing from a mutation                 | Risks committed data without an event or an event without committed data |
| No trusted tenant headers inside the package                     | Client-controlled tenancy is unsafe                                      |
| No mutation without expected version                             | Prevents silent overwrite                                                |
| No externally initiated mutation without idempotency             | Retries can create duplicates                                            |
| No deletion of referenced masters                                | Historical transactions must remain interpretable                        |
| No universal packaging conversion                                | Packaging quantity varies by item                                        |
| No event containing unrestricted personal or confidential fields | Privacy and leakage risk                                                 |
| No generic `Record<string, unknown>` as core master state        | Removes domain integrity                                                 |
| No living `docs/` invention                                      | Scratch remains non-controlled until the Docs lane reopens               |
| No `_reference` publication to `@afenda/docs`                    | Historical source remains local and non-authoritative                    |
| No transactional module implementation in this slice             | Preserve bounded context and sequencing                                  |
| No organization sharing without named policy                     | Sharing must be intentional and auditable                                |

---

## 23. Staged capability

| Stage                          | Gate                            | Surface                                                                |
| ------------------------------ | ------------------------------- | ---------------------------------------------------------------------- |
| Domain scaffold and contracts  | This mission                    | `@afenda/master-data`                                                  |
| Platform references            | This mission                    | `ref_*` schema and controlled seed                                     |
| Core organization masters      | This mission                    | `md_party`, `md_item`, `md_item_group`, `md_warehouse`                 |
| Aggregate extensions           | **Shipped**                     | Roles, addresses, contacts, UoMs, aliases, external IDs                |
| Lifecycle and concurrency      | This mission                    | Status commands, version checks, dependency contract                   |
| Audit and outbox facts         | This mission                    | `@afenda/audit`, `@afenda/events` contracts                            |
| Web actions and authorization  | **Shipped**                     | `apps/web` Actions + `master_data.read` / `master_data.manage`         |
| Search projections             | **Shipped**                     | `md_*` projectors + rebuild-from-SSOT via `@afenda/search`             |
| Import and bulk upsert-by-code | **Shipped**                     | Dry-run + bounded upsert-by-code + reconcile report                    |
| Duplicate review and merge UI  | **Shipped** (steward minimal)   | Warning detection + `mergeParties` + steward Action/UI                 |
| Variants and attributes        | Named item-model slice          | Item templates and concrete variants                                   |
| Approval workflow              | Named MDG slice                 | Change requests and maker-checker                                      |
| Transactional modules          | ARCH-006                        | Sales, Purchasing, Inventory, Manufacturing, Finance — references only |

---

## 24. Minimum entity contract

Organization-owned root tables shall normally include:

```text
id
organization_id
code
normalized_code
name
status
version
created_at
created_by
updated_at
updated_by
activated_at
activated_by
blocked_at
blocked_by
retired_at
retired_by
deleted_at
deleted_by
```

Only include lifecycle fields that the entity supports, but lifecycle behavior must remain explicit.

Avoid a single ambiguous `is_active` flag.

Child records shall include:

```text
id
organization_id
parent_id
version
created_at
created_by
updated_at
updated_by
valid_from / valid_to where required
```

---

## 25. Package surface

Illustrative structure:

```text
packages/erp/master-data/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── contracts/
│   │   ├── context.ts
│   │   ├── errors.ts
│   │   ├── pagination.ts
│   │   └── change-set.ts
│   ├── party/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── schemas/
│   │   ├── repository.ts
│   │   └── index.ts
│   ├── item/
│   ├── uom/
│   ├── warehouse/
│   ├── payment-term/
│   ├── shared/
│   │   ├── lifecycle.ts
│   │   ├── code.ts
│   │   ├── idempotency.ts
│   │   ├── external-id.ts
│   │   └── dependency.ts
│   └── testing/
│       └── factories.ts
```

Public barrels expose supported commands, queries, schemas, result types, and branded identifiers.

Do not export raw Drizzle tables or unrestricted database clients from `@afenda/master-data`.

Schema tables remain available through the controlled `@afenda/db` schema surface required by migrations and infrastructure, not as an invitation for product modules to bypass the domain package.

---

## 26. Acceptance criteria

### Architecture

- `@afenda/master-data` is the single mutation owner for included operational masters.
- Platform references and organization masters are structurally distinguished.
- No business module defines a competing party, item, UoM, or warehouse root.
- Domain code has no dependency on Next.js, request headers, HTTP status codes, or message transports.

### Tenancy

- Every organization-master operation requires `organizationId`.
- Every update, archive, restore, and merge constrains both ID and organization.
- Same-organization relationships are database-enforced.
- Hard-tenant auditing includes every `md_*` organization-owned table.
- Cross-organization tests fail closed.

### Integrity

- Codes are normalized and scope-unique.
- External IDs are namespace-unique.
- Version conflicts are detected.
- Idempotent retries do not duplicate mutations.
- Referenced masters cannot be deleted.
- Invalid lifecycle transitions fail.
- Warehouse and item-group cycles fail.
- UoM dimension mismatches fail.
- Item packaging conversions are item-specific.

### Audit and events

- Mutation, audit fact, and outbox intent commit atomically.
- Every lifecycle action has a distinct semantic event.
- Sensitive fields are masked or excluded.
- Event contracts are versioned.
- Consumer retry assumptions are documented as at-least-once.

### Performance

- List queries are bounded to at most 100 rows.
- Cursor order is deterministic.
- Organization-leading indexes exist.
- No unbounded production scans are exposed.
- Search can be rebuilt from authoritative data.

### Maintainability

- No `as any`.
- No generic CRUD route factory in the domain.
- No in-memory production repository.
- No `{ success, data }` envelope.
- No unrestricted generic master repository.
- No transaction-domain leakage into the master-data package.

---

## 27. Verification

```text
1. Test-Path packages/erp/master-data
   → True after scaffold

2. rg "ref_country|ref_currency|ref_uom|md_party|md_party_role|md_item|md_item_uom|md_item_group|md_warehouse" packages/data-plane/db/src/schema
   → Expected canonical schema hits

3. rg "sales_customer|purchase_supplier|inventory_product|finance_vendor" packages apps
   → Zero competing master roots, excluding migrations and explicitly documented legacy adapters

4. rg "createEntityRoutes|x-tenant-id|startMasterDataSync|JetStream|NATS" packages/erp/master-data apps/web
   → Zero product ports in the master-data implementation

5. rg "WHERE.*id" packages/erp/master-data
   → Review every write for organization binding

6. pnpm audit:tenancy-nulls
   → Every organization-owned md_* table classified hard-tenant

7. pnpm audit:tenancy-fks
   → No cross-organization master relationships possible

8. pnpm test --filter @afenda/master-data
   → Lifecycle, code uniqueness, concurrency, idempotency, UoM, hierarchy, merge, and tenancy suites pass

9. Confirm no Employee or user-account table under md_*
   → Identity/HR boundary preserved

10. Confirm no stock quantity, balance, movement, price, BOM, work order, invoice, or journal table under md_*
    → Transaction boundary preserved

11. Confirm restore emits *.restored.v1
    → Never *.created.v1

12. Confirm party roles are relational
    → No fixed customer/supplier-only model

13. Confirm code aliases and external IDs survive retirement or merge
    → Historical and integration lookup preserved

14. Confirm audit and outbox rows are written in the same transaction as each mutation
    → No dual-write gap

15. Confirm all ordinary list APIs enforce pageSize <= 100
    → No unbounded application scan
```

---

## 28. Enterprise completion definition

This slice is complete only when:

- The package exists with real domain exports.
- Canonical schemas and constraints exist.
- Core master commands and lookups are implemented.
- Tenancy cannot be bypassed through an exported method.
- Version conflicts and idempotent retries are tested.
- Lifecycle semantics are explicit.
- Party roles are extensible.
- UoM conversion behavior is safe.
- Hierarchies reject cycles.
- Audit and outbox writes are atomic.
- No prohibited source-DNA pattern has entered product code.
- Verification evidence is recorded against the actual repository.
- Remaining out-of-scope leftovers are **named** (not silent): transactional modules beyond shipped R5-1 Sales (ARCH-006 Purchasing / Inventory). **Shipped** in later missions: web · search · import · steward merge · R1 variants/attributes · R2 MDG approval workflow · R3 `md_payment_term` · R4 `md_tax_registration` · R5-1 Sales.

---

## 29. Final implementation direction

Build the smallest complete master-data spine that protects future ERP modules from identity drift.

The first implementation shall prioritize:

1. Correct ownership.
2. Hard organization isolation.
3. Stable identity and codes.
4. Explicit lifecycle.
5. Concurrency and idempotency.
6. Party-role extensibility.
7. UoM correctness.
8. Dependency-safe retirement.
9. Transactional audit and outbox.
10. Bounded, deterministic access.

Do not pursue feature breadth by weakening these invariants.

Transactional modules may depend on master data only after the corresponding master is authoritative, tenant-safe, lifecycle-safe, and integration-safe.

---

Companions:

- [README.md](README.md)
- [../data/README.md](../data/README.md)
- [../events/events-dna.md](../events/events-dna.md)
- [../monorepo/README.md](../monorepo/README.md)
