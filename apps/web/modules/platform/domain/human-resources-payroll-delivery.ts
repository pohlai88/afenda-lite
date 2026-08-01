import { errorResult, type Result } from "@afenda/errors";
import { type EventPublisher, events } from "@afenda/events";
import { PLATFORM_HUMAN_RESOURCES_PAYROLL_DELIVERY_REQUESTED_EVENT } from "@afenda/events/schemas";
import {
	createHumanResourcesPayrollDeliveryCapability,
	deliverPayrollHandoff as deliverPayrollHandoffWorkflow,
	type HrObservabilityCapabilities,
	type PayrollDeliveryCapabilities,
	type PayrollDeliveryProducerCapability,
	type PayrollDeliveryRecord,
	recordHrPayrollDeliveryFailure,
	recordPayrollDeliveryFeedback as recordPayrollDeliveryFeedbackWorkflow,
} from "@afenda/human-resources";

import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";

export function createPayrollDeliveryEventProducer(
	publisher: Pick<EventPublisher, "publish"> = events.publisher.create(),
	actorUserId = "system",
	observability: HrObservabilityCapabilities = createProductionHrObservabilityPorts(),
): PayrollDeliveryProducerCapability {
	return {
		async publish(input) {
			const published = await publisher.publish({
				type: PLATFORM_HUMAN_RESOURCES_PAYROLL_DELIVERY_REQUESTED_EVENT,
				sourceModule: "platform",
				deduplicationKey: `payroll-delivery:${input.deliveryId}:${input.payloadHash}`,
				organizationId: input.organizationId,
				actorUserId,
				correlationId: input.correlationId,
				causationId: input.deliveryId,
				payload: input,
				metadata: { integration: "human-resources-payroll-delivery" },
			});
			if (!published.ok) {
				await recordHrPayrollDeliveryFailure(
					{ stage: "publish", reason: classifyHrFailure(published.code) },
					observability,
				);
				return published;
			}
			if (published.data.organizationId !== input.organizationId) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({ receiptId: published.data.id });
		},
	};
}

export function createProductionPayrollDeliveryPorts(
	publisher?: Pick<EventPublisher, "publish">,
	actorUserId = "system",
	observability?: HrObservabilityCapabilities,
): PayrollDeliveryCapabilities {
	return {
		store: createHumanResourcesPayrollDeliveryCapability(),
		producer: createPayrollDeliveryEventProducer(
			publisher,
			actorUserId,
			observability,
		),
		clock: { now: () => new Date() },
	};
}

export async function publishPayrollDelivery(
	input: { organizationId: string; deliveryId: string; actorUserId: string },
	ports?: PayrollDeliveryCapabilities,
): Promise<Result<PayrollDeliveryRecord>> {
	const composed =
		ports ?? createProductionPayrollDeliveryPorts(undefined, input.actorUserId);
	const found = await composed.store.getById(input);
	if (!found.ok) {
		return found;
	}
	if (found.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payroll delivery not found",
		});
	}
	return deliverPayrollHandoffWorkflow(
		{ ...input, correlationId: found.data.correlationId },
		composed,
	);
}

export async function recordPayrollDeliveryFeedback(
	input: {
		organizationId: string;
		deliveryId: string;
		actorUserId: string;
		status: "acknowledged" | "rejected" | "correction_required";
		reason?: string;
	},
	ports?: PayrollDeliveryCapabilities,
): Promise<Result<PayrollDeliveryRecord>> {
	const composed =
		ports ?? createProductionPayrollDeliveryPorts(undefined, input.actorUserId);
	const found = await composed.store.getById(input);
	if (!found.ok) {
		return found;
	}
	if (found.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payroll delivery not found",
		});
	}
	return recordPayrollDeliveryFeedbackWorkflow(
		{ ...input, correlationId: found.data.correlationId },
		composed,
	);
}

export async function recoverPendingPayrollDeliveries(
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		limit: number;
	},
	ports?: PayrollDeliveryCapabilities,
): Promise<Result<readonly PayrollDeliveryRecord[]>> {
	const composed =
		ports ?? createProductionPayrollDeliveryPorts(undefined, input.actorUserId);
	const pending = await composed.store.listPending({
		organizationId: input.organizationId,
		limit: input.limit,
	});
	if (!pending.ok) {
		return pending;
	}
	const recovered: PayrollDeliveryRecord[] = [];
	for (const delivery of pending.data) {
		// biome-ignore lint/performance/noAwaitInLoops: Recovery deliveries are serialized to control downstream payroll pressure.
		const result = await deliverPayrollHandoffWorkflow(
			{
				organizationId: input.organizationId,
				deliveryId: delivery.id,
				correlationId: delivery.correlationId,
				actorUserId: input.actorUserId,
			},
			composed,
		);
		if (!result.ok) {
			return result;
		}
		recovered.push(result.data);
	}
	return errorResult.ok(recovered);
}
