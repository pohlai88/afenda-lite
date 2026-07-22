import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentContractIdSchema,
	humanResourcesEmploymentIdSchema,
} from "../brands";
import { employmentStatusSchema } from "../shared/employment-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

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
