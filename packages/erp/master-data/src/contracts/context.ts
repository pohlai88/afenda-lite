import { z } from "zod";

export const organizationIdSchema = z
	.string()
	.trim()
	.min(1)
	.brand<"OrganizationId">();
export type OrganizationId = z.infer<typeof organizationIdSchema>;

export const actorUserIdSchema = z.string().trim().min(1).brand<"UserId">();
export type UserId = z.infer<typeof actorUserIdSchema>;

export const correlationIdSchema = z
	.string()
	.trim()
	.min(1)
	.brand<"CorrelationId">();
export type CorrelationId = z.infer<typeof correlationIdSchema>;

export const idempotencyKeySchema = z.string().trim().min(1).max(128);
export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;

export const expectedVersionSchema = z.number().int().positive().safe();

/** Explicit mutation context — never ambient / header tenancy. */
export const masterDataMutationContextSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema.optional(),
});

export type MasterDataMutationContext = z.infer<
	typeof masterDataMutationContextSchema
>;

export const versionedMutationContextSchema =
	masterDataMutationContextSchema.extend({
		expectedVersion: expectedVersionSchema,
	});

export type VersionedMutationContext = z.infer<
	typeof versionedMutationContextSchema
>;

/** Org-scoped read context — actor required for authorization port checks. */
export const orgQueryActorSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
});

export type OrgQueryActor = z.infer<typeof orgQueryActorSchema>;
