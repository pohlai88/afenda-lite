/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_LEAVE_POLICY = "leave-policy" as const;
export type HumanResourcesLeavePolicyAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEAVE_POLICY;
