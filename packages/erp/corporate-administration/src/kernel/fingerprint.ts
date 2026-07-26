import { createHash } from "node:crypto";

import { type CommandFingerprint, commandFingerprintSchema } from "./brands";

export type CanonicalJsonValue =
	| null
	| boolean
	| number
	| string
	| readonly CanonicalJsonValue[]
	| { readonly [key: string]: CanonicalJsonValue };

function isPlainObject(value: object): value is Record<string, unknown> {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function serializeCanonical(
	value: unknown,
	ancestors: WeakSet<object>,
): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean") {
		return JSON.stringify(value);
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError("Canonical JSON rejects non-finite numbers");
		}
		return JSON.stringify(value);
	}
	if (typeof value !== "object") {
		throw new TypeError(`Canonical JSON rejects ${typeof value}`);
	}
	if (ancestors.has(value)) {
		throw new TypeError("Canonical JSON rejects cyclic values");
	}
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			return `[${value.map((entry) => serializeCanonical(entry, ancestors)).join(",")}]`;
		}
		if (!isPlainObject(value)) {
			throw new TypeError(
				"Canonical JSON accepts only arrays and plain objects",
			);
		}
		const fields = Object.keys(value)
			.sort()
			.map(
				(key) =>
					`${JSON.stringify(key)}:${serializeCanonical(value[key], ancestors)}`,
			);
		return `{${fields.join(",")}}`;
	} finally {
		ancestors.delete(value);
	}
}

export function canonicalJsonStringify(value: unknown): string {
	return serializeCanonical(value, new WeakSet<object>());
}

export function createCanonicalFingerprint(value: unknown): CommandFingerprint {
	const digest = createHash("sha256")
		.update(canonicalJsonStringify(value), "utf8")
		.digest("hex");
	return commandFingerprintSchema.parse(digest);
}
