import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "../src/cursor";

describe("cursor helpers", () => {
	it("round-trips id and sort value", () => {
		const encoded = encodeCursor("row-1", "2026-07-20T00:00:00.000Z");
		expect(decodeCursor(encoded)).toEqual({
			id: "row-1",
			sortValue: "2026-07-20T00:00:00.000Z",
		});
	});

	it("encodes Date sort values as ISO", () => {
		const date = new Date("2026-01-02T03:04:05.000Z");
		const encoded = encodeCursor("id", date);
		expect(decodeCursor(encoded)).toEqual({
			id: "id",
			sortValue: "2026-01-02T03:04:05.000Z",
		});
	});

	it("preserves pipe characters inside sortValue", () => {
		const encoded = encodeCursor("a", "x|y|z");
		expect(decodeCursor(encoded)).toEqual({
			id: "a",
			sortValue: "x|y|z",
		});
	});
});
