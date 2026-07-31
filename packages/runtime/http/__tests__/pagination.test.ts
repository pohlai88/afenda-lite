import { describe, expect, it } from "vitest";

import { http } from "../src";

describe("@afenda/http extractPagination", () => {
	it("defaults limit and offset", () => {
		expect(http.pagination.extract(new URLSearchParams())).toEqual({
			limit: http.pagination.defaultLimit,
			offset: 0,
		});
	});

	it("clamps limit to MAX_PAGE_LIMIT", () => {
		const params = new URLSearchParams({
			limit: String(http.pagination.maxLimit + 50),
			offset: "10",
		});
		expect(http.pagination.extract(params)).toEqual({
			limit: http.pagination.maxLimit,
			offset: 10,
		});
	});

	it("does not interpret domain-owned sorting", () => {
		const params = new URLSearchParams({
			limit: "5",
			offset: "0",
			orderBy: "createdAt",
			order: "desc",
		});
		expect(http.pagination.extract(params)).toEqual({
			limit: 5,
			offset: 0,
		});
	});

	it("ignores invalid order and non-numeric limit", () => {
		const params = new URLSearchParams({
			limit: "nope",
			order: "sideways",
		});
		expect(http.pagination.extract(params)).toEqual({
			limit: http.pagination.defaultLimit,
			offset: 0,
		});
	});

	it("reads query from Request.url", () => {
		const request = new Request("http://local.test/api/items?limit=7&offset=3");
		expect(http.pagination.extract(request)).toEqual({
			limit: 7,
			offset: 3,
		});
	});

	it("rejects decimal and negative transport values to defaults", () => {
		expect(http.pagination.extract("?limit=2.5&offset=-1")).toEqual({
			limit: http.pagination.defaultLimit,
			offset: 0,
		});
	});
});
