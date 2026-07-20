import type { ErrorCode } from "../core/codes";
import { normalizeUnknown } from "../core/normalize";
import { serializeAppError } from "../core/serialize";

export type ResultSuccess<T> = {
	ok: true;
	data: T;
};

export type ResultFailure = {
	ok: false;
	code: ErrorCode;
	message: string;
	details?: unknown;
};

export type Result<T> = ResultSuccess<T> | ResultFailure;

export function ok<T>(data: T): ResultSuccess<T> {
	return { ok: true, data };
}

export function fail(
	code: ErrorCode,
	message: string,
	details?: unknown,
): ResultFailure {
	return details === undefined
		? { ok: false, code, message }
		: { ok: false, code, message, details };
}

/**
 * Map unknown failures to a safe Result failure (no raw Error.message leak).
 */
export function failFromUnknown(
	error: unknown,
	fallbackMessage: string,
): ResultFailure {
	const appError = normalizeUnknown(error, fallbackMessage);
	const serialized = serializeAppError(appError);
	return fail(serialized.code, serialized.message, serialized.details);
}
