# `@afenda/payroll` package tree

Structural SSOT for agents implementing payroll. Pattern source: `@afenda/human-resources`.

## Target layout

```text
packages/erp/payroll/
├── package.json                 # exports: ., adapters/drizzle, schemas, store, testing, …
├── README.md
├── __tests__/
└── src/
    ├── index.ts                 # public barrel (`import "server-only"`)
    ├── module.manifest.ts
    ├── module-ids.ts
    ├── mutation-tables.ts
    ├── permissions.ts
    ├── authorization.ts
    ├── command-options.ts
    ├── ports.ts
    ├── production-ports.ts
    ├── resolve-store.ts
    ├── parse-input.ts
    ├── brands.ts
    ├── error-codes.ts
    ├── types.ts
    ├── schemas/
    │   ├── README.md
    │   ├── common.ts            # mutation context + shared primitives
    │   ├── setup.ts
    │   ├── assignments.ts
    │   ├── inputs.ts
    │   ├── runs.ts
    │   ├── statutory.ts
    │   ├── outputs.ts
    │   ├── reconciliation.ts
    │   └── index.ts
    ├── store/
    │   ├── README.md
    │   ├── setup.ts
    │   ├── assignments.ts
    │   ├── inputs.ts
    │   ├── runs.ts
    │   ├── statutory.ts
    │   ├── outputs.ts
    │   ├── reconciliation.ts
    │   └── index.ts             # PayrollStore = intersection of slices
    ├── adapters/
    │   ├── drizzle/
    │   │   ├── compose.ts
    │   │   ├── store.ts         # createDrizzlePayrollStore only
    │   │   ├── setup.ts
    │   │   ├── assignments.ts
    │   │   ├── inputs.ts
    │   │   ├── runs.ts
    │   │   ├── statutory.ts
    │   │   ├── outputs.ts
    │   │   ├── reconciliation.ts
    │   │   └── index.ts
    │   └── memory/
    │       ├── store.ts         # createMemoryPayrollStore
    │       └── index.ts
    ├── testing/
    │   └── index.ts             # re-exports memory factory
    ├── setup/                   # command/query files
    ├── assignments/
    ├── inputs/
    ├── runs/
    ├── statutory/
    ├── outputs/
    └── reconciliation/
```

## Folder vs file ownership

| Concern | Home | Forbidden |
|---------|------|-----------|
| Zod for a domain | `schemas/<domain>.ts` | Dumping into `common.ts` or a root `schemas.ts` |
| Store method for a domain | `store/<domain>.ts` | Monolithic root `store.ts` |
| Drizzle SQL/methods | `adapters/drizzle/<domain>.ts` | Growing `adapters/drizzle/store.ts` beyond compose |
| Memory persistence | `adapters/memory/` (+ domain files when state grows) | Root `memory-store.ts` |
| Command / query | `<farm>/<aggregate>.ts` | Cross-farm files that mix setup + runs + outputs |
| Shared pure helpers | `shared/` (create when first helper exists) | Business writes or store calls in `shared/` |
| Cross-module workforce read | `ports.ts` → `PayrollEmployeeQueryPort` | `@afenda/human-resources` import |

## Published exports

| Subpath | Resolves to |
|---------|-------------|
| `@afenda/payroll` | `src/index.ts` |
| `@afenda/payroll/adapters/drizzle` | `src/adapters/drizzle/index.ts` |
| `@afenda/payroll/schemas` | `src/schemas/index.ts` |
| `@afenda/payroll/store` | `src/store/index.ts` |
| `@afenda/payroll/testing` | `src/testing/index.ts` |
| `@afenda/payroll/module-manifest` | `src/module.manifest.ts` |
| `@afenda/payroll/authorization` | `src/authorization.ts` |
| `@afenda/payroll/brands` | `src/brands.ts` |
| `@afenda/payroll/resolve-store` | `src/resolve-store.ts` |

## Aggregate → farm map

| Aggregate marker / concern | Farm |
|----------------------------|------|
| calendar, pay-group, earning-rule, deduction-rule, statutory-rule | `setup` |
| employee-payroll-assignment, recurring-earning, recurring-deduction | `assignments` |
| variable-input, overtime-input, leave-adjustment, one-time-adjustment | `inputs` |
| payroll-period, payroll-run, calculation, exception, finalization, reversal | `runs` |
| employee-contribution, employer-contribution, tax-result, statutory-submission | `statutory` |
| payroll-result, payslip, payment-instruction, accounting-posting | `outputs` |
| payroll-reconciliation, payment-reconciliation, accounting-reconciliation | `reconciliation` |

## Root files that stay flat

Keep these at `src/` root (same as HR): `index.ts`, `ports.ts`, `authorization.ts`, `brands.ts`, `command-options.ts`, `error-codes.ts`, `permissions.ts`, `parse-input.ts`, `production-ports.ts`, `resolve-store.ts`, `module.manifest.ts`, `module-ids.ts`, `mutation-tables.ts`, `types.ts`.
