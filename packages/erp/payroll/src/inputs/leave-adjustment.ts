/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_LEAVE_ADJUSTMENT = "leave-adjustment" as const;
export type PayrollLeaveAdjustmentAggregate =
	typeof PAYROLL_AGGREGATE_LEAVE_ADJUSTMENT;
