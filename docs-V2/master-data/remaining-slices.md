# Master-data remaining slices — technical specification

| Field | Value |
|-------|-------|
| Surface | `docs-V2/master-data/remaining-slices.md` |
| Authority | **Scratch** — not Living DOC-001 |
| Mode | Technical spec (engineers implementing next MD slices) |
| Audience | Implementers of `@afenda/master-data` · `apps/web` · future ARCH-006 modules |
| Status | Open — Authority B spine mission **closed**; leftovers **named** |
| Updated | 2026-07-20 |
| Parents | [master-data-dna.md](master-data-dna.md) §7.3 · §23 · §28 · [README.md](README.md) |

**Action this doc enables:** open the next mission with a bounded backlog, ownership, and verify gates — without reopening shipped spine work or inventing silent scope.

**Development method (R4–R6):** [development-method.md](development-method.md) · tax SSOT [../tax/tax-architecture.md](../tax/tax-architecture.md) · R5 contract [arch-006-consumer-contract.md](arch-006-consumer-contract.md) · R6 briefs [r6-harden-missions.md](r6-harden-missions.md).

---

## Overview

The DNA §23 Authority B spine is **shipped** (core masters, §3.3 extensions, lifecycle/CAS, same-TX audit/outbox, web RBAC, search projectors, import bulk, steward merge).

What remains is **explicit follow-on work**. This document is the session context pack for those leftovers only.

```text
Shipped spine (do not re-implement)
  └─ remaining-slices (this doc)
       ├─ R1 Variants & attributes     ← SHIPPED
       ├─ R2 MDG approval workflow     ← SHIPPED
       ├─ R3 md_payment_term          ← SHIPPED
       ├─ R4 md_tax_registration     ← SHIPPED
       ├─ R5 Transactional modules (ARCH-006)  ← R5-1 Sales SHIPPED
       └─ R6 Optional harden (importer approved gate · item optional fields)
```

---

## Problem

DNA still describes capabilities that are not on disk. Without a scratch cutover list, agents either:

1. Re-touch shipped surfaces, or
2. Treat named leftovers as “done by implication,” or
3. Invent breadth (Employee, BOM, stock qty) that DNA forbids in this pack.

---

## Goals

1. Name every remaining MD-related slice with owner, DNA citation, and acceptance sketch.
2. Preserve Authority B invariants while those slices land.
3. Sequence work so transactional modules attach by FK/code — never by shadow masters.
4. Keep optional harden items visible but **not** confused with §23 Absent stages.

---

## Non-goals

| Out | Why |
|-----|-----|
| Re-opening shipped §23 stages (extensions, web, search, import, steward merge) | Closed this mission |
| Employee / user as `md_*` | Identity / HR boundary (DNA §27.9) |
| BOM · WO · stock qty · price · CoA · journals under `md_*` | Transactional / ledger domains |
| Org-scoped `md_uom` | Platform `ref_uom` only |
| NATS / `x-tenant-id` tenancy | Rejected DNA |
| Living `docs/` restore | Docs-lane reopen required |
| Collapse path recovery | Banned without named approval |
| Full product MDG UX in the same chat as R1–R4 without a mission cut | Scope discipline |

---

## Constraints (carry forward from shipped spine)

| Constraint | Rule |
|------------|------|
| Sole write path | Mutations only via `@afenda/master-data` |
| Tenancy | Non-null `organization_id`; hard-tenant registration + `pnpm audit:tenancy-nulls` |
| Outcomes | Package `Result`; web `ActionResult` via thin adapters |
| Concurrency | `expectedVersion` CAS; no silent overwrite |
| Same-TX | Entity + `platform_audit_log` + `platform_domain_event` |
| Lists | `pageSize <= 100` |
| Search | Derived projections; rebuild-from-SSOT; never authorizes masters |
| UI | `@afenda/ui-system` barrel only |
| Quality bar | Enterprise production — shrink **scope**, not quality |

---

## Proposed design — remaining slices

### R1 — Variants and attributes — **SHIPPED**

| | |
|--|--|
| **DNA** | §7.3 · §23 “Named item-model slice” |
| **Owner** | `@afenda/master-data` (+ `@afenda/db` schema) · web feature panels |
| **Problem** | One item row must not hold arbitrary JSON variants. Sellable/stock variants need identity. |
| **Ship** | Template defines allowed attributes; each concrete variant is its own `md_item` (id + code); unique attribute combinations within template; retired variants remain resolvable; transactions reference the **concrete** variant item. |
| **Must not** | `variant_json` bag on root item as truth; fuzzy “pick first variant.” |
| **Depends on** | Shipped `md_item` · `md_item_group` · lifecycle |
| **Tables** | `md_item_template` · `md_item_template_attribute` · `md_item_template_attribute_option` · `md_item_variant` · `md_item_variant_attribute_value` |
| **Evidence** | `packages/data-plane/db/src/schema/master-data.ts` · `packages/data-plane/db/drizzle/0007_md_item_variants.sql` · `packages/erp/master-data/src/item-variant.ts` · `packages/erp/master-data/src/drizzle-variant-mutations.ts` · `packages/erp/master-data/__tests__/item-variant.domain.test.ts` · `apps/web/app/actions/create-item-template.ts` · `apps/web/app/actions/add-item-template-attribute.ts` · `apps/web/app/actions/add-item-template-attribute-option.ts` · `apps/web/app/actions/create-item-variant.ts` · `apps/web/features/master-data/create-item-template-form.tsx` · `apps/web/features/master-data/add-item-template-attribute-form.tsx` · `apps/web/features/master-data/add-item-template-attribute-option-form.tsx` · `apps/web/features/master-data/create-item-variant-form.tsx` · `apps/web/features/master-data/master-data-shell.tsx` (Templates + Variants panels) |
| **Verify** | `pnpm --filter @afenda/master-data typecheck test` · `pnpm --filter @afenda/db test -- master-data-schema tenancy` · `pnpm audit:tenancy-nulls` |

### R2 — Approval workflow (MDG) — **SHIPPED**

| | |
|--|--|
| **DNA** | §23 “Named MDG slice” · maker-checker mentions · DNA §18 v1 policy |
| **Owner** | `@afenda/master-data` change-request model · web steward/approver Actions · RBAC codes |
| **Problem** | Steward merge UI is **minimal**; DNA expects change requests + maker-checker for governed masters. |
| **Ship** | `md_change_request` + submit / approve / reject / apply claim; maker ≠ checker; same-TX audit + outbox; gate **`activateParty` + `mergeParties` only** (always require approved CR — no bypass). |
| **Must not** | Auto-merge; bypass CAS; dual-write outside package; bulk-import-apply gating (stays R6). |
| **Depends on** | Shipped lifecycle · merge · `master_data.manage` + new `master_data.approve` |
| **Status** | **Shipped** 2026-07-20 · **Q2 resolved:** activate+merge only |
| **Evidence** | `packages/data-plane/db/src/schema/master-data.ts` (`mdChangeRequest`) · `drizzle/0008_md_change_request.sql` · `hard-tenant-roots.ts` · `platform-permission-catalog.ts` (`master_data.approve`) · `packages/erp/master-data/src/change-request.ts` · `drizzle-change-request.ts` · gated `party.ts` / `merge.ts` · `packages/data-plane/events/.../master-data.events.ts` (`change_request.*.v1`) · `apps/web/app/actions/*change-request*` · `activate-party.ts` / `merge-parties.ts` · `features/master-data/change-request-panel.tsx` · `__tests__/change-request.domain.test.ts` · `apps/web/__tests__/master-data-change-request.test.ts` |
| **Verify** | `pnpm --filter @afenda/master-data typecheck test` · `pnpm --filter @afenda/web typecheck test -- master-data` · `pnpm --filter @afenda/events test` · `pnpm --filter @afenda/db test -- master-data-schema tenancy` · `pnpm audit:tenancy-nulls` |

### R3 — `md_payment_term` — **SHIPPED**

| | |
|--|--|
| **DNA** | §3.2 org operational masters · §25 illustrative `payment-term/` · §28 shipped (was named leftover) |
| **Owner** | `@afenda/db` table · `@afenda/master-data` commands · web CRUD |
| **Problem** | Commercial defaults (net days, etc.) are not yet an org master. |
| **Ship** | Org-scoped root with standard minimum entity contract (§24); lifecycle; same-TX audit/outbox; list/getByCode; hard-tenant root; events `master_data.payment_term.*.v1`. |
| **Must not** | Invent SO/PO line behavior here — terms are referenced later by transactional modules. |
| **Depends on** | Shipped party/item patterns (copy contracts, do not fork) |
| **Status** | **Shipped** 2026-07-20 |
| **Evidence** | `packages/data-plane/db/src/schema/master-data.ts` (`mdPaymentTerm`) · `drizzle/0009_md_payment_term.sql` · `hard-tenant-roots.ts` · `scripts/audit-tenancy-nulls.mjs` · `packages/erp/master-data/src/payment-term.ts` · `drizzle-store.ts` CTEs · `packages/data-plane/events/.../master-data.events.ts` · `apps/web/app/actions/{list,create,update,*-payment-term,payment-term-lifecycle}.ts` · `features/master-data/{create-payment-term-form,payment-term-lifecycle-form}.tsx` · `__tests__/master-data.domain.test.ts` · `apps/web/__tests__/{master-data-actions,product-authorization-wiring}.test.ts` |
| **Domain fields** | §24 warehouse-shaped lifecycle + `net_days` (int ≥ 0) |

### R4 — `md_tax_registration`

| | |
|--|--|
| **DNA** | §3.2 “when required by the tax architecture” · §28 leftover |
| **Owner** | Master-data package **after** tax architecture slice names the model |
| **Problem** | Tax registration identity must not be invented ahead of tax SSOT. |
| **Ship** | Org-scoped table + commands + events per [../tax/tax-architecture.md](../tax/tax-architecture.md) |
| **Must not** | Premature `md_tax_*` columns guessed outside the tax Scratch SSOT |
| **Depends on** | Tax architecture Scratch — **Q3 resolved**: [../tax/tax-architecture.md](../tax/tax-architecture.md) |
| **Status** | **Shipped** 2026-07-20 |
| **Evidence** | `packages/data-plane/db/src/schema/master-data.ts` (`mdTaxRegistration`) · `drizzle/0010_md_tax_registration.sql` · `hard-tenant-roots.ts` · `scripts/audit-tenancy-nulls.mjs` · `packages/erp/master-data/src/tax-registration.ts` · `drizzle-store.ts` CTEs · `packages/data-plane/events/.../master-data.events.ts` · `apps/web/app/actions/{list,create,update,*-tax-registration,tax-registration-lifecycle}.ts` · `features/master-data/{create-tax-registration-form,tax-registration-lifecycle-form}.tsx` · `__tests__/master-data.domain.test.ts` · `apps/web/__tests__/{master-data-actions,product-authorization-wiring}.test.ts` |
| **Verify sketch** | See tax-architecture acceptance + `pnpm audit:tenancy-nulls` |

### R5 — Transactional modules (ARCH-006 consumers)

| | |
|--|--|
| **DNA** | §23 · §29 · ARCH-006 |
| **Owner** | `@afenda/sales` (+ future Purchasing / Inventory / Manufacturing / Finance) + web |
| **Problem** | Downstream modules must attach to authoritative masters. |
| **Ship (consumer rule)** | FK + branded id + stable `code`; snapshot at create/post — [arch-006-consumer-contract.md](arch-006-consumer-contract.md) |
| **Master-data duty** | Stay authoritative, tenant-safe, lifecycle-safe, integration-safe (lookups, external-id, alias, search rebuild). |
| **Must not** | Port transaction tables into `@afenda/master-data`. |
| **Depends on** | Shipped spine; R1–R3 as each module needs them |
| **Status** | **R5-0 accepted**. **R5-1 Sales SHIPPED** 2026-07-20. Purchasing / Inventory later. |
| **Evidence (R5-1)** | `packages/erp/sales` · `packages/data-plane/db/src/schema/sales.ts` · `drizzle/0011_sales_order.sql` · `hard-tenant-roots.ts` · `packages/data-plane/events/.../sales.events.ts` · `platform-permission-catalog.ts` (`sales.read` / `sales.manage`) · `apps/web/app/actions/*sales*` · `features/sales/*` · `__tests__/sales.domain.test.ts` · `__tests__/anti-shadow.test.ts` |
| **Verify** | `pnpm --filter @afenda/sales typecheck test` · `pnpm --filter @afenda/db test -- sales tenancy` · `pnpm --filter @afenda/events test` · `pnpm --filter @afenda/web typecheck test -- sales` · `pnpm audit:tenancy-nulls` · anti-shadow `rg` |

### R6 — Optional harden (not §23 Absent)

These improve fidelity to DNA prose; they are **not** missing spine stages. **One row per mission** — full briefs: [r6-harden-missions.md](r6-harden-missions.md).

| Item | DNA cue | Suggested ship | Brief | Status |
|------|---------|----------------|-------|--------|
| Importer **approved** gate | §13 lifecycle `… → approved → applied → …` | Explicit approve step / permission before apply; keep dry-run + reconcile | R6-import-approve | **SHIPPED** 2026-07-20 — `approved` gate + `master_data.import_approve` · evidence in [r6-harden-missions.md](r6-harden-missions.md) |
| Item optional commercial fields | §7.2 | Brand, manufacturer party, tax class, origin, shelf-life, dims — controlled columns or typed extensions, not free JSON | R6-item-optional | open |
| Stale §13 wording | “Bulk APIs are a named importer slice…” | Doc-only: align DNA prose with §23 **Shipped** | R6-dna-prose | open |

---

## Interfaces / dependencies

| Surface | Role for remaining slices |
|---------|---------------------------|
| `@afenda/db` | New `md_*` tables + hard-tenant registration + migrations |
| `@afenda/master-data` | Sole commands / Zod / store CTEs |
| `@afenda/events` | New versioned `master_data.*` types |
| `@afenda/audit` | Same-TX audit rows |
| `@afenda/search` | Projectors when new roots become searchable |
| `apps/web` | Thin Actions · RBAC · feature UI |
| Tax Scratch / ARCH-006 | Gate R4 / consume R5 |

**Pattern to copy (do not invent):**

- Root commands: `packages/erp/master-data/src/{party,item,warehouse}.ts`
- Extensions: `extensions.ts` + `drizzle-extension-mutations.ts`
- Web adapter: `apps/web/app/actions/*master-data*` + `runMemberSessionAction` / `mapPackageResult`
- Merge steward baseline: `merge.ts` + `merge-parties-form.tsx` (R2 extends governance, does not replace)

---

## Recommended mission order

Default DNA-aligned sequence (product may reorder with an explicit mission letter). Method lock: [development-method.md](development-method.md).

```text
R1–R3 SHIPPED
R4 shipped 2026-07-20 (md_tax_registration)
R5-0 consumer contract ACCEPTED · R5-1 Sales SHIPPED 2026-07-20 (`@afenda/sales`)
R6 harden → next pick when undecided; one row from r6-harden-missions.md
Purchasing / Inventory (ARCH-006) → later consumer missions
```

One mission per chat when shipping product work.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| R2 balloons into full MDG product | Cut mission to change-request + one gated command family first |
| R4 starts without tax SSOT | Block coding; require tax arch doc link in mission brief |
| R5 invents shadow customer tables | `rg` gate from DNA §27.3 in every consumer PR |
| R1 JSON bag “for speed” | Reject in review; template + concrete items only |
| Hard-tenant list drifts | Extend `hard-tenant-roots.ts` + `audit-tenancy-nulls.mjs` in the same change |

---

## Rollout and rollback

| Step | Action |
|------|--------|
| Per slice | Schema migration → package commands/tests → events catalog → web Actions/UI → Scratch README claim update |
| Forward migrate | `AFENDA_ALLOW_DB_MIGRATE=1` + `pnpm --filter @afenda/db db:migrate` (ops-approved) |
| Validate | Slice verify commands + `pnpm audit:tenancy-nulls` when new org tables land |
| Rollback | Prefer forward-fix; destructive drop of new `md_*` only with explicit ops approval |

---

## Verify (per remaining slice)

Baseline (always):

```bash
pnpm --filter @afenda/master-data typecheck test
pnpm --filter @afenda/db test -- master-data-schema tenancy
pnpm audit:tenancy-nulls
```

Add as relevant:

```bash
pnpm --filter @afenda/events test
pnpm --filter @afenda/search typecheck test
pnpm --filter @afenda/web typecheck test -- master-data
```

DNA §27 checklist remains authoritative for anti-patterns (shadow roots, NATS/`x-tenant-id`, Employee under `md_*`, restore≠created, pageSize≤100).

---

## Open questions

| # | Question | Blocks |
|---|----------|--------|
| Q1 | Product order: variants before MDG, or payment-term first for commercial pilots? | **Resolved** — R1 · R2 · R3 shipped independently |
| Q2 | MDG scope v1: gate activate+merge only, or also bulk import apply? | **Resolved** — activate+merge only; bulk apply stays R6 |
| Q3 | Tax architecture Scratch path / owner pack? | **Resolved** — [../tax/tax-architecture.md](../tax/tax-architecture.md) · [../tax/README.md](../tax/README.md) |
| Q4 | Which ARCH-006 module consumes masters first (Sales vs Purchasing)? | **Resolved** — **Sales** first ([arch-006-consumer-contract.md](arch-006-consumer-contract.md)); Purchasing later |

Next human pick for implement chat: one R6 row · or Purchasing/Inventory consumer — see [development-method.md](development-method.md).

---

## Context pack (for the next agent session)

```text
PROJECT CONTEXT:
- Spine closed: @afenda/master-data Authority B + web/search/import/steward merge
- R5-1 Sales SHIPPED (`@afenda/sales`) — do not re-open without named reopen
- This mission: pick ONE open track — R6 harden row · or Purchasing/Inventory consumer
- Constraints: sole write path, hard tenancy, Result/ActionResult, same-TX, pageSize<=100
- Forbidden: Employee md_*, BOM/stock/CoA, md_uom, shadow sales_customer, Living docs/, Collapse recover
- Pattern files: packages/erp/sales/src/order.ts · packages/erp/master-data/src/party.ts · apps/web/app/actions/*sales*
- Evidence parents: master-data-dna.md §23/§28 · arch-006-consumer-contract.md · README.md capability matrix
```

---

## Companions

- [README.md](README.md) — shipped capability matrix
- [development-method.md](development-method.md) — R4–R6 pipeline
- [arch-006-consumer-contract.md](arch-006-consumer-contract.md) — R5-0
- [r6-harden-missions.md](r6-harden-missions.md) — R6 briefs
- [../tax/README.md](../tax/README.md) — R4-0 pack
- [master-data-dna.md](master-data-dna.md) — borrow/reject DNA
- [../monorepo/README.md](../monorepo/README.md) — DAG
- [../events/README.md](../events/README.md) — outbox
- [../tenancy/README.md](../tenancy/README.md) — hard tenancy
