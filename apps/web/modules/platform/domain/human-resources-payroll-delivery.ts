import { fail, ok, type Result } from "@afenda/errors/result";
import {
	createEventPublisher,
	type EventPublisher,
	PLATFORM_HUMAN_RESOURCES_PAYROLL_DELIVERY_REQUESTED_EVENT,
} from "@afenda/events";
import {
	deliverPayrollHandoff as deliverPayrollHandoffWorkflow,
	type HrObservabilityPorts,
	type PayrollDeliveryPorts,
	type PayrollDeliveryProducerPort,
	type PayrollDeliveryRecord,
	recordHrPayrollDeliveryFailure,
	recordPayrollDeliveryFeedback as recordPayrollDeliveryFeedbackWorkflow,
} from "@afenda/human-resources";
import { createDrizzlePayrollDeliveryStore } from "@afenda/human-resources/adapters/drizzle";

import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";

export function createPayrollDeliveryEventProducer(
	publisher: Pick<EventPublisher, "publish"> = createEventPublisher(),
	actorUserId = "system",
	observability: HrObservabilityPorts = createProductionHrObservabilityPorts(),
): PayrollDeliveryProducerPort {
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
				return fail(
					"INTERNAL_ERROR",
					"Payroll delivery publisher returned another tenant",
				);
			}
			return ok({ receiptId: published.data.id });
		},
	};
}

export function createProductionPayrollDeliveryPorts(
	publisher?: Pick<EventPublisher, "publish">,
	actorUserId = "system",
	observability?: HrObservabilityPorts,
): PayrollDeliveryPorts {
	return {
		store: createDrizzlePayrollDeliveryStore(),
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
	ports?: PayrollDeliveryPorts,
): Promise<Result<PayrollDeliveryRecord>> {
	const composed =
		ports ?? createProductionPayrollDeliveryPorts(undefined, input.actorUserId);
	const found = await composed.store.getById(input);
	if (!found.ok) {
		return found;
	}
	if (found.data === null) {
		return fail("NOT_FOUND", "Payroll delivery not found");
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
	ports?: PayrollDeliveryPorts,
): Promise<Result<PayrollDeliveryRecord>> {
	const composed =
		ports ?? createProductionPayrollDeliveryPorts(undefined, input.actorUserId);
	const found = await composed.store.getById(input);
	if (!found.ok) {
		return found;
	}
	if (found.data === null) {
		return fail("NOT_FOUND", "Payroll delivery not found");
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
	ports?: PayrollDeliveryPorts,
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
	return ok(recovered);
}
