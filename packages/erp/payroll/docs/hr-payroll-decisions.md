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
| D7 | HR restriction operation | **CLOSED** | `restrictEmployeeData` / `liftEmployeeDataRestriction` ship with export exclusion and anonymization block; remaining D7 rows are docs/promotion (cut-off, termination contract, breaking-change policy, PRODUCTION_READINESS already present). | 2026-08-05 | Human Resources |
| B3 | Capability signature | **CLOSED** | Composition requires clock, currency, and statutory capabilities; production factories exported; calculator uses currency payable scale and statutory registry approval. | 2026-08-05 | Payroll |

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
