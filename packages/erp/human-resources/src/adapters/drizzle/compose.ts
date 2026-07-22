type UnionToIntersection<T> = (
	T extends unknown
		? (value: T) => void
		: never
) extends (value: infer I) => void
	? I
	: never;

export function composeStoreSlices<const T extends readonly object[]>(
	...slices: T
): UnionToIntersection<T[number]> {
	const result: Record<string, unknown> = {};

	for (const slice of slices) {
		for (const [methodName, implementation] of Object.entries(slice)) {
			if (Object.hasOwn(result, methodName)) {
				throw new Error(
					`Duplicate Human Resources store method: ${methodName}`,
				);
			}

			result[methodName] = implementation;
		}
	}

	return result as UnionToIntersection<T[number]>;
}
