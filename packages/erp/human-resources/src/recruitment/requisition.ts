/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_REQUISITION = "requisition" as const;
export type HumanResourcesRequisitionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REQUISITION;
