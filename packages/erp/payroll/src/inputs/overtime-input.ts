/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_OVERTIME_INPUT = "overtime-input" as const;
export type PayrollOvertimeInputAggregate =
	typeof PAYROLL_AGGREGATE_OVERTIME_INPUT;
