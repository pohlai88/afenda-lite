import {
	assertSafeHrEvent,
	assertSafeHrMetric,
	type HrFailureReason,
	type HrMetricObservation,
	type HrObservabilityEvent,
	type HrObservabilityPort,
	type HrObservabilityPorts,
} from "@afenda/human-resources";

import { logProductEvent } from "@/modules/platform/observability/product-log";

export interface HrTelemetrySinkPort {
	write: (input: {
		level: "info" | "warn" | "error";
		event: string;
		code: string;
	}) => void;
}

function labelCode(values: Record<string, string>): string {
	return Object.values(values).join(":");
}

export function createProductionHrObservabilityRecorder(
	sink: HrTelemetrySinkPort = {
		write(input) {
			logProductEvent({
				level: input.level,
				event: input.event,
				code: input.code,
				correlationId: "hr-runtime",
			});
		},
	},
): HrObservabilityPort {
	return {
		recordMetric(observation: HrMetricObservation) {
			assertSafeHrMetric(observation);
			sink.write({
				level: "info",
				event: `metric.${observation.name}`,
				code: `${observation.kind}:${labelCode(observation.labels)}`,
			});
		},
		recordEvent(event: HrObservabilityEvent) {
			assertSafeHrEvent(event);
			sink.write({
				level: event.severity === "warning" ? "warn" : "error",
				event: event.name,
				code: labelCode(event.attributes),
			});
		},
	};
}

export function createProductionHrObservabilityPorts(
	recorder: HrObservabilityPort = createProductionHrObservabilityRecorder(),
): HrObservabilityPorts {
	return { recorder, clock: { now: () => new Date() } };
}

export function classifyHrFailure(code: string): HrFailureReason {
	switch (code) {
		case "VALIDATION_ERROR":
			return "validation";
		case "FORBIDDEN":
			return "authorization";
		case "CONFLICT":
			return "conflict";
		case "NOT_FOUND":
			return "not_found";
		case "SERVICE_UNAVAILABLE":
			return "unavailable";
		case "INTERNAL_ERROR":
			return "persistence";
		default:
			return "unknown";
	}
}
