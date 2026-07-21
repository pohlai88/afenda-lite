/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_CONFIRMATION = "confirmation" as const;
export type HumanResourcesConfirmationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CONFIRMATION;
