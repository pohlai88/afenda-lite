# HR ↔ Payroll decisions register

**Scope:** `@afenda/human-resources` and `@afenda/payroll`  
**Closure guideline:** [docs/erp/hr-payroll-bridging.md](../../../docs/erp/hr-payroll-bridging.md)  
**Placement:** package-local under `packages/erp/payroll/docs/` (not a `decisions/` directory).

| ID | Topic | Status | Decision | Date | Owner |
| --- | --- | --- | --- | --- | --- |
| A1 | Lifecycle coupling | **CLOSED** | Demote Payroll to `lifecycle: "scaffolded"` until HR promotion evidence exists. Enforce with `pnpm governance:packages` → `governance-lifecycle-coupling.mjs` (active module must not require a scaffolded module). | 2026-08-05 | Payroll / platform governance |
| A2 | Statutory calculator sourcing | OPEN | Choose build / vendor table / rates feed per MY and VN instrument; record authoritative citation before production activation. | — | Pending product + finance |
| A3 | Retention vs privacy erasure | OPEN | Interim engineering posture: Payroll evidence uses **restriction**, not cascade erasure from HR privacy deletes, until counsel cites statutory retention clocks. | — | Pending counsel |
| A4 | Settlement authority | OPEN | Interim engineering posture: payroll reversal only while disbursement is un-settled; settled recovery is Accounting clawback. Requires settlement-ingress (D2). | — | Pending Payments / Accounting |
| C9 | Finalize segregation of duties | **CLOSED** | Maker-checker is calculate-actor ≠ finalize-actor (`run.updatedBy` vs finalize `actorUserId` → `CONFLICT`). No distinct `payroll.run.approve` yet; break-glass lands with the approval-workflow slice. | 2026-08-05 | Payroll |
| B5 | Neon parity loop | **PARTIAL** | `pnpm test:payroll:parity` lane + failure-injection helpers/tests shipped. Finalize atomicity/concurrency green on Neon; workforce-ingress Neon cases skip until `payroll_accepted_handoff` is migrated on the preview target. | 2026-08-05 | Payroll |
| B2 | Governance fixtures | **CLOSED** | Four fixtures + `governance-fixtures.test.ts` (public-contract, registry-projection, consumer-inventory, architecture-debt). | 2026-08-05 | Payroll |
| B4 | Emission registry | **CLOSED** | `PAYROLL_EMISSION_REGISTRY` owns command→event→dispatcher mapping; manifest `events.emits` derives from it; retired `docs-V2` citation removed from `mutation-tables.ts`. | 2026-08-05 | Payroll |
| B1 | Transport docs + testing subpath | **CLOSED** | Document single push/sync-ingest transport on both READMEs; PayrollWorkforceCapability is test-only; declare @afenda/payroll/testing. | 2026-08-05 | Payroll / HR |
| B7 | Governance gates | **CLOSED** | Root scripts governance:erp-symmetry, governance:emission-drain, governance:cross-import, governance:architecture-debt chained from governance:packages. Emission-drain is a declared-debt gate until B6 drains dispatchers. | 2026-08-05 | Payroll / platform governance |
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
- Lane: `testing/vitest.payroll-parity.config.ts` · root `pnpm test:payroll:parity` · package `pnpm --filter @afenda/payroll test:parity`
- Inner loop (no Neon): `pnpm check:payroll`

## Open-decision rule

Do not promote either module to `active`, claim enterprise seal, or enable production statutory calculators while A2–A4 remain OPEN.
