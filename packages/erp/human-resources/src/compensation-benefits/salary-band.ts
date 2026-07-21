/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_SALARY_BAND = "salary-band" as const;
export type HumanResourcesSalaryBandAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_SALARY_BAND;
