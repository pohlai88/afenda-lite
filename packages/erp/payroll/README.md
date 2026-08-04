# `@afenda/payroll`

Sole mutator for organization-scoped payroll setup, period inputs, gross-to-net
results, statutory outputs, payslips, and reconciliation. Commands and queries
return `@afenda/errors` `Result`. Tables live in `@afenda/db`; this package owns
mutations of `payroll_*` only.

## Who it is for

`apps/web` server actions and composition roots that need typed payroll mutations —
not UI shells, HTTP handlers, or HR command engines.

## Stability

`Internal` — workspace-only package. Module manifest:
`lifecycle: "scaffolded"`, `activationMode: "organization_toggle"`.
Honest interim posture until HR promotion evidence and calculator sourcing
decisions close ([hr-payroll-decisions.md](./docs/hr-payroll-decisions.md) A1).

## Requires

- Node `24.x` | pnpm `>=10.33.4` (root `package.json` engines)
- Workspace consumption (`workspace:*`) for private `@afenda/*` packages

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

Import from `@afenda/payroll` only. Never deep-import `@afenda/*/src/...`.

The package publishes exactly one entrypoint. The capability context is opaque:
consumers cannot inject stores, raw ports, or calculators. Production
persistence, audit/event wiring, and calculation selection stay inside the
Payroll owner.

| Constraint | Rule |
| --- | --- |
| Workforce | Facts arrive through `PayrollWorkforceCapability`. No HR runtime dependency; `apps/web` projects the sealed HR handoff. Pay-group membership is Payroll-owned. |
| Runs | Create/transition commits run row, audit, and outbox facts in one production DB transaction. Finalized runs emit `payroll.payment-requested.v1` and `payroll.posting-requested.v1`. |
| Reversal | Preserves sealed original evidence; emits compensating payment/posting corrections exactly once. |
| Payslips | Deterministic versioned views over finalized evidence. Own vs all-payslip permissions stay distinct. |
| Money / dates | ISO calendar dates only. Monetary parse accepts at most 12 fractional digits; excess precision fails closed. |
| Statutory | Production activation is fail-closed. Bundled `synth.v1` is test-only — see [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md). |
| Setup rules | Effective-dated versions with exclusion constraints; finalized versions cannot be mutated or retired. |

### Domain features

Uniform ERP topology: `facade` / `kernel` / `composition` / `features` / `testing`.
Business behavior lives under `src/features/`. Features never import `facade`,
`composition`, or `testing`, and never accept the composite `PayrollStore`.

| Feature | Responsibility |
| --- | --- |
| `payroll-setup` | Calendars, pay groups, and effective-dated rules |
| `employee-assignments` | Employee assignment and recurring earning/deduction |
| `workforce-ingress` | HR handoff validation and canonical normalization |
| `variable-inputs` | Period variable inputs and source idempotency |
| `payroll-runs` | Period/run lifecycle, exceptions, finalization, and reversal |
| `calculation` | Deterministic calculation, result lines, and snapshots |
| `statutory-rules` | Statutory calculators, results, and approval policy |
| `payslips` | Authorized deterministic payslip views |
| `reconciliation` | Payroll/downstream discrepancy resolution |

Manifest: [`src/composition/module.manifest.ts`](./src/composition/module.manifest.ts)
(repository-governance input, not a consumer subpath).

## Quickstart

```bash
pnpm --filter @afenda/payroll check
```

## Maintain

| Command | Purpose |
| --- | --- |
| `pnpm --filter @afenda/payroll lint` | Lint |
| `pnpm --filter @afenda/payroll typecheck` | Types |
| `pnpm --filter @afenda/payroll test` | Package tests |
| `pnpm --filter @afenda/payroll check` | Lint + typecheck + test |

After manifest or register changes:

```bash
pnpm validate:modules --write
pnpm governance:packages
```

## Boundaries

**Mutation tables (20):** `payroll_calendar` … `payroll_accepted_handoff` — see
[`src/kernel/emissions/mutation-tables.ts`](./src/kernel/emissions/mutation-tables.ts).

| Owns | Does not own |
| --- | --- |
| Payroll domain commands, validation, business rules, and events for `payroll_*` | Database schema host (`@afenda/db`) |
| Feature-owned persistence adapters and Zod contracts | HR workforce records (`@afenda/human-resources`) |
| Allowance/deduction **calculation** (`payroll_earning_rule`, recurring lines, result lines) | `hr_allowance_entitlement`, `hr_employee_compensation` (HR agreement) |
| Statutory calculation and results on `payroll_statutory_*` | Benefit enrollment contribution **terms** on `hr_benefit_enrollment` |
| Disbursement/posting **requests** via payment/posting-requested events | `payment*`, `journal*` tables (Payments / Accounting execution) |
| Payslips, reconciliation, run finalization/reversal | UI shells (`@afenda/ui-system` in `apps/web`), raw `process.env` |

**Anti-goals:** owning `hr_employee` / `hr_employee_compensation` / `hr_allowance_entitlement`;
nesting under `@afenda/human-resources`; peer package import of HR; inserting into
`payment` or `journal`.

**Four-way ownership:** HR entitlement/agreement → Payroll calculation → Accounting
posting → Payments disbursement. Product boundary:
[Human Resources PRD](../human-resources/docs/PRD.md).

## Authority

| Topic | Link |
| --- | --- |
| Malaysia/Vietnam Payroll PRD | [docs/PAYROLL-PRD-MY-VN.md](./docs/PAYROLL-PRD-MY-VN.md) |
| Production readiness | [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) |
| HR ↔ Payroll closure guideline | [hr-payroll-bridging.md](../../../docs/erp/hr-payroll-bridging.md) |
| HR ↔ Payroll decisions register | [hr-payroll-decisions.md](./docs/hr-payroll-decisions.md) |
| Human Resources PRD (ownership boundary) | [../human-resources/docs/PRD.md](../human-resources/docs/PRD.md) |
| ERP scaffold rules | [ERP-SCAFFOLDING.md](../ERP-SCAFFOLDING.md) |
| Package agent deltas | [AGENTS.md](./AGENTS.md) |
| Implementation method | project skill `afenda-elite-payroll` |
| Kernel doctrine | [packages/KERNEL-GOVERNANCE.md](../../KERNEL-GOVERNANCE.md) |
| Agent checkout | [AGENTS.md](../../../AGENTS.md) |

## Support

| Topic | Where |
| --- | --- |
| Owning surface | Payroll package maintainers |
| Report an issue | Repository issue tracker for `afenda-lite` |

## License

UNLICENSED — private workspace package unless published explicitly.
