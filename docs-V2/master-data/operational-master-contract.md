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
| Platform refs | `ref_country` · `ref_currency` · `ref_language` · `ref_time_zone` · `ref_uom_dimension` · `ref_uom` | Seed / system ops only — package exposes **read** helpers; orgs never mutate refs |
| Org operational masters | `md_party` · `md_item_group` · `md_item` · `md_warehouse` · `md_payment_term` · `md_tax_registration` · templates/variants | Sole writes via `@afenda/master-data` commands |
| Extensions | `md_party_*` · `md_item_*` · `md_warehouse_external_id` | Same package; lifecycle invariants (e.g. final active role) |

UoM remains platform-only: `md_item.base_uom_id` → `ref_uom`; conversions in `md_item_uom` with positive non-zero rational factors.

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

- `mergeParties` requires an **approved** change request (MDG).
- Survivor keeps identity; source is tombstoned (`merged_into_id`); former codes preserved.
- No automatic merge from duplicate warnings alone.

## Import

| Mode | Behavior |
|------|----------|
| `create_only` | Fail if code exists |
| `update_existing` | Fail if code missing; mutable fields only |
| `create_or_update` | Default upsert-by-code |

Validate = dry-run (`manage`). Apply = `approved: true` + `import_approve`. Batches ≤ 100 rows. Mutable-field allowlists reject immutable patches fail-closed.

## Consumer attachment (ARCH-006)

Downstream modules attach by branded id + stable `code` + snapshot at create/post. See [arch-006-consumer-contract.md](arch-006-consumer-contract.md).
