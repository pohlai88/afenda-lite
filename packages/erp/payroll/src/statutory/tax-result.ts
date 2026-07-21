/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_TAX_RESULT = "tax-result" as const;
export type PayrollTaxResultAggregate = typeof PAYROLL_AGGREGATE_TAX_RESULT;
