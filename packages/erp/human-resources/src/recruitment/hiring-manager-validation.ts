import { ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../brands";
import { invalidState, notFound } from "../shared/domain-guards";
import type { HumanResourcesStore } from "../store";
import { isActiveEmploymentOnDate } from "../time/timesheet-generation";

export function mutationUtcDate(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function validateHiringManagerEmployee(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		hiringManagerEmployeeId: HumanResourcesEmployeeId;
		asOfDate?: string;
	},
): Promise<Result<void>> {
	const employee = await store.getEmployeeById({
		organizationId: input.organizationId,
		employeeId: input.hiringManagerEmployeeId,
	});
	if (!employee.ok) {
		return employee;
	}
	if (employee.data === null) {
		return notFound("Hiring manager employee not found");
	}

	const asOfDate = input.asOfDate ?? mutationUtcDate();
	const employmentAsOf = await store.findEmploymentByEmployeeAsOf({
		organizationId: input.organizationId,
		employeeId: input.hiringManagerEmployeeId,
		asOf: asOfDate,
	});
	if (!employmentAsOf.ok) {
		return employmentAsOf;
	}
	if (
		employmentAsOf.data === null ||
		!isActiveEmploymentOnDate(employmentAsOf.data, asOfDate)
	) {
		return invalidState(
			"Hiring manager must have active employment as of the assignment date",
		);
	}

	return ok(undefined);
}
