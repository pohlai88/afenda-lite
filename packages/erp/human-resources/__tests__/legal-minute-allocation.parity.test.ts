/**
 * G08 legal-minute allocation — shared memory / Drizzle contract.
 * Cross-midnight break → per-date minutes → calendar classification.
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";
import type { HumanResourcesCommandOptions } from "../src/command-options";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { createProductionWorkCalendar } from "../src/production-work-calendar";
import {
	recordBreakEnd,
	recordBreakStart,
	recordClockIn,
	recordClockOut,
} from "../src/time/attendance/events";
import {
	getAttendanceSession,
	resolveAttendanceSession,
} from "../src/time/attendance/sessions";
import {
	addCalendarDateOverride,
	assignEmploymentCalendar,
	createWorkCalendar,
} from "../src/time/calendar";
import { resolveWorkCalendarCivilDay } from "../src/time/calendar-resolution";
import {
	allocateWorkedMinutesByCivilDate,
	attendanceEntrySourceReference,
	sessionBreakIntervals,
	workedMinutesForSessionCivilDate,
} from "../src/time/legal-minute-allocation";
import {
	createTimesheet,
	generateTimesheetEntries,
	listTimesheetEntries,
} from "../src/time/timesheet";
import { buildAttendanceTimesheetEntryPlans } from "../src/time/timesheet-generation";
import type { AttendanceSession, Employee, Employment } from "../src/types";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";

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

const SESSION_TIMEZONE = "America/Los_Angeles";
const LOCAL_WORK_DATE = "2025-08-12";
const CIVIL_DATE_BEFORE_MIDNIGHT = "2025-08-12";
const CIVIL_DATE_AFTER_MIDNIGHT = "2025-08-13";
const CLOCK_IN = "2025-08-13T05:00:00.000Z";
const CLOCK_OUT = "2025-08-13T13:00:00.000Z";
const BREAK_ONE_START = "2025-08-13T08:00:00.000Z";
const BREAK_ONE_END = "2025-08-13T08:15:00.000Z";
const BREAK_TWO_START = "2025-08-13T10:00:00.000Z";
const BREAK_TWO_END = "2025-08-13T10:15:00.000Z";
const MINUTES_BEFORE_MIDNIGHT = 120;
const MINUTES_AFTER_MIDNIGHT = 330;

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type OvernightSessionSeed = {
	employee: Employee;
	employment: Employment;
	session: AttendanceSession;
};

async function seedOvernightMultiBreakSession(input: {
	ready: HumanResourcesCommandOptions;
	org: string;
	actor: string;
	suffix: string;
	withHolidayOnSecondDate?: boolean;
}): Promise<OvernightSessionSeed> {
	const { ready, org, actor, suffix, withHolidayOnSecondDate = false } = input;

	const employee = await createEmployee(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-legal-minute-emp-${suffix}`,
			idempotencyKey: `idem-legal-minute-emp-${suffix}`,
			employeeNumber: `LM-${suffix}`.slice(0, 64),
			legalName: `Legal Minute Worker ${suffix}`,
		},
		ready,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) {
		throw new Error(`employee seed failed: ${employee.message}`);
	}

	const employment = await createEmployment(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-legal-minute-employment-${suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) {
		throw new Error("employment seed failed");
	}

	const calendar = await createWorkCalendar(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-legal-minute-calendar-${suffix}`,
			idempotencyKey: `idem-legal-minute-calendar-${suffix}`,
			code: `LM-CAL-${suffix}`.slice(0, 64),
			name: "Legal minute calendar",
			timezone: SESSION_TIMEZONE,
			calendarVersion: "v1",
			workWeek: STANDARD_WEEK,
			standardHoursPerDay: "8.00",
			effectiveFrom: "2025-01-01",
		},
		ready,
	);
	expect(calendar.ok).toBe(true);
	if (!calendar.ok) {
		throw new Error(`calendar seed failed: ${calendar.message}`);
	}

	const calendarAssignment = await assignEmploymentCalendar(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-legal-minute-calendar-assign-${suffix}`,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			calendarId: calendar.data.id,
			effectiveFrom: "2025-01-01",
		},
		ready,
	);
	expect(calendarAssignment.ok).toBe(true);
	if (!calendarAssignment.ok) {
		throw new Error("calendar assignment seed failed");
	}

	if (withHolidayOnSecondDate) {
		const holiday = await addCalendarDateOverride(
			{
				organizationId: org,
				actorUserId: actor,
				correlationId: `corr-legal-minute-holiday-${suffix}`,
				calendarId: calendar.data.id,
				holidayDate: CIVIL_DATE_AFTER_MIDNIGHT,
				overrideKind: "holiday",
				label: "Cross-midnight holiday",
			},
			ready,
		);
		expect(holiday.ok).toBe(true);
		if (!holiday.ok) {
			throw new Error("holiday override seed failed");
		}
	}

	const eventBase = {
		organizationId: org,
		actorUserId: actor,
		employeeId: employee.data.id,
		employmentId: employment.data.id,
		sourceTimezone: SESSION_TIMEZONE,
		localWorkDate: LOCAL_WORK_DATE,
	};

	const events = [
		await recordClockIn(
			{
				...eventBase,
				correlationId: `corr-legal-minute-in-${suffix}`,
				idempotencyKey: `idem-legal-minute-in-${suffix}`,
				occurredAt: CLOCK_IN,
			},
			ready,
		),
		await recordBreakStart(
			{
				...eventBase,
				correlationId: `corr-legal-minute-break-one-start-${suffix}`,
				idempotencyKey: `idem-legal-minute-break-one-start-${suffix}`,
				occurredAt: BREAK_ONE_START,
			},
			ready,
		),
		await recordBreakEnd(
			{
				...eventBase,
				correlationId: `corr-legal-minute-break-one-end-${suffix}`,
				idempotencyKey: `idem-legal-minute-break-one-end-${suffix}`,
				occurredAt: BREAK_ONE_END,
			},
			ready,
		),
		await recordBreakStart(
			{
				...eventBase,
				correlationId: `corr-legal-minute-break-two-start-${suffix}`,
				idempotencyKey: `idem-legal-minute-break-two-start-${suffix}`,
				occurredAt: BREAK_TWO_START,
			},
			ready,
		),
		await recordBreakEnd(
			{
				...eventBase,
				correlationId: `corr-legal-minute-break-two-end-${suffix}`,
				idempotencyKey: `idem-legal-minute-break-two-end-${suffix}`,
				occurredAt: BREAK_TWO_END,
			},
			ready,
		),
		await recordClockOut(
			{
				...eventBase,
				correlationId: `corr-legal-minute-out-${suffix}`,
				idempotencyKey: `idem-legal-minute-out-${suffix}`,
				occurredAt: CLOCK_OUT,
			},
			ready,
		),
	];
	expect(events.every((event) => event.ok)).toBe(true);

	const resolved = await resolveAttendanceSession(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-legal-minute-resolve-${suffix}`,
			idempotencyKey: `idem-legal-minute-resolve-${suffix}`,
			employeeId: employee.data.id,
			localWorkDate: LOCAL_WORK_DATE,
			timezone: SESSION_TIMEZONE,
		},
		ready,
	);
	expect(resolved.ok).toBe(true);
	if (!resolved.ok) {
		throw new Error("session resolve failed");
	}

	return {
		employee: employee.data,
		employment: employment.data,
		session: resolved.data,
	};
}

function defineLegalMinuteAllocationParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-legal-minute-parity-${suffix}`.slice(0, 64);
	const ACTOR = `user-legal-minute-parity-${suffix}`;

	const drizzleOrgs: string[] = [];

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs(drizzleOrgs);
		}
	});

	function trackOrg(org: string): string {
		if (adapter === "drizzle" && !drizzleOrgs.includes(org)) {
			drizzleOrgs.push(org);
		}
		return org;
	}

	it("persists break intervals through session resolve and store reload", async () => {
		const org = trackOrg(ORG);
		const ready = createHrParityHarness(adapter);
		const seeded = await seedOvernightMultiBreakSession({
			ready,
			org,
			actor: ACTOR,
			suffix,
		});

		expect(seeded.session).toMatchObject({
			resolutionStatus: "resolved",
			breakMinutes: 30,
			workedMinutes: 450,
			timezone: SESSION_TIMEZONE,
			localWorkDate: LOCAL_WORK_DATE,
		});
		expect(seeded.session.provenance.breakIntervals).toEqual([
			{ startedAt: BREAK_ONE_START, endedAt: BREAK_ONE_END },
			{ startedAt: BREAK_TWO_START, endedAt: BREAK_TWO_END },
		]);

		const reloaded = await getAttendanceSession(
			{
				organizationId: org,
				actorUserId: ACTOR,
				correlationId: `corr-legal-minute-reload-${suffix}`,
				sessionId: seeded.session.id,
			},
			ready,
		);
		expect(reloaded.ok).toBe(true);
		if (!reloaded.ok) return;
		expect(reloaded.data?.provenance.breakIntervals).toEqual([
			{ startedAt: BREAK_ONE_START, endedAt: BREAK_ONE_END },
			{ startedAt: BREAK_TWO_START, endedAt: BREAK_TWO_END },
		]);
		if (!reloaded.data) {
			throw new Error("Expected reloaded attendance session");
		}
		expect(sessionBreakIntervals(reloaded.data)).toHaveLength(2);
	});

	it("allocates worked minutes across civil dates from persisted break intervals", async () => {
		const org = trackOrg(ORG);
		const ready = createHrParityHarness(adapter);
		const seeded = await seedOvernightMultiBreakSession({
			ready,
			org,
			actor: ACTOR,
			suffix: `${suffix}-allocate`,
		});

		const intervals = sessionBreakIntervals(seeded.session);
		expect(intervals).toHaveLength(2);

		const { firstClockInAt, finalClockOutAt } = seeded.session;
		expect(firstClockInAt).toBeDefined();
		expect(finalClockOutAt).toBeDefined();
		if (!firstClockInAt || !finalClockOutAt) {
			throw new Error("Expected closed attendance session timestamps");
		}

		const allocated = allocateWorkedMinutesByCivilDate({
			firstClockInAt,
			finalClockOutAt,
			breakIntervals: intervals,
			timeZone: SESSION_TIMEZONE,
		});
		expect(allocated.get(CIVIL_DATE_BEFORE_MIDNIGHT)).toBe(
			MINUTES_BEFORE_MIDNIGHT,
		);
		expect(allocated.get(CIVIL_DATE_AFTER_MIDNIGHT)).toBe(
			MINUTES_AFTER_MIDNIGHT,
		);

		expect(
			workedMinutesForSessionCivilDate(
				seeded.session,
				CIVIL_DATE_BEFORE_MIDNIGHT,
			),
		).toBe(MINUTES_BEFORE_MIDNIGHT);
		expect(
			workedMinutesForSessionCivilDate(
				seeded.session,
				CIVIL_DATE_AFTER_MIDNIGHT,
			),
		).toBe(MINUTES_AFTER_MIDNIGHT);

		const plans = buildAttendanceTimesheetEntryPlans(seeded.session);
		expect(plans).toEqual([
			{
				workDate: CIVIL_DATE_BEFORE_MIDNIGHT,
				sourceReference: attendanceEntrySourceReference(
					seeded.session.id,
					CIVIL_DATE_BEFORE_MIDNIGHT,
				),
				recordedMinutes: MINUTES_BEFORE_MIDNIGHT,
				approvedMinutes: MINUTES_BEFORE_MIDNIGHT,
			},
			{
				workDate: CIVIL_DATE_AFTER_MIDNIGHT,
				sourceReference: attendanceEntrySourceReference(
					seeded.session.id,
					CIVIL_DATE_AFTER_MIDNIGHT,
				),
				recordedMinutes: MINUTES_AFTER_MIDNIGHT,
				approvedMinutes: MINUTES_AFTER_MIDNIGHT,
			},
		]);
	});

	it("classifies each civil date through the resolved employment calendar", async () => {
		const org = trackOrg(ORG);
		const ready = createHrParityHarness(adapter);
		const seeded = await seedOvernightMultiBreakSession({
			ready,
			org,
			actor: ACTOR,
			suffix: `${suffix}-calendar`,
			withHolidayOnSecondDate: true,
		});

		const lookup = createStoreWorkCalendarLookup({ store: ready.store });
		const context = await lookup.resolveCalendarContext({
			organizationId: org,
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			fromDate: CIVIL_DATE_BEFORE_MIDNIGHT,
			toDate: CIVIL_DATE_AFTER_MIDNIGHT,
		});
		expect(context.ok).toBe(true);
		if (!context.ok) return;

		const beforeMidnight = resolveWorkCalendarCivilDay(
			context.data,
			CIVIL_DATE_BEFORE_MIDNIGHT,
		);
		expect(beforeMidnight.isWorkingDay).toBe(true);
		expect(beforeMidnight.expectedMinutes).toBe(480);
		expect(beforeMidnight.overrideKind).toBeNull();

		const afterMidnight = resolveWorkCalendarCivilDay(
			context.data,
			CIVIL_DATE_AFTER_MIDNIGHT,
		);
		expect(afterMidnight.isWorkingDay).toBe(false);
		expect(afterMidnight.expectedMinutes).toBeNull();
		expect(afterMidnight.overrideKind).toBe("holiday");

		const production = createProductionWorkCalendar({ lookup });
		const firstDateWorking = await production.isWorkingDay({
			organizationId: org,
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			date: CIVIL_DATE_BEFORE_MIDNIGHT,
		});
		expect(firstDateWorking.ok).toBe(true);
		if (!firstDateWorking.ok) return;
		expect(firstDateWorking.data).toBe(true);

		const secondDateWorking = await production.isWorkingDay({
			organizationId: org,
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			date: CIVIL_DATE_AFTER_MIDNIGHT,
		});
		expect(secondDateWorking.ok).toBe(true);
		if (!secondDateWorking.ok) return;
		expect(secondDateWorking.data).toBe(false);
	});

	it("generates split attendance timesheet entries for cross-midnight sessions", async () => {
		const org = trackOrg(ORG);
		const ready = createHrParityHarness(adapter);
		const seeded = await seedOvernightMultiBreakSession({
			ready,
			org,
			actor: ACTOR,
			suffix: `${suffix}-timesheet`,
		});

		const timesheet = await createTimesheet(
			{
				organizationId: org,
				actorUserId: ACTOR,
				correlationId: `corr-legal-minute-timesheet-${suffix}`,
				idempotencyKey: `idem-legal-minute-timesheet-${suffix}`,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				periodStart: CIVIL_DATE_BEFORE_MIDNIGHT,
				periodEnd: CIVIL_DATE_AFTER_MIDNIGHT,
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) return;

		const lookup = createStoreWorkCalendarLookup({ store: ready.store });
		const generated = await generateTimesheetEntries(
			{
				organizationId: org,
				actorUserId: ACTOR,
				correlationId: `corr-legal-minute-generate-${suffix}`,
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			{
				...ready,
				workCalendar: createProductionWorkCalendar({ lookup }),
			},
		);
		expect(generated.ok).toBe(true);
		if (!generated.ok) return;

		const listed = await listTimesheetEntries(
			{
				organizationId: org,
				actorUserId: ACTOR,
				correlationId: `corr-legal-minute-list-${suffix}`,
				timesheetId: timesheet.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;

		const attendanceEntries = listed.data
			.filter((entry) => entry.sourceType === "attendance")
			.toSorted((a, b) => a.workDate.localeCompare(b.workDate));
		expect(attendanceEntries).toHaveLength(2);
		expect(attendanceEntries[0]).toMatchObject({
			workDate: CIVIL_DATE_BEFORE_MIDNIGHT,
			sourceReference: attendanceEntrySourceReference(
				seeded.session.id,
				CIVIL_DATE_BEFORE_MIDNIGHT,
			),
			recordedMinutes: MINUTES_BEFORE_MIDNIGHT,
			approvedMinutes: MINUTES_BEFORE_MIDNIGHT,
			timeType: "regular",
		});
		expect(attendanceEntries[1]).toMatchObject({
			workDate: CIVIL_DATE_AFTER_MIDNIGHT,
			sourceReference: attendanceEntrySourceReference(
				seeded.session.id,
				CIVIL_DATE_AFTER_MIDNIGHT,
			),
			recordedMinutes: MINUTES_AFTER_MIDNIGHT,
			approvedMinutes: MINUTES_AFTER_MIDNIGHT,
			timeType: "regular",
		});
	});
}

describe("legal-minute-allocation (memory)", () => {
	defineLegalMinuteAllocationParitySuite("memory");
});

describe.runIf(runDrizzleParity)("legal-minute-allocation (drizzle)", () => {
	defineLegalMinuteAllocationParitySuite("drizzle");
});
