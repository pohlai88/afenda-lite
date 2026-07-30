declare const payrollReconciliationStoreBrand: unique symbol;

/**
 * Persistence contract for reconciliation — payroll, payment, accounting reconciliation.
 * Slice of `PayrollStore`. Persistence only; orchestration stays in commands.
 */
export interface PayrollReconciliationStore {
	[payrollReconciliationStoreBrand]?: never;
}
