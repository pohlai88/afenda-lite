/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_RECURRING_EARNING = "recurring-earning" as const;
export type PayrollRecurringEarningAggregate =
	typeof PAYROLL_AGGREGATE_RECURRING_EARNING;
