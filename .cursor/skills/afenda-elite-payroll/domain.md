# Payroll domain invariants

- Scope every aggregate, command, query, unique key, and mutation by `organizationId`.
- Use explicit branded IDs or the repository's canonical ID types.
- Never use JavaScript floating-point numbers for monetary arithmetic. Use the repository's canonical decimal or money implementation and serialize amounts losslessly.
- Store currency explicitly. Do not assume two decimal places.
- Make rounding scale, mode, and calculation stage explicit and testable.
- Statutory, earning, and deduction rules must be effective-dated and versioned. A payroll run records the exact rule versions used.
- Calculation must be deterministic: the same employee snapshot, input snapshot, rule versions, calculation version, and rounding policy must produce the same result.
- Snapshot all external facts required to reproduce a calculated or finalized run. Do not recalculate a historical run from live HR records.
- A finalized run is immutable. Corrections use adjustments, off-cycle runs, or reversals/compensating entries; do not rewrite finalized result lines.
- Every state transition must be explicit and validated. Reject invalid transitions with stable domain error codes.
- Finalization must be idempotent and concurrency-safe.
- Blocking exceptions prevent finalization. Warnings require an explicit review policy.
- Result lines must retain provenance: source type, source reference, rule code/version, taxable/contributable flags where applicable, and calculation trace metadata.
- Employer contributions are not employee deductions and must not reduce net pay.
- Net pay and reconciliation totals must be derived from result lines, not independently editable fields.
- Reversal creates compensating domain records and integration events. It must not delete the original run or original result lines.
- Payslip publication is versioned and auditable. Published documents are content-addressed or hash-verified when supported by repository infrastructure.
- The calculation engine should remain pure. Database access, event publication, document storage, clocks, IDs, and external queries belong behind ports or orchestration services.

See also: [testing.md](testing.md) · [security.md](security.md)
