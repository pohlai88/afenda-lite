import type { Result } from "@afenda/errors/result";

import type {
	HumanResourcesApplicationId,
	HumanResourcesAssignmentId,
	HumanResourcesCandidateId,
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesInterviewId,
	HumanResourcesJobId,
	HumanResourcesOfferId,
	HumanResourcesPositionId,
	HumanResourcesReportingLineId,
	HumanResourcesRequisitionId,
} from "./brands";
import type { MutationPorts } from "./ports";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
} from "./shared/employment-status";
import type {
	ApplicationStatus,
	CandidateStatus,
	InterviewEvaluationResult,
	OfferStatus,
	RequisitionStatus,
} from "./shared/recruitment-status";
import type {
	ApplicationListPage,
	Candidate,
	CandidateApplication,
	CandidateListPage,
	Department,
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	EmploymentOffer,
	Interview,
	InterviewEvaluation,
	InterviewListPage,
	Job,
	JobRequisition,
	OfferAcceptanceHandoff,
	OfferListPage,
	OrganizationTreePage,
	Position,
	ReportingLine,
	RequisitionListPage,
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

export type RequisitionCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	jobId: HumanResourcesJobId | null;
	positionId: HumanResourcesPositionId | null;
	departmentId: HumanResourcesDepartmentId | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentRequisitionRecord = {
	requisition: JobRequisition;
	createRequestFingerprint: string;
};

export type CandidateCreateRecord = {
	organizationId: string;
	displayName: string;
	email: string;
	normalizedEmail: string;
	phone: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentCandidateRecord = {
	candidate: Candidate;
	createRequestFingerprint: string;
};

export type IdempotentOfferAcceptRecord = {
	handoff: OfferAcceptanceHandoff;
	acceptRequestFingerprint: string;
};

export type ApplicationCreateRecord = {
	organizationId: string;
	candidateId: HumanResourcesCandidateId;
	requisitionId: HumanResourcesRequisitionId;
	createdBy: string;
};

export type InterviewScheduleRecord = {
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	scheduledAt: string;
	interviewerActorId: string;
	createdBy: string;
};

export type InterviewEvaluationCreateRecord = {
	organizationId: string;
	interviewId: HumanResourcesInterviewId;
	result: InterviewEvaluationResult;
	privateNotes: string | null;
	evaluatorActorId: string;
	expectedVersion: number;
	createdBy: string;
};

export type OfferCreateRecord = {
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	termsSummary: string;
	expiresOn: string;
	createdBy: string;
};

/**
 * Persistence contract for Human Resources.
 *
 * Transaction semantics for mutations:
 * - Atomic unit = aggregate row + audit fact + (optional) outbox event.
 * - Memory adapter: write then call ports; roll back in-memory state on port failure.
 * - Drizzle adapter: single `runNeonHttpTransaction` CTE inserting rows +
 *   `platform_audit_log` + `platform_domain_event` (ports argument reserved for
 *   memory / test injection; production path embeds SQL in the same TX).
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

	// Requisition
	findRequisitionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentRequisitionRecord | null>>;

	getRequisitionById(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<JobRequisition | null>>;

	findRequisitionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<JobRequisition | null>>;

	createDraftRequisition(
		record: RequisitionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>>;

	amendRequisition(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			title?: string;
			jobId?: HumanResourcesJobId | null;
			positionId?: HumanResourcesPositionId | null;
			departmentId?: HumanResourcesDepartmentId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>>;

	transitionRequisitionStatus(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			status: RequisitionStatus;
			expectedVersion: number;
			actorUserId: string;
			emitApprovedEvent?: boolean;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>>;

	listRequisitions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: RequisitionStatus;
	}): Promise<Result<RequisitionListPage>>;

	// Candidate
	findCandidateByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCandidateRecord | null>>;

	getCandidateById(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
	}): Promise<Result<Candidate | null>>;

	findCandidateByNormalizedEmail(input: {
		organizationId: string;
		normalizedEmail: string;
	}): Promise<Result<Candidate | null>>;

	createCandidate(
		record: CandidateCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Candidate>>;

	updateCandidateProfile(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			displayName?: string;
			phone?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Candidate>>;

	listCandidates(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CandidateStatus;
	}): Promise<Result<CandidateListPage>>;

	// Application
	getApplicationById(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<CandidateApplication | null>>;

	findActiveApplicationByCandidateRequisition(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<CandidateApplication | null>>;

	createApplication(
		record: ApplicationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CandidateApplication>>;

	transitionApplicationStatus(
		input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			status: ApplicationStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CandidateApplication>>;

	listApplications(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: ApplicationStatus;
		candidateId?: HumanResourcesCandidateId;
		requisitionId?: HumanResourcesRequisitionId;
	}): Promise<Result<ApplicationListPage>>;

	// Interview
	getInterviewById(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<Interview | null>>;

	scheduleInterview(
		record: InterviewScheduleRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Interview>>;

	cancelInterview(
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Interview>>;

	listInterviews(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<InterviewListPage>>;

	// Interview evaluation
	getInterviewEvaluationByInterviewId(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<InterviewEvaluation | null>>;

	recordInterviewEvaluation(
		record: InterviewEvaluationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<InterviewEvaluation>>;

	// Offer
	getOfferById(input: {
		organizationId: string;
		offerId: HumanResourcesOfferId;
	}): Promise<Result<EmploymentOffer | null>>;

	findActiveOfferByApplication(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<EmploymentOffer | null>>;

	findOfferByAcceptIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOfferAcceptRecord | null>>;

	createOffer(
		record: OfferCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>>;

	amendOfferDraft(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			termsSummary?: string;
			expiresOn?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>>;

	transitionOfferStatus(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			status: OfferStatus;
			expectedVersion: number;
			actorUserId: string;
			asOfDate?: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>>;

	acceptOffer(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			idempotencyKey: string;
			acceptRequestFingerprint: string;
			expectedVersion: number;
			actorUserId: string;
			asOfDate: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OfferAcceptanceHandoff>>;

	listOffers(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: OfferStatus;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<OfferListPage>>;
};
