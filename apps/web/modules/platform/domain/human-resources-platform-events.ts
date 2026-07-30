import { AppError } from "@afenda/errors";
import { fail, ok, type Result } from "@afenda/errors/result";
// biome-ignore-all lint/performance/noAwaitInLoops: Event side effects are persisted and published in source order with fail-fast semantics.
import {
	createEventPublisher,
	type DomainEvent,
	type DomainEventHandlerMap,
	type EventPublisher,
	HUMAN_RESOURCES_EVENT_IDS,
	IDENTITY_HUMAN_RESOURCES_LIFECYCLE_FACT_RECORDED_EVENT,
	PLATFORM_HUMAN_RESOURCES_ACCOUNTING_PROVISIONING_FACT_RECORDED_EVENT,
	PLATFORM_HUMAN_RESOURCES_REPORTING_FACT_RECORDED_EVENT,
	PLATFORM_HUMAN_RESOURCES_WORKFLOW_FACT_RECORDED_EVENT,
	type PublishEventCommand,
} from "@afenda/events";
import {
	type HrObservabilityPorts,
	type HumanResourcesAccountingProvisioningFact,
	type HumanResourcesPlatformFacts,
	type HumanResourcesWorkItemFact,
	projectHumanResourcesAccountingProvisioningFacts,
	projectHumanResourcesPlatformFacts,
	recordHrEventFailure,
	recordHrOutboxLag,
} from "@afenda/human-resources";
import {
	createNotificationRecorder,
	type Notification,
} from "@afenda/notifications";
import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";
import { createDrizzlePlatformWorkItemStore } from "./platform-work-items";

export interface HumanResourcesPlatformEventResult {
	facts: HumanResourcesPlatformFacts;
	notification: Notification | null;
	platformEvents: DomainEvent[];
	workItems: HumanResourcesPersistedWorkItem[];
}

export interface HumanResourcesPersistedWorkItem {
	deduplicationKey: string;
	id: string;
	organizationId: string;
}

export interface HumanResourcesNotificationRecorderPort {
	record: (input: unknown) => Promise<Result<Notification>>;
}
export type HumanResourcesFactPublisherPort = Pick<EventPublisher, "publish">;
export interface HumanResourcesWorkItemSinkPort {
	record: (input: {
		workItem: HumanResourcesWorkItemFact;
		actorUserId: string;
	}) => Promise<Result<HumanResourcesPersistedWorkItem>>;
}

export function createProductionHumanResourcesWorkItemSink(): HumanResourcesWorkItemSinkPort {
	const store = createDrizzlePlatformWorkItemStore();
	return {
		async record({ workItem, actorUserId }) {
			const result = await store.record({
				organizationId: workItem.organizationId,
				kind: workItem.kind,
				targetUserId: workItem.targetUserId,
				entityType: workItem.entityType,
				entityId: workItem.entityId,
				title: workItem.title,
				priority: workItem.priority,
				dueOn: workItem.dueOn,
				sourceEventId: workItem.eventId,
				deduplicationKey: workItem.deduplicationKey,
				factVersion: workItem.factVersion,
				correlationId: workItem.correlationId,
				actorUserId,
			});
			if (!result.ok) {
				return result;
			}
			return ok({
				id: result.data.id,
				organizationId: result.data.organizationId,
				deduplicationKey: result.data.deduplicationKey,
			});
		},
	};
}

async function persistWorkItems(
	event: DomainEvent,
	facts: HumanResourcesPlatformFacts,
	sink: HumanResourcesWorkItemSinkPort | null,
): Promise<Result<HumanResourcesPersistedWorkItem[]>> {
	if (facts.workItems.length === 0) {
		return ok([]);
	}
	if (sink === null) {
		return fail(
			"SERVICE_UNAVAILABLE",
			"Human Resources platform work-item sink is not composed",
		);
	}
	const persisted: HumanResourcesPersistedWorkItem[] = [];
	for (const workItem of facts.workItems) {
		const result = await sink.record({
			workItem,
			actorUserId: event.actorUserId,
		});
		if (!result.ok) {
			return result;
		}
		if (
			result.data.organizationId !== workItem.organizationId ||
			result.data.deduplicationKey !== workItem.deduplicationKey
		) {
			return fail(
				"INTERNAL_ERROR",
				"Platform work-item sink returned mismatched persistence evidence",
			);
		}
		persisted.push(result.data);
	}
	return ok(persisted);
}

async function publishPlatformFacts(
	event: DomainEvent,
	facts: HumanResourcesPlatformFacts,
	integrationFacts: readonly HumanResourcesAccountingProvisioningFact[],
	publisher: HumanResourcesFactPublisherPort,
): Promise<Result<DomainEvent[]>> {
	const commands: PublishEventCommand[] = [];
	if (facts.workflow !== null) {
		const { kind: _kind, ...payload } = facts.workflow;
		commands.push({
			type: PLATFORM_HUMAN_RESOURCES_WORKFLOW_FACT_RECORDED_EVENT,
			sourceModule: "platform",
			deduplicationKey: `source-event:${event.id}`,
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			correlationId: event.correlationId,
			causationId: event.id,
			payload,
			metadata: { sourceEventType: event.type },
		});
	}
	if (facts.identity !== null) {
		const { kind: _kind, ...payload } = facts.identity;
		commands.push({
			type: IDENTITY_HUMAN_RESOURCES_LIFECYCLE_FACT_RECORDED_EVENT,
			sourceModule: "identity",
			deduplicationKey: `source-event:${event.id}`,
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			correlationId: event.correlationId,
			causationId: event.id,
			payload,
			metadata: { sourceEventType: event.type },
		});
	}
	const { kind: _kind, ...reportingPayload } = facts.reporting;
	commands.push({
		type: PLATFORM_HUMAN_RESOURCES_REPORTING_FACT_RECORDED_EVENT,
		sourceModule: "platform",
		deduplicationKey: `source-event:${event.id}`,
		organizationId: event.organizationId,
		actorUserId: event.actorUserId,
		correlationId: event.correlationId,
		causationId: event.id,
		payload: reportingPayload,
		metadata: { sourceEventType: event.type },
	});
	for (const integrationFact of integrationFacts) {
		commands.push({
			type: PLATFORM_HUMAN_RESOURCES_ACCOUNTING_PROVISIONING_FACT_RECORDED_EVENT,
			sourceModule: "platform",
			deduplicationKey: integrationFact.idempotencyKey,
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			correlationId: event.correlationId,
			causationId: event.id,
			payload: { ...integrationFact },
			metadata: { sourceEventType: event.type, factKind: integrationFact.kind },
		});
	}

	const published: DomainEvent[] = [];
	for (const command of commands) {
		const result = await publisher.publish(command);
		if (!result.ok) {
			return result;
		}
		if (result.data.organizationId !== event.organizationId) {
			return fail(
				"INTERNAL_ERROR",
				"Platform event publisher returned another tenant",
			);
		}
		published.push(result.data);
	}
	return ok(published);
}

async function handleHumanResourcesPlatformEventCore(
	event: DomainEvent,
	recorder: HumanResourcesNotificationRecorderPort = createNotificationRecorder(),
	publisher: HumanResourcesFactPublisherPort = createEventPublisher(),
	workItemSink: HumanResourcesWorkItemSinkPort | null = createProductionHumanResourcesWorkItemSink(),
): Promise<Result<HumanResourcesPlatformEventResult>> {
	const projected = projectHumanResourcesPlatformFacts(event);
	if (!projected.ok) {
		return projected;
	}
	const integrationFacts =
		projectHumanResourcesAccountingProvisioningFacts(event);
	if (!integrationFacts.ok) {
		return integrationFacts;
	}
	const workItems = await persistWorkItems(event, projected.data, workItemSink);
	if (!workItems.ok) {
		return workItems;
	}

	const platformEvents = await publishPlatformFacts(
		event,
		projected.data,
		integrationFacts.data,
		publisher,
	);
	if (!platformEvents.ok) {
		return platformEvents;
	}

	const intent = projected.data.notification;
	if (intent === null) {
		return ok({
			facts: projected.data,
			notification: null,
			platformEvents: platformEvents.data,
			workItems: workItems.data,
		});
	}

	const notification = await recorder.record({
		organizationId: intent.organizationId,
		userId: intent.recipientUserId,
		type: intent.type,
		priority: intent.priority,
		channel: "IN_APP",
		title: intent.title,
		body: intent.body,
		module: "human-resources",
		deduplicationKey: intent.deduplicationKey,
		metadata: {
			eventId: intent.eventId,
			reportingFactVersion: projected.data.reporting.factVersion,
		},
	});
	if (!notification.ok) {
		return notification;
	}

	return ok({
		facts: projected.data,
		notification: notification.data,
		platformEvents: platformEvents.data,
		workItems: workItems.data,
	});
}

export async function handleHumanResourcesPlatformEvent(
	event: DomainEvent,
	recorder: HumanResourcesNotificationRecorderPort = createNotificationRecorder(),
	publisher: HumanResourcesFactPublisherPort = createEventPublisher(),
	workItemSink: HumanResourcesWorkItemSinkPort | null = createProductionHumanResourcesWorkItemSink(),
	observability: HrObservabilityPorts = createProductionHrObservabilityPorts(),
): Promise<Result<HumanResourcesPlatformEventResult>> {
	await recordHrOutboxLag(
		{
			eventFamily: "domain_event",
			lagMs: Math.max(0, Date.now() - event.occurredAt.getTime()),
		},
		observability,
	);
	const result = await handleHumanResourcesPlatformEventCore(
		event,
		recorder,
		publisher,
		workItemSink,
	);
	if (!result.ok) {
		await recordHrEventFailure(
			{
				eventFamily: "domain_event",
				reason: classifyHrFailure(result.code),
			},
			observability,
		);
	}
	return result;
}

export function createHumanResourcesPlatformEventHandlers(
	recorder?: HumanResourcesNotificationRecorderPort,
	publisher?: HumanResourcesFactPublisherPort,
	workItemSink: HumanResourcesWorkItemSinkPort | null = createProductionHumanResourcesWorkItemSink(),
): DomainEventHandlerMap {
	const handlers: DomainEventHandlerMap = {};
	for (const eventType of HUMAN_RESOURCES_EVENT_IDS) {
		handlers[eventType] = async (event) => {
			const result = await handleHumanResourcesPlatformEvent(
				event,
				recorder,
				publisher,
				workItemSink,
			);
			if (!result.ok) {
				throw new AppError({
					code: result.code,
					message: result.message,
					...(result.details === undefined ? {} : { details: result.details }),
				});
			}
		};
	}
	return handlers;
}
