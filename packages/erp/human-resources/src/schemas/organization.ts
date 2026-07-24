import { z } from "zod";
import {
	humanResourcesAssignmentIdSchema,
	humanResourcesDepartmentIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesJobIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesReportingLineIdSchema,
} from "../brands";
import {
	departmentStatusSchema,
	jobStatusSchema,
	positionStatusSchema,
} from "../shared/employment-status";
import {
	ORGANIZATION_TREE_DEFAULT_MAX_DEPTH,
	ORGANIZATION_TREE_DEFAULT_MAX_NODES,
	ORGANIZATION_TREE_HARD_MAX_DEPTH,
	ORGANIZATION_TREE_HARD_MAX_NODES,
} from "../shared/organization-guards";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

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

export const getPositionOccupancyAsOfInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			positionId: humanResourcesPositionIdSchema,
			asOf: isoDateSchema,
		})
		.strict();

export type GetPositionOccupancyAsOfInput = z.infer<
	typeof getPositionOccupancyAsOfInputSchema
>;

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
		legalEntityKey: z.string().trim().min(1),
		businessUnitKey: z.string().trim().min(1),
		locationKey: z.string().trim().min(1),
		costCentreKey: z.string().trim().min(1),
		projectKey: z.string().trim().min(1),
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
