import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesAssignmentId,
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesJobId,
	HumanResourcesPositionId,
	HumanResourcesReportingLineId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
} from "../shared/employment-status";
import type {
	Department,
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	Job,
	OrganizationTreePage,
	Position,
	ReportingLine,
	WorkAssignment,
} from "../types";

/**
 * Persistence contract for Core people and organization.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
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

export type DepartmentCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	status: DepartmentStatus;
	createdBy: string;
};

export type JobCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	status: JobStatus;
	createdBy: string;
};

export type PositionCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	departmentId: HumanResourcesDepartmentId;
	jobId: HumanResourcesJobId;
	status: PositionStatus;
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

export type ReportingLineCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	managerEmployeeId: HumanResourcesEmployeeId;
	startsOn: string;
	endsOn: string | null;
	createdBy: string;
};

export type HumanResourcesCoreStore = {
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

	updateEmployee(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			legalName: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>>;

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

	amendEmployment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			status?: EmploymentStatus;
			startsOn?: string;
			endsOn?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employment>>;
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
	// Department
	getDepartmentById(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<Department | null>>;

	findDepartmentByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Department | null>>;

	createDepartment(
		record: DepartmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>>;

	updateDepartment(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			name?: string;
			parentDepartmentId?: HumanResourcesDepartmentId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>>;

	setDepartmentStatus(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			status: DepartmentStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>>;

	listDepartments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: DepartmentStatus;
		parentDepartmentId?: HumanResourcesDepartmentId | null;
	}): Promise<Result<{ departments: Department[]; totalCount: number }>>;

	listAllDepartments(input: {
		organizationId: string;
	}): Promise<Result<Department[]>>;
	// Job
	getJobById(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<Job | null>>;

	findJobByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Job | null>>;

	createJob(
		record: JobCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>>;

	updateJob(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			title: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>>;

	setJobStatus(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			status: JobStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>>;

	listJobs(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JobStatus;
	}): Promise<Result<{ jobs: Job[]; totalCount: number }>>;
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

	updatePosition(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			title?: string;
			departmentId?: HumanResourcesDepartmentId;
			jobId?: HumanResourcesJobId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>>;

	setPositionStatus(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			status: PositionStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>>;

	listPositions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string;
		departmentId?: HumanResourcesDepartmentId;
		jobId?: HumanResourcesJobId;
	}): Promise<Result<{ positions: Position[]; totalCount: number }>>;

	countOpenAssignmentsForPosition(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<number>>;

	countActiveOrFrozenPositionsForDepartment(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>>;

	countActiveOrFrozenPositionsForJob(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<number>>;

	countActiveChildDepartments(input: {
		organizationId: string;
		parentDepartmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>>;
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

	endAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesAssignmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkAssignment>>;
	// Reporting line
	getReportingLineById(input: {
		organizationId: string;
		reportingLineId: HumanResourcesReportingLineId;
	}): Promise<Result<ReportingLine | null>>;

	listReportingLinesForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine[]>>;

	findOpenPrimaryReportingLine(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine | null>>;

	resolvePrimaryManager(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<ReportingLine | null>>;

	listDirectReports(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>>;

	assignPrimaryReportingLine(
		record: ReportingLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>>;

	closeReportingLine(
		input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>>;

	replacePrimaryReportingLine(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			managerEmployeeId: HumanResourcesEmployeeId;
			startsOn: string;
			endsOn: string | null;
			closePriorOn: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>>;

	getOrganizationTree(input: {
		organizationId: string;
		rootDepartmentId: HumanResourcesDepartmentId | null;
		maxDepth: number;
		maxNodes: number;
	}): Promise<Result<OrganizationTreePage>>;
};
