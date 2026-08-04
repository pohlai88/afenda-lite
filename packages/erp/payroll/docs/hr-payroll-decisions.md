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

## A1 evidence

- Manifest: `packages/erp/payroll/src/composition/module.manifest.ts` → `lifecycle: "scaffolded"`
- Gate: `scripts/governance-lifecycle-coupling.mjs` (wired from `scripts/governance-packages.mjs`)
- Commit: `5f08676b`

## C2 ordering (closed alongside this register)

Wire `contractVersion` is the schema literal (`hr.payroll-handoff.v1`). Supersession ordering uses payload `sourceVersion` axes. Stale or equal revisions under a new idempotency key return `CONFLICT` ("Stale workforce handoff revision is rejected"). Evidence: `src/features/workforce-ingress/handoff-revision.ts` + `__tests__/workforce-ingest.test.ts`.

## Open-decision rule

Do not promote either module to `active`, claim enterprise seal, or enable production statutory calculators while A2–A4 remain OPEN.
