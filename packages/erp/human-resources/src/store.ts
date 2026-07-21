import type { Result } from "@afenda/errors/result";

import type {
	HumanResourcesAssignmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesPositionId,
} from "./brands";
import type { MutationPorts } from "./ports";
import type { EmploymentStatus } from "./shared/employment-status";
import type {
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	Position,
	WorkAssignment,
} from "./types";

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

export type EmploymentCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	startsOn: string;
	endsOn: string | null;
	createdBy: string;
};

export type EmploymentContractCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	referenceCode: string;
	startsOn: string;
	endsOn: string | null;
	createdBy: string;
};

export type PositionCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	status: string;
	createdBy: string;
};

export type AssignmentCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	positionId: HumanResourcesPositionId;
	startsOn: string;
	endsOn: string | null;
	createdBy: string;
};

/**
 * Persistence contract for Human Resources (HR-00 justified surface).
 *
 * Transaction semantics for mutations:
 * - Atomic unit = aggregate row + audit fact + (optional) outbox event.
 * - Memory adapter: write then call ports; roll back in-memory state on port failure.
 * - Drizzle adapter: single `runNeonHttpTransaction` CTE inserting rows +
 *   `platform_audit_log` + `platform_domain_event` (ports argument reserved for
 *   memory / test injection; production path embeds SQL in the same TX).
 *
 * All org-scoped methods require `organizationId`. Cross-org lookup by bare id
 * is prohibited — missing or wrong-org rows return null / not found at the command layer.
 */
export type HumanResourcesStore = {
	// Employee
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

	updateEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		legalName: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
	}): Promise<Result<Employee>>;

	listEmployees(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeNumberPrefix?: string;
		legalNamePrefix?: string;
		employmentStatus?: EmploymentStatus;
	}): Promise<Result<EmployeeListPage>>;

	// Employment
	getEmploymentById(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<Employment | null>>;

	findOpenEmploymentByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employment | null>>;

	createEmployment(
		record: EmploymentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employment>>;

	amendEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		status?: EmploymentStatus;
		startsOn?: string;
		endsOn?: string | null;
		expectedVersion: number;
		actorUserId: string;
	}, ports: MutationPorts, meta: { correlationId: string }): Promise<Result<Employment>>;

	// Employment Contract
	getEmploymentContractById(input: {
		organizationId: string;
		employmentContractId: HumanResourcesEmploymentContractId;
	}): Promise<Result<EmploymentContract | null>>;

	findContractByEmploymentAndCode(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		referenceCode: string;
	}): Promise<Result<EmploymentContract | null>>;

	createEmploymentContract(
		record: EmploymentContractCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentContract>>;

	// Position
	getPositionById(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<Position | null>>;

	findPositionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Position | null>>;

	createPosition(
		record: PositionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>>;

	listPositions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string;
	}): Promise<Result<{ positions: Position[]; totalCount: number }>>;

	// Assignment
	getAssignmentById(input: {
		organizationId: string;
		assignmentId: HumanResourcesAssignmentId;
	}): Promise<Result<WorkAssignment | null>>;

	findOpenAssignmentByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<WorkAssignment | null>>;

	createAssignment(
		record: AssignmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkAssignment>>;

	endAssignment(input: {
		organizationId: string;
		assignmentId: HumanResourcesAssignmentId;
		endsOn: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
	}): Promise<Result<WorkAssignment>>;
};
