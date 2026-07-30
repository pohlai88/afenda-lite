import type { HrMetricObservation, HrObservabilityEvent } from "./types";

export interface HrObservabilityPort {
	recordEvent: (event: HrObservabilityEvent) => void | Promise<void>;
	recordMetric: (observation: HrMetricObservation) => void | Promise<void>;
}

export interface HrObservabilityClockPort {
	now: () => Date;
}

export interface HrObservabilityPorts {
	clock: HrObservabilityClockPort;
	recorder: HrObservabilityPort;
}
