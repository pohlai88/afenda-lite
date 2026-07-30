import { Buffer } from "node:buffer";

export const MAX_AUDIT_JSON_ARRAY_ITEMS = 1000 as const;
export const MAX_AUDIT_JSON_BYTES = 256 * 1024;
export const MAX_AUDIT_JSON_DEPTH = 12 as const;
export const MAX_AUDIT_JSON_KEY_LENGTH = 128 as const;
export const MAX_AUDIT_JSON_OBJECT_KEYS = 256 as const;
export const MAX_AUDIT_JSON_STRING_LENGTH = 32_768 as const;

const PROTOTYPE_MUTATING_JSON_KEYS = new Set([
	"__proto__",
	"constructor",
	"prototype",
]);

type AuditJsonPath = Array<number | string>;

export interface AuditJsonPolicyFailure {
	message: string;
	ok: false;
	path: AuditJsonPath;
}

export interface AuditJsonPolicySuccess {
	ok: true;
}

export type AuditJsonPolicyResult =
	| AuditJsonPolicyFailure
	| AuditJsonPolicySuccess;

function fail(path: AuditJsonPath, message: string): AuditJsonPolicyFailure {
	return { ok: false, path, message };
}

function inspectAuditJsonArray(
	value: unknown[],
	path: AuditJsonPath,
	depth: number,
	ancestors: WeakSet<object>,
): AuditJsonPolicyResult {
	if (value.length > MAX_AUDIT_JSON_ARRAY_ITEMS) {
		return fail(
			path,
			`audit JSON array exceeds ${MAX_AUDIT_JSON_ARRAY_ITEMS} items`,
		);
	}
	for (const [index, item] of value.entries()) {
		const inspected = inspectAuditJsonValue(
			item,
			[...path, index],
			depth + 1,
			ancestors,
		);
		if (!inspected.ok) {
			return inspected;
		}
	}
	return { ok: true };
}

function inspectAuditJsonObject(
	value: object,
	path: AuditJsonPath,
	depth: number,
	ancestors: WeakSet<object>,
): AuditJsonPolicyResult {
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		return fail(path, "audit JSON objects must be plain objects");
	}

	const entries = Object.entries(value);
	if (entries.length > MAX_AUDIT_JSON_OBJECT_KEYS) {
		return fail(
			path,
			`audit JSON object exceeds ${MAX_AUDIT_JSON_OBJECT_KEYS} keys`,
		);
	}
	for (const [key, item] of entries) {
		if (PROTOTYPE_MUTATING_JSON_KEYS.has(key)) {
			return fail([...path, key], "audit JSON key is not permitted");
		}
		if (key.length > MAX_AUDIT_JSON_KEY_LENGTH) {
			return fail(
				[...path, key],
				`audit JSON key exceeds ${MAX_AUDIT_JSON_KEY_LENGTH} characters`,
			);
		}
		const inspected = inspectAuditJsonValue(
			item,
			[...path, key],
			depth + 1,
			ancestors,
		);
		if (!inspected.ok) {
			return inspected;
		}
	}
	return { ok: true };
}

function inspectAuditJsonValue(
	value: unknown,
	path: AuditJsonPath,
	depth: number,
	ancestors: WeakSet<object>,
): AuditJsonPolicyResult {
	if (depth > MAX_AUDIT_JSON_DEPTH) {
		return fail(
			path,
			`audit JSON exceeds maximum depth ${MAX_AUDIT_JSON_DEPTH}`,
		);
	}

	if (value === null || typeof value === "boolean") {
		return { ok: true };
	}
	if (typeof value === "string") {
		return value.length <= MAX_AUDIT_JSON_STRING_LENGTH
			? { ok: true }
			: fail(
					path,
					`audit JSON string exceeds ${MAX_AUDIT_JSON_STRING_LENGTH} characters`,
				);
	}
	if (typeof value === "number") {
		return Number.isFinite(value)
			? { ok: true }
			: fail(path, "audit JSON numbers must be finite");
	}
	if (typeof value !== "object") {
		return fail(path, `audit JSON cannot contain ${typeof value}`);
	}
	if (ancestors.has(value)) {
		return fail(path, "audit JSON cannot contain cyclic references");
	}

	ancestors.add(value);
	try {
		return Array.isArray(value)
			? inspectAuditJsonArray(value, path, depth, ancestors)
			: inspectAuditJsonObject(value, path, depth, ancestors);
	} finally {
		ancestors.delete(value);
	}
}

export function validateAuditJsonValue(value: unknown): AuditJsonPolicyResult {
	const inspected = inspectAuditJsonValue(value, [], 0, new WeakSet());
	if (!inspected.ok) {
		return inspected;
	}

	const serialized = JSON.stringify(value);
	if (serialized === undefined) {
		return fail([], "audit JSON value is not serializable");
	}
	const byteLength = Buffer.byteLength(serialized, "utf8");
	return byteLength <= MAX_AUDIT_JSON_BYTES
		? { ok: true }
		: fail([], `audit JSON exceeds ${MAX_AUDIT_JSON_BYTES} bytes`);
}

export function assertValidAuditJsonValue(value: unknown): void {
	const validated = validateAuditJsonValue(value);
	if (!validated.ok) {
		const location =
			validated.path.length === 0 ? "$" : validated.path.join(".");
		throw new TypeError(`${validated.message} at ${location}`);
	}
}
