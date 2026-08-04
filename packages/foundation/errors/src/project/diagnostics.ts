/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { getErrorDefinition } from "../contract/registry";
import { isTrustedFailure, readFailureRecord } from "../failure/identity";
import type { Failure } from "../failure/types";
import type { CanonicalErrorCode } from "../public-types";

export type ErrorDiagnosticFields<
	Code extends CanonicalErrorCode = CanonicalErrorCode,
> = Readonly<{
	code: Code;
	isOperational: boolean;
	operation?: string;
	retryable: boolean;
	source?: "postgres";
	sqlState?: string;
}>;

/** Projects bounded operational evidence from an opaque trusted Failure. */
export function diagnostics<Code extends CanonicalErrorCode>(
	failure: Failure<Code>,
): ErrorDiagnosticFields<Code> {
	if (!isTrustedFailure(failure)) {
		throw new TypeError("Diagnostic projection requires a trusted failure.");
	}

	const record = readFailureRecord(failure);
	const definition = getErrorDefinition(record.code);
	return Object.freeze({
		code: record.code,
		isOperational: definition.operations.operational,
		...(record.context.operation === "unknown"
			? {}
			: { operation: record.context.operation }),
		...(record.privateDiagnostics === undefined
			? {}
			: {
					source: record.privateDiagnostics.source,
					sqlState: record.privateDiagnostics.sqlState,
				}),
		retryable: definition.retry.retryable,
	});
}
