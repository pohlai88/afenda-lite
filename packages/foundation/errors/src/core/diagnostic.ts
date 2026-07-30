/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import type { ErrorCode } from "./codes";
import { normalizeUnknown } from "./normalize";

export type ErrorDiagnosticFields = Readonly<{
	code: ErrorCode;
	isOperational: boolean;
	operation?: string;
	retryable: boolean;
}>;

/** Safe structured-log fields that never include a message, cause, or stack. */
export function errorDiagnosticFields(error: unknown): ErrorDiagnosticFields {
	const normalized = normalizeUnknown(error);
	return {
		code: normalized.code,
		isOperational: normalized.isOperational,
		...(normalized.operation === undefined
			? {}
			: { operation: normalized.operation }),
		retryable: normalized.retryable,
	};
}
