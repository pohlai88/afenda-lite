import { z } from "zod";

import { humanResourcesEmployeeIdSchema } from "./brands";

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

export const humanResourcesMutationContextSchema = z.object({
	organizationId: humanResourcesOrganizationIdSchema,
	actorUserId: humanResourcesActorUserIdSchema,
	correlationId: humanResourcesCorrelationIdSchema,
});

export type HumanResourcesMutationContext = z.infer<
	typeof humanResourcesMutationContextSchema
>;

/** @deprecated Use `humanResourcesMutationContextSchema`. */
export const humanResourcesTenantContextSchema =
	humanResourcesMutationContextSchema;
export type HumanResourcesTenantContext = HumanResourcesMutationContext;

export const createEmployeeInputSchema =
	humanResourcesMutationContextSchema.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeNumber: z.string().trim().min(1).max(64),
		legalName: z.string().trim().min(1).max(200),
	});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

export const getEmployeeByIdInputSchema = humanResourcesMutationContextSchema
	.pick({
		organizationId: true,
		actorUserId: true,
		correlationId: true,
	})
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
	});

export type GetEmployeeByIdInput = z.infer<typeof getEmployeeByIdInputSchema>;
