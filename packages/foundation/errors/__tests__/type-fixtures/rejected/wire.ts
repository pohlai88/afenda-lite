/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import {
	errorResult,
	errorWire,
	type Failure,
	type SerializedFailureEnvelope,
} from "../../../src/index";

const success = errorResult.ok({ id: "invoice-1" });
const conflict = errorResult.fail("CONFLICT", {
	publicMessage: "The invoice is no longer editable",
});
const envelope = errorWire.serialize(conflict);

// @ts-expect-error Successful results are not failure wire values.
errorWire.serialize(success);

// @ts-expect-error Raw unknown errors must enter through errorIngress first.
errorWire.serialize(new Error("private"));

// @ts-expect-error Deserialization cannot promise a code for untrusted wire data.
export const rejectedNarrowDeserialize: Failure<"CONFLICT"> =
	errorWire.deserialize(envelope);

// @ts-expect-error The schema discriminator is immutable.
envelope.schema = "afenda.failure/v1";

export const rejectedEnvelopeCode: SerializedFailureEnvelope<"CONFLICT"> = {
	schema: "afenda.failure/v1",
	error: {
		// @ts-expect-error An envelope's code generic cannot contain another code.
		code: "INTERNAL_ERROR",
		message: "An unexpected error occurred",
		// @ts-expect-error Message keys remain bound to the envelope code generic.
		messageKey: "errors.internalError",
	},
};
