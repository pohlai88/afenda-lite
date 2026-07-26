/**
 * Slice 7.6 — work-calendar administration close matrix (memory / Drizzle).
 */

import { afterAll, describe, expect, it } from "vitest";
import type { HumanResourcesCommandOptions } from "../src/command-options";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import {
	addCalendarDateOverride,
	addWorkCalendarHoliday,
	archiveWorkCalendar,
	assignEmploymentCalendar,
	assignWorkCalendarScope,
	createWorkCalendar,
	endWorkCalendarAssignment,
	endWorkCalendarScopeAssignment,
	getWorkCalendar,
	listWorkCalendarHolidays,
	removeCalendarDateOverride,
	removeWorkCalendarHoliday,
	resolveEmployeeWorkCalendar,
	resolveEmploymentCalendar,
	supersedeWorkCalendar,
	updateWorkCalendar,
} from "../src/time/calendar";
import type { WorkCalendar } from "../src/types";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	STANDARD_WEEK,
	seedParityEmployeeEmployment,
	uniqueSuffix,
} from "./helpers/time-parity-shared";

async function seedEmployeeEmployment(
	ready: HumanResourcesCommandOptions,
	org: string,
	actor: string,
	suffix: string,
) {
	return seedParityEmployeeEmployment(ready, {
		organizationId: org,
		actorUserId: actor,
		suffix,
		correlationTag: "76",
	});
}

async function seedCalendar(
	ready: HumanResourcesCommandOptions,
	org: string,
	actor: string,
	suffix: string,
	code: string,
): Promise<WorkCalendar> {
	const created = await createWorkCalendar(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-76-cal-${suffix}-${code}`,
			idempotencyKey: `idem-76-cal-${suffix}-${code}`,
			code: `CAL76-${code}-${suffix}`.slice(0, 64),
			name: `Calendar ${code}`,
			timezone: "Asia/Singapore",
			calendarVersion: "v1",
			workWeek: STANDARD_WEEK,
			standardHoursPerDay: "8.00",
			effectiveFrom: "2025-01-01",
		},
		ready,
	);
	expect(created.ok).toBe(true);
	if (!created.ok) {
		throw new Error(`createWorkCalendar failed: ${created.message}`);
	}
	return created.data;
}

function defineCalendarAdminParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-cal-admin-76-${suffix}`);
	const ACTOR = `user-hr-cal-admin-76-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("administers versioned calendars: create, update, supersede lineage, archive", async () => {
		const ready = createHrParityHarness(adapter);

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-create-${suffix}`,
				idempotencyKey: `idem-76-create-${suffix}`,
				code: `ADMIN-CAL-${suffix}`.slice(0, 64),
				name: "Admin Calendar v1",
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

		const updated = await updateWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-update-${suffix}`,
				calendarId: calendar.data.id,
				name: "Admin Calendar v1 updated",
				expectedVersion: calendar.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) return;
		expect(updated.data.name).toBe("Admin Calendar v1 updated");

		const supersession = await supersedeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-supersede-${suffix}`,
				idempotencyKey: `idem-76-supersede-${suffix}`,
				calendarId: updated.data.id,
				expectedVersion: updated.data.version,
				calendarVersion: "v2",
				effectiveFrom: "2025-08-01",
				standardHoursPerDay: "7.50",
			},
			ready,
		);
		expect(supersession.ok).toBe(true);
		if (!supersession.ok) return;
		expect(supersession.data.superseded).toMatchObject({
			id: updated.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(supersession.data.successor).toMatchObject({
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesCalendarId: updated.data.id,
		});

		const archived = await archiveWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-archive-${suffix}`,
				calendarId: supersession.data.superseded.id,
				expectedVersion: supersession.data.superseded.version,
			},
			ready,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) return;
		expect(archived.data.status).toBe("archived");
	});

	it("administers holidays and date overrides: add, list, remove", async () => {
		const ready = createHrParityHarness(adapter);
		const calendar = await seedCalendar(ready, ORG, ACTOR, suffix, "holiday");

		const holiday = await addWorkCalendarHoliday(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-holiday-add-${suffix}`,
				calendarId: calendar.id,
				holidayDate: "2025-07-04",
				label: "Independence Day",
			},
			ready,
		);
		expect(holiday.ok).toBe(true);
		if (!holiday.ok) return;

		const override = await addCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-override-add-${suffix}`,
				calendarId: calendar.id,
				holidayDate: "2025-07-05",
				overrideKind: "shortened_day",
				isWorkingDay: true,
				expectedMinutes: 240,
				label: "Half day",
			},
			ready,
		);
		expect(override.ok).toBe(true);
		if (!override.ok) return;

		const listed = await listWorkCalendarHolidays(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-holiday-list-${suffix}`,
				calendarId: calendar.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.some((row) => row.id === holiday.data.id)).toBe(true);
		expect(listed.data.some((row) => row.id === override.data.id)).toBe(true);

		const overrideRemoved = await removeCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-override-remove-${suffix}`,
				holidayId: override.data.id,
			},
			ready,
		);
		expect(overrideRemoved.ok).toBe(true);

		const holidayRemoved = await removeWorkCalendarHoliday(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-holiday-remove-${suffix}`,
				holidayId: holiday.data.id,
			},
			ready,
		);
		expect(holidayRemoved.ok).toBe(true);

		const afterRemove = await listWorkCalendarHolidays(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-holiday-list-after-${suffix}`,
				calendarId: calendar.id,
			},
			ready,
		);
		expect(afterRemove.ok).toBe(true);
		if (!afterRemove.ok) return;
		expect(afterRemove.data.some((row) => row.id === holiday.data.id)).toBe(
			false,
		);
		expect(afterRemove.data.some((row) => row.id === override.data.id)).toBe(
			false,
		);
	});

	it("administers employment calendar assignments: assign, end, resolve", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-employment`,
		);
		const calendar = await seedCalendar(
			ready,
			ORG,
			ACTOR,
			suffix,
			"employment",
		);

		const assigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-employment-assign-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) return;

		const resolved = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-employment-resolve-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-06-01",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data?.calendarId).toBe(calendar.id);

		const ended = await endWorkCalendarAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-employment-end-${suffix}`,
				assignmentId: assigned.data.id,
				effectiveTo: "2025-06-30",
				expectedVersion: assigned.data.version,
			},
			ready,
		);
		expect(ended.ok).toBe(true);
		if (!ended.ok) return;

		const afterEnd = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-employment-resolve-after-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-07-01",
			},
			ready,
		);
		expect(afterEnd.ok).toBe(true);
		if (!afterEnd.ok) return;
		expect(afterEnd.data).toBeNull();
	});

	it("administers scoped calendar assignments: assign, end", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-scope`,
		);
		const calFirst = await seedCalendar(ready, ORG, ACTOR, suffix, "scope-a");
		const calSecond = await seedCalendar(ready, ORG, ACTOR, suffix, "scope-b");

		const first = await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-scope-assign-${suffix}`,
				scopeType: "organization",
				scopeKey: ORG,
				calendarId: calFirst.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const ended = await endWorkCalendarScopeAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-scope-end-${suffix}`,
				assignmentId: first.data.id,
				effectiveTo: "2025-06-30",
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(ended.ok).toBe(true);
		if (!ended.ok) return;

		await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-scope-assign-2-${suffix}`,
				scopeType: "organization",
				scopeKey: ORG,
				calendarId: calSecond.id,
				effectiveFrom: "2025-07-01",
			},
			ready,
		);

		const before = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-scope-resolve-before-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-06-01",
			},
			ready,
		);
		expect(before.ok).toBe(true);
		if (!before.ok) return;
		expect(before.data.calendarId).toBe(calFirst.id);

		const after = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-scope-resolve-after-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-07-01",
			},
			ready,
		);
		expect(after.ok).toBe(true);
		if (!after.ok) return;
		expect(after.data.calendarId).toBe(calSecond.id);
	});

	it("enforces scope precedence and fail-closed tie conflicts", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-precedence`,
		);
		const orgCalendar = await seedCalendar(
			ready,
			ORG,
			ACTOR,
			suffix,
			"prec-org",
		);
		const employeeCalendar = await seedCalendar(
			ready,
			ORG,
			ACTOR,
			suffix,
			"prec-emp",
		);
		const employmentCalendar = await seedCalendar(
			ready,
			ORG,
			ACTOR,
			suffix,
			"prec-employ",
		);

		await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-prec-org-${suffix}`,
				scopeType: "organization",
				scopeKey: ORG,
				calendarId: orgCalendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-prec-employee-${suffix}`,
				scopeType: "employee",
				scopeKey: employee.id,
				calendarId: employeeCalendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-prec-employment-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: employmentCalendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		const resolved = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-prec-resolve-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-06-01",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(employmentCalendar.id);

		const tieCalendarA = await seedCalendar(ready, ORG, ACTOR, suffix, "tie-a");
		const tieCalendarB = await seedCalendar(ready, ORG, ACTOR, suffix, "tie-b");
		const { employee: tieEmployee, employment: tieEmployment } =
			await seedEmployeeEmployment(ready, ORG, ACTOR, `${suffix}-tie`);

		await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-tie-employment-${suffix}`,
				employeeId: tieEmployee.id,
				employmentId: tieEmployment.id,
				calendarId: tieCalendarA.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-tie-scope-${suffix}`,
				scopeType: "employment",
				scopeKey: tieEmployment.id,
				calendarId: tieCalendarB.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		const tie = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-tie-resolve-${suffix}`,
				employeeId: tieEmployee.id,
				employmentId: tieEmployment.id,
				asOf: "2025-06-01",
			},
			ready,
		);
		expect(tie.ok).toBe(false);
		if (tie.ok) return;
		expect(humanResourcesCodeFromResult(tie)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("resolves employment and employee calendars as-of before and after supersede", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-asof`,
		);

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-create-${suffix}`,
				idempotencyKey: `idem-76-asof-create-${suffix}`,
				code: `ASOF-CAL-${suffix}`.slice(0, 64),
				name: "As-of Calendar v1",
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

		await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-assign-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		const supersession = await supersedeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-supersede-${suffix}`,
				idempotencyKey: `idem-76-asof-supersede-${suffix}`,
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

		const employmentHistorical = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-employment-hist-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(employmentHistorical.ok).toBe(true);
		if (!employmentHistorical.ok) return;
		expect(employmentHistorical.data?.calendarId).toBe(calendar.data.id);

		const employmentFuture = await resolveEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-employment-future-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(employmentFuture.ok).toBe(true);
		if (!employmentFuture.ok) return;
		expect(employmentFuture.data?.calendarId).toBe(
			supersession.data.successor.id,
		);

		const employeeHistorical = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-employee-hist-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-07-31",
			},
			ready,
		);
		expect(employeeHistorical.ok).toBe(true);
		if (!employeeHistorical.ok) return;
		expect(employeeHistorical.data.calendarId).toBe(calendar.data.id);

		const employeeFuture = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-employee-future-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(employeeFuture.ok).toBe(true);
		if (!employeeFuture.ok) return;
		expect(employeeFuture.data.calendarId).toBe(supersession.data.successor.id);

		const persistedRoot = await getWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-76-asof-root-${suffix}`,
				calendarId: calendar.data.id,
			},
			ready,
		);
		expect(persistedRoot.ok).toBe(true);
		if (!persistedRoot.ok) return;
		expect(persistedRoot.data?.status).toBe("superseded");
	});
}

describe("human-resources.time.calendar-admin (memory)", () => {
	defineCalendarAdminParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.calendar-admin (drizzle)",
	() => {
		defineCalendarAdminParitySuite("drizzle");
	},
);
