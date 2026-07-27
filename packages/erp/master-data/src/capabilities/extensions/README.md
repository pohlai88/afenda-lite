# Extensions

## Responsibility

This capability group owns child records and aggregate extensions attached to core organization masters:

- party roles
- party addresses
- party contacts
- party external IDs
- party relationships
- item UoM conversions
- item barcodes
- item external IDs
- item aliases
- warehouse external IDs
- item-template attributes and options
- item-variant attribute values

Extensions enrich master roots without becoming standalone package authorities.

## Aggregate ownership

Extensions are mutated only through the `@afenda/master-data` root contract and
do not establish alternate ownership boundaries.

| Extension | Aggregate root |
| --- | --- |
| Party role | Party |
| Party address | Party |
| Party contact | Party |
| Party external ID | Party |
| Party relationship | Party and related party |
| Item UoM conversion | Item |
| Item barcode | Item |
| Item external ID | Item |
| Item alias | Item |
| Warehouse external ID | Warehouse |
| Template attribute | Item template |
| Template attribute option | Item-template attribute |
| Variant attribute value | Item variant |

An extension may carry its own identifier, lifecycle, and version while
remaining subordinate to the listed aggregate root.

### Party roles

Party roles are controlled operational capacities, not booleans on `md_party`.
The package catalog includes customer, supplier, employee, carrier,
manufacturer, distributor, franchisee, franchisor, service provider,
government agency, bank, landlord, tenant, and contact roles.

The public root barrel provides create, update, activate, deactivate, archive,
get, list, and active-list operations. Updates use CAS and are limited to draft
or inactive roles. The database permits multiple drafts but enforces at most
one active role of the same code per party and organization. Deactivating or
archiving the final active role of an active party is rejected; the party must
be explicitly suspended or archived through its own command.

### Party addresses

Party addresses keep structured address data as their authority: address type,
purpose, three address lines, city, administrative area, postal code, country,
attention, validation status, and an optional effective interval. Display or
country-specific formatting is derived downstream and is never stored as the
only address representation.

Address types and purposes are controlled package catalogs. A new active
address requires an existing active country reference and a usable, unmerged
party in the same organization. Effective ranges cannot end before they start.
At most one active primary address exists per party and purpose. Selecting a
new primary locks the party, demotes the previous primary, increments both
affected child versions, and records their audit and outbox facts in the same
database transaction.

### Party contacts

Party contacts use controlled endpoint types: email, telephone, mobile, fax,
website, messaging, and other. The caller-facing value is retained separately
from a type-specific normalized comparison value. Email normalization preserves
the local part while normalizing domain casing; telephone-like values use the
package's international canonical number policy; website normalization governs
scheme and host. General master-code normalization never applies to contacts.

Verification is explicit state, not an inference from a populated value. A
verified contact must carry `verified_at`; changing its type or value resets it
to unverified and clears that timestamp. Notification routing can use
`isPartyContactTrustedDestination()` to require active lifecycle, an effective
date, and explicit verification. Contact values are permission-protected query
data and are redacted from audit changes and event payloads.

At most one active primary contact exists per party, contact type, and purpose.
Selecting a replacement primary locks the party and records the demotion and
replacement in the same transaction.

### Party external IDs

Party external IDs bind a canonical party to an identity issued by a named
source system and identifier type. Source and type are normalized controlled
codes. The display value is retained separately from its deterministic
comparison value, and every command explicitly selects `sensitive` or
`insensitive` matching; case behavior is never inferred.

The active identity key is organization, source system, identifier type, and
normalized value. It cannot resolve to more than one party. Selecting a new
primary identifier for the same party, source, and type demotes the previous
primary atomically. Identifier values are excluded from audit and event
metadata, while query access remains permission-controlled. These identifiers
support imports, reconciliation, and integrations and never replace the
party's canonical normalized master code.

### Party relationships

Party relationships store one governed association between a source party and
a target party. The controlled catalog defines whether each relationship is
directional, reciprocal, hierarchical, or symmetric; callers cannot provide
independent direction metadata that contradicts the selected type. Effective
date ranges are optional but cannot run backwards.

Inverse inputs are canonicalized before persistence. `subsidiary_of` reverses
to `parent_of`, `tenant_of` reverses to `landlord_of`, and symmetric
`related_party` pairs are ordered by identifier. Only the canonical row is
stored; inverse and symmetric views must be derived by query adapters rather
than maintained as independent rows.

Both parties must be usable, unmerged members of the requested organization.
Self-reference is rejected for the current catalog. Hierarchical writes lock
the organization relationship graph and use a recursive database check to
prevent cycles under concurrent creation. Composite foreign keys, semantic
check constraints, effective-range validation, and active-row uniqueness form
the final database enforcement layer.

## Common extension contract

Every mutable extension table carries its own identifier, organization scope,
aggregate-specific parent identifier, lifecycle status, version,
created/updated audit stamps, and nullable archive stamps. Effective-dated
extensions additionally carry an effective interval. Most established tables
use `valid_from` and `valid_to`; party addresses and contacts expose the
contract-specific `effective_from` and `effective_to` names.

Organization-owned parent links use composite database foreign keys:

```text
(organization_id, parent_id)
→ parent_table(organization_id, id)
```

The parent tables expose matching composite uniqueness constraints. These
foreign keys make cross-organization attachment impossible even if command
validation is bypassed. Platform references such as `ref_uom` remain global and
retain their non-tenant reference keys.

### Database constraints

Migration `0022_extension_database_constraints` completes the database guard
layer for the flat extension capability. Every versioned extension rejects
versions below one. Party-role and item-UoM validity intervals reject reversed
ranges, while the existing address, contact, and relationship effective-range
checks remain authoritative.

Organization-scoped partial unique indexes enforce active identities for
roles, primary/default records, external IDs, item UoMs, barcodes, aliases,
template definitions, and current variant attribute values. The barcode index
permits historical archived reuse while preventing two active resolutions in
the same organization and symbology. Alias identity is organization + item +
type + nullable-language scope + normalized value.

All organization-owned parent references use `organization_id` in their
composite foreign keys. Relationship endpoints, template attributes/options,
variants, and typed option values therefore cannot cross tenant boundaries at
the database layer.

## Common mutation rules

Every extension command parses and normalizes its input, authorizes the actor,
and resolves the parent through the requested organization before writing. It
then validates parent lifecycle, extension uniqueness and dependencies, and
the caller's expected version for updates or lifecycle transitions.

The production mutation is one atomic unit: extension state and version,
audit fact, and domain event either commit together or do not commit. Database
CAS is authoritative even when the command performs an earlier version check.

### Version CAS

Every extension update and lifecycle transition requires a positive safe
`expectedVersion`. `extension-version-cas.ts` provides the shared command-layer
comparison and overflow-safe next-version calculation. A successful mutation
increments the child version exactly once; a failed mutation does not advance
it.

The command-layer comparison is diagnostic only. Drizzle mutations include the
expected version in the atomic `UPDATE` predicate and return a typed version
conflict when no row is claimed. The current mutable contracts apply this rule
to party-role updates and transitions, party-address updates, party-contact and
verification updates, item-template updates and transitions, and the variant
retirement operation. Variant retirement CAS-checks both the variant and its
backing item in the same transaction.

Parent-sensitive child mutations additionally use aggregate serialization:

| Invariant | Transactional authority |
| --- | --- |
| Party activation requires an active role | lock party, then recheck active role before party CAS |
| Final active role cannot be removed from an active party | lock party, then count active siblings before role CAS |
| Primary address/contact/barcode replacement | lock parent before sibling demotion and child write |
| Default purchase/sales UoM replacement | lock item before sibling demotion and child write |
| Template configuration and variant identity | lock template/variant parents and recheck governed state |

The party lock is shared by activation and role transition paths. Therefore an
activation cannot race a final-role deactivation using a stale role snapshot:
whichever command acquires the party lock first establishes the parent state
seen by the following invariant check.

### Authorization

Extension mutations use capability-specific permissions rather than the broad
`master_data.manage` grant:

| Extension capability | Required permission |
| --- | --- |
| Party roles | `master_data.party_role_manage` |
| Party addresses | `master_data.party_address_manage` |
| Party contacts | `master_data.party_contact_manage` |
| Party external IDs | `master_data.party_external_id_manage` |
| Party relationships | `master_data.party_relationship_manage` |
| Item UoM conversions, barcodes, external IDs, aliases, and groups | `master_data.item_extension_manage` |
| Warehouse external IDs | `master_data.warehouse_manage` |
| Template attributes and options | `master_data.template_manage` |
| Variant creation and attribute assignment | `master_data.variant_manage` |

Higher-risk operations use separate grants:

| Sensitive operation | Required permission |
| --- | --- |
| Verify or revoke contact verification | `master_data.party_contact_manage` |
| Legal, government, tax, VAT, registration, national or regulatory party ID | `master_data.party_external_id_manage`; unmasked sensitive reads additionally require `master_data.sensitive_external_id_read` |
| Parent, subsidiary or ownership relationship | `master_data.party_relationship_manage` |
| Create an identity-defining template attribute | `master_data.variant_manage` |

`extension-authorization-policy.ts` is the command-to-permission authority and
contains the deterministic sensitive-input classifiers. The module manifest
enforces that mapping through the package authorization port. Base extension
permissions are included in the Editor role template for compatibility;
field-level sensitive read permissions remain Org Admin-only unless explicitly
assigned.

### Query surface

The public package exposes typed, aggregate-aware extension queries:

| Aggregate | Queries |
| --- | --- |
| Party | `listPartyRoles`, `listActivePartyRoles`, `listPartyAddresses`, `getPrimaryPartyAddress`, `listPartyContacts`, `getPrimaryPartyContact`, `findPartyByExternalId`, `listPartyRelationships` |
| Item | `listItemUoms`, `getDefaultItemSalesUom`, `getDefaultItemPurchaseUom`, `findItemByBarcode`, `findItemByExternalId`, `listItemAliases` |
| Warehouse | `findWarehouseByExternalId` |
| Item template | `listTemplateAttributes`, `listTemplateAttributeOptions` |
| Item variant | `listVariantAttributeValues`, `getVariantConfiguration` |

Every query parses an organization and actor context, authorizes through a
registered query ID, and includes the organization in the store predicate.
Primary/default readers additionally constrain lifecycle and archive state.
Relationship lists include rows where the requested party is either canonical
source or target; no inverse duplicate rows are synthesized.

`getVariantConfiguration` returns the assembled variant aggregate—membership,
sellable item, deterministic combination key, and typed attribute values—so it
cannot drift from `getItemVariantById`. The package intentionally provides no
`listExtensions(entityType, entityId)` API; adding extension kinds requires a
typed command, query ID, authorization mapping, and store contract.

Mutations that can change a root invariant also serialize through the parent
row. This includes final-active party-role retirement and changes to primary
addresses, primary contacts or barcodes, and variant-defining values. Partial
unique indexes provide the final concurrent-write guard for primary child
identities.

### Primary and default records

The package uses one replacement policy: selecting a new primary or default
atomically demotes the current record in the same aggregate mutation. The
demoted child's version is incremented and its audit and domain-event evidence
is written in the same production database transaction. Memory and Drizzle
stores use the same identity scopes:

| Record | Primary/default scope |
| --- | --- |
| Party address | organization + party + purpose |
| Party contact | organization + party + contact type + purpose |
| Party external ID | organization + party + source system + external-ID type |
| Item barcode | organization + item + UoM |
| Item external ID | organization + item + source system + external-ID type |
| Default purchase UoM | organization + item |
| Default sales UoM | organization + item |

A nullable purpose or barcode UoM is one explicit scope, not a wildcard. For a
barcode, null UoM denotes the non-UoM scanning scope. Partial unique indexes
remain authoritative under concurrent writes.

## Lifecycle families

Extensions use only three lifecycle families:

| Family | States |
| --- | --- |
| Standard child | `draft` → `active` ⇄ `inactive` → `archived` |
| Effective-dated identity or registration | `pending` → `active` → `expired` or `revoked` → `archived` |
| Relationship | `draft` → `active` ⇄ `inactive` → `terminated` → `archived` |

`extension-lifecycle.ts` assigns every extension kind to one family and is the
authoritative transition matrix. Each transition records its allowed source
state, required permission and reason policy, expected-version requirement,
parent-state requirement, dependency behavior, event action, and audit action.

`archived` is terminal for mutation but not for reads. Organization-scoped get
and list queries continue returning archived children so audit, historical,
reconciliation, and import investigations retain their evidence.

### Item UoM conversions

Item-specific conversions use one canonical direction:

```text
1 alternate UoM = conversion_factor × the item's base UoM
```

The base UoM is always resolved from `md_item.base_uom_id`; both UoMs remain
platform references in `ref_uom`. A factor must be positive and fit the governed
`numeric(24,12)` precision. When the base UoM is explicitly represented, its
factor must be exactly `1`. Only one active conversion may exist for an item and
alternate UoM.

Physical conversions require matching dimensions. Governed packaging/count
relationships additionally require count-dimension UoMs and an explicit approval
reference. Cross-dimension conversions, including mass-to-volume, are rejected;
they require a separate density or technical-conversion capability.

Purchase, sales, inventory, and purchase/sales-default meanings are explicit.
Creating a new default atomically demotes the previous active default, increments
its version, and records audit and outbox evidence in the same transaction.

### Item barcodes

Barcodes are item-owned lookup and reconciliation identities; they never replace
the item's canonical normalized code. The stored contract preserves the display
value and a symbology-specific normalized value for `EAN_8`, `EAN_13`, `UPC_A`,
`UPC_E`, `GTIN_14`, `CODE_128`, `QR`, `INTERNAL`, and `OTHER`.

EAN, UPC, and GTIN inputs are normalized to digits and validated against their
required length and checksum. Other symbologies preserve case and reject control
characters; CODE_128 is restricted to printable ASCII. Organization,
symbology, and normalized value form a durable unique identity, including
archived rows, so historical resolution cannot become ambiguous.

A packaging barcode supplies `uomId` and positive `packQuantity` together. The
UoM must be active and must be either the item's base UoM or an active item UoM
conversion. Creating a primary barcode atomically demotes the prior active
primary in the same item-and-UoM scope, increments its version, and records
audit and outbox evidence. Different UoM scopes may each retain one active
primary barcode.

### Item external identifiers

Item external identifiers use the same deterministic policy as party external
identifiers. `sourceSystem` and `externalIdType` are normalized lowercase codes;
the display value is NFC-normalized and preserved, while `normalizedValue`
follows the declared sensitive or insensitive comparison policy.

The active matching identity is organization, source system, external-ID type,
and normalized value. It can resolve to only one active item. Primary identity
replacement is scoped to the item, source system, and external-ID type and is
performed atomically with version, audit, and outbox updates.

These identifiers support supplier catalogs, marketplaces, legacy ERP sources,
integration reconciliation, and deterministic imports. Matching is exact and
governed: it never replaces the canonical item code, performs fuzzy matching,
or overwrites an item merely because another value appears similar.

### Item aliases

Aliases are Unicode-aware alternate names used for discovery, not alternate
master codes. Display values use NFC normalization and whitespace folding;
comparison values use Unicode NFKC plus deterministic lowercase folding. The
master-code ASCII normalization policy is never applied.

Alias type is controlled as `short_name`, `commercial_name`, `supplier_name`,
`customer_name`, `legacy_name`, `local_name`, `scientific_name`,
`search_keyword`, or `other`. An optional active platform language reference,
normalized source code, and explicit searchability flag govern how each alias is
interpreted and exposed.

Search returns all distinct active items matching searchable aliases. Duplicate
aliases across items are permitted for discovery; the singular lookup returns a
typed conflict when more than one item matches and never chooses, merges, or
authorizes mutation of an item. Retired items cannot receive new aliases and are
excluded from active alias search.

### Warehouse external identifiers

Warehouse external identifiers use the same explicit identity policy as party
and item external identifiers. `sourceSystem` and `externalIdType` are
normalized lowercase codes; the display value is NFC-normalized and preserved,
and `normalizedValue` follows the declared sensitive or insensitive comparison
policy.

The active matching identity is organization, source system, external-ID type,
and normalized value. It resolves to at most one active warehouse. Creation
locks and validates the warehouse under the same organization, and retired
warehouses cannot receive active identifiers. Lookup excludes inactive or
archived identifiers and non-active or retired warehouses.

These identifiers support warehouse-management systems, carriers,
marketplaces, suppliers, customers, legacy platforms, and external logistics
providers. Matching is deterministic and never replaces the canonical
warehouse code.

### Item-template attributes and options

Template attributes are governed definitions owned by an item template. Their
codes are normalized and unique within that template. Supported data types are
explicit: `text`, `integer`, `decimal`, `boolean`, `date`, `single_option`,
`multiple_option`, and `reference`. Required, variant-defining, searchable, and
display-order policies are persisted separately from structurally validated
type-specific validation rules.

Attributes and options can be introduced only while the same-organization
template remains draft. This prevents destructive definition changes after
active variants exist. No non-CAS update or physical-delete operation is
exposed; future definition changes must retain the extension version and check
active variant/value dependencies atomically.

Options are accepted only for active `single_option` or `multiple_option`
attributes. Their normalized codes are unique within the attribute. Active
variant creation excludes inactive or archived options, while list operations
retain them for historical interpretation. Composite tenant foreign keys
prevent cross-organization attachment, and existing value foreign keys block
physical deletion while an option remains referenced.

### Item-variant attribute values

Variant values use one representation selected by the active attribute data
type: text, integer, fixed-precision decimal, boolean, calendar date,
single-option ID, multiple governed option IDs, or reference value. Scalar
representations live in separate typed columns. Multi-option selections use a
tenant-safe child relation rather than duplicated labels or an unrestricted
text/JSON value bag.

Creation resolves attributes through the variant's template, validates
type-specific rules, requires every required active attribute, and rejects
inactive, archived, foreign-attribute, or cross-organization options. A partial
unique index permits only one current active value for each variant and
attribute while preserving archived history.

The variant combination signature includes only active attributes marked
`isVariantDefining` and canonical typed values or normalized option codes.
Template activation requires at least one such attribute, and the live
template/signature database index remains authoritative for SKU combination
uniqueness. No public value-update command exists, so an active transactional
SKU cannot silently rewrite an identity-defining value; such a capability must
be an explicit CAS mutation with item-code and dependency conflict checks.

## Boundaries

- Party activation depends on active party-role evidence; do not add `is_customer`, `is_supplier`, `is_employee`, or equivalent capability booleans to `md_party`.
- Item UoM conversions belong to `md_item_uom`; they do not make UoM organization-scoped, and platform UoMs remain sourced from `ref_uom`.
- External IDs, aliases, and barcodes support lookup, reconciliation, imports, and integration; they do not replace normalized canonical master codes.
- Item-template attributes and options define product-family configuration.
- Variant values describe item variants; they do not own inventory quantities, prices, balances, or transaction state.
- Applications and transactional packages cannot mutate extension rows directly.
- Every child reference remains organization-scoped to its aggregate root.
- Extension writes preserve parent lifecycle, version-CAS, audit, event, and transaction requirements.
- Physical deletion is unavailable through the capability; archived extension rows remain readable for history and reconciliation.

## Source ownership

The capability is flat and grouped by cohesive aggregate responsibility:

- Party extension commands and queries are split by child record:
  `party-roles.ts`, `party-addresses.ts`, `party-contacts.ts`,
  `party-external-ids.ts`, and `party-relationships.ts`.
- Item extension commands and queries are split by child record:
  `item-uoms.ts`, `item-barcodes.ts`, `item-external-ids.ts`, and
  `item-aliases.ts`.
- Warehouse extension identity commands and queries live in
  `warehouse-external-ids.ts`.
- Template and variant child records live in `template-attributes.ts`,
  `template-options.ts`, and `variant-attribute-values.ts`; policy helpers stay
  in `template-attribute-policy.ts` and `variant-attribute-value-policy.ts`.
- `template-store.ts` owns template attributes, options, and variant-value persistence contracts.
- `template-attribute-policy.ts` and `variant-attribute-value-policy.ts` own typed definition and value normalization rules.
- `extension-schemas.ts` owns extension boundary validation.
- `store.ts` composes party, item, and warehouse extension persistence ports.
- `extension-policies.ts`, `extension-errors.ts`, and `extension-transaction-contract.ts` own shared extension kernel policy and event contracts.
- `extension-lifecycle.ts` owns lifecycle families, assignments, and transition controls.

Individual table buckets and generic `listExtensions` APIs are intentionally absent.

## Store boundaries

Persistence is composed from four aggregate-owned contracts:

- `PartyExtensionStore`
- `ItemExtensionStore`
- `WarehouseExtensionStore`
- `ItemVariantExtensionStore`

`MasterDataStore` composes these contracts for the production adapter, while
each command and query resolves only a `Pick` of the exact methods it consumes.
This keeps aggregate ownership explicit without introducing separate
repositories or alternate write authorities.

Every store mutation receives the mutation ports and correlation metadata and
must persist the child change, any parent invariant change, audit fact, and
domain event in one transaction. Application adapters may select a production
store, but must not orchestrate those writes as separate calls.

### Transaction and event contract

Successful production mutations atomically persist extension state, any
required parent or primary/default-record change, its audit fact, and a
versioned outbox event. The authoritative event IDs live in
`extension-transaction-contract.ts`; the shared `@afenda/events` schema accepts
both the current IDs and historical IDs needed to read existing event logs.

Extension event payloads contain the organization ID, extension ID, resulting
version, actor ID, and correlation ID. Parent IDs and controlled classification
codes may be included. Raw contact values, structured address content,
barcodes, aliases, and external identifier values are excluded.

Item-variant creation treats each assigned attribute value as a mutation in
the same serializable transaction as the item and variant membership. Each
value therefore receives its own audit fact and
`master_data.item_variant_attribute_value.assigned.v1` outbox event.

## Public contract

Consumers import extension operations from `@afenda/master-data`; no Extensions
package subpath is exported. Production
Drizzle mutations remain package-internal and atomically persist extension
state, audit facts, and domain events.
