/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import type { ErrorCode } from "./codes";
import { type SafeDetails, sanitizeErrorDetails } from "./safe-details";

export const DEFAULT_INTERNAL_MESSAGE = "An unexpected error occurred";
export const MAX_PUBLIC_ERROR_MESSAGE_LENGTH = 512;

const DEFAULT_PUBLIC_MESSAGE = {
	BAD_REQUEST: "The request could not be processed",
	UNAUTHORIZED: "Authentication is required",
	FORBIDDEN: "The operation is not permitted",
	NOT_FOUND: "The requested resource was not found",
	CONFLICT: "The operation conflicts with the current state",
	VALIDATION_ERROR: "The request contains invalid data",
	RATE_LIMITED: "Too many requests. Try again later.",
	INTERNAL_ERROR: DEFAULT_INTERNAL_MESSAGE,
	SERVICE_UNAVAILABLE: "A required service is temporarily unavailable.",
} as const satisfies Readonly<Record<ErrorCode, string>>;

const WHITESPACE_PATTERN = /\s+/gu;

function stripControlCharacters(value: string): string {
	return Array.from(value, (character) => {
		const codePoint = character.codePointAt(0);
		return codePoint !== undefined && (codePoint < 32 || codePoint === 127)
			? " "
			: character;
	}).join("");
}

export function publicErrorMessage(code: ErrorCode, message: unknown): string {
	if (code === "INTERNAL_ERROR") {
		return DEFAULT_INTERNAL_MESSAGE;
	}
	if (typeof message !== "string") {
		return DEFAULT_PUBLIC_MESSAGE[code];
	}
	const normalized = stripControlCharacters(message)
		.replace(WHITESPACE_PATTERN, " ")
		.trim();
	if (normalized.length === 0) {
		return DEFAULT_PUBLIC_MESSAGE[code];
	}
	return normalized.slice(0, MAX_PUBLIC_ERROR_MESSAGE_LENGTH);
}

export function publicErrorDetails(
	code: ErrorCode,
	details: unknown,
): SafeDetails | undefined {
	return code === "INTERNAL_ERROR" ? undefined : sanitizeErrorDetails(details);
}

export function safeDiagnosticOperation(value: unknown): string | undefined {
	const details = sanitizeErrorDetails({ operation: value });
	return typeof details?.operation === "string"
		? details.operation.trim().slice(0, 128) || undefined
		: undefined;
}
