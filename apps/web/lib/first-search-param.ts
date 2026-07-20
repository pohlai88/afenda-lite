/**
 * First non-empty string from a Next.js searchParams value.
 */
export function firstSearchParam(
	value: string | string[] | undefined,
): string | undefined {
	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	if (
		Array.isArray(value) &&
		typeof value[0] === "string" &&
		value[0].length > 0
	) {
		return value[0];
	}
	return undefined;
}
