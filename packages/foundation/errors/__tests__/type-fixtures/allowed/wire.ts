/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	errorIngress,
	errorResult,
	errorWire,
	type Failure,
	type SerializedFailureEnvelope,
} from "../../../src/index";

const result = errorResult.fail("CONFLICT", {
	publicMessage: "The invoice is no longer editable",
});
const failure = errorIngress.code("NOT_FOUND", {
	operation: "invoice.read",
	publicMessage: "The requested invoice was not found",
});

export const resultEnvelope: SerializedFailureEnvelope<"CONFLICT"> =
	errorWire.serialize(result);
export const failureEnvelope: SerializedFailureEnvelope<"NOT_FOUND"> =
	errorWire.serialize(failure);
export const exactResultCode: "CONFLICT" = resultEnvelope.error.code;
export const exactFailureCode: "NOT_FOUND" = failureEnvelope.error.code;
export const deserializedFailure: Failure =
	errorWire.deserialize(resultEnvelope);
