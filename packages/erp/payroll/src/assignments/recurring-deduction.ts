/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_RECURRING_DEDUCTION =
	"recurring-deduction" as const;
export type PayrollRecurringDeductionAggregate =
	typeof PAYROLL_AGGREGATE_RECURRING_DEDUCTION;
