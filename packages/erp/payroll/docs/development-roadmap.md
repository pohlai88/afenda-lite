# Payroll Development Roadmap

| Field | Value |
| --- | --- |
| Status | Package-local engineering roadmap; not a Living DOC-001 controlled document |
| Product | Afenda-Lite Payroll (`@afenda/payroll`) |
| Date | 2026-08-05 |
| Audience | Payroll maintainers, HR integrators, application composition owners |
| Authority | [hr-payroll-bridging.md](../../../docs/erp/hr-payroll-bridging.md) · [hr-payroll-decisions.md](./hr-payroll-decisions.md) · package source |
| Lifecycle | `scaffolded` / `organization_toggle` — green tests do not promote |

> This roadmap points at bridging-doc items. It does not restate product PRD
> math, claim enterprise seal, or authorize statutory calculator activation.

## 1. Shipped feature capsules

Uniform ERP roots: `facade/` · `kernel/` · `composition/` · `features/` · `testing/`.

| Feature | Responsibility |
| --- | --- |
| `payroll-setup` | Calendars, pay groups, periods, effective-dated earning/deduction/statutory rules |
| `employee-assignments` | Employee assignment and recurring earning/deduction |
| `workforce-ingress` | Approved HR handoff ingest into `payroll_accepted_handoff` |
| `variable-inputs` | Period variable inputs and source idempotency |
| `payroll-runs` | Run lifecycle, exceptions, finalization, reversal, outbox append |
| `calculation` | Deterministic calculation, result lines, snapshots |
| `statutory-rules` | Calculator registry + results (production activation fail-closed) |
| `payslips` | Authorized deterministic payslip views |
| `privacy` | Restriction, retention evidence, field projection, and read-own DSAR |
| `reconciliation` | Downstream discrepancy resolution |
| `settlement-ingress` | Inbound Payments/Accounting settlement facts; C8 reversal guard |
| `payroll-jobs` | Durable calculation batches: claim, lease, retry, dead letter, replay, chunk merge |
| `retro-pay` | Queue / snapshot-pinned recompute / apply into an open period / exception review |
| `final-settlement` | Termination pay: pinned-compensation initiate / C6 clearance / calculate with fail-closed statutory / finalize SoD / terminal statement query |
| `statutory-filings` | Period/annual filing generation + evidence seal from finalized statutory results |

Entrypoints: `@afenda/payroll` (production) · `@afenda/payroll/testing` (test-only).

## 2. Closed engineering gates (bridging)

| Item | Status | Evidence |
| --- | --- | --- |
| A1 lifecycle coupling | **CLOSED** | Manifest `scaffolded`; `pnpm governance:lifecycle-coupling` |
| C2 stale handoff revision | **CLOSED** | `handoff-revision.ts` + workforce ingest tests |
| C9 finalize SoD | **CLOSED** | `finalization.ts` maker ≠ checker |
| B2 governance fixtures | **CLOSED** | Four fixtures + `governance-fixtures.test.ts` |
| B4 emission registry | **CLOSED** | `src/kernel/emissions/emission-registry.ts` |
| B5 parity loop | **CLOSED** | `pnpm test:payroll:parity` 7/7 on preview with handoff table; lock + UPDATE-then-INSERT |
| B1 transport docs + `./testing` | **CLOSED** | README transport + package `exports["./testing"]` |
| B7 governance gates | **CLOSED** | `governance:erp-symmetry` · `emission-drain` · `cross-import` · `architecture-debt` |
| B3 capability signature | **CLOSED** | Required `clock` · `currency` · `statutory` on composition |
| B6 platform outbox drain | **CLOSED** | `apps/web` payroll outbox cron + platform event handlers |
| D2 settlement ingress | **CLOSED** | `settlement-ingress` feature + app drain handlers + C8 reversal guard |
| D1 payroll privacy | **CLOSED** | Restriction / retention evidence / field projection / read-own DSAR; erasure still forbidden |
| D6 payroll jobs | **CLOSED** | Durable calculation batches + `/api/cron/payroll-jobs`; migrate `0051_payroll_jobs` remains ops-gated |
| D3 retro pay | **CLOSED** | Queue / recompute under the sealed run snapshot / apply into an open period / exception review; migrate `0052_payroll_retro_pay` remains ops-gated |
| D4 final settlement | **CLOSED** | Termination pay from a pinned compensation snapshot, fail-closed statutory calculator seam, C6 human clearance, C9 finalize SoD, read-own/read-all statement query; migrate `0053_payroll_final_settlement` remains ops-gated |
| D5 statutory filings | **CLOSED** | Period/annual artifacts + SoD evidence seal from finalized `payroll_statutory_result` rows (no invented A2 rate tables); generation gated by the fail-closed statutory-calculator capability, so synth-only production refuses; migrate `0054_payroll_statutory_filings` remains ops-gated |
| C3 period freeze | **CLOSED** | `lockPayrollPeriodInputs` (`open → inputs_locked`); ingest defers non-termination handoffs; `createPayrollRun` stays open-only; lock requires an existing run; migrate `0055_payroll_period_inputs_locked` remains ops-gated |
| C6 mid-period termination | **CLOSED** | Late `notice` / `terminated` handoff after freeze accepts the fact and writes blocking `MID_PERIOD_TERMINATION` on active runs |

## 3. Open items (cite bridging, do not invent scope)

| Item | Bridging | Notes |
| --- | --- | --- |
| Statutory calculator sourcing | A2 | No production jurisdiction until reviewer-approved calculator |
| D0 fact widening — Stage 2/3 | D0 | HR capture (Stage 1) shipped in `@afenda/human-resources` `statutory-profile` with migration `0056_hr_statutory_profile`; the handoff schema widening and the payroll YTD / prior-employer port remain open, so the D4 leave-balance and prior-employer inputs stay caller-asserted |
| Production handoff DDL | ops | Apply `0049_payroll_accepted_handoff.sql` off PL-S9 when migrate is approved |
| Production retro DDL | ops | Apply `0052_payroll_retro_pay.sql` when migrate is approved |
| Production final-settlement DDL | ops | Apply `0053_payroll_final_settlement.sql` when migrate is approved |
| Production statutory-filings DDL | ops | Apply `0054_payroll_statutory_filings.sql` when migrate is approved |
| Production period-lock DDL | ops | Apply `0055_payroll_period_inputs_locked.sql` when migrate is approved |

## 4. Verify loops

| Loop | Command |
| --- | --- |
| Inner | `pnpm check:payroll` |
| Package | `pnpm --filter @afenda/payroll test` |
| Outer | `REQUIRE_DATABASE_TESTS=1 pnpm test:payroll:parity` |
| Coupling | `pnpm governance:lifecycle-coupling` |

Same-revision command evidence: [baseline-verification.md](./baseline-verification.md).
