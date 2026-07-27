import type { MasterDataEventEnvelope } from "./event-envelope";
import type { MasterDataOutboxRecord } from "./outbox-record";

export type BuildPendingOutboxRecordInput = Readonly<{
	event: MasterDataEventEnvelope;
	availableAt: Date;
}>;

export function buildPendingOutboxRecord(
	input: BuildPendingOutboxRecordInput,
): MasterDataOutboxRecord {
	const { event, availableAt } = input;

	return {
		eventId: event.eventId,
		organizationId: event.organizationId,
		eventType: event.eventType,
		schemaVersion: event.schemaVersion,
		aggregateType: event.aggregateType,
		aggregateId: event.aggregateId,
		aggregateVersion: event.aggregateVersion,
		payload: event,
		correlationId: event.correlationId,
		causationId: event.causationId,
		occurredAt: event.occurredAt,
		availableAt,
		publishedAt: null,
		attemptCount: 0,
		lastAttemptAt: null,
		lastErrorCode: null,
		status: "pending",
	};
}
