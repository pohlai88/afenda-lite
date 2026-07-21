/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_PAYSLIP = "payslip" as const;
export type PayrollPayslipAggregate = typeof PAYROLL_AGGREGATE_PAYSLIP;
