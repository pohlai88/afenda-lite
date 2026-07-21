/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_PAY_GROUP = "pay-group" as const;
export type PayrollPayGroupAggregate = typeof PAYROLL_AGGREGATE_PAY_GROUP;
