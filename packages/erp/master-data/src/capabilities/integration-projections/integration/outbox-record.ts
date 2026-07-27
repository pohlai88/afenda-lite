import type { MasterDataEventEnvelope } from "./event-envelope";
import type { MasterDataEventType } from "./event-types";

export const OUTBOX_STATUSES = [
	"pending",
	"publishing",
	"published",
	"retryable_failed",
	"dead_lettered",
] as const;

export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export type MasterDataOutboxRecord = Readonly<{
	eventId: string;
	organizationId: string;
	eventType: MasterDataEventType;
	schemaVersion: MasterDataEventEnvelope["schemaVersion"];
	aggregateType: MasterDataEventEnvelope["aggregateType"];
	aggregateId: string;
	aggregateVersion: number;
	payload: MasterDataEventEnvelope;
	correlationId: string;
	causationId: string | null;
	occurredAt: Date;
	availableAt: Date;
	publishedAt: Date | null;
	attemptCount: number;
	lastAttemptAt: Date | null;
	lastErrorCode: string | null;
	status: OutboxStatus;
}>;

export const OUTBOX_STATUS_TRANSITIONS = {
	pending: ["publishing", "dead_lettered"],
	publishing: ["published", "retryable_failed", "dead_lettered"],
	published: [],
	retryable_failed: ["pending", "dead_lettered"],
	dead_lettered: [],
} as const satisfies Record<OutboxStatus, readonly OutboxStatus[]>;

export function canTransitionOutboxStatus(
	input: Readonly<{
		from: OutboxStatus;
		to: OutboxStatus;
	}>,
): boolean {
	const allowed: readonly OutboxStatus[] =
		OUTBOX_STATUS_TRANSITIONS[input.from];
	return allowed.includes(input.to);
}

export function defineMasterDataOutboxRecord(
	record: MasterDataOutboxRecord,
): MasterDataOutboxRecord {
	assertEnvelopeMatchesOutbox(record);
	assertNonBlank("eventId", record.eventId);
	assertNonBlank("organizationId", record.organizationId);
	assertNonBlank("aggregateType", record.aggregateType);
	assertNonBlank("aggregateId", record.aggregateId);
	assertNonBlank("correlationId", record.correlationId);
	if (record.causationId !== null) {
		assertNonBlank("causationId", record.causationId);
	}
	assertPositiveVersion("outbox aggregateVersion", record.aggregateVersion);
	if (!Number.isSafeInteger(record.attemptCount) || record.attemptCount < 0) {
		throw new Error("outbox attemptCount must be a non-negative safe integer");
	}
	assertValidDate("outbox occurredAt", record.occurredAt);
	assertValidDate("outbox availableAt", record.availableAt);
	if (record.availableAt.getTime() < record.occurredAt.getTime()) {
		throw new Error("outbox availableAt must not precede occurredAt");
	}
	if (record.lastAttemptAt !== null) {
		assertValidDate("outbox lastAttemptAt", record.lastAttemptAt);
		if (record.lastAttemptAt.getTime() < record.occurredAt.getTime()) {
			throw new Error("outbox lastAttemptAt must not precede occurredAt");
		}
	}
	if (record.publishedAt !== null) {
		assertValidDate("outbox publishedAt", record.publishedAt);
		if (record.status !== "published") {
			throw new Error("publishedAt is only valid for published outbox records");
		}
		if (record.publishedAt.getTime() < record.occurredAt.getTime()) {
			throw new Error("outbox publishedAt must not precede occurredAt");
		}
	}
	if (record.status === "published" && record.publishedAt === null) {
		throw new Error("published outbox records require publishedAt");
	}
	if (
		record.lastErrorCode !== null &&
		record.lastErrorCode.trim().length === 0
	) {
		throw new Error("lastErrorCode must be nonblank when present");
	}
	assertDeliveryState(record);
	return record;
}

function assertDeliveryState(record: MasterDataOutboxRecord): void {
	switch (record.status) {
		case "pending":
			if (
				record.attemptCount === 0 &&
				(record.lastAttemptAt !== null || record.lastErrorCode !== null)
			) {
				throw new Error(
					"initial pending records must not have attempt metadata",
				);
			}
			break;
		case "publishing":
			if (record.attemptCount < 1 || record.lastAttemptAt === null) {
				throw new Error(
					"publishing records require an attempt and lastAttemptAt",
				);
			}
			if (record.lastErrorCode !== null) {
				throw new Error("publishing records must not retain lastErrorCode");
			}
			break;
		case "published":
			if (record.attemptCount < 1 || record.lastAttemptAt === null) {
				throw new Error(
					"published records require an attempt and lastAttemptAt",
				);
			}
			if (record.lastErrorCode !== null) {
				throw new Error("published records must not retain lastErrorCode");
			}
			break;
		case "retryable_failed":
		case "dead_lettered":
			if (
				record.attemptCount < 1 ||
				record.lastAttemptAt === null ||
				record.lastErrorCode === null
			) {
				throw new Error(
					`${record.status} records require attempt metadata and lastErrorCode`,
				);
			}
			break;
		default:
			assertNever(record.status);
	}
}

function assertEnvelopeMatchesOutbox(record: MasterDataOutboxRecord): void {
	if (
		record.eventId !== record.payload.eventId ||
		record.organizationId !== record.payload.organizationId ||
		record.eventType !== record.payload.eventType ||
		record.schemaVersion !== record.payload.schemaVersion ||
		record.aggregateType !== record.payload.aggregateType ||
		record.aggregateId !== record.payload.aggregateId ||
		record.aggregateVersion !== record.payload.aggregateVersion ||
		record.correlationId !== record.payload.correlationId ||
		record.causationId !== record.payload.causationId ||
		record.occurredAt.getTime() !== record.payload.occurredAt.getTime()
	) {
		throw new Error("outbox record must match its event envelope");
	}
}

function assertNonBlank(name: string, value: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${name} must not be blank`);
	}
}

function assertPositiveVersion(name: string, value: number): void {
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive safe integer`);
	}
}

function assertValidDate(name: string, value: Date): void {
	if (!Number.isFinite(value.getTime())) {
		throw new Error(`${name} must be a valid date`);
	}
}

function assertNever(value: never): never {
	throw new Error(`Unsupported outbox status: ${String(value)}`);
}
