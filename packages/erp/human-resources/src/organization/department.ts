/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_DEPARTMENT = "department" as const;
export type HumanResourcesDepartmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_DEPARTMENT;
