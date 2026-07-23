/**
 * C01-A scoped work calendar — shared memory / Drizzle contract.
 */

import { ok } from "@afenda/errors/result";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import { createPosition } from "../src/organization/position";
import type { HumanResourcesCommandOptions } from "../src/command-options";
import {
	assignEmploymentCalendar,
	assignWorkCalendarScope,
	createWorkCalendar,
	endWorkCalendarScopeAssignment,
	resolveEmployeeWorkCalendar,
} from "../src/time/calendar";
import type { EmployeeAssignmentContext } from "../src/time/handoff/ports";
import type { WorkCalendar, WorkCalendarScopeType } from "../src/types";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
	type WorkforceHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";

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

const LOCATION_KEY = "SG-HQ";
const LEGAL_ENTITY_KEY = "SG-LE";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function withContextKeys(
	ready: WorkforceHarness,
	keys: Partial<
		Pick<
			EmployeeAssignmentContext,
			"departmentId" | "locationKey" | "legalEntityKey"
		>
	>,
): HumanResourcesCommandOptions {
	const delegate = ready.assignmentContext;
	if (delegate === undefined) {
		throw new Error("assignmentContext is required for scoped calendar parity");
	}
	return {
		...ready,
		assignmentContext: {
			resolveAsOf: async (input) => {
				const base = await delegate.resolveAsOf(input);
				if (!base.ok) {
					return base;
				}
				return ok({
					...base.data,
					departmentId:
						keys.departmentId !== undefined
							? keys.departmentId
							: base.data.departmentId,
					locationKey:
						keys.locationKey !== undefined
							? keys.locationKey
							: base.data.locationKey,
					legalEntityKey:
						keys.legalEntityKey !== undefined
							? keys.legalEntityKey
							: base.data.legalEntityKey,
				});
			},
		},
	};
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
			correlationId: `corr-cal-${suffix}-${code}`,
			idempotencyKey: `idem-cal-${suffix}-${code}`,
			code: `CAL-${code}-${suffix}`.slice(0, 32),
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

async function seedEmployeeEmployment(
	ready: HumanResourcesCommandOptions,
	org: string,
	actor: string,
	suffix: string,
) {
	const employee = await createEmployee(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-emp-${suffix}`,
			idempotencyKey: `idem-emp-${suffix}`,
			employeeNumber: `E-${suffix}`.slice(0, 32),
			legalName: `Worker ${suffix}`,
		},
		ready,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) {
		throw new Error("employee seed failed");
	}
	const employment = await createEmployment(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-employ-${suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) {
		throw new Error("employment seed failed");
	}
	return { employee: employee.data, employment: employment.data };
}

async function assignScope(
	ready: HumanResourcesCommandOptions,
	org: string,
	actor: string,
	input: {
		scopeType: WorkCalendarScopeType;
		scopeKey: string;
		calendarId: string;
		effectiveFrom?: string;
		correlationId: string;
	},
) {
	const assigned = await assignWorkCalendarScope(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: input.correlationId,
			scopeType: input.scopeType,
			scopeKey: input.scopeKey,
			calendarId: input.calendarId,
			effectiveFrom: input.effectiveFrom ?? "2025-01-01",
		},
		ready,
	);
	expect(assigned.ok).toBe(true);
	if (!assigned.ok) {
		throw new Error(`assignWorkCalendarScope failed: ${assigned.message}`);
	}
	return assigned.data;
}

async function resolveCalendar(
	ready: HumanResourcesCommandOptions,
	org: string,
	actor: string,
	employeeId: string,
	employmentId: string,
	asOf: string,
) {
	return resolveEmployeeWorkCalendar(
		{
			organizationId: org,
			actorUserId: actor,
			correlationId: `corr-resolve-${asOf}`,
			employeeId,
			employmentId,
			asOf,
		},
		ready,
	);
}

function defineCalendarScopeParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ACTOR = `user-cal-scope-parity-${suffix}`;

	function orgFor(testKey: string): string {
		return `org-cal-scope-parity-${suffix}-${testKey}`.slice(0, 64);
	}

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

	it("resolves employment over the full scoped precedence chain", async () => {
		const ORG = trackOrg(orgFor("full-chain"));
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			suffix,
		);
		const orgSeed = await seedDepartmentAndJob(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
		});
		expect(orgSeed).not.toBeNull();
		if (orgSeed === null) return;

		const position = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pos-${suffix}`,
				code: `P-${suffix}`.slice(0, 32),
				title: "Scope parity role",
				departmentId: orgSeed.departmentId,
				jobId: orgSeed.jobId,
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) return;

		const assignment = await createAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-asg-${suffix}`,
				employmentId: employment.id,
				positionId: position.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

		const calOrg = await seedCalendar(ready, ORG, ACTOR, suffix, "org");
		const calLegal = await seedCalendar(ready, ORG, ACTOR, suffix, "legal");
		const calDept = await seedCalendar(ready, ORG, ACTOR, suffix, "dept");
		const calLoc = await seedCalendar(ready, ORG, ACTOR, suffix, "loc");
		const calEmp = await seedCalendar(ready, ORG, ACTOR, suffix, "employee");
		const calEmployment = await seedCalendar(
			ready,
			ORG,
			ACTOR,
			suffix,
			"employment",
		);

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calOrg.id,
			correlationId: `corr-scope-org-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "legal_entity",
			scopeKey: LEGAL_ENTITY_KEY,
			calendarId: calLegal.id,
			correlationId: `corr-scope-legal-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "department",
			scopeKey: orgSeed.departmentId,
			calendarId: calDept.id,
			correlationId: `corr-scope-dept-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "location",
			scopeKey: LOCATION_KEY,
			calendarId: calLoc.id,
			correlationId: `corr-scope-loc-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "employee",
			scopeKey: employee.id,
			calendarId: calEmp.id,
			correlationId: `corr-scope-employee-${suffix}`,
		});

		const employmentAssigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-cal-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calEmployment.id,
				effectiveFrom: "2025-01-01",
				locationCode: LOCATION_KEY,
				jurisdiction: LEGAL_ENTITY_KEY,
			},
			ready,
		);
		expect(employmentAssigned.ok).toBe(true);
		if (!employmentAssigned.ok) return;

		const resolved = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-07-01",
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(calEmployment.id);
	});

	it("prefers employee over location, department, legal entity, and organization scopes", async () => {
		const ORG = trackOrg(orgFor("employee-win"));
		const ready = withContextKeys(createHrParityHarness(adapter), {
			locationKey: LOCATION_KEY,
			legalEntityKey: LEGAL_ENTITY_KEY,
			departmentId: "dept-unused",
		});
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-emp-win`,
		);
		const calOrg = await seedCalendar(ready, ORG, ACTOR, suffix, "org2");
		const calLegal = await seedCalendar(ready, ORG, ACTOR, suffix, "legal2");
		const calDept = await seedCalendar(ready, ORG, ACTOR, suffix, "dept2");
		const calLoc = await seedCalendar(ready, ORG, ACTOR, suffix, "loc2");
		const calEmp = await seedCalendar(ready, ORG, ACTOR, suffix, "emp2");

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calOrg.id,
			correlationId: `corr-scope-org2-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "legal_entity",
			scopeKey: LEGAL_ENTITY_KEY,
			calendarId: calLegal.id,
			correlationId: `corr-scope-legal2-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "department",
			scopeKey: "dept-unused",
			calendarId: calDept.id,
			correlationId: `corr-scope-dept2-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "location",
			scopeKey: LOCATION_KEY,
			calendarId: calLoc.id,
			correlationId: `corr-scope-loc2-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "employee",
			scopeKey: employee.id,
			calendarId: calEmp.id,
			correlationId: `corr-scope-employee2-${suffix}`,
		});

		const resolved = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-07-01",
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(calEmp.id);
	});

	it("prefers location over department, legal entity, and organization scopes", async () => {
		const ORG = trackOrg(orgFor("location-win"));
		const ready = withContextKeys(createHrParityHarness(adapter), {
			locationKey: LOCATION_KEY,
			legalEntityKey: LEGAL_ENTITY_KEY,
			departmentId: "dept-loc-win",
		});
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-loc-win`,
		);
		const calOrg = await seedCalendar(ready, ORG, ACTOR, suffix, "org3");
		const calLegal = await seedCalendar(ready, ORG, ACTOR, suffix, "legal3");
		const calDept = await seedCalendar(ready, ORG, ACTOR, suffix, "dept3");
		const calLoc = await seedCalendar(ready, ORG, ACTOR, suffix, "loc3");

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calOrg.id,
			correlationId: `corr-scope-org3-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "legal_entity",
			scopeKey: LEGAL_ENTITY_KEY,
			calendarId: calLegal.id,
			correlationId: `corr-scope-legal3-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "department",
			scopeKey: "dept-loc-win",
			calendarId: calDept.id,
			correlationId: `corr-scope-dept3-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "location",
			scopeKey: LOCATION_KEY,
			calendarId: calLoc.id,
			correlationId: `corr-scope-loc3-${suffix}`,
		});

		const resolved = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-07-01",
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(calLoc.id);
	});

	it("prefers department over legal entity and organization scopes", async () => {
		const ORG = trackOrg(orgFor("department-win"));
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-dept-win`,
		);
		const orgSeed = await seedDepartmentAndJob(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
		});
		expect(orgSeed).not.toBeNull();
		if (orgSeed === null) return;

		const position = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pos-dept-${suffix}`,
				code: `PD-${suffix}`.slice(0, 32),
				title: "Department scope role",
				departmentId: orgSeed.departmentId,
				jobId: orgSeed.jobId,
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) return;

		await createAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-asg-dept-${suffix}`,
				employmentId: employment.id,
				positionId: position.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);

		const calOrg = await seedCalendar(ready, ORG, ACTOR, suffix, "org4");
		const calLegal = await seedCalendar(ready, ORG, ACTOR, suffix, "legal4");
		const calDept = await seedCalendar(ready, ORG, ACTOR, suffix, "dept4");

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calOrg.id,
			correlationId: `corr-scope-org4-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "legal_entity",
			scopeKey: LEGAL_ENTITY_KEY,
			calendarId: calLegal.id,
			correlationId: `corr-scope-legal4-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "department",
			scopeKey: orgSeed.departmentId,
			calendarId: calDept.id,
			correlationId: `corr-scope-dept4-${suffix}`,
		});

		const resolved = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-07-01",
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(calDept.id);
	});

	it("persists legal-entity scoped assignments", async () => {
		const ORG = trackOrg(orgFor("legal-persist"));
		const ready = createHrParityHarness(adapter);
		await seedEmployeeEmployment(ready, ORG, ACTOR, `${suffix}-legal-persist`);
		const calLegal = await seedCalendar(ready, ORG, ACTOR, suffix, "legal5");

		const legalScope = await assignScope(ready, ORG, ACTOR, {
			scopeType: "legal_entity",
			scopeKey: LEGAL_ENTITY_KEY,
			calendarId: calLegal.id,
			correlationId: `corr-scope-legal5-${suffix}`,
		});
		expect(legalScope.scopeType).toBe("legal_entity");
		expect(legalScope.scopeKey).toBe(LEGAL_ENTITY_KEY);
		expect(legalScope.effectiveFrom).toBe("2025-01-01");
		expect(legalScope.effectiveTo).toBeNull();

		const listed = await ready.store.listWorkCalendarScopeAssignments({
			organizationId: ORG,
			asOf: "2025-07-01",
		});
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(
			listed.data.some(
				(row) =>
					row.id === legalScope.id &&
					row.scopeType === "legal_entity" &&
					row.scopeKey === LEGAL_ENTITY_KEY &&
					row.calendarId === calLegal.id,
			),
		).toBe(true);
	});

	it("prefers legal entity over organization default when jurisdiction matches", async () => {
		const ORG = trackOrg(orgFor("legal-win"));
		const ready = withContextKeys(createHrParityHarness(adapter), {
			legalEntityKey: LEGAL_ENTITY_KEY,
		});
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-legal-win`,
		);
		const calOrg = await seedCalendar(ready, ORG, ACTOR, suffix, "org5");
		const calLegal = await seedCalendar(ready, ORG, ACTOR, suffix, "legal5b");

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calOrg.id,
			correlationId: `corr-scope-org5-${suffix}`,
		});
		await assignScope(ready, ORG, ACTOR, {
			scopeType: "legal_entity",
			scopeKey: LEGAL_ENTITY_KEY,
			calendarId: calLegal.id,
			correlationId: `corr-scope-legal5b-${suffix}`,
		});

		const resolved = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-07-01",
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(calLegal.id);
	});

	it("respects effective dating when a scoped assignment ends", async () => {
		const ORG = trackOrg(orgFor("effective"));
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-effective`,
		);
		const calFirst = await seedCalendar(ready, ORG, ACTOR, suffix, "org6a");
		const calSecond = await seedCalendar(ready, ORG, ACTOR, suffix, "org6b");

		const first = await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calFirst.id,
			correlationId: `corr-scope-org6a-${suffix}`,
		});

		const ended = await endWorkCalendarScopeAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-scope-end-${suffix}`,
				assignmentId: first.id,
				effectiveTo: "2025-06-30",
				expectedVersion: first.version,
			},
			ready,
		);
		expect(ended.ok).toBe(true);
		if (!ended.ok) return;

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calSecond.id,
			effectiveFrom: "2025-07-01",
			correlationId: `corr-scope-org6b-${suffix}`,
		});

		const before = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-06-01",
		);
		expect(before.ok).toBe(true);
		if (!before.ok) return;
		expect(before.data.calendarId).toBe(calFirst.id);

		const after = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-08-01",
		);
		expect(after.ok).toBe(true);
		if (!after.ok) return;
		expect(after.data.calendarId).toBe(calSecond.id);
	});

	it("rejects same-scope employment ties between assignment and scoped rows", async () => {
		const ORG = trackOrg(orgFor("employment-tie"));
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-tie`,
		);
		const calEmployment = await seedCalendar(
			ready,
			ORG,
			ACTOR,
			suffix,
			"employment-tie-a",
		);
		const calScoped = await seedCalendar(
			ready,
			ORG,
			ACTOR,
			suffix,
			"employment-tie-b",
		);

		await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employment-tie-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calEmployment.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "employment",
			scopeKey: employment.id,
			calendarId: calScoped.id,
			correlationId: `corr-scope-employment-tie-${suffix}`,
		});

		const resolved = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-07-01",
		);
		expect(resolved.ok).toBe(false);
		if (resolved.ok) return;
		expect(humanResourcesCodeFromResult(resolved)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("isolates scoped assignments by organization", async () => {
		const ORG = trackOrg(orgFor("iso-a"));
		const ORG_OTHER = trackOrg(orgFor("iso-b"));
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedEmployeeEmployment(
			ready,
			ORG,
			ACTOR,
			`${suffix}-iso-a`,
		);
		const calOrgA = await seedCalendar(ready, ORG, ACTOR, suffix, "org7a");
		const calOrgB = await seedCalendar(
			ready,
			ORG_OTHER,
			ACTOR,
			suffix,
			"org7b",
		);

		await assignScope(ready, ORG, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG,
			calendarId: calOrgA.id,
			correlationId: `corr-scope-org7a-${suffix}`,
		});
		await assignScope(ready, ORG_OTHER, ACTOR, {
			scopeType: "organization",
			scopeKey: ORG_OTHER,
			calendarId: calOrgB.id,
			correlationId: `corr-scope-org7b-${suffix}`,
		});

		const resolved = await resolveCalendar(
			ready,
			ORG,
			ACTOR,
			employee.id,
			employment.id,
			"2025-07-01",
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.calendarId).toBe(calOrgA.id);
		expect(resolved.data.calendarId).not.toBe(calOrgB.id);
	});
}

describe("calendar-scope (memory)", () => {
	defineCalendarScopeParitySuite("memory");
});

describe.runIf(runDrizzleParity)("calendar-scope (drizzle)", () => {
	defineCalendarScopeParitySuite("drizzle");
});
