/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_EMPLOYEE_CONTRIBUTION =
	"employee-contribution" as const;
export type PayrollEmployeeContributionAggregate =
	typeof PAYROLL_AGGREGATE_EMPLOYEE_CONTRIBUTION;
