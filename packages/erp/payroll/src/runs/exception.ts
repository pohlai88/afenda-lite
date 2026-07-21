/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_EXCEPTION = "exception" as const;
export type PayrollExceptionAggregate = typeof PAYROLL_AGGREGATE_EXCEPTION;
