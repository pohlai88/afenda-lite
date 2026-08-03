import { z } from "zod";

export const salesOrganizationIdSchema = z
	.string()
	.trim()
	.min(1)
	.brand<"SalesOrganizationId">();
export type SalesOrganizationId = z.infer<typeof salesOrganizationIdSchema>;

export const salesActorUserIdSchema = z
	.string()
	.trim()
	.min(1)
	.brand<"SalesActorUserId">();
export type SalesActorUserId = z.infer<typeof salesActorUserIdSchema>;

export const salesCorrelationIdSchema = z
	.string()
	.trim()
	.min(1)
	.brand<"SalesCorrelationId">();
export type SalesCorrelationId = z.infer<typeof salesCorrelationIdSchema>;

export const salesIdempotencyKeySchema = z.string().trim().min(1).max(128);
export const salesExpectedVersionSchema = z.number().int().positive().safe();

export const salesMutationContextSchema = z.object({
	organizationId: salesOrganizationIdSchema,
	actorUserId: salesActorUserIdSchema,
	correlationId: salesCorrelationIdSchema,
	idempotencyKey: salesIdempotencyKeySchema,
});
export type SalesMutationContext = z.infer<typeof salesMutationContextSchema>;

export const salesVersionedMutationContextSchema =
	salesMutationContextSchema.extend({
		expectedVersion: salesExpectedVersionSchema,
	});
export type SalesVersionedMutationContext = z.infer<
	typeof salesVersionedMutationContextSchema
>;

export const salesQueryContextSchema = z.object({
	organizationId: salesOrganizationIdSchema,
	actorUserId: salesActorUserIdSchema,
	correlationId: salesCorrelationIdSchema,
});
export type SalesQueryContext = z.infer<typeof salesQueryContextSchema>;
