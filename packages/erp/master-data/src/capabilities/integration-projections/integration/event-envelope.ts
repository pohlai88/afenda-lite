import {
	isMasterDataAggregateType,
	type MasterDataAggregateType,
} from "./aggregate-types";
import type { MasterDataEventPayloadMap } from "./event-payloads";
import {
	expectedAggregateTypeForEvent,
	isMasterDataEventType,
	type MasterDataEventType,
} from "./event-types";
import { assertJsonValue, type JsonObject } from "./json-types";

export const MASTER_DATA_EVENT_SCHEMA_VERSION = 1 as const;
export const MAX_EVENT_PAYLOAD_KEYS = 32 as const;
export const MAX_EVENT_PAYLOAD_DEPTH = 8 as const;
export const MAX_EVENT_PAYLOAD_ARRAY_LENGTH = 256 as const;
export const MAX_EVENT_PAYLOAD_STRING_LENGTH = 2048 as const;
export const MAX_EVENT_PAYLOAD_BYTES = 65_536 as const;

export type MasterDataEventEnvelope<
	TType extends MasterDataEventType = MasterDataEventType,
> = Readonly<{
	eventId: string;
	eventType: TType;
	schemaVersion: typeof MASTER_DATA_EVENT_SCHEMA_VERSION;
	organizationId: string;
	aggregateType: MasterDataAggregateType;
	aggregateId: string;
	aggregateVersion: number;
	actorUserId: string;
	correlationId: string;
	causationId: string | null;
	occurredAt: Date;
	payload: MasterDataEventPayloadMap[TType];
}>;

export function defineMasterDataEventEnvelope<
	const TType extends MasterDataEventType,
>(event: MasterDataEventEnvelope<TType>): MasterDataEventEnvelope<TType> {
	assertNonBlank("eventId", event.eventId);
	if (!isMasterDataEventType(event.eventType)) {
		throw new Error("eventType must be a registered master-data event type");
	}
	if (event.schemaVersion !== MASTER_DATA_EVENT_SCHEMA_VERSION) {
		throw new Error("schemaVersion must match the master-data event schema");
	}
	assertNonBlank("organizationId", event.organizationId);
	if (!isMasterDataAggregateType(event.aggregateType)) {
		throw new Error(
			"aggregateType must be a registered master-data aggregate type",
		);
	}
	if (event.aggregateType !== expectedAggregateTypeForEvent(event.eventType)) {
		throw new Error("aggregateType must match the event aggregate policy");
	}
	assertNonBlank("aggregateId", event.aggregateId);
	assertPositiveVersion("aggregateVersion", event.aggregateVersion);
	assertNonBlank("actorUserId", event.actorUserId);
	assertNonBlank("correlationId", event.correlationId);
	if (event.causationId !== null) {
		assertNonBlank("causationId", event.causationId);
	}
	assertValidDate("occurredAt", event.occurredAt);
	assertJsonPayload(event.payload);
	return event;
}

function assertJsonPayload(payload: JsonObject): void {
	const seen = new WeakSet<object>();
	const topLevelKeys = Object.keys(payload);
	if (topLevelKeys.length > MAX_EVENT_PAYLOAD_KEYS) {
		throw new Error(
			`event payload exceeds ${MAX_EVENT_PAYLOAD_KEYS} top-level keys`,
		);
	}
	for (const key of topLevelKeys) {
		assertPayloadKey(key);
	}
	assertJsonValue(payload, "$", seen, {
		maxDepth: MAX_EVENT_PAYLOAD_DEPTH,
		maxArrayLength: MAX_EVENT_PAYLOAD_ARRAY_LENGTH,
		maxStringLength: MAX_EVENT_PAYLOAD_STRING_LENGTH,
	});
	const serialized = JSON.stringify(payload);
	if (serialized === undefined) {
		throw new Error("event payload must serialize to JSON");
	}
	const byteLength = utf8ByteLength(serialized);
	if (byteLength > MAX_EVENT_PAYLOAD_BYTES) {
		throw new Error(`event payload exceeds ${MAX_EVENT_PAYLOAD_BYTES} bytes`);
	}
}

function assertPayloadKey(key: string): void {
	assertNonBlank("payload key", key);
	if (key !== key.trim()) {
		throw new Error("payload keys must not contain surrounding whitespace");
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

function utf8ByteLength(value: string): number {
	return new Blob([value]).size;
}
