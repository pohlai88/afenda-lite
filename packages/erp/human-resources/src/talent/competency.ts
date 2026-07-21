/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_COMPETENCY = "competency" as const;
export type HumanResourcesCompetencyAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPETENCY;
