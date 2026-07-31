import { errorIngress } from "@afenda/errors";

export function cacheUnavailable(): never {
	throw errorIngress.code("SERVICE_UNAVAILABLE", {
		operation: "cache.backend",
	});
}

export function cacheInvalid(_cause: unknown): never {
	throw errorIngress.code("VALIDATION_ERROR", {
		fieldErrors: {
			value: ["Cache value must be JSON serializable"],
		},
		operation: "cache.input",
		publicMessage: "The cache value is invalid",
	});
}

export async function normalizeCacheOperation<T>(
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof TypeError) {
			cacheInvalid(error);
		}
		cacheUnavailable();
	}
}
