# `@afenda/fulfillment`

Org-scoped delivery execution for Afenda-Lite: draft creation, line capture, picking, packing, posting, proof-of-delivery, and pre-post cancellation. The package owns `delivery`, `delivery_line`, `delivery_pick`, `delivery_pack`, and `proof_of_delivery` mutations; schemas remain in `@afenda/db`.

## Consume

Import the public operations from `@afenda/fulfillment`: `createDraftDelivery`, `addDeliveryLine`, `startPicking`, `confirmPick`, `confirmPack`, `postDelivery`, `recordProofOfDelivery`, `cancelDelivery`, `getDeliveryById`, and `listDeliveries`.

Every mutation requires organization, actor, and correlation identity. Item, UoM, and warehouse references resolve through `MasterLookupPort`. State-changing operations use optimistic versions where the current delivery version is part of the command contract.

`postDelivery` requires injected `InventoryCommandOptions` and posts stock by calling `@afenda/inventory` (`createStockMovement` / line add / `postStockMovement`) with fulfillment as `sourceModule`. Fulfillment does not write `stock_*` or `sales_*` tables itself and does not import `@afenda/sales`.

Living consumers are `apps/web` server adapters when wired by the composition root.

## Boundaries

| Peer | Rule |
|------|------|
| Sales | No import; no `sales_*` writes — composition root / events for sales coupling |
| Inventory | Command options + inventory package APIs on post — no direct `stock_*` SQL |
| Schemas | `@afenda/db` |

## Events

- `fulfillment.delivery.created.v1`
- `fulfillment.pick.confirmed.v1`
- `fulfillment.delivery.posted.v1`
- `fulfillment.delivery.completed.v1`

## Maintain

```bash
pnpm --filter @afenda/fulfillment lint
pnpm --filter @afenda/fulfillment typecheck
pnpm --filter @afenda/fulfillment test
pnpm --filter @afenda/fulfillment check
```

Production mutations use the package Drizzle store and production mutation ports so delivery, audit, and outbox facts commit within the package transaction boundary; post also drives the inventory movement path. Memory stores provide deterministic domain and transaction tests.

Permissions are `fulfillment.read` and `fulfillment.manage`.

## Authority

- Package source: `packages/erp/fulfillment`
- Scratch review (may lag code): [`docs-V2/_scratch/erp/fulfillment.md`](../../erp/fulfillment.md)
