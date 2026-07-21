/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_PAYMENT_INSTRUCTION =
	"payment-instruction" as const;
export type PayrollPaymentInstructionAggregate =
	typeof PAYROLL_AGGREGATE_PAYMENT_INSTRUCTION;
