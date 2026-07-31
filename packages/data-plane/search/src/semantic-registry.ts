export const SEARCH_ENTITIES = Object.freeze({
	humanResources: Object.freeze({ employee: "human_resources_employee" }),
	identity: Object.freeze({ invite: "invite", member: "member" }),
	masterData: Object.freeze({
		item: "md_item",
		itemGroup: "md_item_group",
		organizationDimension: "md_organization_dimension",
		party: "md_party",
		paymentTerm: "md_payment_term",
		warehouse: "md_warehouse",
	}),
} as const);

export const SEARCH_ENTITY_VALUES = Object.freeze([
	SEARCH_ENTITIES.identity.member,
	SEARCH_ENTITIES.identity.invite,
	SEARCH_ENTITIES.humanResources.employee,
	SEARCH_ENTITIES.masterData.party,
	SEARCH_ENTITIES.masterData.item,
	SEARCH_ENTITIES.masterData.itemGroup,
	SEARCH_ENTITIES.masterData.warehouse,
	SEARCH_ENTITIES.masterData.organizationDimension,
	SEARCH_ENTITIES.masterData.paymentTerm,
] as const);

export const SEARCH_MASTER_DATA_ENTITY_VALUES = Object.freeze([
	SEARCH_ENTITIES.masterData.party,
	SEARCH_ENTITIES.masterData.item,
	SEARCH_ENTITIES.masterData.itemGroup,
	SEARCH_ENTITIES.masterData.warehouse,
	SEARCH_ENTITIES.masterData.organizationDimension,
	SEARCH_ENTITIES.masterData.paymentTerm,
] as const);

export type SearchEntity = (typeof SEARCH_ENTITY_VALUES)[number];

export const SEARCH_DOCUMENT_POLICY = Object.freeze({
	descriptionMaxLength: 4000,
	documentIdMaxLength: 256,
	entityMaxLength: 128,
	queryMaxLength: 500,
	titleMaxLength: 500,
	urlMaxLength: 2048,
});

export const SEARCH_RANKING_POLICY = Object.freeze({
	descriptionWeight: 0.4,
	dictionary: "english" as const,
	method: "cover-density" as const,
	titleWeight: 1,
});

export const SEARCH_LIFECYCLE_POLICY = Object.freeze({
	batchLimit: 1000,
	defaultLimit: 20,
	maxLimit: 100,
	mode: "derived-projection" as const,
});

export const SEARCH_ENTITY_REGISTRY = Object.freeze(
	Object.fromEntries(
		SEARCH_ENTITY_VALUES.map((entity) => [
			entity,
			Object.freeze({
				entity,
				lifecycle: SEARCH_LIFECYCLE_POLICY.mode,
				ranking: SEARCH_RANKING_POLICY,
			}),
		]),
	) as Record<
		SearchEntity,
		Readonly<{
			entity: SearchEntity;
			lifecycle: typeof SEARCH_LIFECYCLE_POLICY.mode;
			ranking: typeof SEARCH_RANKING_POLICY;
		}>
	>,
);

export function isSearchEntity(value: string): value is SearchEntity {
	return Object.hasOwn(SEARCH_ENTITY_REGISTRY, value);
}
