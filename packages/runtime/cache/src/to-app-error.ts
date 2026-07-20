import { type AppError, serviceUnavailable } from "@afenda/errors";

import type { CacheUnavailableFailure } from "./types";

/** Map a cache unavailable failure to the shared AppError vocabulary. */
export function toCacheAppError(result: CacheUnavailableFailure): AppError {
	return serviceUnavailable(result.service);
}
