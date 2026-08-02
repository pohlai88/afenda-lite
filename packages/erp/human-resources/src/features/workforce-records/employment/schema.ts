import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentContractIdSchema,
	humanResourcesEmploymentIdSchema,
} from "../../../kernel/identity/brands";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../../../kernel/validation/common";
import { employmentStatusSchema } from "./employment-status";

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

export const getEmployeeProfileInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		asOf: isoDateSchema,
		actorEmployeeId: humanResourcesEmployeeIdSchema.optional(),
	})
	.strict();

export type GetEmployeeProfileInput = z.infer<
	typeof getEmployeeProfileInputSchema
>;

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
		effectiveOn: isoDateSchema.optional(),
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

export const correctEmploymentInputSchema = humanResourcesMutationContextSchema
	.extend({
		employmentId: humanResourcesEmploymentIdSchema,
		status: employmentStatusSchema.optional(),
		startsOn: isoDateSchema.optional(),
		endsOn: isoDateSchema.nullable().optional(),
		reason: z.string().trim().min(1).max(500),
		evidenceReference: z.string().trim().min(1).max(200).optional(),
		effectiveOn: isoDateSchema.optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CorrectEmploymentInput = z.infer<
	typeof correctEmploymentInputSchema
>;

export const getEmploymentAsOfInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		asOf: isoDateSchema,
	})
	.strict();

export type GetEmploymentAsOfInput = z.infer<
	typeof getEmploymentAsOfInputSchema
>;

export const listEmploymentStatusHistoryInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentId: humanResourcesEmploymentIdSchema,
			asOf: isoDateSchema.optional(),
		})
		.strict();

export type ListEmploymentStatusHistoryInput = z.infer<
	typeof listEmploymentStatusHistoryInputSchema
>;

// Employment Contract schemas
export const createEmploymentContractInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentId: humanResourcesEmploymentIdSchema,
			referenceCode: z.string().trim().min(1).max(64),
			startsOn: isoDateSchema,
			endsOn: isoDateSchema.nullable().optional(),
			reasonCode: z.string().trim().min(1).max(64),
			sourceReference: z.string().trim().min(1).max(200).optional(),
		})
		.strict();

export type CreateEmploymentContractInput = z.infer<
	typeof createEmploymentContractInputSchema
>;

export const correctEmploymentContractInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentContractId: humanResourcesEmploymentContractIdSchema,
			referenceCode: z.string().trim().min(1).max(64).optional(),
			startsOn: isoDateSchema.optional(),
			endsOn: isoDateSchema.nullable().optional(),
			reasonCode: z.string().trim().min(1).max(64),
			sourceReference: z.string().trim().min(1).max(200),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CorrectEmploymentContractInput = z.infer<
	typeof correctEmploymentContractInputSchema
>;

export const supersedeEmploymentContractInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentContractId: humanResourcesEmploymentContractIdSchema,
			referenceCode: z.string().trim().min(1).max(64).optional(),
			startsOn: isoDateSchema,
			endsOn: isoDateSchema.nullable().optional(),
			reasonCode: z.string().trim().min(1).max(64),
			sourceReference: z.string().trim().min(1).max(200),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type SupersedeEmploymentContractInput = z.infer<
	typeof supersedeEmploymentContractInputSchema
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

const employmentContractAsOfLookupInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentId: humanResourcesEmploymentIdSchema,
			asOf: isoDateSchema,
		})
		.strict();

export const getEmploymentContractAsOfInputSchema =
	employmentContractAsOfLookupInputSchema;

export type GetEmploymentContractAsOfInput = z.infer<
	typeof getEmploymentContractAsOfInputSchema
>;

export const endEmploymentContractInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentContractId: humanResourcesEmploymentContractIdSchema,
			endsOn: isoDateSchema,
			reasonCode: z.string().trim().min(1).max(64),
			sourceReference: z.string().trim().min(1).max(200),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EndEmploymentContractInput = z.infer<
	typeof endEmploymentContractInputSchema
>;

export const getCurrentEmploymentContractInputSchema =
	employmentContractAsOfLookupInputSchema;

export type GetCurrentEmploymentContractInput = z.infer<
	typeof getCurrentEmploymentContractInputSchema
>;

export const listEmploymentContractsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentId: humanResourcesEmploymentIdSchema,
		})
		.strict();

export type ListEmploymentContractsInput = z.infer<
	typeof listEmploymentContractsInputSchema
>;
