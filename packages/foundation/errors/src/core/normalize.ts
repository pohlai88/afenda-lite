import { fromPostgresUnknown } from "../adapters/postgres";
import { AppError, isAppError } from "./app-error";

const DEFAULT_INTERNAL_MESSAGE = "An unexpected error occurred";

/**
 * Normalize unknown failures into AppError.
 * Non-AppError values never promote raw Error.message to the public message.
 */
export function normalizeUnknown(
	error: unknown,
	fallbackMessage: string = DEFAULT_INTERNAL_MESSAGE,
): AppError {
	if (isAppError(error)) {
		return error;
	}

	const fromPg = fromPostgresUnknown(error);
	if (fromPg !== undefined) {
		return fromPg;
	}

	return new AppError({
		code: "INTERNAL_ERROR",
		message:
			fallbackMessage.trim().length > 0
				? fallbackMessage.trim()
				: DEFAULT_INTERNAL_MESSAGE,
		isOperational: false,
		cause: error,
	});
}
