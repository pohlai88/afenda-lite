/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_EMPLOYMENT = "employment" as const;
export type HumanResourcesEmploymentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYMENT;
