/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_PAYROLL_RESULT = "payroll-result" as const;
export type PayrollPayrollResultAggregate =
	typeof PAYROLL_AGGREGATE_PAYROLL_RESULT;
