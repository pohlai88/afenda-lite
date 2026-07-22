import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesTalentProfileAssessmentIdSchema,
	humanResourcesTalentProfileIdSchema,
} from "../../brands";
import { talentProfileAssessmentMethodCodeSchema } from "../../shared/talent-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
} from "../common";

// Talent profile schemas
export const createTalentProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			summary: z.string().trim().max(4000).nullable().optional(),
		})
		.strict();

export type CreateTalentProfileInput = z.infer<
	typeof createTalentProfileInputSchema
>;

export const updateTalentProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			summary: z.string().trim().max(4000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateTalentProfileInput = z.infer<
	typeof updateTalentProfileInputSchema
>;

export const recordTalentProfileAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			methodCode: talentProfileAssessmentMethodCodeSchema,
			classification: z.string().trim().min(1).max(100),
			evidenceSummary: z.string().trim().min(1).max(4000),
			assessorUserId: z.string().trim().min(1),
		})
		.strict();

export type RecordTalentProfileAssessmentInput = z.infer<
	typeof recordTalentProfileAssessmentInputSchema
>;

export const confirmTalentProfileAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			assessmentId: humanResourcesTalentProfileAssessmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ConfirmTalentProfileAssessmentInput = z.infer<
	typeof confirmTalentProfileAssessmentInputSchema
>;

export const archiveTalentProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ArchiveTalentProfileInput = z.infer<
	typeof archiveTalentProfileInputSchema
>;

export const getTalentProfileByEmployeeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			includeSensitive: z.boolean(),
		})
		.strict();

export type GetTalentProfileByEmployeeInput = z.infer<
	typeof getTalentProfileByEmployeeInputSchema
>;
