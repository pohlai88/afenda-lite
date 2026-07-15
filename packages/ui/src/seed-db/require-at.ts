/**
 * Indexed seed access under strict `noUncheckedIndexedAccess`.
 */
export function requireAt<T>(
	items: readonly T[],
	index: number,
	label: string,
): T {
	const value = items[index];
	if (value === undefined) {
		throw new Error(`Missing ${label} at index ${index}`);
	}
	return value;
}
