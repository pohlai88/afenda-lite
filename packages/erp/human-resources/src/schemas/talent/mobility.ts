import { z } from "zod";
import { humanResourcesTalentProfileIdSchema } from "../../brands";
import {
	talentMobilityDimensionSchema,
	talentMobilityPreferenceSchema,
} from "../../shared/talent-status";
import { humanResourcesMutationContextSchema } from "../common";

export const recordTalentProfileMobilityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: z.string().trim().min(1).max(128),
			talentProfileId: humanResourcesTalentProfileIdSchema,
			dimension: talentMobilityDimensionSchema,
			preferenceCode: talentMobilityPreferenceSchema,
			scopeDetail: z.string().trim().max(2000).nullable().optional(),
			evidenceSummary: z.string().trim().min(1).max(4000),
			effectiveFrom: z.string().date(),
			effectiveTo: z.string().date().nullable().optional(),
		})
		.strict()
		.superRefine((value, ctx) => {
			if (
				value.effectiveTo !== undefined &&
				value.effectiveTo !== null &&
				value.effectiveTo < value.effectiveFrom
			) {
				ctx.addIssue({
					code: "custom",
					message: "effectiveTo must be on or after effectiveFrom",
					path: ["effectiveTo"],
				});
			}
		});

export type RecordTalentProfileMobilityInput = z.infer<
	typeof recordTalentProfileMobilityInputSchema
>;

export const listTalentProfileMobilityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			talentProfileId: humanResourcesTalentProfileIdSchema,
			includeSensitive: z.boolean(),
		})
		.strict();

export type ListTalentProfileMobilityInput = z.infer<
	typeof listTalentProfileMobilityInputSchema
>;
