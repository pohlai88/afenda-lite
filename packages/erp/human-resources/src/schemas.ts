import { z } from "zod";

import {
	humanResourcesApplicationIdSchema,
	humanResourcesAssignmentIdSchema,
	humanResourcesCandidateIdSchema,
	humanResourcesDepartmentIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentContractIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesInterviewIdSchema,
	humanResourcesJobIdSchema,
	humanResourcesOfferIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesReportingLineIdSchema,
	humanResourcesRequisitionIdSchema,
} from "./brands";
import {
	departmentStatusSchema,
	employmentStatusSchema,
	jobStatusSchema,
	positionStatusSchema,
} from "./shared/employment-status";
import {
	ORGANIZATION_TREE_DEFAULT_MAX_DEPTH,
	ORGANIZATION_TREE_DEFAULT_MAX_NODES,
	ORGANIZATION_TREE_HARD_MAX_DEPTH,
	ORGANIZATION_TREE_HARD_MAX_NODES,
} from "./shared/organization-guards";
import {
	applicationStatusSchema,
	candidateStatusSchema,
	interviewEvaluationResultSchema,
	offerStatusSchema,
	requisitionStatusSchema,
} from "./shared/recruitment-status";

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
