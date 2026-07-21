/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_COMPENSATION =
	"employee-compensation" as const;
export type HumanResourcesEmployeeCompensationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_COMPENSATION;
