import { randomUUID } from "node:crypto";

import { listSearchDocumentIds, searchDocuments } from "@afenda/search";
import { describe, expect, it } from "vitest";

import { MemorySearchStore } from "../../../data-plane/search/__tests__/helpers/memory-search-store";
import { activatePartyRole, createPartyRole } from "../src/extensions";
import { activateParty, createParty, retireParty } from "../src/party";
import {
	MASTER_SEARCH_ENTITY,
	rebuildMasterDataSearchIndex,
} from "../src/search-projectors";
import { createMasterDataTestHarness } from "./helpers/harness";
import { approvedActivatePartyChangeRequest } from "./helpers/mdg-approve";

function ctx(organizationId = "org-search-a") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

describe("@afenda/master-data search projectors", () => {
	it("upserts md_party on create and removes on retire", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const searchStore = new MemorySearchStore();
		const options = { ...harnessOptions, searchStore };

		const party = await createParty(
			{
				...ctx(),
				code: "SRCH1",
				name: "Searchable Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const listed = await listSearchDocumentIds(
			{
				organizationId: "org-search-a",
				entity: MASTER_SEARCH_ENTITY.party,
			},
			searchStore,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data).toContain(party.data.id);

		const role = await createPartyRole(
			{
				...ctx(),
				partyId: party.data.id,
				roleCode: "customer",
			},
			options,
		);
		expect(role.ok).toBe(true);
		if (!role.ok) {
			return;
		}

		const activatedRole = await activatePartyRole(
			{
				...ctx(),
				id: role.data.id,
				expectedVersion: role.data.version,
			},
			options,
		);
		expect(activatedRole.ok).toBe(true);

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: party.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: party.data.id,
				expectedVersion: party.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const retired = await retireParty(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);

		const afterRetire = await listSearchDocumentIds(
			{
				organizationId: "org-search-a",
				entity: MASTER_SEARCH_ENTITY.party,
			},
			searchStore,
		);
		expect(afterRetire.ok).toBe(true);
		if (!afterRetire.ok) {
			return;
		}
		expect(afterRetire.data).not.toContain(party.data.id);
	});

	it("rebuilds from SSOT idempotently and isolates orgs", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const searchStore = new MemorySearchStore();
		const options = { ...harnessOptions, searchStore };

		const a = await createParty(
			{
				...ctx("org-a"),
				code: "A1",
				name: "Org A Party",
				partyKind: "organization",
			},
			options,
		);
		const b = await createParty(
			{
				...ctx("org-b"),
				code: "B1",
				name: "Org B Party",
				partyKind: "organization",
			},
			options,
		);
		expect(a.ok && b.ok).toBe(true);
		if (!a.ok || !b.ok) {
			return;
		}

		const first = await rebuildMasterDataSearchIndex(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				entity: MASTER_SEARCH_ENTITY.party,
			},
			options,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data.upserted).toBe(1);

		const second = await rebuildMasterDataSearchIndex(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				entity: MASTER_SEARCH_ENTITY.party,
			},
			options,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		expect(second.data.upserted).toBe(1);
		expect(second.data.pruned).toBe(0);

		const hits = await searchDocuments(
			{
				organizationId: "org-a",
				query: "Org A",
				entity: MASTER_SEARCH_ENTITY.party,
			},
			searchStore,
		);
		expect(hits.ok).toBe(true);
		if (!hits.ok) {
			return;
		}
		expect(hits.data.every((hit) => hit.organizationId === "org-a")).toBe(true);
		expect(hits.data.some((hit) => hit.documentId === a.data.id)).toBe(true);
		expect(hits.data.some((hit) => hit.documentId === b.data.id)).toBe(false);
	});
});
