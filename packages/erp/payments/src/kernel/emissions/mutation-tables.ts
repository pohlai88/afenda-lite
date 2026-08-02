/** Aggregates and mutation tables owned by @afenda/payments. */
export const PAYMENTS_AGGREGATES = [
	"payment_account",
	"payment",
	"payment_allocation",
	"payment_reversal",
] as const;

export const PAYMENTS_MUTATION_TABLES = [
	"payment_account",
	"payment",
	"payment_allocation",
	"payment_reversal",
] as const;
