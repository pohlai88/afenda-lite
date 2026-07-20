import { describe, expect, it } from "vitest";

import { upsertSearchDocument } from "../src/indexer";
import { listSearchDocumentIds } from "../src/list";
import { MemorySearchStore } from "./helpers/memory-search-store";

describe("@afenda/search listDocumentIds", () => {
	it("lists documentIds for org + entity only", async () => {
		const store = new MemorySearchStore();
		await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "member",
				documentId: "u1",
				title: "Ada",
			},
			store,
		);
		await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "member",
				documentId: "u2",
				title: "Grace",
			},
			store,
		);
		await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "invite",
				documentId: "i1",
				title: "Invite",
			},
			store,
		);
		await upsertSearchDocument(
			{
				organizationId: "org_b",
				entity: "member",
				documentId: "u9",
				title: "Other org",
			},
			store,
		);

		const listed = await listSearchDocumentIds(
			{ organizationId: "org_a", entity: "member" },
			store,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.toSorted()).toEqual(["u1", "u2"]);
		}
	});

	it("rejects missing organizationId", async () => {
		const store = new MemorySearchStore();
		const listed = await listSearchDocumentIds({ entity: "member" }, store);
		expect(listed.ok).toBe(false);
		if (!listed.ok) {
			expect(listed.code).toBe("BAD_REQUEST");
		}
	});
});
