/**
 * Universal metric constants - no runtime dependencies.
 */

/** Default Prometheus `service` label for Afenda-Lite Node surfaces. */
export const DEFAULT_METRICS_SERVICE = "afenda-web" as const;

/** HTTP latency buckets (seconds) — borrowed from Vierp DNA, tunable. */
export const HTTP_DURATION_BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 2, 5] as const;

/** DB latency buckets (seconds) — borrowed from Vierp DNA, tunable. */
export const DB_DURATION_BUCKETS = [
	0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1,
] as const;
