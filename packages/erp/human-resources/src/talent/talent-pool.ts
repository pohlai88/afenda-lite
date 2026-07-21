/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_TALENT_POOL = "talent-pool" as const;
export type HumanResourcesTalentPoolAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TALENT_POOL;
