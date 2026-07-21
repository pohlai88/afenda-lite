/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_ONE_TIME_ADJUSTMENT =
	"one-time-adjustment" as const;
export type PayrollOneTimeAdjustmentAggregate =
	typeof PAYROLL_AGGREGATE_ONE_TIME_ADJUSTMENT;
