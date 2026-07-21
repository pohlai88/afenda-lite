/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_ACCOUNTING_POSTING =
	"accounting-posting" as const;
export type PayrollAccountingPostingAggregate =
	typeof PAYROLL_AGGREGATE_ACCOUNTING_POSTING;
