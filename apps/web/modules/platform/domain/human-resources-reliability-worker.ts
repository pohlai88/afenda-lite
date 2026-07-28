import { ok, type Result } from "@afenda/errors/result";
import {
	createEventPublisher,
	type EventPublisher,
	PLATFORM_HUMAN_RESOURCES_RELIABILITY_WORK_REQUESTED_EVENT,
} from "@afenda/events";
import {
	checkpointConnectorCursor,
	decidePartialOutage,
	executeReliabilityWork,
	type HrConnector,
	type HrObservabilityPorts,
	type OutageDependency,
	type ReliabilityExecutorPort,
	type ReliabilityKernelPorts,
	type ReliabilityStorePort,
	type ReliabilityWorkItem,
	recordHrAuthorizationDenial,
	recordHrBulkError,
	recordHrCommand,
	recordHrConnectorHealth,
	recordHrEventFailure,
	recordHrPayrollDeliveryFailure,
	recordHrPrivacyOperation,
	recoverConnectorCursor,
	registerReliabilityWork,
	replayDeadLetter as replayDeadLetterKernel,
} from "@afenda/human-resources";
import { createDrizzleReliabilityStore } from "@afenda/human-resources/adapters/drizzle";

import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";

export function createReliabilityEventExecutor(
	publisher: Pick<EventPublisher, "publish"> = createEventPublisher(),
	actorUserId = "system",
): ReliabilityExecutorPort {
	return {
		async execute(item) {
			const published = await publisher.publish({
				type: PLATFORM_HUMAN_RESOURCES_RELIABILITY_WORK_REQUESTED_EVENT,
				sourceModule: "platform",
				deduplicationKey: `reliability:${item.id}:${item.requestFingerprint}`,
				organizationId: item.organizationId,
				actorUserId,
				correlationId: item.correlationId,
				causationId: item.id,
				payload: {
					workItemId: item.id,
					organizationId: item.organizationId,
					connector: item.connector,
					operation: item.operation,
					requestFingerprint: item.requestFingerprint,
					attempt: item.attemptCount + 1,
				},
				metadata: { integration: "human-resources-reliability" },
			});
			if (!published.ok) return published;
			if (published.data.organizationId !== item.organizationId) {
				return {
					ok: false,
					code: "INTERNAL_ERROR",
					message: "Reliability executor returned another tenant",
				};
			}
			return ok({ receiptId: published.data.id });
		},
	};
}

export function createProductionReliabilityPorts(input?: {
	publisher?: Pick<EventPublisher, "publish">;
	actorUserId?: string;
}): ReliabilityKernelPorts {
	return {
		store: createDrizzleReliabilityStore(),
		clock: { now: () => new Date() },
		executor: createReliabilityEventExecutor(
			input?.publisher,
			input?.actorUserId,
		),
		failureClassifier: {
			isRetryable: (failure) =>
				failure.code === "INTERNAL_ERROR" ||
				failure.code === "SERVICE_UNAVAILABLE",
		},
	};
}

function isObservableConnector(value: string): value is HrConnector {
	switch (value) {
		case "payroll":
		case "benefits":
		case "identity":
		case "documents":
		case "notifications":
		case "search":
			return true;
		default:
			return false;
	}
}

async function observeDependencyHealth(
	dependencies: readonly OutageDependency[],
	observability: HrObservabilityPorts,
): Promise<void> {
	for (const dependency of dependencies) {
		if (!isObservableConnector(dependency.name)) continue;
		await recordHrConnectorHealth(
			{ connector: dependency.name, health: dependency.health },
			observability,
		);
	}
}

async function recordFailureSurface(
	item: ReliabilityWorkItem,
	code: string,
	observability: HrObservabilityPorts,
): Promise<void> {
	const reason = classifyHrFailure(code);
	await recordHrEventFailure(
		{ eventFamily: "integration_event", reason },
		observability,
	);
	if (/permission|authorization/.test(item.operation)) {
		await recordHrAuthorizationDenial(
			{ area: "integration", reason: "policy_denied" },
			observability,
		);
	}
	if (/privacy|erase|rectify/.test(item.operation)) {
		await recordHrPrivacyOperation(
			{ operation: "rectify", outcome: "failure", failureReason: reason },
			observability,
		);
	}
	if (/bulk|import|export/.test(item.operation)) {
		await recordHrBulkError({ stage: "commit", reason }, observability);
	}
	if (item.connector === "payroll") {
		await recordHrPayrollDeliveryFailure(
			{ stage: "publish", reason },
			observability,
		);
	}
}

export async function processReliabilityWork(
	input: {
		organizationId: string;
		workItemId: string;
		dependencies?: readonly OutageDependency[];
	},
	ports: ReliabilityKernelPorts = createProductionReliabilityPorts(),
	observability: HrObservabilityPorts = createProductionHrObservabilityPorts(),
): Promise<Result<ReliabilityWorkItem>> {
	const startedAt = Date.now();
	const dependencies = input.dependencies ?? [];
	await observeDependencyHealth(dependencies, observability);
	const outage = decidePartialOutage(dependencies);
	if (outage.action === "pause") {
		await recordHrCommand(
			{
				area: "integration",
				outcome: "failure",
				durationMs: Date.now() - startedAt,
				failureReason: "unavailable",
			},
			observability,
		);
		return {
			ok: false,
			code: "SERVICE_UNAVAILABLE",
			message: "Required Human Resources integration is unavailable",
		};
	}
	const found = await ports.store.getWorkItem(input);
	if (!found.ok) return found;
	if (found.data === null)
		return {
			ok: false,
			code: "NOT_FOUND",
			message: "Reliability work item not found",
		};
	const result = await executeReliabilityWork(input, ports);
	const failureCode = result.ok ? result.data.lastErrorCode : result.code;
	const failed = failureCode !== null;
	const reason = failed ? classifyHrFailure(failureCode) : undefined;
	await recordHrCommand(
		{
			area: "integration",
			outcome: failed ? "failure" : "success",
			durationMs: Date.now() - startedAt,
			failureReason: reason,
		},
		observability,
	);
	if (failed)
		await recordFailureSurface(found.data, failureCode, observability);
	return result;
}

export function registerProductionReliabilityWork(
	input: Parameters<typeof registerReliabilityWork>[0],
	ports: Pick<
		ReliabilityKernelPorts,
		"store" | "clock"
	> = createProductionReliabilityPorts(),
) {
	return registerReliabilityWork(input, ports);
}

export function replayProductionReliabilityDeadLetter(
	input: Parameters<typeof replayDeadLetterKernel>[0],
	ports: Pick<
		ReliabilityKernelPorts,
		"store" | "clock"
	> = createProductionReliabilityPorts(),
) {
	return replayDeadLetterKernel(input, ports);
}

export function recoverProductionConnectorCursor(
	input: Parameters<typeof recoverConnectorCursor>[0],
	store: ReliabilityStorePort = createDrizzleReliabilityStore(),
) {
	return recoverConnectorCursor(input, store);
}

export function checkpointProductionConnectorCursor(
	input: Parameters<typeof checkpointConnectorCursor>[0],
	ports: Pick<
		ReliabilityKernelPorts,
		"store" | "clock"
	> = createProductionReliabilityPorts(),
) {
	return checkpointConnectorCursor(input, ports);
}
