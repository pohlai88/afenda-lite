# Human Resources production-readiness control

Human Resources is production-shaped for handoff transport, privacy legal-hold
and restriction surfaces, and package evidence loops, but the module lifecycle
remains
`scaffolded` with `activationMode: "organization_toggle"`. Green package tests
and a living feature tree do **not** promote the module to `active` or authorize
enterprise launch.

## Controls present today

- Canonical operation and emission registries decide authorization, audit,
  transaction, idempotency, and event behavior.
- Approved payroll handoff delivery uses bounded retry
  (`recoverPendingPayrollDeliveries` + reliability worker) and atomic
  corrections (`supersedesDeliveryId` / optimistic source-version locking).
- Producer path: HR queue → synchronous Payroll ingest → optional platform event
  fan-out (see both package READMEs — bridging B1).
- Privacy feature owns field projection, retention, and deletion workflows for
  `hr_*` only; Payroll evidence is not cascade-erased from HR privacy deletes
  (bridging A3 / C7 — counsel clocks still open).
- Privacy feature carries an audited restriction path distinct from erasure:
  `restrictEmployeeData` / `liftEmployeeDataRestriction`
  (`human-resources.privacy.restriction.place` /
  `human-resources.privacy.restriction.lift`, gated by the existing
  `human-resources.privacy.legal-hold.manage` permission). A restricted
  subject's rows survive — export is excluded (`CONFLICT`) and anonymization
  is blocked — until the restriction is lifted through the audited command
  (bridging D7 / A3 / C7).
- Contract fixtures (public-contract, registry-projection, consumer-inventory,
  architecture-debt) and the HR parity loop exist under package tests.
- Package lifecycle coupling: an `active` module may not require a `scaffolded`
  module (`pnpm governance:lifecycle-coupling`).

## Promotion criteria (`scaffolded` → `active`)

Each criterion cites [hr-payroll-bridging.md](../../../docs/erp/hr-payroll-bridging.md).
This list is a gate statement, **not** a claim that the gates are closed.

| Criterion | Bridging | Required evidence |
| --- | --- | --- |
| Restriction operation for privacy/retention interplay with Payroll — **met (HR side)** | D7 / A3 / C7 | `restrictEmployeeData` / `liftEmployeeDataRestriction` ship (export exclusion + anonymization block while active, registry/fixture-tested). Counsel retention clocks (A3) are still an external legal decision, not code, and remain open |
| Cut-off semantics documented and tested for payroll delivery windows — **met (payroll enforcement)** | D7 / C3 | Documented in [README § Handoff contract: cut-off and termination](./README.md#handoff-contract-cut-off-and-termination). Payroll `lockPayrollPeriodInputs` + ingest deferral after `inputs_locked` / `closed` are covered by `packages/erp/payroll/__tests__/workforce-ingest.test.ts` and `payroll-setup-commands.test.ts`. HR still does not stamp `periodId`; covering-period match uses ingest `periodStart`/`periodEnd` or `effectiveDate` |
| Mid-period termination contract documented for handoff facts — **met (payroll enforcement)** | D7 / C6 | Documented in [README § Handoff contract: cut-off and termination](./README.md#handoff-contract-cut-off-and-termination). Late `notice` / `terminated` ingest after freeze accepts the fact and writes blocking `MID_PERIOD_TERMINATION` — asserted in `packages/erp/payroll/__tests__/workforce-ingest.test.ts`. HR still delivers termination only via `employmentStatus` on the ordinary handoff |
| Breaking-change policy for `public-contract.fixture.json` — **met** | D7 / Phase E | Written in [README § Fixture breaking-change policy](./README.md#fixture-breaking-change-policy): regenerate-only via the AST serializer (never hand-edit), a required consumer-impact statement checked against `consumer-inventory.fixture.json`, semver-style additive/breaking classification keyed to `comparePublicContracts`' diff codes, and same-commit consumer updates for breaking diffs per AGENTS.md's one-cutover rule |
| Lifecycle coupling honesty with Payroll | A1 | Payroll remains non-active until HR promotion evidence; coupling gate green |
| Phase E production evidence pack | Phase E | Same-revision baseline, parity, and independent readiness review |

Do not set Human Resources `lifecycle` to `active`, `preview`, `beta`, or
`production` until the owning promotion mission closes these criteria.

## External acceptance still required

Open product decisions in
[hr-payroll-decisions.md](../payroll/docs/hr-payroll-decisions.md) (A2–A4) block
enterprise seal for the HR ↔ Payroll boundary even after package-local
engineering gates are green. Statutory calculator sourcing, retention legal
basis, and settlement authority require named owners outside this package.
