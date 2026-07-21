/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_OFFER = "offer" as const;
export type HumanResourcesOfferAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_OFFER;
