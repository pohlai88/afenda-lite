import { describe, expect, it } from "vitest";
import { createAssignment, endAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	createPosition,
	getPositionOccupancyAsOf,
} from "../src/organization/position";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import {
	createMemoryHumanResourcesStore,
	createMemoryOrganizationDimensionDirectory,
} from "../src/testing";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORGANIZATION_ID = "org-position-occupancy";
const ACTOR_USER_ID = "user-position-occupancy";

function harness() {
	return {
		store: createMemoryHumanResourcesStore(),
		ports: createMemoryMutationPorts(),
		authorization: createGrantingHumanResourcesAuthorization(
			HUMAN_RESOURCES_PERMISSION_CODES,
		),
		organizationDimensions: createMemoryOrganizationDimensionDirectory(),
	};
}

async function seedPositionAssignment(ready: ReturnType<typeof harness>) {
	const references = await seedDepartmentAndJob(ready, {
		organizationId: ORGANIZATION_ID,
		actorUserId: ACTOR_USER_ID,
	});
	expect(references).not.toBeNull();
	if (!references) return null;

	const employee = await createEmployee(
		{
			organizationId: ORGANIZATION_ID,
			actorUserId: ACTOR_USER_ID,
			correlationId: "corr-occupancy-employee",
			idempotencyKey: "idem-occupancy-employee",
			employeeNumber: "E-OCC-001",
			legalName: "Position Occupant",
		},
		ready,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) return null;

	const employment = await createEmployment(
		{
			organizationId: ORGANIZATION_ID,
			actorUserId: ACTOR_USER_ID,
			correlationId: "corr-occupancy-employment",
			employeeId: employee.data.id,
			startsOn: "2026-01-01",
			endsOn: null,
		},
		ready,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) return null;

	const position = await createPosition(
		{
			organizationId: ORGANIZATION_ID,
			actorUserId: ACTOR_USER_ID,
			correlationId: "corr-occupancy-position",
			code: "POS-OCC-001",
			title: "Enterprise Position",
			departmentId: references.departmentId,
			jobId: references.jobId,
		},
		ready,
	);
	expect(position.ok).toBe(true);
	if (!position.ok) return null;

	const assignment = await createAssignment(
		{
			organizationId: ORGANIZATION_ID,
			actorUserId: ACTOR_USER_ID,
			correlationId: "corr-occupancy-assignment",
			employmentId: employment.data.id,
			positionId: position.data.id,
			startsOn: "2026-02-01",
			endsOn: null,
			...TEST_ORGANIZATION_DIMENSION_KEYS,
		},
		ready,
	);
	if (!assignment.ok) {
		throw new Error(
			`Assignment seed failed: ${assignment.code} ${assignment.message} ${JSON.stringify(assignment.details)}`,
		);
	}

	return { position, assignment };
}

describe("position occupancy as of", () => {
	it("replays vacant, occupied, and vacated states by date", async () => {
		const ready = harness();
		const seeded = await seedPositionAssignment(ready);
		if (!seeded) return;

		const before = await getPositionOccupancyAsOf(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "corr-occupancy-before",
				positionId: seeded.position.data.id,
				asOf: "2026-01-31",
			},
			ready,
		);
		expect(before.ok).toBe(true);
		if (before.ok) {
			expect(before.data.state).toBe("vacant");
			expect(before.data.assignment).toBeNull();
		}

		const during = await getPositionOccupancyAsOf(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "corr-occupancy-during",
				positionId: seeded.position.data.id,
				asOf: "2026-03-01",
			},
			ready,
		);
		expect(during.ok).toBe(true);
		if (during.ok) {
			expect(during.data.state).toBe("occupied");
			expect(during.data.assignment?.id).toBe(seeded.assignment.data.id);
		}

		const ended = await endAssignment(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "corr-occupancy-end",
				assignmentId: seeded.assignment.data.id,
				endsOn: "2026-03-31",
				expectedVersion: 1,
			},
			ready,
		);
		expect(ended.ok).toBe(true);

		const after = await getPositionOccupancyAsOf(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "corr-occupancy-after",
				positionId: seeded.position.data.id,
				asOf: "2026-04-01",
			},
			ready,
		);
		expect(after.ok).toBe(true);
		if (after.ok) {
			expect(after.data.state).toBe("vacant");
			expect(after.data.assignment).toBeNull();
		}
	});

	it("does not disclose a position across tenants", async () => {
		const ready = harness();
		const seeded = await seedPositionAssignment(ready);
		if (!seeded) return;

		const result = await getPositionOccupancyAsOf(
			{
				organizationId: "org-position-occupancy-other",
				actorUserId: ACTOR_USER_ID,
				correlationId: "corr-occupancy-other",
				positionId: seeded.position.data.id,
				asOf: "2026-03-01",
			},
			ready,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("NOT_FOUND");
		}
	});
});
