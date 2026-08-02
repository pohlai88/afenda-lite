/** Aggregates and mutation tables owned by @afenda/payments. */
export const PAYMENTS_AGGREGATES = [
	"payment_account",
	"payment_method",
	"payment",
	"payment_allocation",
	"payment_deduction",
	"payment_reversal",
] as const;

export const PAYMENTS_MUTATION_TABLES = [
	"payment_account",
	"payment_method",
	"payment",
	"payment_allocation",
	"payment_deduction",
	"payment_reversal",
] as const;
