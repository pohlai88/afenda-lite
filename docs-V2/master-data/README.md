# Master data (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/master-data/README.md` |
| Authority | **Scratch** — monorepo-discipline · data layer · `@afenda/master-data` |
| Purpose | ERP reference-data spine: Party · UoM · Item · Warehouse (+ aggregate extensions) — scalable, integration-ready, stable |
| Updated | 2026-07-28 |

DNA borrow/reject: [master-data-dna.md](master-data-dna.md). Operational contract: [operational-master-contract.md](operational-master-contract.md). Leftovers method: [development-method.md](development-method.md) · [remaining-slices.md](remaining-slices.md). Tax R4-0: [../tax/README.md](../tax/README.md).

## Verdict

**Create `@afenda/master-data` as a Rank-1 Platform package** (Drizzle tables in `@afenda/db`, Zod contracts + store port in the package). Master data is low-churn, high-fan-out reference data. Future Sales / Purchasing / Inventory / Finance **attach by FK + branded id + stable `code`** — they must not invent local customer/product tables.

`@afenda/master-data` reads platform references for ERP validation and lookup. It does not seed, create, update, deactivate, retire, or upsert platform `ref_*` rows.

| Concern | Owner |
|---------|-------|
| Physical `ref_*` table definitions | `@afenda/db` (`schema/master-data.ts`) |
| Platform reference seeding and maintenance | Platform administration or a dedicated reference-data authority |
| Reference read/query helpers used by ERP | `@afenda/master-data` |
| Organization mutations of references | Prohibited |
| Physical `md_party` · `md_item_group` · `md_item` · `md_warehouse` · `md_payment_term` · `md_item_template*` · `md_item_variant*` · extension `md_*` children | `@afenda/db` (`schema/master-data.ts`) |
| Organization master CRUD · Zod · brands · store port · extensions | `@afenda/master-data` |
| Outbox type catalog | `@afenda/events` (`master_data.*`) |
| Session org / Server Actions / RH | `apps/web` (`features/master-data` · `app/actions/*master-data*` · `merge-parties`) |
| Audit trail · search index | `@afenda/audit` · `@afenda/search` (projectors in `@afenda/master-data`) |
| Import / merge | `upsert*ByCode` · `mergeParties` · `findPartyDuplicateWarnings` |

## Capability matrix (DNA §23 — shipped)

| Stage | Disk evidence |
|-------|----------------|
| Domain scaffold + contracts | `packages/erp/master-data` · MD-0.1 kernel files under `src/{index,types,module-ids,module.manifest,permissions,authorization,command-options,parse-input,ports}.ts`; canonical contracts under `src/contracts/*` and `src/capabilities/core-organization-masters/*`; no thin re-export facades; single implementation tree `src/capabilities` |
| Result and error taxonomy | MD-0.2 stable `MasterDataErrorCode` in `src/contracts/reasons.ts`; `__tests__/error-taxonomy.test.ts`; no aggregate-specific canonical error names |
| Common command contracts | MD-0.3 `MasterDataMutationContext` / `VersionedMutationContext` in `src/contracts/context.ts`; branded `OrganizationId` · `UserId` · `CorrelationId`; `__tests__/command-contracts.test.ts`; no repeated raw identity/version Zod definitions in command inputs |
| Platform refs + core org masters | MD-1.1/MD-1.2 `ref_*` no-org-scope read helpers; `md_organization_dimension` create/update/activate/deactivate/archive/get/list/effective resolution; controlled taxonomy; version-CAS |
| Aggregate extensions (§3.3) | `md_party_*` · `md_item_*` · `md_warehouse_external_id` + `extensions.ts` |
| Hierarchy + lifecycle + concurrency + merge | MD-1.3 organization-dimension parent rules prevent self-parenting, ancestor cycles, cross-org parents, and inactive-parent child assignment; status CAS · `mergeParties` · `master_data.party.merged.v1` |
| Audit + outbox same-TX | Production mutations atomically persist state, audit, and outbox in one database transaction; current simple mutations use `runNeonHttpTransaction` CTEs |
| Web RBAC Actions | `master_data.read` / `master_data.manage` / `master_data.approve` / `master_data.import_create` / `master_data.import_validate` / `master_data.import_approve` / `master_data.import_apply` / `master_data.import_cancel` · Actions under `apps/web/app/actions/` |
| Search projections | Async/idempotent derived index in `search-projectors.ts`; entity keys `md_party` · `md_item` · `md_item_group` · `md_warehouse` · `md_payment_term`; rebuild-from-SSOT recovery |
| Import bulk upsert-by-code | `import-bulk.ts` · validate (`import_validate`) / approve (`import_approve`) / apply (`import_apply` + package `approved`) |
| Steward merge UI | `features/master-data/merge-parties-form.tsx` |
| Payment term (R3) | `md_payment_term` · `payment-term.ts` · `master_data.payment_term.*.v1` · web CRUD Actions |
| Item templates + concrete variants (R1) | `md_item_template*` · `md_item_variant*` · `item-variant.ts` · web template/variant Actions |
| Change requests + maker-checker (R2) | `md_change_request` · `change-request.ts` · `master_data.approve` · gated `activateParty` / `mergeParties`; controlled master-data governance only, not generic workflow · `change_request.*.v1` · steward panel |

**Named leftovers (not silent):** [remaining-slices.md](remaining-slices.md) — R4 implement (SSOT [../tax/tax-architecture.md](../tax/tax-architecture.md)) · R6 ([r6-harden-missions.md](r6-harden-missions.md)). R1–R3 **shipped**; R5-0 accepted; **R5-1 Sales shipped** (`@afenda/sales` · [arch-006-consumer-contract.md](arch-006-consumer-contract.md)).

## Spine (scalability · integration · stability)

| Pillar | Rule |
|--------|------|
| Scalability | Hard `organization_id` on `md_*`; partial unique `(organization_id, normalized_code)` where live; list page ≤100; soft-delete / retire |
| Integration | Single write path; atomic state + audit + outbox transaction; async/idempotent search projection; `getByCode` / external-id / alias; outbox `{ organizationId, entityId, code, version }`; branded command context ids; no header tenancy |
| Stability | Same-org FKs; status lifecycle; distinct `*.restored`; hard-tenant CI; fail-closed `Result` |

MD-1 reference integrity evidence: `__tests__/platform-references.test.ts`, `__tests__/organization-dimension.domain.test.ts`, `__tests__/master-data.domain.test.ts`, and `__tests__/extensions.domain.test.ts` cover disabled/nonexistent references, invalid country/UoM use, incompatible UoM dimensions, deterministic reference lists, organization-dimension CAS, taxonomy, and hierarchy cycle prevention.

## Entities (Authority B)

| Entity | Table | Role | Downstream (future) |
|--------|-------|------|---------------------|
| UoM | `ref_uom` (+ `ref_uom_dimension`) | Platform measure (never org `md_uom`) | Item, stock, BOM |
| Party | `md_party` | Who we trade with | SO/PO, AR/AP |
| Party role | `md_party_role` | Closed catalog roles | Sales/Purchasing |
| Item group | `md_item_group` | Classification hierarchy | Item |
| Item | `md_item` | What we buy/sell/stock (`base_uom_id` → `ref_uom`) | Lines, inventory |
| Item UoM | `md_item_uom` | Item-specific conversions | Lines |
| Warehouse | `md_warehouse` | Where (location master only) | Stock ledger |
| Payment term | `md_payment_term` | Commercial default (`net_days`) | SO/PO/AR (later modules) |
| Item template | `md_item_template` (+ attribute / option) | Allowed variant attributes | Concrete variants |
| Item variant | `md_item_variant` (+ attribute values) | Membership linking template → concrete `md_item` | Lines (by item id) |

Dependency order: **`ref_uom_dimension` → `ref_uom` → `md_item`**; **`md_item_group` → `md_item`**; **`md_party` → `md_party_role`**; **`md_item_template` → `md_item_variant` → `md_item`**.

## Must not

- Shadow `sales_customer` / `purchase_supplier` / `inventory_product` tables
- Org-scoped `md_uom` or customer/supplier booleans on `md_party`
- NATS / Map production stores / `{ success }` envelopes / `x-tenant-id` authority
- Employee as master data (Neon Auth / identity owns people)
- BOM · WO · stock qty · CoA in this pack (transactional / ledger — later farms)
- Dual-write `md_*` outside `@afenda/master-data`
- Tax registration ahead of tax architecture SSOT; SO/PO/AR line behavior inside master-data

## Verify

```bash
pnpm --filter @afenda/master-data typecheck test
pnpm --filter @afenda/db test -- master-data-schema tenancy
pnpm --filter @afenda/events test
pnpm --filter @afenda/search typecheck test
pnpm --filter @afenda/web test -- master-data
pnpm audit:tenancy-nulls
```

### §28 claim → evidence (commands / tests)

| Claim | Path |
|-------|------|
| Sole write path | `packages/erp/master-data/src/{party,item,item-group,warehouse,payment-term,item-variant,change-request,extensions,merge,import-bulk}.ts` |
| MDG change requests (R2) | `change-request.ts` · `0008_md_change_request.sql` · gated activate/merge · `__tests__/change-request.domain.test.ts` · `apps/web/__tests__/master-data-change-request.test.ts` |

| Extensions + role-before-activate | `extensions.ts` · `__tests__/extensions.domain.test.ts` |
| Search projectors + rebuild | `search-projectors.ts` · `__tests__/search-projectors.test.ts` |
| Import dry-run / apply (R6-import-approve) | `import-bulk.ts` (`approved` gate + optional `requireSegregatedApproval`) · separated `master_data.import_validate` / `master_data.import_approve` / `master_data.import_apply` · `__tests__/import-bulk.test.ts` · `apps/web/__tests__/master-data-import.test.ts` |
| Governed merge + former code | `merge.ts` · `__tests__/merge.domain.test.ts` · `apps/web/__tests__/master-data-merge.test.ts` |
| Payment term (R3) | `payment-term.ts` · `0009_md_payment_term.sql` · `apps/web/app/actions/*payment-term*` · domain + Action tests |
| Variants / attributes (R1) | `item-variant.ts` · `drizzle-variant-mutations.ts` · `__tests__/item-variant.domain.test.ts` · `0007_md_item_variants.sql` · template/attribute/option/variant Actions · shell Templates + Variants panels |
| Web RBAC | `platform-permission-catalog.ts` · `apps/web/__tests__/master-data-actions.test.ts` |

DAG: [../monorepo/README.md](../monorepo/README.md). Data: [../data/README.md](../data/README.md). Events: [../events/README.md](../events/README.md). Tenancy: [../tenancy/README.md](../tenancy/README.md).
