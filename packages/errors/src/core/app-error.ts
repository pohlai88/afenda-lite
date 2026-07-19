import type { ErrorCode } from "./codes";

export type AppErrorOptions = {
	code: ErrorCode;
	message: string;
	details?: Readonly<Record<string, unknown>>;
	isOperational?: boolean;
	cause?: unknown;
};

/**
 * Transport-neutral application error.
 * Public clients must use `serializeAppError` — never expose `cause` / stack.
 */
export class AppError extends Error {
	readonly code: ErrorCode;
	readonly details: Readonly<Record<string, unknown>> | undefined;
	readonly isOperational: boolean;
	override readonly cause: unknown;

	constructor(options: AppErrorOptions) {
		super(
			options.message,
			options.cause === undefined ? undefined : { cause: options.cause },
		);
		this.name = "AppError";
		this.code = options.code;
		this.details = options.details;
		this.isOperational = options.isOperational ?? true;
		this.cause = options.cause;
	}
}

export function isAppError(value: unknown): value is AppError {
	return value instanceof AppError;
}

export function isOperationalError(value: unknown): boolean {
	return isAppError(value) && value.isOperational;
}
