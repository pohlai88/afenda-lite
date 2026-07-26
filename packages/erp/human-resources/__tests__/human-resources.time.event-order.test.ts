import { describe, expect, it } from "vitest";

import {
	parseHumanResourcesAttendanceEventId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
} from "../src/brands";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import {
	createMemoryHumanResourcesStore,
	createStoreAssignmentContextQuery,
} from "../src/testing";
import {
	compareAttendanceEventsForSession,
	resolveAttendanceEventSourceSequence,
	sortAttendanceEventsForSession,
} from "../src/time/attendance/event-order";
import { listAttendanceEvents } from "../src/time/attendance/events";
import { importAttendanceEvents } from "../src/time/attendance/import";
import { namespacedImportSourceReference } from "../src/time/attendance/import-keys";
import { resolveSessionFromEvents } from "../src/time/attendance/session-resolution";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import type { AttendanceEvent } from "../src/types";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createStoreBackedIdentityResolver } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-attendance-order";
const ACTOR = "actor-attendance-order";
const EMPLOYEE_ID = parseHumanResourcesEmployeeId(
	"00000000-0000-4000-8000-000000000101",
);
const EMPLOYMENT_ID = parseHumanResourcesEmploymentId(
	"00000000-0000-4000-8000-000000000102",
);
const WORK_DATE = "2025-07-25";
const SAME_TIME = new Date("2025-07-25T09:00:00.000Z");

if (!EMPLOYEE_ID.ok || !EMPLOYMENT_ID.ok) {
	throw new Error("fixture brand parse failed");
}

function eventId(suffix: string) {
	const parsed = parseHumanResourcesAttendanceEventId(
		`00000000-0000-4000-8000-${suffix.padStart(12, "0")}`,
	);
	if (!parsed.ok) {
		throw new Error(parsed.message);
	}
	return parsed.data;
}

function buildEvent(input: {
	idSuffix: string;
	eventType: AttendanceEvent["eventType"];
	sourceSequence: number;
	occurredAt?: Date;
}): AttendanceEvent {
	const now = new Date("2025-07-25T12:00:00.000Z");
	return {
		id: eventId(input.idSuffix),
		organizationId: ORG,
		employeeId: EMPLOYEE_ID.data,
		employmentId: EMPLOYMENT_ID.data,
		shiftAssignmentId: null,
		eventType: input.eventType,
		capturedOccurredAt: input.occurredAt ?? SAME_TIME,
		occurredAt: input.occurredAt ?? SAME_TIME,
		sourceSequence: input.sourceSequence,
		sourceTimezone: "Asia/Singapore",
		localWorkDate: WORK_DATE,
		source: "import",
		sourceReference: `ref-${input.idSuffix}`,
		locationKey: null,
		deviceMetadata: null,
		payloadChecksum: null,
		capturedNotes: null,
		notes: null,
		voidedAt: null,
		voidReason: null,
		version: 1,
		createdBy: ACTOR,
		updatedBy: ACTOR,
		createdAt: now,
		updatedAt: now,
	};
}

function harness() {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	const identityResolver = createStoreBackedIdentityResolver(store);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
		identityResolver,
		assignmentContext: createStoreAssignmentContextQuery({ store }),
	});
}

describe("human-resources.time event order", () => {
	it("sorts by occurredAt, then sourceSequence, then id", () => {
		const events = [
			buildEvent({
				idSuffix: "000000000003",
				eventType: "clock_out",
				sourceSequence: 1,
			}),
			buildEvent({
				idSuffix: "000000000001",
				eventType: "clock_in",
				sourceSequence: 0,
			}),
			buildEvent({
				idSuffix: "000000000002",
				eventType: "break_start",
				sourceSequence: 0,
			}),
		];
		const shuffled = [events[0], events[2], events[1]];
		const sorted = sortAttendanceEventsForSession(shuffled);
		expect(sorted.map((event) => event.id)).toEqual([
			events[1].id,
			events[2].id,
			events[0].id,
		]);
		expect(
			compareAttendanceEventsForSession(sorted[0], sorted[1]),
		).toBeLessThan(0);
	});

	it("breaks equal occurredAt ties with sourceSequence", () => {
		const clockInFirst = buildEvent({
			idSuffix: "000000000010",
			eventType: "clock_in",
			sourceSequence: 0,
		});
		const clockOutSecond = buildEvent({
			idSuffix: "000000000011",
			eventType: "clock_out",
			sourceSequence: 1,
		});
		const reversed = sortAttendanceEventsForSession([
			clockOutSecond,
			clockInFirst,
		]);
		expect(reversed.map((event) => event.eventType)).toEqual([
			"clock_in",
			"clock_out",
		]);
	});

	it("breaks equal occurredAt and sourceSequence ties with id", () => {
		const earlierId = buildEvent({
			idSuffix: "000000000012",
			eventType: "clock_in",
			sourceSequence: 0,
		});
		const laterId = buildEvent({
			idSuffix: "000000000013",
			eventType: "clock_out",
			sourceSequence: 0,
		});
		const sorted = sortAttendanceEventsForSession([laterId, earlierId]);
		expect(sorted.map((event) => event.id)).toEqual([earlierId.id, laterId.id]);
	});

	it("produces stable session minutes and resolution status across shuffles", () => {
		const clockIn = buildEvent({
			idSuffix: "000000000020",
			eventType: "clock_in",
			sourceSequence: 0,
		});
		const breakStart = buildEvent({
			idSuffix: "000000000021",
			eventType: "break_start",
			sourceSequence: 1,
		});
		const breakEnd = buildEvent({
			idSuffix: "000000000022",
			eventType: "break_end",
			sourceSequence: 2,
			occurredAt: new Date("2025-07-25T09:30:00.000Z"),
		});
		const clockOut = buildEvent({
			idSuffix: "000000000023",
			eventType: "clock_out",
			sourceSequence: 3,
			occurredAt: new Date("2025-07-25T17:00:00.000Z"),
		});
		const ordered = [clockIn, breakStart, breakEnd, clockOut];
		const shuffled = [breakEnd, clockIn, clockOut, breakStart];
		const first = resolveSessionFromEvents(
			sortAttendanceEventsForSession(ordered),
		);
		const second = resolveSessionFromEvents(
			sortAttendanceEventsForSession(shuffled),
		);
		expect(second).toEqual(first);
		expect(first.breakMinutes).toBe(30);
		expect(first.workedMinutes).toBe(450);
		expect(first.resolutionStatus).toBe("resolved");
	});

	it("allocates the next source sequence when none is explicit", () => {
		expect(
			resolveAttendanceEventSourceSequence({
				existingEvents: [{ sourceSequence: 0 }, { sourceSequence: 2 }],
			}),
		).toBe(3);
		expect(
			resolveAttendanceEventSourceSequence({
				explicit: 5,
				existingEvents: [{ sourceSequence: 0 }],
			}),
		).toBe(5);
	});
});

describe("human-resources.time session determinism integration", () => {
	async function seedEmployeeEmployment(ready: ReturnType<typeof harness>) {
		const suffix = `${Date.now()}`;
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employee-${suffix}`,
				idempotencyKey: `idem-employee-${suffix}`,
				employeeNumber: `E-ORDER-${suffix}`,
				legalName: `Order Test ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			throw new Error(employee.message);
		}
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) {
			throw new Error(employment.message);
		}
		return { employee: employee.data, employment: employment.data };
	}

	it("orders equal-timestamp import rows by sourceSequence for session resolution", async () => {
		const ready = harness();
		const { employee } = await seedEmployeeEmployment(ready);
		const imported = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-import-order",
				idempotencyKey: "idem-import-order",
				batchId: "batch-order",
				sourceKey: "connector",
				events: [
					{
						employeeId: employee.id,
						eventType: "clock_out",
						occurredAt: SAME_TIME.toISOString(),
						sourceTimezone: "Asia/Singapore",
						localWorkDate: WORK_DATE,
						sourceReference: "row-clock-out",
						sourceSequence: 1,
					},
					{
						employeeId: employee.id,
						eventType: "clock_in",
						occurredAt: SAME_TIME.toISOString(),
						sourceTimezone: "Asia/Singapore",
						localWorkDate: WORK_DATE,
						sourceReference: "row-clock-in",
						sourceSequence: 0,
					},
				],
			},
			ready,
		);
		expect(imported.ok).toBe(true);
		if (!imported.ok) return;

		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-session-order",
				idempotencyKey: "idem-session-order",
				employeeId: employee.id,
				localWorkDate: WORK_DATE,
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;
		expect(session.data.resolutionStatus).toBe("resolved");
		expect(session.data.workedMinutes).toBe(0);
		expect(session.data.breakMinutes).toBe(0);

		const replay = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-import-order-replay",
				idempotencyKey: "idem-import-order-replay",
				batchId: "batch-order-replay",
				sourceKey: "connector",
				events: [
					{
						employeeId: employee.id,
						eventType: "clock_out",
						occurredAt: SAME_TIME.toISOString(),
						sourceTimezone: "Asia/Singapore",
						localWorkDate: WORK_DATE,
						sourceReference: "row-clock-out",
						sourceSequence: 1,
					},
					{
						employeeId: employee.id,
						eventType: "clock_in",
						occurredAt: SAME_TIME.toISOString(),
						sourceTimezone: "Asia/Singapore",
						localWorkDate: WORK_DATE,
						sourceReference: "row-clock-in",
						sourceSequence: 0,
					},
				],
			},
			ready,
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;
		expect(replay.data.skipped).toHaveLength(2);
	});

	it("allocates sourceSequence sequentially when import rows omit it", async () => {
		const ready = harness();
		const { employee } = await seedEmployeeEmployment(ready);
		const workDate = "2025-07-26";
		const sameInstant = "2025-07-26T09:00:00.000Z";
		const sourceKey = "connector";

		const imported = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-import-alloc",
				idempotencyKey: "idem-import-alloc",
				batchId: "batch-alloc",
				sourceKey,
				events: [
					{
						employeeId: employee.id,
						eventType: "clock_in",
						occurredAt: sameInstant,
						sourceTimezone: "Asia/Singapore",
						localWorkDate: workDate,
						sourceReference: "alloc-clock-in",
					},
					{
						employeeId: employee.id,
						eventType: "clock_out",
						occurredAt: sameInstant,
						sourceTimezone: "Asia/Singapore",
						localWorkDate: workDate,
						sourceReference: "alloc-clock-out",
					},
				],
			},
			ready,
		);
		expect(imported.ok).toBe(true);
		if (!imported.ok) return;

		const listed = await listAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-list-alloc",
				employeeId: employee.id,
				fromDate: workDate,
				toDate: workDate,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		const byReference = new Map(
			listed.data.map((event) => [event.sourceReference, event.sourceSequence]),
		);
		expect(
			byReference.get(
				namespacedImportSourceReference(sourceKey, "alloc-clock-in"),
			),
		).toBe(0);
		expect(
			byReference.get(
				namespacedImportSourceReference(sourceKey, "alloc-clock-out"),
			),
		).toBe(1);

		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-session-alloc",
				idempotencyKey: "idem-session-alloc",
				employeeId: employee.id,
				localWorkDate: workDate,
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) return;
		expect(session.data.resolutionStatus).toBe("resolved");
		expect(session.data.workedMinutes).toBe(0);
		expect(session.data.breakMinutes).toBe(0);
	});
});
