/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_LEAVE_ADJUSTMENT =
	"leave-adjustment" as const;
export type HumanResourcesLeaveAdjustmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEAVE_ADJUSTMENT;
