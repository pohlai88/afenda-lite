# Inventory — Scratch contract (operative)

> **Status:** `OPERATIVE` — Tier A Scratch contract; INV-REQ ledger Pass (quantity-only / no in-transit = Observation, not gaps).  
> **As of:** 2026-07-21  
> **Score:** **Pass** — REQ ledger closed; no open blocking findings in this file.  
> **Tier:** A operative contract — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/inventory` · Tables: `@afenda/db` · Band: R1-F ERP · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** [package README](../../../packages/erp/inventory/README.md) · this file owns gap ledger + invariants (Living `docs/` dormant).

## Purpose

Org-scoped stock movements, immutable ledger, balance projection, and reservations. Inventory is the **sole mutator** of `stock_movement`, `stock_movement_line`, `stock_ledger_entry`, `stock_balance`, and `stock_reservation`. Master Data is read-only. Receiving and Fulfillment must call Inventory commands — they never write stock tables.

## Ownership model

| Surface | Purpose |
| --- | --- |
| `stock_movement` | Business instruction + lifecycle (`draft` → `posted` \| `cancelled`) |
| `stock_movement_line` | Requested physical quantity effects |
| `stock_ledger_entry` | **Authoritative** immutable posted quantity history |
| `stock_balance` | Operational projection of posted ledger + active reservations |
| `stock_reservation` | Separate aggregate (not a movement type) |
| Availability query | `available = onHand − activeReserved` (no ATP / expected receipts) |

**Movement types (physical only):** `receipt` \| `issue` \| `transfer` \| `adjustment`  
**Not movement types:** reservation / reservation_release — those are reservation-aggregate commands.

**Transfer policy (v1):** instant dual-leg post only. In-transit is **not supported**.

**Quantity scope (v1):** quantity-only. Valuation / cost / GL postings belong to Accounting.

**Stock dimension key (v1):** `organization_id` + `warehouse_id` + `item_id` (+ frozen `base_uom_id`). Excludes bin, lot, serial, expiry, quality, consignment.

## Operation map

| Operation | Permission |
| --- | --- |
| `createStockMovement` | `inventory.movement.create` |
| `addStockMovementLine` | `inventory.movement.create` |
| `postStockMovement` | `inventory.movement.post` |
| `cancelStockMovement` | `inventory.movement.cancel` |
| `createReversalMovement` | `inventory.movement.post` |
| `reserveStock` | `inventory.reservation.create` |
| `releaseReservation` | `inventory.reservation.release` |
| `getStockMovementById` / `listStockMovements` | `inventory.movement.read` |
| `getStockAvailability` | `inventory.availability.read` |
| Manual adjustment posting | `inventory.adjustment.post` |

## Movement source

Every movement declares `InventoryMovementSource`:

`receiving` \| `fulfillment` \| `manual_adjustment` \| `opening_balance` \| `transfer`

Receipt/issue from UI without peer source is denied. Receiving / Fulfillment post with source aggregate + event identity for dedupe.

## Invariants

- Inventory is the sole mutator of stock movement, ledger, balance and reservation tables.
- Every stock row belongs to exactly one organization.
- Item, warehouse and UoM references must be active and valid within that organization.
- Posted movements are immutable; draft movements may be cancelled.
- Posted corrections use linked compensating movements (never void/delete posted).
- The stock ledger is the immutable quantity authority.
- Stock balances are projections of posted ledger entries (plus reservation reserved/available).
- Every balance on-hand change must be explainable by one or more ledger rows.
- Reservations affect reserved and available quantity, not on-hand / ledger quantity.
- Negative on-hand and over-reservation are rejected by default.
- Transfers conserve quantity and post both warehouse effects atomically; source ≠ destination.
- Movement UoM conversions are frozen at posting (no float math).
- Every material mutation is authorized, idempotent and concurrency-safe.
- Aggregate, ledger, balance, audit and outbox effects commit or roll back together.
- No peer module directly mutates Inventory tables.
- Inventory never imports Receiving or Fulfillment packages.

## Reservation statuses

`active` → `partially_consumed` → `consumed` \| `released` \| `expired` \| `cancelled`

## Completeness ledger (INV-REQ)

| ID | Requirement | Status | Slice | Verify |
| --- | --- | --- | --- | --- |
| INV-REQ-001 | Ledger authoritative; balance projection | Pass | S2 | package test + README |
| INV-REQ-002 | Every on-hand Δ ↔ ledger row(s) | Pass | S2 | reconcile + domain tests |
| INV-REQ-003 | Reservations ≠ movement types | Pass | S1 | types + domain tests |
| INV-REQ-004 | Reservation status model | Pass | S1 | types + schema |
| INV-REQ-005 | Reservations change reserved/available only | Pass | S1 | store effects |
| INV-REQ-006 | Transfer source+dest + net zero | Pass | S3 | schemas + post tests |
| INV-REQ-007 | Transfer invariants; no in-transit | Pass | S3 | contract + tests |
| INV-REQ-008 | Discriminated create input | Pass | S3 | schemas |
| INV-REQ-009 | Default no negative / over-reserve | Pass | S2 | memory + drizzle post |
| INV-REQ-010 | Movement source required | Pass | S4 | schemas + peers |
| INV-REQ-011 | No Inventory→Receiving/Fulfillment imports | Pass | S4 | package.json DAG |
| INV-REQ-012 | idempotencyKey on material mutations | Pass | S5 | schemas + indexes |
| INV-REQ-013 | Source-event dedupe | Pass | S4/S5 | unique source keys |
| INV-REQ-014 | Concurrency race tests | Pass | S5 | race test file |
| INV-REQ-015 | Package-internal auth port | Pass | S6 | authorization.ts |
| INV-REQ-016 | Fine-grained permissions | Pass | S6 | permissions + catalog |
| INV-REQ-017 | Inventory owns permission constants | Pass | S6 | manifest → catalog |
| INV-REQ-018 | module.manifest conformance | Pass | S6 | validate:modules |
| INV-REQ-019 | V1 dimension key + exclusions | Pass | S0/S2 | this contract |
| INV-REQ-020 | UoM freeze at post | Pass | S3 | post path |
| INV-REQ-021 | Availability formula + result type | Pass | S2 | getStockAvailability |
| INV-REQ-022 | Reservation invariants | Pass | S1 | reserve/release |
| INV-REQ-023 | Draft cancel + compensating reverse | Pass | S7 | commands + UI |
| INV-REQ-024 | Adjustment controls | Pass | S7 | reason + perm |
| INV-REQ-025 | Quantity-only vs Accounting | Pass | S0 | Out of scope |
| INV-REQ-026 | Reconciliation contract + CLI | Pass | S8 | `pnpm --filter @afenda/inventory reconcile` |
| INV-REQ-027 | Ops metrics / runbook | Pass | S8 | README Ops |
| INV-REQ-028 | Repair = compensating movements | Pass | S7/S8 | README |
| INV-REQ-029 | Memory ≡ Drizzle atomic contract | Pass | S1/S5 | both adapters |
| INV-REQ-030 | Export split; Memory off prod barrel | Pass | S9 | package.json exports |
| INV-REQ-031 | Inventory-specific error codes | Pass | S6 | error-codes.ts |
| INV-REQ-032 | Invariants in package contract | Pass | S0 | README |
| INV-REQ-033 | Priority repair order followed | Pass | All | this ledger |

## Priority order (execution)

```text
1. Separate reservation lifecycle from stock-movement types
2. Declare ledger authority and balance projection rules
3. Define negative-stock and availability policies
4. Fix transfer inputs and atomic paired effects
5. Prevent generic movements from bypassing Receiving/Fulfillment
6. Add source-event and command idempotency
7. Add concurrency and over-reservation tests
8. Define package-internal authorization mappings
9. Add cancellation and compensating movement semantics
10. Add reconciliation, metrics and recovery evidence
```

## Public surfaces

| Path | Role |
| --- | --- |
| `@afenda/inventory` | Commands, queries, schemas, types, permissions, error codes, auth port |
| `@afenda/inventory/adapters/drizzle` | Production store |
| `@afenda/inventory/testing` | Memory store + MutationPorts |
| `@afenda/inventory/module-manifest` | R1-F manifest |

## Verify

```bash
pnpm --filter @afenda/inventory check
pnpm --filter @afenda/inventory reconcile
pnpm --filter @afenda/receiving test
pnpm --filter @afenda/fulfillment test
pnpm validate:modules
```

## Authority

| Topic | Link |
| --- | --- |
| Package README | [packages/erp/inventory/README.md](../../../packages/erp/inventory/README.md) |
| ARCH-006 consumer | [docs-V2/master-data/arch-006-consumer-contract.md](../../master-data/arch-006-consumer-contract.md) |
| Monorepo DAG | [docs-V2/monorepo/README.md](../../monorepo/README.md) |
| Events | [docs-V2/events/README.md](../../events/README.md) |
| Tenancy | [docs-V2/tenancy/README.md](../../tenancy/README.md) |
| Checkout | [AGENTS.md](../../../AGENTS.md) |
