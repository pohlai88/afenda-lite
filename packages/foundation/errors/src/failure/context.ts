/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { readProperty } from "../internal/object";
import {
	normalizeCorrelationId,
	normalizeOperation,
} from "../security/normalize";
import type { NormalizedFailureContext } from "./types";

export function normalizeFailureContext(
	input: unknown,
): NormalizedFailureContext {
	const operation = normalizeOperation(readProperty(input, "operation"));
	const correlationId = normalizeCorrelationId(
		readProperty(input, "correlationId"),
	);

	return Object.freeze(
		correlationId === undefined ? { operation } : { correlationId, operation },
	);
}
