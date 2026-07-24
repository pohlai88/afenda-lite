# `@afenda/payroll`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/payroll` · Lifecycle: **active**

Sole mutator for payroll-period inputs, gross-to-net calculation results, statutory outputs, payslips, and reconciliation. Outcomes use `@afenda/errors` `Result`.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `payroll_*` from `apps/web`. Payroll must not own `hr_*` tables or insert into `payment` / `journal` tables directly.

**Who it's for:** `apps/web` server actions that need typed payroll mutations — not UI shells, HTTP handlers, or HR command engines.

## Consume

```ts
import {
	PAYROLL_PERMISSION_RUN_CREATE,
	type PayrollAuthorizationPort,
	type PayrollEmployeeQueryPort,
	type MutationPorts,
} from "@afenda/payroll";
```

Wire the Drizzle store at the app composition root:

```ts
import { createDrizzlePayrollStore } from "@afenda/payroll/adapters/drizzle";
```

Workforce facts arrive through `PayrollEmployeeQueryPort`, wired at `apps/web` with an HR-backed adapter — **not** via `@afenda/human-resources` package import.

Finalized runs emit `payroll.payment-requested.v1` and `payroll.posting-requested.v1` for Payments and Accounting app-sagas.

Manifest: `src/module.manifest.ts` (`@afenda/payroll/module-manifest`).

## Domain farms

| Folder | Responsibility |
|--------|----------------|
| `setup` | Calendar, pay group, earning/deduction/statutory rules |
| `assignments` | Employee payroll assignment, recurring earning/deduction |
| `inputs` | Variable, overtime, leave adjustment, one-time adjustment |
| `runs` | Period, run, calculation, exception, finalization, reversal |
| `statutory` | Employee/employer contribution, tax result, submission |
| `outputs` | Payroll result, payslip, payment instruction, accounting posting |
| `reconciliation` | Payroll / payment / accounting reconciliation |

Supporting trees (same shape as `@afenda/human-resources`):

| Tree | Role |
|------|------|
| `schemas/` | Domain-sliced Zod contracts |
| `store/` | Domain-sliced persistence contracts → composed `PayrollStore` |
| `adapters/drizzle/` | Per-domain Drizzle methods + `createDrizzlePayrollStore` |
| `adapters/memory/` | In-memory store for unit/domain tests |
| `testing/` | Test-facing factory exports |

## Public surfaces

| Subpath | Role |
|---------|------|
| `@afenda/payroll` | Brands, schemas, permissions, port types |
| `@afenda/payroll/adapters/drizzle` | `createDrizzlePayrollStore`, per-domain Drizzle adapters |
| `@afenda/payroll/schemas` | Domain Zod schemas |
| `@afenda/payroll/store` | Domain store contracts |
| `@afenda/payroll/testing` | Memory store factories |
| `@afenda/payroll/module-manifest` | Module manifest |

The root barrel does not export raw Drizzle tables, SQL builders, database handles, Next.js types, or HTTP envelopes.

## Maintain

```bash
pnpm --filter @afenda/payroll lint
pnpm --filter @afenda/payroll typecheck
pnpm --filter @afenda/payroll test
pnpm --filter @afenda/payroll check
```

After manifest or register changes:

```bash
pnpm validate:modules --write
pnpm governance:packages
```

Implementation method: project skill `afenda-elite-payroll`.

## Ownership

**Mutation tables (18):** `payroll_calendar` … `payroll_reconciliation` — see `src/mutation-tables.ts`.

| Owns | Does not own |
|------|----------------|
| Payroll domain commands, validation, business rules, and events for `payroll_*` | Database schema host (`@afenda/db`) |
| Store adapters (`adapters/drizzle`, `adapters/memory`) | HR workforce records (`@afenda/human-resources`) |
| Zod contracts under `src/schemas/` | Direct payment / journal inserts |

**Anti-goals:** owning `hr_employee` / `hr_employee_compensation`; nesting under `@afenda/human-resources`; peer package import of HR.

**Authority:** [docs-V2/_scratch/erp/human-resource.md](../../../docs-V2/_scratch/erp/human-resource.md) · [SCAFFOLDING.md](../SCAFFOLDING.md) · skill `afenda-elite-payroll`
