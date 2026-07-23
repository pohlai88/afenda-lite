import { expect } from "vitest";

import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import type { Employee, Employment } from "../../src/types";

export const TIME_CORR_STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map(
	(dayOfWeek) => ({
		dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
		isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
		standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
		standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
		standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
	}),
);

export type TimeCorrelationSeedInput = {
	organizationId: string;
	actorUserId: string;
	suffix: string;
};

export type TimeCorrelationSeedResult = {
	employee: Employee;
	employment: Employment;
};

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
	expect(employee.ok).toBe(true);
	if (!employee.ok) throw new Error("employee seed failed");

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
	expect(employment.ok).toBe(true);
	if (!employment.ok) throw new Error("employment seed failed");

	return { employee: employee.data, employment: employment.data };
}
