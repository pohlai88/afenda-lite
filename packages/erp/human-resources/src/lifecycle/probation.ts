/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_PROBATION = "probation" as const;
export type HumanResourcesProbationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_PROBATION;
