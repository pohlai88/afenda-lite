/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_LEAVE_REQUEST = "leave-request" as const;
export type HumanResourcesLeaveRequestAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEAVE_REQUEST;
