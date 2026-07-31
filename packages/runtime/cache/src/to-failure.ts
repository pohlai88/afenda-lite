import { errorIngress, type Failure } from "@afenda/errors";

import type { CacheUnavailableFailure } from "./types";

/** Map cache unavailability into the canonical opaque failure boundary. */
export function toCacheFailure(
	_result: CacheUnavailableFailure,
): Failure<"SERVICE_UNAVAILABLE"> {
	return errorIngress.code("SERVICE_UNAVAILABLE", {
		operation: "cache.resolve",
	});
}
