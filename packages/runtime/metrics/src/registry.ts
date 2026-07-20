import { collectDefaultMetrics, Registry } from "prom-client";

import {
	createCacheInstruments,
	createDbInstruments,
	createHttpInstruments,
} from "./instruments";
import {
	type CreateMetricsRegistryOptions,
	DEFAULT_METRICS_SERVICE,
	type MetricsRegistryBundle,
} from "./types";

let defaultBundle: MetricsRegistryBundle | undefined;

/**
 * Build an isolated Prometheus registry + predeclared instruments.
 * Prefer this in tests; product Node paths use `getDefaultMetricsRegistry()`.
 */
export function createMetricsRegistry(
	options?: CreateMetricsRegistryOptions,
): MetricsRegistryBundle {
	const service = options?.service ?? DEFAULT_METRICS_SERVICE;
	const registry = new Registry();

	if (options?.collectDefaults !== false) {
		collectDefaultMetrics({ register: registry });
	}

	const http = createHttpInstruments(registry);
	const db = createDbInstruments(registry);
	const cache = createCacheInstruments(registry);

	return {
		registry,
		service,
		httpRequestDuration: http.httpRequestDuration,
		httpRequestTotal: http.httpRequestTotal,
		dbQueryDuration: db.dbQueryDuration,
		cacheAccessTotal: cache.cacheAccessTotal,
	};
}

/** Process-wide default registry for Node product paths (lazy). */
export function getDefaultMetricsRegistry(): MetricsRegistryBundle {
	if (defaultBundle === undefined) {
		defaultBundle = createMetricsRegistry();
	}
	return defaultBundle;
}

/** Test-only reset so specs do not share instrument state. */
export function resetDefaultMetricsRegistryForTests(): void {
	defaultBundle = undefined;
}
