import { AppError } from "../core/app-error";
import type { ErrorCode } from "../core/codes";
import { clampRetryAfterSeconds } from "../core/retry-after";

const DEFAULT_UNAVAILABLE_SERVICE = "service";
const RATE_LIMITED_MESSAGE = "Too many requests. Try again later.";
const SERVICE_UNAVAILABLE_MESSAGE =
	"A required service is temporarily unavailable.";

function createError(
	code: ErrorCode,
	message: string,
	details: Readonly<Record<string, unknown>> | undefined,
	isOperational: boolean,
): AppError {
	return new AppError({ code, message, details, isOperational });
}

export function badRequest(
	message: string,
	details?: Readonly<Record<string, unknown>>,
): AppError {
	return createError("BAD_REQUEST", message, details, true);
}

export function unauthorized(
	message: string,
	details?: Readonly<Record<string, unknown>>,
): AppError {
	return createError("UNAUTHORIZED", message, details, true);
}

export function forbidden(
	message: string,
	details?: Readonly<Record<string, unknown>>,
): AppError {
	return createError("FORBIDDEN", message, details, true);
}

export function notFound(
	message: string,
	details?: Readonly<Record<string, unknown>>,
): AppError {
	return createError("NOT_FOUND", message, details, true);
}

export function conflict(
	message: string,
	details?: Readonly<Record<string, unknown>>,
): AppError {
	return createError("CONFLICT", message, details, true);
}

export function validationError(
	message: string,
	details?: Readonly<Record<string, unknown>>,
): AppError {
	return createError("VALIDATION_ERROR", message, details, true);
}

export function rateLimited(seconds: number): AppError {
	const retryAfter = clampRetryAfterSeconds(seconds);
	return createError(
		"RATE_LIMITED",
		RATE_LIMITED_MESSAGE,
		{ retryAfter },
		true,
	);
}

export function serviceUnavailable(service: string): AppError {
	const trimmed = typeof service === "string" ? service.trim() : "";
	const name = trimmed.length > 0 ? trimmed : DEFAULT_UNAVAILABLE_SERVICE;
	return createError(
		"SERVICE_UNAVAILABLE",
		SERVICE_UNAVAILABLE_MESSAGE,
		{ service: name },
		true,
	);
}

export function internalError(
	message: string,
	details?: Readonly<Record<string, unknown>>,
): AppError {
	return createError("INTERNAL_ERROR", message, details, false);
}
