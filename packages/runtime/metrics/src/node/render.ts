import { prometheusContentType } from "prom-client";

import { getDefaultMetricsRegistry } from "./registry";
import type { MetricsRegistryBundle } from "./types";

/** Prometheus text exposition content type from `prom-client`. */
export const PROMETHEUS_CONTENT_TYPE = prometheusContentType;

/** Render Prometheus exposition text for the given (or default) registry. */
export async function renderPrometheusText(
	registry?: MetricsRegistryBundle,
): Promise<string> {
	const bundle = registry ?? getDefaultMetricsRegistry();
	return bundle.registry.metrics();
}
