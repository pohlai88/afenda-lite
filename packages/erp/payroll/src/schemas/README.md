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

Package subpath `@afenda/payroll/schemas` resolves to `schemas/index.ts`.

## Import patterns

```ts
// Package consumers
import { payrollMutationContextSchema } from "@afenda/payroll/schemas";

// Domain-owned code (preferred)
import { createPayGroupInputSchema } from "../schemas/setup";
```

## Boundary rule

- Put new command/query schemas in the owning domain file.
- Keep `common.ts` limited to shared primitives and mutation context.
- Do not recreate a root `schemas.ts` monolith.
