/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_SHIFT = "shift" as const;
export type HumanResourcesShiftAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_SHIFT;
