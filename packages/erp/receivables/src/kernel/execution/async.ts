import { errorResult, type Result } from "@afenda/errors";

export function resolveResult<T>(result: Result<T>): Promise<Result<T>> {
	return Promise.resolve(result);
}

export async function collectSequentially<T, U>(
	items: readonly T[],
	operation: (item: T) => Promise<Result<U>>,
): Promise<Result<U[]>> {
	const [item, ...remaining] = items;
	if (item === undefined) {
		return errorResult.ok([]);
	}
	const current = await operation(item);
	if (!current.ok) {
		return current;
	}
	const rest = await collectSequentially(remaining, operation);
	if (!rest.ok) {
		return rest;
	}
	return errorResult.ok([current.data, ...rest.data]);
}
