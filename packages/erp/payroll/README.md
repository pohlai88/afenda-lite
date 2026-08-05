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

Contract evidence fixtures:

| Fixture | Role |
| --- | --- |
| [`public-contract.fixture.json`](./__tests__/fixtures/public-contract.fixture.json) | Accepted root + testing entrypoints |
| [`registry-projection.fixture.json`](./__tests__/fixtures/registry-projection.fixture.json) | Operation governance projection |
| [`consumer-inventory.fixture.json`](./__tests__/fixtures/consumer-inventory.fixture.json) | Consumer graph |
| [`architecture-debt.fixture.json`](./__tests__/fixtures/architecture-debt.fixture.json) | Reporting-only containment baseline (targets remain zero; not an allowlist) |

## Verify

| Loop | Command |
| --- | --- |
| Inner | `pnpm check:payroll` |
| Package | `pnpm --filter @afenda/payroll test` |
| Outer (Neon) | `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity` |

PowerShell outer loop: `$env:REQUIRE_DATABASE_TESTS = "1"; pnpm test:payroll:parity`
(also requires `AFENDA_DATABASE_TEST_TARGET=test` or `preview`).

## Requires

- Node `24.x` | pnpm `>=10.33.4` (root `package.json` engines)
- Workspace consumption (`workspace:*`) for private `@afenda/*` packages

## Consume

```ts
import {
	createJurisdictionPayrollCurrency,
	createPayrollCalendar,
	createPayrollCapabilityOptions,
	createRegistryPayrollStatutory,
	createSystemPayrollClock,
} from "@afenda/payroll";

const payroll = createPayrollCapabilityOptions({
	authorization: payrollAuthorization,
	clock: createSystemPayrollClock(),
	currency: createJurisdictionPayrollCurrency(),
	statutory: createRegistryPayrollStatutory(),
});

const result = await createPayrollCalendar(input, payroll);
```

Import from `@afenda/payroll` or the declared `./testing` subpath only.
Never deep-import `@afenda/*/src/...`.

| Entrypoint | Role |
| --- | --- |
| `@afenda/payroll` | Production facade: operations, domain contracts, opaque execution context |
| `@afenda/payroll/testing` | Test-only memory store and calculator helpers — never import from product code |

The capability context is opaque: consumers cannot inject stores, raw ports, or
calculators. Production persistence, audit/event wiring, and calculation
selection stay inside the Payroll owner.

### HR ↔ Payroll transport (single path)

Identical wording on both package READMEs ([bridging B1](../../../docs/erp/hr-payroll-bridging.md)):

```text
HR command (queuePayrollDelivery)
  └─ hr_payroll_handoff_delivery row (status: pending) — one HR transaction
        │
apps/web producer (modules/platform/domain/human-resources-payroll-delivery.ts)
  ├─ 1. ingestApprovedPayrollHandoff(...)  → payroll_accepted_handoff row (idempotent)
  └─ 2. publish platform.human-resources.payroll-delivery.requested.v1
        (fan-out telemetry only — NOT the ingest path)
        │
HR feedback (recordPayrollDeliveryFeedback: acknowledged | rejected | correction_required)
```

- Production composition does **not** wire `PayrollWorkforceCapability`
  ([`payroll-command-options.ts`](../../../apps/web/lib/erp/payroll-command-options.ts)).
  Calculation-time reads use the accepted-handoff ledger. The optional
  `workforce` field on capability options is a **test-only** seam.
- Ingest and event publish share no transaction; safety depends on ingest
  idempotency (`deliveryId` + payload hash — bridging C1).
- Retry/recovery: `recoverPendingPayrollDeliveries` + HR reliability worker.
- Corrections: atomic supersessions with optimistic source-version locking.

| Constraint | Rule |
| --- | --- |
| Workforce | Facts arrive through the push/sync-ingest path above. No HR runtime dependency. Pay-group membership is Payroll-owned. |
| Runs | Create/transition commits run row, audit, and outbox facts in one production DB transaction. Finalized runs emit `payroll.payment-requested.v1` and `payroll.posting-requested.v1`. |
| Reversal | Preserves sealed original evidence; emits compensating payment/posting corrections exactly once. |
| Payslips | Deterministic versioned views over finalized evidence. Own vs all-payslip permissions stay distinct. Restricted subjects are excluded from read models and exports until lifted (A3/C7). |
| Privacy | Restriction, not erasure. HR privacy deletes do not cascade into payroll evidence. Retention clocks must be counsel-cited before any erasure path. |
| Money / dates | ISO calendar dates only. Monetary parse accepts at most 12 fractional digits; excess precision fails closed. |
| Statutory | A2 sourcing closed (build in-house). MY/VN packs are `awaiting_review`; `synth.v1` is test-only — see [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md). |
| Setup rules | Effective-dated versions with exclusion constraints; finalized versions cannot be mutated or retired. |

**Security:** Commands require injected `PayrollAuthorizationCapability`. Input
schemas reject tenant-field injection — the composition root stamps
`organizationId`, `actorUserId`, and `correlationId` after validation.

**Tenancy:** Shared Neon schema with organization-scoped rows. Hard-tenant-root
names derive from `packages/data-plane/db/src/hard-tenant-roots.ts` (`payroll_*`).
This is not multi-DB isolation. Callers cannot supply tenant identity.

### Domain features

Uniform ERP topology: `facade` / `kernel` / `composition` / `features` / `testing`.
Business behavior lives under `src/features/`. Features never import `facade`,
`composition`, or `testing`, and never accept the composite `PayrollStore`.

| Feature | Responsibility |
| --- | --- |
| `payroll-setup` | Calendars, pay groups, and effective-dated rules |
| `employee-assignments` | Employee assignment and recurring earning/deduction |
| `workforce-ingress` | HR handoff validation, C3 period freeze / deferral, C6 termination exception |
| `variable-inputs` | Period variable inputs and source idempotency |
| `payroll-runs` | Period/run lifecycle, exceptions, finalization, and reversal |
| `calculation` | Deterministic calculation, result lines, and snapshots |
| `statutory-rules` | Statutory calculators, results, and approval policy |
| `payslips` | Authorized deterministic payslip views |
| `privacy` | Restriction, retention evidence, field projection, and read-own DSAR |
| `reconciliation` | Payroll/downstream discrepancy resolution |
| `settlement-ingress` | Payments/Accounting settlement facts into reconciliation |
| `payroll-jobs` | Durable calculation batches: claim, lease, retry, dead letter, replay |
| `retro-pay` | Deferred sealed-period corrections into an open target period |
| `final-settlement` | Termination pay, C6 clearance, SoD finalize, terminal statement |
| `statutory-filings` | Period/annual filing artifacts sealed from finalized statutory results |

### Composition entries

| Surface | Path |
| --- | --- |
| Module manifest | [`src/composition/module.manifest.ts`](./src/composition/module.manifest.ts) |
| Drizzle adapters | [`src/composition/adapters/drizzle.ts`](./src/composition/adapters/drizzle.ts) |
| Production ports | [`src/composition/production/ports.ts`](./src/composition/production/ports.ts) |
| Store contract | [`src/composition/store/contract.ts`](./src/composition/store/contract.ts) |
| Store slices | [`src/composition/store/compose-slices.ts`](./src/composition/store/compose-slices.ts) |
| Store resolve | [`src/composition/store/resolve-store.ts`](./src/composition/store/resolve-store.ts) |

Manifest is a repository-governance input, not a consumer subpath.

### Product composition

| Journey or worker | Composition entry |
| --- | --- |
| Payroll command options | [`payroll-command-options.ts`](../../../apps/web/lib/erp/payroll-command-options.ts) |
| Payroll delivery producer | [`human-resources-payroll-delivery.ts`](../../../apps/web/modules/platform/domain/human-resources-payroll-delivery.ts) |
| HR payroll delivery actions | [`hr-payroll-delivery.ts`](../../../apps/web/app/actions/hr-payroll-delivery.ts) |
| HR reliability worker | [`human-resources-reliability-worker.ts`](../../../apps/web/modules/platform/domain/human-resources-reliability-worker.ts) |

## Quickstart

```bash
pnpm --filter @afenda/payroll check
```

## Maintain

| Command | Purpose |
| --- | --- |
| `pnpm --filter @afenda/payroll lint` | Lint |
| `pnpm --filter @afenda/payroll typecheck` | Types |
| `pnpm --filter @afenda/payroll test` | Package unit tests |
| `pnpm --filter @afenda/payroll check` | Lint + typecheck + test |

After manifest or register changes:

```bash
pnpm validate:modules
pnpm governance:packages
```

CI uses check-only `pnpm validate:modules`. Local regeneration, when a write path
exists again, is an explicit maintainer action — not the README default.

## Boundaries

**Mutation tables (29):** `payroll_calendar` … `payroll_statutory_filing_line` — see
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
| Development roadmap | [docs/development-roadmap.md](./docs/development-roadmap.md) |
| Baseline verification | [docs/baseline-verification.md](./docs/baseline-verification.md) |
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
