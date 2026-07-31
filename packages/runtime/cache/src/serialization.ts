import type { CacheEntry } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function encodeEntry(entry: CacheEntry): string {
	const encoded = JSON.stringify(entry);
	if (encoded === undefined) {
		throw new TypeError("Cache value is not JSON serializable");
	}
	return encoded;
}

export function decodeEntry(encoded: string): CacheEntry | null {
	let value: unknown;
	try {
		value = JSON.parse(encoded);
	} catch {
		return null;
	}
	if (
		!isRecord(value) ||
		typeof value.createdAt !== "number" ||
		typeof value.expiresAt !== "number" ||
		!Array.isArray(value.tags) ||
		!value.tags.every((tag) => typeof tag === "string") ||
		!("data" in value)
	) {
		return null;
	}
	return {
		createdAt: value.createdAt,
		data: value.data,
		expiresAt: value.expiresAt,
		tags: value.tags,
	};
}

export function normalizeValue<T>(value: T): T {
	const encoded = JSON.stringify(value);
	if (encoded === undefined) {
		throw new TypeError("Cache value is not JSON serializable");
	}
	return JSON.parse(encoded) as T;
}
