# Payroll production-readiness control

The Payroll semantic kernel is code-complete through calculation, finalization,
payslip/reconciliation, and compensating reversal. Production activation of a
real jurisdiction remains fail-closed until its statutory calculator carries a
qualified reviewer approval in the canonical calculator registry.

## Controls

- Every root command and query is mapped to an explicit Payroll permission.
- Own-payslip and all-payslip access use separate permissions; own access derives
  employee identity from the workforce port and accepts no employee selector.
  Privacy admin ops reuse `payroll.payslip.read-all`; subject-access DSAR reuses
  `payroll.payslip.read-own`. Restriction excludes rows from reads and exports;
  `expirePayrollRetention` marks eligibility only and never erases evidence.
- Structured operation telemetry contains only operation, outcome, error code,
  duration, and one-way organization/actor tokens. Amounts, employee IDs, tax
  data, bank data, inputs, outputs, and payslip content are prohibited.
- Run creation, finalization, reversal, audit evidence, and outbox facts use
  transaction-owned idempotency keys. Output replacement locks and rechecks the
  run before mutation. Reversal persists a request fingerprint and emits only a
  bounded reason code; detailed operator text stays in Payroll audit evidence.
  Reconciliation derives expected totals and tolerance policy from finalized
  evidence and owns versioned discrepancy resolution.
- Query indexes cover run/employee result retrieval, pending payslip work,
  adjustment lineage, and downstream reconciliation references.

## Migration recovery

Migration `0046_payroll_outputs_reconciliation_adjustments.sql` refuses the
semantic cutover if any retired scaffold table contains data. Before production
data exists, rollback means dropping only the columns, indexes, and constraints
introduced by that migration. After data exists, rollback is prohibited: ship a
new additive forward-fix migration, preserve all original payroll evidence, and
reconcile its execution in the migration ledger.

## Disaster-recovery and reproducibility drill

1. Restore a database snapshot into an isolated recovery branch.
2. Verify migration-ledger parity and tenant-root constraints.
3. Recompute every restored calculated/finalized run snapshot hash and compare it
   with its sealed run hash.
4. Verify each finalized run has its audit fact, lifecycle events, and one pending
   or completed payslip publication record per run employee.
5. Replay pending outbox facts by their deduplication keys; never reconstruct
   payment or posting meaning outside Payroll.
6. Re-run payment/accounting reconciliation and record discrepancies instead of
   editing finalized results.

## External acceptance still required

A2 sourcing is closed as **build in-house**. MY/VN calculators
(`my.*.v1`, `vn.*.v1`) are registered as `awaiting_review` with citations in
`src/features/statutory-rules/statutory-source-ledger.ts`. Rates belong in
reviewed rule-pack `configJson`, not calculator source. `synth.v1` remains
`synthetic_only`. No production jurisdiction may be activated until a qualified
payroll/tax reviewer sets `productionApproval: approved` (reviewedBy,
reviewedAt, jurisdictions) for the versioned calculator, its effective-dated
pack, fixtures, and rounding policy. The production calculator fails closed
when a statutory rule references anything without that approval.

## Phase E evidence (engineering)

| Artifact | Path |
| --- | --- |
| Ops runbooks | [docs/ops-runbooks.md](./docs/ops-runbooks.md) |
| Sign-off checklist | [docs/phase-e-signoff.md](./docs/phase-e-signoff.md) |
| Decisions register | [docs/hr-payroll-decisions.md](./docs/hr-payroll-decisions.md) |

Promotion still requires pack reviewer approval (E4), counsel retention
citations (E5), ops-gated DDL (E9 — `0051`–`0056` unapplied; `0049` preview-only),
green `governance:packages` (E10), and independent review (E11). The Phase E
evidence recorded so far is local command output only: GitHub Actions billing
is locked, so no CI run exists for this revision, and the Drizzle/Neon parity
lane self-skips without `DATABASE_URL` + `REQUIRE_DATABASE_TESTS=1`.
Publishing this pack does not move `lifecycle` off `scaffolded`.
