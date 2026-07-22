import type { Result } from "@afenda/errors/result";

import type {
	HumanResourcesApplicationId,
	HumanResourcesAssignmentId,
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
	HumanResourcesEmployeeCaseActionId,
	HumanResourcesEmployeeCaseAppealId,
	HumanResourcesEmployeeCaseEventId,
	HumanResourcesEmployeeCaseId,
	HumanResourcesEmployeeCompensationId,
	HumanResourcesEmployeeDocumentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentConfirmationId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesGoalId,
	HumanResourcesHeadcountPlanId,
	HumanResourcesHeadcountPlanLineId,
	HumanResourcesHeadcountReservationId,
	HumanResourcesImprovementPlanId,
	HumanResourcesInterviewId,
	HumanResourcesJobCompetencyId,
	HumanResourcesJobId,
	HumanResourcesLearningAssignmentId,
	HumanResourcesLeaveAdjustmentId,
	HumanResourcesLeaveEntitlementId,
	HumanResourcesLeavePolicyId,
	HumanResourcesLeaveRequestId,
	HumanResourcesOffboardingCaseId,
	HumanResourcesOffboardingTaskId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesOnboardingTaskId,
	HumanResourcesPerformanceCycleId,
	HumanResourcesPerformanceCycleParticipantId,
	HumanResourcesPolicyAcknowledgementId,
	HumanResourcesPositionId,
	HumanResourcesProbationReviewId,
	HumanResourcesReportingLineId,
	HumanResourcesRequisitionId,
	HumanResourcesReviewId,
	HumanResourcesSalaryBandId,
	HumanResourcesSessionId,
	HumanResourcesSuccessionCandidateId,
	HumanResourcesSuccessionPlanId,
	HumanResourcesTalentPoolId,
	HumanResourcesTalentPoolMemberId,
	HumanResourcesTalentProfileAssessmentId,
	HumanResourcesTalentProfileId,
	HumanResourcesTerminationId,
	HumanResourcesWorkEligibilityId,
} from "./brands";
import type {
	EmployeeCase,
	EmployeeCaseAction,
	EmployeeCaseAppeal,
	EmployeeCaseEvent,
	EmployeeCaseListPage,
	EmployeeCaseOutcome,
	EmployeeCaseTimeline,
} from "./employee-relations/types";
import type { MutationPorts } from "./ports";
import type {
	BenefitPlanStatus,
	CompensationGradeStatus,
	SalaryBandStatus,
} from "./shared/compensation-status";
import type {
	DocumentRequirementStatus,
	EmployeeDocumentVerificationStatus,
	PolicyAcknowledgementStatus,
	WorkEligibilityStatus,
} from "./shared/compliance-status";
import type {
	EmployeeCaseActionType,
	EmployeeCaseEventKind,
	EmployeeCaseParticipantRole,
	EmployeeCaseSeverity,
	EmployeeCaseStatus,
	EmployeeCaseType,
} from "./shared/employee-relations-status";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
} from "./shared/employment-status";
import type {
	AssignmentStatus,
	CertificationStatus,
	CompletionOutcome,
	CourseStatus,
	SessionStatus,
} from "./shared/learning-status";
import type {
	ApprovalDecision,
	DayPortion,
	LeaveAdjustmentKind,
	LeavePolicyStatus,
	LeaveRequestStatus,
	LeaveType,
	LeaveUnit,
} from "./shared/leave-status";
import type {
	LifecycleTaskStatus,
	ProbationOutcome,
} from "./shared/lifecycle-status";
import type { PerformanceRatingScale } from "./shared/performance-rating";
import type {
	PerformanceCycleStatus,
	PerformanceGoalStatus,
	PerformanceWeightingModel,
} from "./shared/performance-status";
import type {
	ApplicationStatus,
	CandidateStatus,
	InterviewEvaluationResult,
	OfferStatus,
	RequisitionStatus,
} from "./shared/recruitment-status";
import type {
	CareerPlanStatus,
	CompetencyScaleCode,
	CompetencyStatus,
	SuccessionCandidateStatus,
	SuccessionPlanStatus,
	SuccessionReadinessCode,
	TalentPoolMemberStatus,
	TalentProfileAssessmentMethodCode,
} from "./shared/talent-status";
import type {
	HeadcountEmploymentType,
	HeadcountPlanStatus,
	HeadcountReservationStatus,
} from "./shared/workforce-planning-status";
import type {
	ApplicationListPage,
	ApprovedCompensationHandoff,
	ApprovedLeaveHandoff,
	BenefitEnrollment,
	BenefitEnrollmentListPage,
	BenefitPlan,
	BenefitPlanListPage,
	Candidate,
	CandidateApplication,
	CandidateListPage,
	CareerPlan,
	CareerPlanAction,
	CareerPlanListPage,
	CareerPlanWithActions,
	CertificationListPage,
	Clearance,
	CompensationGrade,
	CompensationGradeListPage,
	CompensationReview,
	CompensationReviewListPage,
	Competency,
	CompetencyAssessment,
	CompetencyListPage,
	CompletionListPage,
	CourseListPage,
	Department,
	DocumentRequirement,
	DocumentRequirementListPage,
	Employee,
	EmployeeCertification,
	EmployeeCompensation,
	EmployeeCompensationListPage,
	EmployeeCompetencyProfile,
	EmployeeComplianceSummary,
	EmployeeDocument,
	EmployeeDocumentListPage,
	EmployeeListPage,
	EmployeePerformanceHistory,
	Employment,
	EmploymentConfirmation,
	EmploymentContract,
	EmploymentMovement,
	EmploymentOffer,
	HeadcountAvailability,
	HeadcountPlan,
	HeadcountPlanLine,
	HeadcountPlanListPage,
	HeadcountReservation,
	HeadcountReservationListPage,
	IdempotentCareerPlanRecord,
	IdempotentCompetencyAssessmentRecord,
	IdempotentCompetencyRecord,
	IdempotentEmployeeDocumentRecord,
	IdempotentPolicyAcknowledgementRecord,
	IdempotentSuccessionCandidateRecord,
	IdempotentSuccessionPlanRecord,
	IdempotentTalentPoolMemberRecord,
	IdempotentTalentPoolRecord,
	IdempotentTalentProfileRecord,
	IdempotentWorkEligibilityRecord,
	Interview,
	InterviewEvaluation,
	InterviewListPage,
	Job,
	JobCompetency,
	JobCompetencyListPage,
	JobRequisition,
	LearningAssignment,
	LearningAssignmentListPage,
	LearningCompletion,
	LearningCourse,
	LearningSession,
	LeaveAdjustment,
	LeaveBalance,
	LeaveEntitlement,
	LeaveEntitlementListPage,
	LeavePolicy,
	LeavePolicyEligibility,
	LeavePolicyListPage,
	LeaveRequest,
	LeaveRequestListPage,
	LeaveRequestSegment,
	OffboardingCase,
	OffboardingTask,
	OfferAcceptanceHandoff,
	OfferListPage,
	OnboardingCase,
	OnboardingTask,
	OrganizationTreePage,
	PerformanceCycle,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementPlan,
	PerformanceImprovementPlanListPage,
	PerformanceReview,
	PerformanceReviewDetail,
	PerformanceReviewListPage,
	PolicyAcknowledgement,
	PolicyAcknowledgementListPage,
	Position,
	PositionSuccessionCoverage,
	ProbationReview,
	RecruitmentHeadcountHandoff,
	ReportingLine,
	RequisitionListPage,
	ResolvedLeavePolicy,
	SalaryBand,
	SalaryBandListPage,
	SessionListPage,
	SuccessionCandidate,
	SuccessionCandidateListPage,
	SuccessionPlan,
	SuccessionPlanListPage,
	TalentPool,
	TalentPoolMember,
	TalentPoolMemberListPage,
	TalentProfile,
	TalentProfileAssessment,
	TeamCalendarLeavePage,
	Termination,
	WorkAssignment,
	WorkEligibility,
	WorkEligibilityRiskListPage,
	WorkforcePlanVariance,
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

export type OnboardingTaskSeed = {
	code: string;
	title: string;
	mandatory: boolean;
};

export type OnboardingCaseCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	sourceOfferId: HumanResourcesOfferId | null;
	tasks: OnboardingTaskSeed[];
	idempotencyKey: string;
	startRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentOnboardingCaseRecord = {
	onboardingCase: OnboardingCase;
	startRequestFingerprint: string;
};

export type ProbationReviewCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	startsOn: string;
	endsOn: string;
	idempotencyKey: string;
	openRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentProbationReviewRecord = {
	probationReview: ProbationReview;
	openRequestFingerprint: string;
};

export type EmploymentConfirmationCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	confirmedOn: string;
	evidenceNote: string;
	idempotencyKey: string;
	confirmRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentEmploymentConfirmationRecord = {
	employmentConfirmation: EmploymentConfirmation;
	confirmRequestFingerprint: string;
};

export type TerminationCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	reasonCode: string;
	reasonDetail: string;
	effectiveOn: string;
	idempotencyKey: string;
	terminationRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentTerminationRecord = {
	termination: Termination;
	terminationRequestFingerprint: string;
};

export type EmploymentMovementCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	fromAssignmentId: HumanResourcesAssignmentId;
	toAssignmentId: HumanResourcesAssignmentId;
	kind: "transfer";
	effectiveOn: string;
	reason: string;
	idempotencyKey: string;
	transferRequestFingerprint: string;
	actorUserId: string;
};

export type IdempotentEmploymentMovementRecord = {
	employmentMovement: EmploymentMovement;
	transferRequestFingerprint: string;
};

export type OffboardingCaseCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	terminationId: HumanResourcesTerminationId | null;
	tasks: OnboardingTaskSeed[];
	idempotencyKey: string;
	startRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentOffboardingCaseRecord = {
	offboardingCase: OffboardingCase;
	startRequestFingerprint: string;
};

export type CourseCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	description: string | null;
	durationHours: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentCourseRecord = {
	course: LearningCourse;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type SessionCreateRecord = {
	organizationId: string;
	courseId: HumanResourcesCourseId;
	code: string;
	title: string;
	scheduledStartsAt: Date;
	scheduledEndsAt: Date;
	capacity: number | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentSessionRecord = {
	session: LearningSession;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type LearningAssignmentCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	courseId: HumanResourcesCourseId;
	sessionId: HumanResourcesSessionId | null;
	assignedBy: string;
	assignedAt: Date;
	dueOn: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentLearningAssignmentRecord = {
	assignment: LearningAssignment;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type CompletionCreateRecord = {
	organizationId: string;
	assignmentId: HumanResourcesLearningAssignmentId;
	employeeId: HumanResourcesEmployeeId;
	courseId: HumanResourcesCourseId;
	sessionId: HumanResourcesSessionId | null;
	completedAt: Date;
	outcome: string;
	assessorUserId: string | null;
	notes: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentCompletionRecord = {
	completion: LearningCompletion;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type IdempotentCertificationRecord = {
	certification: EmployeeCertification;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
};

export type LeavePolicyCreateRecord = {
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
	minTenureDays: number | null;
	allowedEmploymentStatuses: EmploymentStatus[];
	createdBy: string;
};

export type LeaveEntitlementGrantRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	policyId: HumanResourcesLeavePolicyId;
	periodStart: string;
	periodEnd: string;
	openingQuantity: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentLeaveEntitlementRecord = {
	entitlement: LeaveEntitlement;
	createRequestFingerprint: string;
};

export type LeaveAdjustmentCreateRecord = {
	organizationId: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	sourceRequestId: HumanResourcesLeaveRequestId | null;
	kind: LeaveAdjustmentKind;
	delta: string;
	reason: string;
	source: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type LeaveRequestCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	entitlementId: HumanResourcesLeaveEntitlementId;
	policyId: HumanResourcesLeavePolicyId;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	unit: LeaveUnit;
	isBackdated: boolean;
	backdateJustification: string | null;
	segments: Array<{
		segmentDate: string;
		quantity: string;
		dayPortion: DayPortion;
	}>;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type LeaveRequestAmendRecord = {
	organizationId: string;
	requestId: HumanResourcesLeaveRequestId;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	isBackdated: boolean;
	backdateJustification: string | null;
	segments: Array<{
		segmentDate: string;
		quantity: string;
		dayPortion: DayPortion;
	}>;
	expectedVersion: number;
	actorUserId: string;
};

export type IdempotentLeaveRequestRecord = {
	request: LeaveRequest;
	createRequestFingerprint: string;
};

export type PerformanceCycleCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	ratingScale: PerformanceRatingScale;
	weightingModel: PerformanceWeightingModel;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentPerformanceCycleRecord = {
	cycle: PerformanceCycle;
	createRequestFingerprint: string;
};

export type PerformanceGoalCreateRecord = {
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
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentPerformanceGoalRecord = {
	goal: PerformanceGoal;
	createRequestFingerprint: string;
};

export type ImprovementPlanCreateRecord = {
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
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentImprovementPlanRecord = {
	plan: PerformanceImprovementPlan;
	createRequestFingerprint: string;
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

	// Onboarding
	getOnboardingCase(input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}): Promise<Result<OnboardingCase | null>>;

	findOnboardingByStartIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOnboardingCaseRecord | null>>;

	startOnboarding(
		record: OnboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>>;

	completeOnboardingTask(
		input: {
			organizationId: string;
			taskId: HumanResourcesOnboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>>;

	completeOnboarding(
		input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>>;

	listOnboardingTasks(input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}): Promise<Result<OnboardingTask[]>>;

	// Probation
	getProbationReview(input: {
		organizationId: string;
		probationReviewId: HumanResourcesProbationReviewId;
	}): Promise<Result<ProbationReview | null>>;

	findProbationByOpenIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentProbationReviewRecord | null>>;

	openProbation(
		record: ProbationReviewCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>>;

	extendProbation(
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			newEndsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>>;

	recordProbationOutcome(
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			outcome: ProbationOutcome;
			concludedOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>>;

	// Employment Confirmation
	getEmploymentConfirmation(input: {
		organizationId: string;
		employmentConfirmationId: HumanResourcesEmploymentConfirmationId;
	}): Promise<Result<EmploymentConfirmation | null>>;

	findConfirmationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmploymentConfirmationRecord | null>>;

	confirmEmployment(
		record: EmploymentConfirmationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentConfirmation>>;

	// Transfer
	findTransferByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmploymentMovementRecord | null>>;

	transferAssignment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			toPositionId: HumanResourcesPositionId;
			effectiveOn: string;
			reason: string;
			idempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentMovement>>;

	// Termination
	getTermination(input: {
		organizationId: string;
		terminationId: HumanResourcesTerminationId;
	}): Promise<Result<Termination | null>>;

	findTerminationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTerminationRecord | null>>;

	finalizeTermination(
		record: TerminationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Termination>>;

	// Offboarding
	getOffboardingCase(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<OffboardingCase | null>>;

	findOffboardingByStartIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOffboardingCaseRecord | null>>;

	startOffboarding(
		record: OffboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	completeOffboardingTask(
		input: {
			organizationId: string;
			taskId: HumanResourcesOffboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	recordExitInterview(
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			conductedOn: string;
			notes: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	recordClearance(
		input: {
			organizationId: string;
			clearanceId: HumanResourcesClearanceId;
			clearedOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	completeOffboarding(
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	listOffboardingTasks(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<OffboardingTask[]>>;

	getClearanceByOffboardingCase(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<Clearance | null>>;

	// Compensation Grade
	getCompensationGrade(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
	}): Promise<Result<CompensationGrade | null>>;

	findCompensationGradeByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<CompensationGrade | null>>;

	createCompensationGrade(
		record: {
			organizationId: string;
			code: string;
			name: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationGrade>>;

	updateCompensationGrade(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			name?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationGrade>>;

	archiveCompensationGrade(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationGrade>>;

	listCompensationGrades(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompensationGradeStatus;
	}): Promise<Result<CompensationGradeListPage>>;

	// Salary Band
	getSalaryBand(input: {
		organizationId: string;
		salaryBandId: HumanResourcesSalaryBandId;
	}): Promise<Result<SalaryBand | null>>;

	createSalaryBand(
		record: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			currencyCode: string;
			minAmount: string;
			midAmount: string;
			maxAmount: string;
			effectiveFrom: string;
			effectiveTo: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalaryBand>>;

	supersedeSalaryBand(
		input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			currencyCode: string;
			minAmount: string;
			midAmount: string;
			maxAmount: string;
			effectiveFrom: string;
			effectiveTo: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalaryBand>>;

	archiveSalaryBand(
		input: {
			organizationId: string;
			salaryBandId: HumanResourcesSalaryBandId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalaryBand>>;

	listSalaryBandsByGrade(input: {
		organizationId: string;
		gradeId: HumanResourcesCompensationGradeId;
		page: number;
		pageSize: number;
		status?: SalaryBandStatus;
	}): Promise<Result<SalaryBandListPage>>;

	// Employee Compensation
	getEmployeeCompensation(input: {
		organizationId: string;
		compensationId: HumanResourcesEmployeeCompensationId;
	}): Promise<Result<EmployeeCompensation | null>>;

	findEmployeeCompensationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<EmployeeCompensation | null>>;

	createEmployeeCompensation(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			gradeId: HumanResourcesCompensationGradeId | null;
			salaryBandId: HumanResourcesSalaryBandId | null;
			baseAmount: string;
			currencyCode: string;
			effectiveFrom: string;
			reason: string;
			sourceReviewId: HumanResourcesCompensationReviewId | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCompensation>>;

	endEmployeeCompensation(
		input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCompensation>>;

	listEmployeeCompensationsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<EmployeeCompensationListPage>>;

	findActiveEmployeeCompensationByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<EmployeeCompensation | null>>;

	// Compensation Review
	getCompensationReview(input: {
		organizationId: string;
		reviewId: HumanResourcesCompensationReviewId;
	}): Promise<Result<CompensationReview | null>>;

	findCompensationReviewByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<CompensationReview | null>>;

	createCompensationReviewDraft(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationReview>>;

	recordCompensationRecommendation(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			proposedBaseAmount: string;
			proposedCurrencyCode: string;
			proposedGradeId: HumanResourcesCompensationGradeId | null;
			proposedSalaryBandId: HumanResourcesSalaryBandId | null;
			recommendationNote: string | null;
			effectiveFrom: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationReview>>;

	finalizeCompensationReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompensationReview>>;

	applyApprovedCompensationResult(
		input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
			reason: string;
			createIdempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCompensation>>;

	listCompensationReviewsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<CompensationReviewListPage>>;

	// Benefit Plan
	getBenefitPlan(input: {
		organizationId: string;
		planId: HumanResourcesBenefitPlanId;
	}): Promise<Result<BenefitPlan | null>>;

	findBenefitPlanByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<BenefitPlan | null>>;

	createBenefitPlan(
		record: {
			organizationId: string;
			code: string;
			name: string;
			eligibilityNote: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>>;

	updateBenefitPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			name?: string;
			eligibilityNote?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>>;

	archiveBenefitPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitPlan>>;

	listBenefitPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: BenefitPlanStatus;
	}): Promise<Result<BenefitPlanListPage>>;

	// Benefit Enrollment
	getBenefitEnrollment(input: {
		organizationId: string;
		enrollmentId: HumanResourcesBenefitEnrollmentId;
	}): Promise<Result<BenefitEnrollment | null>>;

	findBenefitEnrollmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<BenefitEnrollment | null>>;

	enrolBenefit(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			planId: HumanResourcesBenefitPlanId;
			effectiveFrom: string;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitEnrollment>>;

	endBenefitEnrollment(
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitEnrollment>>;

	cancelBenefitEnrollment(
		input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<BenefitEnrollment>>;

	listBenefitEnrollmentsByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<BenefitEnrollmentListPage>>;

	// Approved Compensation Handoff
	getApprovedCompensationHandoff(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ApprovedCompensationHandoff | null>>;

	// Learning Course
	getCourseById(input: {
		organizationId: string;
		courseId: HumanResourcesCourseId;
	}): Promise<Result<LearningCourse | null>>;

	findCourseByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCourseRecord | null>>;

	createCourse(
		record: CourseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCourse>>;

	updateCourse(
		input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
			title?: string;
			description?: string | null;
			durationHours?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCourse>>;

	activateCourse(
		input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCourse>>;

	archiveCourse(
		input: {
			organizationId: string;
			courseId: HumanResourcesCourseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCourse>>;

	listCourses(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CourseStatus;
	}): Promise<Result<CourseListPage>>;

	countActiveAssignmentsForCourse(input: {
		organizationId: string;
		courseId: HumanResourcesCourseId;
	}): Promise<Result<number>>;

	// Learning Session
	getSessionById(input: {
		organizationId: string;
		sessionId: HumanResourcesSessionId;
	}): Promise<Result<LearningSession | null>>;

	findSessionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentSessionRecord | null>>;

	createSession(
		record: SessionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	startSession(
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			actualStartsAt: Date;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	completeSession(
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			actualEndsAt: Date;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	cancelSession(
		input: {
			organizationId: string;
			sessionId: HumanResourcesSessionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningSession>>;

	listSessions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		courseId?: HumanResourcesCourseId;
		status?: SessionStatus;
	}): Promise<Result<SessionListPage>>;

	countEnrolledInSession(input: {
		organizationId: string;
		sessionId: HumanResourcesSessionId;
	}): Promise<Result<number>>;

	// Learning Assignment
	getLearningAssignmentById(input: {
		organizationId: string;
		assignmentId: HumanResourcesLearningAssignmentId;
	}): Promise<Result<LearningAssignment | null>>;

	findLearningAssignmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentLearningAssignmentRecord | null>>;

	createLearningAssignment(
		record: LearningAssignmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningAssignment>>;

	enrollLearningAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
			sessionId?: HumanResourcesSessionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningAssignment>>;

	waiveLearningAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesLearningAssignmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningAssignment>>;

	listLearningAssignments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		courseId?: HumanResourcesCourseId;
		status?: AssignmentStatus;
	}): Promise<Result<LearningAssignmentListPage>>;

	// Learning Completion
	getCompletionById(input: {
		organizationId: string;
		completionId: HumanResourcesCompletionId;
	}): Promise<Result<LearningCompletion | null>>;

	findCompletionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompletionRecord | null>>;

	findCompletionByAssignmentId(input: {
		organizationId: string;
		assignmentId: HumanResourcesLearningAssignmentId;
	}): Promise<Result<LearningCompletion | null>>;

	recordCompletion(
		record: CompletionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LearningCompletion>>;

	listCompletions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		courseId?: HumanResourcesCourseId;
	}): Promise<Result<CompletionListPage>>;

	// Employee Certification
	getCertificationById(input: {
		organizationId: string;
		certificationId: HumanResourcesCertificationId;
	}): Promise<Result<EmployeeCertification | null>>;

	findCertificationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCertificationRecord | null>>;

	issueCertification(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			courseId: HumanResourcesCourseId;
			completionId: HumanResourcesCompletionId;
			certificationCode: string;
			issuedOn: string;
			expiresOn: string | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCertification>>;

	revokeCertification(
		input: {
			organizationId: string;
			certificationId: HumanResourcesCertificationId;
			revokedBy: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCertification>>;

	expireCertification(
		input: {
			organizationId: string;
			certificationId: HumanResourcesCertificationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCertification>>;

	listCertifications(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		courseId?: HumanResourcesCourseId;
		status?: CertificationStatus;
	}): Promise<Result<CertificationListPage>>;

	// Leave Policy
	getLeavePolicyById(input: {
		organizationId: string;
		policyId: HumanResourcesLeavePolicyId;
	}): Promise<Result<LeavePolicy | null>>;

	getLeavePolicyEligibility(input: {
		organizationId: string;
		policyId: HumanResourcesLeavePolicyId;
	}): Promise<Result<LeavePolicyEligibility | null>>;

	resolveApplicableLeavePolicy(input: {
		organizationId: string;
		policyCode: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		asOfDate: string;
	}): Promise<Result<ResolvedLeavePolicy | null>>;

	getPrimaryManagerForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<HumanResourcesEmployeeId | null>>;

	findLeavePolicyByCode(input: {
		organizationId: string;
		code: string;
		effectiveFrom: string;
	}): Promise<Result<LeavePolicy | null>>;

	createLeavePolicy(
		record: LeavePolicyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>>;

	updateLeavePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			name?: string;
			paid?: boolean;
			sensitive?: boolean;
			allowsNegativeBalance?: boolean;
			allowSelfApproval?: boolean;
			allowsPartialDay?: boolean;
			effectiveTo?: string | null;
			minTenureDays?: number | null;
			allowedEmploymentStatuses?: EmploymentStatus[];
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>>;

	publishLeavePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>>;

	supersedeLeavePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
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
			minTenureDays: number | null;
			allowedEmploymentStatuses: EmploymentStatus[];
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>>;

	archiveLeavePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>>;

	listLeavePolicies(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: LeavePolicyStatus;
	}): Promise<Result<LeavePolicyListPage>>;

	// Leave Entitlement
	getLeaveEntitlementById(input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}): Promise<Result<LeaveEntitlement | null>>;

	findLeaveEntitlementByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentLeaveEntitlementRecord | null>>;

	grantLeaveEntitlement(
		record: LeaveEntitlementGrantRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveEntitlement>>;

	carryForwardLeaveEntitlement(
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
			newPeriodStart: string;
			newPeriodEnd: string;
			carriedQuantity: string;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveEntitlement>>;

	expireLeaveEntitlement(
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveEntitlement>>;

	adjustLeaveEntitlement(
		record: LeaveAdjustmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveAdjustment>>;

	listLeaveEntitlements(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		employmentId?: HumanResourcesEmploymentId;
		policyId?: HumanResourcesLeavePolicyId;
	}): Promise<Result<LeaveEntitlementListPage>>;

	listPostedLeaveAdjustments(input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}): Promise<Result<LeaveAdjustment[]>>;

	getLeaveBalance(input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}): Promise<Result<LeaveBalance | null>>;

	// Leave Request
	getLeaveRequestById(input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
	}): Promise<Result<LeaveRequest | null>>;

	findLeaveRequestByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentLeaveRequestRecord | null>>;

	listLeaveRequestSegments(input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
	}): Promise<Result<LeaveRequestSegment[]>>;

	listOverlappingLeaveSegments(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		excludeRequestId?: HumanResourcesLeaveRequestId;
	}): Promise<Result<LeaveRequestSegment[]>>;

	createDraftLeaveRequest(
		record: LeaveRequestCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	amendLeaveRequest(
		record: LeaveRequestAmendRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	submitLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	approveLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	rejectLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	returnLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	withdrawLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	cancelApprovedLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>>;

	listLeaveRequests(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		status?: LeaveRequestStatus;
	}): Promise<Result<LeaveRequestListPage>>;

	listPendingApprovalLeaveRequests(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<LeaveRequestListPage>>;

	listTeamCalendarLeaveRequests(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		rangeStart: string;
		rangeEnd: string;
		page: number;
		pageSize: number;
	}): Promise<Result<TeamCalendarLeavePage>>;

	getApprovedLeaveHandoff(input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
		correlationId: string;
	}): Promise<Result<ApprovedLeaveHandoff | null>>;

	// Document Requirement
	getDocumentRequirementById(input: {
		organizationId: string;
		requirementId: HumanResourcesDocumentRequirementId;
	}): Promise<Result<DocumentRequirement | null>>;

	findDocumentRequirementByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<DocumentRequirement | null>>;

	createDocumentRequirement(
		record: {
			organizationId: string;
			code: string;
			name: string;
			documentType: string;
			issuingJurisdiction: string | null;
			appliesToNote: string | null;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	updateDocumentRequirement(
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			name?: string;
			documentType?: string;
			issuingJurisdiction?: string | null;
			appliesToNote?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	publishDocumentRequirement(
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	retireDocumentRequirement(
		input: {
			organizationId: string;
			requirementId: HumanResourcesDocumentRequirementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<DocumentRequirement>>;

	listPublishedDocumentRequirements(input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}): Promise<Result<DocumentRequirementListPage>>;

	// Employee Document
	getEmployeeDocumentById(input: {
		organizationId: string;
		documentId: HumanResourcesEmployeeDocumentId;
	}): Promise<Result<EmployeeDocument | null>>;

	findEmployeeDocumentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeDocumentRecord | null>>;

	registerEmployeeDocument(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			requirementId: HumanResourcesDocumentRequirementId | null;
			documentType: string;
			issuingJurisdiction: string | null;
			issuedOn: string;
			expiresOn: string | null;
			documentRef: string;
			identifierLast4: string | null;
			identifierFingerprint: string | null;
			metadata: Record<string, unknown> | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	updateEmployeeDocumentMetadata(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			issuingJurisdiction?: string | null;
			expiresOn?: string | null;
			metadata?: Record<string, unknown> | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	verifyEmployeeDocument(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			evidenceDate: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	rejectEmployeeDocument(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			rejectionReason: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	revokeEmployeeDocumentVerification(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	markEmployeeDocumentExpired(
		input: {
			organizationId: string;
			documentId: HumanResourcesEmployeeDocumentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeDocument>>;

	listEmployeeDocuments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		verificationStatus?: EmployeeDocumentVerificationStatus;
	}): Promise<Result<EmployeeDocumentListPage>>;

	listMissingRequiredDocuments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
	}): Promise<Result<DocumentRequirementListPage>>;

	listExpiringEmployeeDocuments(input: {
		organizationId: string;
		asOf: string;
		withinDays: number;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
	}): Promise<Result<EmployeeDocumentListPage>>;

	// Work Eligibility
	getWorkEligibilityById(input: {
		organizationId: string;
		eligibilityId: HumanResourcesWorkEligibilityId;
	}): Promise<Result<WorkEligibility | null>>;

	getActiveWorkEligibilityForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<WorkEligibility | null>>;

	findWorkEligibilityByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentWorkEligibilityRecord | null>>;

	recordWorkEligibility(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			countryCode: string;
			jurisdiction: string | null;
			issuedOn: string;
			expiresOn: string | null;
			documentRef: string | null;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	verifyWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			evidenceDate: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	suspendWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	renewWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			issuedOn: string;
			expiresOn: string | null;
			documentRef: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	closeWorkEligibility(
		input: {
			organizationId: string;
			eligibilityId: HumanResourcesWorkEligibilityId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkEligibility>>;

	listEmployeesWithWorkEligibilityRisk(input: {
		organizationId: string;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<WorkEligibilityRiskListPage>>;

	// Policy Acknowledgement
	getPolicyAcknowledgementById(input: {
		organizationId: string;
		acknowledgementId: HumanResourcesPolicyAcknowledgementId;
	}): Promise<Result<PolicyAcknowledgement | null>>;

	findPolicyAcknowledgementByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPolicyAcknowledgementRecord | null>>;

	issuePolicyAcknowledgementRequirement(
		record: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			policyCode: string;
			policyVersion: string;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	acknowledgePolicy(
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	revokePolicyAcknowledgement(
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	supersedePolicyAcknowledgementRequirement(
		input: {
			organizationId: string;
			acknowledgementId: HumanResourcesPolicyAcknowledgementId;
			newPolicyVersion: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PolicyAcknowledgement>>;

	getPolicyAcknowledgementStatus(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		policyCode: string;
		policyVersion?: string;
	}): Promise<Result<PolicyAcknowledgement | null>>;

	listOutstandingPolicyAcknowledgements(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
	}): Promise<Result<PolicyAcknowledgementListPage>>;

	getEmployeeComplianceSummary(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf?: string;
	}): Promise<Result<EmployeeComplianceSummary>>;

	// Performance Cycle
	getPerformanceCycleById(input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}): Promise<Result<PerformanceCycle | null>>;

	findPerformanceCycleByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPerformanceCycleRecord | null>>;

	createPerformanceCycle(
		record: PerformanceCycleCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	updatePerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			name?: string;
			periodStart?: string;
			periodEnd?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	openPerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	closePerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	cancelPerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	addCycleParticipant(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycleParticipant>>;

	removeCycleParticipant(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			participantId: HumanResourcesPerformanceCycleParticipantId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycleParticipant>>;

	listPerformanceCycles(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: PerformanceCycleStatus;
	}): Promise<Result<PerformanceCycleListPage>>;

	listCycleParticipants(input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}): Promise<Result<PerformanceCycleParticipant[]>>;

	// Performance Goal
	getPerformanceGoalById(input: {
		organizationId: string;
		goalId: HumanResourcesGoalId;
	}): Promise<Result<PerformanceGoal | null>>;

	findPerformanceGoalByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPerformanceGoalRecord | null>>;

	createPerformanceGoal(
		record: PerformanceGoalCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	updatePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			title?: string;
			description?: string | null;
			weight?: string | null;
			periodStart?: string;
			periodEnd?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	submitPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	approvePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	rejectPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	recordGoalProgress(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			progressNote: string;
			progressValue: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoalProgress>>;

	closePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	cancelPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	listEmployeeGoals(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		status?: PerformanceGoalStatus;
	}): Promise<Result<PerformanceGoalListPage>>;

	// Performance Review
	startPerformanceReview(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			managerEmployeeId: HumanResourcesEmployeeId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	submitSelfAssessment(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			rating: string;
			commentsSensitive: string | null;
			actorUserId: string;
			actorEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	submitManagerAssessment(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			rating: string;
			commentsSensitive: string | null;
			actorUserId: string;
			managerEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	returnPerformanceReviewForCorrection(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	acknowledgePerformanceReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			acknowledgementNote: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	finalizePerformanceReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			overallRating: string;
			finalizeIdempotencyKey: string;
			finalizeRequestFingerprint: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	reopenPerformanceReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			reason: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	getPerformanceReviewById(input: {
		organizationId: string;
		reviewId: HumanResourcesReviewId;
		includeConfidential: boolean;
	}): Promise<Result<PerformanceReviewDetail | null>>;

	listEmployeePerformanceReviews(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		includeConfidential: boolean;
	}): Promise<Result<PerformanceReviewListPage>>;

	listReviewsPendingManagerAction(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<PerformanceReviewListPage>>;

	// Performance Improvement Plan
	getImprovementPlanById(input: {
		organizationId: string;
		planId: HumanResourcesImprovementPlanId;
	}): Promise<Result<PerformanceImprovementPlan | null>>;

	findImprovementPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentImprovementPlanRecord | null>>;

	createImprovementPlan(
		record: ImprovementPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	openImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	acknowledgeImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	recordImprovementCheckpoint(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			sequenceNumber: number;
			outcome: "met" | "missed";
			notes: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementCheckpoint>>;

	amendImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			measurableActions?: string;
			supportResources?: string;
			dueDate?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	completeImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	closeImprovementPlanUnsuccessful(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	cancelImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	listActiveImprovementPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}): Promise<Result<PerformanceImprovementPlanListPage>>;

	getEmployeePerformanceHistory(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		includeConfidential: boolean;
	}): Promise<Result<EmployeePerformanceHistory>>;

	// Employee relations
	findEmployeeCaseByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<(IdempotentEmployeeCaseOpenRecord & { case: EmployeeCase }) | null>
	>;

	openEmployeeCase(
		record: EmployeeCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	getEmployeeCaseById(input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}): Promise<Result<EmployeeCase>>;

	listEmployeeCases(input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
		status?: EmployeeCaseStatus;
	}): Promise<Result<EmployeeCaseListPage>>;

	listCasesAssignedToActor(input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
	}): Promise<Result<EmployeeCaseListPage>>;

	listOpenEmployeeRelationsCases(input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
	}): Promise<Result<EmployeeCaseListPage>>;

	getEmployeeRelationsHistoryByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page?: number;
		pageSize?: number;
	}): Promise<Result<EmployeeCaseListPage>>;

	updateEmployeeCaseClassification(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			classificationCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	assignEmployeeCaseOwner(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			ownerActorUserId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	addEmployeeCaseParticipant(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			participantActorUserId: string;
			role: EmployeeCaseParticipantRole;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	recordEmployeeCaseEvent(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			eventKind: EmployeeCaseEventKind;
			payloadJson?: Record<string, unknown> | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseEvent>>;

	addEmployeeCaseEvidenceReference(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			documentRef: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseEvent>>;

	redactEmployeeCaseEvidenceReference(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			eventId: HumanResourcesEmployeeCaseEventId;
			reasonCode: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseEvent>>;

	issueInterimEmployeeMeasure(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			interimAuthority: string;
			interimReason: string;
			interimStartsOn: string;
			interimReviewOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	recordEmployeeCaseFinding(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			findingCode: string;
			findingSummary: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	findEmployeeCaseActionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<
			| (IdempotentEmployeeCaseActionOpenRecord & {
					action: EmployeeCaseAction;
			  })
			| null
		>
	>;

	recommendEmployeeCaseAction(
		record: EmployeeCaseActionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAction>>;

	approveEmployeeCaseAction(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			actionId: HumanResourcesEmployeeCaseActionId;
			policyValidationRecorded: boolean;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAction>>;

	findEmployeeCaseAppealByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<
			| (IdempotentEmployeeCaseAppealOpenRecord & {
					appeal: EmployeeCaseAppeal;
			  })
			| null
		>
	>;

	recordEmployeeCaseAppeal(
		record: EmployeeCaseAppealCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAppeal>>;

	resolveEmployeeCaseAppeal(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			appealId: HumanResourcesEmployeeCaseAppealId;
			appealOutcomeCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAppeal>>;

	closeEmployeeCase(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			outcomeCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	reopenEmployeeCase(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			reasonCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	getEmployeeCaseTimeline(input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}): Promise<Result<EmployeeCaseTimeline>>;

	getEmployeeCaseOutcome(input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}): Promise<Result<EmployeeCaseOutcome>>;

	// Workforce planning — headcount plan
	findHeadcountPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentHeadcountPlanRecord | null>>;

	getHeadcountPlanById(input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}): Promise<Result<HeadcountPlan | null>>;

	findApprovedHeadcountPlanForScope(input: {
		organizationId: string;
		planningScopeKey: string;
		periodStart: string;
		periodEnd: string;
	}): Promise<Result<HeadcountPlan | null>>;

	createHeadcountPlan(
		record: HeadcountPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>>;

	updateHeadcountPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
			title?: string;
			costEnvelopeAmount?: string | null;
			costEnvelopeCurrencyCode?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>>;

	transitionHeadcountPlanStatus(
		input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
			status: HeadcountPlanStatus;
			expectedVersion: number;
			actorUserId: string;
			rejectionReason?: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>>;

	supersedeHeadcountPlan(
		record: HeadcountPlanSupersedeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>>;

	listHeadcountPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: HeadcountPlanStatus;
		planningScopeKey?: string;
	}): Promise<Result<HeadcountPlanListPage>>;

	// Workforce planning — headcount plan line
	getHeadcountPlanLineById(input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}): Promise<Result<HeadcountPlanLine | null>>;

	listHeadcountPlanLinesByPlanId(input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}): Promise<Result<HeadcountPlanLine[]>>;

	addHeadcountPlanLine(
		record: HeadcountPlanLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlanLine>>;

	updateHeadcountPlanLine(
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			departmentId?: HumanResourcesDepartmentId | null;
			jobId?: HumanResourcesJobId | null;
			positionId?: HumanResourcesPositionId | null;
			locationCode?: string | null;
			employmentType?: HeadcountEmploymentType | null;
			plannedFte?: string;
			plannedHeadcount?: number;
			costEnvelopeAmount?: string | null;
			costEnvelopeCurrencyCode?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlanLine>>;

	removeHeadcountPlanLine(
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>>;

	// Workforce planning — headcount reservation
	findHeadcountReservationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentHeadcountReservationRecord | null>>;

	getHeadcountReservationById(input: {
		organizationId: string;
		reservationId: HumanResourcesHeadcountReservationId;
	}): Promise<Result<HeadcountReservation | null>>;

	findActiveHeadcountReservationForRequisition(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<HeadcountReservation | null>>;

	reserveHeadcount(
		record: HeadcountReservationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>>;

	releaseHeadcountReservation(
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>>;

	consumeHeadcountReservation(
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>>;

	releaseActiveHeadcountReservationsForRequisition(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>>;

	consumeActiveHeadcountReservationForRequisition(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>>;

	listHeadcountReservations(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		planId?: HumanResourcesHeadcountPlanId;
		requisitionId?: HumanResourcesRequisitionId;
	}): Promise<Result<HeadcountReservationListPage>>;

	listHeadcountReservationsByPlanLineId(input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}): Promise<Result<HeadcountReservation[]>>;

	getHeadcountAvailability(input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}): Promise<Result<HeadcountAvailability | null>>;

	getRecruitmentHeadcountHandoff(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<RecruitmentHeadcountHandoff>>;

	getWorkforcePlanVariance(input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}): Promise<Result<WorkforcePlanVariance>>;

	// Talent — Competency
	getCompetencyById(input: {
		organizationId: string;
		competencyId: HumanResourcesCompetencyId;
	}): Promise<Result<Competency | null>>;

	findCompetencyByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompetencyRecord | null>>;

	createCompetency(
		record: CompetencyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Competency>>;

	updateCompetency(
		input: {
			organizationId: string;
			competencyId: HumanResourcesCompetencyId;
			name?: string;
			description?: string | null;
			category?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Competency>>;

	retireCompetency(
		input: {
			organizationId: string;
			competencyId: HumanResourcesCompetencyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Competency>>;

	listCompetencies(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompetencyStatus;
	}): Promise<Result<CompetencyListPage>>;

	// Talent — Job competency
	mapCompetencyToJob(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			competencyId: HumanResourcesCompetencyId;
			requiredLevel: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobCompetency>>;

	removeCompetencyFromJob(
		input: {
			organizationId: string;
			jobCompetencyId: HumanResourcesJobCompetencyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobCompetency>>;

	listJobCompetencies(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
		page: number;
		pageSize: number;
	}): Promise<Result<JobCompetencyListPage>>;

	// Talent — Competency assessment
	getCompetencyAssessmentById(input: {
		organizationId: string;
		assessmentId: HumanResourcesCompetencyAssessmentId;
	}): Promise<Result<CompetencyAssessment | null>>;

	findCurrentCompetencyAssessment(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		competencyId: HumanResourcesCompetencyId;
	}): Promise<Result<CompetencyAssessment | null>>;

	findCompetencyAssessmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompetencyAssessmentRecord | null>>;

	createCompetencyAssessment(
		record: CompetencyAssessmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompetencyAssessment>>;

	supersedeCompetencyAssessment(
		record: CompetencyAssessmentSupersedeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompetencyAssessment>>;

	getEmployeeCompetencyProfile(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<EmployeeCompetencyProfile>>;

	// Talent — Talent profile
	getTalentProfileById(input: {
		organizationId: string;
		talentProfileId: HumanResourcesTalentProfileId;
	}): Promise<Result<TalentProfile | null>>;

	findTalentProfileByEmployeeId(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<TalentProfile | null>>;

	findTalentProfileByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTalentProfileRecord | null>>;

	createTalentProfile(
		record: TalentProfileCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfile>>;

	updateTalentProfile(
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			summary?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfile>>;

	archiveTalentProfile(
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfile>>;

	getTalentProfileByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<TalentProfile | null>>;

	// Talent — Talent profile assessment
	recordTalentProfileAssessment(
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			methodCode: TalentProfileAssessmentMethodCode;
			classification: string;
			evidenceSummary: string;
			assessorUserId: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfileAssessment>>;

	confirmTalentProfileAssessment(
		input: {
			organizationId: string;
			assessmentId: HumanResourcesTalentProfileAssessmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfileAssessment>>;

	// Talent — Talent pool
	getTalentPoolById(input: {
		organizationId: string;
		poolId: HumanResourcesTalentPoolId;
	}): Promise<Result<TalentPool | null>>;

	findTalentPoolByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTalentPoolRecord | null>>;

	createTalentPool(
		record: TalentPoolCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPool>>;

	updateTalentPool(
		input: {
			organizationId: string;
			poolId: HumanResourcesTalentPoolId;
			name?: string;
			description?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPool>>;

	closeTalentPool(
		input: {
			organizationId: string;
			poolId: HumanResourcesTalentPoolId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPool>>;

	// Talent — Talent pool member
	findTalentPoolMemberByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTalentPoolMemberRecord | null>>;

	nominateTalentPoolMember(
		record: TalentPoolMemberCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPoolMember>>;

	approveTalentPoolMember(
		input: {
			organizationId: string;
			memberId: HumanResourcesTalentPoolMemberId;
			approverUserId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPoolMember>>;

	removeTalentPoolMember(
		input: {
			organizationId: string;
			memberId: HumanResourcesTalentPoolMemberId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPoolMember>>;

	listTalentPoolMembers(input: {
		organizationId: string;
		poolId: HumanResourcesTalentPoolId;
		page: number;
		pageSize: number;
		status?: TalentPoolMemberStatus;
	}): Promise<Result<TalentPoolMemberListPage>>;

	// Talent — Career plan
	findCareerPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCareerPlanRecord | null>>;

	createCareerPlan(
		record: CareerPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	updateCareerPlan(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			title?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	acknowledgeCareerPlan(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	closeCareerPlan(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	getCareerPlanById(input: {
		organizationId: string;
		careerPlanId: HumanResourcesCareerPlanId;
	}): Promise<Result<CareerPlanWithActions | null>>;

	listEmployeeCareerPlans(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		status?: CareerPlanStatus;
	}): Promise<Result<CareerPlanListPage>>;

	// Talent — Career plan action
	addCareerPlanAction(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			title: string;
			dueOn: string | null;
			learningAssignmentId: HumanResourcesLearningAssignmentId | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlanAction>>;

	completeCareerPlanAction(
		input: {
			organizationId: string;
			actionId: HumanResourcesCareerPlanActionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlanAction>>;

	getCareerPlanActionById(input: {
		organizationId: string;
		actionId: HumanResourcesCareerPlanActionId;
	}): Promise<Result<CareerPlanAction | null>>;

	// Talent — Succession plan
	findSuccessionPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentSuccessionPlanRecord | null>>;

	createSuccessionPlan(
		record: SuccessionPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionPlan>>;

	updateSuccessionPlan(
		input: {
			organizationId: string;
			successionPlanId: HumanResourcesSuccessionPlanId;
			title?: string;
			allowsExternalCandidates?: boolean;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionPlan>>;

	closeSuccessionPlan(
		input: {
			organizationId: string;
			successionPlanId: HumanResourcesSuccessionPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionPlan>>;

	getSuccessionPlanById(input: {
		organizationId: string;
		successionPlanId: HumanResourcesSuccessionPlanId;
	}): Promise<Result<SuccessionPlan | null>>;

	listSuccessionPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		positionId?: HumanResourcesPositionId;
		status?: SuccessionPlanStatus;
	}): Promise<Result<SuccessionPlanListPage>>;

	// Talent — Succession candidate
	findSuccessionCandidateByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentSuccessionCandidateRecord | null>>;

	nominateSuccessionCandidate(
		record: SuccessionCandidateCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	assessSuccessionReadiness(
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			readiness: SuccessionReadinessCode;
			readinessEffectiveOn: string;
			evidenceSummary: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	approveSuccessionCandidate(
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	removeSuccessionCandidate(
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	listSuccessionCandidates(input: {
		organizationId: string;
		successionPlanId: HumanResourcesSuccessionPlanId;
		page: number;
		pageSize: number;
		status?: SuccessionCandidateStatus;
	}): Promise<Result<SuccessionCandidateListPage>>;

	getPositionSuccessionCoverage(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<PositionSuccessionCoverage>>;
};

export type HeadcountPlanCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	planningScopeKey: string;
	periodStart: string;
	periodEnd: string;
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentHeadcountPlanRecord = {
	plan: HeadcountPlan;
	createRequestFingerprint: string;
};

export type HeadcountPlanSupersedeRecord = {
	organizationId: string;
	sourcePlanId: HumanResourcesHeadcountPlanId;
	code: string;
	title: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	createdBy: string;
};

export type HeadcountPlanLineCreateRecord = {
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
	createdBy: string;
};

export type HeadcountReservationCreateRecord = {
	organizationId: string;
	planLineId: HumanResourcesHeadcountPlanLineId;
	requisitionId: HumanResourcesRequisitionId;
	reservedFte: string;
	reservedHeadcount: number;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentHeadcountReservationRecord = {
	reservation: HeadcountReservation;
	createRequestFingerprint: string;
};

export type EmployeeCaseCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	caseType: EmployeeCaseType;
	severity: EmployeeCaseSeverity;
	allegationSummary: string;
	classificationCode: string;
	ownerActorUserId: string;
	subjectActorUserId: string | null;
	conflictedActorUserIds: string[];
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentEmployeeCaseOpenRecord = {
	caseId: HumanResourcesEmployeeCaseId;
	createRequestFingerprint: string;
};

export type EmployeeCaseActionCreateRecord = {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	actionType: EmployeeCaseActionType;
	recommendationNote: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	recommendedBy: string;
};

export type IdempotentEmployeeCaseActionOpenRecord = {
	actionId: HumanResourcesEmployeeCaseActionId;
	createRequestFingerprint: string;
};

export type EmployeeCaseAppealCreateRecord = {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	appealGroundsSummary: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	createdBy: string;
};

export type IdempotentEmployeeCaseAppealOpenRecord = {
	appealId: HumanResourcesEmployeeCaseAppealId;
	createRequestFingerprint: string;
};

// Talent — CreateRecord types

export type CompetencyCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	category: string | null;
	scaleCode: CompetencyScaleCode;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type CompetencyAssessmentCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	competencyId: HumanResourcesCompetencyId;
	scaleCode: CompetencyScaleCode;
	level: number;
	assessorUserId: string;
	evidenceSource: string;
	effectiveOn: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type CompetencyAssessmentSupersedeRecord = {
	organizationId: string;
	sourceAssessmentId: HumanResourcesCompetencyAssessmentId;
	level: number;
	assessorUserId: string;
	evidenceSource: string;
	effectiveOn: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	createdBy: string;
};

export type TalentProfileCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	summary: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type TalentPoolCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type TalentPoolMemberCreateRecord = {
	organizationId: string;
	poolId: HumanResourcesTalentPoolId;
	employeeId: HumanResourcesEmployeeId;
	nominatorUserId: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type CareerPlanCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	ownerUserId: string;
	code: string;
	title: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type SuccessionPlanCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	positionId: HumanResourcesPositionId;
	allowsExternalCandidates: boolean;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type SuccessionCandidateCreateRecord = {
	organizationId: string;
	successionPlanId: HumanResourcesSuccessionPlanId;
	employeeId: HumanResourcesEmployeeId | null;
	externalCandidateRef: string | null;
	nominatorUserId: string;
	readiness: SuccessionReadinessCode;
	readinessEffectiveOn: string;
	evidenceSummary: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};
