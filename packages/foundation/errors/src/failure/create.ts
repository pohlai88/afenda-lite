/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { isCanonicalErrorCode } from "../contract/registry";
import { createPublicErrorData } from "../internal/public-error-data";
import type { CanonicalErrorCode } from "../public-types";
import { normalizeFailureContext } from "./context";
import { createFailureIdentity } from "./identity";
import type {
	Failure,
	InternalDiagnosticMetadata,
	InternalFailureRecord,
} from "./types";

export function createCanonicalFailure<Code extends CanonicalErrorCode>(
	code: Code,
	input: unknown,
): Failure<Code> {
	return createCanonicalFailureInternal(code, input);
}

export function createCanonicalFailureInternal<Code extends CanonicalErrorCode>(
	code: Code,
	input: unknown,
	privateDiagnostics?: InternalDiagnosticMetadata,
): Failure<Code> {
	if (!isCanonicalErrorCode(code)) {
		throw new TypeError("Unknown canonical error code.");
	}

	const context = normalizeFailureContext(input);
	let publicInput: unknown = input;
	if (code === "INTERNAL_ERROR") {
		publicInput =
			context.correlationId === undefined
				? undefined
				: { correlationId: context.correlationId };
	}
	const normalizedPrivateDiagnostics =
		privateDiagnostics === undefined
			? undefined
			: Object.freeze({
					source: privateDiagnostics.source,
					sqlState: privateDiagnostics.sqlState,
				});
	const record: InternalFailureRecord<Code> = Object.freeze({
		code,
		context,
		createdAt: Date.now(),
		...(normalizedPrivateDiagnostics === undefined
			? {}
			: { privateDiagnostics: normalizedPrivateDiagnostics }),
		publicData: createPublicErrorData(code, publicInput),
	});

	return createFailureIdentity(record);
}
