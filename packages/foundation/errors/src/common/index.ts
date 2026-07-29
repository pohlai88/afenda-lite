/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { AppError } from "../core/app-error";
import type { ErrorCode } from "../core/codes";
import { clampRetryAfterSeconds } from "../core/retry-after";
import { sanitizeErrorDetails } from "../core/safe-details";

const RATE_LIMITED_MESSAGE = "Too many requests. Try again later.";
const SERVICE_UNAVAILABLE_MESSAGE =
	"A required service is temporarily unavailable.";
const DEFAULT_SERVICE_NAME = "service";

function createError(
	code: ErrorCode,
	message: string,
	details: unknown,
	isOperational: boolean,
): AppError {
	return new AppError({
		code,
		message,
		details: sanitizeErrorDetails(details),
		isOperational,
	});
}

export function badRequest(message: string, details?: unknown): AppError {
	return createError("BAD_REQUEST", message, details, true);
}

export function unauthorized(message: string, details?: unknown): AppError {
	return createError("UNAUTHORIZED", message, details, true);
}

export function forbidden(message: string, details?: unknown): AppError {
	return createError("FORBIDDEN", message, details, true);
}

export function notFound(message: string, details?: unknown): AppError {
	return createError("NOT_FOUND", message, details, true);
}

export function conflict(message: string, details?: unknown): AppError {
	return createError("CONFLICT", message, details, true);
}

export function validationError(message: string, details?: unknown): AppError {
	return createError("VALIDATION_ERROR", message, details, true);
}

export function rateLimited(seconds: number): AppError {
	return createError(
		"RATE_LIMITED",
		RATE_LIMITED_MESSAGE,
		{ retryAfter: clampRetryAfterSeconds(seconds) },
		true,
	);
}

function normalizeServiceName(service: unknown): string {
	if (typeof service !== "string") {
		return DEFAULT_SERVICE_NAME;
	}
	return service.trim() || DEFAULT_SERVICE_NAME;
}

export function serviceUnavailable(
	service: unknown = DEFAULT_SERVICE_NAME,
): AppError {
	const normalizedService = normalizeServiceName(service);
	return createError(
		"SERVICE_UNAVAILABLE",
		SERVICE_UNAVAILABLE_MESSAGE,
		{ service: normalizedService },
		true,
	);
}

export function internalError(message: string, details?: unknown): AppError {
	return createError("INTERNAL_ERROR", message, details, false);
}
