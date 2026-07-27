import { createHash } from "node:crypto";
import { z } from "zod";

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

function assertNoSymbolKeys(value: object): void {
	if (Object.getOwnPropertySymbols(value).length > 0) {
		throw new TypeError("Canonical JSON rejects symbol-keyed properties");
	}
}

function assertDenseArray(value: readonly unknown[]): void {
	for (let index = 0; index < value.length; index += 1) {
		const descriptor = Object.getOwnPropertyDescriptor(value, index);

		if (descriptor === undefined) {
			throw new TypeError("Canonical JSON rejects sparse arrays");
		}

		if (!("value" in descriptor)) {
			throw new TypeError("Canonical JSON rejects accessor properties");
		}
	}
}

function assertNoArrayObjectProperties(value: readonly unknown[]): void {
	for (const key of Object.getOwnPropertyNames(value)) {
		if (key === "length") {
			continue;
		}

		const index = Number(key);
		if (
			!Number.isSafeInteger(index) ||
			index < 0 ||
			index >= value.length ||
			String(index) !== key
		) {
			throw new TypeError("Canonical JSON rejects array object properties");
		}
	}
}

function assertPlainDataObject(value: Record<string, unknown>): void {
	assertNoSymbolKeys(value);

	for (const key of Object.getOwnPropertyNames(value)) {
		const descriptor = Object.getOwnPropertyDescriptor(value, key);

		if (descriptor === undefined || !("value" in descriptor)) {
			throw new TypeError("Canonical JSON rejects accessor properties");
		}
	}
}

function serialize(value: unknown, ancestors: WeakSet<object>): string {
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
			assertNoSymbolKeys(value);
			assertDenseArray(value);
			assertNoArrayObjectProperties(value);

			const entries = value.map((_, index) => {
				const descriptor = Object.getOwnPropertyDescriptor(value, index);

				if (descriptor === undefined || !("value" in descriptor)) {
					throw new TypeError("Canonical JSON rejects accessor properties");
				}

				return serialize(descriptor.value, ancestors);
			});

			return `[${entries.join(",")}]`;
		}
		if (!isPlainObject(value)) {
			throw new TypeError(
				"Canonical JSON accepts only arrays and plain objects",
			);
		}

		assertPlainDataObject(value);

		const fields = Object.getOwnPropertyNames(value)
			.sort()
			.map((key) => {
				const descriptor = Object.getOwnPropertyDescriptor(value, key);

				if (descriptor === undefined || !("value" in descriptor)) {
					throw new TypeError("Canonical JSON rejects accessor properties");
				}

				return `${JSON.stringify(key)}:${serialize(descriptor.value, ancestors)}`;
			});
		return `{${fields.join(",")}}`;
	} finally {
		ancestors.delete(value);
	}
}

export function canonicalJsonStringify(value: CanonicalJsonValue): string {
	return serialize(value, new WeakSet<object>());
}

export function assertCanonicalJsonValue(
	value: unknown,
): asserts value is CanonicalJsonValue {
	serialize(value, new WeakSet<object>());
}

function copyCanonicalJsonValue(value: CanonicalJsonValue): CanonicalJsonValue {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) {
		return Object.freeze(value.map(copyCanonicalJsonValue));
	}

	const copy: Record<string, CanonicalJsonValue> = {};
	for (const [key, entry] of Object.entries(value)) {
		copy[key] = copyCanonicalJsonValue(entry);
	}
	return Object.freeze(copy);
}

export function toImmutableCanonicalJson(value: unknown): CanonicalJsonValue {
	assertCanonicalJsonValue(value);
	return copyCanonicalJsonValue(value);
}

export const canonicalJsonValueSchema = z.custom<CanonicalJsonValue>(
	(value) => {
		try {
			serialize(value, new WeakSet<object>());
			return true;
		} catch {
			return false;
		}
	},
	"Expected canonical JSON-compatible data",
);

export function createCanonicalFingerprint(
	value: CanonicalJsonValue,
): CommandFingerprint {
	return commandFingerprintSchema.parse(
		createHash("sha256")
			.update(canonicalJsonStringify(value), "utf8")
			.digest("hex"),
	);
}
