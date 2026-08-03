/** Aggregates and mutation tables owned by @afenda/receiving. */
export const RECEIVING_AGGREGATES = [
	"goods_receipt",
	"receiving_discrepancy",
] as const;

export const RECEIVING_MUTATION_TABLES = [
	"goods_receipt",
	"goods_receipt_line",
	"receiving_discrepancy",
] as const;
