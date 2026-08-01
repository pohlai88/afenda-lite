# `@afenda/payroll`

Band: **R1-F ERP** · Layer: Rank-1 · Package: `@afenda/payroll` · Lifecycle: **active**

Sole mutator for payroll-period inputs, gross-to-net calculation results, statutory outputs, payslips, and reconciliation. Outcomes use `@afenda/errors` `Result`.

**Tables live in `@afenda/db`.** Mutations are sole-owned here — do not dual-write `payroll_*` from `apps/web`. Payroll must not own `hr_*` tables or insert into `payment` / `journal` tables directly.

**Who it's for:** `apps/web` server actions that need typed payroll mutations — not UI shells, HTTP handlers, or HR command engines.

## Consume

```ts
import {
	createPayrollCalendar,
	createPayrollCapabilityOptions,
} from "@afenda/payroll";

const payroll = createPayrollCapabilityOptions({
	authorization: payrollAuthorization,
	workforce: payrollWorkforce,
});

const result = await createPayrollCalendar(input, payroll);
```

The capability context is opaque. Production persistence, audit/event
capabilities, and calculation wiring are selected inside the Payroll owner;
consumers cannot inject stores, raw ports, or calculators through this facade.

The implementation subpaths listed below remain published only until the final
kernel cutover. New production consumers must use the root capability facade.

Workforce facts arrive through `PayrollEmployeeQueryPort`. The Payroll package
has no HR runtime dependency; the `apps/web` composition adapter consumes the
sealed `@afenda/human-resources` root handoff and projects only the employment
and compensation facts Payroll requires. Pay-group membership remains
Payroll-owned and is validated from the Payroll assignment store.

Run creation and status transitions commit the run row, audit fact, and emitted
outbox facts in one production database transaction. Finalized runs emit
`payroll.payment-requested.v1` and `payroll.posting-requested.v1` for Payments
and Accounting app-sagas.

Date inputs must be real ISO calendar dates. Monetary parsing accepts at most
the canonical 12 fractional digits and rejects excess precision instead of
silently truncating it. Memory persistence is test-only; omitted internal store
wiring resolves to the Drizzle production store.

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

**Mutation tables (19):** `payroll_calendar` … `payroll_rule_finalized_usage` — see `src/mutation-tables.ts`.

| Owns | Does not own |
|------|----------------|
| Payroll domain commands, validation, business rules, and events for `payroll_*` | Database schema host (`@afenda/db`) |
| Store adapters (`adapters/drizzle`, `adapters/memory`) | HR workforce records (`@afenda/human-resources`) |
| Zod contracts under `src/schemas/` | Direct payment / journal inserts |
| **Allowance calculation** — `payroll_earning_rule`, `payroll_recurring_earning`, earning `payroll_result_line` rows | `hr_allowance_entitlement`, `hr_employee_compensation` (HR agreement) |
| **Deduction calculation** — `payroll_deduction_rule`, `payroll_recurring_deduction`, `payroll_statutory_*`, deduction `payroll_result_line` rows, gross-to-net on run | Benefit enrollment contribution **terms** on `hr_benefit_enrollment` (HR agreement) |
| Disbursement/posting **requests** via `payroll.payment-requested.v1` and `payroll.posting-requested.v1` | `payment*`, `journal*` tables (Payments and Accounting own execution) |

**Anti-goals:** owning `hr_employee` / `hr_employee_compensation` / `hr_allowance_entitlement`; nesting under `@afenda/human-resources`; peer package import of HR; inserting into `payment` or `journal`.

**Four-way ownership (Slice 8.6):** [allowance-deduction-ownership.md](../../../docs-V2/_scratch/erp/allowance-deduction-ownership.md)

**Authority:** [docs-V2/_scratch/erp/human-resource.md](../../../docs-V2/_scratch/erp/human-resource.md) · [SCAFFOLDING.md](../SCAFFOLDING.md) · skill `afenda-elite-payroll`
