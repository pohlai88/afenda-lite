import { describe, expect, it } from "vitest";

import { mapSearchDocumentRow, mapSearchHitRow } from "../src/map-row";

describe("mapSearchDocumentRow / mapSearchHitRow", () => {
	const base = {
		id: "11111111-1111-1111-1111-111111111111",
		organizationId: "org_a",
		entity: "member",
		documentId: "u1",
		title: "Ada",
		description: "Member",
		url: "/members/u1",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-02T00:00:00.000Z"),
	};

	it("maps plain metadata objects", () => {
		const mapped = mapSearchDocumentRow({
			...base,
			metadata: { role: "admin" },
		});
		expect(mapped.ok).toBe(true);
		if (mapped.ok) {
			expect(mapped.data.metadata).toEqual({ role: "admin" });
		}
	});

	it("rejects array metadata", () => {
		const mapped = mapSearchDocumentRow({
			...base,
			metadata: ["not", "an", "object"],
		});
		expect(mapped.ok).toBe(false);
		if (!mapped.ok) {
			expect(mapped.reason).toBe("invalid_metadata");
		}
	});

	it("maps hit scores from numeric strings", () => {
		const mapped = mapSearchHitRow({
			id: base.id,
			organizationId: base.organizationId,
			entity: base.entity,
			documentId: base.documentId,
			title: base.title,
			description: base.description,
			url: base.url,
			metadata: null,
			score: "0.42",
		});
		expect(mapped.ok).toBe(true);
		if (mapped.ok) {
			expect(mapped.data.score).toBe(0.42);
		}
	});
});
