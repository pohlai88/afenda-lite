/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_PAYMENT_RECONCILIATION =
	"payment-reconciliation" as const;
export type PayrollPaymentReconciliationAggregate =
	typeof PAYROLL_AGGREGATE_PAYMENT_RECONCILIATION;
