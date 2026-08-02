import { createEmployee } from "../../src/features/workforce-records/employment/employee";
import { createEmployment } from "../../src/features/workforce-records/employment/employment";
import type { Employee, Employment } from "../../src/kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../src/kernel/execution/command-options";
import { helperAssert as assert } from "./helper-assert";

export const TIME_CORR_STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map(
	(dayOfWeek) => ({
		dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
		isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
		standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
		standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
		standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
	}),
);

export interface TimeCorrelationSeedInput {
	actorUserId: string;
	organizationId: string;
	suffix: string;
}

export interface TimeCorrelationSeedResult {
	employee: Employee;
	employment: Employment;
}

export async function seedTimeCorrelationEmployeeEmployment(
	ready: HumanResourcesCommandOptions,
	input: TimeCorrelationSeedInput,
): Promise<TimeCorrelationSeedResult> {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`,
			legalName: `Worker ${input.suffix}`,
		},
		ready,
	);
	assert.strictEqual(employee.ok, true);
	if (!employee.ok) {
		throw new Error("employee seed failed");
	}

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-employ-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	assert.strictEqual(employment.ok, true);
	if (!employment.ok) {
		throw new Error("employment seed failed");
	}

	return { employee: employee.data, employment: employment.data };
}
