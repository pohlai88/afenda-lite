import { describe, expect, it } from "vitest";

import { upsertSearchDocument } from "../src/indexer";
import { searchDocuments } from "../src/query";
import { MemorySearchStore } from "./helpers/memory-search-store";

describe("@afenda/search query", () => {
	it("scopes hits to organizationId", async () => {
		const store = new MemorySearchStore();
		await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "member",
				documentId: "u1",
				title: "Ada Lovelace",
			},
			store,
		);
		await upsertSearchDocument(
			{
				organizationId: "org_b",
				entity: "member",
				documentId: "u1",
				title: "Ada Lovelace",
			},
			store,
		);

		const hits = await searchDocuments(
			{ organizationId: "org_a", query: "Ada" },
			store,
		);
		expect(hits.ok).toBe(true);
		if (hits.ok) {
			expect(hits.data).toHaveLength(1);
			expect(hits.data[0]?.organizationId).toBe("org_a");
		}
	});

	it("filters by entity when provided", async () => {
		const store = new MemorySearchStore();
		await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "member",
				documentId: "u1",
				title: "Searchable Ada",
			},
			store,
		);
		await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "invite",
				documentId: "i1",
				title: "Searchable invite",
			},
			store,
		);

		const hits = await searchDocuments(
			{ organizationId: "org_a", query: "Searchable", entity: "member" },
			store,
		);
		expect(hits.ok).toBe(true);
		if (hits.ok) {
			expect(hits.data).toHaveLength(1);
			expect(hits.data[0]?.entity).toBe("member");
		}
	});

	it("rejects missing organizationId", async () => {
		const store = new MemorySearchStore();
		const hits = await searchDocuments({ query: "Ada" }, store);
		expect(hits.ok).toBe(false);
		if (!hits.ok) {
			expect(hits.code).toBe("BAD_REQUEST");
		}
	});
});
