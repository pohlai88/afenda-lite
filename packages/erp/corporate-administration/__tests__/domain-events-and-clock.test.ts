import {
	canonicalInstantSchema,
	createCorporateAdministrationDomainEventEnvelope,
	createCorporateAdministrationEventType,
	eventIdSchema,
	organizationIdSchema,
	toCanonicalInstant,
	userIdSchema,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";

describe("Corporate Administration domain-event envelope reservation", () => {
	const validInput = {
		eventId: eventIdSchema.parse("event_1"),
		eventType: createCorporateAdministrationEventType({
			aggregate: "test_entity",
			action: "created",
			version: 1,
		}),
		organizationId: organizationIdSchema.parse("org_1"),
		aggregateType: "test_entity",
		aggregateId: "aggregate_1",
		aggregateVersion: 1,
		occurredAt: canonicalInstantSchema.parse("2026-07-26T16:30:00.000Z"),
		actorUserId: userIdSchema.parse("user_1"),
		correlationId: "correlation_1",
		causationId: "causation_1",
		payload: { amount: "10.50", lines: [1, 2] },
	};

	it("creates a readonly canonical envelope with optional causation", () => {
		const event = createCorporateAdministrationDomainEventEnvelope(validInput);
		expect(event).toEqual(validInput);
		expect(Object.isFrozen(event)).toBe(true);
		expect(Object.isFrozen(event.payload)).toBe(true);
		expect(
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				causationId: undefined,
			}),
		).not.toHaveProperty("causationId");
	});

	it("deep-freezes nested payload arrays and objects", () => {
		const event = createCorporateAdministrationDomainEventEnvelope({
			...validInput,
			payload: { nested: { values: [1, 2] } },
		});
		const payload = event.payload as {
			nested: { values: readonly number[] };
		};

		expect(Object.isFrozen(event.payload)).toBe(true);
		expect(Object.isFrozen(payload.nested)).toBe(true);
		expect(Object.isFrozen(payload.nested.values)).toBe(true);
	});

	it("rejects an aggregate type that contradicts the event type", () => {
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				aggregateType: "bank_account",
			}),
		).toThrow();
	});

	it("rejects surrounding aggregate-ID whitespace instead of trimming", () => {
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				aggregateId: " aggregate_1 ",
			}),
		).toThrow();
	});

	it("rejects unknown envelope fields", () => {
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				unexpected: true,
			}),
		).toThrow();
	});

	it("rejects invalid event types, aggregate versions, and unsupported payloads", () => {
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				eventType: "corporate_administration.test_entity.create.v1",
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				aggregateVersion: 0,
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				payload: { unsupported: new Date() },
			}),
		).toThrow(TypeError);
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				payload: Object.create({ inherited: true }),
			}),
		).toThrow(TypeError);
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				payload: { oversized: "x".repeat(64 * 1024) },
			}),
		).toThrow(RangeError);
	});

	it("converts ClockPort Date into CanonicalInstant and rejects raw Date", () => {
		const clock = createFixedCorporateAdministrationClock(
			"2026-07-26T16:30:00.000Z",
		);
		const occurredAt = toCanonicalInstant(clock.now());
		const event = createCorporateAdministrationDomainEventEnvelope({
			...validInput,
			occurredAt,
		});

		expect(event.occurredAt).toBe("2026-07-26T16:30:00.000Z");
		expect(() =>
			createCorporateAdministrationDomainEventEnvelope({
				...validInput,
				occurredAt: clock.now(),
			}),
		).toThrow();
	});
});

describe("Corporate Administration fixed clock", () => {
	it("returns one explicit instant and deterministic dates in multiple IANA zones", () => {
		const clock = createFixedCorporateAdministrationClock(
			"2026-07-26T16:30:00.000Z",
		);
		expect(clock.now().toISOString()).toBe("2026-07-26T16:30:00.000Z");
		expect(clock.today("UTC")).toBe("2026-07-26");
		expect(clock.today("Asia/Kuala_Lumpur")).toBe("2026-07-27");
		expect(clock.today("America/New_York")).toBe("2026-07-26");
	});

	it("returns fresh Date instances and rejects invalid IANA zones", () => {
		const clock = createFixedCorporateAdministrationClock(
			"2026-07-26T16:30:00.000Z",
		);
		const first = clock.now();
		first.setUTCFullYear(2000);
		expect(clock.now().toISOString()).toBe("2026-07-26T16:30:00.000Z");
		expect(() => clock.today("Invalid/Zone")).toThrow(RangeError);
	});

	it("rejects a non-canonical configured instant", () => {
		expect(() =>
			createFixedCorporateAdministrationClock("2026-07-26T16:30:00Z"),
		).toThrow();
	});
});
