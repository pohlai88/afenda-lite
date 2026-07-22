import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesTalentPoolIdSchema,
	humanResourcesTalentPoolMemberIdSchema,
} from "../../brands";
import { talentPoolMemberStatusSchema } from "../../shared/talent-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
} from "../common";

// Talent pool schemas
export const createTalentPoolInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).nullable().optional(),
	})
	.strict();

export type CreateTalentPoolInput = z.infer<typeof createTalentPoolInputSchema>;

export const updateTalentPoolInputSchema = humanResourcesMutationContextSchema
	.extend({
		poolId: humanResourcesTalentPoolIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateTalentPoolInput = z.infer<typeof updateTalentPoolInputSchema>;

export const closeTalentPoolInputSchema = humanResourcesMutationContextSchema
	.extend({
		poolId: humanResourcesTalentPoolIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CloseTalentPoolInput = z.infer<typeof closeTalentPoolInputSchema>;

export const nominateTalentPoolMemberInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			poolId: humanResourcesTalentPoolIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			nominatorUserId: z.string().trim().min(1),
		})
		.strict();

export type NominateTalentPoolMemberInput = z.infer<
	typeof nominateTalentPoolMemberInputSchema
>;

export const approveTalentPoolMemberInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			memberId: humanResourcesTalentPoolMemberIdSchema,
			approverUserId: z.string().trim().min(1),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApproveTalentPoolMemberInput = z.infer<
	typeof approveTalentPoolMemberInputSchema
>;

export const removeTalentPoolMemberInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			memberId: humanResourcesTalentPoolMemberIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RemoveTalentPoolMemberInput = z.infer<
	typeof removeTalentPoolMemberInputSchema
>;

export const listTalentPoolMembersInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			poolId: humanResourcesTalentPoolIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: talentPoolMemberStatusSchema.optional(),
		})
		.strict();

export type ListTalentPoolMembersInput = z.infer<
	typeof listTalentPoolMembersInputSchema
>;
