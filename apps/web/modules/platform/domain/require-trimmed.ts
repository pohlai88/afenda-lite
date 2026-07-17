/**
 * Shared non-empty trim gate for domain inputs (I5.6).
 * Callers pass a stable `context` so throw messages stay function-specific.
 */
export function requireTrimmed(
	value: string,
	field: string,
	context: string,
): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error(`${context} requires non-empty ${field}`);
	}
	return trimmed;
}
