/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { AppError, isAppError } from "./app-error";
import { DEFAULT_INTERNAL_MESSAGE } from "./public-error-policy";

/**
 * Normalizes an unknown failure into an AppError.
 *
 * Existing AppError instances are preserved. Other values are converted into a
 * non-operational INTERNAL_ERROR without exposing their raw messages.
 *
 * Infrastructure-specific interpretation, such as PostgreSQL SQLSTATE mapping,
 * must occur before calling this function.
 */
export function normalizeUnknown(
	error: unknown,
	fallbackMessage?: unknown,
): AppError {
	if (isAppError(error)) {
		return error;
	}

	return new AppError({
		code: "INTERNAL_ERROR",
		message: DEFAULT_INTERNAL_MESSAGE,
		isOperational: false,
		operation: fallbackMessage,
		cause: error,
	});
}
