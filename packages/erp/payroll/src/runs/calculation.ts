/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_CALCULATION = "calculation" as const;
export type PayrollCalculationAggregate = typeof PAYROLL_AGGREGATE_CALCULATION;
