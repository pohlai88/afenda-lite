import { createPosition } from "../../src/features/organization/position";
import { createAssignment } from "../../src/features/workforce-records/employment/assignment";
import { createEmployee } from "../../src/features/workforce-records/employment/employee";
import { createEmployment } from "../../src/features/workforce-records/employment/employment";
import type { HumanResourcesCommandOptions } from "../../src/kernel/execution/command-options";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./command-options";
import { seedDepartmentAndJob } from "./seed-department-and-job";

type SeedReady = HumanResourcesCommandOptions & {
	store: NonNullable<HumanResourcesCommandOptions["store"]>;
};

export async function seedLifecycleEmploymentWithAssignment(
	ready: SeedReady,
	input: {
		organizationId: string;
		actorUserId: string;
		suffix: string;
		startsOn?: string;
	},
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-life-emp-${input.suffix}`,
			idempotencyKey: `idem-life-emp-${input.suffix}`,
			employeeNumber: `E-LIFE-${input.suffix}`.slice(0, 64),
			legalName: `Lifecycle Worker ${input.suffix}`,
		},
		ready,
	);
	if (!employee.ok) {
		return employee;
	}

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-life-employment-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: input.startsOn ?? "2025-01-01",
		},
		ready,
	);
	if (!employment.ok) {
		return employment;
	}

	const orgSeed = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `corr-life-org-${input.suffix}`,
	});
	if (orgSeed === null) {
		return {
			ok: false as const,
			code: "NOT_FOUND" as const,
			message: "Org seed failed",
		};
	}

	const positionA = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-life-pos-a-${input.suffix}`,
			code: `PA-${input.suffix}`.slice(0, 64),
			title: "Role A",
			departmentId: orgSeed.departmentId,
			jobId: orgSeed.jobId,
		},
		ready,
	);
	if (!positionA.ok) {
		return positionA;
	}

	const positionB = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-life-pos-b-${input.suffix}`,
			code: `PB-${input.suffix}`.slice(0, 64),
			title: "Role B",
			departmentId: orgSeed.departmentId,
			jobId: orgSeed.jobId,
		},
		ready,
	);
	if (!positionB.ok) {
		return positionB;
	}

	const assignment = await createAssignment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-life-asg-${input.suffix}`,
			employmentId: employment.data.id,
			positionId: positionA.data.id,
			...TEST_ORGANIZATION_DIMENSION_KEYS,
			startsOn: input.startsOn ?? "2025-01-01",
		},
		ready,
	);
	if (!assignment.ok) {
		return assignment;
	}

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
		positionA: positionA.data,
		positionB: positionB.data,
		assignment: assignment.data,
	};
}
