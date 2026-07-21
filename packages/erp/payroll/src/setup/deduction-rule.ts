/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_DEDUCTION_RULE = "deduction-rule" as const;
export type PayrollDeductionRuleAggregate =
	typeof PAYROLL_AGGREGATE_DEDUCTION_RULE;
