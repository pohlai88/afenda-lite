import type {
	HumanResourcesApplicationId,
	HumanResourcesAssignmentId,
	HumanResourcesBenefitEnrollmentId,
	HumanResourcesBenefitPlanId,
	HumanResourcesCandidateId,
	HumanResourcesCertificationId,
	HumanResourcesClearanceId,
	HumanResourcesCompensationGradeId,
	HumanResourcesCompensationReviewId,
	HumanResourcesCompletionId,
	HumanResourcesCourseId,
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeCompensationId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentConfirmationId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesEmploymentMovementId,
	HumanResourcesExitInterviewId,
	HumanResourcesInterviewEvaluationId,
	HumanResourcesInterviewId,
	HumanResourcesJobId,
	HumanResourcesLearningAssignmentId,
	HumanResourcesOffboardingCaseId,
	HumanResourcesOffboardingTaskId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesOnboardingTaskId,
	HumanResourcesPositionId,
	HumanResourcesProbationReviewId,
	HumanResourcesReportingLineId,
	HumanResourcesRequisitionId,
	HumanResourcesSalaryBandId,
	HumanResourcesSessionId,
	HumanResourcesTerminationId,
} from "./brands";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
	ReportingRelationshipKind,
} from "./shared/employment-status";
import type {
	BenefitEnrollmentStatus,
	BenefitPlanStatus,
	CompensationGradeStatus,
	CompensationReviewStatus,
	EmployeeCompensationStatus,
	SalaryBandStatus,
} from "./shared/compensation-status";
import type {
	ClearanceStatus,
	LifecycleTaskStatus,
	MovementKind,
	OffboardingCaseStatus,
	OnboardingCaseStatus,
	ProbationOutcome,
	ProbationStatus,
	TerminationStatus,
} from "./shared/lifecycle-status";
import type {
	ApplicationStatus,
	CandidateStatus,
	InterviewEvaluationResult,
	InterviewStatus,
	OfferStatus,
	RequisitionStatus,
} from "./shared/recruitment-status";
import type {
	AssignmentStatus,
	CertificationStatus,
	CourseStatus,
	SessionStatus,
} from "./shared/learning-status";

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

export type OnboardingCase = {
	id: HumanResourcesOnboardingCaseId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	status: OnboardingCaseStatus;
	sourceOfferId: HumanResourcesOfferId | null;
	startedAt: Date;
	completedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type OnboardingTask = {
	id: HumanResourcesOnboardingTaskId;
	organizationId: string;
	caseId: HumanResourcesOnboardingCaseId;
	code: string;
	title: string;
	mandatory: boolean;
	status: LifecycleTaskStatus;
	completedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ProbationReview = {
	id: HumanResourcesProbationReviewId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	status: ProbationStatus;
	startsOn: string;
	endsOn: string;
	outcome: ProbationOutcome | null;
	outcomeActorId: string | null;
	outcomeRecordedOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmploymentConfirmation = {
	id: HumanResourcesEmploymentConfirmationId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	confirmedOn: string;
	confirmedBy: string;
	evidenceNote: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmploymentMovement = {
	id: HumanResourcesEmploymentMovementId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	movementKind: MovementKind;
	fromAssignmentId: HumanResourcesAssignmentId;
	toAssignmentId: HumanResourcesAssignmentId;
	fromPositionId: HumanResourcesPositionId;
	toPositionId: HumanResourcesPositionId;
	effectiveOn: string;
	reason: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Termination = {
	id: HumanResourcesTerminationId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	status: TerminationStatus;
	reasonCode: string;
	reasonDetail: string;
	effectiveOn: string;
	finalizedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type OffboardingCase = {
	id: HumanResourcesOffboardingCaseId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	terminationId: HumanResourcesTerminationId | null;
	status: OffboardingCaseStatus;
	startedAt: Date;
	completedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type OffboardingTask = {
	id: HumanResourcesOffboardingTaskId;
	organizationId: string;
	caseId: HumanResourcesOffboardingCaseId;
	code: string;
	title: string;
	mandatory: boolean;
	status: LifecycleTaskStatus;
	completedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ExitInterview = {
	id: HumanResourcesExitInterviewId;
	organizationId: string;
	offboardingCaseId: HumanResourcesOffboardingCaseId;
	employmentId: HumanResourcesEmploymentId;
	conductedOn: string;
	notes: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Clearance = {
	id: HumanResourcesClearanceId;
	organizationId: string;
	offboardingCaseId: HumanResourcesOffboardingCaseId;
	employmentId: HumanResourcesEmploymentId;
	status: ClearanceStatus;
	clearedOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CompensationGrade = {
	id: HumanResourcesCompensationGradeId;
	organizationId: string;
	code: string;
	name: string;
	status: CompensationGradeStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type SalaryBand = {
	id: HumanResourcesSalaryBandId;
	organizationId: string;
	gradeId: HumanResourcesCompensationGradeId;
	currencyCode: string;
	minAmount: string;
	midAmount: string;
	maxAmount: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: SalaryBandStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeCompensation = {
	id: HumanResourcesEmployeeCompensationId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	gradeId: HumanResourcesCompensationGradeId | null;
	salaryBandId: HumanResourcesSalaryBandId | null;
	baseAmount: string;
	currencyCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	reason: string;
	status: EmployeeCompensationStatus;
	sourceReviewId: HumanResourcesCompensationReviewId | null;
	createIdempotencyKey: string;
	fingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CompensationReview = {
	id: HumanResourcesCompensationReviewId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	status: CompensationReviewStatus;
	proposedBaseAmount: string | null;
	proposedCurrencyCode: string | null;
	proposedGradeId: HumanResourcesCompensationGradeId | null;
	proposedSalaryBandId: HumanResourcesSalaryBandId | null;
	recommendationNote: string | null;
	effectiveFrom: string | null;
	finalizedAt: Date | null;
	appliedCompensationId: HumanResourcesEmployeeCompensationId | null;
	createIdempotencyKey: string;
	fingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type BenefitPlan = {
	id: HumanResourcesBenefitPlanId;
	organizationId: string;
	code: string;
	name: string;
	eligibilityNote: string | null;
	status: BenefitPlanStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type BenefitEnrollment = {
	id: HumanResourcesBenefitEnrollmentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	planId: HumanResourcesBenefitPlanId;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: BenefitEnrollmentStatus;
	createIdempotencyKey: string;
	fingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CompensationGradeListPage = {
	grades: CompensationGrade[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type SalaryBandListPage = {
	bands: SalaryBand[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type EmployeeCompensationListPage = {
	compensations: EmployeeCompensation[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type CompensationReviewListPage = {
	reviews: CompensationReview[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type BenefitPlanListPage = {
	plans: BenefitPlan[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type BenefitEnrollmentListPage = {
	enrollments: BenefitEnrollment[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type LearningCourse = {
	id: HumanResourcesCourseId;
	organizationId: string;
	code: string;
	title: string;
	description: string | null;
	durationHours: string | null;
	status: CourseStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LearningSession = {
	id: HumanResourcesSessionId;
	organizationId: string;
	courseId: HumanResourcesCourseId;
	sessionCode: string;
	instructorActorId: string | null;
	location: string | null;
	maxParticipants: number | null;
	startsOn: string;
	endsOn: string;
	status: SessionStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LearningAssignment = {
	id: HumanResourcesLearningAssignmentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	courseId: HumanResourcesCourseId;
	sessionId: HumanResourcesSessionId | null;
	assignedOn: string;
	dueOn: string | null;
	status: AssignmentStatus;
	assigneeNote: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LearningCompletion = {
	id: HumanResourcesCompletionId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	assignmentId: HumanResourcesLearningAssignmentId;
	sessionId: HumanResourcesSessionId;
	courseId: HumanResourcesCourseId;
	completedOn: string;
	evidenceNote: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeCertification = {
	id: HumanResourcesCertificationId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	courseId: HumanResourcesCourseId;
	certificationCode: string;
	issuedOn: string;
	expiresOn: string | null;
	status: CertificationStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CourseListPage = {
	courses: LearningCourse[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type SessionListPage = {
	sessions: LearningSession[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type LearningAssignmentListPage = {
	assignments: LearningAssignment[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type CompletionListPage = {
	completions: LearningCompletion[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type CertificationListPage = {
	certifications: EmployeeCertification[];
	totalCount: number;
	page: number;
	pageSize: number;
};

/**
 * Minimized DTO for approved compensation handoff to payroll or external systems.
 * Active agreement + active enrollments only.
 */
export type ApprovedCompensationHandoff = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	activeCompensation: EmployeeCompensation | null;
	activeBenefitEnrollments: BenefitEnrollment[];
};
