import { z } from "zod";
import {
	type CausationId,
	type CorporateAdministrationEventId,
	type CorrelationId,
	causationIdSchema,
	correlationIdSchema,
	eventIdSchema,
	type OrganizationId,
	organizationIdSchema,
	type UserId,
	userIdSchema,
} from "../brands";
import {
	type CanonicalJsonValue,
	canonicalJsonStringify,
	toImmutableCanonicalJson,
} from "../canonical-json";
import { type CanonicalInstant, canonicalInstantSchema } from "../dates";
import {
	type CorporateAdministrationEventType,
	corporateAdministrationEventTypeSchema,
} from "./event-types";

const EVENT_NAMESPACE = "corporate_administration" as const;
const MAX_EVENT_PAYLOAD_BYTES = 64 * 1024;

const aggregateTypeSchema = z
	.string()
	.min(1)
	.max(128)
	.regex(
		/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/,
		"Aggregate type must use lowercase snake_case",
	);

const aggregateIdSchema = z
	.string()
	.min(1)
	.max(128)
	.refine(
		(value) => value === value.trim(),
		"Aggregate ID must not contain surrounding whitespace",
	);

function utf8ByteLength(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

const eventEnvelopeInputSchema = z
	.object({
		eventId: eventIdSchema,
		eventType: corporateAdministrationEventTypeSchema,
		organizationId: organizationIdSchema,
		aggregateType: aggregateTypeSchema,
		aggregateId: aggregateIdSchema,
		aggregateVersion: z.number().int().safe().positive(),
		occurredAt: canonicalInstantSchema,
		actorUserId: userIdSchema,
		correlationId: correlationIdSchema,
		causationId: causationIdSchema.optional(),
		payload: z.unknown(),
	})
	.strict()
	.superRefine((event, context) => {
		if (
			!event.eventType.startsWith(`${EVENT_NAMESPACE}.${event.aggregateType}.`)
		) {
			context.addIssue({
				code: "custom",
				path: ["aggregateType"],
				message: "Aggregate type must match the event type aggregate",
			});
		}
	});

/**
 * Shared Corporate Administration domain-event envelope.
 *
 * `occurredAt` is an immutable `CanonicalInstant`. Process clocks may capture
 * `Date` via `ClockPort.now()`, but that mutable value must be converted with
 * `toCanonicalInstant` before entering this envelope. Mutable `Date` values are
 * never part of the serialized event contract.
 *
 * This module reserves envelope shape only. It does not declare event
 * constants, publishers, consumers, buses, or external integrations.
 */
export type CorporateAdministrationDomainEventEnvelope<
	TType extends
		CorporateAdministrationEventType = CorporateAdministrationEventType,
	TPayload extends CanonicalJsonValue = CanonicalJsonValue,
> = Readonly<{
	eventId: CorporateAdministrationEventId;
	eventType: TType;
	organizationId: OrganizationId;
	aggregateType: string;
	aggregateId: string;
	aggregateVersion: number;
	occurredAt: CanonicalInstant;
	actorUserId: UserId;
	correlationId: CorrelationId;
	causationId?: CausationId | undefined;
	payload: TPayload;
}>;

/**
 * "Pending" means constructed but not yet persisted or published. Publication
 * state (status, attempt count, availability time) belongs to the outbox
 * record, never to the domain event envelope.
 */
export type CorporateAdministrationPendingEvent<
	TType extends
		CorporateAdministrationEventType = CorporateAdministrationEventType,
	TPayload extends CanonicalJsonValue = CanonicalJsonValue,
> = CorporateAdministrationDomainEventEnvelope<TType, TPayload>;

/**
 * Internal constructor for trusted application facts. It throws on invalid
 * input, so external transport or command input must first pass the package's
 * Result-returning parsing boundary.
 *
 * Callers that obtain time from `ClockPort.now()` must convert with
 * `toCanonicalInstant` before supplying `occurredAt`. A raw `Date` is rejected.
 */
export function createCorporateAdministrationDomainEventEnvelope(
	input: unknown,
): CorporateAdministrationDomainEventEnvelope {
	const parsed = eventEnvelopeInputSchema.parse(input);
	const payload = toImmutableCanonicalJson(parsed.payload);
	if (
		utf8ByteLength(canonicalJsonStringify(payload)) > MAX_EVENT_PAYLOAD_BYTES
	) {
		throw new RangeError("Corporate Administration event payload is too large");
	}

	return Object.freeze({
		eventId: parsed.eventId,
		eventType: parsed.eventType,
		organizationId: parsed.organizationId,
		aggregateType: parsed.aggregateType,
		aggregateId: parsed.aggregateId,
		aggregateVersion: parsed.aggregateVersion,
		occurredAt: parsed.occurredAt,
		actorUserId: parsed.actorUserId,
		correlationId: parsed.correlationId,
		...(parsed.causationId === undefined
			? {}
			: { causationId: parsed.causationId }),
		payload,
	});
}
