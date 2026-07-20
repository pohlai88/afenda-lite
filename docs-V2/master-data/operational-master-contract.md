# Operational master contract (Scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/master-data/operational-master-contract.md` |
| Authority | **Scratch** — not Living DOC-001 |
| Purpose | Bound org-scoped operational masters vs platform refs, search, merge, and import |
| Parents | [README.md](README.md) · [master-data-dna.md](master-data-dna.md) · package [`@afenda/master-data`](../../packages/erp/master-data/README.md) |
| Updated | 2026-07-21 |

## Platform refs vs org masters

| Class | Tables | Write path |
|-------|--------|------------|
| Platform refs | `ref_country` · `ref_currency` · `ref_language` · `ref_time_zone` · `ref_uom_dimension` · `ref_uom` | Seed / system ops only — package exposes **read** helpers (`master_data.read` via `requireMasterQueryPermission`); orgs never mutate refs |
| Org operational masters | `md_party` · `md_item_group` · `md_item` · `md_warehouse` · `md_payment_term` · `md_tax_registration` · templates/variants | Sole writes via `@afenda/master-data` commands |
| Extensions | `md_party_*` · `md_item_*` · `md_warehouse_external_id` | Same package; lifecycle invariants (e.g. final active role) |
| Import durability | `md_import_batch` | Apply stores report keyed by org + `idempotencyKey` (unique); replay returns stored report |

UoM remains platform-only: `md_item.base_uom_id` → `ref_uom`; conversions in `md_item_uom` with positive non-zero rational factors. Item create inserts a base `md_item_uom` row for `base_uom_id` with numerator/denominator = 1 (usage `other`). Rounding rules are controlled: `half_up` · `half_even` · `down` · `up`.

Party relationship types are controlled: `parent_of` · `subsidiary_of` · `contact_for` · `bill_to_for` · `ship_to_for`.

## Permissions (coarse DNA)

| Code | Duty |
|------|------|
| `master_data.read` | Lists, get-by-code, search |
| `master_data.manage` | Creates, updates, lifecycle, import validate (dry-run) |
| `master_data.approve` | MDG approve/reject change requests |
| `master_data.import_approve` | Import apply (`approved` gate in package) |

Web Actions use authenticated member session + these codes (not operator-only). Fine-grained codes (`party.merge`, …) are **out of this contract** until a named RBAC mission.

## Search

- Indexes are **derived** (`search-projectors.ts` → `@afenda/search`).
- Rebuild-from-SSOT is allowed; search never authorizes or writes `md_*` / `ref_*`.
- Console search UI is read-only FTS.

## Merge

- `mergeParties` requires an **approved** change request (MDG); permission remains `master_data.manage` (Tier A — no fine-grained `party.merge`).
- Survivor keeps identity; source is tombstoned (`merged_into_id`); former codes preserved.
- Reject merge if source or target is already merged (one-hop tombstone; no merge-of-merged). Readers may use `resolveCanonicalPartyId`.
- Same-TX consolidation: non-colliding active roles reassigned to survivor; colliding source roles retired; addresses/contacts re-pointed; external IDs moved when non-colliding.
- No peer ERP table rewrite. No automatic merge from duplicate warnings alone.

## Import

| Mode | Behavior |
|------|----------|
| `create_only` | Fail if code exists |
| `update_existing` | Fail if code missing; mutable fields only |
| `create_or_update` | Default upsert-by-code |

Validate = dry-run → command `master_data.import.validate_party_batch` → permission `master_data.manage`. Apply upserts (`master_data.import.upsert_*`) → `approved: true` + `master_data.import_approve`. Apply requires `idempotencyKey` (trim, max length); durable `md_import_batch` replay returns the stored report. Batches ≤ 100 rows. Mutable-field allowlists reject immutable patches fail-closed. Web apply covers party · item_group · item · warehouse via shared helper.

## Package exports

| Path | Role |
|------|------|
| `@afenda/master-data` | Commands · queries · schemas · brands · permissions · reasons (no Drizzle class) |
| `@afenda/master-data/adapters/drizzle` | `DrizzleMasterDataStore` · `createDrizzleMasterDataStore` |

Production atomicity = store CTE. `MutationPorts` are Memory/test composition only.

## Consumer attachment (ARCH-006)

Downstream modules attach by branded id + stable `code` + snapshot at create/post. See [arch-006-consumer-contract.md](arch-006-consumer-contract.md).
