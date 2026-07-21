/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_POSITION = "position" as const;
export type HumanResourcesPositionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_POSITION;
