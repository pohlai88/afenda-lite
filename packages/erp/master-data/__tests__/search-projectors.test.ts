import { randomUUID } from "node:crypto";

import type { SearchCapability } from "@afenda/search";
import { searchTesting } from "@afenda/search/testing";
import { describe, expect, it } from "vitest";

import { MASTER_SEARCH_ENTITY, rebuildMasterDataSearchIndex } from "../src";
import { createItem } from "../src/capabilities/core-organization-masters/item";
import {
	activateItemGroup,
	createItemGroup,
} from "../src/capabilities/core-organization-masters/item-group";
import {
	archiveOrganizationDimension,
	createOrganizationDimension,
} from "../src/capabilities/core-organization-masters/organization-dimension";
import {
	activateParty,
	createParty,
	retireParty,
} from "../src/capabilities/core-organization-masters/party";
import { createPaymentTerm } from "../src/capabilities/core-organization-masters/payment-term";
import { createMemoryOrganizationDimensionStore } from "../src/capabilities/core-organization-masters/testing-organization-dimension-store";
import { createWarehouse } from "../src/capabilities/core-organization-masters/warehouse";
import {
	activatePartyRole,
	createPartyRole,
} from "../src/capabilities/extensions";
import { resolveAsync } from "../src/resolve-async";
import { createMasterDataTestHarness } from "./helpers/harness";
import { approvedActivatePartyChangeRequest } from "./helpers/mdg-approve";

function ctx(organizationId = "org-search-a") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

function failingSearchCapability(): SearchCapability {
	const base = searchTesting.createMemory();
	return {
		...base,
		documents: {
			...base.documents,
			upsert: () =>
				resolveAsync(() => {
					throw new Error("search unavailable");
				}),
		},
	};
}

describe("@afenda/master-data search projectors", () => {
	it("does not turn a committed party mutation into a failure when search throws", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const result = await createParty(
			{
				...ctx(),
				code: "SRCH-FAIL",
				name: "Committed Party",
				partyKind: "organization",
			},
			{ ...harnessOptions, searchCapability: failingSearchCapability() },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const persisted = await harnessOptions.store.getPartyById(
			result.data.organizationId,
			result.data.id,
		);
		expect(persisted.ok).toBe(true);
		if (persisted.ok) {
			expect(persisted.data?.id).toBe(result.data.id);
		}
	});

	it("does not turn a committed item-group mutation into a failure when search throws", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const result = await createItemGroup(
			{ ...ctx(), code: "GROUP-FAIL", name: "Committed Group" },
			{ ...harnessOptions, searchCapability: failingSearchCapability() },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const persisted = await harnessOptions.store.getItemGroupById(
			result.data.organizationId,
			result.data.id,
		);
		expect(persisted.ok).toBe(true);
		if (persisted.ok) {
			expect(persisted.data?.id).toBe(result.data.id);
		}
	});

	it("does not turn a committed item mutation into a failure when search throws", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const group = await createItemGroup(
			{ ...ctx(), code: "ITEM-SEARCH", name: "Item search group" },
			harnessOptions,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}
		const activeGroup = await activateItemGroup(
			{ ...ctx(), id: group.data.id, expectedVersion: group.data.version },
			harnessOptions,
		);
		expect(activeGroup.ok).toBe(true);
		if (!activeGroup.ok) {
			return;
		}
		const result = await createItem(
			{
				...ctx(),
				code: "ITEM-SEARCH-FAIL",
				name: "Committed item",
				itemType: "stock",
				baseUomId: "b1000000-0000-4000-8000-000000000001",
				itemGroupId: activeGroup.data.id,
			},
			{ ...harnessOptions, searchCapability: failingSearchCapability() },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const persisted = await harnessOptions.store.getItemById(
			result.data.organizationId,
			result.data.id,
		);
		expect(persisted.ok).toBe(true);
		if (persisted.ok) {
			expect(persisted.data?.id).toBe(result.data.id);
		}
	});

	it("does not turn a committed warehouse mutation into a failure when search throws", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const result = await createWarehouse(
			{
				...ctx(),
				code: "WAREHOUSE-SEARCH-FAIL",
				name: "Committed warehouse",
				locationType: "warehouse",
			},
			{ ...harnessOptions, searchCapability: failingSearchCapability() },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const persisted = await harnessOptions.store.getWarehouseById(
			result.data.organizationId,
			result.data.id,
		);
		expect(persisted.ok).toBe(true);
		if (persisted.ok) {
			expect(persisted.data?.id).toBe(result.data.id);
		}
	});

	it("does not turn a committed payment-term mutation into a failure when search throws", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const result = await createPaymentTerm(
			{
				...ctx(),
				code: "TERM-SEARCH-FAIL",
				name: "Committed payment term",
				netDays: 30,
			},
			{ ...harnessOptions, searchCapability: failingSearchCapability() },
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		const persisted = await harnessOptions.store.getPaymentTermById(
			result.data.organizationId,
			result.data.id,
		);
		expect(persisted.ok).toBe(true);
		if (persisted.ok) {
			expect(persisted.data?.id).toBe(result.data.id);
		}
	});

	it("upserts md_party on create and removes on retire", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const searchCapability = searchTesting.createMemory();
		const options = { ...harnessOptions, searchCapability };

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

		const listed = await searchCapability.documents.listIds({
			organizationId: "org-search-a",
			entity: MASTER_SEARCH_ENTITY.party,
		});
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data).toContain(party.data.id);
		const partyHits = await searchCapability.query({
			organizationId: "org-search-a",
			query: "Searchable Party",
			entity: MASTER_SEARCH_ENTITY.party,
		});
		expect(partyHits.ok).toBe(true);
		if (!partyHits.ok) {
			return;
		}
		const partyDocument = partyHits.data.find(
			(hit) => hit.documentId === party.data.id,
		);
		expect(partyDocument?.metadata).toMatchObject({
			organizationId: party.data.organizationId,
			entityType: MASTER_SEARCH_ENTITY.party,
			entityId: party.data.id,
			code: party.data.code,
			normalizedCode: party.data.normalizedCode,
			status: party.data.status,
			version: party.data.version,
		});
		expect(
			Number.isFinite(Date.parse(String(partyDocument?.metadata?.projectedAt))),
		).toBe(true);

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

		const afterRetire = await searchCapability.documents.listIds({
			organizationId: "org-search-a",
			entity: MASTER_SEARCH_ENTITY.party,
		});
		expect(afterRetire.ok).toBe(true);
		if (!afterRetire.ok) {
			return;
		}
		expect(afterRetire.data).not.toContain(party.data.id);
	});

	it("rebuilds from SSOT idempotently and isolates orgs", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const searchCapability = searchTesting.createMemory();
		const options = { ...harnessOptions, searchCapability };

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
		if (!(a.ok && b.ok)) {
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

		const hits = await searchCapability.query({
			organizationId: "org-a",
			query: "Org A",
			entity: MASTER_SEARCH_ENTITY.party,
		});
		expect(hits.ok).toBe(true);
		if (!hits.ok) {
			return;
		}
		expect(hits.data.every((hit) => hit.organizationId === "org-a")).toBe(true);
		expect(hits.data.some((hit) => hit.documentId === a.data.id)).toBe(true);
		expect(hits.data.some((hit) => hit.documentId === b.data.id)).toBe(false);
	});

	it("rebuilds organization-dimension search documents and prunes archived dimensions", async () => {
		const { options: harnessOptions } = createMasterDataTestHarness();
		const organizationDimensionStore = createMemoryOrganizationDimensionStore();
		const searchCapability = searchTesting.createMemory();
		const options = {
			...harnessOptions,
			organizationDimensionStore,
			searchCapability,
		};
		const dimensionOptions = {
			store: organizationDimensionStore,
			authorization: harnessOptions.authorization,
		};

		const dimension = await createOrganizationDimension(
			{
				...ctx("org-dim-search"),
				kind: "cost_center",
				key: "CC-100",
				name: "Cost Center Search",
				effectiveFrom: "2026-01-01",
			},
			dimensionOptions,
		);
		expect(dimension.ok).toBe(true);
		if (!dimension.ok) {
			return;
		}

		const rebuilt = await rebuildMasterDataSearchIndex(
			{
				organizationId: "org-dim-search",
				actorUserId: "user-1",
				entity: MASTER_SEARCH_ENTITY.organizationDimension,
			},
			options,
		);
		expect(rebuilt.ok).toBe(true);
		if (!rebuilt.ok) {
			return;
		}
		expect(rebuilt.data.upserted).toBe(1);
		expect(rebuilt.data.entities).toEqual([
			MASTER_SEARCH_ENTITY.organizationDimension,
		]);

		const hits = await searchCapability.query({
			organizationId: "org-dim-search",
			query: "Cost Center Search",
			entity: MASTER_SEARCH_ENTITY.organizationDimension,
		});
		expect(hits.ok).toBe(true);
		if (!hits.ok) {
			return;
		}
		const document = hits.data.find(
			(hit) => hit.documentId === dimension.data.id,
		);
		expect(document?.metadata).toMatchObject({
			organizationId: "org-dim-search",
			entityType: MASTER_SEARCH_ENTITY.organizationDimension,
			entityId: dimension.data.id,
			code: "CC-100",
			normalizedCode: "CC-100",
			status: "active",
			version: 1,
			dimensionKind: "cost_center",
		});

		const archived = await archiveOrganizationDimension(
			{
				...ctx("org-dim-search"),
				id: dimension.data.id,
				expectedVersion: dimension.data.version,
			},
			dimensionOptions,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) {
			return;
		}

		const pruned = await rebuildMasterDataSearchIndex(
			{
				organizationId: "org-dim-search",
				actorUserId: "user-1",
				entity: MASTER_SEARCH_ENTITY.organizationDimension,
			},
			options,
		);
		expect(pruned.ok).toBe(true);
		if (!pruned.ok) {
			return;
		}
		expect(pruned.data.upserted).toBe(0);
		expect(pruned.data.pruned).toBe(1);
	});
});
