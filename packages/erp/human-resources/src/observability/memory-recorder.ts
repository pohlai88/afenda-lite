import type { HrObservabilityPort } from "./ports";
import type { HrMetricObservation, HrObservabilityEvent } from "./types";
import { assertSafeHrEvent, assertSafeHrMetric } from "./validation";

export function createMemoryHrObservabilityRecorder(): HrObservabilityPort & {
	metrics: HrMetricObservation[];
	events: HrObservabilityEvent[];
	clear(): void;
} {
	const metrics: HrMetricObservation[] = [];
	const events: HrObservabilityEvent[] = [];
	return {
		metrics,
		events,
		recordMetric(observation) {
			assertSafeHrMetric(observation);
			metrics.push(structuredClone(observation));
		},
		recordEvent(event) {
			assertSafeHrEvent(event);
			events.push(structuredClone(event));
		},
		clear() {
			metrics.length = 0;
			events.length = 0;
		},
	};
}
