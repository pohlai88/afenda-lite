import { type SearchEntity, search } from "@afenda/search";

const entity: SearchEntity = search.entities.masterData.party;
export const write = search.documents.upsert({
	organizationId: "org-1",
	entity,
	documentId: "party-1",
	title: "Afenda",
});
export const results = search.query({
	organizationId: "org-1",
	query: "Afenda",
	entity,
});

// @ts-expect-error stores cannot be injected into the production capability
search.documents.upsert({}, { store: {} });

// @ts-expect-error consumers cannot register arbitrary entities
export const invalidEntity: SearchEntity = "consumer_owned_entity";

// @ts-expect-error lifecycle internals are not root capabilities
search.createStore();
