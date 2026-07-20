# Fulfillment — completeness ledger (Scratch)

> **Status:** `COMPLETE` — Plan ↔ disk closed for Delivery R1-F surface. Coverage Complete on evaluated controls.  
> **As of:** 2026-07-21  
> **Score:** **9.2/10** — cursor pagination / multi-reservation issue split remain Observation (not claimed as shipped).  
> **Tier:** D audit trace — Scratch only; not Living DOC-001 SSOT.  
> **Package:** `@afenda/fulfillment` · Neon `br-tiny-hill-ao82jp6f`  
> **Authority:** [package README](../../../packages/erp/fulfillment/README.md) · package disk  
> **Naming:** `done-*` reserved for Scratch scores **> 9.5**; this ledger stays `fulfillment.md`.

---

## Completeness matrix (plan → codebase)

| ID | Requirement | Implemented | Verified | Severity | Evidence |
|----|-------------|-------------|----------|----------|----------|
| F1 | Lifecycle through `closed` + `closeDelivery` | Yes | Yes | Pass | `delivery.ts` · memory/drizzle stores · `close-delivery` Action · domain test |
| F2 | `SalesFulfillmentQueryPort` + Sales query | Yes | Yes | Pass | `ports.ts` · `getFulfillableSalesOrder` · web adapter · create/post validation |
| F3 | Reservation-aware pick + Inventory issue on post | Yes | Yes | Pass | `reservationId` on pick · `getReservationById` assert · `InventoryCommandOptions` on post |
| F4 | Qty ladder + full-pick pack gate | Yes | Yes | Pass | over-pick reject · pack requires full pick per line (memory + drizzle) |
| F5 | Fine-grained permissions | Yes | Yes | Pass | catalog · manifest · Actions · retired `fulfillment.read`/`manage` |
| F6 | `idempotencyKey` + OCC | Yes | Yes | Pass | schemas · delivery/line/pick keys · migration `0024` · Actions |
| F7 | POD `DeliveryOutcome` | Yes | Yes | Pass | outcome enum · evidence fields · only `delivered` advances status |
| F8 | Events for real transitions | Yes | Yes | Pass | 8 catalog events · pack/cancel/pod/closed emit |
| F9 | List sort + README truth | Yes | Yes | Pass | `sort` allowlist · README InventoryCommandOptions + fine perms |
| F10 | Web BFF + UI | Yes | Yes | Pass | Actions · forms · shell · sales port wiring |
| F11 | Scratch normalize | Yes | Yes | Pass | this ledger (`fulfillment.md`; score 9.2 — below `done-*` bar) |

### Check coverage

```text
Applicable controls:       11
Controls with checks:      11
Checks executed:           5  (fulfillment test · events test · db platform-permission · web product-authorization-wiring · fulfillment+sales typecheck)
Checks passed:             5
Checks failed:             0
Controls without checks:   0
Unevaluated controls:      0
Coverage: Complete
```

Latest verify (2026-07-21):

```bash
pnpm --filter @afenda/fulfillment test   # 8/8
pnpm --filter @afenda/fulfillment typecheck
pnpm --filter @afenda/sales typecheck
pnpm --filter @afenda/events test        # 19/19
pnpm --filter @afenda/db test -- platform-permission
pnpm --filter @afenda/web test -- product-authorization-wiring
```

---

## Observations (not gaps)

| ID | Note |
|----|------|
| O1 | List uses `page`/`pageSize`, not cursor — sufficient for R1-F console |
| O2 | One warehouse per Delivery (header) — bin/lot/serial out of scope |
| O3 | Multi-line picks with distinct reservation ids post issue without a single reservation attach — same-reservation coalesce when shared |
| O4 | Peer `@afenda/inventory` import matches receiving; Inventory Scratch authorizes one-way command calls |
| O5 | Returns / reverse posted deliveries owned by a later package |

---

## Public surface (disk truth)

**Commands:** `createDraftDelivery` · `addDeliveryLine` · `startPicking` · `confirmPick` · `confirmPack` · `postDelivery` · `recordProofOfDelivery` · `cancelDelivery` · `closeDelivery`  
**Queries:** `getDeliveryById` · `listDeliveries`  
**Permissions:** `fulfillment.delivery.read|create|update|post|cancel|close` · `fulfillment.picking.confirm` · `fulfillment.packing.confirm` · `fulfillment.pod.record`  
**Events:** `created` · `pick.confirmed` · `pack.confirmed` · `posted` · `completed` · `pod.recorded` · `cancelled` · `closed`  
**Ports:** `MasterLookupPort` · `SalesFulfillmentQueryPort` · `InventoryCommandOptions` (composition root) · `FulfillmentAuthorizationPort`

**Verify:**

```bash
pnpm --filter @afenda/fulfillment check
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/db db:ensure-permission-catalog
```

---

## Historical review (superseded)

Original Scratch review findings (lifecycle, Sales port, reservation pick, fine permissions, idempotency, POD outcome, events) are remediated in the matrix above. Do not re-open them without new disk evidence.
