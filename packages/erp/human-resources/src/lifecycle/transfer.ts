/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_TRANSFER = "transfer" as const;
export type HumanResourcesTransferAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TRANSFER;
