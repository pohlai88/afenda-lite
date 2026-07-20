export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export type PaginationOrder = "asc" | "desc";

export type PaginationParams = {
	readonly limit: number;
	readonly offset: number;
	readonly orderBy?: string;
	readonly order?: PaginationOrder;
};

function hasUrlString(input: object): input is { readonly url: string } {
	return "url" in input && typeof Reflect.get(input, "url") === "string";
}

function asSearchParams(input: unknown): URLSearchParams {
	if (input instanceof URLSearchParams) {
		return input;
	}
	if (input instanceof URL) {
		return input.searchParams;
	}
	if (typeof input === "string") {
		const url = input.includes("://")
			? new URL(input)
			: new URL(input, "http://local.invalid");
		return url.searchParams;
	}
	if (typeof input === "object" && input !== null && hasUrlString(input)) {
		return new URL(input.url).searchParams;
	}
	return new URLSearchParams();
}

function parsePositiveInt(
	raw: string | null,
	fallback: number,
	max: number,
): number {
	if (raw === null || raw.trim() === "") {
		return fallback;
	}
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 0) {
		return fallback;
	}
	return Math.min(n, max);
}

function parseOrder(raw: string | null): PaginationOrder | undefined {
	if (raw === "asc" || raw === "desc") {
		return raw;
	}
	return undefined;
}

/**
 * Parse list-query pagination into Drizzle-shaped `{ limit, offset }`.
 * Invalid values fall back to defaults; limit is clamped to MAX_PAGE_LIMIT.
 */
export function extractPagination(input: unknown): PaginationParams {
	const params = asSearchParams(input);
	const limit = parsePositiveInt(
		params.get("limit"),
		DEFAULT_PAGE_LIMIT,
		MAX_PAGE_LIMIT,
	);
	const offset = parsePositiveInt(
		params.get("offset"),
		0,
		Number.MAX_SAFE_INTEGER,
	);
	const orderByRaw = params.get("orderBy")?.trim();
	const order = parseOrder(params.get("order"));

	return {
		limit: limit === 0 ? DEFAULT_PAGE_LIMIT : limit,
		offset,
		...(orderByRaw ? { orderBy: orderByRaw } : {}),
		...(order ? { order } : {}),
	};
}
