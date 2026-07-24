import { ok, type Result } from "@afenda/errors/result";
import {
	createEventPublisher,
	type DomainEvent,
	type DomainEventHandlerMap,
	type EventPublisher,
	HUMAN_RESOURCES_EVENT_IDS,
	IDENTITY_HUMAN_RESOURCES_LIFECYCLE_FACT_RECORDED_EVENT,
	PLATFORM_HUMAN_RESOURCES_REPORTING_FACT_RECORDED_EVENT,
	PLATFORM_HUMAN_RESOURCES_WORKFLOW_FACT_RECORDED_EVENT,
	type PublishEventCommand,
} from "@afenda/events";
import {
	type HumanResourcesPlatformFacts,
	projectHumanResourcesPlatformFacts,
} from "@afenda/human-resources";
import {
	createNotificationRecorder,
	type Notification,
} from "@afenda/notifications";

export type HumanResourcesPlatformEventResult = {
	facts: HumanResourcesPlatformFacts;
	notification: Notification | null;
	platformEvents: DomainEvent[];
};

export type HumanResourcesNotificationRecorderPort = {
	record(input: unknown): Promise<Result<Notification>>;
};
export type HumanResourcesFactPublisherPort = Pick<EventPublisher, "publish">;
async function publishPlatformFacts(
	event: DomainEvent,
	facts: HumanResourcesPlatformFacts,
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

	const published: DomainEvent[] = [];
	for (const command of commands) {
		const result = await publisher.publish(command);
		if (!result.ok) return result;
		if (result.data.organizationId !== event.organizationId) {
			return {
				ok: false,
				code: "INTERNAL_ERROR",
				message: "Platform event publisher returned another tenant",
			};
		}
		published.push(result.data);
	}
	return ok(published);
}

export async function handleHumanResourcesPlatformEvent(
	event: DomainEvent,
	recorder: HumanResourcesNotificationRecorderPort = createNotificationRecorder(),
	publisher: HumanResourcesFactPublisherPort = createEventPublisher(),
): Promise<Result<HumanResourcesPlatformEventResult>> {
	const projected = projectHumanResourcesPlatformFacts(event);
	if (!projected.ok) {
		return projected;
	}

	const platformEvents = await publishPlatformFacts(
		event,
		projected.data,
		publisher,
	);
	if (!platformEvents.ok) return platformEvents;

	const intent = projected.data.notification;
	if (intent === null) {
		return ok({
			facts: projected.data,
			notification: null,
			platformEvents: platformEvents.data,
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
	});
}

export function createHumanResourcesPlatformEventHandlers(
	recorder?: HumanResourcesNotificationRecorderPort,
	publisher?: HumanResourcesFactPublisherPort,
): DomainEventHandlerMap {
	const handlers: DomainEventHandlerMap = {};
	for (const eventType of HUMAN_RESOURCES_EVENT_IDS) {
		handlers[eventType] = async (event) => {
			const result = await handleHumanResourcesPlatformEvent(
				event,
				recorder,
				publisher,
			);
			if (!result.ok) {
				throw new Error(result.message);
			}
		};
	}
	return handlers;
}
