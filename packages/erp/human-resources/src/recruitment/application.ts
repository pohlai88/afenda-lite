/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_APPLICATION = "application" as const;
export type HumanResourcesApplicationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_APPLICATION;
