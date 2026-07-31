import { HTTP_SEMANTIC_REGISTRY } from "./semantic-registry";

const METRIC_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

function normalizeMetricName(metric: string | undefined): string {
	const normalized =
		metric?.trim() || HTTP_SEMANTIC_REGISTRY.serverTiming.defaultMetric;
	if (!METRIC_NAME_PATTERN.test(normalized)) {
		throw new RangeError(
			"@afenda/http Server-Timing metric must be a safe token",
		);
	}
	return normalized;
}

export function applyServerTimingHeader(
	headers: Headers,
	startTimeMs: number,
	options?: { readonly metric?: string; readonly nowMs?: number },
): void {
	if (!Number.isFinite(startTimeMs)) {
		throw new RangeError("@afenda/http Server-Timing start must be finite");
	}
	const nowMs = options?.nowMs ?? Date.now();
	if (!Number.isFinite(nowMs) || nowMs < startTimeMs) {
		throw new RangeError(
			"@afenda/http Server-Timing end must be finite and not precede start",
		);
	}
	const duration = (Math.round((nowMs - startTimeMs) * 10) / 10).toFixed(1);
	headers.set(
		HTTP_SEMANTIC_REGISTRY.headers.serverTiming,
		`${normalizeMetricName(options?.metric)};dur=${duration}`,
	);
}
