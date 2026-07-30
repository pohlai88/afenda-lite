/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import type { ErrorCode } from "./codes";
import {
	publicErrorDetails,
	publicErrorMessage,
	safeDiagnosticOperation,
} from "./public-error-policy";
import type { SafeDetails } from "./safe-details";

export type AppErrorOptions = Readonly<{
	code: ErrorCode;
	message: string;
	details?: unknown;
	isOperational?: boolean;
	operation?: unknown;
	retryable?: boolean;
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
	readonly operation: string | undefined;
	readonly retryable: boolean;

	constructor(options: AppErrorOptions) {
		super(
			publicErrorMessage(options.code, options.message),
			options.cause === undefined ? undefined : { cause: options.cause },
		);
		this.name = "AppError";
		this.code = options.code;
		this.details = publicErrorDetails(options.code, options.details);
		this.isOperational =
			options.code === "INTERNAL_ERROR"
				? false
				: (options.isOperational ?? true);
		this.operation = safeDiagnosticOperation(options.operation);
		this.retryable = this.isOperational && options.retryable === true;
	}
}

export function isAppError(value: unknown): value is AppError {
	return value instanceof AppError;
}

export function isOperationalError(value: unknown): boolean {
	if (!isAppError(value)) {
		return false;
	}
	return value.isOperational;
}
