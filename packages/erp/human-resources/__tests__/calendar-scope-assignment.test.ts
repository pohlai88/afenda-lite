import { describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { createMemoryHumanResourcesStore, createStoreAssignmentContextQuery } from "../src/testing";
import {
	assignEmploymentCalendar,
	assignWorkCalendarScope,
	createWorkCalendar,
	resolveEmployeeWorkCalendar,
} from "../src/time/calendar";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createStoreBackedIdentityResolver } from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-calendar-scope-a";
const ACTOR = "user-calendar-scope";

const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
	dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
	isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
	standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
	standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
	standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
}));

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

async function seedEmployeeEmployment(
	ready: ReturnType<typeof harness>,
	suffix: string,
) {
	const employee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-emp-${suffix}`,
			idempotencyKey: `idem-emp-${suffix}`,
			employeeNumber: `E-${suffix}`,
			legalName: `Worker ${suffix}`,
		},
		ready,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) throw new Error("employee seed failed");
	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-employ-${suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) throw new Error("employment seed failed");
	return { employee: employee.data, employment: employment.data };
}

async function seedCalendar(ready: ReturnType<typeof harness>, suffix: string) {
	const calendar = await createWorkCalendar(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-cal-${suffix}`,
			idempotencyKey: `idem-cal-${suffix}`,
			code: `CAL-${suffix}`,
			name: `Calendar ${suffix}`,
			timezone: "Asia/Singapore",
			calendarVersion: "v1",
			workWeek: STANDARD_WEEK,
			standardHoursPerDay: "8.00",
			effectiveFrom: "2025-01-01",
		},
		ready,
	);
	expect(calendar.ok).toBe(true);
	if (!calendar.ok) throw new Error("calendar seed failed");
	return calendar.data;
}

describe("calendar-scope-assignment (memory)", () => {
	it("prefers employee scope over organization default", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(ready, "emp-win");
		const orgCalendar = await seedCalendar(ready, "org");
		const employeeCalendar = await seedCalendar(ready, "employee");

		const orgScope = await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-scope-org",
				scopeType: "organization",
				scopeKey: ORG,
				calendarId: orgCalendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(orgScope.ok).toBe(true);

		const employeeScope = await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-scope-employee",
				scopeType: "employee",
				scopeKey: employee.id,
				calendarId: employeeCalendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(employeeScope.ok).toBe(true);

		const resolved = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-resolve-employee-scope",
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-06-01",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(employeeCalendar.id);
	});

	it("prefers employment assignment over employee scope", async () => {
		const ready = harness();
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			"employment-win",
		);
		const employmentCalendar = await seedCalendar(ready, "employment");
		const employeeCalendar = await seedCalendar(ready, "employee-2");

		await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-scope-employee-2",
				scopeType: "employee",
				scopeKey: employee.id,
				calendarId: employeeCalendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		const assigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-employment-cal",
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: employmentCalendar.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);

		const resolved = await resolveEmployeeWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-resolve-employment-scope",
				employeeId: employee.id,
				employmentId: employment.id,
				asOf: "2025-06-01",
			},
			ready,
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(employmentCalendar.id);
	});

	it("rejects overlapping scoped assignments", async () => {
		const ready = harness();
		await seedEmployeeEmployment(ready, "overlap");
		const calendarA = await seedCalendar(ready, "overlap-a");
		const calendarB = await seedCalendar(ready, "overlap-b");

		const first = await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-scope-overlap-a",
				scopeType: "organization",
				scopeKey: ORG,
				calendarId: calendarA.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await assignWorkCalendarScope(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-scope-overlap-b",
				scopeType: "organization",
				scopeKey: ORG,
				calendarId: calendarB.id,
				effectiveFrom: "2025-02-01",
			},
			ready,
		);
		expect(second.ok).toBe(false);
	});
});
