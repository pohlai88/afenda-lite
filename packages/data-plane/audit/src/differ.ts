import { assertValidAuditJsonValue } from "./json-policy";
import type { Change } from "./types";

const IGNORED_FIELDS = new Set(["updatedAt", "createdAt", "version", "_count"]);

const SENSITIVE_FIELDS = new Set([
	"authorization",
	"clientsecret",
	"cookie",
	"credential",
	"password",
	"passwordhash",
	"token",
	"secret",
	"apikey",
	"refreshtoken",
	"accesstoken",
	"privatekey",
	"sessiontoken",
	"setcookie",
]);

const MASKED_STRING = "***" as const;
const SENSITIVE_KEY_SEPARATOR_PATTERN = /[^a-zA-Z0-9]/g;

function isSensitiveField(field: string): boolean {
	return SENSITIVE_FIELDS.has(
		field.replaceAll(SENSITIVE_KEY_SEPARATOR_PATTERN, "").toLowerCase(),
	);
}

function maskSensitiveValue(value: unknown, isSensitive: boolean): unknown {
	if (!isSensitive) {
		return maskUnknown(value);
	}
	if (value === null || value === undefined) {
		return value;
	}
	return MASKED_STRING;
}

export function maskAuditChanges(changes: readonly Change[]): Change[] {
	return changes.map((change) => {
		const sensitive = isSensitiveField(change.field);
		return {
			field: change.field,
			oldValue: maskSensitiveValue(change.oldValue, sensitive),
			newValue: maskSensitiveValue(change.newValue, sensitive),
		};
	});
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function maskUnknown(value: unknown): unknown {
	if (isPlainObject(value)) {
		return maskObject(value);
	}
	if (Array.isArray(value)) {
		return value.map(maskUnknown);
	}
	return value;
}

function maskObject(data: Record<string, unknown>): Record<string, unknown> {
	const masked: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(data)) {
		masked[key] = maskSensitiveValue(value, isSensitiveField(key));
	}

	return masked;
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

	if (!(isPlainObject(a) && isPlainObject(b))) {
		return false;
	}

	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) {
		return false;
	}

	return aKeys.every((key) => deepEqual(a[key], b[key]));
}

function fieldValueOrNull(
	value: Record<string, unknown>,
	field: string,
): unknown {
	return Object.hasOwn(value, field) ? value[field] : null;
}

/**
 * Field-level diff of two values. Sensitive keys are masked in the Change payload
 * (including wildcard `*` snapshots for CREATE/DELETE / non-object values).
 */
export function computeDiff(oldValue: unknown, newValue: unknown): Change[] {
	if (oldValue !== undefined) {
		assertValidAuditJsonValue(oldValue);
	}
	if (newValue !== undefined) {
		assertValidAuditJsonValue(newValue);
	}

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

			const oldFieldValue = fieldValueOrNull(oldValue, field);
			const newFieldValue = fieldValueOrNull(newValue, field);
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
	assertValidAuditJsonValue(data);
	return maskObject(data);
}
