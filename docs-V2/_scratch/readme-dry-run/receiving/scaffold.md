# `@afenda/receiving`

Package `@afenda/receiving` (workspace private).

## Consume

```ts
import { /* see src/index.ts */ } from "@afenda/receiving";
```

Public command exports (from `src/index.ts`): `addGoodsReceiptLine`, `cancelGoodsReceipt`, `createDraftGoodsReceipt`, `getGoodsReceiptById`, `listGoodsReceipts`, `postGoodsReceipt`, `recordReceivingDiscrepancy`.

Also exports stores, brands, schemas, ports, and `createProductionMutationPorts`.

## Maintain

```bash
pnpm --filter @afenda/receiving lint
pnpm --filter @afenda/receiving typecheck
pnpm --filter @afenda/receiving test
pnpm --filter @afenda/receiving check
```

## Authority

- Scratch review: [`docs-V2/_scratch/erp/receiving.md`](../../erp/receiving.md)
- Package source: `packages/erp/receiving`
