/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { AppError } from "../core/app-error";
import type { ErrorCode } from "../core/codes";
import { normalizeUnknown } from "../core/normalize";
import {
	publicErrorDetails,
	publicErrorMessage,
} from "../core/public-error-policy";
import type { SafeDetails } from "../core/safe-details";
import { serializeAppError } from "../core/serialize";

export interface ResultSuccess<T> {
	data: T;
	ok: true;
}

export interface ResultFailure {
	code: ErrorCode;
	details?: SafeDetails;
	message: string;
	ok: false;
}

export type Result<T> = ResultSuccess<T> | ResultFailure;

export function ok<T>(data: T): ResultSuccess<T> {
	return { ok: true, data };
}

export function fail(
	code: ErrorCode,
	message: string,
	details?: unknown,
): ResultFailure {
	const safeDetails = publicErrorDetails(code, details);
	const safeMessage = publicErrorMessage(code, message);
	return safeDetails === undefined
		? { ok: false, code, message: safeMessage }
		: { ok: false, code, message: safeMessage, details: safeDetails };
}

export function failFromAppError(error: AppError): ResultFailure {
	const serialized = serializeAppError(error);
	return fail(serialized.code, serialized.message, serialized.details);
}

/**
 * Map unknown failures to a safe Result failure (no raw Error.message leak).
 */
export function failFromUnknown(
	error: unknown,
	fallbackMessage: unknown,
): ResultFailure {
	const appError = normalizeUnknown(error, fallbackMessage);
	const serialized = serializeAppError(appError);
	return fail(serialized.code, serialized.message, serialized.details);
}
