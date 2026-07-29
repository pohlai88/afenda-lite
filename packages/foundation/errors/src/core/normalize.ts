/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { AppError, isAppError } from "./app-error";

const DEFAULT_INTERNAL_MESSAGE = "An unexpected error occurred";

function normalizeFallbackMessage(message: unknown): string {
	if (typeof message !== "string") {
		return DEFAULT_INTERNAL_MESSAGE;
	}
	const normalized = message.trim();
	return normalized.length > 0 ? normalized : DEFAULT_INTERNAL_MESSAGE;
}

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
	fallbackMessage: unknown = DEFAULT_INTERNAL_MESSAGE,
): AppError {
	if (isAppError(error)) {
		return error;
	}

	return new AppError({
		code: "INTERNAL_ERROR",
		message: normalizeFallbackMessage(fallbackMessage),
		isOperational: false,
		cause: error,
	});
}
