/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_COMPLETION = "completion" as const;
export type HumanResourcesCompletionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPLETION;
