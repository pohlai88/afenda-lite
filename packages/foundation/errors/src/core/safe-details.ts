/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export type SafeDetailScalar = string | number | boolean | null;
export type SafeDetailValue =
	| SafeDetailScalar
	| readonly SafeDetailScalar[]
	| SafeDetails;
export interface SafeDetails
	extends Readonly<Record<string, SafeDetailValue>> {}

const MAX_DEPTH = 4;
const MAX_ENTRIES = 50;
const MAX_ARRAY_LENGTH = 50;
const MAX_STRING_LENGTH = 2000;

const BLOCKED_KEY_PATTERN =
	/(?:password|passwd|secret|token|authorization|cookie|api[_-]?key|database[_-]?url|connection[_-]?string|private[_-]?key|cause|stack|sql|query|statement|parameters?)/i;

const SQL_LEAK_PATTERN =
	/(?:\b(?:select|insert|update|delete|merge|truncate|create|alter|drop|grant|revoke|copy|call|execute)\b)|(?:duplicate key value violates)|(?:relation "[^"]+" does not exist)|(?:column "[^"]+" does not exist)/i;
const CONNECTION_URL_PATTERN =
	/\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss):\/\/[^\s]+/i;
const SECRET_VALUE_PATTERN =
	/(?:\b(?:password|passwd|secret|token|api[_-]?key)\b\s*[:=])|(?:-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	try {
		const prototype = Object.getPrototypeOf(value);
		return prototype === Object.prototype || prototype === null;
	} catch {
		return false;
	}
}

function readEnumerableKeys(value: object): readonly string[] {
	try {
		return Object.keys(value);
	} catch {
		return [];
	}
}

function readProperty(value: Record<string, unknown>, key: string): unknown {
	try {
		return value[key];
	} catch {
		// Throwing getters are omitted from public-safe details.
	}
}

function sanitizeScalar(value: unknown): SafeDetailScalar | undefined {
	if (value === null || typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : undefined;
	}
	if (typeof value === "string") {
		if (
			SQL_LEAK_PATTERN.test(value) ||
			CONNECTION_URL_PATTERN.test(value) ||
			SECRET_VALUE_PATTERN.test(value)
		) {
			return;
		}
		return value.length <= MAX_STRING_LENGTH
			? value
			: value.slice(0, MAX_STRING_LENGTH);
	}
}

function sanitizeScalarArray(
	value: readonly unknown[],
): readonly SafeDetailScalar[] | undefined {
	const output: SafeDetailScalar[] = [];
	for (
		let index = 0;
		index < value.length && index < MAX_ARRAY_LENGTH;
		index += 1
	) {
		const scalar = sanitizeScalar(value[index]);
		if (scalar !== undefined) {
			output.push(scalar);
		}
	}
	return output.length > 0 ? output : undefined;
}

function sanitizeValue(
	value: unknown,
	seen: WeakSet<object>,
	depth: number,
): SafeDetailValue | undefined {
	const scalar = sanitizeScalar(value);
	if (scalar !== undefined) {
		return scalar;
	}
	if (Array.isArray(value)) {
		return sanitizeScalarArray(value);
	}
	return isPlainRecord(value)
		? sanitizeRecord(value, seen, depth + 1)
		: undefined;
}

function sanitizeRecord(
	value: Record<string, unknown>,
	seen: WeakSet<object>,
	depth: number,
): SafeDetails | undefined {
	if (depth > MAX_DEPTH || seen.has(value)) {
		return;
	}
	seen.add(value);

	try {
		const output: Record<string, SafeDetailValue> = {};
		let count = 0;
		for (const key of readEnumerableKeys(value)) {
			if (count >= MAX_ENTRIES) {
				break;
			}
			if (BLOCKED_KEY_PATTERN.test(key)) {
				continue;
			}

			const sanitized = sanitizeValue(readProperty(value, key), seen, depth);
			if (sanitized !== undefined) {
				output[key] = sanitized;
				count += 1;
			}
		}

		return Object.keys(output).length > 0 ? output : undefined;
	} finally {
		seen.delete(value);
	}
}

/**
 * Creates a bounded, JSON-safe, public-safe copy of arbitrary details.
 *
 * Unsupported values, secrets, SQL-like strings, cycles, throwing getters, and
 * oversized structures are omitted.
 */
export function sanitizeErrorDetails(
	details: unknown,
): SafeDetails | undefined {
	if (!isPlainRecord(details)) {
		return;
	}
	return sanitizeRecord(details, new WeakSet<object>(), 0);
}
