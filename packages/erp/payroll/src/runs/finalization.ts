/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_FINALIZATION = "finalization" as const;
export type PayrollFinalizationAggregate =
	typeof PAYROLL_AGGREGATE_FINALIZATION;
