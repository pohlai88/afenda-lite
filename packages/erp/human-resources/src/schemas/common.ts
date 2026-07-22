import { z } from "zod";

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

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const isoDateTimeSchema = z.string().datetime({ offset: true });

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
