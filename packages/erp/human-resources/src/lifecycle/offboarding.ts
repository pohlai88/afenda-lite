/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_OFFBOARDING = "offboarding" as const;
export type HumanResourcesOffboardingAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_OFFBOARDING;
