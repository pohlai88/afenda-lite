export const MASTER_DATA_AGGREGATE_TYPES = [
	"party",
	"item",
	"warehouse",
	"organization_dimension",
	"item_group",
	"payment_term",
	"tax_registration",
	"item_template",
	"item_variant",
	"change_request",
	"import_batch",
	"import_row",
] as const;

export type MasterDataAggregateType =
	(typeof MASTER_DATA_AGGREGATE_TYPES)[number];

const MASTER_DATA_AGGREGATE_TYPE_SET: ReadonlySet<string> = new Set(
	MASTER_DATA_AGGREGATE_TYPES,
);

export function isMasterDataAggregateType(
	value: string,
): value is MasterDataAggregateType {
	return MASTER_DATA_AGGREGATE_TYPE_SET.has(value);
}
