import { describe, expect, it } from "vitest";

import { createSearchCapability } from "../src/capability";
import { MemorySearchStore } from "../src/testing/memory-search-store";

describe("@afenda/search semantic kernel", () => {
	it("normalizes documents once and strips sensitive metadata", async () => {
		const capability = createSearchCapability(new MemorySearchStore());
		const result = await capability.documents.upsert({
			organizationId: "org-1",
			entity: capability.entities.identity.member,
			documentId: "  member-1  ",
			title: "Ａｄａ    Lovelace",
			description: "  Platform   engineer  ",
			metadata: { team: "platform", accessToken: "secret" },
		});

		expect(result).toMatchObject({
			ok: true,
			data: {
				documentId: "member-1",
				title: "Ada Lovelace",
				description: "Platform engineer",
				metadata: { team: "platform" },
			},
		});
	});

	it("ranks title matches above description matches with stable ties", async () => {
		const capability = createSearchCapability(new MemorySearchStore());
		await capability.documents.upsertMany([
			{
				organizationId: "org-1",
				entity: capability.entities.identity.member,
				documentId: "b",
				title: "Engineer",
				description: "Ada",
			},
			{
				organizationId: "org-1",
				entity: capability.entities.identity.member,
				documentId: "c",
				title: "Ada",
				description: "Engineer",
			},
			{
				organizationId: "org-1",
				entity: capability.entities.identity.member,
				documentId: "a",
				title: "Ada",
				description: "Engineer",
			},
		]);

		const result = await capability.query({
			organizationId: "org-1",
			query: "Ada",
		});
		expect(result.ok && result.data.map((hit) => hit.documentId)).toEqual([
			"a",
			"c",
			"b",
		]);
	});

	it("rejects unregistered entity interpretations", async () => {
		const capability = createSearchCapability(new MemorySearchStore());
		const result = await capability.documents.upsert({
			organizationId: "org-1",
			entity: "consumer_owned_entity",
			documentId: "1",
			title: "Invalid",
		});
		expect(result.ok).toBe(false);
	});
});
