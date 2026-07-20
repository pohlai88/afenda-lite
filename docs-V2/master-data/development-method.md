# Master-data R4–R6 — development method

| Field | Value |
|-------|-------|
| Surface | `docs-V2/master-data/development-method.md` |
| Authority | **Scratch** — not Living DOC-001 |
| Mode | Internal guide (implementers) |
| Status | **Accepted** method lock 2026-07-20 |
| Parents | [remaining-slices.md](remaining-slices.md) · plan “R4 R5 R6 method” |

**Action this doc enables:** run the correct pipeline for leftover slices without inventing tax fields, shadow masters, or big-bang transactional modules.

---

## Locked defaults

| Lock | Value |
|------|--------|
| Product entry | `/using-afenda-elite-skills` → `/afenda-elite-backend-modules` (+ `/afenda-elite-api-contract` when Actions ship) |
| Mission hygiene | One slice (or one phase) per Agent chat; `/cursor-mission-compile` → paste → implementer emits PREFLIGHT |
| R4 gate | No `md_tax_*` code until [../tax/tax-architecture.md](../tax/tax-architecture.md) is the named Q3 path |
| R5 first schema consumer | **Sales** — Purchasing later; override only by explicit mission letter |
| R5 phase 0 | [arch-006-consumer-contract.md](arch-006-consumer-contract.md) before transactional tables |
| R6 | Anytime; one harden row per mission — [r6-harden-missions.md](r6-harden-missions.md) |
| Skip order | May skip R4 and start R5/R6; must not invent tax fields to unblock R4 |

### Next-track default (when product has not overridden)

```text
1. R6 named harden (smallest closed value) — pick one row from r6-harden-missions.md
2. ARCH-006 next consumer (Purchasing / Inventory) — compile against arch-006-consumer-contract.md
3. R1–R4 · R5-1 Sales — SHIPPED (do not re-open without a named reopen mission)
```

This mission (method delivery) does **not** implement product schema. Next implement chat must name one open track above.

---

## Universal pipeline

1. **Resolve gate** — R4: tax SSOT path; R5: Sales (locked); R6: which harden row.
2. **Scratch / brief** — tax · consumer contract · or R6 mini-brief (this tree).
3. **`/cursor-mission-compile`** — stop on OPEN QUESTION.
4. **Fresh Agent chat** — farm `/afenda-elite-backend-modules`.
5. **Method library** (after farm): spec → plan → incremental implement + TDD → verify → update [remaining-slices.md](remaining-slices.md) claims.
6. **Evidence** — package tests · `pnpm audit:tenancy-nulls` if new org tables · R5 anti-shadow `rg` · README / DNA §28 paths.

**Do not:** Collapse recover · Living `docs/` invent · park/stub · shrink quality · dual-write `md_*` outside `@afenda/master-data` · shadow `sales_customer` / `purchase_supplier` / `inventory_product` / `finance_vendor`.

---

## Slice pointers

| Slice | Method artifact | Implement only after |
|-------|-----------------|----------------------|
| R4 | [../tax/README.md](../tax/README.md) · [../tax/tax-architecture.md](../tax/tax-architecture.md) | Tax arch accepted (Q3 resolved) |
| R5 | [arch-006-consumer-contract.md](arch-006-consumer-contract.md) | Contract accepted; then Sales package mission |
| R6 | [r6-harden-missions.md](r6-harden-missions.md) | Compile one named row |

---

## Companions

- [remaining-slices.md](remaining-slices.md)
- [README.md](README.md)
- [master-data-dna.md](master-data-dna.md)
- [../monorepo/README.md](../monorepo/README.md)
