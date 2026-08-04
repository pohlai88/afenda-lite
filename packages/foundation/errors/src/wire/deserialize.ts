/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { createCanonicalFailure } from "../failure/create";
import type { Failure } from "../failure/types";
import { parseLegacyFlatFailure } from "./historical";
import { boundedWireSnapshot, parseCurrentFailureEnvelope } from "./schema";
import type { ParsedWireFailure } from "./types";

const WIRE_DESERIALIZE_OPERATION = "errors.wire.deserialize";

function internalWireFailure(): Failure<"INTERNAL_ERROR"> {
	return createCanonicalFailure("INTERNAL_ERROR", {
		operation: WIRE_DESERIALIZE_OPERATION,
	});
}

function createParsedFailure(parsed: ParsedWireFailure): Failure {
	const details =
		"details" in parsed.publicData ? parsed.publicData.details : undefined;
	const input =
		details === undefined
			? {
					operation: WIRE_DESERIALIZE_OPERATION,
					publicMessage: parsed.publicData.message,
				}
			: {
					...details,
					operation: WIRE_DESERIALIZE_OPERATION,
					publicMessage: parsed.publicData.message,
				};
	return createCanonicalFailure(parsed.code, input);
}

/** Converts untrusted process-boundary data into a new local opaque identity. */
export function deserialize(input: unknown): Failure {
	try {
		const snapshot = boundedWireSnapshot(input);
		if (snapshot === undefined) {
			return internalWireFailure();
		}
		const parsed =
			parseCurrentFailureEnvelope(snapshot) ?? parseLegacyFlatFailure(snapshot);
		return parsed === undefined
			? internalWireFailure()
			: createParsedFailure(parsed);
	} catch {
		return internalWireFailure();
	}
}
