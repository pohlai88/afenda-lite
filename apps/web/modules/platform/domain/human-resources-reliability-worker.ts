import { errorResult, type Result } from "@afenda/errors";
import { events } from "@afenda/events";
import {
	acknowledgeReliabilityWork,
	checkpointConnectorCursor,
	claimDueReliabilityWork,
	createHumanResourcesReliabilityCapability,
	executeReliabilityWork,
	type HrObservabilityCapabilities,
	importAttendanceEvents,
	type ReliabilityExecutionOutcome,
	type ReliabilityExecutorCapability,
	type ReliabilityKernelCapabilities,
	type ReliabilityStoreCapability,
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
	resolveReliabilityOperation,
} from "@afenda/human-resources";
import {
	processHumanResourcesBulkExportJob,
	processHumanResourcesBulkImportJob,
	purgeHumanResourcesBulkJob,
} from "@/lib/erp/human-resources-bulk-job-worker";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { publishPayrollDelivery } from "@/modules/platform/domain/human-resources-payroll-delivery";
import { createHumanResourcesPlatformEventHandlers } from "@/modules/platform/domain/human-resources-platform-events";
import { rebuildHumanResourcesEmployeeSearch } from "@/modules/platform/domain/human-resources-search-projection";
import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";

const AUTHORIZATION_OPERATION_PATTERN = /permission|authorization/;
const PRIVACY_OPERATION_PATTERN = /privacy|erase|rectify/;
const BULK_OPERATION_PATTERN = /bulk|import|export/;

export type ReliabilityOperationHandler = (
	item: ReliabilityWorkItem,
) => Promise<Result<ReliabilityExecutionOutcome>>;

export type ReliabilityOperationHandlers = Readonly<
	Record<string, ReliabilityOperationHandler>
>;

function reliabilityOperationKey(
	item: Pick<ReliabilityWorkItem, "connector" | "operation">,
) {
	return `${item.connector}.${item.operation}`;
}

export function createProductionReliabilityOperationHandlers(): ReliabilityOperationHandlers {
	return {
		"bulk.resume-import": processHumanResourcesBulkImportJob,
		"bulk.run-export": processHumanResourcesBulkExportJob,
		"bulk.purge-import": purgeHumanResourcesBulkJob,
		"bulk.purge-export": purgeHumanResourcesBulkJob,
		"attendance.pull-events": async (item) => {
			const imported = await importAttendanceEvents(
				{
					organizationId: item.organizationId,
					actorUserId: "system",
					correlationId: item.correlationId,
					batchId: item.id,
					sourceKey: item.targetId,
				},
				createHumanResourcesCommandOptions(),
			);
			return imported.ok
				? errorResult.ok({
						kind: "acknowledged",
						receiptId: `attendance:${item.id}`,
					})
				: imported;
		},
		"payroll.publish-delivery": async (item) => {
			const delivered = await publishPayrollDelivery({
				organizationId: item.organizationId,
				deliveryId: item.targetId,
				actorUserId: "system",
			});
			if (!delivered.ok) {
				return delivered;
			}
			if (delivered.data.producerReceiptId === null) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			if (delivered.data.status === "acknowledged") {
				return errorResult.ok({
					kind: "acknowledged",
					receiptId: delivered.data.producerReceiptId,
				});
			}
			return errorResult.ok({
				kind: "accepted",
				receiptId: delivered.data.producerReceiptId,
				acknowledgementDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});
		},
		"platform.dispatch-events": async (item) => {
			const dispatched = await events.dispatcher
				.create({
					handlers: createHumanResourcesPlatformEventHandlers(),
				})
				.dispatchPending({ organizationId: item.organizationId, limit: 25 });
			if (!dispatched.ok) {
				return dispatched;
			}
			if (dispatched.data.failed > 0) {
				return errorResult.fail("SERVICE_UNAVAILABLE");
			}
			return errorResult.ok({
				kind: "acknowledged",
				receiptId: `events:${item.id}:${dispatched.data.processed}`,
			});
		},
		"search.rebuild-employee-index": async (item) => {
			const rebuilt = await rebuildHumanResourcesEmployeeSearch({
				organizationId: item.organizationId,
				actorUserId: "system",
				correlationId: item.correlationId,
			});
			return rebuilt.ok
				? errorResult.ok({
						kind: "acknowledged",
						receiptId: `search:${item.id}:${rebuilt.data.projected}:${rebuilt.data.pruned}`,
					})
				: rebuilt;
		},
	};
}

export function createReliabilityOperationExecutor(
	handlers: ReliabilityOperationHandlers = createProductionReliabilityOperationHandlers(),
): ReliabilityExecutorCapability {
	return {
		async execute(item) {
			const handler = handlers[reliabilityOperationKey(item)];
			if (handler === undefined) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Reliability operation is not composed",
				});
			}
			return await handler(item);
		},
	};
}

export function createProductionReliabilityPorts(input?: {
	handlers?: ReliabilityOperationHandlers;
}): ReliabilityKernelCapabilities {
	return {
		store: createHumanResourcesReliabilityCapability(),
		clock: { now: () => new Date() },
		executor: createReliabilityOperationExecutor(input?.handlers),
		failureClassifier: {
			isRetryable: (failure) =>
				failure.code === "INTERNAL_ERROR" ||
				failure.code === "SERVICE_UNAVAILABLE",
		},
	};
}

async function recordFailureSurface(
	item: ReliabilityWorkItem,
	code: string,
	observability: HrObservabilityCapabilities,
): Promise<void> {
	const reason = classifyHrFailure(code);
	await recordHrEventFailure(
		{ eventFamily: "integration_event", reason },
		observability,
	);
	if (AUTHORIZATION_OPERATION_PATTERN.test(item.operation)) {
		await recordHrAuthorizationDenial(
			{ area: "integration", reason: "policy_denied" },
			observability,
		);
	}
	if (PRIVACY_OPERATION_PATTERN.test(item.operation)) {
		await recordHrPrivacyOperation(
			{ operation: "rectify", outcome: "failure", failureReason: reason },
			observability,
		);
	}
	if (BULK_OPERATION_PATTERN.test(item.operation)) {
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
		leaseOwner: string;
	},
	ports: ReliabilityKernelCapabilities = createProductionReliabilityPorts(),
	observability: HrObservabilityCapabilities = createProductionHrObservabilityPorts(),
): Promise<Result<ReliabilityWorkItem>> {
	const startedAt = Date.now();
	const found = await ports.store.getWorkItem(input);
	if (!found.ok) {
		return found;
	}
	if (found.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Reliability work item not found",
		});
	}
	const result = await executeReliabilityWork(input, ports);
	const failureCode = result.ok ? result.data.lastErrorCode : result.code;
	const failed = failureCode !== null;
	const reason = failed ? classifyHrFailure(failureCode) : undefined;
	await recordHrCommand(
		{
			area: "integration",
			outcome: failed ? "failure" : "success",
			durationMs: Date.now() - startedAt,
			...(reason === undefined ? {} : { failureReason: reason }),
		},
		observability,
	);
	if (failed) {
		await recordFailureSurface(found.data, failureCode, observability);
	}
	await recordHrConnectorHealth(
		{
			connector:
				found.data.connector === "platform" || found.data.connector === "bulk"
					? "notifications"
					: found.data.connector,
			health: failed ? "degraded" : "healthy",
		},
		observability,
	);
	return result;
}

export interface ReliabilitySchedulerSummary {
	awaitingAcknowledgement: number;
	claimed: number;
	deadLettered: number;
	failed: number;
	retried: number;
	succeeded: number;
	timedOut: boolean;
}

export async function runProductionReliabilityScheduler(
	input: {
		workerId: string;
		batchSize: number;
		concurrency: number;
		perOrganizationLimit: number;
		leaseDurationMs: number;
		timeBudgetMs: number;
	},
	ports: ReliabilityKernelCapabilities = createProductionReliabilityPorts(),
	observability: HrObservabilityCapabilities = createProductionHrObservabilityPorts(),
): Promise<Result<ReliabilitySchedulerSummary>> {
	const startedAt = Date.now();
	const claimed = await claimDueReliabilityWork(
		{
			workerId: input.workerId,
			now: ports.clock.now(),
			leaseDurationMs: input.leaseDurationMs,
			limit: input.batchSize,
			perOrganizationLimit: input.perOrganizationLimit,
		},
		ports.store,
	);
	if (!claimed.ok) {
		return claimed;
	}
	const claimedItems = claimed.data;
	const summary: ReliabilitySchedulerSummary = {
		claimed: claimedItems.length,
		succeeded: 0,
		awaitingAcknowledgement: 0,
		retried: 0,
		deadLettered: 0,
		failed: 0,
		timedOut: false,
	};
	let cursor = 0;
	async function consume(): Promise<void> {
		while (cursor < claimedItems.length) {
			if (Date.now() - startedAt >= input.timeBudgetMs) {
				summary.timedOut = true;
				return;
			}
			const item = claimedItems[cursor];
			cursor += 1;
			if (item === undefined) {
				return;
			}
			// biome-ignore lint/performance/noAwaitInLoops: Each consumer is serial; bounded parallelism is provided by the worker pool below.
			const result = await processReliabilityWork(
				{
					organizationId: item.organizationId,
					workItemId: item.id,
					leaseOwner: input.workerId,
				},
				ports,
				observability,
			);
			if (!result.ok) {
				summary.failed += 1;
				continue;
			}
			// biome-ignore lint/style/useDefaultSwitchClause: Reliability statuses are exhaustively accounted for.
			switch (result.data.status) {
				// biome-ignore lint/suspicious/noUnnecessaryConditions: The public kernel result can carry this persisted reliability status.
				case "succeeded":
					summary.succeeded += 1;
					break;
				// biome-ignore lint/suspicious/noUnnecessaryConditions: The public kernel result can carry this persisted reliability status.
				case "awaiting_acknowledgement":
					summary.awaitingAcknowledgement += 1;
					break;
				// biome-ignore lint/suspicious/noUnnecessaryConditions: The public kernel result can carry this persisted reliability status.
				case "pending":
					summary.retried += 1;
					break;
				// biome-ignore lint/suspicious/noUnnecessaryConditions: The public kernel result can carry this persisted reliability status.
				case "dead_lettered":
					summary.deadLettered += 1;
					break;
				// biome-ignore lint/suspicious/noUnnecessaryConditions: The public kernel result can carry this persisted reliability status.
				case "processing":
					summary.failed += 1;
					break;
			}
		}
	}
	await Promise.all(
		Array.from(
			{ length: Math.min(input.concurrency, claimedItems.length) },
			() => consume(),
		),
	);
	return errorResult.ok(summary);
}

export function acknowledgeProductionReliabilityWork(
	input: Parameters<typeof acknowledgeReliabilityWork>[0],
	ports: Pick<
		ReliabilityKernelCapabilities,
		"store" | "clock"
	> = createProductionReliabilityPorts(),
) {
	return acknowledgeReliabilityWork(input, ports);
}

export function registerProductionReliabilityWork(
	input: Parameters<typeof registerReliabilityWork>[0],
	ports: Pick<
		ReliabilityKernelCapabilities,
		"store" | "clock"
	> = createProductionReliabilityPorts(),
) {
	const definition = resolveReliabilityOperation(input);
	if (
		definition === null ||
		createProductionReliabilityOperationHandlers()[
			`${definition.connector}.${definition.operation}`
		] === undefined
	) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Reliability operation is not composed for production",
			}),
		);
	}
	return registerReliabilityWork(input, ports);
}

export function replayProductionReliabilityDeadLetter(
	input: Parameters<typeof replayDeadLetterKernel>[0],
	ports: Pick<
		ReliabilityKernelCapabilities,
		"store" | "clock"
	> = createProductionReliabilityPorts(),
) {
	return replayDeadLetterKernel(input, ports);
}

export function recoverProductionConnectorCursor(
	input: Parameters<typeof recoverConnectorCursor>[0],
	store: ReliabilityStoreCapability = createHumanResourcesReliabilityCapability(),
) {
	return recoverConnectorCursor(input, store);
}

export function checkpointProductionConnectorCursor(
	input: Parameters<typeof checkpointConnectorCursor>[0],
	ports: Pick<
		ReliabilityKernelCapabilities,
		"store" | "clock"
	> = createProductionReliabilityPorts(),
) {
	return checkpointConnectorCursor(input, ports);
}
