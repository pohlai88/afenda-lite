import type {
	HumanResourcesApplicationId,
	HumanResourcesAssessmentId,
	HumanResourcesAssignmentId,
	HumanResourcesAttendanceAdjustmentId,
	HumanResourcesAttendanceBreakWaiverDecisionId,
	HumanResourcesAttendanceEventId,
	HumanResourcesAttendanceExceptionId,
	HumanResourcesAttendanceSessionId,
	HumanResourcesBenefitEnrollmentDependentId,
	HumanResourcesBenefitEnrollmentId,
	HumanResourcesBenefitPlanId,
	HumanResourcesCandidateId,
	HumanResourcesCareerPlanActionId,
	HumanResourcesCareerPlanId,
	HumanResourcesCertificationId,
	HumanResourcesClearanceId,
	HumanResourcesCompensationGradeId,
	HumanResourcesCompensationGradeProgressionRuleId,
	HumanResourcesCompensationProposalId,
	HumanResourcesCompensationReviewCycleId,
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
	HumanResourcesLearningAttendanceId,
	HumanResourcesLeaveAdjustmentId,
	HumanResourcesLeaveApprovalDecisionId,
	HumanResourcesLeaveEntitlementId,
	HumanResourcesLeavePolicyId,
	HumanResourcesLeaveRequestId,
	HumanResourcesLeaveRequestSegmentId,
	HumanResourcesOffboardingAccessRevocationId,
	HumanResourcesOffboardingCaseId,
	HumanResourcesOffboardingPayrollHandoffId,
	HumanResourcesOffboardingTaskId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingAccessHandoffId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesOnboardingEquipmentHandoffId,
	HumanResourcesOnboardingOrientationId,
	HumanResourcesOnboardingTaskId,
	HumanResourcesOvertimeRequestId,
	HumanResourcesPerformanceCycleId,
	HumanResourcesPerformanceCycleParticipantId,
	HumanResourcesPolicyAcknowledgementId,
	HumanResourcesPositionId,
	HumanResourcesProbationAssessmentId,
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
	HumanResourcesTalentCriticalRoleReadinessId,
	HumanResourcesTalentPoolId,
	HumanResourcesTalentPoolMemberId,
	HumanResourcesTalentProfileAssessmentId,
	HumanResourcesTalentProfileId,
	HumanResourcesTalentProfileMobilityId,
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
	BenefitDependentRelationship,
	BenefitEnrollmentStatus,
	BenefitPlanStatus,
	CompensationGradeProgressionRuleStatus,
	CompensationGradeStatus,
	CompensationProposalStatus,
	CompensationReviewCycleStatus,
	CompensationReviewStatus,
	EmployeeCompensationStatus,
	PayFrequency,
	SalaryBandStatus,
} from "./shared/compensation-status";
import type {
	DocumentRequirementApplicability,
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
	LearningAttendanceStatus,
	SessionStatus,
} from "./shared/learning-status";
import type {
	ApprovalDecision,
	DayPortion,
	LeaveAdjustmentKind,
	LeaveAdjustmentStatus,
	LeaveEntitlementStatus,
	LeavePolicyAccrualBasis,
	LeavePolicyAccrualFrequency,
	LeavePolicyEntitlementExpiryRule,
	LeavePolicyStatus,
	LeaveRequestStatus,
	LeaveType,
	LeaveUnit,
} from "./shared/leave-status";
import type {
	ClearanceStatus,
	LifecycleTaskStatus,
	MovementKind,
	OffboardingAccessRevocationStatus,
	OffboardingCaseStatus,
	OffboardingPayrollHandoffStatus,
	OnboardingAccessHandoffStatus,
	OnboardingCaseStatus,
	OnboardingEquipmentHandoffStatus,
	OnboardingOrientationStatus,
	ProbationOutcome,
	ProbationStatus,
	TerminationStatus,
} from "./shared/lifecycle-status";
import type { PerformanceRatingScale } from "./shared/performance-rating";
import type {
	PerformanceAssessmentKind,
	PerformanceCheckpointOutcome,
	PerformanceCycleParticipantStatus,
	PerformanceCycleReviewPeriodKind,
	PerformanceCycleStatus,
	PerformanceGoalKind,
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
	TalentCriticalRoleReadinessStatus,
	TalentMobilityDimension,
	TalentMobilityPreference,
	TalentPoolMemberStatus,
	TalentPoolStatus,
	TalentProfileAssessmentMethodCode,
	TalentProfileAssessmentStatus,
	TalentProfileMobilityStatus,
	TalentProfileStatus,
} from "./shared/talent-status";
import type {
	HeadcountEmploymentType,
	HeadcountPlanStatus,
	HeadcountReservationStatus,
} from "./shared/workforce-planning-status";

export interface Employee {
	createdAt: Date;
	createdBy: string;
	employeeNumber: string;
	id: HumanResourcesEmployeeId;
	legalName: string;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Employment {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	endsOn: string | null;
	id: HumanResourcesEmploymentId;
	organizationId: string;
	startsOn: string;
	status: EmploymentStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export type { ApplicationStatusHistory } from "./shared/application-history";
export type { EmploymentStatusHistory } from "./shared/employment-history";

export type EmploymentContractLineageStatus = "active" | "superseded";

export interface EmploymentContract {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endsOn: string | null;
	id: HumanResourcesEmploymentContractId;
	lineageStatus: EmploymentContractLineageStatus;
	organizationId: string;
	reasonCode: string;
	referenceCode: string;
	sourceReference: string | null;
	startsOn: string;
	supersededByContractId: HumanResourcesEmploymentContractId | null;
	supersedesContractId: HumanResourcesEmploymentContractId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Department {
	code: string;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesDepartmentId;
	name: string;
	organizationId: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	status: DepartmentStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Job {
	code: string;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesJobId;
	organizationId: string;
	status: JobStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Position {
	code: string;
	createdAt: Date;
	createdBy: string;
	departmentId: HumanResourcesDepartmentId | null;
	id: HumanResourcesPositionId;
	jobId: HumanResourcesJobId | null;
	organizationId: string;
	status: PositionStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface WorkAssignment {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endsOn: string | null;
	id: HumanResourcesAssignmentId;
	managerEmployeeIdSnapshot: HumanResourcesEmployeeId | null;
	/** Null only for rows created before governed organization dimensions. */
	organizationDimensions: HumanResourcesOrganizationDimensions | null;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	predecessorAssignmentId: HumanResourcesAssignmentId | null;
	startsOn: string;
	successorAssignmentId: HumanResourcesAssignmentId | null;
	transferMovementId: HumanResourcesEmploymentMovementId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	workCalendarIdSnapshot: HumanResourcesWorkCalendarId | null;
}

export interface PositionOccupancyAsOf {
	asOf: string;
	assignment: WorkAssignment | null;
	position: Position;
	state: "vacant" | "occupied";
}

export interface ReportingLine {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	endsOn: string | null;
	id: HumanResourcesReportingLineId;
	managerEmployeeId: HumanResourcesEmployeeId;
	organizationId: string;
	relationshipKind: ReportingRelationshipKind;
	startsOn: string;
	supersededByReportingLineId: HumanResourcesReportingLineId | null;
	supersedesReportingLineId: HumanResourcesReportingLineId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OrganizationTreeNode {
	code: string;
	depth: number;
	id: HumanResourcesDepartmentId;
	name: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	status: DepartmentStatus;
}

export interface OrganizationTreePage {
	nodes: OrganizationTreeNode[];
	truncated: boolean;
}

export interface EmployeeListPage {
	employees: Employee[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface JobRequisition {
	code: string;
	createdAt: Date;
	createdBy: string;
	departmentId: HumanResourcesDepartmentId | null;
	hiringManagerEmployeeId: HumanResourcesEmployeeId | null;
	id: HumanResourcesRequisitionId;
	jobId: HumanResourcesJobId | null;
	organizationId: string;
	positionId: HumanResourcesPositionId | null;
	status: RequisitionStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Candidate {
	consentCapturedAt: Date | null;
	consentPolicyVersion: string | null;
	consentSource: CandidateConsentSource | null;
	consentWithdrawnAt: Date | null;
	createdAt: Date;
	createdBy: string;
	displayName: string;
	email: string;
	id: HumanResourcesCandidateId;
	organizationId: string;
	phone: string | null;
	retentionUntil: string | null;
	status: CandidateStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export type CandidateDuplicateMatchReason = "email" | "display_name";

export interface CandidateDuplicateMatch {
	candidateId: HumanResourcesCandidateId;
	displayName: string;
	email: string;
	matchReasons: readonly CandidateDuplicateMatchReason[];
}

export interface CandidateApplication {
	candidateId: HumanResourcesCandidateId;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesApplicationId;
	organizationId: string;
	requisitionId: HumanResourcesRequisitionId;
	status: ApplicationStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Interview {
	applicationId: HumanResourcesApplicationId;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesInterviewId;
	interviewerActorId: string;
	organizationId: string;
	scheduledAt: Date;
	status: InterviewStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

/** Public interview list row — never includes private evaluator notes. */
export type InterviewListItem = Interview;

export interface InterviewScorecardCriterion {
	comment: string | null;
	criterionCode: string;
	label: string;
	rating: number;
}

export interface InterviewScorecard {
	criteria: InterviewScorecardCriterion[];
}

export interface InterviewEvaluation {
	createdAt: Date;
	createdBy: string;
	evaluatorActorId: string;
	id: HumanResourcesInterviewEvaluationId;
	interviewId: HumanResourcesInterviewId;
	organizationId: string;
	privateNotes: string | null;
	recordedAt: Date;
	result: InterviewEvaluationResult;
	scorecard: InterviewScorecard;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmploymentOffer {
	applicationId: HumanResourcesApplicationId;
	compensationProposalId: HumanResourcesCompensationProposalId | null;
	createdAt: Date;
	createdBy: string;
	expiresOn: string;
	id: HumanResourcesOfferId;
	issuedAt: Date | null;
	organizationId: string;
	respondedAt: Date | null;
	status: OfferStatus;
	termsSummary: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

/**
 * Explicit conversion handoff after offer acceptance.
 * Does not create an employee — caller must invoke createEmployee (HR-02 / HR6).
 */
export interface OfferAcceptanceHandoff {
	acceptedAt: Date;
	applicationId: HumanResourcesApplicationId;
	candidateId: HumanResourcesCandidateId;
	correlationId: string;
	offer: EmploymentOffer;
	offerId: HumanResourcesOfferId;
	organizationId: string;
	requisitionId: HumanResourcesRequisitionId;
}

export interface RequisitionListPage {
	page: number;
	pageSize: number;
	requisitions: JobRequisition[];
	totalCount: number;
}

export interface CandidateListPage {
	candidates: Candidate[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface ApplicationListPage {
	applications: CandidateApplication[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface InterviewListPage {
	interviews: InterviewListItem[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface OfferListPage {
	offers: EmploymentOffer[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface OnboardingCase {
	completedAt: Date | null;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesOnboardingCaseId;
	organizationId: string;
	sourceOfferId: HumanResourcesOfferId | null;
	startedAt: Date;
	status: OnboardingCaseStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OnboardingTask {
	caseId: HumanResourcesOnboardingCaseId;
	code: string;
	completedAt: Date | null;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesOnboardingTaskId;
	mandatory: boolean;
	organizationId: string;
	status: LifecycleTaskStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OnboardingOrientation {
	acknowledgedOn: string | null;
	createdAt: Date;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesOnboardingOrientationId;
	notes: string | null;
	onboardingCaseId: HumanResourcesOnboardingCaseId;
	organizationId: string;
	status: OnboardingOrientationStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OnboardingEquipmentHandoff {
	createdAt: Date;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	handedOverOn: string | null;
	id: HumanResourcesOnboardingEquipmentHandoffId;
	onboardingCaseId: HumanResourcesOnboardingCaseId;
	organizationId: string;
	status: OnboardingEquipmentHandoffStatus;
	summary: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OnboardingAccessHandoff {
	createdAt: Date;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	grantedOn: string | null;
	id: HumanResourcesOnboardingAccessHandoffId;
	onboardingCaseId: HumanResourcesOnboardingCaseId;
	organizationId: string;
	status: OnboardingAccessHandoffStatus;
	summary: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface ProbationReview {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endsOn: string;
	id: HumanResourcesProbationReviewId;
	lastExtensionEvidenceReference: string | null;
	lastExtensionReason: string | null;
	organizationId: string;
	outcome: ProbationOutcome | null;
	outcomeActorId: string | null;
	outcomeEvidenceReference: string | null;
	outcomeReason: string | null;
	outcomeRecordedOn: string | null;
	startsOn: string;
	status: ProbationStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface ProbationAssessment {
	actorUserId: string;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	evidenceReference: string | null;
	id: HumanResourcesProbationAssessmentId;
	organizationId: string;
	probationReviewId: HumanResourcesProbationReviewId;
	reason: string;
	reviewedOn: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmploymentConfirmation {
	confirmedBy: string;
	confirmedOn: string;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	evidenceNote: string;
	id: HumanResourcesEmploymentConfirmationId;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmploymentMovement {
	/** ISO datetime string (offset) at the public store boundary. */
	createdAt: string;
	createdBy: string;
	effectiveOn: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	fromAssignmentId: HumanResourcesAssignmentId;
	fromPositionId: HumanResourcesPositionId;
	id: HumanResourcesEmploymentMovementId;
	movementKind: MovementKind;
	organizationId: string;
	reason: string;
	toAssignmentId: HumanResourcesAssignmentId;
	toPositionId: HumanResourcesPositionId;
	/** ISO datetime string (offset) at the public store boundary. */
	updatedAt: string;
	updatedBy: string;
	version: number;
}

export interface Termination {
	approvedAt: Date | null;
	approvedBy: string | null;
	createdAt: Date;
	createdBy: string;
	effectiveOn: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	finalizedAt: Date | null;
	id: HumanResourcesTerminationId;
	organizationId: string;
	reasonCode: string;
	reasonDetail: string;
	rehireEligible: boolean;
	status: TerminationStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OffboardingCase {
	completedAt: Date | null;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesOffboardingCaseId;
	organizationId: string;
	startedAt: Date;
	status: OffboardingCaseStatus;
	terminationId: HumanResourcesTerminationId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OffboardingTask {
	caseId: HumanResourcesOffboardingCaseId;
	code: string;
	completedAt: Date | null;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesOffboardingTaskId;
	mandatory: boolean;
	organizationId: string;
	status: LifecycleTaskStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface ExitInterview {
	conductedOn: string;
	createdAt: Date;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesExitInterviewId;
	notes: string;
	offboardingCaseId: HumanResourcesOffboardingCaseId;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Clearance {
	clearedOn: string | null;
	createdAt: Date;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesClearanceId;
	offboardingCaseId: HumanResourcesOffboardingCaseId;
	organizationId: string;
	status: ClearanceStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OffboardingAccessRevocation {
	createdAt: Date;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesOffboardingAccessRevocationId;
	offboardingCaseId: HumanResourcesOffboardingCaseId;
	organizationId: string;
	revokedOn: string | null;
	status: OffboardingAccessRevocationStatus;
	summary: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface OffboardingPayrollHandoff {
	createdAt: Date;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesOffboardingPayrollHandoffId;
	offboardingCaseId: HumanResourcesOffboardingCaseId;
	organizationId: string;
	readyOn: string | null;
	status: OffboardingPayrollHandoffStatus;
	summary: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompensationGrade {
	code: string;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesCompensationGradeId;
	name: string;
	organizationId: string;
	status: CompensationGradeStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface SalaryBand {
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	gradeId: HumanResourcesCompensationGradeId;
	id: HumanResourcesSalaryBandId;
	maxAmount: string;
	midAmount: string;
	minAmount: string;
	organizationId: string;
	status: SalaryBandStatus;
	supersedesSalaryBandId: HumanResourcesSalaryBandId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompensationGradeProgressionRule {
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	fromGradeId: HumanResourcesCompensationGradeId;
	id: HumanResourcesCompensationGradeProgressionRuleId;
	minMonthsInGrade: number | null;
	organizationId: string;
	status: CompensationGradeProgressionRuleStatus;
	toGradeId: HumanResourcesCompensationGradeId;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmployeeCompensation {
	approvedAt: Date | null;
	approvedBy: string | null;
	baseAmount: string;
	confidentialNote: string | null;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	currencyCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	fingerprint: string;
	gradeId: HumanResourcesCompensationGradeId | null;
	id: HumanResourcesEmployeeCompensationId;
	organizationId: string;
	payFrequency: PayFrequency;
	reason: string;
	salaryBandId: HumanResourcesSalaryBandId | null;
	sourceReviewId: HumanResourcesCompensationReviewId | null;
	status: EmployeeCompensationStatus;
	supersedesCompensationId: HumanResourcesEmployeeCompensationId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompensationProposal {
	applicationId: HumanResourcesApplicationId;
	confidentialNote: string | null;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesCompensationProposalId;
	organizationId: string;
	proposedBaseAmount: string | null;
	proposedCurrencyCode: string | null;
	proposedGradeId: HumanResourcesCompensationGradeId | null;
	proposedSalaryBandId: HumanResourcesSalaryBandId | null;
	status: CompensationProposalStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompensationProposalListPage {
	page: number;
	pageSize: number;
	proposals: CompensationProposal[];
	totalCount: number;
}

export interface CompensationReview {
	appliedCompensationId: HumanResourcesEmployeeCompensationId | null;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	cycleId: HumanResourcesCompensationReviewCycleId;
	effectiveFrom: string | null;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	finalizedAt: Date | null;
	fingerprint: string;
	id: HumanResourcesCompensationReviewId;
	organizationId: string;
	proposedBaseAmount: string | null;
	proposedCurrencyCode: string | null;
	proposedGradeId: HumanResourcesCompensationGradeId | null;
	proposedSalaryBandId: HumanResourcesSalaryBandId | null;
	recommendationNote: string | null;
	status: CompensationReviewStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompensationReviewCycle {
	budgetCurrencyCode: string;
	budgetTotalAmount: string;
	code: string;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesCompensationReviewCycleId;
	name: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	status: CompensationReviewCycleStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompensationReviewCycleListPage {
	cycles: CompensationReviewCycle[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface BenefitPlan {
	code: string;
	createdAt: Date;
	createdBy: string;
	eligibilityNote: string | null;
	id: HumanResourcesBenefitPlanId;
	name: string;
	organizationId: string;
	status: BenefitPlanStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface BenefitPlanEligibility {
	allowedEmploymentStatuses: EmploymentStatus[];
	createdAt: Date;
	createdBy: string;
	id: string;
	minTenureDays: number | null;
	organizationId: string;
	planId: HumanResourcesBenefitPlanId;
	updatedAt: Date;
	updatedBy: string;
}

export interface BenefitEnrollment {
	contributionCurrencyCode: string | null;
	contributionFrequency: PayFrequency | null;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	employeeContributionAmount: string | null;
	employeeId: HumanResourcesEmployeeId;
	employerContributionAmount: string | null;
	employmentId: HumanResourcesEmploymentId;
	fingerprint: string;
	id: HumanResourcesBenefitEnrollmentId;
	organizationId: string;
	planId: HumanResourcesBenefitPlanId;
	status: BenefitEnrollmentStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	waiverReason: string | null;
}

export interface BenefitEnrollmentDependent {
	createdAt: Date;
	createdBy: string;
	dependentName: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	enrollmentId: HumanResourcesBenefitEnrollmentId;
	id: HumanResourcesBenefitEnrollmentDependentId;
	organizationId: string;
	relationship: BenefitDependentRelationship;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompensationGradeListPage {
	grades: CompensationGrade[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface SalaryBandListPage {
	bands: SalaryBand[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface CompensationGradeProgressionRuleListPage {
	page: number;
	pageSize: number;
	rules: CompensationGradeProgressionRule[];
	totalCount: number;
}

export interface EmployeeCompensationListPage {
	compensations: EmployeeCompensation[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface CompensationReviewListPage {
	page: number;
	pageSize: number;
	reviews: CompensationReview[];
	totalCount: number;
}

export interface BenefitPlanListPage {
	page: number;
	pageSize: number;
	plans: BenefitPlan[];
	totalCount: number;
}

export interface BenefitEnrollmentListPage {
	enrollments: BenefitEnrollment[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface LearningCourse {
	code: string;
	createdAt: Date;
	createdBy: string;
	description: string | null;
	durationHours: string | null;
	id: HumanResourcesCourseId;
	organizationId: string;
	status: CourseStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LearningSession {
	actualEndsAt: Date | null;
	actualStartsAt: Date | null;
	capacity: number | null;
	code: string;
	courseId: HumanResourcesCourseId;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesSessionId;
	organizationId: string;
	primaryInstructorUserId: string | null;
	scheduledEndsAt: Date;
	scheduledStartsAt: Date;
	status: SessionStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LearningAssignment {
	assignedAt: Date;
	assignedBy: string;
	courseId: HumanResourcesCourseId;
	createdAt: Date;
	createdBy: string;
	dueOn: string | null;
	employeeId: HumanResourcesEmployeeId;
	id: HumanResourcesLearningAssignmentId;
	organizationId: string;
	sessionId: HumanResourcesSessionId | null;
	status: AssignmentStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LearningCompletion {
	assessorUserId: string | null;
	assignmentId: HumanResourcesLearningAssignmentId;
	completedAt: Date;
	courseId: HumanResourcesCourseId;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	id: HumanResourcesCompletionId;
	notes: string | null;
	organizationId: string;
	outcome: string;
	sessionId: HumanResourcesSessionId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LearningAttendance {
	assignmentId: HumanResourcesLearningAssignmentId;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	id: HumanResourcesLearningAttendanceId;
	organizationId: string;
	recordedAt: Date;
	recordedBy: string;
	sessionId: HumanResourcesSessionId;
	status: LearningAttendanceStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmployeeCertification {
	certificationCode: string;
	completionId: HumanResourcesCompletionId;
	courseId: HumanResourcesCourseId;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	expiresOn: string | null;
	id: HumanResourcesCertificationId;
	issuedOn: string;
	organizationId: string;
	renewedFromCertificationId: HumanResourcesCertificationId | null;
	revokedAt: Date | null;
	revokedBy: string | null;
	status: CertificationStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CourseListPage {
	courses: LearningCourse[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface SessionListPage {
	page: number;
	pageSize: number;
	sessions: LearningSession[];
	totalCount: number;
}

export interface LearningAssignmentListPage {
	assignments: LearningAssignment[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface CompletionListPage {
	completions: LearningCompletion[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface CertificationListPage {
	certifications: EmployeeCertification[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface LearningAttendanceListPage {
	attendanceRecords: LearningAttendance[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface ApprovedCompensationHandoff {
	activeBenefitEnrollments: BenefitEnrollment[];
	activeCompensation: EmployeeCompensation | null;
	employeeId: HumanResourcesEmployeeId;
	organizationId: string;
}

export interface LeavePolicy {
	accrualBasis: LeavePolicyAccrualBasis;
	accrualFrequency: LeavePolicyAccrualFrequency | null;
	accrualQuantityPerPeriod: string | null;
	allowSelfApproval: boolean;
	allowsNegativeBalance: boolean;
	allowsPartialDay: boolean;
	carryForwardEnabled: boolean;
	carryForwardMaxQuantity: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	entitlementExpiryDays: number | null;
	entitlementExpiryRule: LeavePolicyEntitlementExpiryRule;
	id: HumanResourcesLeavePolicyId;
	leaveType: LeaveType;
	name: string;
	organizationId: string;
	paid: boolean;
	sensitive: boolean;
	status: LeavePolicyStatus;
	supersedesPolicyId: HumanResourcesLeavePolicyId | null;
	unit: LeaveUnit;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LeavePolicyEligibility {
	allowedEmploymentStatuses: EmploymentStatus[];
	createdAt: Date;
	createdBy: string;
	id: string;
	minTenureDays: number | null;
	organizationId: string;
	policyId: HumanResourcesLeavePolicyId;
	updatedAt: Date;
	updatedBy: string;
}

export interface LeaveEntitlement {
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	fingerprint: string;
	id: HumanResourcesLeaveEntitlementId;
	openingQuantity: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	policyId: HumanResourcesLeavePolicyId;
	status: LeaveEntitlementStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LeaveAdjustment {
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	delta: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	fingerprint: string;
	id: HumanResourcesLeaveAdjustmentId;
	kind: LeaveAdjustmentKind;
	organizationId: string;
	reason: string;
	source: string;
	sourceRequestId: HumanResourcesLeaveRequestId | null;
	status: LeaveAdjustmentStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LeaveRequest {
	approvedAt: Date | null;
	backdateJustification: string | null;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endDate: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	fingerprint: string;
	id: HumanResourcesLeaveRequestId;
	isBackdated: boolean;
	organizationId: string;
	policyId: HumanResourcesLeavePolicyId;
	requestedQuantity: string;
	startDate: string;
	status: LeaveRequestStatus;
	unit: LeaveUnit;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LeaveRequestSegment {
	createdAt: Date;
	dayPortion: DayPortion;
	id: HumanResourcesLeaveRequestSegmentId;
	organizationId: string;
	quantity: string;
	requestId: HumanResourcesLeaveRequestId;
	segmentDate: string;
	updatedAt: Date;
}

export interface LeaveApprovalDecision {
	createdAt: Date;
	decidedAt: Date;
	decidedBy: string;
	decision: ApprovalDecision;
	id: HumanResourcesLeaveApprovalDecisionId;
	note: string | null;
	organizationId: string;
	requestId: HumanResourcesLeaveRequestId;
	updatedAt: Date;
}

export interface LeaveBalance {
	balance: string;
	employeeId: HumanResourcesEmployeeId;
	entitlementId: HumanResourcesLeaveEntitlementId;
	openingQuantity: string;
	policyId: HumanResourcesLeavePolicyId;
	unit: LeaveUnit;
}

export interface LeaveBalanceReconciliation {
	adjustmentCount: number;
	adjustments: Pick<
		LeaveAdjustment,
		"id" | "kind" | "delta" | "reason" | "source" | "createdAt"
	>[];
	balance: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	latestAdjustmentAt: Date | null;
	openingQuantity: string;
}

export interface ApprovedLeaveHandoff {
	approvedAt: string;
	correlationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endDate: string;
	organizationId: string;
	paid: boolean;
	policyId: HumanResourcesLeavePolicyId;
	policyVersion: number;
	quantity: string;
	requestId: HumanResourcesLeaveRequestId;
	segments: Array<{ date: string; quantity: string; dayPortion: string }>;
	startDate: string;
	unit: LeaveUnit;
}

export interface ResolvedLeavePolicy {
	eligibility: LeavePolicyEligibility;
	policy: LeavePolicy;
}

export interface LeavePolicyListPage {
	page: number;
	pageSize: number;
	policies: LeavePolicy[];
	totalCount: number;
}

export interface LeaveEntitlementListPage {
	entitlements: LeaveEntitlement[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface LeaveRequestListPage {
	page: number;
	pageSize: number;
	requests: LeaveRequest[];
	totalCount: number;
}

export interface TeamCalendarLeaveEntry {
	request: LeaveRequest;
	segments: LeaveRequestSegment[];
}

export interface TeamCalendarLeavePage {
	entries: TeamCalendarLeaveEntry[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface PerformanceCycle {
	code: string;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesPerformanceCycleId;
	name: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	ratingScale: PerformanceRatingScale;
	status: PerformanceCycleStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	weightingModel: PerformanceWeightingModel;
}

export interface PerformanceCycleReviewPeriod {
	createdAt: Date;
	createdBy: string;
	cycleId: HumanResourcesPerformanceCycleId;
	id: string;
	kind: PerformanceCycleReviewPeriodKind;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	updatedAt: Date;
	updatedBy: string;
}

export interface PerformanceCycleEligibility {
	allowedEmploymentStatuses: EmploymentStatus[];
	createdAt: Date;
	createdBy: string;
	cycleId: HumanResourcesPerformanceCycleId;
	id: string;
	minTenureDays: number | null;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
}

export interface PerformanceCycleParticipant {
	createdAt: Date;
	createdBy: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesPerformanceCycleParticipantId;
	organizationId: string;
	status: PerformanceCycleParticipantStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PerformanceGoal {
	alignedToGoalId: HumanResourcesGoalId | null;
	completionEvidenceReference: string | null;
	completionNote: string | null;
	createdAt: Date;
	createdBy: string;
	cycleId: HumanResourcesPerformanceCycleId;
	description: string | null;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	exceptionOutsideCycle: boolean;
	goalKind: PerformanceGoalKind;
	id: HumanResourcesGoalId;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	status: PerformanceGoalStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	weight: string | null;
}

export interface PerformanceGoalProgress {
	createdAt: Date;
	evidenceReference: string | null;
	goalId: HumanResourcesGoalId;
	id: HumanResourcesGoalProgressId;
	organizationId: string;
	progressNote: string;
	progressValue: string | null;
	recordedAt: Date;
	recordedBy: string;
	updatedAt: Date;
}

export const PERFORMANCE_REVIEW_SELF_SEQUENCE = 0 as const;
export const PERFORMANCE_REVIEW_MANAGER_SEQUENCE = 1000 as const;

export interface PerformanceReview {
	acknowledgementNote: string | null;
	calibrationNote: string | null;
	createdAt: Date;
	createdBy: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesReviewId;
	organizationId: string;
	overallRating: string | null;
	status: PerformanceReviewStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PerformanceReviewParticipant {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId | null;
	id: HumanResourcesReviewParticipantId;
	organizationId: string;
	reviewId: HumanResourcesReviewId;
	role: "self" | "manager" | "delegated";
	sequenceNumber: number;
	updatedAt: Date;
	updatedBy: string;
	userId: string | null;
	version: number;
}

export interface PerformanceAssessment {
	commentsSensitive: string | null;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesAssessmentId;
	kind: PerformanceAssessmentKind;
	organizationId: string;
	participantId: HumanResourcesReviewParticipantId;
	rating: string | null;
	reviewId: HumanResourcesReviewId;
	submittedAt: Date | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PerformanceImprovementPlan {
	accountableManagerEmployeeId: HumanResourcesEmployeeId;
	createdAt: Date;
	createdBy: string;
	dueDate: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	expectedOutcome: string;
	id: HumanResourcesImprovementPlanId;
	lastExtensionEvidenceReference: string | null;
	lastExtensionReason: string | null;
	measurableActions: string;
	organizationId: string;
	outcomeEvidenceReference: string | null;
	outcomeReason: string | null;
	performanceGap: string;
	reviewId: HumanResourcesReviewId;
	status: PerformanceImprovementPlanStatus;
	supportResources: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PerformanceImprovementCheckpoint {
	createdAt: Date;
	dueDate: string;
	evidenceReference: string | null;
	id: HumanResourcesImprovementCheckpointId;
	notes: string | null;
	organizationId: string;
	outcome: PerformanceCheckpointOutcome;
	planId: HumanResourcesImprovementPlanId;
	recordedAt: Date | null;
	recordedBy: string | null;
	sequenceNumber: number;
	updatedAt: Date;
}

export interface PerformanceImprovementCheckpointListPage {
	checkpoints: PerformanceImprovementCheckpoint[];
	totalCount: number;
}

export interface PerformanceCycleListPage {
	cycles: PerformanceCycle[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface PerformanceCycleParticipantListPage {
	page: number;
	pageSize: number;
	participants: PerformanceCycleParticipant[];
	totalCount: number;
}

export interface PerformanceGoalListPage {
	goals: PerformanceGoal[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface PerformanceGoalProgressListPage {
	page: number;
	pageSize: number;
	progress: PerformanceGoalProgress[];
	totalCount: number;
}

export interface PerformanceReviewListPage {
	page: number;
	pageSize: number;
	reviews: PerformanceReview[];
	totalCount: number;
}

export interface PerformanceImprovementPlanListPage {
	page: number;
	pageSize: number;
	plans: PerformanceImprovementPlan[];
	totalCount: number;
}

export interface PerformanceAssessmentProjection {
	commentsSensitive: string | null;
	id: HumanResourcesAssessmentId;
	kind: PerformanceAssessmentKind;
	participantId: HumanResourcesReviewParticipantId;
	rating: string | null;
	submittedAt: Date | null;
	version: number;
}

export interface PerformanceReviewDetail {
	assessments: PerformanceAssessmentProjection[];
	participants: PerformanceReviewParticipant[];
	review: PerformanceReview;
}

export interface EmployeePerformanceHistoryEntry {
	assessments: PerformanceAssessmentProjection[];
	goals: PerformanceGoal[];
	improvementPlans: PerformanceImprovementPlan[];
	overallRating: string | null;
	review: PerformanceReview;
}

export interface EmployeePerformanceHistory {
	employeeId: HumanResourcesEmployeeId;
	entries: EmployeePerformanceHistoryEntry[];
}

export interface HeadcountPlan {
	approvedAt: Date | null;
	approvedBy: string | null;
	code: string;
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	id: HumanResourcesHeadcountPlanId;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	planningScopeKey: string;
	planVersion: number;
	rejectedAt: Date | null;
	rejectedBy: string | null;
	rejectionReason: string | null;
	status: HeadcountPlanStatus;
	supersedesPlanId: HumanResourcesHeadcountPlanId | null;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface HeadcountPlanLine {
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createdAt: Date;
	createdBy: string;
	departmentId: HumanResourcesDepartmentId | null;
	employmentType: HeadcountEmploymentType | null;
	id: HumanResourcesHeadcountPlanLineId;
	jobId: HumanResourcesJobId | null;
	locationCode: string | null;
	organizationId: string;
	planId: HumanResourcesHeadcountPlanId;
	plannedFte: string;
	plannedHeadcount: number;
	positionId: HumanResourcesPositionId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface HeadcountReservation {
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	id: HumanResourcesHeadcountReservationId;
	organizationId: string;
	planId: HumanResourcesHeadcountPlanId;
	planLineId: HumanResourcesHeadcountPlanLineId;
	requisitionId: HumanResourcesRequisitionId;
	reservedFte: string;
	reservedHeadcount: number;
	status: HeadcountReservationStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface HeadcountPlanListPage {
	page: number;
	pageSize: number;
	plans: HeadcountPlan[];
	totalCount: number;
}

export interface HeadcountReservationListPage {
	page: number;
	pageSize: number;
	reservations: HeadcountReservation[];
	totalCount: number;
}

export interface HeadcountLineAvailability {
	availableFte: string;
	availableHeadcount: number;
	consumedFte: string;
	consumedHeadcount: number;
	planLineId: string;
	plannedFte: string;
	plannedHeadcount: number;
	reservedFte: string;
	reservedHeadcount: number;
}

export interface HeadcountAvailability {
	lines: HeadcountLineAvailability[];
	planId: HumanResourcesHeadcountPlanId;
	planLineId: HumanResourcesHeadcountPlanLineId;
}

export interface RecruitmentHeadcountHandoff {
	activeReservation: HeadcountReservation | null;
	approvedPlan: HeadcountPlan | null;
	availability: HeadcountLineAvailability | null;
	organizationId: string;
	requisitionId: HumanResourcesRequisitionId;
}

export interface WorkforcePlanVariance {
	asOf: string;
	lines: Array<
		HeadcountLineAvailability & {
			actualFte: string;
			actualHeadcount: number;
			varianceFte: string;
			varianceHeadcount: number;
		}
	>;
	planId: HumanResourcesHeadcountPlanId;
}

export interface DocumentRequirement {
	applicability: DocumentRequirementApplicability;
	appliesToNote: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	documentType: string;
	id: HumanResourcesDocumentRequirementId;
	issuingJurisdiction: string | null;
	name: string;
	organizationId: string;
	status: DocumentRequirementStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmployeeDocument {
	createdAt: Date;
	createdBy: string;
	documentRef: string;
	documentType: string;
	employeeId: HumanResourcesEmployeeId;
	expiresOn: string | null;
	id: HumanResourcesEmployeeDocumentId;
	identifierFingerprint: string | null;
	identifierLast4: string | null;
	issuedOn: string;
	issuingJurisdiction: string | null;
	metadata: Record<string, unknown> | null;
	organizationId: string;
	rejectionReason: string | null;
	requirementId: HumanResourcesDocumentRequirementId | null;
	updatedAt: Date;
	updatedBy: string;
	verificationStatus: EmployeeDocumentVerificationStatus;
	verifiedAt: Date | null;
	verifiedBy: string | null;
	version: number;
}

export interface EmployeeDocumentListItem {
	createdAt: Date;
	documentType: string;
	employeeId: HumanResourcesEmployeeId;
	expiresOn: string | null;
	id: HumanResourcesEmployeeDocumentId;
	issuedOn: string;
	issuingJurisdiction: string | null;
	organizationId: string;
	requirementId: HumanResourcesDocumentRequirementId | null;
	updatedAt: Date;
	verificationStatus: EmployeeDocumentVerificationStatus;
	verifiedAt: Date | null;
	version: number;
}

export type EmployeeDocumentSensitiveDetail = EmployeeDocumentListItem & {
	identifierLast4: string | null;
	documentRef: string;
	metadata: Record<string, unknown> | null;
	rejectionReason: string | null;
	verifiedBy: string | null;
};

export interface WorkEligibility {
	countryCode: string;
	createdAt: Date;
	createdBy: string;
	documentRef: string | null;
	employeeId: HumanResourcesEmployeeId;
	expiresOn: string | null;
	id: HumanResourcesWorkEligibilityId;
	issuedOn: string;
	jurisdiction: string | null;
	organizationId: string;
	status: WorkEligibilityStatus;
	updatedAt: Date;
	updatedBy: string;
	verifiedAt: Date | null;
	verifiedBy: string | null;
	version: number;
}

export interface PolicyAcknowledgement {
	acknowledgedAt: Date | null;
	acknowledgedBy: string | null;
	createdAt: Date;
	createdBy: string;
	dueOn: string;
	employeeId: HumanResourcesEmployeeId;
	id: HumanResourcesPolicyAcknowledgementId;
	issuedAt: Date;
	organizationId: string;
	policyCode: string;
	policyVersion: string;
	requirementStatus: PolicyAcknowledgementStatus;
	supersedesAcknowledgementId: HumanResourcesPolicyAcknowledgementId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface DocumentRequirementListPage {
	page: number;
	pageSize: number;
	requirements: DocumentRequirement[];
	totalCount: number;
}

export interface EmployeeDocumentListPage {
	documents: EmployeeDocumentListItem[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface WorkEligibilityRiskListPage {
	eligibilities: WorkEligibility[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface PolicyAcknowledgementListPage {
	acknowledgements: PolicyAcknowledgement[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface ComplianceExpiryOperations {
	asOf: string;
	expiringCertifications: CertificationListPage;
	expiringDocuments: EmployeeDocumentListPage;
	overduePolicyAcknowledgements: PolicyAcknowledgementListPage;
	withinDays: number;
	workEligibilityRisks: WorkEligibilityRiskListPage;
}

export interface EmployeeComplianceSummary {
	employeeId: HumanResourcesEmployeeId;
	expiringDocumentCount: number;
	missingRequiredDocumentCount: number;
	organizationId: string;
	outstandingPolicyAcknowledgementCount: number;
	workEligibilityAtRisk: boolean;
}

export interface IdempotentEmployeeDocumentRecord {
	createRequestFingerprint: string;
	document: EmployeeDocument;
}

export interface IdempotentWorkEligibilityRecord {
	createRequestFingerprint: string;
	eligibility: WorkEligibility;
}

export interface IdempotentPolicyAcknowledgementRecord {
	acknowledgement: PolicyAcknowledgement;
	createRequestFingerprint: string;
}

export interface Competency {
	category: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	description: string | null;
	id: HumanResourcesCompetencyId;
	name: string;
	organizationId: string;
	scaleCode: CompetencyScaleCode;
	status: CompetencyStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CompetencyListPage {
	competencies: Competency[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface JobCompetency {
	competencyId: HumanResourcesCompetencyId;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesJobCompetencyId;
	jobId: HumanResourcesJobId;
	organizationId: string;
	requiredLevel: number;
	status: JobCompetencyStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface JobCompetencyListPage {
	jobCompetencies: JobCompetency[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface CompetencyAssessment {
	assessorUserId: string;
	competencyId: HumanResourcesCompetencyId;
	createdAt: Date;
	createdBy: string;
	effectiveOn: string;
	employeeId: HumanResourcesEmployeeId;
	evidenceSource: string;
	expiresOn: string | null;
	id: HumanResourcesCompetencyAssessmentId;
	level: number;
	organizationId: string;
	scaleCode: CompetencyScaleCode;
	status: CompetencyAssessmentStatus;
	supersededByAssessmentId: HumanResourcesCompetencyAssessmentId | null;
	supersedesAssessmentId: HumanResourcesCompetencyAssessmentId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmployeeCompetencyProfile {
	assessments: CompetencyAssessment[];
	employeeId: HumanResourcesEmployeeId;
	organizationId: string;
}

export interface TalentProfile {
	createdAt: Date;
	createdBy: string;
	currentClassification: string | null;
	employeeId: HumanResourcesEmployeeId;
	id: HumanResourcesTalentProfileId;
	organizationId: string;
	status: TalentProfileStatus;
	summary: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TalentProfileAssessment {
	assessorUserId: string;
	classification: string;
	confirmedAt: Date | null;
	createdAt: Date;
	createdBy: string;
	evidenceSummary: string;
	id: HumanResourcesTalentProfileAssessmentId;
	methodCode: TalentProfileAssessmentMethodCode;
	organizationId: string;
	status: TalentProfileAssessmentStatus;
	talentProfileId: HumanResourcesTalentProfileId;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TalentProfileMobility {
	createdAt: Date;
	createdBy: string;
	dimension: TalentMobilityDimension;
	effectiveFrom: string;
	effectiveTo: string | null;
	evidenceSummary: string;
	id: HumanResourcesTalentProfileMobilityId;
	organizationId: string;
	preferenceCode: TalentMobilityPreference;
	scopeDetail: string | null;
	status: TalentProfileMobilityStatus;
	talentProfileId: HumanResourcesTalentProfileId;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TalentCriticalRoleReadiness {
	assessorUserId: string;
	createdAt: Date;
	createdBy: string;
	evidenceSummary: string;
	id: HumanResourcesTalentCriticalRoleReadinessId;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	readiness: SuccessionReadinessCode;
	readinessEffectiveOn: string;
	status: TalentCriticalRoleReadinessStatus;
	talentProfileId: HumanResourcesTalentProfileId;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TalentPool {
	code: string;
	createdAt: Date;
	createdBy: string;
	description: string | null;
	id: HumanResourcesTalentPoolId;
	name: string;
	organizationId: string;
	status: TalentPoolStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TalentPoolMember {
	approvedAt: Date | null;
	approverUserId: string | null;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	id: HumanResourcesTalentPoolMemberId;
	nominatedAt: Date;
	nominatorUserId: string;
	organizationId: string;
	poolId: HumanResourcesTalentPoolId;
	removedAt: Date | null;
	status: TalentPoolMemberStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TalentPoolMemberListPage {
	members: TalentPoolMember[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface TalentProfileMobilityListPage {
	mobilities: TalentProfileMobility[];
}

export interface TalentCriticalRoleReadinessListPage {
	readinessRecords: TalentCriticalRoleReadiness[];
}

export interface TalentProfileAssessmentListPage {
	assessments: TalentProfileAssessment[];
}

export interface CareerPlan {
	acknowledgedAt: Date | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	id: HumanResourcesCareerPlanId;
	organizationId: string;
	ownerUserId: string;
	status: CareerPlanStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface CareerPlanAction {
	careerPlanId: HumanResourcesCareerPlanId;
	createdAt: Date;
	createdBy: string;
	dueOn: string | null;
	id: HumanResourcesCareerPlanActionId;
	learningAssignmentId: HumanResourcesLearningAssignmentId | null;
	organizationId: string;
	status: CareerPlanActionStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export type CareerPlanWithActions = CareerPlan & {
	actions: CareerPlanAction[];
};

export interface CareerPlanListPage {
	careerPlans: CareerPlan[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface SuccessionPlan {
	allowsExternalCandidates: boolean;
	code: string;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesSuccessionPlanId;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	status: SuccessionPlanStatus;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface SuccessionPlanListPage {
	page: number;
	pageSize: number;
	successionPlans: SuccessionPlan[];
	totalCount: number;
}

export interface SuccessionCandidate {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId | null;
	evidenceSummary: string;
	externalCandidateRef: string | null;
	id: HumanResourcesSuccessionCandidateId;
	nominatorUserId: string;
	organizationId: string;
	readiness: SuccessionReadinessCode;
	readinessEffectiveOn: string;
	status: SuccessionCandidateStatus;
	successionPlanId: HumanResourcesSuccessionPlanId;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface SuccessionCandidateListPage {
	candidates: SuccessionCandidate[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface PositionSuccessionCoverage {
	organizationId: string;
	positionId: HumanResourcesPositionId;
	readyNowCandidateCount: number;
	readySoonCandidateCount: number;
	successionPlans: SuccessionPlan[];
	totalActiveCandidateCount: number;
}

export interface IdempotentCompetencyRecord {
	competency: Competency;
	createRequestFingerprint: string;
}

export interface IdempotentCompetencyAssessmentRecord {
	assessment: CompetencyAssessment;
	createRequestFingerprint: string;
}

export interface IdempotentTalentProfileRecord {
	createRequestFingerprint: string;
	profile: TalentProfile;
}

export interface IdempotentTalentPoolRecord {
	createRequestFingerprint: string;
	pool: TalentPool;
}

export interface IdempotentTalentPoolMemberRecord {
	createRequestFingerprint: string;
	member: TalentPoolMember;
}

export interface IdempotentTalentProfileMobilityRecord {
	createRequestFingerprint: string;
	mobility: TalentProfileMobility;
}

export interface IdempotentTalentCriticalRoleReadinessRecord {
	createRequestFingerprint: string;
	readiness: TalentCriticalRoleReadiness;
}

export interface IdempotentCareerPlanRecord {
	careerPlan: CareerPlan;
	createRequestFingerprint: string;
}

export interface IdempotentSuccessionPlanRecord {
	createRequestFingerprint: string;
	successionPlan: SuccessionPlan;
}

export interface IdempotentSuccessionCandidateRecord {
	candidate: SuccessionCandidate;
	createRequestFingerprint: string;
}

// Time Management Types
export interface WorkWeekDayPatternJson {
	dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	isWorkingDay: boolean;
	standardEndTime: string | null;
	standardMinutes: number | null;
	standardStartTime: string | null;
}

export type WorkCalendarDateOverrideKind =
	| "holiday"
	| "half_day"
	| "shortened_day"
	| "replacement_workday"
	| "closure";

export interface WorkCalendar {
	calendarVersion: string;
	code: string;
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	id: HumanResourcesWorkCalendarId;
	name: string;
	organizationId: string;
	standardHoursPerDay: string;
	status: "active" | "superseded" | "archived";
	supersedesCalendarId: HumanResourcesWorkCalendarId | null;
	timezone: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	workWeek: readonly WorkWeekDayPatternJson[];
}

export interface WorkCalendarHolidayRecord {
	calendarId: HumanResourcesWorkCalendarId;
	createdAt: Date;
	createdBy: string;
	expectedMinutes: number | null;
	holidayDate: string;
	id: HumanResourcesWorkCalendarHolidayId;
	isWorkingDay: boolean;
	jurisdiction: string | null;
	label: string | null;
	locationCode: string | null;
	organizationId: string;
	overrideKind: WorkCalendarDateOverrideKind;
	updatedAt: Date;
	updatedBy: string;
}

export interface EmploymentCalendarAssignment {
	calendarId: HumanResourcesWorkCalendarId;
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesEmploymentCalendarAssignmentId;
	jurisdiction: string | null;
	locationCode: string | null;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export type WorkCalendarScopeType =
	| "employment"
	| "employee"
	| "location"
	| "department"
	| "legal_entity"
	| "organization";

export interface WorkCalendarScopeAssignment {
	calendarId: HumanResourcesWorkCalendarId;
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	id: HumanResourcesWorkCalendarScopeAssignmentId;
	organizationId: string;
	scopeKey: string;
	scopeType: WorkCalendarScopeType;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

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

export interface TimePolicy {
	approvalSteps: readonly TimeApprovalAuthority[];
	automaticBreakAfterMinutes: number | null;
	automaticBreakMinutes: number;
	code: string;
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	id: HumanResourcesTimePolicyId;
	minimumRestMinutes: number;
	name: string;
	organizationId: string;
	status: TimePolicyStatus;
	supersedesPolicyId: HumanResourcesTimePolicyId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TimePolicyAssignment {
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	employmentId: HumanResourcesEmploymentId;
	id: HumanResourcesTimePolicyAssignmentId;
	organizationId: string;
	policyId: HumanResourcesTimePolicyId;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TimeApprovalAuthorityAssignment {
	actorUserId: string;
	authority: TimeApprovalAuthority;
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	id: HumanResourcesTimeApprovalAuthorityAssignmentId;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export type ShiftStatus = "draft" | "active" | "superseded" | "inactive";

export interface Shift {
	code: string;
	createdAt: Date;
	createdBy: string;
	earliestClockInLocal: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	endLocal: string;
	expectedMinutes: number;
	graceEarlyMinutes: number;
	graceLateMinutes: number;
	id: HumanResourcesShiftId;
	isOvernight: boolean;
	latestClockOutLocal: string | null;
	locationKey: string | null;
	maxDurationMinutes: number | null;
	minDurationMinutes: number | null;
	name: string;
	organizationId: string;
	overtimeEligible: boolean;
	shiftKind: ShiftKind;
	startLocal: string;
	status: ShiftStatus;
	supersedesShiftId: HumanResourcesShiftId | null;
	timezone: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface ShiftBreak {
	breakOrder: number;
	createdAt: Date;
	durationMinutes: number;
	id: HumanResourcesShiftBreakId;
	isPaid: boolean;
	label: string | null;
	organizationId: string;
	shiftId: HumanResourcesShiftId;
	startOffsetMinutes: number | null;
	updatedAt: Date;
}

export type ShiftAssignmentPublicationStatus =
	| "planned"
	| "published"
	| "changed"
	| "cancelled"
	| "completed";

export interface ShiftAssignment {
	assignmentSource: string;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	endsAt: Date;
	id: HumanResourcesShiftAssignmentId;
	locationKey: string | null;
	organizationId: string;
	publicationStatus: ShiftAssignmentPublicationStatus;
	scheduledDate: string;
	shiftId: HumanResourcesShiftId;
	startsAt: Date;
	timezone: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface ShiftAssignmentSegment {
	assignmentId: HumanResourcesShiftAssignmentId;
	createdAt: Date;
	endsAt: Date;
	id: HumanResourcesShiftAssignmentSegmentId;
	organizationId: string;
	segmentOrder: number;
	startsAt: Date;
	updatedAt: Date;
}

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

export interface AttendanceEvent {
	capturedNotes: string | null;
	capturedOccurredAt: Date | null;
	createdAt: Date;
	createdBy: string;
	deviceMetadata: Record<string, unknown> | null;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	eventType: AttendanceEventType;
	id: HumanResourcesAttendanceEventId;
	localWorkDate: string;
	locationKey: string | null;
	notes: string | null;
	occurredAt: Date;
	organizationId: string;
	payloadChecksum: string | null;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
	source: AttendanceEventSource;
	sourceReference: string | null;
	sourceSequence: number;
	sourceTimezone: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	voidedAt: Date | null;
	voidReason: string | null;
}

export interface AttendanceAdjustment {
	actorUserId: string;
	adjustmentReason: string;
	correlationId: string | null;
	createdAt: Date;
	eventId: HumanResourcesAttendanceEventId;
	eventVersionAfter: number | null;
	eventVersionBefore: number | null;
	evidenceReference: string | null;
	id: HumanResourcesAttendanceAdjustmentId;
	newNotes: string | null;
	newOccurredAt: Date;
	organizationId: string;
	previousNotes: string | null;
	previousOccurredAt: Date;
	sequence: number | null;
}

export type AttendanceImportBatchStatus = "completed" | "partial" | "failed";

export interface AttendanceImportAcceptedRow {
	eventId: HumanResourcesAttendanceEventId;
	rowIndex: number;
	sourceReference: string;
}

export interface AttendanceImportSkippedRow {
	eventId: HumanResourcesAttendanceEventId;
	reason: "already_imported";
	rowIndex: number;
	sourceReference: string;
}

export interface AttendanceImportRejectedRow {
	errorCode: string;
	errorMessage: string;
	rowIndex: number;
	sourceReference: string | null;
}

export interface AttendanceImportResult {
	accepted: readonly AttendanceImportAcceptedRow[];
	batchId: string;
	importBatchId: string;
	nextCursor?: string | undefined;
	rejected: readonly AttendanceImportRejectedRow[];
	skipped: readonly AttendanceImportSkippedRow[];
	sourceKey: string;
	status: AttendanceImportBatchStatus;
	totals: {
		accepted: number;
		skipped: number;
		rejected: number;
	};
}

export interface IdempotentAttendanceImportBatchRecord {
	createRequestFingerprint: string;
	result: AttendanceImportResult;
}

export type AttendanceSessionResolutionStatus =
	| "incomplete"
	| "resolved"
	| "needs_review"
	| "voided";

export interface AttendanceSession {
	breakMinutes: number;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	finalClockOutAt: Date | null;
	firstClockInAt: Date | null;
	grossMinutes: number;
	id: HumanResourcesAttendanceSessionId;
	localWorkDate: string;
	organizationId: string;
	provenance: {
		automaticBreak: {
			policyId: HumanResourcesTimePolicyId;
			minutes: number;
			applied: boolean;
		} | null;
		breakIntervals?:
			| readonly {
					startedAt: string;
					endedAt: string;
			  }[]
			| undefined;
	};
	requiresReview: boolean;
	resolutionStatus: AttendanceSessionResolutionStatus;
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
	timezone: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	workedMinutes: number;
}

export interface AttendanceBreakWaiverDecision {
	actorUserId: string;
	authority: TimeApprovalAuthority;
	authorityAssignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
	automaticBreakMinutes: number;
	correlationId: string;
	createdAt: Date;
	decidedAt: Date;
	evidenceReference: string;
	id: HumanResourcesAttendanceBreakWaiverDecisionId;
	organizationId: string;
	policyId: HumanResourcesTimePolicyId;
	reason: string;
	recordedBreakMinutes: number;
	sessionId: HumanResourcesAttendanceSessionId;
	sessionVersion: number;
}

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

export interface AttendanceException {
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	eventId: HumanResourcesAttendanceEventId | null;
	evidenceReference: string | null;
	exceptionType: AttendanceExceptionType;
	id: HumanResourcesAttendanceExceptionId;
	organizationId: string;
	remarks: string | null;
	resolution: string | null;
	reviewerUserId: string | null;
	reviewStatus: "open" | "in_review" | "excused" | "rejected" | "resolved";
	sessionId: HumanResourcesAttendanceSessionId | null;
	severity: "info" | "warning" | "critical";
	shiftAssignmentId: HumanResourcesShiftAssignmentId | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface DailyAttendanceSummary {
	breakMinutes: number;
	employeeId: HumanResourcesEmployeeId;
	events: AttendanceEvent[];
	localWorkDate: string;
	organizationId: string;
	scheduledAssignment: ShiftAssignment | null;
	session: AttendanceSession | null;
	timezone: string;
	unresolvedExceptions: AttendanceException[];
	workedMinutes: number;
}

export interface TimesheetTotals {
	entryCount: number;
	timesheetId: HumanResourcesTimesheetId;
	totalApprovedMinutes: number;
	totalRecordedMinutes: number;
}

export type TimesheetStatus =
	| "draft"
	| "submitted"
	| "returned"
	| "approved"
	| "rejected"
	| "locked"
	| "superseded";

export interface Timesheet {
	approvalPolicyId: HumanResourcesTimePolicyId | null;
	approvedAt: Date | null;
	approvedBy: string | null;
	approverNotes: string | null;
	completedApprovalSteps: number;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	id: HumanResourcesTimesheetId;
	lockedAt: Date | null;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	rejectionReason: string | null;
	requiredApprovalSteps: readonly TimeApprovalAuthority[];
	status: TimesheetStatus;
	submissionReference: string | null;
	submittedAt: Date | null;
	totalApprovedMinutes: number;
	totalRecordedMinutes: number;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TimesheetApprovalDecision {
	actorUserId: string;
	authority: TimeApprovalAuthority;
	authorityAssignmentId: HumanResourcesTimeApprovalAuthorityAssignmentId;
	comment: string | null;
	correlationId: string;
	createdAt: Date;
	decidedAt: Date;
	id: HumanResourcesTimesheetApprovalDecisionId;
	organizationId: string;
	policyId: HumanResourcesTimePolicyId | null;
	stepIndex: number;
	submissionReference: string;
	timesheetId: HumanResourcesTimesheetId;
	versionApproved: number;
}

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

export interface TimesheetEntry {
	approvalReference: string | null;
	approvedMinutes: number;
	costCenterId: string | null;
	createdAt: Date;
	createdBy: string;
	departmentId: string | null;
	employeeId: HumanResourcesEmployeeId;
	endedAt: Date | null;
	evidenceReference: string | null;
	id: HumanResourcesTimesheetEntryId;
	locationId: string | null;
	organizationId: string;
	projectId: string | null;
	recordedMinutes: number;
	sourceReference: string | null;
	sourceType: TimesheetEntrySourceType;
	startedAt: Date | null;
	timesheetId: HumanResourcesTimesheetId;
	timeType: TimesheetEntryTimeType;
	timezone: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	workDate: string;
}

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

export interface OvertimeRequest {
	actualMinutes: number | null;
	approvedMaximumMinutes: number | null;
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	evidenceReference: string | null;
	id: HumanResourcesOvertimeRequestId;
	organizationId: string;
	overtimeType: OvertimeType;
	payrollApprovedMinutes: number | null;
	reason: string;
	requestedEndsAt: Date;
	requestedMinutes: number;
	requestedStartsAt: Date;
	status: OvertimeRequestStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

/**
 * Approved payroll handoff minute aggregates for a locked timesheet.
 * Does not carry timezone — read underlying `TimesheetEntry.timezone` / employment calendar for
 * display timezone. Stored attendance instants remain UTC.
 */
export interface ApprovedTimeHandoff {
	approvalReference: string;
	approvedAt: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId | null;
	nightMinutes: number;
	organizationId: string;
	overtime: readonly {
		type: OvertimeType;
		minutes: number;
		payrollApprovedMinutes?: number | null;
	}[];
	paidLeaveMinutes: number;
	periodEnd: string;
	periodStart: string;
	publicHolidayMinutes: number;
	regularMinutes: number;
	restDayMinutes: number;
	timesheetId: HumanResourcesTimesheetId;
	timesheetVersion: number;
	unpaidLeaveMinutes: number;
	unpaidMinutes: number;
}

export interface IdempotentShiftRecord {
	createRequestFingerprint: string;
	shift: Shift;
}

export interface IdempotentAttendanceEventRecord {
	createRequestFingerprint: string;
	event: AttendanceEvent;
}

export interface IdempotentAttendanceSessionRecord {
	createRequestFingerprint: string;
	session: AttendanceSession;
}

export type IdempotentAttendanceRecordRecord =
	IdempotentAttendanceSessionRecord;

export interface IdempotentTimesheetRecord {
	createRequestFingerprint: string;
	timesheet: Timesheet;
}

export interface IdempotentOvertimeRequestRecord {
	createRequestFingerprint: string;
	request: OvertimeRequest;
}

export interface IdempotentShiftAssignmentRecord {
	assignment: ShiftAssignment;
	createRequestFingerprint: string;
}

export interface IdempotentWorkCalendarRecord {
	calendar: WorkCalendar;
	createRequestFingerprint: string;
}

export interface ShiftCreateRecord {
	code: string;
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	earliestClockInLocal: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	endLocal: string;
	expectedMinutes: number;
	graceEarlyMinutes: number;
	graceLateMinutes: number;
	idempotencyKey: string;
	isOvernight: boolean;
	latestClockOutLocal: string | null;
	locationKey: string | null;
	maxDurationMinutes: number | null;
	minDurationMinutes: number | null;
	name: string;
	organizationId: string;
	overtimeEligible: boolean;
	shiftKind: ShiftKind;
	startLocal: string;
	timezone: string | null;
}

export interface AttendanceEventRecordInput {
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	deviceMetadata?: Record<string, unknown> | null | undefined;
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null | undefined;
	eventType: AttendanceEventType;
	idempotencyKey: string;
	localWorkDate: string;
	locationKey?: string | null | undefined;
	notes?: string | null | undefined;
	occurredAt: Date;
	organizationId: string;
	payloadChecksum?: string | null | undefined;
	shiftAssignmentId?: HumanResourcesShiftAssignmentId | null | undefined;
	source: AttendanceEventSource;
	sourceReference?: string | null | undefined;
	sourceSequence?: number | undefined;
	sourceTimezone: string;
}

export interface AttendanceImportEventRowInput {
	deviceMetadata?: Record<string, unknown> | null | undefined;
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null | undefined;
	eventType: AttendanceEventType;
	localWorkDate: string;
	locationKey?: string | null | undefined;
	notes?: string | null | undefined;
	occurredAt: Date;
	payloadChecksum?: string | null | undefined;
	shiftAssignmentId?: HumanResourcesShiftAssignmentId | null | undefined;
	sourceReference: string;
	sourceSequence?: number | undefined;
	sourceTimezone: string;
}

export interface AttendanceImportBatchInput {
	batchId: string;
	correlationId?: string | undefined;
	createdBy: string;
	createRequestFingerprint: string;
	events: readonly AttendanceImportEventRowInput[];
	idempotencyKey: string;
	nextCursor?: string | undefined;
	organizationId: string;
	sourceKey: string;
}

export interface AttendanceSessionResolveInput {
	automaticBreakPolicy: {
		policyId: HumanResourcesTimePolicyId;
		afterMinutes: number;
		deductionMinutes: number;
	} | null;
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	idempotencyKey: string;
	localWorkDate: string;
	organizationId: string;
	timezone: string;
}

export type AttendanceRecordGenerateInput = AttendanceSessionResolveInput;

export interface TimesheetCreateRecord {
	correlationId: string;
	createdBy: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId?: HumanResourcesEmploymentId | null;
	idempotencyKey: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
}
