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
| Cut-off semantics documented and tested for payroll delivery windows — **partially met** | D7 / C3 | Documented in [README § Handoff contract: cut-off and termination](./README.md#handoff-contract-cut-off-and-termination): current period-binding, the enforced absence of any period/run-status check in `acceptWorkforceHandoff`, and the C3/D3 target. This row's own wording requires "contract **+ tests**" — no test exists asserting cut-off behavior, because there is no cut-off behavior to assert yet: ingest has no period-lock check to test. (Calculation does consume the accepted-handoff ledger — the default `PayrollWorkforceInputPort` reads it effective-dated — but acceptance itself remains period-insensitive.) Missing evidence: a Payroll-side `workforce-ingress` test proving period-status-aware acceptance/rejection once C3 enforcement (the `inputs_locked` state) lands — that enforcement is Payroll's, not HR's, to build, and remains open |
| Mid-period termination contract documented for handoff facts — **partially met** | D7 / C6 | Documented in [README § Handoff contract: cut-off and termination](./README.md#handoff-contract-cut-off-and-termination): the `hr_offboarding_payroll_handoff` fact shape, how termination reaches Payroll via `employmentStatus` on the ordinary handoff, and the C6 exception rule mapped onto Payroll's real `recordPayrollException` / `hasBlockingPayrollExceptions` finalize gate. This row's own wording requires "termination-as-fact semantics **+ tests**" — no test exists proving a late termination raises a payroll exception, because no code path currently calls `recordPayrollException` from HR's termination/offboarding path. Missing evidence: an integration test (cross-package, likely `apps/web` composition) wiring a late termination fact to an automatic blocking exception — not yet built |
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
