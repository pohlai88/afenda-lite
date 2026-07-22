import { z } from "zod";
import {
	humanResourcesCareerPlanActionIdSchema,
	humanResourcesCareerPlanIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesLearningAssignmentIdSchema,
} from "../../brands";
import { careerPlanStatusSchema } from "../../shared/talent-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../common";

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
