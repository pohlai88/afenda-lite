import { createHash } from "node:crypto";

type JsonPrimitive = string | number | boolean | null;

type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalizeValue(value: unknown): JsonValue {
	if (value === null) {
		return null;
	}

	if (typeof value === "string") {
		return value.normalize("NFKC").trim();
	}

	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError("Cannot fingerprint a non-finite number.");
		}

		return value;
	}

	if (Array.isArray(value)) {
		return value.map(canonicalizeValue);
	}

	if (isPlainObject(value)) {
		const result: Record<string, JsonValue> = {};

		for (const key of Object.keys(value).sort((left, right) =>
			left.localeCompare(right),
		)) {
			const item = value[key];

			if (item === undefined) {
				continue;
			}

			result[key] = canonicalizeValue(item);
		}

		return result;
	}

	throw new TypeError(`Unsupported fingerprint value: ${typeof value}`);
}

/** Stable JSON serialization for deterministic CA request fingerprints. */
export function canonicalSerialize(value: unknown): string {
	return JSON.stringify(canonicalizeValue(value));
}

/** Produces the stable request identity used by idempotent CA commands. */
export function createCorporateAdministrationRequestFingerprint(
	value: unknown,
): string {
	return createHash("sha256")
		.update(canonicalSerialize(value))
		.digest("hex");
}

const FINGERPRINT_CONTEXT_KEYS = new Set([
	"idempotencyKey",
	"correlationId",
	"causationId",
]);

const FINGERPRINT_WIRE_KEYS = new Set([
	...FINGERPRINT_CONTEXT_KEYS,
	"actorUserId",
]);

/** Derives a wire-independent fingerprint from parsed command material fields. */
export function deriveCaRequestFingerprint(
	data: Record<string, unknown>,
): string {
	const material = Object.fromEntries(
		Object.entries(data).filter(
			([key]) => !FINGERPRINT_CONTEXT_KEYS.has(key),
		),
	);
	return createCorporateAdministrationRequestFingerprint(material);
}

/**
 * Derives a command-scoped fingerprint from parsed input, excluding wire/session
 * context (`actorUserId`, correlation, idempotency).
 */
export function deriveCaCommandFingerprint(
	discriminator: Record<string, string>,
	data: Record<string, unknown>,
): string {
	const material = Object.fromEntries(
		Object.entries(data).filter(([key]) => !FINGERPRINT_WIRE_KEYS.has(key)),
	);
	return createCorporateAdministrationRequestFingerprint({
		...discriminator,
		...material,
	});
}
