/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_TERMINATION = "termination" as const;
export type HumanResourcesTerminationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TERMINATION;
