/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_PAYROLL_RECONCILIATION =
	"payroll-reconciliation" as const;
export type PayrollPayrollReconciliationAggregate =
	typeof PAYROLL_AGGREGATE_PAYROLL_RECONCILIATION;
