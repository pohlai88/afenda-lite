import { toNonNegativeInteger } from "./non-negative-integer";
import { HTTP_SEMANTIC_REGISTRY } from "./semantic-registry";

export const DEFAULT_PAGE_LIMIT =
	HTTP_SEMANTIC_REGISTRY.pagination.defaultLimit;
export const MAX_PAGE_LIMIT = HTTP_SEMANTIC_REGISTRY.pagination.maxLimit;

export interface PaginationParams {
	readonly limit: number;
	readonly offset: number;
}

function hasUrlString(input: object): input is { readonly url: string } {
	return "url" in input && typeof readProperty(input, "url") === "string";
}

function readProperty(input: object, key: PropertyKey): unknown {
	try {
		return Reflect.get(input, key);
	} catch {
		// Throwing getters are treated as absent transport input.
	}
}

function asSearchParams(input: unknown): URLSearchParams {
	if (input instanceof URLSearchParams) {
		return input;
	}
	if (input instanceof URL) {
		return input.searchParams;
	}
	if (typeof input === "string") {
		try {
			return new URL(input, "http://local.invalid").searchParams;
		} catch {
			return new URLSearchParams();
		}
	}
	if (typeof input === "object" && input !== null && hasUrlString(input)) {
		try {
			return new URL(input.url, "http://local.invalid").searchParams;
		} catch {
			return new URLSearchParams();
		}
	}
	return new URLSearchParams();
}

function parseBoundedInteger(
	raw: string | null,
	fallback: number,
	max: number,
): number {
	if (raw === null || raw.trim() === "") {
		return fallback;
	}
	const value = Number(raw);
	if (!Number.isInteger(value) || value < 0) {
		return fallback;
	}
	return Math.min(toNonNegativeInteger(value, "pagination value"), max);
}

/** Parse bounded transport pagination. Sorting remains domain-owned. */
export function extractPagination(input: unknown): PaginationParams {
	const params = asSearchParams(input);
	const limit = parseBoundedInteger(
		params.get("limit"),
		DEFAULT_PAGE_LIMIT,
		MAX_PAGE_LIMIT,
	);
	return {
		limit: limit === 0 ? DEFAULT_PAGE_LIMIT : limit,
		offset: parseBoundedInteger(
			params.get("offset"),
			0,
			Number.MAX_SAFE_INTEGER,
		),
	};
}
