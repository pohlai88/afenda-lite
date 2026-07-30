import type { HrObservabilityPorts } from "./ports";
import type {
	HrAuthorizationReason,
	HrBulkStage,
	HrConnector,
	HrConnectorHealth,
	HrEventFamily,
	HrFailureReason,
	HrObservabilityArea,
	HrOutcome,
	HrParityAdapter,
	HrPayrollDeliveryStage,
	HrPrivacyOperation,
} from "./types";

function nonNegativeFinite(value: number, label: string): number {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`${label} must be a non-negative finite number`);
	}
	return value;
}

export async function recordHrCommand(
	input: {
		area: HrObservabilityArea;
		outcome: HrOutcome;
		durationMs: number;
		failureReason?: HrFailureReason;
	},
	ports: HrObservabilityPorts,
): Promise<void> {
	if (input.outcome === "failure" && !input.failureReason) {
		throw new Error("Command failure reason is required");
	}
	await ports.recorder.recordMetric({
		name: "hr.command.total",
		kind: "counter",
		value: 1,
		labels: { area: input.area, outcome: input.outcome },
	});
	await ports.recorder.recordMetric({
		name: "hr.command.duration_ms",
		kind: "histogram",
		value: nonNegativeFinite(input.durationMs, "Command duration"),
		labels: { area: input.area, outcome: input.outcome },
	});
	if (input.outcome === "failure") {
		const { failureReason } = input;
		if (!failureReason) {
			throw new Error("Command failure reason is required");
		}
		await ports.recorder.recordEvent({
			name: "hr.command.failed",
			severity: "error",
			observedAt: ports.clock.now(),
			attributes: { area: input.area, reason: failureReason },
		});
	}
}

export async function recordHrAuthorizationDenial(
	input: { area: HrObservabilityArea; reason: HrAuthorizationReason },
	ports: HrObservabilityPorts,
): Promise<void> {
	await ports.recorder.recordMetric({
		name: "hr.authorization.denial.total",
		kind: "counter",
		value: 1,
		labels: input,
	});
	await ports.recorder.recordEvent({
		name: "hr.authorization.denied",
		severity: "warning",
		observedAt: ports.clock.now(),
		attributes: input,
	});
}

export async function recordHrPrivacyOperation(
	input: {
		operation: HrPrivacyOperation;
		outcome: HrOutcome;
		failureReason?: HrFailureReason;
	},
	ports: HrObservabilityPorts,
): Promise<void> {
	await ports.recorder.recordMetric({
		name: "hr.privacy.operation.total",
		kind: "counter",
		value: 1,
		labels: { operation: input.operation, outcome: input.outcome },
	});
	if (input.outcome === "failure") {
		if (!input.failureReason) {
			throw new Error("Privacy failure reason is required");
		}
		await ports.recorder.recordEvent({
			name: "hr.privacy.operation.failed",
			severity: "error",
			observedAt: ports.clock.now(),
			attributes: { operation: input.operation, reason: input.failureReason },
		});
	}
}

export async function recordHrOutboxLag(
	input: { eventFamily: HrEventFamily; lagMs: number },
	ports: HrObservabilityPorts,
): Promise<void> {
	await ports.recorder.recordMetric({
		name: "hr.outbox.lag_ms",
		kind: "gauge",
		value: nonNegativeFinite(input.lagMs, "Outbox lag"),
		labels: { eventFamily: input.eventFamily },
	});
}

export async function recordHrEventFailure(
	input: { eventFamily: HrEventFamily; reason: HrFailureReason },
	ports: HrObservabilityPorts,
): Promise<void> {
	await ports.recorder.recordMetric({
		name: "hr.event.failure.total",
		kind: "counter",
		value: 1,
		labels: input,
	});
	await ports.recorder.recordEvent({
		name: "hr.event.failed",
		severity: "error",
		observedAt: ports.clock.now(),
		attributes: input,
	});
}

export async function recordHrParityFailure(
	input: { area: HrObservabilityArea; adapter: HrParityAdapter },
	ports: HrObservabilityPorts,
): Promise<void> {
	await ports.recorder.recordMetric({
		name: "hr.parity.failure.total",
		kind: "counter",
		value: 1,
		labels: input,
	});
	await ports.recorder.recordEvent({
		name: "hr.parity.failed",
		severity: "error",
		observedAt: ports.clock.now(),
		attributes: input,
	});
}

export async function recordHrConnectorHealth(
	input: { connector: HrConnector; health: HrConnectorHealth },
	ports: HrObservabilityPorts,
): Promise<void> {
	let value: 0 | 0.5 | 1 = 0;
	if (input.health === "healthy") {
		value = 1;
	} else if (input.health === "degraded") {
		value = 0.5;
	}
	await ports.recorder.recordMetric({
		name: "hr.connector.health",
		kind: "gauge",
		value,
		labels: { connector: input.connector },
	});
	if (input.health !== "healthy") {
		await ports.recorder.recordEvent({
			name: "hr.connector.unhealthy",
			severity: input.health === "degraded" ? "warning" : "error",
			observedAt: ports.clock.now(),
			attributes: { connector: input.connector, health: input.health },
		});
	}
}

export async function recordHrBulkError(
	input: { stage: HrBulkStage; reason: HrFailureReason },
	ports: HrObservabilityPorts,
): Promise<void> {
	await ports.recorder.recordMetric({
		name: "hr.bulk.error.total",
		kind: "counter",
		value: 1,
		labels: input,
	});
	await ports.recorder.recordEvent({
		name: "hr.bulk.failed",
		severity: "error",
		observedAt: ports.clock.now(),
		attributes: input,
	});
}

export async function recordHrPayrollDeliveryFailure(
	input: { stage: HrPayrollDeliveryStage; reason: HrFailureReason },
	ports: HrObservabilityPorts,
): Promise<void> {
	await ports.recorder.recordMetric({
		name: "hr.payroll_delivery.failure.total",
		kind: "counter",
		value: 1,
		labels: input,
	});
	await ports.recorder.recordEvent({
		name: "hr.payroll_delivery.failed",
		severity: "error",
		observedAt: ports.clock.now(),
		attributes: input,
	});
}
