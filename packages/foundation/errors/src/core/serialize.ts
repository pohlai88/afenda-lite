/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { AppError } from "./app-error";
import { type ErrorCode, isErrorCode } from "./codes";
import { normalizeUnknown } from "./normalize";
import { type SafeDetails, sanitizeErrorDetails } from "./safe-details";

const DEFAULT_INTERNAL_MESSAGE = "An unexpected error occurred";

export type SerializedAppError = Readonly<{
	code: ErrorCode;
	message: string;
	details?: SafeDetails;
}>;

function readProperty(value: object, key: PropertyKey): unknown {
	try {
		return Reflect.get(value, key);
	} catch {
		return undefined;
	}
}

function normalizedMessage(value: unknown): string {
	if (typeof value !== "string") {
		return DEFAULT_INTERNAL_MESSAGE;
	}
	const message = value.trim();
	return message.length > 0 ? message : DEFAULT_INTERNAL_MESSAGE;
}

export function serializeAppError(error: AppError): SerializedAppError {
	const codeValue = readProperty(error, "code");
	const messageValue = readProperty(error, "message");
	const detailsValue = readProperty(error, "details");

	const code = isErrorCode(codeValue) ? codeValue : "INTERNAL_ERROR";
	const message = normalizedMessage(messageValue);
	const details = sanitizeErrorDetails(detailsValue);

	return details === undefined ? { code, message } : { code, message, details };
}

export function serializeUnknown(
	error: unknown,
	fallbackMessage: unknown = DEFAULT_INTERNAL_MESSAGE,
): SerializedAppError {
	return serializeAppError(normalizeUnknown(error, fallbackMessage));
}
