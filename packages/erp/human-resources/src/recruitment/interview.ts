/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_INTERVIEW = "interview" as const;
export type HumanResourcesInterviewAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_INTERVIEW;
