# `@afenda/payroll`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/payroll` · Lifecycle: **scaffolded**

Sole mutator for payroll-period inputs, gross-to-net calculation results, statutory outputs, payslips, and reconciliation. Outcomes use `@afenda/errors` `Result`.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `payroll_*` from `apps/web`. Payroll must not own `hr_*` tables or insert into `payment` / `journal` tables directly.

## Consume

```ts
import {
  PAYROLL_PERMISSION_RUN_CREATE,
  type PayrollAuthorizationPort,
  type PayrollEmployeeQueryPort,
  type MutationPorts,
} from "@afenda/payroll";
```

Workforce facts arrive through `PayrollEmployeeQueryPort`, wired at `apps/web` with an HR-backed adapter — **not** via `@afenda/human-resources` package import.

Finalized runs emit `payroll.payment-requested.v1` and `payroll.posting-requested.v1` for Payments and Accounting app-sagas.

Manifest: `src/module.manifest.ts` (`@afenda/payroll/module-manifest`).

## Maintain

Capability folders: `src/{setup,assignments,inputs,runs,statutory,outputs,reconciliation}/`.

```bash
pnpm validate:modules --write
pnpm governance:packages
```

## Ownership

**Mutation tables (18):** `payroll_calendar` … `payroll_reconciliation` — see `src/mutation-tables.ts`.

**Anti-goals:** owning `hr_employee` / `hr_employee_compensation`; direct payment or journal inserts; nesting under `@afenda/human-resources`.

**Authority:** [docs-V2/_scratch/erp/human-resource.md](../../docs-V2/_scratch/erp/human-resource.md) · [SCAFFOLDING.md](../SCAFFOLDING.md)
