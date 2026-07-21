/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_REVERSAL = "reversal" as const;
export type PayrollReversalAggregate = typeof PAYROLL_AGGREGATE_REVERSAL;
