/**
 * G06 — effective-dated calendar and shift successor lineage (memory / Drizzle).
 * Uses employment-calendar assignment + selectEffectiveLineageRecord; does not
 * exercise C01 scoped-calendar precedence.
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { selectEffectiveLineageRecord } from "../src/shared/effective-lineage";
import {
	assignEmploymentCalendar,
	createWorkCalendar,
	getWorkCalendar,
	resolveEmploymentCalendar,
	supersedeWorkCalendar,
} from "../src/time/calendar";
import {
	activateShift,
	createShift,
	getShift,
	supersedeShift,
} from "../src/time/shift";
import type { Shift, WorkCalendar } from "../src/types";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";

const { hasDatabase } = resolveDatabaseUrlForTests();
const runDrizzleParity =
	hasDatabase && process.env.REQUIRE_DATABASE_TESTS === "1";

const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
	dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
	isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
	standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
	standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
	standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
}));

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lineageEligibleCalendar(calendar: WorkCalendar): boolean {
	return calendar.status === "active" || calendar.status === "superseded";
}

function lineageEligibleShift(shift: Shift): boolean {
	return shift.status === "active" || shift.status === "superseded";
}

function defineSuccessorLineageParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-successor-lineage-${suffix}`;
	const ACTOR = `user-hr-successor-lineage-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("persists calendar successor lineage and resolves history through supersede", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-employee-${suffix}`,
				idempotencyKey: `idem-lineage-employee-${suffix}`,
				employeeNumber: `EL-${suffix}`,
				legalName: `Lineage Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-calendar-${suffix}`,
				idempotencyKey: `idem-lineage-calendar-${suffix}`,
				code: `LINEAGE-CAL-${suffix}`,
				name: "Lineage Calendar v1",
				timezone: "UTC",
				calendarVersion: "v1",
				workWeek: STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) return;

		const assigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-calendar-assign-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);

		const supersession = await supersedeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-calendar-supersede-${suffix}`,
				idempotencyKey: `idem-lineage-calendar-supersede-${suffix}`,
				calendarId: calendar.data.id,
				expectedVersion: calendar.data.version,
				calendarVersion: "v2",
				effectiveFrom: "2025-08-01",
				standardHoursPerDay: "7.50",
			},
			ready,
		);
		expect(supersession.ok).toBe(true);
		if (!supersession.ok) return;

		expect(supersession.data.superseded).toMatchObject({
			id: calendar.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(supersession.data.successor).toMatchObject({
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesCalendarId: calendar.data.id,
		});

		const persistedRoot = await getWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-calendar-root-${suffix}`,
				calendarId: calendar.data.id,
			},
			ready,
		);
		expect(persistedRoot.ok).toBe(true);
		if (!persistedRoot.ok) return;
		expect(persistedRoot.data).toMatchObject({
			status: "superseded",
			effectiveTo: "2025-07-31",
			supersedesCalendarId: null,
		});

		const persistedSuccessor = await getWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-calendar-successor-${suffix}`,
				calendarId: supersession.data.successor.id,
			},
			ready,
		);
		expect(persistedSuccessor.ok).toBe(true);
		if (!persistedSuccessor.ok) return;
		expect(persistedSuccessor.data).toMatchObject({
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesCalendarId: calendar.data.id,
		});

		const lineageRecords = [persistedRoot.data, persistedSuccessor.data];
		expect(
			selectEffectiveLineageRecord({
				assignedId: calendar.data.id,
				records: lineageRecords,
				asOf: "2025-07-31",
				getPredecessorId: (record) => record.supersedesCalendarId,
				isEligible: lineageEligibleCalendar,
			})?.id,
		).toBe(calendar.data.id);
		expect(
			selectEffectiveLineageRecord({
				assignedId: calendar.data.id,
				records: lineageRecords,
				asOf: "2025-08-01",
				getPredecessorId: (record) => record.supersedesCalendarId,
				isEligible: lineageEligibleCalendar,
			})?.id,
		).toBe(supersession.data.successor.id);

		const historical = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-calendar-historical-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(historical.ok).toBe(true);
		if (!historical.ok) return;
		expect(historical.data?.calendarId).toBe(calendar.data.id);

		const future = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-calendar-future-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(future.ok).toBe(true);
		if (!future.ok) return;
		expect(future.data?.calendarId).toBe(supersession.data.successor.id);
	});

	it("persists shift successor lineage without rewriting the predecessor row", async () => {
		const ready = createHrParityHarness(adapter);
		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-shift-${suffix}`,
				idempotencyKey: `idem-lineage-shift-${suffix}`,
				code: `LINEAGE-SHIFT-${suffix}`,
				name: "Lineage Shift v1",
				shiftKind: "fixed",
				startLocal: "09:00",
				endLocal: "17:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) return;

		const activated = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-shift-activate-${suffix}`,
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;

		const supersession = await supersedeShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-shift-supersede-${suffix}`,
				idempotencyKey: `idem-lineage-shift-supersede-${suffix}`,
				shiftId: activated.data.id,
				expectedVersion: activated.data.version,
				effectiveFrom: "2025-08-01",
				endLocal: "16:30",
				expectedMinutes: 450,
			},
			ready,
		);
		expect(supersession.ok).toBe(true);
		if (!supersession.ok) return;

		expect(supersession.data.superseded).toMatchObject({
			id: activated.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(supersession.data.successor).toMatchObject({
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesShiftId: activated.data.id,
		});

		const persistedRoot = await getShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-shift-root-${suffix}`,
				shiftId: activated.data.id,
			},
			ready,
		);
		expect(persistedRoot.ok).toBe(true);
		if (!persistedRoot.ok) return;
		expect(persistedRoot.data).toMatchObject({
			status: "superseded",
			effectiveTo: "2025-07-31",
			supersedesShiftId: null,
			expectedMinutes: 480,
		});

		const persistedSuccessor = await getShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lineage-shift-successor-${suffix}`,
				shiftId: supersession.data.successor.id,
			},
			ready,
		);
		expect(persistedSuccessor.ok).toBe(true);
		if (!persistedSuccessor.ok) return;
		expect(persistedSuccessor.data).toMatchObject({
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesShiftId: activated.data.id,
			expectedMinutes: 450,
		});

		const lineageRecords = [persistedRoot.data, persistedSuccessor.data];
		expect(
			selectEffectiveLineageRecord({
				assignedId: activated.data.id,
				records: lineageRecords,
				asOf: "2025-07-31",
				getPredecessorId: (record) => record.supersedesShiftId,
				isEligible: lineageEligibleShift,
			})?.id,
		).toBe(activated.data.id);
		expect(
			selectEffectiveLineageRecord({
				assignedId: activated.data.id,
				records: lineageRecords,
				asOf: "2025-08-01",
				getPredecessorId: (record) => record.supersedesShiftId,
				isEligible: lineageEligibleShift,
			})?.id,
		).toBe(supersession.data.successor.id);
	});
}

describe("successor-lineage (memory)", () => {
	defineSuccessorLineageParitySuite("memory");
});

describe.runIf(runDrizzleParity)("successor-lineage (drizzle)", () => {
	defineSuccessorLineageParitySuite("drizzle");
});
