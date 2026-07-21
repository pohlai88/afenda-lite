/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_REVIEW = "review" as const;
export type HumanResourcesReviewAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REVIEW;
