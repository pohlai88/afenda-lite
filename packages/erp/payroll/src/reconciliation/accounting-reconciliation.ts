/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_ACCOUNTING_RECONCILIATION =
	"accounting-reconciliation" as const;
export type PayrollAccountingReconciliationAggregate =
	typeof PAYROLL_AGGREGATE_ACCOUNTING_RECONCILIATION;
