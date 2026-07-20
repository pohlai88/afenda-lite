# `@afenda/fulfillment`

Package `@afenda/fulfillment` (workspace private).

## Consume

```ts
import { /* see src/index.ts */ } from "@afenda/fulfillment";
```

Public command exports (from `src/index.ts`): `addDeliveryLine`, `cancelDelivery`, `confirmPack`, `confirmPick`, `createDraftDelivery`, `getDeliveryById`, `listDeliveries`, `postDelivery`, `recordProofOfDelivery`, `startPicking`.

Also exports stores, brands, schemas, ports, and `createProductionMutationPorts`.

## Maintain

```bash
pnpm --filter @afenda/fulfillment lint
pnpm --filter @afenda/fulfillment typecheck
pnpm --filter @afenda/fulfillment test
pnpm --filter @afenda/fulfillment check
```

## Authority

- Scratch review: [`docs-V2/_scratch/erp/fulfillment.md`](../../erp/fulfillment.md)
- Package source: `packages/erp/fulfillment`
