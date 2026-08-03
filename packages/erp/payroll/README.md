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

The package publishes exactly one entrypoint: `@afenda/payroll`. Consumers use
the root capability facade; stores, adapters, schemas, calculators, brands, and
mutation ports are package-private implementation details.

Workforce facts arrive through the public `PayrollWorkforceCapability`. The Payroll package
has no HR runtime dependency; the `apps/web` composition adapter consumes the
sealed `@afenda/human-resources` root handoff and projects only the employment
and compensation facts Payroll requires. Pay-group membership remains
Payroll-owned and is validated from the Payroll assignment store.

Run creation and status transitions commit the run row, audit fact, and emitted
outbox facts in one production database transaction. Finalized runs emit
`payroll.payment-requested.v1` and `payroll.posting-requested.v1` for Payments
and Accounting app-sagas. Reversal preserves the sealed original evidence,
creates linked compensating adjustments, and emits negative payment/posting
correction requests exactly once. Bounded reason codes cross that integration
boundary; detailed reasons remain in Payroll audit evidence, and persisted
request fingerprints reject conflicting retries.

Payslips are deterministic versioned views over finalized evidence. Self-service
reads derive the employee from the authenticated workforce mapping; privileged
reads require the distinct all-payslip permission. Reconciliation derives
expected totals and tolerance policy from finalized evidence, exposes authorized
aggregate state, and owns the versioned discrepancy-resolution workflow.

Date inputs must be real ISO calendar dates. Monetary parsing accepts at most
the canonical 12 fractional digits and rejects excess precision instead of
silently truncating it. Memory persistence is test-only; the facade composition
injects the Drizzle production store and required mutation capabilities.

Production statutory activation is fail-closed. The bundled `synth.v1`
calculator is test-only and is not a jurisdiction approval. See
[PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for recovery controls and
the qualified-review gate.

Setup rules are effective-dated versions. At most one non-archived earning,
deduction, or statutory rule may cover a date for the same organization, pay
group, and code; PostgreSQL exclusion constraints provide the concurrency-safe
boundary. Supersession closes the prior inclusive range and preserves that
version for historical resolution. Archiving removes a version from future
resolution. Finalization validates calculation-snapshot record versions and
shares a deterministic per-rule transaction lock with update, archive, and
supersede, so a finalized version cannot be changed or retired even under a
concurrent mutation.

Manifest: `src/composition/module.manifest.ts` (repository-governance input, not a consumer
subpath).

## Domain features

Payroll uses the uniform ERP `facade/kernel/composition/features/testing`
topology. Business behavior, validation, persistence contracts, and adapters are
owned by named feature capsules under `src/features/`. The kernel composes
package-wide operations and primitives; composition alone constructs the
aggregate store; the root facade remains the only business-consumer surface.

| Feature | Responsibility |
|---------|----------------|
| `payroll-setup` | Calendars, pay groups, and effective-dated rules |
| `employee-assignments` | Employee assignment and recurring earning/deduction |
| `workforce-ingress` | HR handoff validation and canonical normalization |
| `variable-inputs` | Period variable inputs and source idempotency |
| `payroll-runs` | Period/run lifecycle, exceptions, finalization, and reversal |
| `calculation` | Deterministic calculation, result lines, and snapshots |
| `statutory-rules` | Statutory calculators, results, and approval policy |
| `payslips` | Authorized deterministic payslip views |
| `reconciliation` | Payroll/downstream discrepancy resolution |

Feature handlers and adapters depend on their feature-owned store contract or a
narrow cross-feature capability. They never import `facade`, `composition`, or
`testing`, and never accept the composite `PayrollStore`.

## Public surfaces

| Entry point | Role |
|-------------|------|
| `@afenda/payroll` | Commands, queries, permissions, and opaque composition capabilities |

The root barrel does not export stores, adapters, calculators, mutation ports,
raw schemas/brands, Drizzle tables, SQL builders, database handles, Next.js
types, or HTTP envelopes.

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

**Mutation tables (19):** `payroll_calendar` … `payroll_rule_finalized_usage` — see `src/kernel/emissions/mutation-tables.ts`.

| Owns | Does not own |
|------|----------------|
| Payroll domain commands, validation, business rules, and events for `payroll_*` | Database schema host (`@afenda/db`) |
| Feature-owned persistence adapters | HR workforce records (`@afenda/human-resources`) |
| Feature-owned Zod contracts | Direct payment / journal inserts |
| **Allowance calculation** — `payroll_earning_rule`, `payroll_recurring_earning`, earning `payroll_result_line` rows | `hr_allowance_entitlement`, `hr_employee_compensation` (HR agreement) |
| **Deduction calculation** — `payroll_deduction_rule`, `payroll_recurring_deduction`, `payroll_statutory_*`, deduction `payroll_result_line` rows, gross-to-net on run | Benefit enrollment contribution **terms** on `hr_benefit_enrollment` (HR agreement) |
| Disbursement/posting **requests** via `payroll.payment-requested.v1` and `payroll.posting-requested.v1` | `payment*`, `journal*` tables (Payments and Accounting own execution) |

**Anti-goals:** owning `hr_employee` / `hr_employee_compensation` / `hr_allowance_entitlement`; nesting under `@afenda/human-resources`; peer package import of HR; inserting into `payment` or `journal`.

**Four-way ownership:** HR entitlement/agreement → Payroll calculation → Accounting posting → Payments disbursement. The product boundary and non-duplication rules are defined in the [Human Resources PRD](../../../docs/_scratch/human-resources/human-resources-prd.md).

**Authority:** [Human Resources PRD](../../../docs/_scratch/human-resources/human-resources-prd.md) · [Malaysia/Vietnam Payroll PRD](../../../docs/_scratch/payroll/PAYROLL-PRD-MY-VN.md) · [SCAFFOLDING.md](../ERP-SCAFFOLDING.md) · skill `afenda-elite-payroll`
