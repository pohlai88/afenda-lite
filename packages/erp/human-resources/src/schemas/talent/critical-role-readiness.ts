import { z } from "zod";
import {
	humanResourcesPositionIdSchema,
	humanResourcesTalentProfileIdSchema,
} from "../../brands";
import { successionReadinessCodeSchema } from "../../shared/talent-status";
import { humanResourcesMutationContextSchema } from "../common";

export const recordCriticalRoleReadinessInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: z.string().trim().min(1).max(128),
			talentProfileId: humanResourcesTalentProfileIdSchema,
			positionId: humanResourcesPositionIdSchema,
			readiness: successionReadinessCodeSchema,
			readinessEffectiveOn: z.string().date(),
			evidenceSummary: z.string().trim().min(1).max(4000),
			assessorUserId: z.string().trim().min(1),
		})
		.strict();

export type RecordCriticalRoleReadinessInput = z.infer<
	typeof recordCriticalRoleReadinessInputSchema
>;

export const listCriticalRoleReadinessInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			includeSensitive: z.boolean(),
		})
		.strict();

export type ListCriticalRoleReadinessInput = z.infer<
	typeof listCriticalRoleReadinessInputSchema
>;
