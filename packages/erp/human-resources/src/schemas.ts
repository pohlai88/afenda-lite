import { z } from "zod";

import {
	humanResourcesAssignmentIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentContractIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesPositionIdSchema,
} from "./brands";
import { employmentStatusSchema, positionStatusSchema } from "./shared/employment-status";

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

// Position schemas
export const createPositionInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		status: positionStatusSchema,
	})
	.strict();

export type CreatePositionInput = z.infer<typeof createPositionInputSchema>;

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
