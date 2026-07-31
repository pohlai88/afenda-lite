// biome-ignore-all lint/performance/noAwaitInLoops: Ordered outbox operations are the behavior under test.
// biome-ignore-all lint/style/useThrowOnlyError: Failure injection uses caller-supplied sentinel values intentionally.
// biome-ignore-all lint/suspicious/useAwait: Outbox probes implement asynchronous production ports.
import { randomUUID } from "node:crypto";
import {
	CORPORATE_ADMINISTRATION_EVENT_TYPES,
	type CorporateAdministrationOutboxPort,
	type CorporateAdministrationPendingEvent,
	corporateAdministrationModuleManifest,
	createCorporateAdministrationDomainEventEnvelope,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationOutboxPort } from "@afenda/corporate-administration/adapters/drizzle";
import { errorResult } from "@afenda/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	createNeonCorporateAdministrationPendingEventAppender,
	listCorporateAdministrationOutboxEvents,
} from "./helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "./helpers/neon-parity";

function organizationId(label: string): string {
	return `org-ca-outbox-${label}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}
function createDurableOutboxPort() {
	return createDrizzleCorporateAdministrationOutboxPort({
		appender: createNeonCorporateAdministrationPendingEventAppender(),
	});
}
function eventFor(input: {
	organizationId: string;
	eventId?: string;
	eventType?: string;
	aggregateVersion?: number;
	payload?: unknown;
}): CorporateAdministrationPendingEvent {
	return createCorporateAdministrationDomainEventEnvelope({
		eventId: input.eventId ?? `event-${randomUUID()}`,
		eventType:
			input.eventType ?? "corporate_administration.test_entity.created.v1",
		organizationId: input.organizationId,
		aggregateType: "test_entity",
		aggregateId: "entity_1",
		aggregateVersion: input.aggregateVersion ?? 1,
		occurredAt: "2026-07-26T10:00:00.000Z",
		actorUserId: "user_1",
		correlationId: "corr_1",
		payload: input.payload ?? { nested: { a: 1, b: 2 }, values: [1, "2"] },
	});
}
describe("Corporate Administration outbox append contract", () => {
	it("makes Neon parity skip conditions visible", () => {
		expect(CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON).toMatch(
			/^(running|skipped|blocked):/,
		);
	});
	it("appends pending envelopes without activating publication", async () => {
		const onAppend = vi.fn();
		const outbox = createMemoryCorporateAdministrationOutboxPort({ onAppend });
		const event = eventFor({ organizationId: "org_1", eventId: "event_1" });
		await expect(outbox.append([event])).resolves.toEqual(
			errorResult.ok(undefined),
		);
		expect(onAppend).toHaveBeenCalledWith([event]);
		expect(corporateAdministrationModuleManifest.events).toEqual({
			namespace: "corporate_administration",
			emits: [
				"corporate_administration.legal_company.draft_registered.v1",
				"corporate_administration.legal_company.profile_updated.v1",
				"corporate_administration.legal_company.jurisdiction_profile_set.v1",
				"corporate_administration.legal_company.name_added.v1",
				"corporate_administration.legal_company.name_superseded.v1",
				"corporate_administration.legal_company.legal_form_changed.v1",
				"corporate_administration.legal_company.identifier_registered.v1",
				"corporate_administration.legal_company.financial_year_set.v1",
				"corporate_administration.legal_company.activity_registered.v1",
				"corporate_administration.legal_company.activated.v1",
				"corporate_administration.legal_company.suspended.v1",
				"corporate_administration.legal_company.struck_off_marked.v1",
				"corporate_administration.legal_company.liquidation_entered.v1",
				"corporate_administration.legal_company.dissolved.v1",
				"corporate_administration.legal_company.restored.v1",
				"corporate_administration.legal_company.archived.v1",
				"corporate_administration.legal_establishment.registered.v1",
				"corporate_administration.legal_establishment.updated.v1",
				"corporate_administration.legal_establishment.status_changed.v1",
				"corporate_administration.registered_address.set.v1",
				"corporate_administration.premise.registered.v1",
				"corporate_administration.premise.ended.v1",
				"corporate_administration.governance_body.created.v1",
				"corporate_administration.governance_body.amended.v1",
				"corporate_administration.governance_body.retired.v1",
				"corporate_administration.governance_membership.appointed.v1",
				"corporate_administration.governance_membership.changed.v1",
				"corporate_administration.governance_membership.ended.v1",
				"corporate_administration.statutory_office.defined.v1",
				"corporate_administration.officer.appointed.v1",
				"corporate_administration.officer.appointment_amended.v1",
				"corporate_administration.officer.qualification_recorded.v1",
				"corporate_administration.officer.resigned.v1",
				"corporate_administration.officer.removed.v1",
				"corporate_administration.officer.declaration_recorded.v1",
				"corporate_administration.officer.declaration_superseded.v1",
				"corporate_administration.officer.disqualified.v1",
				"corporate_administration.officer.disqualification_ended.v1",
				"corporate_administration.conflict.disclosed.v1",
				"corporate_administration.conflict.recusal_recorded.v1",
				"corporate_administration.governance_meeting.scheduled.v1",
				"corporate_administration.meeting_notice.issued.v1",
				"corporate_administration.meeting_notice.delivered.v1",
				"corporate_administration.meeting_notice.waived.v1",
				"corporate_administration.meeting_participant.recorded.v1",
				"corporate_administration.governance_meeting.opened.v1",
				"corporate_administration.governance_meeting.quorum_recorded.v1",
				"corporate_administration.governance_meeting.adjourned.v1",
				"corporate_administration.governance_meeting.closed.v1",
				"corporate_administration.meeting_vote.recorded.v1",
				"corporate_administration.resolution.adopted.v1",
				"corporate_administration.resolution.rejected.v1",
				"corporate_administration.resolution.superseded.v1",
				"corporate_administration.resolution.minutes_recorded.v1",
				"corporate_administration.resolution.action_assigned.v1",
				"corporate_administration.resolution.action_completed.v1",
			],
			consumes: [],
		});
		expect(CORPORATE_ADMINISTRATION_EVENT_TYPES).toEqual([
			"corporate_administration.legal_company.draft_registered.v1",
			"corporate_administration.legal_company.profile_updated.v1",
			"corporate_administration.legal_company.jurisdiction_profile_set.v1",
			"corporate_administration.legal_company.name_added.v1",
			"corporate_administration.legal_company.name_superseded.v1",
			"corporate_administration.legal_company.legal_form_changed.v1",
			"corporate_administration.legal_company.identifier_registered.v1",
			"corporate_administration.legal_company.financial_year_set.v1",
			"corporate_administration.legal_company.activity_registered.v1",
			"corporate_administration.legal_company.activated.v1",
			"corporate_administration.legal_company.suspended.v1",
			"corporate_administration.legal_company.struck_off_marked.v1",
			"corporate_administration.legal_company.liquidation_entered.v1",
			"corporate_administration.legal_company.dissolved.v1",
			"corporate_administration.legal_company.restored.v1",
			"corporate_administration.legal_company.archived.v1",
			"corporate_administration.legal_establishment.registered.v1",
			"corporate_administration.legal_establishment.updated.v1",
			"corporate_administration.legal_establishment.status_changed.v1",
			"corporate_administration.registered_address.set.v1",
			"corporate_administration.premise.registered.v1",
			"corporate_administration.premise.ended.v1",
			"corporate_administration.governance_body.created.v1",
			"corporate_administration.governance_body.amended.v1",
			"corporate_administration.governance_body.retired.v1",
			"corporate_administration.governance_membership.appointed.v1",
			"corporate_administration.governance_membership.changed.v1",
			"corporate_administration.governance_membership.ended.v1",
			"corporate_administration.statutory_office.defined.v1",
			"corporate_administration.officer.appointed.v1",
			"corporate_administration.officer.appointment_amended.v1",
			"corporate_administration.officer.qualification_recorded.v1",
			"corporate_administration.officer.resigned.v1",
			"corporate_administration.officer.removed.v1",
			"corporate_administration.officer.declaration_recorded.v1",
			"corporate_administration.officer.declaration_superseded.v1",
			"corporate_administration.officer.disqualified.v1",
			"corporate_administration.officer.disqualification_ended.v1",
			"corporate_administration.conflict.disclosed.v1",
			"corporate_administration.conflict.recusal_recorded.v1",
			"corporate_administration.governance_meeting.scheduled.v1",
			"corporate_administration.meeting_notice.issued.v1",
			"corporate_administration.meeting_notice.delivered.v1",
			"corporate_administration.meeting_notice.waived.v1",
			"corporate_administration.meeting_participant.recorded.v1",
			"corporate_administration.governance_meeting.opened.v1",
			"corporate_administration.governance_meeting.quorum_recorded.v1",
			"corporate_administration.governance_meeting.adjourned.v1",
			"corporate_administration.governance_meeting.closed.v1",
			"corporate_administration.meeting_vote.recorded.v1",
			"corporate_administration.resolution.adopted.v1",
			"corporate_administration.resolution.rejected.v1",
			"corporate_administration.resolution.superseded.v1",
			"corporate_administration.resolution.minutes_recorded.v1",
			"corporate_administration.resolution.action_assigned.v1",
			"corporate_administration.resolution.action_completed.v1",
		]);
		for (const infrastructureEventType of [
			"corporate_administration.runtime_initialized.v1",
			"corporate_administration.idempotency_reserved.v1",
			"corporate_administration.outbox_recorded.v1",
		]) {
			expect(corporateAdministrationModuleManifest.events.emits).not.toContain(
				infrastructureEventType,
			);
			expect(
				corporateAdministrationModuleManifest.events.consumes,
			).not.toContain(infrastructureEventType);
			expect(CORPORATE_ADMINISTRATION_EVENT_TYPES).not.toContain(
				infrastructureEventType,
			);
		}
	});
	it("rejects unsupported payload structures before persistence", async () => {
		const outbox = createMemoryCorporateAdministrationOutboxPort();
		const invalid = {
			...eventFor({ organizationId: "org-invalid" }),
			payload: { unsupported: undefined },
		} as unknown as CorporateAdministrationPendingEvent;
		await expect(outbox.append([invalid])).rejects.toThrow();
	});
	it("does not expose scoped read methods that could cross organizations", () => {
		const outbox: CorporateAdministrationOutboxPort =
			createMemoryCorporateAdministrationOutboxPort();
		expect(outbox).not.toHaveProperty("list");
		expect(outbox).not.toHaveProperty("find");
		expect(outbox).not.toHaveProperty("read");
	});
	it("redacts adapter failures and rethrows unexpected programming errors", async () => {
		const event = eventFor({ organizationId: "org_failure" });
		const createStatement = vi.fn();
		const internalFailure = createDrizzleCorporateAdministrationOutboxPort({
			appender: {
				append: async () => errorResult.fail("INTERNAL_ERROR"),
				createStatement,
			},
		});
		const failure = await internalFailure.append([event]);
		expect(failure).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
		expect(JSON.stringify(failure)).not.toContain("insert into");
		expect(JSON.stringify(failure)).not.toContain("raw adapter failure");
		const programmingError = new TypeError("unexpected mapper defect");
		const throwing = createDrizzleCorporateAdministrationOutboxPort({
			appender: {
				append: async () => {
					throw programmingError;
				},
				createStatement,
			},
		});
		await expect(throwing.append([event])).resolves.toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
	});
	it("maps governed dependency unavailability to the CA service error", async () => {
		const outbox = createDrizzleCorporateAdministrationOutboxPort({
			appender: {
				append: async () => {
					throw { code: "08006" };
				},
				createStatement: vi.fn(),
			},
		});
		await expect(
			outbox.append([eventFor({ organizationId: "org_unavailable" })]),
		).resolves.toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
		});
	});
});
describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	"Corporate Administration outbox append contract (durable Neon)",
	() => {
		const cleanupOrganizations = new Set<string>();
		afterEach(async () => {
			for (const org of cleanupOrganizations) {
				await cleanupCorporateAdministrationInfrastructureTestData(org);
			}
			cleanupOrganizations.clear();
		});
		it("inserts one valid envelope with pending/unpublished defaults", async () => {
			const org = organizationId("one");
			cleanupOrganizations.add(org);
			const outbox = createDurableOutboxPort();
			const event = eventFor({
				organizationId: org,
				eventId: "event-one",
				aggregateVersion: 7,
				payload: { z: 1, nested: { b: 2, a: 1 } },
			});
			try {
				await expect(outbox.append([event])).resolves.toEqual(
					errorResult.ok(undefined),
				);
				const rows = await listCorporateAdministrationOutboxEvents(org);
				expect(rows).toHaveLength(1);
				expect(rows[0]).toMatchObject({
					organizationId: org,
					type: "corporate_administration.test_entity.created.v1",
					deduplicationKey: "event-one",
					payload: { z: 1, nested: { b: 2, a: 1 } },
					status: "pending",
					attempts: 0,
					processedAt: null,
				});
				expect(rows[0]?.metadata).toMatchObject({
					eventId: "event-one",
					aggregateType: "test_entity",
					aggregateId: "entity_1",
					aggregateVersion: 7,
					occurredAt: "2026-07-26T10:00:00.000Z",
				});
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(org);
			}
		});
		it("inserts multiple envelopes atomically and preserves organization scope", async () => {
			const org = organizationId("many");
			const otherOrg = `${org}-other`;
			cleanupOrganizations.add(org);
			cleanupOrganizations.add(otherOrg);
			const outbox = createDurableOutboxPort();
			const events = [
				eventFor({ organizationId: org, eventId: "event-many-1" }),
				eventFor({
					organizationId: org,
					eventId: "event-many-2",
					eventType: "corporate_administration.test_entity.updated.v1",
					aggregateVersion: 2,
					payload: { id: "entity_1", values: [2, 1] },
				}),
			];
			try {
				await expect(outbox.append(events)).resolves.toEqual(
					errorResult.ok(undefined),
				);
				const rows = await listCorporateAdministrationOutboxEvents(org);
				expect(rows).toHaveLength(2);
				expect(rows.map((row) => row.organizationId)).toEqual([org, org]);
				expect(rows.map((row) => row.type).sort()).toEqual([
					"corporate_administration.test_entity.created.v1",
					"corporate_administration.test_entity.updated.v1",
				]);
				expect(await listCorporateAdministrationOutboxEvents(otherOrg)).toEqual(
					[],
				);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(org);
				await cleanupCorporateAdministrationInfrastructureTestData(otherOrg);
			}
		});
		it("deduplicates repeated event IDs deterministically", async () => {
			const org = organizationId("duplicate");
			cleanupOrganizations.add(org);
			const outbox = createDurableOutboxPort();
			const event = eventFor({ organizationId: org, eventId: "event-dupe" });
			try {
				await expect(outbox.append([event])).resolves.toEqual(
					errorResult.ok(undefined),
				);
				await expect(outbox.append([event])).resolves.toEqual(
					errorResult.ok(undefined),
				);
				expect(await listCorporateAdministrationOutboxEvents(org)).toHaveLength(
					1,
				);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(org);
			}
		});
		it("keeps canonical payload semantics independent of insertion order", async () => {
			const org = organizationId("payload-order");
			cleanupOrganizations.add(org);
			const outbox = createDurableOutboxPort();
			const first = eventFor({
				organizationId: org,
				eventId: "event-order-1",
				payload: { a: 1, b: 2 },
			});
			const second = eventFor({
				organizationId: org,
				eventId: "event-order-2",
				payload: { b: 2, a: 1 },
			});
			try {
				await expect(outbox.append([second, first])).resolves.toEqual(
					errorResult.ok(undefined),
				);
				const rows = await listCorporateAdministrationOutboxEvents(org);
				expect(rows.map((row) => row.payload)).toEqual(
					expect.arrayContaining([
						{ a: 1, b: 2 },
						{ a: 1, b: 2 },
					]),
				);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(org);
			}
		});
	},
);
