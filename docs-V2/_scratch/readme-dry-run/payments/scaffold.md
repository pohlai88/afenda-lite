# `@afenda/payments`

Package `@afenda/payments` (workspace private).

## Consume

```ts
import { /* see src/index.ts */ } from "@afenda/payments";
```

Public command exports (from `src/index.ts`): `createDraftPayment`, `addPaymentAllocation`, `postPayment`, `reversePayment`, `postRefund`, `getPaymentById`, `listPayments`.

Also exports stores and model types.

## Maintain

```bash
pnpm --filter @afenda/payments lint
pnpm --filter @afenda/payments typecheck
pnpm --filter @afenda/payments test
pnpm --filter @afenda/payments check
```

## Authority

- Scratch review: [`docs-V2/_scratch/erp/payment.md`](../../erp/payment.md)
- Package source: `packages/erp/payments`
