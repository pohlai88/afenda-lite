/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_ENTITLEMENT = "entitlement" as const;
export type HumanResourcesEntitlementAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ENTITLEMENT;
