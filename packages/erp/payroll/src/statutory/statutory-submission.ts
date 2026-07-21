/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_STATUTORY_SUBMISSION =
	"statutory-submission" as const;
export type PayrollStatutorySubmissionAggregate =
	typeof PAYROLL_AGGREGATE_STATUTORY_SUBMISSION;
