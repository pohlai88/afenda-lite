/** Aggregates and mutation tables owned by @afenda/payables. */
export const PAYABLES_AGGREGATES = [
	"supplier_invoice",
	"supplier_allocation",
	"supplier_balance_projection",
	"three_way_match_result",
] as const;

export const PAYABLES_MUTATION_TABLES = [
	"supplier_invoice",
	"supplier_invoice_line",
	"supplier_credit_note",
	"supplier_credit_note_line",
	"supplier_allocation",
	"supplier_balance_projection",
	"three_way_match_result",
] as const;
