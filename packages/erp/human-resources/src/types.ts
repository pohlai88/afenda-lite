import type {
	HumanResourcesApplicationId,
	HumanResourcesAssignmentId,
	HumanResourcesCandidateId,
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesInterviewEvaluationId,
	HumanResourcesInterviewId,
	HumanResourcesJobId,
	HumanResourcesOfferId,
	HumanResourcesPositionId,
	HumanResourcesReportingLineId,
	HumanResourcesRequisitionId,
} from "./brands";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
	ReportingRelationshipKind,
} from "./shared/employment-status";
import type {
	ApplicationStatus,
	CandidateStatus,
	InterviewEvaluationResult,
	InterviewStatus,
	OfferStatus,
	RequisitionStatus,
} from "./shared/recruitment-status";

export type Employee = {
	id: HumanResourcesEmployeeId;
	organizationId: string;
	employeeNumber: string;
	legalName: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Employment = {
	id: HumanResourcesEmploymentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	status: EmploymentStatus;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmploymentContract = {
	id: HumanResourcesEmploymentContractId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	referenceCode: string;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Department = {
	id: HumanResourcesDepartmentId;
	organizationId: string;
	code: string;
	name: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	status: DepartmentStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Job = {
	id: HumanResourcesJobId;
	organizationId: string;
	code: string;
	title: string;
	status: JobStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Position = {
	id: HumanResourcesPositionId;
	organizationId: string;
	code: string;
	title: string;
	departmentId: HumanResourcesDepartmentId | null;
	jobId: HumanResourcesJobId | null;
	status: PositionStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkAssignment = {
	id: HumanResourcesAssignmentId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	positionId: HumanResourcesPositionId;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ReportingLine = {
	id: HumanResourcesReportingLineId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	managerEmployeeId: HumanResourcesEmployeeId;
	relationshipKind: ReportingRelationshipKind;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type OrganizationTreeNode = {
	id: HumanResourcesDepartmentId;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	code: string;
	name: string;
	status: DepartmentStatus;
	depth: number;
};

export type OrganizationTreePage = {
	nodes: OrganizationTreeNode[];
	truncated: boolean;
};

export type EmployeeListPage = {
	employees: Employee[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type JobRequisition = {
	id: HumanResourcesRequisitionId;
	organizationId: string;
	code: string;
	title: string;
	status: RequisitionStatus;
	jobId: HumanResourcesJobId | null;
	positionId: HumanResourcesPositionId | null;
	departmentId: HumanResourcesDepartmentId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Candidate = {
	id: HumanResourcesCandidateId;
	organizationId: string;
	displayName: string;
	email: string;
	phone: string | null;
	status: CandidateStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CandidateApplication = {
	id: HumanResourcesApplicationId;
	organizationId: string;
	candidateId: HumanResourcesCandidateId;
	requisitionId: HumanResourcesRequisitionId;
	status: ApplicationStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Interview = {
	id: HumanResourcesInterviewId;
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	scheduledAt: Date;
	status: InterviewStatus;
	interviewerActorId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

/** Public interview list row — never includes private evaluator notes. */
export type InterviewListItem = Interview;

export type InterviewEvaluation = {
	id: HumanResourcesInterviewEvaluationId;
	organizationId: string;
	interviewId: HumanResourcesInterviewId;
	result: InterviewEvaluationResult;
	privateNotes: string | null;
	evaluatorActorId: string;
	recordedAt: Date;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmploymentOffer = {
	id: HumanResourcesOfferId;
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	status: OfferStatus;
	termsSummary: string;
	expiresOn: string;
	issuedAt: Date | null;
	respondedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Explicit conversion handoff after offer acceptance.
 * Does not create an employee — caller must invoke createEmployee (HR-02 / HR6).
 */
export type OfferAcceptanceHandoff = {
	organizationId: string;
	offerId: HumanResourcesOfferId;
	applicationId: HumanResourcesApplicationId;
	candidateId: HumanResourcesCandidateId;
	requisitionId: HumanResourcesRequisitionId;
	correlationId: string;
	acceptedAt: Date;
	offer: EmploymentOffer;
};

export type RequisitionListPage = {
	requisitions: JobRequisition[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type CandidateListPage = {
	candidates: Candidate[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type ApplicationListPage = {
	applications: CandidateApplication[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type InterviewListPage = {
	interviews: InterviewListItem[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type OfferListPage = {
	offers: EmploymentOffer[];
	totalCount: number;
	page: number;
	pageSize: number;
};
