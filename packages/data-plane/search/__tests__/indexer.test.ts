import { describe, expect, it } from "vitest";

import {
	deleteSearchDocument,
	upsertSearchDocument,
	upsertSearchDocuments,
} from "../src/indexer";
import { MemorySearchStore } from "./helpers/memory-search-store";

describe("@afenda/search indexer", () => {
	it("upserts and sanitizes metadata", async () => {
		const store = new MemorySearchStore();
		const result = await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "member",
				documentId: "u1",
				title: "Ada",
				metadata: { role: "admin", password: "nope" },
			},
			store,
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.metadata).toEqual({ role: "admin" });
		}
	});

	it("upserts a batch and overwrites by natural key", async () => {
		const store = new MemorySearchStore();
		const batch = await upsertSearchDocuments(
			[
				{
					organizationId: "org_a",
					entity: "member",
					documentId: "u1",
					title: "Ada",
				},
				{
					organizationId: "org_a",
					entity: "member",
					documentId: "u2",
					title: "Grace",
				},
			],
			store,
		);
		expect(batch.ok).toBe(true);

		const updated = await upsertSearchDocument(
			{
				organizationId: "org_a",
				entity: "member",
				documentId: "u1",
				title: "Ada Lovelace",
			},
			store,
		);
		expect(updated.ok).toBe(true);
		if (updated.ok && batch.ok) {
			expect(updated.data.id).toBe(batch.data[0]?.id);
			expect(updated.data.title).toBe("Ada Lovelace");
		}
	});

	it("deletes by org + entity + documentId", async () => {
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
		const deleted = await deleteSearchDocument(
			{
				organizationId: "org_a",
				entity: "member",
				documentId: "u1",
			},
			store,
		);
		expect(deleted.ok).toBe(true);
		if (deleted.ok) {
			expect(deleted.data.deleted).toBe(true);
		}
	});

	it("rejects invalid upsert input", async () => {
		const store = new MemorySearchStore();
		const result = await upsertSearchDocument(
			{ organizationId: "org_a", entity: "member" },
			store,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
	});
});
