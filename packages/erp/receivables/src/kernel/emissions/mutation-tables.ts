/** Aggregates and mutation tables owned by @afenda/receivables. */
export const RECEIVABLES_AGGREGATES = [
	"sales_invoice",
	"sales_credit_note",
	"customer_allocation",
	"customer_balance_projection",
] as const;

export const RECEIVABLES_MUTATION_TABLES = [
	"sales_invoice",
	"sales_invoice_line",
	"sales_credit_note",
	"customer_allocation",
	"customer_balance_projection",
] as const;
