/**
 * Wave 1A foundation parity: historical assignment + canonical org-context asOf.
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createAssignment, endAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { resolveEmployeeOrgContextAsOf } from "../src/core/org-context";
import { createPosition } from "../src/organization/position";
import {
	assignEmploymentCalendar,
	createWorkCalendar,
} from "../src/time/calendar";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
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

function defineFoundationParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-foundation-${suffix}`;
	const ACTOR = `user-hr-foundation-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("resolves org context from the assignment effective on the historical date", async () => {
		const ready = createHrParityHarness(adapter);
		const seeded = await seedDepartmentAndJob(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
		});
		expect(seeded).not.toBeNull();
		if (seeded === null) return;

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-foundation-emp-${suffix}`,
				idempotencyKey: `idem-foundation-emp-${suffix}`,
				employeeNumber: `EF-${suffix}`,
				legalName: "Foundation Worker",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-foundation-employ-${suffix}`,
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
				correlationId: `corr-foundation-cal-${suffix}`,
				idempotencyKey: `idem-foundation-cal-${suffix}`,
				code: `FC-${suffix}`,
				name: "Foundation Calendar",
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

		const calendarAssignment = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-foundation-cal-assign-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssignment.ok).toBe(true);

		const deptB = await seedDepartmentAndJob(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `corr-dept-b-${suffix}`,
		});
		expect(deptB).not.toBeNull();
		if (deptB === null) return;

		const positionA = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pos-a-${suffix}`,
				departmentId: seeded.departmentId,
				jobId: seeded.jobId,
				code: `POS-A-${suffix}`,
				title: "Role A",
				status: "active",
			},
			ready,
		);
		expect(positionA.ok).toBe(true);
		if (!positionA.ok) return;

		const positionB = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pos-b-${suffix}`,
				departmentId: deptB.departmentId,
				jobId: deptB.jobId,
				code: `POS-B-${suffix}`,
				title: "Role B",
				status: "active",
			},
			ready,
		);
		expect(positionB.ok).toBe(true);
		if (!positionB.ok) return;

		const firstAssignment = await createAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assign-a-${suffix}`,
				employmentId: employment.data.id,
				positionId: positionA.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(firstAssignment.ok).toBe(true);
		if (!firstAssignment.ok) return;

		const ended = await endAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-end-a-${suffix}`,
				assignmentId: firstAssignment.data.id,
				endsOn: "2025-06-30",
				expectedVersion: firstAssignment.data.version,
			},
			ready,
		);
		expect(ended.ok).toBe(true);

		const secondAssignment = await createAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assign-b-${suffix}`,
				employmentId: employment.data.id,
				positionId: positionB.data.id,
				legalEntityKey: "LE-TEST-V2",
				businessUnitKey: "BU-TEST-V2",
				locationKey: "LOC-TEST-V2",
				costCentreKey: "CC-TEST-V2",
				projectKey: "PRJ-TEST-V2",
				startsOn: "2025-07-01",
				endsOn: null,
			},
			ready,
		);
		expect(secondAssignment.ok).toBe(true);
		if (!secondAssignment.ok) return;

		const beforeTransfer = await resolveEmployeeOrgContextAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-org-before-${suffix}`,
				employeeId: employee.data.id,
				asOf: "2025-03-15",
			},
			ready,
		);
		expect(beforeTransfer.ok).toBe(true);
		if (beforeTransfer.ok) {
			expect(beforeTransfer.data.positionId).toBe(positionA.data.id);
			expect(beforeTransfer.data.departmentId).toBe(seeded.departmentId);
			expect(beforeTransfer.data.legalEntityKey).toBe("LE-TEST");
			expect(beforeTransfer.data.businessUnitKey).toBe("BU-TEST");
			expect(beforeTransfer.data.locationKey).toBe("LOC-TEST");
			expect(beforeTransfer.data.costCentreKey).toBe("CC-TEST");
			expect(beforeTransfer.data.projectKey).toBe("PRJ-TEST");
		}

		const afterTransfer = await resolveEmployeeOrgContextAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-org-after-${suffix}`,
				employeeId: employee.data.id,
				asOf: "2025-08-01",
			},
			ready,
		);
		expect(afterTransfer.ok).toBe(true);
		if (afterTransfer.ok) {
			expect(afterTransfer.data.positionId).toBe(positionB.data.id);
			expect(afterTransfer.data.departmentId).toBe(deptB.departmentId);
			expect(afterTransfer.data.legalEntityKey).toBe("LE-TEST-V2");
			expect(afterTransfer.data.businessUnitKey).toBe("BU-TEST-V2");
			expect(afterTransfer.data.locationKey).toBe("LOC-TEST-V2");
			expect(afterTransfer.data.costCentreKey).toBe("CC-TEST-V2");
			expect(afterTransfer.data.projectKey).toBe("PRJ-TEST-V2");
		}
	});
}

describe("@afenda/human-resources foundation parity (memory)", () => {
	defineFoundationParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"@afenda/human-resources foundation parity (drizzle)",
	() => {
		defineFoundationParitySuite("drizzle");
	},
);
