/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_ASSIGNMENT = "assignment" as const;
export type HumanResourcesAssignmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ASSIGNMENT;
