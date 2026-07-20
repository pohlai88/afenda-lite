export const SERVER_TIMING_HEADER = "Server-Timing" as const;

const DEFAULT_METRIC_NAME = "app";

/**
 * Attach `Server-Timing` duration from a start timestamp (ms) to now.
 * Metric name defaults to `app` — keep names short and non-secret.
 */
export function applyServerTimingHeader(
	headers: Headers,
	startTimeMs: number,
	options?: { readonly metric?: string; readonly nowMs?: number },
): void {
	if (!Number.isFinite(startTimeMs)) {
		return;
	}
	const nowMs = options?.nowMs ?? Date.now();
	if (!Number.isFinite(nowMs) || nowMs < startTimeMs) {
		return;
	}
	const metric = options?.metric?.trim() || DEFAULT_METRIC_NAME;
	const durationMs = Math.max(0, nowMs - startTimeMs);
	// One decimal keeps the header compact without inventing fake precision.
	const dur = (Math.round(durationMs * 10) / 10).toFixed(1);
	headers.set(SERVER_TIMING_HEADER, `${metric};dur=${dur}`);
}
