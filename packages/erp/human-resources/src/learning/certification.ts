/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_CERTIFICATION = "certification" as const;
export type HumanResourcesCertificationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CERTIFICATION;
