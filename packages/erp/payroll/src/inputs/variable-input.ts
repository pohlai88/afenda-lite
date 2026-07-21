/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_VARIABLE_INPUT = "variable-input" as const;
export type PayrollVariableInputAggregate =
	typeof PAYROLL_AGGREGATE_VARIABLE_INPUT;
