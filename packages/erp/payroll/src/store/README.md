# Payroll store slices

Domain-sliced persistence contracts for `@afenda/payroll`. Composed entry: `src/store/index.ts`.

## Layout

```text
src/store/
├── setup.ts
├── assignments.ts
├── inputs.ts
├── runs.ts
├── statutory.ts
├── outputs.ts
├── reconciliation.ts
└── index.ts            # PayrollStore composition (SSOT)
```

Package subpath `@afenda/payroll/store` resolves to `store/index.ts`.

## Import patterns

```ts
import type { PayrollStore } from "../store";
import type { PayrollRunsStore } from "../store/runs";
```

Domain commands should depend on the narrowest store slice they need. Adapters implement the composed `PayrollStore`.

## Boundary rule

Store slices own persistence operations only. Cross-domain workflows stay in application commands so transaction and authorization boundaries stay explicit. Do not recreate a root `store.ts` monolith.
