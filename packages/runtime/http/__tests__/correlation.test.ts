import { describe, expect, it } from "vitest";

import { http } from "../src";

describe("@afenda/http correlation", () => {
	it("exports the living header name", () => {
		expect(http.correlation.header).toBe("x-correlation-id");
	});

	it("mints and validates UUID correlation ids", () => {
		const id = http.correlation.create();
		expect(http.correlation.is(id)).toBe(true);
		expect(http.correlation.resolve(id)).toBe(id);
	});

	it("mints when inbound is missing or invalid", () => {
		expect(http.correlation.is(null)).toBe(false);
		expect(http.correlation.is("not-a-uuid")).toBe(false);
		const minted = http.correlation.resolve("not-a-uuid");
		expect(http.correlation.is(minted)).toBe(true);
	});
});
