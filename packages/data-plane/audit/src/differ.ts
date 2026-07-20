import type { Change } from "./types";

const IGNORED_FIELDS = new Set(["updatedAt", "createdAt", "version", "_count"]);

const SENSITIVE_FIELDS = new Set([
	"password",
	"token",
	"secret",
	"apiKey",
	"refreshToken",
	"accessToken",
	"privateKey",
	"sessionToken",
]);

const MASKED_STRING = "***" as const;

function isSensitiveField(field: string): boolean {
	return SENSITIVE_FIELDS.has(field);
}

function maskSensitiveValue(value: unknown, isSensitive: boolean): unknown {
	if (!isSensitive) {
		return value;
	}
	if (value === null || value === undefined) {
		return value;
	}
	if (typeof value === "string" && value.length > 0) {
		return MASKED_STRING;
	}
	return value;
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function maskUnknown(value: unknown): unknown {
	if (isPlainObject(value)) {
		return maskSensitiveData(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) =>
			isPlainObject(item) ? maskSensitiveData(item) : item,
		);
	}
	return value;
}

function wildcardChange(oldValue: unknown, newValue: unknown): Change[] {
	return [
		{
			field: "*",
			oldValue: maskUnknown(oldValue),
			newValue: maskUnknown(newValue),
		},
	];
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	if (a === null || b === null || a === undefined || b === undefined) {
		return a === b;
	}

	const aType = typeof a;
	const bType = typeof b;
	if (aType !== bType) {
		return false;
	}

	if (aType !== "object") {
		return false;
	}

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			return false;
		}
		return a.every((item, index) => deepEqual(item, b[index]));
	}

	if (Array.isArray(a) || Array.isArray(b)) {
		return false;
	}

	if (!isPlainObject(a) || !isPlainObject(b)) {
		return false;
	}

	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) {
		return false;
	}

	return aKeys.every((key) => deepEqual(a[key], b[key]));
}

/**
 * Field-level diff of two values. Sensitive keys are masked in the Change payload
 * (including wildcard `*` snapshots for CREATE/DELETE / non-object values).
 */
export function computeDiff(oldValue: unknown, newValue: unknown): Change[] {
	if (oldValue === null || oldValue === undefined) {
		if (newValue !== null && newValue !== undefined) {
			return wildcardChange(oldValue, newValue);
		}
		return [];
	}

	if (newValue === null || newValue === undefined) {
		return wildcardChange(oldValue, newValue);
	}

	if (isPlainObject(oldValue) && isPlainObject(newValue)) {
		const changes: Change[] = [];
		const allKeys = new Set([
			...Object.keys(oldValue),
			...Object.keys(newValue),
		]);

		for (const field of allKeys) {
			if (IGNORED_FIELDS.has(field)) {
				continue;
			}

			const oldFieldValue = oldValue[field];
			const newFieldValue = newValue[field];
			if (deepEqual(oldFieldValue, newFieldValue)) {
				continue;
			}

			const sensitive = isSensitiveField(field);
			changes.push({
				field,
				oldValue: maskSensitiveValue(oldFieldValue, sensitive),
				newValue: maskSensitiveValue(newFieldValue, sensitive),
			});
		}

		return changes;
	}

	if (!deepEqual(oldValue, newValue)) {
		return wildcardChange(oldValue, newValue);
	}

	return [];
}

/**
 * Recursively mask sensitive fields in a plain object snapshot.
 */
export function maskSensitiveData(
	data: Record<string, unknown>,
): Record<string, unknown> {
	const masked: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(data)) {
		if (isSensitiveField(key)) {
			masked[key] = maskSensitiveValue(value, true);
			continue;
		}

		if (isPlainObject(value)) {
			masked[key] = maskSensitiveData(value);
			continue;
		}

		if (Array.isArray(value)) {
			masked[key] = value.map((item) =>
				isPlainObject(item) ? maskSensitiveData(item) : item,
			);
			continue;
		}

		masked[key] = value;
	}

	return masked;
}
