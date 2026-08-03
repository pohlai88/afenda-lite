/** Aggregates and mutation tables owned by @afenda/purchasing. */
export const PURCHASING_AGGREGATES = ["purchase_order"] as const;

export const PURCHASING_MUTATION_TABLES = [
	"purchase_order",
	"purchase_order_line",
] as const;
