# `@afenda/receiving`

Org-scoped goods-receipt lifecycle for Afenda-Lite: draft, line capture, discrepancy recording, post, and cancel. The package owns `goods_receipt`, `goods_receipt_line`, and `receiving_discrepancy` mutations; schemas remain in `@afenda/db`.

## Consume

Import the public commands from `@afenda/receiving`: `createDraftGoodsReceipt`, `addGoodsReceiptLine`, `postGoodsReceipt`, `recordReceivingDiscrepancy`, `cancelGoodsReceipt`, `getGoodsReceiptById`, and `listGoodsReceipts`.

Every mutation requires `organizationId`, `actorUserId`, and `correlationId`. Purchase-order receipts require `sourceId`. Warehouse and item references resolve through `MasterLookupPort` and must be active. Posting and cancellation require `expectedVersion`.

`purchase_order` source create/post require an injected `PurchaseOrderReceivingQueryPort` (apps/web SQL adapter; Vitest memory helper). Create and post reject non-posted / missing / cross-org POs; post also enforces line qty against remaining plus over-receipt tolerance.

Living consumers are `apps/web` server adapters when wired by the composition root.

## Inventory boundary

Receiving never writes inventory or `stock_*` tables. `postGoodsReceipt` atomically updates the receipt, writes its audit fact, and emits `receiving.receipt.posted.v1`. Inventory movement is an event-driven composition-root responsibility.

Optional purchasing and inventory integration is events-only / Receiving-owned query ports at the composition root; this package imports neither `@afenda/purchasing` nor inventory.

## Events

- `receiving.receipt.created.v1`
- `receiving.receipt.line_added.v1`
- `receiving.receipt.posted.v1`
- `receiving.discrepancy.recorded.v1`

## Maintain

```bash
pnpm --filter @afenda/receiving lint
pnpm --filter @afenda/receiving typecheck
pnpm --filter @afenda/receiving test
pnpm --filter @afenda/receiving check
```

Production mutations use `runNeonHttpTransaction` so document, audit, and outbox facts commit together. Memory stores provide deterministic domain and transaction tests. Org-scoped normalized receipt codes are unique. Discrepancies are accepted only for draft or posted receipts; cancellation accepts draft or posted receipts.

Permissions are `receiving.read` and `receiving.manage`.

## Operations

Correlation and typed `Result` codes provide the current operational baseline. Dedicated receiving mutation metrics dashboards and package-specific Ops runbooks are incomplete peers of the purchasing package.
