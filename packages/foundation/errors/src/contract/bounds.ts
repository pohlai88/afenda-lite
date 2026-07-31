/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

/** Closed public and wire bounds for the canonical error contract. */
export const ERROR_LIMITS = Object.freeze({
	correlationIdCharacters: 128,
	fieldCount: 50,
	fieldInputKeys: 200,
	fieldInputMessagesPerField: 100,
	fieldMessageCharacters: 300,
	fieldMessagesPerField: 10,
	fieldNameCharacters: 100,
	messageKeyCharacters: 120,
	operationCharacters: 120,
	publicDetailsBytes: 16_384,
	publicMessageBytes: 2000,
	publicMessageCharacters: 500,
	retryAfterSecondsMaximum: 86_400,
	retryAfterSecondsMinimum: 1,
	textInputCodeUnitsPerCharacter: 4,
	wireBytes: 32_768,
	wireDepth: 6,
	wireKeys: 64,
} as const);

/** Static registry keys use a namespaced, lower-camel dotted vocabulary. */
export const MESSAGE_KEY_PATTERN =
	/^errors\.[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)*$/u;

/** Operation names are stable machine labels such as `invoice.create`. */
export const OPERATION_PATTERN = /^[A-Za-z][A-Za-z0-9._:/-]*$/u;

/**
 * Correlation references accept UUIDs, W3C trace identifiers, and common
 * provider trace identifiers without accepting whitespace or control data.
 */
export const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u;

export function isValidMessageKey(value: unknown): value is `errors.${string}` {
	return (
		typeof value === "string" &&
		value.length <= ERROR_LIMITS.messageKeyCharacters &&
		MESSAGE_KEY_PATTERN.test(value)
	);
}
