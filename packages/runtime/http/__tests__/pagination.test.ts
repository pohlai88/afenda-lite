import { describe, expect, it } from "vitest";

import {
	DEFAULT_PAGE_LIMIT,
	extractPagination,
	MAX_PAGE_LIMIT,
} from "../src/pagination";

describe("@afenda/http extractPagination", () => {
	it("defaults limit and offset", () => {
		expect(extractPagination(new URLSearchParams())).toEqual({
			limit: DEFAULT_PAGE_LIMIT,
			offset: 0,
		});
	});

	it("clamps limit to MAX_PAGE_LIMIT", () => {
		const params = new URLSearchParams({
			limit: String(MAX_PAGE_LIMIT + 50),
			offset: "10",
		});
		expect(extractPagination(params)).toEqual({
			limit: MAX_PAGE_LIMIT,
			offset: 10,
		});
	});

	it("parses orderBy and order", () => {
		const params = new URLSearchParams({
			limit: "5",
			offset: "0",
			orderBy: "createdAt",
			order: "desc",
		});
		expect(extractPagination(params)).toEqual({
			limit: 5,
			offset: 0,
			orderBy: "createdAt",
			order: "desc",
		});
	});

	it("ignores invalid order and non-numeric limit", () => {
		const params = new URLSearchParams({
			limit: "nope",
			order: "sideways",
		});
		expect(extractPagination(params)).toEqual({
			limit: DEFAULT_PAGE_LIMIT,
			offset: 0,
		});
	});

	it("reads query from Request.url", () => {
		const request = new Request("http://local.test/api/items?limit=7&offset=3");
		expect(extractPagination(request)).toEqual({
			limit: 7,
			offset: 3,
		});
	});
});
