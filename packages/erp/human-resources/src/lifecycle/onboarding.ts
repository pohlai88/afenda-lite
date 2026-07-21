/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_ONBOARDING = "onboarding" as const;
export type HumanResourcesOnboardingAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ONBOARDING;
