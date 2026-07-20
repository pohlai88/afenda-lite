import { describe, expect, it } from "vitest";

import {
	MAX_SEARCH_LIMIT,
	searchListIdsInputSchema,
	searchQueryOptionsSchema,
	searchUpsertBatchSchema,
	searchUpsertInputSchema,
} from "../src/schemas";

describe("@afenda/search schemas", () => {
	it("accepts a valid upsert payload", () => {
		const parsed = searchUpsertInputSchema.safeParse({
			organizationId: "org_1",
			entity: "member",
			documentId: "user_1",
			title: "Ada Lovelace",
			description: "Member",
			url: "/members/user_1",
			metadata: { role: "admin" },
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects empty organizationId", () => {
		const parsed = searchUpsertInputSchema.safeParse({
			organizationId: "  ",
			entity: "member",
			documentId: "user_1",
			title: "Ada",
		});
		expect(parsed.success).toBe(false);
	});

	it("defaults search limit and offset", () => {
		const parsed = searchQueryOptionsSchema.safeParse({
			organizationId: "org_1",
			query: "ada",
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.limit).toBe(20);
			expect(parsed.data.offset).toBe(0);
		}
	});

	it("rejects search limit above max", () => {
		const parsed = searchQueryOptionsSchema.safeParse({
			organizationId: "org_1",
			query: "ada",
			limit: MAX_SEARCH_LIMIT + 1,
		});
		expect(parsed.success).toBe(false);
	});

	it("rejects empty upsert batch", () => {
		const parsed = searchUpsertBatchSchema.safeParse([]);
		expect(parsed.success).toBe(false);
	});

	it("accepts list-ids input", () => {
		const parsed = searchListIdsInputSchema.safeParse({
			organizationId: "org_1",
			entity: "member",
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects list-ids without entity", () => {
		const parsed = searchListIdsInputSchema.safeParse({
			organizationId: "org_1",
		});
		expect(parsed.success).toBe(false);
	});
});
