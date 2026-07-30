/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { AppError } from "../core/app-error";
import type { ErrorCode } from "../core/codes";
import {
	publicErrorDetails,
	publicErrorMessage,
} from "../core/public-error-policy";
import { retryAfterSeconds as readRetryAfterSeconds } from "../core/retry-after";
import type { SafeDetails } from "../core/safe-details";
import { serializeAppError } from "../core/serialize";

export {
	clampRetryAfterSeconds,
	MAX_RETRY_AFTER_SECONDS,
	MIN_RETRY_AFTER_SECONDS,
	retryAfterSeconds,
} from "../core/retry-after";

export const ERROR_HTTP_STATUS = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	VALIDATION_ERROR: 422,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
	SERVICE_UNAVAILABLE: 503,
} as const satisfies Readonly<Record<ErrorCode, number>>;

/** Historical alias used by web Route Handlers. */
export const API_ERROR_HTTP_STATUS = ERROR_HTTP_STATUS;

export type HttpErrorBody = Readonly<{
	error: Readonly<{
		code: ErrorCode;
		message: string;
		details?: SafeDetails;
	}>;
}>;

/** Historical alias — same wire shape as OpenAPI `APIErrorBody`. */
export type APIErrorBody = HttpErrorBody;

export type HttpErrorProjection = Readonly<{
	status: number;
	body: HttpErrorBody;
	retryAfter?: number;
}>;

export function httpErrorBody(
	code: ErrorCode,
	message: string,
	details?: unknown,
): HttpErrorBody {
	const safeDetails = publicErrorDetails(code, details);
	const safeMessage = publicErrorMessage(code, message);
	return safeDetails === undefined
		? { error: { code, message: safeMessage } }
		: { error: { code, message: safeMessage, details: safeDetails } };
}

/** Historical alias. */
export const apiErrorBody = httpErrorBody;

/** Derives the complete HTTP projection from one trusted AppError. */
export function projectHttpError(error: AppError): HttpErrorProjection {
	const serialized = serializeAppError(error);
	const body: HttpErrorBody = { error: serialized };
	const retryAfter =
		serialized.code === "RATE_LIMITED"
			? readRetryAfterSeconds(serialized.details)
			: undefined;
	return retryAfter === undefined
		? { status: ERROR_HTTP_STATUS[serialized.code], body }
		: { status: ERROR_HTTP_STATUS[serialized.code], body, retryAfter };
}
