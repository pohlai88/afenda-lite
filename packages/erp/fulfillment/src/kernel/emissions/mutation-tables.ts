/** Aggregates and mutation tables owned by @afenda/fulfillment. */
export const FULFILLMENT_AGGREGATES = ["delivery"] as const;

export const FULFILLMENT_MUTATION_TABLES = [
	"delivery",
	"delivery_line",
	"delivery_pick",
	"delivery_pack",
	"proof_of_delivery",
] as const;
