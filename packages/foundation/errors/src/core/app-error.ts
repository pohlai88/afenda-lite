/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import type { ErrorCode } from "./codes";
import { isErrorCode } from "./codes";
import type { SafeDetails } from "./safe-details";

const APP_ERROR_MARKER = Symbol.for("@afenda/errors/AppError");

export type AppErrorOptions = Readonly<{
	code: ErrorCode;
	message: string;
	details?: SafeDetails;
	isOperational?: boolean;
	cause?: unknown;
}>;

/**
 * Transport-neutral application error.
 *
 * Public clients must use `serializeAppError`.
 * Never expose `cause`, `stack`, or the raw error instance.
 */
export class AppError extends Error {
	readonly code: ErrorCode;
	readonly details: SafeDetails | undefined;
	readonly isOperational: boolean;

	readonly [APP_ERROR_MARKER] = true;

	constructor(options: AppErrorOptions) {
		super(
			options.message,
			options.cause === undefined ? undefined : { cause: options.cause },
		);
		this.name = "AppError";
		this.code = options.code;
		this.details = options.details;
		this.isOperational = options.isOperational ?? true;
	}
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === "object" && value !== null;
}

function readProperty(
	value: Record<PropertyKey, unknown>,
	key: PropertyKey,
): unknown {
	try {
		return value[key];
	} catch {
		// Throwing getters are intentionally treated as absent error metadata.
	}
}

export function isAppError(value: unknown): value is AppError {
	if (value instanceof AppError) {
		return true;
	}
	if (!isRecord(value)) {
		return false;
	}

	const marker = readProperty(value, APP_ERROR_MARKER);
	const name = readProperty(value, "name");
	const message = readProperty(value, "message");
	const code = readProperty(value, "code");
	const isOperational = readProperty(value, "isOperational");

	return (
		marker === true &&
		name === "AppError" &&
		typeof message === "string" &&
		isErrorCode(code) &&
		typeof isOperational === "boolean"
	);
}

export function isOperationalError(value: unknown): boolean {
	if (!isAppError(value)) {
		return false;
	}
	if (value instanceof AppError) {
		return value.isOperational;
	}
	return isRecord(value) && readProperty(value, "isOperational") === true;
}
