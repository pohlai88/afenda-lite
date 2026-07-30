import { ok, type Result } from "@afenda/errors/result";

export function resolveOperation<T>(
	operation: () => Result<T>,
): Promise<Result<T>> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

export async function collectSequentially<T, U>(
	items: readonly T[],
	operation: (item: T) => Promise<Result<U>>,
): Promise<Result<U[]>> {
	const [item, ...remaining] = items;
	if (item === undefined) {
		return ok([]);
	}
	const current = await operation(item);
	if (!current.ok) {
		return current;
	}
	const rest = await collectSequentially(remaining, operation);
	if (!rest.ok) {
		return rest;
	}
	return ok([current.data, ...rest.data]);
}
