import { type HttpContext, http, type PaginationParams } from "@afenda/http";

const context: HttpContext = http.correlation.createContext(
	new Request("https://example.test/items?limit=10"),
);
const page: PaginationParams = http.pagination.extract(
	new URLSearchParams("limit=10&offset=2"),
);
const headers = new Headers();
http.headers.applyRetryAfter(headers, 30);
http.headers.applyRateLimit(headers, {
	limit: 20,
	remaining: 10,
	resetEpochMs: Date.now() + 60_000,
});
http.response.stamp(new Response(), context);
headers.set("x-page-size", String(page.limit));

// @ts-expect-error sorting is domain-owned and absent from transport pagination
const rejectedOrderBy = http.pagination.extract(new URLSearchParams()).orderBy;
headers.set("x-rejected-sort", rejectedOrderBy);

// @ts-expect-error error projection is owned by @afenda/errors
http.error.project({ code: "INTERNAL_ERROR" });
