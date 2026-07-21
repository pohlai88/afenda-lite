import type { Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "./brands";
import type { MutationPorts } from "./ports";
import type { Employee } from "./types";

export type EmployeeCreateRecord = {
	organizationId: string;
	employeeNumber: string;
	normalizedEmployeeNumber: string;
	legalName: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentEmployeeRecord = {
	employee: Employee;
	createRequestFingerprint: string;
};

export type HumanResourcesStore = {
	getEmployeeById(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employee | null>>;

	findEmployeeByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeRecord | null>>;

	createEmployee(
		record: EmployeeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>>;
};
