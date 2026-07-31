/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	defineErrorRegistry,
	ERROR_REGISTRY,
} from "../../../src/contract/registry";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Failure,
	type Result,
} from "../../../src/index";
import type { PublicDetailsPropertyForValue } from "../../../src/public-types";

const INVOICE_NOT_EDITABLE_MESSAGE = "The invoice is no longer editable";
const MAXIMUM_UTF8_PUBLIC_MESSAGE =
	"😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀";
const retryWindow = errorResult.retryAfterSeconds(30);

export const allowedCompleteRegistry = defineErrorRegistry(ERROR_REGISTRY);

export const requiredDetailsProof: PublicDetailsPropertyForValue<
	Readonly<{ reason: string }>
> = { details: { reason: "Required details remain required" } };

export const allowedMaximumUtf8Message = errorResult.fail("BAD_REQUEST", {
	publicMessage: MAXIMUM_UTF8_PUBLIC_MESSAGE,
});

export const allowedResults = [
	errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request could not be processed",
	}),
	errorResult.fail("UNAUTHORIZED"),
	errorResult.fail("FORBIDDEN"),
	errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested invoice could not be found",
	}),
	errorResult.fail("CONFLICT", {
		publicMessage: INVOICE_NOT_EDITABLE_MESSAGE,
	}),
	errorResult.fail("CONCURRENCY_CONFLICT"),
	errorResult.fail("VALIDATION_ERROR", {
		fieldErrors: {
			email: ["Enter a valid email address", undefined],
		},
		publicMessage: "Review the highlighted fields",
	}),
	errorResult.fail("RATE_LIMITED"),
	errorResult.fail("RATE_LIMITED", { retryAfterSeconds: retryWindow }),
	errorResult.fail("INTERNAL_ERROR"),
	errorResult.fail("INTERNAL_ERROR", { correlationId: "trace-123" }),
	errorResult.fail("SERVICE_UNAVAILABLE"),
];

export const allowedFailures = [
	errorIngress.code("BAD_REQUEST", {
		operation: "request.parse",
		publicMessage: "The request could not be processed",
	}),
	errorIngress.code("UNAUTHORIZED", { operation: "session.read" }),
	errorIngress.code("FORBIDDEN", { operation: "invoice.update" }),
	errorIngress.code("NOT_FOUND", {
		operation: "invoice.read",
		publicMessage: "The requested invoice could not be found",
	}),
	errorIngress.code("CONFLICT", {
		operation: "invoice.update",
		publicMessage: INVOICE_NOT_EDITABLE_MESSAGE,
	}),
	errorIngress.code("CONCURRENCY_CONFLICT", {
		operation: "invoice.update",
	}),
	errorIngress.code("VALIDATION_ERROR", {
		fieldErrors: { reference: ["Enter a valid reference"] },
		operation: "invoice.validate",
		publicMessage: "Review the highlighted fields",
	}),
	errorIngress.code("RATE_LIMITED", {
		operation: "request.limit",
		retryAfterSeconds: retryWindow,
	}),
	errorIngress.code("INTERNAL_ERROR", {
		correlationId: "00-4bf92f3577b34da6a3ce929d0e0e4736",
		operation: "invoice.create",
	}),
	errorIngress.code("SERVICE_UNAVAILABLE", {
		operation: "invoice.create",
	}),
];

const conflictFailure: Failure<"CONFLICT"> = errorIngress.code("CONFLICT", {
	operation: "invoice.update",
	publicMessage: INVOICE_NOT_EDITABLE_MESSAGE,
});

export const trustedFailurePassThrough = errorIngress.unknown(conflictFailure, {
	operation: "invoice.catch",
});

export const projectedConflictResult = errorProject.result(conflictFailure);
export const projectedConflictHttp = errorProject.http(projectedConflictResult);
export const projectedConflictDiagnostics =
	errorProject.diagnostics(conflictFailure);

export function narrowResult(
	result: Result<{ id: string }, "NOT_FOUND" | "CONFLICT">,
): string {
	if (result.ok) {
		return result.data.id;
	}
	if (result.code === "NOT_FOUND") {
		const messageKey: "errors.notFound" = result.messageKey;
		return messageKey;
	}
	const messageKey: "errors.conflict" = result.messageKey;
	return messageKey;
}
