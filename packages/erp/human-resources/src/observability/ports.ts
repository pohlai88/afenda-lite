import type { HrMetricObservation, HrObservabilityEvent } from "./types";

export type HrObservabilityPort = {
	recordMetric(observation: HrMetricObservation): void | Promise<void>;
	recordEvent(event: HrObservabilityEvent): void | Promise<void>;
};

export type HrObservabilityClockPort = { now(): Date };

export type HrObservabilityPorts = {
	recorder: HrObservabilityPort;
	clock: HrObservabilityClockPort;
};
