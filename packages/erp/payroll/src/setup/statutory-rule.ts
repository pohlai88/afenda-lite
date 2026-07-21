/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_STATUTORY_RULE = "statutory-rule" as const;
export type PayrollStatutoryRuleAggregate =
	typeof PAYROLL_AGGREGATE_STATUTORY_RULE;
