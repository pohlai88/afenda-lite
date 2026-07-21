/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_EMPLOYER_CONTRIBUTION =
	"employer-contribution" as const;
export type PayrollEmployerContributionAggregate =
	typeof PAYROLL_AGGREGATE_EMPLOYER_CONTRIBUTION;
