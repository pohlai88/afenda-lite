/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_PAYROLL_PERIOD = "payroll-period" as const;
export type PayrollPayrollPeriodAggregate =
	typeof PAYROLL_AGGREGATE_PAYROLL_PERIOD;
