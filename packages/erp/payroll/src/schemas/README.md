# Payroll — Zod schemas

Domain-sliced Zod input schemas for `@afenda/payroll`. Composed entry: `src/schemas/index.ts`.

## Layout

```text
src/schemas/
├── common.ts           # mutation context, idempotency, OCC, ISO date primitives
├── setup.ts            # calendar, pay group, earning/deduction/statutory rules
├── assignments.ts      # employee assignment, recurring earning/deduction
├── inputs.ts           # variable, overtime, leave/one-time adjustments
├── runs.ts             # period, run, calculation, exception, finalize, reverse
├── statutory.ts        # contributions, tax result, submission
├── outputs.ts          # result lines, payslip, payment/accounting instructions
├── reconciliation.ts   # payroll / payment / accounting reconciliation
└── index.ts            # composed schema barrel
```

This tree is package-internal. Consumers use the root `@afenda/payroll`
capabilities; no schema subpath is published.

## Import patterns

```ts
// Domain-owned code
import { createPayGroupInputSchema } from "../schemas/setup";
```

## Boundary rule

- Put new command/query schemas in the owning domain file.
- Keep `common.ts` limited to shared primitives and mutation context.
- Do not recreate a root `schemas.ts` monolith.
