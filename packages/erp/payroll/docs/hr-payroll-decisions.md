# HR ↔ Payroll decisions register

**Scope:** `@afenda/human-resources` and `@afenda/payroll`  
**Closure guideline:** [docs/erp/hr-payroll-bridging.md](../../../docs/erp/hr-payroll-bridging.md)  
**Placement:** package-local under `packages/erp/payroll/docs/` (not a `decisions/` directory).

| ID | Topic | Status | Decision | Date | Owner |
| --- | --- | --- | --- | --- | --- |
| A1 | Lifecycle coupling | **CLOSED** | Demote Payroll to `lifecycle: "scaffolded"` until HR promotion evidence exists. Enforce with `pnpm governance:packages` → `governance-lifecycle-coupling.mjs` (active module must not require a scaffolded module). | 2026-08-05 | Payroll / platform governance |
| A2 | Statutory calculator sourcing | OPEN | Choose build / vendor table / rates feed per MY and VN instrument; record authoritative citation before production activation. | — | Pending product + finance |
| A3 | Retention vs privacy erasure | **CLOSED** | Adopted bridging posture: Payroll evidence uses **restriction**, not cascade erasure from HR privacy deletes, until counsel cites statutory retention clocks. Erasure automation stays forbidden without that citation. | 2026-08-05 | Payroll (counsel citation still required before erasure) |
| A4 | Settlement authority | **CLOSED** | Adopted bridging posture: payroll reversal only while disbursement is un-settled; settled recovery is Accounting clawback. Settlement-ingress (D2) is a delivery dependency, not an open product fork. | 2026-08-05 | Payroll / Payments / Accounting |
| C9 | Finalize segregation of duties | **CLOSED** | Maker-checker is calculate-actor ≠ finalize-actor (`run.updatedBy` vs finalize `actorUserId` → `CONFLICT`). No distinct `payroll.run.approve` yet; break-glass lands with the approval-workflow slice. | 2026-08-05 | Payroll |
| B5 | Neon parity loop | **CLOSED** | `pnpm test:payroll:parity` green on preview target with `payroll_accepted_handoff` present (7/7). Supersession uses advisory xact lock + UPDATE-then-INSERT so the active-identity unique index holds under concurrent ingest. Production migrate remains ops-gated (PL-S9). | 2026-08-05 | Payroll |
| B2 | Governance fixtures | **CLOSED** | Four fixtures + `governance-fixtures.test.ts` (public-contract, registry-projection, consumer-inventory, architecture-debt). | 2026-08-05 | Payroll |
| B4 | Emission registry | **CLOSED** | `PAYROLL_EMISSION_REGISTRY` owns command→event→dispatcher mapping; manifest `events.emits` derives from it; retired `docs-V2` citation removed from `mutation-tables.ts`. | 2026-08-05 | Payroll |
| B1 | Transport docs + testing subpath | **CLOSED** | Document single push/sync-ingest transport on both READMEs; PayrollWorkforceCapability is test-only; declare @afenda/payroll/testing. | 2026-08-05 | Payroll / HR |
| B7 | Governance gates | **CLOSED** | Root scripts governance:erp-symmetry, governance:emission-drain, governance:cross-import, governance:architecture-debt chained from governance:packages. | 2026-08-05 | Payroll / platform governance |
| B6 | Platform outbox drain | **CLOSED** | `apps/web` cron `/api/cron/payroll-outbox` drains payroll emissions via `PAYROLL_PLATFORM_EVENT_DISPATCHER_ID`; Payments draft intake + Accounting source posting handlers fail closed. | 2026-08-05 | Payroll / platform composition |
| D2 | Settlement ingress | **CLOSED** | `settlement-ingress` feature + C8 reversal guard; `apps/web` drains Payments posted/reversed + Accounting journal posted into reconciliation; matched payment blocks run reversal. | 2026-08-05 | Payroll / Payments / Accounting |
| D7 | HR restriction operation | **CLOSED** | `restrictEmployeeData` / `liftEmployeeDataRestriction` ship with export exclusion and anonymization block; cut-off / termination / breaking-change / PRODUCTION_READINESS docs updated for payroll C3/C6 enforcement. | 2026-08-05 | Human Resources |
| C3 | Period freeze | **CLOSED** | Period status `open → inputs_locked → closed`. Operators create a run while open, then `lockPayrollPeriodInputs`. Non-termination ingest after freeze seals `deferred_to_next_period` (success, no producer retry) and is excluded from the accepted-handoff reader. Money corrections stay on `retro-pay`. Schema `0055_payroll_period_inputs_locked` (ops-gated migrate). | 2026-08-05 | Payroll |
| C6 | Mid-period termination | **CLOSED** | After freeze, `employmentStatus ∈ {notice, terminated}` still accepts the fact and writes blocking `MID_PERIOD_TERMINATION` on non-finalized / non-reversed runs in the covering period. Finalize already refuses blocking exceptions. | 2026-08-05 | Payroll |
| B3 | Capability signature | **CLOSED** | Composition requires clock, currency, and statutory capabilities; production factories exported; calculator uses currency payable scale and statutory registry approval. | 2026-08-05 | Payroll |
| D1 | Payroll privacy | **CLOSED** | `payroll/privacy` ships restriction, retention evidence, field projection, and read-own DSAR. Admin ops use `payroll.payslip.read-all`; subject access uses `payroll.payslip.read-own`. `expirePayrollRetention` marks eligible only — no erasure without A3 counsel citation. | 2026-08-05 | Payroll |
| D6 | Payroll jobs | **CLOSED** | `payroll-jobs` durable calculation batches: claim/lease/retry/DLQ/replay + chunk merge persistence. Web cron `/api/cron/payroll-jobs`. Schema `0051_payroll_jobs` (ops-gated migrate). | 2026-08-05 | Payroll |
| D3 | Retro pay | **CLOSED** | `retro-pay` queues C3 corrections, recomputes under the sealed run snapshot (never live setup tables), refuses unreproducible periods, and applies origin-labelled lines into an open target period. Schema `0052_payroll_retro_pay` (ops-gated migrate). | 2026-08-05 | Payroll |
| D4 | Final settlement | **CLOSED** | `final-settlement` initiates from the accepted handoff's HR termination fact and pins that handoff's compensation into a hashed snapshot; calculation prices only from the pin, so a later compensation revision cannot restate a settlement. Caller input is non-statutory only (notice/in-lieu, recoveries). Leave-balance days are pinned from `leaveBalanceAtTermination` on the accepted handoff (D0 Stage 2/3). Statutory treatment routes through the same fail-closed calculator capability payroll runs use — unregistered or unapproved calculators refuse with `CONFLICT`, so synth-only production fails closed. C6 locked-run or closed-period cases require human clearance before calculate; finalize is SoD-gated (C9). The terminal statement is a derived query preserving `payroll.payslip.read-own` vs `read-all`. Settlement status transitions persist without the run audit + outbox CTE (measured as `settlement-transition-audit-gap`). Schema `0053_payroll_final_settlement` (ops-gated migrate). | 2026-08-05 | Payroll |
| D5 | Statutory filings | **CLOSED** | `statutory-filings` generates period filings and annual statements from finalized-run `payroll_statutory_result` rows only (jurisdiction + instrument = ruleCode). No A2 rate tables invented, and no live statutory-rule read happens at generation time. Generation routes through the same fail-closed `PayrollStatutoryCapability` seam runs and settlements use — with only `synth.v1` (`synthetic_only`) registered while A2 is OPEN, production generation refuses with `CONFLICT` and synth filings stay test-only. Replay is keyed on caller-supplied identity, so a retry returns the identical artifact even after the source runs move on. Seal is SoD-gated (generator ≠ sealer) and stores version-pinned calculator/rule evidence already on the results. Schema `0054_payroll_statutory_filings` (ops-gated migrate). | 2026-08-05 | Payroll |
| D0 | Statutory-fact capture — regional minimum-wage zone ownership | **CLOSED (Stage 1–3)** | The VN regional minimum-wage zone (I–IV) is an **HR-owned employment fact derived from work location**, not payroll setup: it changes when the employee moves, it is captured with the rest of the statutory profile, and payroll consumes it through the handoff rather than deriving or configuring it. Stage 1 ships the HR capture surface `@afenda/human-resources` `src/features/statutory-profile/` — effective-dated `hr_statutory_profile` (tax residency, nationality + expatriate flag, dependant count + closed relief-declaration array pinned to `hr.statutory-relief.v1`, statutory identifiers, VN zone) with open-segment supersession, plus `hr_prior_employer_ytd` for mid-year joiners (money-as-string + currency). Stage 2 widens `hr.payroll-handoff.v1` with `statutoryProfile`, `priorEmployerYtd`, and `leaveBalanceAtTermination`, populated by HR assemble. Stage 3 widens `StatutoryCalculatorInput` with year-to-date + prior-employer + statutory profile, wires `PayrollYearToDateCapability` from finalized payroll history, and pins settlement leave balance from the handoff. Schema `0056_hr_statutory_profile` (ops-gated migrate). | 2026-08-06 | Human Resources / Payroll |

## A1 evidence

- Manifest: `packages/erp/payroll/src/composition/module.manifest.ts` → `lifecycle: "scaffolded"`
- Gate: `scripts/governance-lifecycle-coupling.mjs` (wired from `scripts/governance-packages.mjs`)
- Commit: `5f08676b`

## C2 ordering (closed alongside this register)

Wire `contractVersion` is the schema literal (`hr.payroll-handoff.v1`). Supersession ordering uses payload `sourceVersion` axes. Stale or equal revisions under a new idempotency key return `CONFLICT` ("Stale workforce handoff revision is rejected"). Evidence: `src/features/workforce-ingress/handoff-revision.ts` + `__tests__/workforce-ingest.test.ts`.

## C9 segregation of duties

Shipped in `src/features/payroll-runs/finalization.ts`: when status is `calculated` and `run.updatedBy === actorUserId`, finalize returns `CONFLICT` with public message "Segregation of duties: the actor who calculated a payroll run cannot finalize it". Evidence: `__tests__/payroll-run-lifecycle.test.ts`.

## B5 parity loop

- Gate helpers: `__tests__/helpers/payroll-neon-parity.ts`, `__tests__/helpers/payroll-neon-cleanup.ts`
- Failure injection: `__tests__/failure-injection/run-finalize-atomicity.test.ts`, `__tests__/failure-injection/workforce-ingress-atomicity.test.ts`
- Adapter: `accepted-handoff.drizzle.ts` — `pg_advisory_xact_lock` on identity, supersede prior accepted row, then insert
- Lane: `testing/vitest.payroll-parity.config.ts` · root `pnpm test:payroll:parity` · package `pnpm --filter @afenda/payroll test:parity`
- Verify: `REQUIRE_DATABASE_TESTS=1` + `AFENDA_DATABASE_TEST_TARGET=preview|test` + non-prod `DATABASE_URL` with migration `0049_payroll_accepted_handoff.sql` applied
- Inner loop (no Neon): `pnpm check:payroll`

## B6 platform outbox drain

- Dispatcher: `apps/web:payroll-platform-events` (`PAYROLL_PLATFORM_EVENT_DISPATCHER_ID`)
- Drain worker: `apps/web/modules/platform/domain/payroll-outbox-drain.ts`
- Handlers: `apps/web/modules/platform/domain/payroll-platform-events.ts`
- Cron: `apps/web/app/api/cron/payroll-outbox/route.ts` (gated by `PAYROLL_OUTBOX_DRAIN_ENABLED` + `CRON_SECRET`)
- Registry: `src/kernel/emissions/emission-registry.ts` — all lifecycle emissions declare the dispatcher
- Governance: `pnpm governance:emission-drain` passes with zero undrained debt

## D2 settlement ingress

- Feature: `src/features/settlement-ingress/` — `recordPaymentSettlement`, `recordPostingConfirmation`, `resolveReconciliationDiscrepancy`; `parsePayrollDisbursementReference` for `payroll-run:{runId}:employee:{employeeId}`
- C8 guard: `assertPayrollRunUnsettledForReversal` in `run-settlement-policy.ts`; wired from `payroll-runs/reversal.ts`
- App handlers: `apps/web/modules/platform/domain/payroll-settlement-ingress.ts` (merged into outbox drain)
- Evidence: `__tests__/settlement-ingress.test.ts` · `pnpm check:payroll` 230/230

## Open-decision rule

Do not promote either module to `active`, claim enterprise seal, or enable production statutory calculators while **A2** remains OPEN. A3/A4 closed postures still require counsel-cited retention clocks before erasure or settled clawback automation.
