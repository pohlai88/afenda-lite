# Payroll production-readiness control

The Payroll semantic kernel is code-complete through calculation, finalization,
payslip/reconciliation, and compensating reversal. Production activation of a
real jurisdiction remains fail-closed until its statutory calculator carries a
qualified reviewer approval in the canonical calculator registry.

## Controls

- Every root command and query is mapped to an explicit Payroll permission.
- Own-payslip and all-payslip access use separate permissions; own access derives
  employee identity from the workforce port and accepts no employee selector.
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

`synth.v1` is synthetic test logic and is explicitly marked `synthetic_only`.
No production jurisdiction may be activated until qualified payroll/tax reviewers
approve a versioned calculator, its effective dates, fixtures, and rounding
policy. The production calculator fails closed when a statutory rule references
anything without that approval.
