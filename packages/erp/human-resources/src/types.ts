import type {
	HumanResourcesApplicationId,
	HumanResourcesAssessmentId,
	HumanResourcesAssignmentId,
	HumanResourcesAttendanceAdjustmentId,
	HumanResourcesAttendanceBreakWaiverDecisionId,
	HumanResourcesAttendanceEventId,
	HumanResourcesAttendanceExceptionId,
	HumanResourcesAttendanceSessionId,
	HumanResourcesBenefitEnrollmentId,
	HumanResourcesBenefitPlanId,
	HumanResourcesCandidateId,
	HumanResourcesCareerPlanActionId,
	HumanResourcesCareerPlanId,
	HumanResourcesCertificationId,
	HumanResourcesClearanceId,
	HumanResourcesCompensationGradeId,
	HumanResourcesCompensationReviewId,
	HumanResourcesCompetencyAssessmentId,
	HumanResourcesCompetencyId,
	HumanResourcesCompletionId,
	HumanResourcesCourseId,
	HumanResourcesDepartmentId,
	HumanResourcesDocumentRequirementId,
	HumanResourcesEmployeeCompensationId,
	HumanResourcesEmployeeDocumentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentCalendarAssignmentId,
	HumanResourcesEmploymentConfirmationId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesEmploymentMovementId,
	HumanResourcesExitInterviewId,
	HumanResourcesGoalId,
	HumanResourcesGoalProgressId,
	HumanResourcesHeadcountPlanId,
	HumanResourcesHeadcountPlanLineId,
	HumanResourcesHeadcountReservationId,
	HumanResourcesImprovementCheckpointId,
	HumanResourcesImprovementPlanId,
	HumanResourcesInterviewEvaluationId,
	HumanResourcesInterviewId,
	HumanResourcesJobCompetencyId,
	HumanResourcesJobId,
	HumanResourcesLearningAssignmentId,
	HumanResourcesLeaveAdjustmentId,
	HumanResourcesLeaveApprovalDecisionId,
	HumanResourcesLeaveEntitlementId,
	HumanResourcesLeavePolicyId,
	HumanResourcesLeaveRequestId,
	HumanResourcesLeaveRequestSegmentId,
	HumanResourcesOffboardingCaseId,
	HumanResourcesOffboardingTaskId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesOnboardingTaskId,
	HumanResourcesOvertimeRequestId,
	HumanResourcesPerformanceCycleId,
	HumanResourcesPerformanceCycleParticipantId,
	HumanResourcesPolicyAcknowledgementId,
	HumanResourcesPositionId,
	HumanResourcesProbationReviewId,
	HumanResourcesReportingLineId,
	HumanResourcesRequisitionId,
	HumanResourcesReviewId,
	HumanResourcesReviewParticipantId,
	HumanResourcesSalaryBandId,
	HumanResourcesSessionId,
	HumanResourcesShiftAssignmentId,
	HumanResourcesShiftAssignmentSegmentId,
	HumanResourcesShiftBreakId,
	HumanResourcesShiftId,
	HumanResourcesSuccessionCandidateId,
	HumanResourcesSuccessionPlanId,
	HumanResourcesTalentPoolId,
	HumanResourcesTalentPoolMemberId,
	HumanResourcesTalentProfileAssessmentId,
	HumanResourcesTalentProfileId,
	HumanResourcesTerminationId,
	HumanResourcesTimeApprovalAuthorityAssignmentId,
	HumanResourcesTimePolicyAssignmentId,
	HumanResourcesTimePolicyId,
	HumanResourcesTimesheetApprovalDecisionId,
	HumanResourcesTimesheetEntryId,
	HumanResourcesTimesheetId,
	HumanResourcesWorkCalendarHolidayId,
	HumanResourcesWorkCalendarId,
	HumanResourcesWorkCalendarScopeAssignmentId,
	HumanResourcesWorkEligibilityId,
} from "./brands";
import type { HumanResourcesOrganizationDimensions } from "./ports";
import type {
	BenefitEnrollmentStatus,
	BenefitPlanStatus,
	CompensationGradeStatus,
	CompensationReviewStatus,
	EmployeeCompensationStatus,
	SalaryBandStatus,
} from "./shared/compensation-status";
import type {
	DocumentRequirementStatus,
	EmployeeDocumentVerificationStatus,
	PolicyAcknowledgementStatus,
	WorkEligibilityStatus,
} from "./shared/compliance-status";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
	ReportingRelationshipKind,
} from "./shared/employment-status";
import type {
	AssignmentStatus,
	CertificationStatus,
	CourseStatus,
	SessionStatus,
} from "./shared/learning-status";
import type {
	ApprovalDecision,
	DayPortion,
	LeaveAdjustmentKind,
	LeaveAdjustmentStatus,
	LeaveEntitlementStatus,
	LeavePolicyStatus,
	LeaveRequestStatus,
	LeaveType,
	LeaveUnit,
} from "./shared/leave-status";
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
import type { PerformanceRatingScale } from "./shared/performance-rating";
import type {
	PerformanceAssessmentKind,
	PerformanceCheckpointOutcome,
	PerformanceCycleParticipantStatus,
	PerformanceCycleStatus,
	PerformanceGoalStatus,
	PerformanceImprovementPlanStatus,
	PerformanceReviewStatus,
	PerformanceWeightingModel,
} from "./shared/performance-status";
import type {
	ApplicationStatus,
	CandidateConsentSource,
	CandidateStatus,
	InterviewEvaluationResult,
	InterviewStatus,
	OfferStatus,
	RequisitionStatus,
} from "./shared/recruitment-status";
import type {
	CareerPlanActionStatus,
	CareerPlanStatus,
	CompetencyAssessmentStatus,
	CompetencyScaleCode,
	CompetencyStatus,
	JobCompetencyStatus,
	SuccessionCandidateStatus,
	SuccessionPlanStatus,
	SuccessionReadinessCode,
	TalentPoolMemberStatus,
	TalentPoolStatus,
	TalentProfileAssessmentMethodCode,
	TalentProfileAssessmentStatus,
	TalentProfileStatus,
} from "./shared/talent-status";
import type {
	HeadcountEmploymentType,
	HeadcountPlanStatus,
	HeadcountReservationStatus,
} from "./shared/workforce-planning-status";

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
	/** Null only for rows created before governed organization dimensions. */
	organizationDimensions: HumanResourcesOrganizationDimensions | null;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PositionOccupancyAsOf = {
	position: Position;
	asOf: string;
	assignment: WorkAssignment | null;
	state: "vacant" | "occupied";
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
	consentPolicyVersion: string | null;
	consentCapturedAt: Date | null;
	consentSource: CandidateConsentSource | null;
	retentionUntil: string | null;
	consentWithdrawnAt: Date | null;
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
	code: string;
	title: string;
	scheduledStartsAt: Date;
	scheduledEndsAt: Date;
	actualStartsAt: Date | null;
	actualEndsAt: Date | null;
	capacity: number | null;
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
	courseId: HumanResourcesCourseId;
	sessionId: HumanResourcesSessionId | null;
	assignedBy: string;
	assignedAt: Date;
	dueOn: string | null;
	status: AssignmentStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LearningCompletion = {
	id: HumanResourcesCompletionId;
	organizationId: string;
	assignmentId: HumanResourcesLearningAssignmentId;
	employeeId: HumanResourcesEmployeeId;
	courseId: HumanResourcesCourseId;
	sessionId: HumanResourcesSessionId | null;
	completedAt: Date;
	outcome: string;
	assessorUserId: string | null;
	notes: string | null;
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
	completionId: HumanResourcesCompletionId;
	certificationCode: string;
	issuedOn: string;
	expiresOn: string | null;
	status: CertificationStatus;
	revokedAt: Date | null;
	revokedBy: string | null;
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

export type ApprovedCompensationHandoff = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	activeCompensation: EmployeeCompensation | null;
	activeBenefitEnrollments: BenefitEnrollment[];
};

export type LeavePolicy = {
	id: HumanResourcesLeavePolicyId;
	organizationId: string;
	code: string;
	name: string;
	leaveType: LeaveType;
	unit: LeaveUnit;
	paid: boolean;
	sensitive: boolean;
	allowsNegativeBalance: boolean;
	allowSelfApproval: boolean;
	allowsPartialDay: boolean;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: LeavePolicyStatus;
	supersedesPolicyId: HumanResourcesLeavePolicyId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LeavePolicyEligibility = {
	id: string;
	organizationId: string;
	policyId: HumanResourcesLeavePolicyId;
	minTenureDays: number | null;
	allowedEmploymentStatuses: EmploymentStatus[];
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LeaveEntitlement = {
	id: HumanResourcesLeaveEntitlementId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	policyId: HumanResourcesLeavePolicyId;
	periodStart: string;
	periodEnd: string;
	openingQuantity: string;
	status: LeaveEntitlementStatus;
	createIdempotencyKey: string;
	fingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LeaveAdjustment = {
	id: HumanResourcesLeaveAdjustmentId;
	organizationId: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	sourceRequestId: HumanResourcesLeaveRequestId | null;
	kind: LeaveAdjustmentKind;
	delta: string;
	reason: string;
	source: string;
	status: LeaveAdjustmentStatus;
	createIdempotencyKey: string;
	fingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LeaveRequest = {
	id: HumanResourcesLeaveRequestId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	entitlementId: HumanResourcesLeaveEntitlementId;
	policyId: HumanResourcesLeavePolicyId;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	unit: LeaveUnit;
	status: LeaveRequestStatus;
	isBackdated: boolean;
	backdateJustification: string | null;
	approvedAt: Date | null;
	createIdempotencyKey: string;
	fingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LeaveRequestSegment = {
	id: HumanResourcesLeaveRequestSegmentId;
	organizationId: string;
	requestId: HumanResourcesLeaveRequestId;
	segmentDate: string;
	quantity: string;
	dayPortion: DayPortion;
	createdAt: Date;
	updatedAt: Date;
};

export type LeaveApprovalDecision = {
	id: HumanResourcesLeaveApprovalDecisionId;
	organizationId: string;
	requestId: HumanResourcesLeaveRequestId;
	decision: ApprovalDecision;
	decidedBy: string;
	decidedAt: Date;
	note: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type LeaveBalance = {
	entitlementId: HumanResourcesLeaveEntitlementId;
	employeeId: HumanResourcesEmployeeId;
	policyId: HumanResourcesLeavePolicyId;
	unit: LeaveUnit;
	openingQuantity: string;
	balance: string;
};

export type LeaveBalanceReconciliation = {
	entitlementId: HumanResourcesLeaveEntitlementId;
	openingQuantity: string;
	adjustments: Array<
		Pick<
			LeaveAdjustment,
			"id" | "kind" | "delta" | "reason" | "source" | "createdAt"
		>
	>;
	adjustmentCount: number;
	balance: string;
	latestAdjustmentAt: Date | null;
};

export type ApprovedLeaveHandoff = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	requestId: HumanResourcesLeaveRequestId;
	policyId: HumanResourcesLeavePolicyId;
	policyVersion: number;
	paid: boolean;
	unit: LeaveUnit;
	startDate: string;
	endDate: string;
	quantity: string;
	segments: Array<{ date: string; quantity: string; dayPortion: string }>;
	approvedAt: string;
	correlationId: string;
};

export type ResolvedLeavePolicy = {
	policy: LeavePolicy;
	eligibility: LeavePolicyEligibility;
};

export type LeavePolicyListPage = {
	policies: LeavePolicy[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type LeaveEntitlementListPage = {
	entitlements: LeaveEntitlement[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type LeaveRequestListPage = {
	requests: LeaveRequest[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type TeamCalendarLeaveEntry = {
	request: LeaveRequest;
	segments: LeaveRequestSegment[];
};

export type TeamCalendarLeavePage = {
	entries: TeamCalendarLeaveEntry[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceCycle = {
	id: HumanResourcesPerformanceCycleId;
	organizationId: string;
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	ratingScale: PerformanceRatingScale;
	weightingModel: PerformanceWeightingModel;
	status: PerformanceCycleStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceCycleParticipant = {
	id: HumanResourcesPerformanceCycleParticipantId;
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	status: PerformanceCycleParticipantStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceGoal = {
	id: HumanResourcesGoalId;
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	title: string;
	description: string | null;
	weight: string | null;
	periodStart: string;
	periodEnd: string;
	exceptionOutsideCycle: boolean;
	status: PerformanceGoalStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceGoalProgress = {
	id: HumanResourcesGoalProgressId;
	organizationId: string;
	goalId: HumanResourcesGoalId;
	recordedAt: Date;
	progressNote: string;
	progressValue: string | null;
	recordedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceReview = {
	id: HumanResourcesReviewId;
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	overallRating: string | null;
	acknowledgementNote: string | null;
	status: PerformanceReviewStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceReviewParticipant = {
	id: HumanResourcesReviewParticipantId;
	organizationId: string;
	reviewId: HumanResourcesReviewId;
	role: "self" | "manager" | "delegated";
	employeeId: HumanResourcesEmployeeId | null;
	userId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceAssessment = {
	id: HumanResourcesAssessmentId;
	organizationId: string;
	reviewId: HumanResourcesReviewId;
	kind: PerformanceAssessmentKind;
	rating: string | null;
	commentsSensitive: string | null;
	submittedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceImprovementPlan = {
	id: HumanResourcesImprovementPlanId;
	organizationId: string;
	reviewId: HumanResourcesReviewId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	performanceGap: string;
	expectedOutcome: string;
	measurableActions: string;
	supportResources: string;
	dueDate: string;
	accountableManagerEmployeeId: HumanResourcesEmployeeId;
	status: PerformanceImprovementPlanStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceImprovementCheckpoint = {
	id: HumanResourcesImprovementCheckpointId;
	organizationId: string;
	planId: HumanResourcesImprovementPlanId;
	sequenceNumber: number;
	dueDate: string;
	outcome: PerformanceCheckpointOutcome;
	notes: string | null;
	recordedBy: string | null;
	recordedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceCycleListPage = {
	cycles: PerformanceCycle[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceCycleParticipantListPage = {
	participants: PerformanceCycleParticipant[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceGoalListPage = {
	goals: PerformanceGoal[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceReviewListPage = {
	reviews: PerformanceReview[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceImprovementPlanListPage = {
	plans: PerformanceImprovementPlan[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceAssessmentProjection = {
	id: HumanResourcesAssessmentId;
	kind: PerformanceAssessmentKind;
	rating: string | null;
	commentsSensitive: string | null;
	submittedAt: Date | null;
	version: number;
};

export type PerformanceReviewDetail = {
	review: PerformanceReview;
	participants: PerformanceReviewParticipant[];
	assessments: PerformanceAssessmentProjection[];
};

export type EmployeePerformanceHistoryEntry = {
	review: PerformanceReview;
	overallRating: string | null;
	assessments: PerformanceAssessmentProjection[];
	goals: PerformanceGoal[];
	improvementPlans: PerformanceImprovementPlan[];
};

export type EmployeePerformanceHistory = {
	employeeId: HumanResourcesEmployeeId;
	entries: EmployeePerformanceHistoryEntry[];
};

export function projectPerformanceAssessment(
	assessment: PerformanceAssessment,
	includeConfidential: boolean,
): PerformanceAssessmentProjection {
	if (includeConfidential) {
		return {
			id: assessment.id,
			kind: assessment.kind,
			rating: assessment.rating,
			commentsSensitive: assessment.commentsSensitive,
			submittedAt: assessment.submittedAt,
			version: assessment.version,
		};
	}
	return {
		id: assessment.id,
		kind: assessment.kind,
		rating: null,
		commentsSensitive: null,
		submittedAt: assessment.submittedAt,
		version: assessment.version,
	};
}

export function projectPerformanceReviewDetail(
	input: {
		review: PerformanceReview;
		participants: PerformanceReviewParticipant[];
		assessments: PerformanceAssessment[];
	},
	includeConfidential: boolean,
): PerformanceReviewDetail {
	return {
		review: includeConfidential
			? input.review
			: {
					...input.review,
					overallRating: null,
					acknowledgementNote: input.review.acknowledgementNote,
				},
		participants: input.participants,
		assessments: input.assessments.map((assessment) =>
			projectPerformanceAssessment(assessment, includeConfidential),
		),
	};
}

export type HeadcountPlan = {
	id: HumanResourcesHeadcountPlanId;
	organizationId: string;
	code: string;
	title: string;
	planningScopeKey: string;
	periodStart: string;
	periodEnd: string;
	status: HeadcountPlanStatus;
	planVersion: number;
	supersedesPlanId: HumanResourcesHeadcountPlanId | null;
	approvedBy: string | null;
	approvedAt: Date | null;
	rejectedBy: string | null;
	rejectedAt: Date | null;
	rejectionReason: string | null;
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type HeadcountPlanLine = {
	id: HumanResourcesHeadcountPlanLineId;
	organizationId: string;
	planId: HumanResourcesHeadcountPlanId;
	departmentId: HumanResourcesDepartmentId | null;
	jobId: HumanResourcesJobId | null;
	positionId: HumanResourcesPositionId | null;
	locationCode: string | null;
	employmentType: HeadcountEmploymentType | null;
	plannedFte: string;
	plannedHeadcount: number;
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type HeadcountReservation = {
	id: HumanResourcesHeadcountReservationId;
	organizationId: string;
	planId: HumanResourcesHeadcountPlanId;
	planLineId: HumanResourcesHeadcountPlanLineId;
	requisitionId: HumanResourcesRequisitionId;
	reservedFte: string;
	reservedHeadcount: number;
	status: HeadcountReservationStatus;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type HeadcountPlanListPage = {
	plans: HeadcountPlan[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type HeadcountReservationListPage = {
	reservations: HeadcountReservation[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type HeadcountLineAvailability = {
	planLineId: string;
	plannedFte: string;
	plannedHeadcount: number;
	reservedFte: string;
	reservedHeadcount: number;
	consumedFte: string;
	consumedHeadcount: number;
	availableFte: string;
	availableHeadcount: number;
};

export type HeadcountAvailability = {
	planId: HumanResourcesHeadcountPlanId;
	planLineId: HumanResourcesHeadcountPlanLineId;
	lines: HeadcountLineAvailability[];
};

export type RecruitmentHeadcountHandoff = {
	organizationId: string;
	requisitionId: HumanResourcesRequisitionId;
	approvedPlan: HeadcountPlan | null;
	availability: HeadcountLineAvailability | null;
	activeReservation: HeadcountReservation | null;
};

export type WorkforcePlanVariance = {
	planId: HumanResourcesHeadcountPlanId;
	lines: Array<
		HeadcountLineAvailability & {
			varianceFte: string;
			varianceHeadcount: number;
		}
	>;
};

export type DocumentRequirement = {
	id: HumanResourcesDocumentRequirementId;
	organizationId: string;
	code: string;
	name: string;
	documentType: string;
	issuingJurisdiction: string | null;
	appliesToNote: string | null;
	status: DocumentRequirementStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeDocument = {
	id: HumanResourcesEmployeeDocumentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	requirementId: HumanResourcesDocumentRequirementId | null;
	documentType: string;
	issuingJurisdiction: string | null;
	issuedOn: string;
	expiresOn: string | null;
	verificationStatus: EmployeeDocumentVerificationStatus;
	verifiedBy: string | null;
	verifiedAt: Date | null;
	rejectionReason: string | null;
	documentRef: string;
	identifierLast4: string | null;
	identifierFingerprint: string | null;
	metadata: Record<string, unknown> | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeDocumentListItem = {
	id: HumanResourcesEmployeeDocumentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	requirementId: HumanResourcesDocumentRequirementId | null;
	documentType: string;
	issuingJurisdiction: string | null;
	issuedOn: string;
	expiresOn: string | null;
	verificationStatus: EmployeeDocumentVerificationStatus;
	verifiedAt: Date | null;
	version: number;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeDocumentSensitiveDetail = EmployeeDocumentListItem & {
	identifierLast4: string | null;
	documentRef: string;
	metadata: Record<string, unknown> | null;
	rejectionReason: string | null;
	verifiedBy: string | null;
};

export type WorkEligibility = {
	id: HumanResourcesWorkEligibilityId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	countryCode: string;
	jurisdiction: string | null;
	status: WorkEligibilityStatus;
	issuedOn: string;
	expiresOn: string | null;
	verifiedBy: string | null;
	verifiedAt: Date | null;
	documentRef: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PolicyAcknowledgement = {
	id: HumanResourcesPolicyAcknowledgementId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	policyCode: string;
	policyVersion: string;
	requirementStatus: PolicyAcknowledgementStatus;
	issuedAt: Date;
	acknowledgedAt: Date | null;
	acknowledgedBy: string | null;
	supersedesAcknowledgementId: HumanResourcesPolicyAcknowledgementId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type DocumentRequirementListPage = {
	requirements: DocumentRequirement[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type EmployeeDocumentListPage = {
	documents: EmployeeDocumentListItem[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type WorkEligibilityRiskListPage = {
	eligibilities: WorkEligibility[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PolicyAcknowledgementListPage = {
	acknowledgements: PolicyAcknowledgement[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type EmployeeComplianceSummary = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	missingRequiredDocumentCount: number;
	expiringDocumentCount: number;
	workEligibilityAtRisk: boolean;
	outstandingPolicyAcknowledgementCount: number;
};

export type IdempotentEmployeeDocumentRecord = {
	document: EmployeeDocument;
	createRequestFingerprint: string;
};

export type IdempotentWorkEligibilityRecord = {
	eligibility: WorkEligibility;
	createRequestFingerprint: string;
};

export type IdempotentPolicyAcknowledgementRecord = {
	acknowledgement: PolicyAcknowledgement;
	createRequestFingerprint: string;
};

export type Competency = {
	id: HumanResourcesCompetencyId;
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	category: string | null;
	scaleCode: CompetencyScaleCode;
	status: CompetencyStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CompetencyListPage = {
	competencies: Competency[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type JobCompetency = {
	id: HumanResourcesJobCompetencyId;
	organizationId: string;
	jobId: HumanResourcesJobId;
	competencyId: HumanResourcesCompetencyId;
	requiredLevel: number;
	status: JobCompetencyStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type JobCompetencyListPage = {
	jobCompetencies: JobCompetency[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type CompetencyAssessment = {
	id: HumanResourcesCompetencyAssessmentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	competencyId: HumanResourcesCompetencyId;
	assessorUserId: string;
	evidenceSource: string;
	scaleCode: CompetencyScaleCode;
	level: number;
	effectiveOn: string;
	status: CompetencyAssessmentStatus;
	supersedesAssessmentId: HumanResourcesCompetencyAssessmentId | null;
	supersededByAssessmentId: HumanResourcesCompetencyAssessmentId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeCompetencyProfile = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	assessments: CompetencyAssessment[];
};

export type TalentProfile = {
	id: HumanResourcesTalentProfileId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	summary: string | null;
	currentClassification: string | null;
	status: TalentProfileStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TalentProfileAssessment = {
	id: HumanResourcesTalentProfileAssessmentId;
	organizationId: string;
	talentProfileId: HumanResourcesTalentProfileId;
	methodCode: TalentProfileAssessmentMethodCode;
	classification: string;
	evidenceSummary: string;
	assessorUserId: string;
	status: TalentProfileAssessmentStatus;
	confirmedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TalentPool = {
	id: HumanResourcesTalentPoolId;
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	status: TalentPoolStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TalentPoolMember = {
	id: HumanResourcesTalentPoolMemberId;
	organizationId: string;
	poolId: HumanResourcesTalentPoolId;
	employeeId: HumanResourcesEmployeeId;
	nominatorUserId: string;
	status: TalentPoolMemberStatus;
	nominatedAt: Date;
	approvedAt: Date | null;
	removedAt: Date | null;
	approverUserId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TalentPoolMemberListPage = {
	members: TalentPoolMember[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type CareerPlan = {
	id: HumanResourcesCareerPlanId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	ownerUserId: string;
	code: string;
	title: string;
	status: CareerPlanStatus;
	acknowledgedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CareerPlanAction = {
	id: HumanResourcesCareerPlanActionId;
	organizationId: string;
	careerPlanId: HumanResourcesCareerPlanId;
	title: string;
	dueOn: string | null;
	status: CareerPlanActionStatus;
	learningAssignmentId: HumanResourcesLearningAssignmentId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CareerPlanWithActions = CareerPlan & {
	actions: CareerPlanAction[];
};

export type CareerPlanListPage = {
	careerPlans: CareerPlan[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type SuccessionPlan = {
	id: HumanResourcesSuccessionPlanId;
	organizationId: string;
	code: string;
	title: string;
	positionId: HumanResourcesPositionId;
	status: SuccessionPlanStatus;
	allowsExternalCandidates: boolean;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type SuccessionPlanListPage = {
	successionPlans: SuccessionPlan[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type SuccessionCandidate = {
	id: HumanResourcesSuccessionCandidateId;
	organizationId: string;
	successionPlanId: HumanResourcesSuccessionPlanId;
	employeeId: HumanResourcesEmployeeId | null;
	externalCandidateRef: string | null;
	nominatorUserId: string;
	readiness: SuccessionReadinessCode;
	readinessEffectiveOn: string;
	evidenceSummary: string;
	status: SuccessionCandidateStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type SuccessionCandidateListPage = {
	candidates: SuccessionCandidate[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PositionSuccessionCoverage = {
	organizationId: string;
	positionId: HumanResourcesPositionId;
	successionPlans: SuccessionPlan[];
	readyNowCandidateCount: number;
	readySoonCandidateCount: number;
	totalActiveCandidateCount: number;
};

export type IdempotentCompetencyRecord = {
	competency: Competency;
	createRequestFingerprint: string;
};

export type IdempotentCompetencyAssessmentRecord = {
	assessment: CompetencyAssessment;
	createRequestFingerprint: string;
};

export type IdempotentTalentProfileRecord = {
	profile: TalentProfile;
	createRequestFingerprint: string;
};

export type IdempotentTalentPoolRecord = {
	pool: TalentPool;
	createRequestFingerprint: string;
};

export type IdempotentTalentPoolMemberRecord = {
	member: TalentPoolMember;
	createRequestFingerprint: string;
};

export type IdempotentCareerPlanRecord = {
	careerPlan: CareerPlan;
	createRequestFingerprint: string;
};

export type IdempotentSuccessionPlanRecord = {
	successionPlan: SuccessionPlan;
	createRequestFingerprint: string;
};

export type IdempotentSuccessionCandidateRecord = {
	candidate: SuccessionCandidate;
	createRequestFingerprint: string;
};

// Time Management Types
export type WorkWeekDayPatternJson = {
	dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	isWorkingDay: boolean;
	standardStartTime: string | null;
	standardEndTime: string | null;
	standardMinutes: number | null;
};

export type WorkCalendarDateOverrideKind =
	| "holiday"
	| "half_day"
	| "shortened_day"
	| "replacement_workday"
	| "closure";

export type WorkCalendar = {
	id: HumanResourcesWorkCalendarId;
	organizationId: string;
	code: string;
	name: string;
	timezone: string;
	calendarVersion: string;
	workWeek: readonly WorkWeekDayPatternJson[];
	standardHoursPerDay: string;
	status: "active" | "superseded" | "archived";
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesCalendarId: HumanResourcesWorkCalendarId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkCalendarHolidayRecord = {
	id: HumanResourcesWorkCalendarHolidayId;
	organizationId: string;
	calendarId: HumanResourcesWorkCalendarId;
	holidayDate: string;
	label: string | null;
	locationCode: string | null;
	jurisdiction: string | null;
	overrideKind: WorkCalendarDateOverrideKind;
	isWorkingDay: boolean;
	expectedMinutes: number | null;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmploymentCalendarAssignment = {
	id: HumanResourcesEmploymentCalendarAssignmentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	calendarId: HumanResourcesWorkCalendarId;
	effectiveFrom: string;
	effectiveTo: string | null;
	locationCode: string | null;
	jurisdiction: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkCalendarScopeType =
	| "employment"
	| "employee"
	| "location"
	| "department"
	| "legal_entity"
	| "organization";

export type WorkCalendarScopeAssignment = {
	id: HumanResourcesWorkCalendarScopeAssignmentId;
	organizationId: string;
	scopeType: WorkCalendarScopeType;
	scopeKey: string;
	calendarId: HumanResourcesWorkCalendarId;
	effectiveFrom: string;
	effectiveTo: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ShiftKind =
	| "fixed"
	| "flexible"
	| "split"
	| "rest_day"
	| "public_holiday";

export type TimeApprovalAuthority =
	| "line_manager"
	| "department"
	| "hr"
	| "payroll";
export type TimePolicyStatus = "draft" | "active" | "superseded" | "archived";

export type TimePolicy = {
	id: HumanResourcesTimePolicyId;
	organizationId: string;
	code: string;
	name: string;
	status: TimePolicyStatus;
	effectiveFrom: string;
	effectiveTo: string | null;
	minimumRestMinutes: number;
	automaticBreakAfterMinutes: number | null;
	automaticBreakMinutes: number;
	approvalSteps: readonly TimeApprovalAuthority[];
	supersedesPolicyId: HumanResourcesTimePolicyId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TimePolicyAssignment = {
	id: HumanResourcesTimePolicyAssignmentId;
	organizationId: string;
	policyId: HumanResourcesTimePolicyId;
	employmentId: HumanResourcesEmploymentId;
	effectiveFrom: string;
	effectiveTo: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TimeApprovalAuthorityAssignment = {
	id: HumanResourcesTimeApprovalAuthorityAssignmentId;
	organizationId: string;
	actorUserId: string;
	authority: TimeApprovalAuthority;
	effectiveFrom: string;
	effectiveTo: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ShiftStatus = "draft" | "active" | "superseded" | "inactive";

export type Shift = {
	id: HumanResourcesShiftId;
	organizationId: string;
	code: string;
	name: string;
	shiftKind: ShiftKind;
	startLocal: string;
	endLocal: string;
	isOvernight: boolean;
	expectedMinutes: number;
	graceEarlyMinutes: number;
	graceLateMinutes: number;
	minDurationMinutes: number | null;
	maxDurationMinutes: number | null;
	earliestClockInLocal: string | null;
	latestClockOutLocal: string | null;
	overtimeEligible: boolean;
	timezone: string | null;
	locationKey: string | null;
	status: ShiftStatus;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesShiftId: HumanResourcesShiftId | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ShiftBreak = {
	id: HumanResourcesShiftBreakId;
	organizationId: string;
	shiftId: HumanResourcesShiftId;
	breakOrder: number;
	startOffsetMinutes: number | null;
	durationMinutes: number;
	isPaid: boolean;
	label: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type ShiftAssignmentPublicationStatus =
	| "planned"
	| "published"
	| "changed"
	| "cancelled"
	| "completed";

export type ShiftAssignment = {
	id: HumanResourcesShiftAssignmentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	shiftId: HumanResourcesShiftId;
	scheduledDate: string;
	startsAt: Date;
	endsAt: Date;
	locationKey: string | null;
	timezone: string;
	publicationStatus: ShiftAssignmentPublicationStatus;
	assignmentSource: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ShiftAssignmentSegment = {
	id: HumanResourcesShiftAssignmentSegmentId;
	organizationId: string;
	assignmentId: HumanResourcesShiftAssignmentId;
	segmentOrder: number;
	startsAt: Date;
	endsAt: Date;
	createdAt: Date;
	updatedAt: Date;
};

export type AttendanceEventType =
	| "clock_in"
	| "clock_out"
	| "break_start"
	| "break_end"
	| "manual_adjustment";

export type AttendanceEventSource =
	| "self"
	| "supervisor"
	| "import"
	| "system"
	| "manual";

export type AttendanceEvent = {
	id: HumanResourcesAttendanceEventId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
	eventType: AttendanceEventType;
	capturedOccurredAt: Date | null;
	occurredAt: Date;
	sourceTimezone: string;
	localWorkDate: string;
	source: AttendanceEventSource;
	sourceReference: string | null;
	locationKey: string | null;
	deviceMetadata: Record<string, unknown> | null;
	payloadChecksum: string | null;
	capturedNotes: string | null;
	notes: string | null;
	voidedAt: Date | null;
	voidReason: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type AttendanceAdjustment = {
	id: HumanResourcesAttendanceAdjustmentId;
	organizationId: string;
	eventId: HumanResourcesAttendanceEventId;
	sequence: number | null;
	eventVersionBefore: number | null;
	eventVersionAfter: number | null;
	previousOccurredAt: Date;
	newOccurredAt: Date;
	previousNotes: string | null;
	newNotes: string | null;
	adjustmentReason: string;
	evidenceReference: string | null;
	actorUserId: string;
	correlationId: string | null;
	createdAt: Date;
};

export type AttendanceImportBatchStatus = "completed" | "partial" | "failed";

export type AttendanceImportAcceptedRow = {
	rowIndex: number;
	sourceReference: string;
	eventId: HumanResourcesAttendanceEventId;
};

export type AttendanceImportSkippedRow = {
	rowIndex: number;
	sourceReference: string;
	eventId: HumanResourcesAttendanceEventId;
	reason: "already_imported";
};

export type AttendanceImportRejectedRow = {
	rowIndex: number;
	sourceReference: string | null;
	errorCode: string;
	errorMessage: string;
};

export type AttendanceImportResult = {
	importBatchId: string;
	batchId: string;
	sourceKey: string;
	status: AttendanceImportBatchStatus;
	accepted: readonly AttendanceImportAcceptedRow[];
	skipped: readonly AttendanceImportSkippedRow[];
	rejected: readonly AttendanceImportRejectedRow[];
	totals: {
		accepted: number;
		skipped: number;
		rejected: number;
	};
	nextCursor?: string;
};

export type IdempotentAttendanceImportBatchRecord = {
	result: AttendanceImportResult;
	createRequestFingerprint: string;
};

export type AttendanceSessionResolutionStatus =
	| "incomplete"
	| "resolved"
	| "needs_review"
	| "voided";

export type AttendanceSession = {
	id: HumanResourcesAttendanceSessionId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
	localWorkDate: string;
	timezone: string;
	firstClockInAt: Date | null;
	finalClockOutAt: Date | null;
	breakMinutes: number;
	workedMinutes: number;
	grossMinutes: number;
	provenance: {
		automaticBreak: {
			policyId: HumanResourcesTimePolicyId;
			minutes: number;
			applied: boolean;
		} | null;
		breakIntervals?: readonly {
			startedAt: string;
			endedAt: string;
		}[];
	};
	resolutionStatus: AttendanceSessionResolutionStatus;
	requiresReview: boolean;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type AttendanceBreakWaiverDecision = {
	id: HumanResourcesAttendanceBreakWaiverDecisionId;
	organizationId: string;
	sessionId: HumanResourcesAttendanceSessionId;
	policyId: HumanResourcesTimePolicyId;
	authorityAssignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
	authority: TimeApprovalAuthority;
	actorUserId: string;
	reason: string;
	evidenceReference: string;
	automaticBreakMinutes: number;
	recordedBreakMinutes: number;
	sessionVersion: number;
	correlationId: string;
	decidedAt: Date;
	createdAt: Date;
};

export type AttendanceRecord = AttendanceSession;

export type AttendanceExceptionType =
	| "late_arrival"
	| "early_departure"
	| "absence"
	| "missing_clock_in"
	| "missing_clock_out"
	| "unplanned_attendance"
	| "overlapping_attendance"
	| "excessive_break"
	| "insufficient_rest"
	| "schedule_mismatch"
	| "location_mismatch"
	| "overtime_candidate";

export type AttendanceException = {
	id: HumanResourcesAttendanceExceptionId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	sessionId: HumanResourcesAttendanceSessionId | null;
	eventId: HumanResourcesAttendanceEventId | null;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
	exceptionType: AttendanceExceptionType;
	severity: "info" | "warning" | "critical";
	reviewStatus: "open" | "in_review" | "excused" | "rejected" | "resolved";
	resolution: string | null;
	reviewerUserId: string | null;
	evidenceReference: string | null;
	remarks: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type DailyAttendanceSummary = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	localWorkDate: string;
	timezone: string;
	scheduledAssignment: ShiftAssignment | null;
	session: AttendanceSession | null;
	events: AttendanceEvent[];
	unresolvedExceptions: AttendanceException[];
	workedMinutes: number;
	breakMinutes: number;
};

export type TimesheetTotals = {
	timesheetId: HumanResourcesTimesheetId;
	totalRecordedMinutes: number;
	totalApprovedMinutes: number;
	entryCount: number;
};

export type TimesheetStatus =
	| "draft"
	| "submitted"
	| "returned"
	| "approved"
	| "rejected"
	| "locked"
	| "superseded";

export type Timesheet = {
	id: HumanResourcesTimesheetId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	periodStart: string;
	periodEnd: string;
	status: TimesheetStatus;
	totalRecordedMinutes: number;
	totalApprovedMinutes: number;
	submittedAt: Date | null;
	submissionReference: string | null;
	approvalPolicyId: HumanResourcesTimePolicyId | null;
	requiredApprovalSteps: readonly TimeApprovalAuthority[];
	completedApprovalSteps: number;
	approvedAt: Date | null;
	approvedBy: string | null;
	approverNotes: string | null;
	rejectionReason: string | null;
	lockedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type TimesheetApprovalDecision = {
	id: HumanResourcesTimesheetApprovalDecisionId;
	organizationId: string;
	timesheetId: HumanResourcesTimesheetId;
	submissionReference: string;
	policyId: HumanResourcesTimePolicyId | null;
	authorityAssignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
	stepIndex: number;
	authority: TimeApprovalAuthority;
	actorUserId: string;
	comment: string | null;
	versionApproved: number;
	correlationId: string;
	decidedAt: Date;
	createdAt: Date;
};

export type TimesheetEntrySourceType =
	| "attendance"
	| "schedule"
	| "manual"
	| "leave"
	| "external";

export type TimesheetEntryTimeType =
	| "regular"
	| "overtime"
	| "rest_day"
	| "public_holiday"
	| "night"
	| "call_back"
	| "training"
	| "travel"
	| "standby"
	| "unpaid";

export type TimesheetEntry = {
	id: HumanResourcesTimesheetEntryId;
	organizationId: string;
	timesheetId: HumanResourcesTimesheetId;
	employeeId: HumanResourcesEmployeeId;
	workDate: string;
	timezone: string;
	sourceType: TimesheetEntrySourceType;
	sourceReference: string | null;
	timeType: TimesheetEntryTimeType;
	startedAt: Date | null;
	endedAt: Date | null;
	recordedMinutes: number;
	approvedMinutes: number;
	costCenterId: string | null;
	projectId: string | null;
	locationId: string | null;
	departmentId: string | null;
	approvalReference: string | null;
	evidenceReference: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type OvertimeType =
	| "weekday_overtime"
	| "rest_day_overtime"
	| "public_holiday_overtime"
	| "night_overtime"
	| "call_back"
	| "emergency_overtime";

export type OvertimeRequestStatus =
	| "requested"
	| "approved"
	| "rejected"
	| "worked"
	| "verified"
	| "cancelled";

export type OvertimeRequest = {
	id: HumanResourcesOvertimeRequestId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	overtimeType: OvertimeType;
	requestedStartsAt: Date;
	requestedEndsAt: Date;
	requestedMinutes: number;
	approvedMaximumMinutes: number | null;
	actualMinutes: number | null;
	payrollApprovedMinutes: number | null;
	reason: string;
	evidenceReference: string | null;
	status: OvertimeRequestStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ApprovedTimeHandoff = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	periodStart: string;
	periodEnd: string;
	regularMinutes: number;
	overtime: readonly { type: OvertimeType; minutes: number }[];
	publicHolidayMinutes: number;
	restDayMinutes: number;
	nightMinutes: number;
	unpaidMinutes: number;
	paidLeaveMinutes: number;
	unpaidLeaveMinutes: number;
	timesheetId: HumanResourcesTimesheetId;
	timesheetVersion: number;
	approvedAt: string;
	approvalReference: string;
};

export type IdempotentShiftRecord = {
	shift: Shift;
	createRequestFingerprint: string;
};

export type IdempotentAttendanceEventRecord = {
	event: AttendanceEvent;
	createRequestFingerprint: string;
};

export type IdempotentAttendanceSessionRecord = {
	session: AttendanceSession;
	createRequestFingerprint: string;
};

export type IdempotentAttendanceRecordRecord =
	IdempotentAttendanceSessionRecord;

export type IdempotentTimesheetRecord = {
	timesheet: Timesheet;
	createRequestFingerprint: string;
};

export type IdempotentOvertimeRequestRecord = {
	request: OvertimeRequest;
	createRequestFingerprint: string;
};

export type IdempotentShiftAssignmentRecord = {
	assignment: ShiftAssignment;
	createRequestFingerprint: string;
};

export type IdempotentWorkCalendarRecord = {
	calendar: WorkCalendar;
	createRequestFingerprint: string;
};

export type ShiftCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	shiftKind: ShiftKind;
	startLocal: string;
	endLocal: string;
	isOvernight: boolean;
	expectedMinutes: number;
	graceEarlyMinutes: number;
	graceLateMinutes: number;
	minDurationMinutes: number | null;
	maxDurationMinutes: number | null;
	earliestClockInLocal: string | null;
	latestClockOutLocal: string | null;
	overtimeEligible: boolean;
	timezone: string | null;
	locationKey: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};

export type AttendanceEventRecordInput = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null;
	shiftAssignmentId?: HumanResourcesShiftAssignmentId | null;
	eventType: AttendanceEventType;
	occurredAt: Date;
	sourceTimezone: string;
	localWorkDate: string;
	source: AttendanceEventSource;
	sourceReference?: string | null;
	locationKey?: string | null;
	deviceMetadata?: Record<string, unknown> | null;
	payloadChecksum?: string | null;
	notes?: string | null;
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};

export type AttendanceImportEventRowInput = {
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null;
	shiftAssignmentId?: HumanResourcesShiftAssignmentId | null;
	eventType: AttendanceEventType;
	occurredAt: Date;
	sourceTimezone: string;
	localWorkDate: string;
	sourceReference: string;
	locationKey?: string | null;
	deviceMetadata?: Record<string, unknown> | null;
	payloadChecksum?: string | null;
	notes?: string | null;
};

export type AttendanceImportBatchInput = {
	organizationId: string;
	batchId: string;
	sourceKey: string;
	events: readonly AttendanceImportEventRowInput[];
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId?: string;
	nextCursor?: string;
};

export type AttendanceSessionResolveInput = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	localWorkDate: string;
	timezone: string;
	automaticBreakPolicy: {
		policyId: HumanResourcesTimePolicyId;
		afterMinutes: number;
		deductionMinutes: number;
	} | null;
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};

export type AttendanceRecordGenerateInput = AttendanceSessionResolveInput;

export type TimesheetCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null;
	periodStart: string;
	periodEnd: string;
	idempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
};
