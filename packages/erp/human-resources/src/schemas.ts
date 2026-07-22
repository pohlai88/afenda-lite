import { z } from "zod";

import {
	humanResourcesApplicationIdSchema,
	humanResourcesAssignmentIdSchema,
	humanResourcesBenefitEnrollmentIdSchema,
	humanResourcesBenefitPlanIdSchema,
	humanResourcesCandidateIdSchema,
	humanResourcesCareerPlanActionIdSchema,
	humanResourcesCareerPlanIdSchema,
	humanResourcesCertificationIdSchema,
	humanResourcesClearanceIdSchema,
	humanResourcesCompensationGradeIdSchema,
	humanResourcesCompensationReviewIdSchema,
	humanResourcesCompetencyAssessmentIdSchema,
	humanResourcesCompetencyIdSchema,
	humanResourcesCompletionIdSchema,
	humanResourcesCourseIdSchema,
	humanResourcesDepartmentIdSchema,
	humanResourcesEmployeeCompensationIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentConfirmationIdSchema,
	humanResourcesEmploymentContractIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesGoalIdSchema,
	humanResourcesHeadcountPlanIdSchema,
	humanResourcesHeadcountPlanLineIdSchema,
	humanResourcesHeadcountReservationIdSchema,
	humanResourcesImprovementPlanIdSchema,
	humanResourcesInterviewIdSchema,
	humanResourcesJobCompetencyIdSchema,
	humanResourcesJobIdSchema,
	humanResourcesLearningAssignmentIdSchema,
	humanResourcesLeaveAdjustmentIdSchema,
	humanResourcesLeaveEntitlementIdSchema,
	humanResourcesLeavePolicyIdSchema,
	humanResourcesLeaveRequestIdSchema,
	humanResourcesOffboardingCaseIdSchema,
	humanResourcesOffboardingTaskIdSchema,
	humanResourcesOfferIdSchema,
	humanResourcesOnboardingCaseIdSchema,
	humanResourcesOnboardingTaskIdSchema,
	humanResourcesPerformanceCycleIdSchema,
	humanResourcesPerformanceCycleParticipantIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesProbationReviewIdSchema,
	humanResourcesReportingLineIdSchema,
	humanResourcesRequisitionIdSchema,
	humanResourcesReviewIdSchema,
	humanResourcesSalaryBandIdSchema,
	humanResourcesSessionIdSchema,
	humanResourcesSuccessionCandidateIdSchema,
	humanResourcesSuccessionPlanIdSchema,
	humanResourcesTalentPoolIdSchema,
	humanResourcesTalentPoolMemberIdSchema,
	humanResourcesTalentProfileAssessmentIdSchema,
	humanResourcesTalentProfileIdSchema,
	humanResourcesTerminationIdSchema,
} from "./brands";
import {
	departmentStatusSchema,
	employmentStatusSchema,
	jobStatusSchema,
	positionStatusSchema,
} from "./shared/employment-status";
import {
	assignmentStatusSchema,
	certificationStatusSchema,
	completionOutcomeSchema,
	courseStatusSchema,
	sessionStatusSchema,
} from "./shared/learning-status";
import {
	dayPortionSchema,
	leavePolicyStatusSchema,
	leaveRequestStatusSchema,
	leaveTypeSchema,
	leaveUnitSchema,
} from "./shared/leave-status";
import {
	lifecycleTaskStatusSchema,
	probationOutcomeSchema,
} from "./shared/lifecycle-status";
import {
	ORGANIZATION_TREE_DEFAULT_MAX_DEPTH,
	ORGANIZATION_TREE_DEFAULT_MAX_NODES,
	ORGANIZATION_TREE_HARD_MAX_DEPTH,
	ORGANIZATION_TREE_HARD_MAX_NODES,
} from "./shared/organization-guards";
import { performanceRatingScaleSchema } from "./shared/performance-rating";
import {
	performanceCycleStatusSchema,
	performanceGoalStatusSchema,
	performanceImprovementPlanStatusSchema,
	performanceReviewStatusSchema,
	performanceWeightingModelSchema,
} from "./shared/performance-status";
import {
	applicationStatusSchema,
	candidateStatusSchema,
	interviewEvaluationResultSchema,
	offerStatusSchema,
	requisitionStatusSchema,
} from "./shared/recruitment-status";
import {
	careerPlanStatusSchema,
	competencyScaleCodeSchema,
	competencyStatusSchema,
	successionCandidateStatusSchema,
	successionPlanStatusSchema,
	successionReadinessCodeSchema,
	talentPoolMemberStatusSchema,
	talentProfileAssessmentMethodCodeSchema,
} from "./shared/talent-status";
import {
	headcountEmploymentTypeSchema,
	headcountPlanStatusSchema,
} from "./shared/workforce-planning-status";

export const humanResourcesOrganizationIdSchema = z.string().trim().min(1);
export const humanResourcesActorUserIdSchema = z.string().trim().min(1);
export const humanResourcesCorrelationIdSchema = z
	.string()
	.trim()
	.min(1)
	.max(128);
export const humanResourcesIdempotencyKeySchema = z
	.string()
	.trim()
	.min(1)
	.max(128);
export const humanResourcesExpectedVersionSchema = z.number().int().positive();

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime({ offset: true });

export const humanResourcesMutationContextSchema = z
	.object({
		organizationId: humanResourcesOrganizationIdSchema,
		actorUserId: humanResourcesActorUserIdSchema,
		correlationId: humanResourcesCorrelationIdSchema,
	})
	.strict();

export type HumanResourcesMutationContext = z.infer<
	typeof humanResourcesMutationContextSchema
>;

/** @deprecated Use `humanResourcesMutationContextSchema`. */
export const humanResourcesTenantContextSchema =
	humanResourcesMutationContextSchema;
export type HumanResourcesTenantContext = HumanResourcesMutationContext;

// Employee schemas
export const createEmployeeInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeNumber: z.string().trim().min(1).max(64),
		legalName: z.string().trim().min(1).max(200),
	})
	.strict();

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

export const updateEmployeeInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		legalName: z.string().trim().min(1).max(200),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

export const getEmployeeByIdInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
	})
	.strict();

export type GetEmployeeByIdInput = z.infer<typeof getEmployeeByIdInputSchema>;

export const listEmployeesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		employeeNumberPrefix: z.string().trim().optional(),
		legalNamePrefix: z.string().trim().optional(),
		employmentStatus: employmentStatusSchema.optional(),
	})
	.strict();

export type ListEmployeesInput = z.infer<typeof listEmployeesInputSchema>;

// Employment schemas
export const createEmploymentInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		startsOn: isoDateSchema,
		endsOn: isoDateSchema.nullable().optional(),
	})
	.strict();

export type CreateEmploymentInput = z.infer<typeof createEmploymentInputSchema>;

export const amendEmploymentInputSchema = humanResourcesMutationContextSchema
	.extend({
		employmentId: humanResourcesEmploymentIdSchema,
		status: employmentStatusSchema.optional(),
		startsOn: isoDateSchema.optional(),
		endsOn: isoDateSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type AmendEmploymentInput = z.infer<typeof amendEmploymentInputSchema>;

export const getEmploymentInputSchema = humanResourcesMutationContextSchema
	.extend({
		employmentId: humanResourcesEmploymentIdSchema,
	})
	.strict();

export type GetEmploymentInput = z.infer<typeof getEmploymentInputSchema>;

// Employment Contract schemas
export const createEmploymentContractInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentId: humanResourcesEmploymentIdSchema,
			referenceCode: z.string().trim().min(1).max(64),
			startsOn: isoDateSchema,
			endsOn: isoDateSchema.nullable().optional(),
		})
		.strict();

export type CreateEmploymentContractInput = z.infer<
	typeof createEmploymentContractInputSchema
>;

export const getEmploymentContractInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentContractId: humanResourcesEmploymentContractIdSchema,
		})
		.strict();

export type GetEmploymentContractInput = z.infer<
	typeof getEmploymentContractInputSchema
>;

// Department schemas
export const createDepartmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		parentDepartmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
		status: departmentStatusSchema.optional(),
	})
	.strict();

export type CreateDepartmentInput = z.infer<typeof createDepartmentInputSchema>;

export const updateDepartmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		departmentId: humanResourcesDepartmentIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		parentDepartmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentInputSchema>;

export const departmentStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			departmentId: humanResourcesDepartmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type DepartmentStatusTransitionInput = z.infer<
	typeof departmentStatusTransitionInputSchema
>;

export const getDepartmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		departmentId: humanResourcesDepartmentIdSchema,
	})
	.strict();

export type GetDepartmentInput = z.infer<typeof getDepartmentInputSchema>;

export const listDepartmentsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: departmentStatusSchema.optional(),
		parentDepartmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
	})
	.strict();

export type ListDepartmentsInput = z.infer<typeof listDepartmentsInputSchema>;

// Job schemas
export const createJobInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		status: jobStatusSchema.optional(),
	})
	.strict();

export type CreateJobInput = z.infer<typeof createJobInputSchema>;

export const updateJobInputSchema = humanResourcesMutationContextSchema
	.extend({
		jobId: humanResourcesJobIdSchema,
		title: z.string().trim().min(1).max(200),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateJobInput = z.infer<typeof updateJobInputSchema>;

export const jobStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			jobId: humanResourcesJobIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type JobStatusTransitionInput = z.infer<
	typeof jobStatusTransitionInputSchema
>;

export const getJobInputSchema = humanResourcesMutationContextSchema
	.extend({
		jobId: humanResourcesJobIdSchema,
	})
	.strict();

export type GetJobInput = z.infer<typeof getJobInputSchema>;

export const listJobsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: jobStatusSchema.optional(),
	})
	.strict();

export type ListJobsInput = z.infer<typeof listJobsInputSchema>;

// Position schemas
export const createPositionInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		departmentId: humanResourcesDepartmentIdSchema,
		jobId: humanResourcesJobIdSchema,
		status: positionStatusSchema.optional(),
	})
	.strict();

export type CreatePositionInput = z.infer<typeof createPositionInputSchema>;

export const updatePositionInputSchema = humanResourcesMutationContextSchema
	.extend({
		positionId: humanResourcesPositionIdSchema,
		title: z.string().trim().min(1).max(200).optional(),
		departmentId: humanResourcesDepartmentIdSchema.optional(),
		jobId: humanResourcesJobIdSchema.optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdatePositionInput = z.infer<typeof updatePositionInputSchema>;

export const positionStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			positionId: humanResourcesPositionIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type PositionStatusTransitionInput = z.infer<
	typeof positionStatusTransitionInputSchema
>;

export const getPositionInputSchema = humanResourcesMutationContextSchema
	.extend({
		positionId: humanResourcesPositionIdSchema,
	})
	.strict();

export type GetPositionInput = z.infer<typeof getPositionInputSchema>;

export const listPositionsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: positionStatusSchema.optional(),
		departmentId: humanResourcesDepartmentIdSchema.optional(),
		jobId: humanResourcesJobIdSchema.optional(),
	})
	.strict();

export type ListPositionsInput = z.infer<typeof listPositionsInputSchema>;

// Assignment schemas
export const createAssignmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		employmentId: humanResourcesEmploymentIdSchema,
		positionId: humanResourcesPositionIdSchema,
		startsOn: isoDateSchema,
		endsOn: isoDateSchema.nullable().optional(),
	})
	.strict();

export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

export const endAssignmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		assignmentId: humanResourcesAssignmentIdSchema,
		endsOn: isoDateSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type EndAssignmentInput = z.infer<typeof endAssignmentInputSchema>;

export const getAssignmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		assignmentId: humanResourcesAssignmentIdSchema,
	})
	.strict();

export type GetAssignmentInput = z.infer<typeof getAssignmentInputSchema>;

// Reporting line schemas
export const assignPrimaryReportingLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			startsOn: isoDateSchema,
			endsOn: isoDateSchema.nullable().optional(),
		})
		.strict();

export type AssignPrimaryReportingLineInput = z.infer<
	typeof assignPrimaryReportingLineInputSchema
>;

export const closeReportingLineInputSchema = humanResourcesMutationContextSchema
	.extend({
		reportingLineId: humanResourcesReportingLineIdSchema,
		endsOn: isoDateSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CloseReportingLineInput = z.infer<
	typeof closeReportingLineInputSchema
>;

export const replacePrimaryReportingLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			startsOn: isoDateSchema,
			endsOn: isoDateSchema.nullable().optional(),
			closePriorOn: isoDateSchema.optional(),
		})
		.strict();

export type ReplacePrimaryReportingLineInput = z.infer<
	typeof replacePrimaryReportingLineInputSchema
>;

export const resolvePrimaryManagerInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			asOf: isoDateSchema.optional(),
		})
		.strict();

export type ResolvePrimaryManagerInput = z.infer<
	typeof resolvePrimaryManagerInputSchema
>;

export const listDirectReportsInputSchema = humanResourcesMutationContextSchema
	.extend({
		managerEmployeeId: humanResourcesEmployeeIdSchema,
		asOf: isoDateSchema.optional(),
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
	})
	.strict();

export type ListDirectReportsInput = z.infer<
	typeof listDirectReportsInputSchema
>;

export const organizationTreeInputSchema = humanResourcesMutationContextSchema
	.extend({
		rootDepartmentId: humanResourcesDepartmentIdSchema.optional(),
		maxDepth: z
			.number()
			.int()
			.positive()
			.max(ORGANIZATION_TREE_HARD_MAX_DEPTH)
			.optional()
			.default(ORGANIZATION_TREE_DEFAULT_MAX_DEPTH),
		maxNodes: z
			.number()
			.int()
			.positive()
			.max(ORGANIZATION_TREE_HARD_MAX_NODES)
			.optional()
			.default(ORGANIZATION_TREE_DEFAULT_MAX_NODES),
	})
	.strict();

export type OrganizationTreeInput = z.infer<typeof organizationTreeInputSchema>;

// Requisition schemas
export const createDraftRequisitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			jobId: humanResourcesJobIdSchema.nullable().optional(),
			positionId: humanResourcesPositionIdSchema.nullable().optional(),
			departmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
		})
		.strict();

export type CreateDraftRequisitionInput = z.infer<
	typeof createDraftRequisitionInputSchema
>;

export const amendRequisitionInputSchema = humanResourcesMutationContextSchema
	.extend({
		requisitionId: humanResourcesRequisitionIdSchema,
		title: z.string().trim().min(1).max(200).optional(),
		jobId: humanResourcesJobIdSchema.nullable().optional(),
		positionId: humanResourcesPositionIdSchema.nullable().optional(),
		departmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type AmendRequisitionInput = z.infer<typeof amendRequisitionInputSchema>;

export const requisitionStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requisitionId: humanResourcesRequisitionIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RequisitionStatusTransitionInput = z.infer<
	typeof requisitionStatusTransitionInputSchema
>;

export const getRequisitionInputSchema = humanResourcesMutationContextSchema
	.extend({
		requisitionId: humanResourcesRequisitionIdSchema,
	})
	.strict();

export type GetRequisitionInput = z.infer<typeof getRequisitionInputSchema>;

export const listRequisitionsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: requisitionStatusSchema.optional(),
	})
	.strict();

export type ListRequisitionsInput = z.infer<typeof listRequisitionsInputSchema>;

// Candidate schemas
export const createCandidateInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		displayName: z.string().trim().min(1).max(200),
		email: z.string().trim().email().max(320),
		phone: z.string().trim().min(1).max(40).nullable().optional(),
	})
	.strict();

export type CreateCandidateInput = z.infer<typeof createCandidateInputSchema>;

export const updateCandidateProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesCandidateIdSchema,
			displayName: z.string().trim().min(1).max(200).optional(),
			phone: z.string().trim().min(1).max(40).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateCandidateProfileInput = z.infer<
	typeof updateCandidateProfileInputSchema
>;

export const getCandidateInputSchema = humanResourcesMutationContextSchema
	.extend({
		candidateId: humanResourcesCandidateIdSchema,
	})
	.strict();

export type GetCandidateInput = z.infer<typeof getCandidateInputSchema>;

export const listCandidatesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: candidateStatusSchema.optional(),
	})
	.strict();

export type ListCandidatesInput = z.infer<typeof listCandidatesInputSchema>;

// Application schemas
export const createApplicationInputSchema = humanResourcesMutationContextSchema
	.extend({
		candidateId: humanResourcesCandidateIdSchema,
		requisitionId: humanResourcesRequisitionIdSchema,
	})
	.strict();

export type CreateApplicationInput = z.infer<
	typeof createApplicationInputSchema
>;

export const applicationStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			applicationId: humanResourcesApplicationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApplicationStatusTransitionInput = z.infer<
	typeof applicationStatusTransitionInputSchema
>;

export const getApplicationInputSchema = humanResourcesMutationContextSchema
	.extend({
		applicationId: humanResourcesApplicationIdSchema,
	})
	.strict();

export type GetApplicationInput = z.infer<typeof getApplicationInputSchema>;

export const listApplicationsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: applicationStatusSchema.optional(),
		candidateId: humanResourcesCandidateIdSchema.optional(),
		requisitionId: humanResourcesRequisitionIdSchema.optional(),
	})
	.strict();

export type ListApplicationsInput = z.infer<typeof listApplicationsInputSchema>;

// Interview schemas
export const scheduleInterviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		applicationId: humanResourcesApplicationIdSchema,
		scheduledAt: isoDateTimeSchema,
		interviewerActorId: humanResourcesActorUserIdSchema,
	})
	.strict();

export type ScheduleInterviewInput = z.infer<
	typeof scheduleInterviewInputSchema
>;

export const cancelInterviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		interviewId: humanResourcesInterviewIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CancelInterviewInput = z.infer<typeof cancelInterviewInputSchema>;

export const recordInterviewEvaluationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			interviewId: humanResourcesInterviewIdSchema,
			result: interviewEvaluationResultSchema,
			privateNotes: z.string().trim().max(4000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordInterviewEvaluationInput = z.infer<
	typeof recordInterviewEvaluationInputSchema
>;

export const getInterviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		interviewId: humanResourcesInterviewIdSchema,
	})
	.strict();

export type GetInterviewInput = z.infer<typeof getInterviewInputSchema>;

export const listInterviewsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		applicationId: humanResourcesApplicationIdSchema.optional(),
	})
	.strict();

export type ListInterviewsInput = z.infer<typeof listInterviewsInputSchema>;

export const getInterviewEvaluationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			interviewId: humanResourcesInterviewIdSchema,
		})
		.strict();

export type GetInterviewEvaluationInput = z.infer<
	typeof getInterviewEvaluationInputSchema
>;

// Offer schemas
export const createOfferInputSchema = humanResourcesMutationContextSchema
	.extend({
		applicationId: humanResourcesApplicationIdSchema,
		termsSummary: z.string().trim().min(1).max(2000),
		expiresOn: isoDateSchema,
	})
	.strict();

export type CreateOfferInput = z.infer<typeof createOfferInputSchema>;

export const amendOfferDraftInputSchema = humanResourcesMutationContextSchema
	.extend({
		offerId: humanResourcesOfferIdSchema,
		termsSummary: z.string().trim().min(1).max(2000).optional(),
		expiresOn: isoDateSchema.optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type AmendOfferDraftInput = z.infer<typeof amendOfferDraftInputSchema>;

export const offerStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offerId: humanResourcesOfferIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type OfferStatusTransitionInput = z.infer<
	typeof offerStatusTransitionInputSchema
>;

export const acceptOfferInputSchema = humanResourcesMutationContextSchema
	.extend({
		offerId: humanResourcesOfferIdSchema,
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
		asOfDate: isoDateSchema.optional(),
	})
	.strict();

export type AcceptOfferInput = z.infer<typeof acceptOfferInputSchema>;

export const getOfferInputSchema = humanResourcesMutationContextSchema
	.extend({
		offerId: humanResourcesOfferIdSchema,
	})
	.strict();

export type GetOfferInput = z.infer<typeof getOfferInputSchema>;

export const listOffersInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: offerStatusSchema.optional(),
		applicationId: humanResourcesApplicationIdSchema.optional(),
	})
	.strict();

export type ListOffersInput = z.infer<typeof listOffersInputSchema>;

// Lifecycle task schema (reused for onboarding and offboarding)
const lifecycleTaskSeedSchema = z
	.object({
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		mandatory: z.boolean(),
	})
	.strict();

// Onboarding schemas
export const startOnboardingInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		sourceOfferId: humanResourcesOfferIdSchema.nullable().optional(),
		tasks: z.array(lifecycleTaskSeedSchema).min(1),
	})
	.strict();

export type StartOnboardingInput = z.infer<typeof startOnboardingInputSchema>;

export const completeOnboardingTaskInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			taskId: humanResourcesOnboardingTaskIdSchema,
			status: lifecycleTaskStatusSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CompleteOnboardingTaskInput = z.infer<
	typeof completeOnboardingTaskInputSchema
>;

export const completeOnboardingInputSchema = humanResourcesMutationContextSchema
	.extend({
		onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CompleteOnboardingInput = z.infer<
	typeof completeOnboardingInputSchema
>;

export const listOnboardingTasksInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
		})
		.strict();

export type ListOnboardingTasksInput = z.infer<
	typeof listOnboardingTasksInputSchema
>;

export const getOnboardingCaseInputSchema = humanResourcesMutationContextSchema
	.extend({
		onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
	})
	.strict();

export type GetOnboardingCaseInput = z.infer<
	typeof getOnboardingCaseInputSchema
>;

// Probation schemas
export const openProbationInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		startsOn: isoDateSchema,
		endsOn: isoDateSchema,
	})
	.strict();

export type OpenProbationInput = z.infer<typeof openProbationInputSchema>;

export const extendProbationInputSchema = humanResourcesMutationContextSchema
	.extend({
		probationReviewId: humanResourcesProbationReviewIdSchema,
		newEndsOn: isoDateSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ExtendProbationInput = z.infer<typeof extendProbationInputSchema>;

export const recordProbationOutcomeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			probationReviewId: humanResourcesProbationReviewIdSchema,
			outcome: probationOutcomeSchema,
			outcomeRecordedOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordProbationOutcomeInput = z.infer<
	typeof recordProbationOutcomeInputSchema
>;

export const getProbationReviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		probationReviewId: humanResourcesProbationReviewIdSchema,
	})
	.strict();

export type GetProbationReviewInput = z.infer<
	typeof getProbationReviewInputSchema
>;

// Confirmation schemas
export const confirmEmploymentInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		confirmedOn: isoDateSchema,
		evidenceNote: z.string().trim().min(1).max(2000),
	})
	.strict();

export type ConfirmEmploymentInput = z.infer<
	typeof confirmEmploymentInputSchema
>;

export const getEmploymentConfirmationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentConfirmationId: humanResourcesEmploymentConfirmationIdSchema,
		})
		.strict();

export type GetEmploymentConfirmationInput = z.infer<
	typeof getEmploymentConfirmationInputSchema
>;

// Transfer schemas
export const transferAssignmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		toPositionId: humanResourcesPositionIdSchema,
		effectiveOn: isoDateSchema,
		reason: z.string().trim().min(1).max(500),
	})
	.strict();

export type TransferAssignmentInput = z.infer<
	typeof transferAssignmentInputSchema
>;

// Termination schemas
export const finalizeTerminationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employmentId: humanResourcesEmploymentIdSchema,
			reasonCode: z.string().trim().min(1).max(64),
			reasonDetail: z.string().trim().min(1).max(2000),
			effectiveOn: isoDateSchema,
		})
		.strict();

export type FinalizeTerminationInput = z.infer<
	typeof finalizeTerminationInputSchema
>;

export const getTerminationInputSchema = humanResourcesMutationContextSchema
	.extend({
		terminationId: humanResourcesTerminationIdSchema,
	})
	.strict();

export type GetTerminationInput = z.infer<typeof getTerminationInputSchema>;

// Offboarding schemas
export const startOffboardingInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		terminationId: humanResourcesTerminationIdSchema.nullable().optional(),
		tasks: z.array(lifecycleTaskSeedSchema).min(1),
	})
	.strict();

export type StartOffboardingInput = z.infer<typeof startOffboardingInputSchema>;

export const completeOffboardingTaskInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			taskId: humanResourcesOffboardingTaskIdSchema,
			status: lifecycleTaskStatusSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CompleteOffboardingTaskInput = z.infer<
	typeof completeOffboardingTaskInputSchema
>;

export const recordExitInterviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
			conductedOn: isoDateSchema,
			notes: z.string().trim().min(1).max(4000),
		})
		.strict();

export type RecordExitInterviewInput = z.infer<
	typeof recordExitInterviewInputSchema
>;

export const recordClearanceInputSchema = humanResourcesMutationContextSchema
	.extend({
		clearanceId: humanResourcesClearanceIdSchema,
		clearedOn: isoDateSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type RecordClearanceInput = z.infer<typeof recordClearanceInputSchema>;

export const completeOffboardingInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CompleteOffboardingInput = z.infer<
	typeof completeOffboardingInputSchema
>;

export const getOffboardingCaseInputSchema = humanResourcesMutationContextSchema
	.extend({
		offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
	})
	.strict();

export type GetOffboardingCaseInput = z.infer<
	typeof getOffboardingCaseInputSchema
>;

export const listOffboardingTasksInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
		})
		.strict();

export type ListOffboardingTasksInput = z.infer<
	typeof listOffboardingTasksInputSchema
>;

export const getClearanceByOffboardingCaseInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
		})
		.strict();

export type GetClearanceByOffboardingCaseInput = z.infer<
	typeof getClearanceByOffboardingCaseInputSchema
>;

// Learning Course schemas
export const createCourseInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).nullable().optional(),
		durationHours: z.number().positive().nullable().optional(),
	})
	.strict();

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const updateCourseInputSchema = humanResourcesMutationContextSchema
	.extend({
		courseId: humanResourcesCourseIdSchema,
		title: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		durationHours: z.number().positive().nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

export const courseStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			courseId: humanResourcesCourseIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CourseStatusTransitionInput = z.infer<
	typeof courseStatusTransitionInputSchema
>;

export const getCourseInputSchema = humanResourcesMutationContextSchema
	.extend({
		courseId: humanResourcesCourseIdSchema,
	})
	.strict();

export type GetCourseInput = z.infer<typeof getCourseInputSchema>;

export const listCoursesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: courseStatusSchema.optional(),
	})
	.strict();

export type ListCoursesInput = z.infer<typeof listCoursesInputSchema>;

// Learning Session schemas
export const createSessionInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		courseId: humanResourcesCourseIdSchema,
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		scheduledStartsAt: isoDateTimeSchema,
		scheduledEndsAt: isoDateTimeSchema,
		capacity: z.number().int().positive().nullable().optional(),
	})
	.strict();

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const sessionStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			sessionId: humanResourcesSessionIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
			actualStartsAt: isoDateTimeSchema.optional(),
			actualEndsAt: isoDateTimeSchema.optional(),
		})
		.strict();

export type SessionStatusTransitionInput = z.infer<
	typeof sessionStatusTransitionInputSchema
>;

export const getSessionInputSchema = humanResourcesMutationContextSchema
	.extend({
		sessionId: humanResourcesSessionIdSchema,
	})
	.strict();

export type GetSessionInput = z.infer<typeof getSessionInputSchema>;

export const listSessionsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: sessionStatusSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
	})
	.strict();

export type ListSessionsInput = z.infer<typeof listSessionsInputSchema>;

// Learning Assignment schemas
export const createLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema.optional(),
			employeeId: humanResourcesEmployeeIdSchema,
			courseId: humanResourcesCourseIdSchema,
			sessionId: humanResourcesSessionIdSchema.nullable().optional(),
			dueOn: isoDateSchema.nullable().optional(),
		})
		.strict();

export type CreateLearningAssignmentInput = z.infer<
	typeof createLearningAssignmentInputSchema
>;

export const enrolLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
			sessionId: humanResourcesSessionIdSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EnrolLearningAssignmentInput = z.infer<
	typeof enrolLearningAssignmentInputSchema
>;

export const waiveLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type WaiveLearningAssignmentInput = z.infer<
	typeof waiveLearningAssignmentInputSchema
>;

export const getLearningAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
		})
		.strict();

export type GetLearningAssignmentInput = z.infer<
	typeof getLearningAssignmentInputSchema
>;

export const listLearningAssignmentsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: assignmentStatusSchema.optional(),
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			courseId: humanResourcesCourseIdSchema.optional(),
		})
		.strict();

export type ListLearningAssignmentsInput = z.infer<
	typeof listLearningAssignmentsInputSchema
>;

// Learning Completion schemas
export const recordCompletionInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema.optional(),
		assignmentId: humanResourcesLearningAssignmentIdSchema,
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
		sessionId: humanResourcesSessionIdSchema.nullable().optional(),
		completedAt: isoDateTimeSchema,
		outcome: completionOutcomeSchema,
		assessorUserId: humanResourcesActorUserIdSchema.nullable().optional(),
		notes: z.string().trim().max(2000).nullable().optional(),
	})
	.strict();

export type RecordCompletionInput = z.infer<typeof recordCompletionInputSchema>;

export const getCompletionByAssignmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assignmentId: humanResourcesLearningAssignmentIdSchema,
		})
		.strict();

export type GetCompletionByAssignmentInput = z.infer<
	typeof getCompletionByAssignmentInputSchema
>;

export const listCompletionsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
	})
	.strict();

export type ListCompletionsInput = z.infer<typeof listCompletionsInputSchema>;

// Employee Certification schemas
export const issueCertificationInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeId: humanResourcesEmployeeIdSchema,
		courseId: humanResourcesCourseIdSchema,
		completionId: humanResourcesCompletionIdSchema,
		certificationCode: z.string().trim().min(1).max(64),
		issuedOn: isoDateSchema,
		expiresOn: isoDateSchema.nullable().optional(),
	})
	.strict();

export type IssueCertificationInput = z.infer<
	typeof issueCertificationInputSchema
>;

export const certificationStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			certificationId: humanResourcesCertificationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CertificationStatusTransitionInput = z.infer<
	typeof certificationStatusTransitionInputSchema
>;

export const getCertificationInputSchema = humanResourcesMutationContextSchema
	.extend({
		certificationId: humanResourcesCertificationIdSchema,
	})
	.strict();

export type GetCertificationInput = z.infer<typeof getCertificationInputSchema>;

export const listCertificationsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: certificationStatusSchema.optional(),
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		courseId: humanResourcesCourseIdSchema.optional(),
	})
	.strict();

export type ListCertificationsInput = z.infer<
	typeof listCertificationsInputSchema
>;

const moneyAmountSchema = z.string().regex(/^\d+(\.\d{1,4})?$/);
const currencyCodeSchema = z
	.string()
	.trim()
	.length(3)
	.transform((value) => value.toUpperCase());

export const createCompensationGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			code: z.string().trim().min(1).max(50),
			name: z.string().trim().min(1).max(200),
		})
		.strict();

export type CreateCompensationGradeInput = z.infer<
	typeof createCompensationGradeInputSchema
>;

export const updateCompensationGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			name: z.string().trim().min(1).max(200).optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateCompensationGradeInput = z.infer<
	typeof updateCompensationGradeInputSchema
>;

export const archiveCompensationGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ArchiveCompensationGradeInput = z.infer<
	typeof archiveCompensationGradeInputSchema
>;

export const createSalaryBandInputSchema = humanResourcesMutationContextSchema
	.extend({
		gradeId: humanResourcesCompensationGradeIdSchema,
		currencyCode: currencyCodeSchema,
		minAmount: moneyAmountSchema,
		midAmount: moneyAmountSchema,
		maxAmount: moneyAmountSchema,
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
	})
	.strict();

export type CreateSalaryBandInput = z.infer<typeof createSalaryBandInputSchema>;

export const supersedeSalaryBandInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			currencyCode: currencyCodeSchema,
			minAmount: moneyAmountSchema,
			midAmount: moneyAmountSchema,
			maxAmount: moneyAmountSchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
		})
		.strict();

export type SupersedeSalaryBandInput = z.infer<
	typeof supersedeSalaryBandInputSchema
>;

export const archiveSalaryBandInputSchema = humanResourcesMutationContextSchema
	.extend({
		salaryBandId: humanResourcesSalaryBandIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ArchiveSalaryBandInput = z.infer<
	typeof archiveSalaryBandInputSchema
>;

export const createEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			gradeId: humanResourcesCompensationGradeIdSchema.nullable().optional(),
			salaryBandId: humanResourcesSalaryBandIdSchema.nullable().optional(),
			baseAmount: moneyAmountSchema,
			currencyCode: currencyCodeSchema,
			effectiveFrom: isoDateSchema,
			reason: z.string().trim().min(1).max(500),
			sourceReviewId: humanResourcesCompensationReviewIdSchema
				.nullable()
				.optional(),
		})
		.strict();

export type CreateEmployeeCompensationInput = z.infer<
	typeof createEmployeeCompensationInputSchema
>;

export const endEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			compensationId: humanResourcesEmployeeCompensationIdSchema,
			endsOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EndEmployeeCompensationInput = z.infer<
	typeof endEmployeeCompensationInputSchema
>;

export const createCompensationReviewDraftInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
		})
		.strict();

export type CreateCompensationReviewDraftInput = z.infer<
	typeof createCompensationReviewDraftInputSchema
>;

export const recordCompensationRecommendationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesCompensationReviewIdSchema,
			proposedBaseAmount: moneyAmountSchema,
			proposedCurrencyCode: currencyCodeSchema,
			proposedGradeId: humanResourcesCompensationGradeIdSchema
				.nullable()
				.optional(),
			proposedSalaryBandId: humanResourcesSalaryBandIdSchema
				.nullable()
				.optional(),
			effectiveFrom: isoDateSchema,
			recommendationNote: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordCompensationRecommendationInput = z.infer<
	typeof recordCompensationRecommendationInputSchema
>;

export const finalizeCompensationReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesCompensationReviewIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type FinalizeCompensationReviewInput = z.infer<
	typeof finalizeCompensationReviewInputSchema
>;

export const applyApprovedCompensationResultInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesCompensationReviewIdSchema,
			reason: z.string().trim().min(1).max(500),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export type ApplyApprovedCompensationResultInput = z.infer<
	typeof applyApprovedCompensationResultInputSchema
>;

export const createBenefitPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(50),
		name: z.string().trim().min(1).max(200),
		eligibilityNote: z.string().trim().max(2000).nullable().optional(),
	})
	.strict();

export type CreateBenefitPlanInput = z.infer<
	typeof createBenefitPlanInputSchema
>;

export const updateBenefitPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		planId: humanResourcesBenefitPlanIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		eligibilityNote: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateBenefitPlanInput = z.infer<
	typeof updateBenefitPlanInputSchema
>;

export const archiveBenefitPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		planId: humanResourcesBenefitPlanIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ArchiveBenefitPlanInput = z.infer<
	typeof archiveBenefitPlanInputSchema
>;

export const enrolBenefitInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		planId: humanResourcesBenefitPlanIdSchema,
		effectiveFrom: isoDateSchema,
	})
	.strict();

export type EnrolBenefitInput = z.infer<typeof enrolBenefitInputSchema>;

export const endBenefitEnrollmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			enrollmentId: humanResourcesBenefitEnrollmentIdSchema,
			endsOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EndBenefitEnrollmentInput = z.infer<
	typeof endBenefitEnrollmentInputSchema
>;

export const cancelBenefitEnrollmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			enrollmentId: humanResourcesBenefitEnrollmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CancelBenefitEnrollmentInput = z.infer<
	typeof cancelBenefitEnrollmentInputSchema
>;

export const getApprovedCompensationHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export type GetApprovedCompensationHandoffInput = z.infer<
	typeof getApprovedCompensationHandoffInputSchema
>;

const headcountFteSchema = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/)
	.refine((value) => Number(value) >= 0, "FTE cannot be negative");

export const createHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			planningScopeKey: z.string().trim().min(1).max(128),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			costEnvelopeAmount: z.string().trim().optional(),
			costEnvelopeCurrencyCode: z.string().trim().length(3).optional(),
		})
		.strict();

export const updateHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			title: z.string().trim().min(1).max(200).optional(),
			costEnvelopeAmount: z.string().trim().nullable().optional(),
			costEnvelopeCurrencyCode: z
				.string()
				.trim()
				.length(3)
				.nullable()
				.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const addHeadcountPlanLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			departmentId: humanResourcesDepartmentIdSchema.optional(),
			jobId: humanResourcesJobIdSchema.optional(),
			positionId: humanResourcesPositionIdSchema.optional(),
			locationCode: z.string().trim().max(64).optional(),
			employmentType: headcountEmploymentTypeSchema.optional(),
			plannedFte: headcountFteSchema,
			plannedHeadcount: z.number().int().nonnegative(),
			costEnvelopeAmount: z.string().trim().optional(),
			costEnvelopeCurrencyCode: z.string().trim().length(3).optional(),
		})
		.strict();

export const updateHeadcountPlanLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planLineId: humanResourcesHeadcountPlanLineIdSchema,
			departmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
			jobId: humanResourcesJobIdSchema.nullable().optional(),
			positionId: humanResourcesPositionIdSchema.nullable().optional(),
			locationCode: z.string().trim().max(64).nullable().optional(),
			employmentType: headcountEmploymentTypeSchema.nullable().optional(),
			plannedFte: headcountFteSchema.optional(),
			plannedHeadcount: z.number().int().nonnegative().optional(),
			costEnvelopeAmount: z.string().trim().nullable().optional(),
			costEnvelopeCurrencyCode: z
				.string()
				.trim()
				.length(3)
				.nullable()
				.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const removeHeadcountPlanLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planLineId: humanResourcesHeadcountPlanLineIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const headcountPlanStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
			rejectionReason: z.string().trim().max(500).optional(),
		})
		.strict();

export const supersedeHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const reserveHeadcountInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		planLineId: humanResourcesHeadcountPlanLineIdSchema,
		requisitionId: humanResourcesRequisitionIdSchema,
		reservedFte: headcountFteSchema,
		reservedHeadcount: z.number().int().nonnegative(),
	})
	.strict();

export const releaseHeadcountReservationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reservationId: humanResourcesHeadcountReservationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const consumeHeadcountReservationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reservationId: humanResourcesHeadcountReservationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getHeadcountPlanByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
		})
		.strict();

export const listHeadcountPlansInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: headcountPlanStatusSchema.optional(),
		planningScopeKey: z.string().trim().optional(),
	})
	.strict();

export const getApprovedHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planningScopeKey: z.string().trim().min(1).max(128),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
		})
		.strict();

export const getHeadcountAvailabilityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planLineId: humanResourcesHeadcountPlanLineIdSchema,
		})
		.strict();

export const listHeadcountReservationsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			planId: humanResourcesHeadcountPlanIdSchema.optional(),
			requisitionId: humanResourcesRequisitionIdSchema.optional(),
		})
		.strict();

export const getRecruitmentHeadcountHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requisitionId: humanResourcesRequisitionIdSchema,
		})
		.strict();

export const getWorkforcePlanVarianceInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
		})
		.strict();

const leaveQuantitySchema = z
	.string()
	.trim()
	.regex(/^\d+(\.\d+)?$/);

export const createLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(50),
		name: z.string().trim().min(1).max(200),
		leaveType: leaveTypeSchema,
		unit: leaveUnitSchema,
		paid: z.boolean(),
		sensitive: z.boolean().optional(),
		allowsNegativeBalance: z.boolean().optional(),
		allowSelfApproval: z.boolean().optional(),
		allowsPartialDay: z.boolean().optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		minTenureDays: z.number().int().nonnegative().nullable().optional(),
		allowedEmploymentStatuses: z.array(employmentStatusSchema).min(1),
	})
	.strict();

export const updateLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		paid: z.boolean().optional(),
		sensitive: z.boolean().optional(),
		allowsNegativeBalance: z.boolean().optional(),
		allowSelfApproval: z.boolean().optional(),
		allowsPartialDay: z.boolean().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		minTenureDays: z.number().int().nonnegative().nullable().optional(),
		allowedEmploymentStatuses: z
			.array(employmentStatusSchema)
			.min(1)
			.optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const publishLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const supersedeLeavePolicyInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			policyId: humanResourcesLeavePolicyIdSchema,
			code: z.string().trim().min(1).max(50),
			name: z.string().trim().min(1).max(200),
			leaveType: leaveTypeSchema,
			unit: leaveUnitSchema,
			paid: z.boolean(),
			sensitive: z.boolean().optional(),
			allowsNegativeBalance: z.boolean().optional(),
			allowSelfApproval: z.boolean().optional(),
			allowsPartialDay: z.boolean().optional(),
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			minTenureDays: z.number().int().nonnegative().nullable().optional(),
			allowedEmploymentStatuses: z.array(employmentStatusSchema).min(1),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const archiveLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const getLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
	})
	.strict();

export const listLeavePoliciesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: leavePolicyStatusSchema.optional(),
	})
	.strict();

export const grantLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			policyId: humanResourcesLeavePolicyIdSchema,
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			openingQuantity: leaveQuantitySchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const carryForwardLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			newPeriodStart: isoDateSchema,
			newPeriodEnd: isoDateSchema,
			carriedQuantity: leaveQuantitySchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const expireLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const adjustLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			delta: leaveQuantitySchema,
			reason: z.string().trim().min(1).max(500),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const getLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
		})
		.strict();

export const listLeaveEntitlementsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			employmentId: humanResourcesEmploymentIdSchema.optional(),
			policyId: humanResourcesLeavePolicyIdSchema.optional(),
		})
		.strict();

export const getLeaveBalanceInputSchema = humanResourcesMutationContextSchema
	.extend({
		entitlementId: humanResourcesLeaveEntitlementIdSchema,
	})
	.strict();

export const createDraftLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			startDate: isoDateSchema,
			endDate: isoDateSchema,
			requestedQuantity: leaveQuantitySchema,
			dayPortion: dayPortionSchema.optional(),
			isBackdated: z.boolean().optional(),
			backdateJustification: z.string().trim().max(2000).nullable().optional(),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const submitLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const approveLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
			managerEmployeeId: humanResourcesEmployeeIdSchema.optional(),
			note: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const rejectLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		managerEmployeeId: humanResourcesEmployeeIdSchema.optional(),
		note: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const returnLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		managerEmployeeId: humanResourcesEmployeeIdSchema.optional(),
		note: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const withdrawLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const cancelApprovedLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
			note: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const amendLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		startDate: isoDateSchema,
		endDate: isoDateSchema,
		requestedQuantity: leaveQuantitySchema,
		dayPortion: dayPortionSchema.optional(),
		isBackdated: z.boolean().optional(),
		backdateJustification: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const getLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
	})
	.strict();

export const listLeaveRequestsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		status: leaveRequestStatusSchema.optional(),
	})
	.strict();

export const listPendingApprovalLeaveRequestsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const listTeamCalendarLeaveRequestsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			rangeStart: isoDateSchema,
			rangeEnd: isoDateSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getApprovedLeaveHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
		})
		.strict();

export const resolveApplicableLeavePolicyInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			policyCode: z.string().trim().min(1).max(50),
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			asOfDate: isoDateSchema,
		})
		.strict();

const performanceWeightSchema = z
	.string()
	.trim()
	.regex(/^\d+(\.\d+)?$/)
	.nullable();

const performanceCheckpointRecordOutcomeSchema = z.enum(["met", "missed"]);

export const createPerformanceCycleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			name: z.string().trim().min(1).max(200),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			ratingScale: performanceRatingScaleSchema,
			weightingModel: performanceWeightingModelSchema,
		})
		.strict();

export const updatePerformanceCycleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			name: z.string().trim().min(1).max(200).optional(),
			periodStart: isoDateSchema.optional(),
			periodEnd: isoDateSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const performanceCycleStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const addCycleParticipantInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
		})
		.strict();

export const removeCycleParticipantInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			participantId: humanResourcesPerformanceCycleParticipantIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getPerformanceCycleByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
		})
		.strict();

export const listPerformanceCyclesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: performanceCycleStatusSchema.optional(),
		})
		.strict();

export const listCycleParticipantsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
		})
		.strict();

export const createPerformanceGoalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			cycleId: humanResourcesPerformanceCycleIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			title: z.string().trim().min(1).max(200),
			description: z.string().trim().max(2000).nullable().optional(),
			weight: performanceWeightSchema.optional(),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			exceptionOutsideCycle: z.boolean().optional(),
		})
		.strict();

export const updatePerformanceGoalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			goalId: humanResourcesGoalIdSchema,
			title: z.string().trim().min(1).max(200).optional(),
			description: z.string().trim().max(2000).nullable().optional(),
			weight: performanceWeightSchema.optional(),
			periodStart: isoDateSchema.optional(),
			periodEnd: isoDateSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const performanceGoalStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			goalId: humanResourcesGoalIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const recordGoalProgressInputSchema = humanResourcesMutationContextSchema
	.extend({
		goalId: humanResourcesGoalIdSchema,
		progressNote: z.string().trim().min(1).max(2000),
		progressValue: performanceWeightSchema.optional(),
	})
	.strict();

export const getPerformanceGoalByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			goalId: humanResourcesGoalIdSchema,
		})
		.strict();

export const listEmployeeGoalsInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: performanceGoalStatusSchema.optional(),
	})
	.strict();

export const startPerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			managerEmployeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export const submitSelfAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			rating: z.string().trim().min(1).max(64),
			commentsSensitive: z.string().trim().max(4000).nullable().optional(),
			actorEmployeeId: humanResourcesEmployeeIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const submitManagerAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			rating: z.string().trim().min(1).max(64),
			commentsSensitive: z.string().trim().max(4000).nullable().optional(),
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const performanceReviewStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const acknowledgePerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			acknowledgementNote: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const finalizePerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			overallRating: z.string().trim().min(1).max(64),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const reopenPerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			reason: z.string().trim().min(1).max(500),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getPerformanceReviewByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			includeConfidential: z.boolean(),
		})
		.strict();

export const listEmployeePerformanceReviewsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			includeConfidential: z.boolean(),
		})
		.strict();

export const listReviewsPendingManagerActionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const createImprovementPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			reviewId: humanResourcesReviewIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			performanceGap: z.string().trim().min(1).max(2000),
			expectedOutcome: z.string().trim().min(1).max(2000),
			measurableActions: z.string().trim().min(1).max(4000),
			supportResources: z.string().trim().min(1).max(4000),
			dueDate: isoDateSchema,
			accountableManagerEmployeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export const improvementPlanStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const recordImprovementCheckpointInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
			sequenceNumber: z.number().int().positive(),
			outcome: performanceCheckpointRecordOutcomeSchema,
			notes: z.string().trim().max(2000).nullable().optional(),
		})
		.strict();

export const amendImprovementPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
			measurableActions: z.string().trim().min(1).max(4000).optional(),
			supportResources: z.string().trim().min(1).max(4000).optional(),
			dueDate: isoDateSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getImprovementPlanByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
		})
		.strict();

export const listActiveImprovementPlansInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getEmployeePerformanceHistoryInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			includeConfidential: z.boolean(),
		})
		.strict();

// Competency schemas
export const createCompetencyInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).nullable().optional(),
		category: z.string().trim().max(100).nullable().optional(),
		scaleCode: competencyScaleCodeSchema,
	})
	.strict();

export type CreateCompetencyInput = z.infer<typeof createCompetencyInputSchema>;

export const updateCompetencyInputSchema = humanResourcesMutationContextSchema
	.extend({
		competencyId: humanResourcesCompetencyIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		category: z.string().trim().max(100).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateCompetencyInput = z.infer<typeof updateCompetencyInputSchema>;

export const retireCompetencyInputSchema = humanResourcesMutationContextSchema
	.extend({
		competencyId: humanResourcesCompetencyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type RetireCompetencyInput = z.infer<typeof retireCompetencyInputSchema>;

export const mapCompetencyToJobInputSchema = humanResourcesMutationContextSchema
	.extend({
		jobId: humanResourcesJobIdSchema,
		competencyId: humanResourcesCompetencyIdSchema,
		requiredLevel: z.number().int().min(1).max(5),
	})
	.strict();

export type MapCompetencyToJobInput = z.infer<
	typeof mapCompetencyToJobInputSchema
>;

export const removeCompetencyFromJobInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			jobCompetencyId: humanResourcesJobCompetencyIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RemoveCompetencyFromJobInput = z.infer<
	typeof removeCompetencyFromJobInputSchema
>;

export const assessEmployeeCompetencyInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			competencyId: humanResourcesCompetencyIdSchema,
			assessorUserId: z.string().trim().min(1),
			evidenceSource: z.string().trim().min(1).max(2000),
			scaleCode: competencyScaleCodeSchema,
			level: z.number().int().min(1).max(5),
			effectiveOn: isoDateSchema,
		})
		.strict();

export type AssessEmployeeCompetencyInput = z.infer<
	typeof assessEmployeeCompetencyInputSchema
>;

export const supersedeCompetencyAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			assessmentId: humanResourcesCompetencyAssessmentIdSchema,
			assessorUserId: z.string().trim().min(1),
			evidenceSource: z.string().trim().min(1).max(2000),
			level: z.number().int().min(1).max(5),
			effectiveOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type SupersedeCompetencyAssessmentInput = z.infer<
	typeof supersedeCompetencyAssessmentInputSchema
>;

export const getCompetencyByIdInputSchema = humanResourcesMutationContextSchema
	.extend({
		competencyId: humanResourcesCompetencyIdSchema,
	})
	.strict();

export type GetCompetencyByIdInput = z.infer<
	typeof getCompetencyByIdInputSchema
>;

export const listCompetenciesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: competencyStatusSchema.optional(),
	})
	.strict();

export type ListCompetenciesInput = z.infer<typeof listCompetenciesInputSchema>;

export const listJobCompetenciesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			jobId: humanResourcesJobIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export type ListJobCompetenciesInput = z.infer<
	typeof listJobCompetenciesInputSchema
>;

export const getEmployeeCompetencyProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export type GetEmployeeCompetencyProfileInput = z.infer<
	typeof getEmployeeCompetencyProfileInputSchema
>;

// Talent profile schemas
export const createTalentProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			summary: z.string().trim().max(4000).nullable().optional(),
		})
		.strict();

export type CreateTalentProfileInput = z.infer<
	typeof createTalentProfileInputSchema
>;

export const updateTalentProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			summary: z.string().trim().max(4000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateTalentProfileInput = z.infer<
	typeof updateTalentProfileInputSchema
>;

export const recordTalentProfileAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			methodCode: talentProfileAssessmentMethodCodeSchema,
			classification: z.string().trim().min(1).max(100),
			evidenceSummary: z.string().trim().min(1).max(4000),
			assessorUserId: z.string().trim().min(1),
		})
		.strict();

export type RecordTalentProfileAssessmentInput = z.infer<
	typeof recordTalentProfileAssessmentInputSchema
>;

export const confirmTalentProfileAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assessmentId: humanResourcesTalentProfileAssessmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ConfirmTalentProfileAssessmentInput = z.infer<
	typeof confirmTalentProfileAssessmentInputSchema
>;

export const archiveTalentProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ArchiveTalentProfileInput = z.infer<
	typeof archiveTalentProfileInputSchema
>;

export const getTalentProfileByEmployeeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			includeSensitive: z.boolean(),
		})
		.strict();

export type GetTalentProfileByEmployeeInput = z.infer<
	typeof getTalentProfileByEmployeeInputSchema
>;

// Talent pool schemas
export const createTalentPoolInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).nullable().optional(),
	})
	.strict();

export type CreateTalentPoolInput = z.infer<typeof createTalentPoolInputSchema>;

export const updateTalentPoolInputSchema = humanResourcesMutationContextSchema
	.extend({
		poolId: humanResourcesTalentPoolIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateTalentPoolInput = z.infer<typeof updateTalentPoolInputSchema>;

export const closeTalentPoolInputSchema = humanResourcesMutationContextSchema
	.extend({
		poolId: humanResourcesTalentPoolIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CloseTalentPoolInput = z.infer<typeof closeTalentPoolInputSchema>;

export const nominateTalentPoolMemberInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			poolId: humanResourcesTalentPoolIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			nominatorUserId: z.string().trim().min(1),
		})
		.strict();

export type NominateTalentPoolMemberInput = z.infer<
	typeof nominateTalentPoolMemberInputSchema
>;

export const approveTalentPoolMemberInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			memberId: humanResourcesTalentPoolMemberIdSchema,
			approverUserId: z.string().trim().min(1),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApproveTalentPoolMemberInput = z.infer<
	typeof approveTalentPoolMemberInputSchema
>;

export const removeTalentPoolMemberInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			memberId: humanResourcesTalentPoolMemberIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RemoveTalentPoolMemberInput = z.infer<
	typeof removeTalentPoolMemberInputSchema
>;

export const listTalentPoolMembersInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			poolId: humanResourcesTalentPoolIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: talentPoolMemberStatusSchema.optional(),
		})
		.strict();

export type ListTalentPoolMembersInput = z.infer<
	typeof listTalentPoolMembersInputSchema
>;

// Career plan schemas
export const createCareerPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeId: humanResourcesEmployeeIdSchema,
		ownerUserId: z.string().trim().min(1),
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
	})
	.strict();

export type CreateCareerPlanInput = z.infer<typeof createCareerPlanInputSchema>;

export const updateCareerPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		careerPlanId: humanResourcesCareerPlanIdSchema,
		title: z.string().trim().min(1).max(200).optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateCareerPlanInput = z.infer<typeof updateCareerPlanInputSchema>;

export const acknowledgeCareerPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			careerPlanId: humanResourcesCareerPlanIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AcknowledgeCareerPlanInput = z.infer<
	typeof acknowledgeCareerPlanInputSchema
>;

export const addCareerPlanActionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			careerPlanId: humanResourcesCareerPlanIdSchema,
			title: z.string().trim().min(1).max(200),
			dueOn: isoDateSchema.nullable().optional(),
			learningAssignmentId: humanResourcesLearningAssignmentIdSchema
				.nullable()
				.optional(),
		})
		.strict();

export type AddCareerPlanActionInput = z.infer<
	typeof addCareerPlanActionInputSchema
>;

export const completeCareerPlanActionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			actionId: humanResourcesCareerPlanActionIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CompleteCareerPlanActionInput = z.infer<
	typeof completeCareerPlanActionInputSchema
>;

export const closeCareerPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		careerPlanId: humanResourcesCareerPlanIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CloseCareerPlanInput = z.infer<typeof closeCareerPlanInputSchema>;

export const getCareerPlanByIdInputSchema = humanResourcesMutationContextSchema
	.extend({
		careerPlanId: humanResourcesCareerPlanIdSchema,
	})
	.strict();

export type GetCareerPlanByIdInput = z.infer<
	typeof getCareerPlanByIdInputSchema
>;

export const listEmployeeCareerPlansInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: careerPlanStatusSchema.optional(),
		})
		.strict();

export type ListEmployeeCareerPlansInput = z.infer<
	typeof listEmployeeCareerPlansInputSchema
>;

// Succession schemas
export const createSuccessionPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			positionId: humanResourcesPositionIdSchema,
			allowsExternalCandidates: z.boolean().optional(),
		})
		.strict();

export type CreateSuccessionPlanInput = z.infer<
	typeof createSuccessionPlanInputSchema
>;

export const updateSuccessionPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			title: z.string().trim().min(1).max(200).optional(),
			allowsExternalCandidates: z.boolean().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateSuccessionPlanInput = z.infer<
	typeof updateSuccessionPlanInputSchema
>;

export const successionPlanStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type SuccessionPlanStatusTransitionInput = z.infer<
	typeof successionPlanStatusTransitionInputSchema
>;

export const nominateSuccessionCandidateInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			employeeId: humanResourcesEmployeeIdSchema.nullable().optional(),
			externalCandidateRef: z
				.string()
				.trim()
				.min(1)
				.max(200)
				.nullable()
				.optional(),
			nominatorUserId: z.string().trim().min(1),
			readiness: successionReadinessCodeSchema,
			readinessEffectiveOn: isoDateSchema,
			evidenceSummary: z.string().trim().min(1).max(4000),
		})
		.strict();

export type NominateSuccessionCandidateInput = z.infer<
	typeof nominateSuccessionCandidateInputSchema
>;

export const assessSuccessionReadinessInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesSuccessionCandidateIdSchema,
			readiness: successionReadinessCodeSchema,
			readinessEffectiveOn: isoDateSchema,
			evidenceSummary: z.string().trim().min(1).max(4000),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AssessSuccessionReadinessInput = z.infer<
	typeof assessSuccessionReadinessInputSchema
>;

export const approveSuccessionCandidateInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesSuccessionCandidateIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApproveSuccessionCandidateInput = z.infer<
	typeof approveSuccessionCandidateInputSchema
>;

export const removeSuccessionCandidateInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesSuccessionCandidateIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RemoveSuccessionCandidateInput = z.infer<
	typeof removeSuccessionCandidateInputSchema
>;

export const getSuccessionPlanByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
		})
		.strict();

export type GetSuccessionPlanByIdInput = z.infer<
	typeof getSuccessionPlanByIdInputSchema
>;

export const listSuccessionPlansInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			positionId: humanResourcesPositionIdSchema.optional(),
			status: successionPlanStatusSchema.optional(),
		})
		.strict();

export type ListSuccessionPlansInput = z.infer<
	typeof listSuccessionPlansInputSchema
>;

export const listSuccessionCandidatesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: successionCandidateStatusSchema.optional(),
		})
		.strict();

export type ListSuccessionCandidatesInput = z.infer<
	typeof listSuccessionCandidatesInputSchema
>;

export const getPositionSuccessionCoverageInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			positionId: humanResourcesPositionIdSchema,
		})
		.strict();

export type GetPositionSuccessionCoverageInput = z.infer<
	typeof getPositionSuccessionCoverageInputSchema
>;
