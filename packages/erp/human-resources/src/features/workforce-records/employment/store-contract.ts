import type { Result } from "@afenda/errors";
import type {
	Department,
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	EmploymentStatusHistory,
	Job,
	OrganizationTreePage,
	Position,
	PositionOccupancyAsOf,
	ReportingLine,
	WorkAssignment,
} from "../../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../../kernel/emissions/mutation-meta";
import type {
	HumanResourcesOrganizationDimensions,
	MutationPorts,
} from "../../../kernel/execution/ports";
import type {
	HumanResourcesAssignmentId,
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesEmploymentMovementId,
	HumanResourcesJobId,
	HumanResourcesPositionId,
	HumanResourcesReportingLineId,
	HumanResourcesWorkCalendarId,
} from "../../../kernel/identity/brands";
import type {
	DepartmentStructureAtAsOf,
	JobDefinitionAtAsOf,
	PositionDefinitionAtAsOf,
} from "../../organization/organization-structure-lineage";
import type { EmploymentStatusChangeKind } from "./employment-history";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
} from "./employment-status";

/**
 * Persistence contract for Core people and organization.
 *
 * This feature owns its narrow persistence contract. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface EmployeeCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeNumber: string;
	legalName: string;
	normalizedEmployeeNumber: string;
	organizationId: string;
}

export interface IdempotentEmployeeRecord {
	createRequestFingerprint: string;
	employee: Employee;
}

export interface EmploymentCreateRecord {
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	endsOn: string | null;
	organizationId: string;
	startsOn: string;
}

export interface EmploymentStatusHistoryAppendRecord {
	actorUserId: string;
	changeKind: EmploymentStatusChangeKind;
	correlationId: string;
	effectiveOn: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endsOnSnapshot: string | null;
	evidenceReference: string | null;
	fromStatus: EmploymentStatus | null;
	organizationId: string;
	reason: string | null;
	startsOnSnapshot: string;
	toStatus: EmploymentStatus;
}

export interface EmploymentContractCreateRecord {
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endsOn: string | null;
	organizationId: string;
	reasonCode: string;
	referenceCode: string;
	sourceReference: string | null;
	startsOn: string;
}

export interface DepartmentCreateRecord {
	code: string;
	createdBy: string;
	name: string;
	organizationId: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	status: DepartmentStatus;
}

export interface JobCreateRecord {
	code: string;
	createdBy: string;
	organizationId: string;
	status: JobStatus;
	title: string;
}

export interface PositionCreateRecord {
	code: string;
	createdBy: string;
	departmentId: HumanResourcesDepartmentId;
	jobId: HumanResourcesJobId;
	organizationId: string;
	status: PositionStatus;
	title: string;
}

export interface AssignmentCreateRecord {
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endsOn: string | null;
	managerEmployeeIdSnapshot: HumanResourcesEmployeeId | null;
	organizationDimensions: HumanResourcesOrganizationDimensions;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	predecessorAssignmentId?: HumanResourcesAssignmentId | null | undefined;
	startsOn: string;
	successorAssignmentId?: HumanResourcesAssignmentId | null | undefined;
	transferMovementId?: HumanResourcesEmploymentMovementId | null | undefined;
	workCalendarIdSnapshot: HumanResourcesWorkCalendarId | null;
}

export interface ReportingLineCreateRecord {
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	endsOn: string | null;
	managerEmployeeId: HumanResourcesEmployeeId;
	organizationId: string;
	startsOn: string;
}

export interface WorkforcePlanActualAssignment {
	assignmentEndsOn: string | null;
	assignmentStartsOn: string;
	departmentId: HumanResourcesDepartmentId | null;
	employeeId: HumanResourcesEmployeeId;
	employmentEndsOn: string | null;
	employmentId: HumanResourcesEmploymentId;
	employmentStartsOn: string;
	employmentStatus: EmploymentStatus;
	jobId: HumanResourcesJobId | null;
	locationCode: string | null;
	positionId: HumanResourcesPositionId;
}

export interface HumanResourcesCoreStore {
	amendEmployment: (
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			status?: EmploymentStatus | undefined;
			startsOn?: string | undefined;
			endsOn?: string | null | undefined;
			lifecycleEffectiveOn?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Employment>>;

	appendEmploymentStatusHistory: (
		record: EmploymentStatusHistoryAppendRecord,
	) => Promise<Result<EmploymentStatusHistory>>;

	assignPrimaryReportingLine: (
		record: ReportingLineCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<ReportingLine>>;

	closeReportingLine: (
		input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<ReportingLine>>;

	correctEmployment: (
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			status?: EmploymentStatus | undefined;
			startsOn?: string | undefined;
			endsOn?: string | null | undefined;
			reason: string;
			evidenceReference: string | null;
			effectiveOn?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Employment>>;

	correctEmploymentContract: (
		input: {
			organizationId: string;
			employmentContractId: HumanResourcesEmploymentContractId;
			referenceCode?: string | undefined;
			startsOn?: string | undefined;
			endsOn?: string | null | undefined;
			reasonCode: string;
			sourceReference: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmploymentContract>>;

	countActiveChildDepartments: (input: {
		organizationId: string;
		parentDepartmentId: HumanResourcesDepartmentId;
	}) => Promise<Result<number>>;

	countActiveOrFrozenPositionsForDepartment: (input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}) => Promise<Result<number>>;

	countActiveOrFrozenPositionsForJob: (input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}) => Promise<Result<number>>;

	countOpenAssignmentsForPosition: (input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}) => Promise<Result<number>>;

	createAssignment: (
		record: AssignmentCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<WorkAssignment>>;

	createDepartment: (
		record: DepartmentCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Department>>;

	createEmployee: (
		record: EmployeeCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Employee>>;

	createEmployment: (
		record: EmploymentCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Employment>>;

	createEmploymentContract: (
		record: EmploymentContractCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmploymentContract>>;

	createJob: (
		record: JobCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Job>>;

	createPosition: (
		record: PositionCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Position>>;

	endAssignment: (
		input: {
			organizationId: string;
			assignmentId: HumanResourcesAssignmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<WorkAssignment>>;

	findAssignmentByEmploymentAsOf: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}) => Promise<Result<WorkAssignment | null>>;

	findContractByEmploymentAndCode: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		referenceCode: string;
	}) => Promise<Result<EmploymentContract | null>>;

	findDepartmentAsOf: (input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
		asOf: string;
	}) => Promise<Result<DepartmentStructureAtAsOf | null>>;

	findDepartmentByCode: (input: {
		organizationId: string;
		code: string;
	}) => Promise<Result<Department | null>>;

	findEmployeeByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentEmployeeRecord | null>>;

	findEmploymentByEmployeeAsOf: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}) => Promise<Result<Employment | null>>;

	findEmploymentContractByEmploymentAsOf: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		asOf: string;
	}) => Promise<Result<EmploymentContract | null>>;

	findJobAsOf: (input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
		asOf: string;
	}) => Promise<Result<JobDefinitionAtAsOf | null>>;

	findJobByCode: (input: {
		organizationId: string;
		code: string;
	}) => Promise<Result<Job | null>>;

	findOpenAssignmentByEmployment: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<WorkAssignment | null>>;

	findOpenEmploymentByEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<Employment | null>>;

	findOpenPrimaryReportingLine: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<ReportingLine | null>>;

	findPositionAsOf: (input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
		asOf: string;
	}) => Promise<Result<PositionDefinitionAtAsOf | null>>;

	findPositionByCode: (input: {
		organizationId: string;
		code: string;
	}) => Promise<Result<Position | null>>;
	// Assignment
	getAssignmentById: (input: {
		organizationId: string;
		assignmentId: HumanResourcesAssignmentId;
	}) => Promise<Result<WorkAssignment | null>>;
	// Department
	getDepartmentById: (input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}) => Promise<Result<Department | null>>;
	// Employee
	getEmployeeById: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<Employee | null>>;
	// Employment
	getEmploymentById: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<Employment | null>>;
	// Employment Contract
	getEmploymentContractById: (input: {
		organizationId: string;
		employmentContractId: HumanResourcesEmploymentContractId;
	}) => Promise<Result<EmploymentContract | null>>;
	// Job
	getJobById: (input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}) => Promise<Result<Job | null>>;

	getOrganizationTree: (input: {
		organizationId: string;
		rootDepartmentId: HumanResourcesDepartmentId | null;
		maxDepth: number;
		maxNodes: number;
	}) => Promise<Result<OrganizationTreePage>>;

	getOrganizationTreeAsOf: (input: {
		organizationId: string;
		asOf: string;
		rootDepartmentId: HumanResourcesDepartmentId | null;
		maxDepth: number;
		maxNodes: number;
	}) => Promise<Result<OrganizationTreePage>>;
	// Position
	getPositionById: (input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}) => Promise<Result<Position | null>>;
	// Reporting line
	getReportingLineById: (input: {
		organizationId: string;
		reportingLineId: HumanResourcesReportingLineId;
	}) => Promise<Result<ReportingLine | null>>;

	listActiveContractsByEmployment: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<
		Result<
			Array<{
				id: HumanResourcesEmploymentContractId;
				startsOn: string;
				endsOn: string | null;
			}>
		>
	>;

	listAllDepartments: (input: {
		organizationId: string;
	}) => Promise<Result<Department[]>>;

	listAssignmentsByEmployment: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<WorkAssignment[]>>;

	listDepartments: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: DepartmentStatus | undefined;
		parentDepartmentId?: HumanResourcesDepartmentId | null | undefined;
	}) => Promise<Result<{ departments: Department[]; totalCount: number }>>;

	listDirectReports: (input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}) => Promise<
		Result<{ reportingLines: ReportingLine[]; totalCount: number }>
	>;

	listEmployees: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeNumberPrefix?: string | undefined;
		legalNamePrefix?: string | undefined;
		employmentStatus?: EmploymentStatus | undefined;
	}) => Promise<Result<EmployeeListPage>>;

	listEmploymentContractsByEmployment: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<EmploymentContract[]>>;

	listEmploymentStatusHistory: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<EmploymentStatusHistory[]>>;

	listEmploymentsByEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<
		Result<
			Array<{
				id: HumanResourcesEmploymentId;
				startsOn: string;
				endsOn: string | null;
			}>
		>
	>;

	listJobs: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JobStatus | undefined;
	}) => Promise<Result<{ jobs: Job[]; totalCount: number }>>;

	listPositions: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string | undefined;
		departmentId?: HumanResourcesDepartmentId | undefined;
		jobId?: HumanResourcesJobId | undefined;
	}) => Promise<Result<{ positions: Position[]; totalCount: number }>>;

	listReportingLinesForEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<ReportingLine[]>>;

	listWorkforcePlanActualAssignments: (input: {
		organizationId: string;
		asOf: string;
	}) => Promise<Result<WorkforcePlanActualAssignment[]>>;

	replacePrimaryReportingLine: (
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
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<ReportingLine>>;

	resolvePositionOccupancyAsOf: (input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
		asOf: string;
	}) => Promise<Result<PositionOccupancyAsOf | null>>;

	resolvePrimaryManager: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}) => Promise<Result<ReportingLine | null>>;

	setDepartmentStatus: (
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			status: DepartmentStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Department>>;

	setJobStatus: (
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			status: JobStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Job>>;

	setPositionStatus: (
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			status: PositionStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Position>>;

	supersedeEmploymentContract: (
		input: {
			organizationId: string;
			employmentContractId: HumanResourcesEmploymentContractId;
			referenceCode: string;
			startsOn: string;
			endsOn: string | null;
			reasonCode: string;
			sourceReference: string;
			predecessorEffectiveTo: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<
		Result<{ superseded: EmploymentContract; successor: EmploymentContract }>
	>;

	updateDepartment: (
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			name?: string | undefined;
			parentDepartmentId?: HumanResourcesDepartmentId | null | undefined;
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Department>>;

	updateEmployee: (
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			legalName: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Employee>>;

	updateJob: (
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			title: string;
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Job>>;

	updatePosition: (
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			title?: string | undefined;
			departmentId?: HumanResourcesDepartmentId | undefined;
			jobId?: HumanResourcesJobId | undefined;
			effectiveOn: string;
			reasonCode: string;
			evidenceRef?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Position>>;
}
