/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { isTrustedFailure, readFailureRecord } from "../failure/identity";
import type { Failure } from "../failure/types";
import type {
	CanonicalErrorCode,
	PublicErrorData,
	ResultFailure,
} from "../public-types";
import { boundedWireSnapshot, parseResultFailure } from "./schema";
import { FAILURE_WIRE_SCHEMA, type SerializedFailureEnvelope } from "./types";

const INVALID_SERIALIZATION_MESSAGE =
	"Wire serialization requires a canonical failure.";

function publicDataForSerialization(
	input: unknown,
): PublicErrorData | undefined {
	if (isTrustedFailure(input)) {
		return readFailureRecord(input).publicData;
	}
	const snapshot = boundedWireSnapshot(input);
	return snapshot === undefined
		? undefined
		: parseResultFailure(snapshot)?.publicData;
}

export function serialize<const Code extends CanonicalErrorCode>(
	input: Failure<Code> | ResultFailure<Code>,
): SerializedFailureEnvelope<Code> {
	const publicData = publicDataForSerialization(input);
	if (publicData === undefined) {
		throw new TypeError(INVALID_SERIALIZATION_MESSAGE);
	}
	const envelope = Object.freeze({
		error: publicData,
		schema: FAILURE_WIRE_SCHEMA,
	});
	if (boundedWireSnapshot(envelope) === undefined) {
		throw new TypeError(INVALID_SERIALIZATION_MESSAGE);
	}
	return envelope as SerializedFailureEnvelope<Code>;
}
