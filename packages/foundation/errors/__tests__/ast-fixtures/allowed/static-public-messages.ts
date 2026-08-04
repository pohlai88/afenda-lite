/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { errorIngress, errorResult } from "../../../src/index";

const INVOICE_NOT_EDITABLE_MESSAGE = "The invoice is no longer editable";

export const allowedStaticPublicMessages = [
	errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested invoice could not be found",
	}),
	errorResult.fail("CONFLICT", {
		publicMessage: INVOICE_NOT_EDITABLE_MESSAGE,
	}),
	errorIngress.code("VALIDATION_ERROR", {
		fieldErrors: { reference: ["Enter a valid reference"] },
		operation: "invoice.validate",
		publicMessage: "Review the highlighted fields",
	}),
];

export const allowedDirectNonCopyCapabilityCalls = [
	errorResult.ok({ id: "invoice-1" }),
	errorResult.retryAfterSeconds(30),
	errorIngress.unknown(new Error("private"), {
		operation: "fixture.unknown",
	}),
];
