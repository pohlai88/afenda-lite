import type { Result } from "@afenda/errors";

export function resolveOperation<T>(
	operation: () => Result<T>,
): Promise<Result<T>> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}
