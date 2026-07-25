import { z } from "zod";

import {
	humanResourcesOfferIdSchema,
	humanResourcesPositionIdSchema,
} from "../brands";
import {
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

const lifecycleTaskSeedSchema = z
	.object({
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		mandatory: z.boolean(),
	})
	.strict();

export const hireFromAcceptedOfferInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		offerId: humanResourcesOfferIdSchema,
		employeeNumber: z.string().trim().min(1).max(64),
		startsOn: isoDateSchema,
		positionId: humanResourcesPositionIdSchema.optional(),
		legalName: z.string().trim().min(1).max(200).optional(),
		preferredName: z.string().trim().min(1).max(200).nullable().optional(),
		tasks: z.array(lifecycleTaskSeedSchema).min(1),
		legalEntityKey: z.string().trim().min(1),
		businessUnitKey: z.string().trim().min(1),
		locationKey: z.string().trim().min(1),
		costCentreKey: z.string().trim().min(1),
		projectKey: z.string().trim().min(1),
	})
	.strict();

export type HireFromAcceptedOfferInput = z.infer<
	typeof hireFromAcceptedOfferInputSchema
>;
