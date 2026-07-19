import type { AppError } from "./app-error";
import type { ErrorCode } from "./codes";
import { normalizeUnknown } from "./normalize";

export type SerializedAppError = {
	code: ErrorCode;
	message: string;
	details?: Readonly<Record<string, unknown>>;
};

const SECRET_KEY_PATTERN =
	/^(password|passwd|secret|token|authorization|cookie|api[_-]?key|database_url|connectionstring)$/i;

const SQL_LEAK_PATTERN =
	/\b(select|insert|update|delete|from|where|join|violates|duplicate key|relation\s+|column\s+)\b/i;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeScalar(value: unknown): boolean {
	return (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		value === null
	);
}

function sanitizeDetails(
	details: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
	if (details === undefined) {
		return undefined;
	}
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(details)) {
		if (SECRET_KEY_PATTERN.test(key)) {
			continue;
		}
		if (key === "cause" || key === "stack" || key === "sql") {
			continue;
		}
		if (typeof value === "string" && SQL_LEAK_PATTERN.test(value)) {
			continue;
		}
		if (isSafeScalar(value)) {
			out[key] = value;
			continue;
		}
		if (Array.isArray(value) && value.every(isSafeScalar)) {
			out[key] = value;
			continue;
		}
		if (isPlainRecord(value)) {
			const nested = sanitizeDetails(value);
			if (nested !== undefined && Object.keys(nested).length > 0) {
				out[key] = nested;
			}
		}
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Public-safe error shape — no stack, SQL, secrets, or raw cause.
 */
export function serializeAppError(error: AppError): SerializedAppError {
	const details = sanitizeDetails(error.details);
	return details === undefined
		? { code: error.code, message: error.message }
		: { code: error.code, message: error.message, details };
}

export function serializeUnknown(
	error: unknown,
	fallbackMessage: string,
): SerializedAppError {
	return serializeAppError(normalizeUnknown(error, fallbackMessage));
}
