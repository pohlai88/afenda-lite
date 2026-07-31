/**
 * Shared non-empty trim gate for domain inputs (I5.6).
 * Callers pass a stable `context` so throw messages stay function-specific.
 */
import { errorIngress } from "@afenda/errors";

export function requireTrimmed(
	value: string,
	_field: string,
	_context: string,
): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw errorIngress.code("BAD_REQUEST", {
			operation: "web.require-trimmed",
			publicMessage: "A required value is empty",
		});
	}
	return trimmed;
}
