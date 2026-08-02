import type { HrMetricObservation, HrObservabilityEvent } from "./types";

const FORBIDDEN_ATTRIBUTE_KEY =
	/(organization|correlation|employee|user|email|name|message|payload|secret|token|identifier|\bid\b)/i;

function assertBoundedAttributes(attributes: Record<string, unknown>): void {
	const entries = Object.entries(attributes);
	if (entries.length > 2) {
		throw new Error("HR observability labels must contain at most two entries");
	}
	for (const [key, value] of entries) {
		if (FORBIDDEN_ATTRIBUTE_KEY.test(key)) {
			throw new Error(
				"HR observability labels cannot contain identifiers or PII",
			);
		}
		if (typeof value !== "string" || value.length === 0 || value.length > 32) {
			throw new Error("HR observability label values must be bounded strings");
		}
	}
}

export function assertSafeHrMetric(observation: HrMetricObservation): void {
	if (!Number.isFinite(observation.value) || observation.value < 0) {
		throw new Error(
			"HR observability metric values must be non-negative and finite",
		);
	}
	if (observation.kind === "counter" && observation.value !== 1) {
		throw new Error(
			"HR observability counter observations must increment by one",
		);
	}
	assertBoundedAttributes(observation.labels);
}

export function assertSafeHrEvent(event: HrObservabilityEvent): void {
	if (Number.isNaN(event.observedAt.getTime())) {
		throw new Error("HR observability event timestamp is invalid");
	}
	assertBoundedAttributes(event.attributes);
}
