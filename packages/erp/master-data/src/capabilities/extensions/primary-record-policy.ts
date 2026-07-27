/**
 * Primary/default extension records use replacement semantics package-wide.
 *
 * A command that selects a new primary demotes the current primary in the
 * same mutation. Production stores must serialize the aggregate and retain a
 * partial unique index as the final concurrent-write authority.
 *
 * Primary scopes permit zero or one primary record unless a domain-specific
 * invariant explicitly requires exactly one.
 */
export const PRIMARY_RECORD_REPLACEMENT_POLICY = "atomic_demotion" as const;

export const PRIMARY_RECORD_RESELECT_POLICY = "no_op" as const;

export const PRIMARY_RECORD_CARDINALITY_POLICY = "zero_or_one" as const;

export type PrimaryScopeField =
	| "organizationId"
	| "partyId"
	| "itemId"
	| "purpose"
	| "contactType"
	| "sourceSystem"
	| "externalIdType"
	| "uomId";

export type PrimaryRecordScopeName =
	| "partyAddress"
	| "partyContact"
	| "partyExternalId"
	| "itemBarcode"
	| "itemExternalId"
	| "itemDefaultPurchaseUom"
	| "itemDefaultSalesUom";

/**
 * Canonical scope keys used by both in-memory and database stores.
 *
 * Nullable scope components use null-equals-null semantics. Database indexes
 * must reproduce this behavior explicitly, for example with COALESCE or
 * equivalent NULLS NOT DISTINCT support. Item-UoM purchase and sales defaults
 * share the same item scope but are enforced by separate partial indexes.
 */
export const PRIMARY_RECORD_SCOPES = {
	partyAddress: ["organizationId", "partyId", "purpose"],
	partyContact: ["organizationId", "partyId", "contactType", "purpose"],
	partyExternalId: [
		"organizationId",
		"partyId",
		"sourceSystem",
		"externalIdType",
	],
	itemBarcode: ["organizationId", "itemId", "uomId"],
	itemExternalId: [
		"organizationId",
		"itemId",
		"sourceSystem",
		"externalIdType",
	],
	itemDefaultPurchaseUom: ["organizationId", "itemId"],
	itemDefaultSalesUom: ["organizationId", "itemId"],
} as const satisfies Record<
	PrimaryRecordScopeName,
	readonly PrimaryScopeField[]
>;

/** Null denotes one explicit scope (for example a non-UoM item barcode). */
export function isSameNullablePrimaryScope<T>(
	left: T | null,
	right: T | null,
): boolean {
	return left === right;
}
