import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";
import { createAssignment, endAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	createPosition,
	getPositionOccupancyAsOf,
} from "../src/organization/position";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const { hasDatabase } = resolveDatabaseUrlForTests();

function definePositionOccupancyParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const organizationId = `org-hr-position-occupancy-${suffix}`;
	const actorUserId = `user-hr-position-occupancy-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([organizationId]);
		}
	});

	it("replays effective-dated occupancy identically", async () => {
		const ready = createHrParityHarness(adapter);
		const references = await seedDepartmentAndJob(ready, {
			organizationId,
			actorUserId,
		});
		expect(references).not.toBeNull();
		if (!references) return;

		const employee = await createEmployee(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-employee-${suffix}`,
				idempotencyKey: `idem-employee-${suffix}`,
				employeeNumber: `E-${suffix}`,
				legalName: "Position Occupancy Parity",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2026-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const position = await createPosition(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-position-${suffix}`,
				code: `POS-${suffix}`,
				title: "Parity Position",
				departmentId: references.departmentId,
				jobId: references.jobId,
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) return;

		const assignment = await createAssignment(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-assignment-${suffix}`,
				employmentId: employment.data.id,
				positionId: position.data.id,
				startsOn: "2026-02-01",
				endsOn: null,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

		const occupied = await getPositionOccupancyAsOf(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-occupied-${suffix}`,
				positionId: position.data.id,
				asOf: "2026-03-01",
			},
			ready,
		);
		expect(occupied.ok).toBe(true);
		if (occupied.ok) {
			expect(occupied.data.state).toBe("occupied");
			expect(occupied.data.assignment?.id).toBe(assignment.data.id);
		}

		const ended = await endAssignment(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-end-${suffix}`,
				assignmentId: assignment.data.id,
				endsOn: "2026-03-31",
				expectedVersion: 1,
			},
			ready,
		);
		expect(ended.ok).toBe(true);

		const vacant = await getPositionOccupancyAsOf(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-vacant-${suffix}`,
				positionId: position.data.id,
				asOf: "2026-04-01",
			},
			ready,
		);
		expect(vacant.ok).toBe(true);
		if (vacant.ok) {
			expect(vacant.data.state).toBe("vacant");
			expect(vacant.data.assignment).toBeNull();
		}
	});
}

describe("@afenda/human-resources position occupancy parity (memory)", () => {
	definePositionOccupancyParitySuite("memory");
});

describe.runIf(hasDatabase)(
	"@afenda/human-resources position occupancy parity (drizzle/neon)",
	() => {
		definePositionOccupancyParitySuite("drizzle");
	},
);
