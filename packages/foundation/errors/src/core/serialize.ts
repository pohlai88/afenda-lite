/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { AppError } from "./app-error";
import { type ErrorCode, isErrorCode } from "./codes";
import { normalizeUnknown } from "./normalize";
import {
	DEFAULT_INTERNAL_MESSAGE,
	publicErrorDetails,
	publicErrorMessage,
} from "./public-error-policy";
import type { SafeDetails } from "./safe-details";

export type SerializedAppError = Readonly<{
	code: ErrorCode;
	message: string;
	details?: SafeDetails;
}>;

function readProperty(value: object, key: PropertyKey): unknown {
	try {
		return Reflect.get(value, key);
	} catch {
		// Throwing getters are omitted from the public error representation.
	}
}

export function serializeAppError(error: AppError): SerializedAppError {
	const codeValue = readProperty(error, "code");
	const messageValue = readProperty(error, "message");
	const detailsValue = readProperty(error, "details");

	const code = isErrorCode(codeValue) ? codeValue : "INTERNAL_ERROR";
	const message = publicErrorMessage(code, messageValue);
	const details = publicErrorDetails(code, detailsValue);

	return details === undefined ? { code, message } : { code, message, details };
}

export function serializeUnknown(
	error: unknown,
	fallbackMessage: unknown = DEFAULT_INTERNAL_MESSAGE,
): SerializedAppError {
	return serializeAppError(normalizeUnknown(error, fallbackMessage));
}
