import { z } from "zod";

const commandContext = z.object({
	organizationId: z.string().trim().min(1).max(200),
	actorUserId: z.string().trim().min(1).max(200),
	correlationId: z.string().trim().min(1).max(200),
	idempotencyKey: z.string().trim().min(1).max(200),
	legalCompanyId: z.uuid(),
});

const existingContext = commandContext.extend({
	id: z.uuid(),
	expectedVersion: z.number().int().positive(),
});

const queryContext = z.object({
	organizationId: z.string().trim().min(1).max(200),
	actorUserId: z.string().trim().min(1).max(200),
	legalCompanyId: z.uuid(),
});

const entityQueryContext = z.object({
	organizationId: z.string().trim().min(1).max(200),
	actorUserId: z.string().trim().min(1).max(200),
	id: z.uuid(),
});

const decimal = z
	.string()
	.trim()
	.regex(/^\d+(?:\.\d+)?$/);
const boundedText = z.string().trim().min(1).max(500);
const evidence = z.string().trim().min(1).max(500);

export const ca4SubjectSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("company") }).strict(),
	z
		.object({ kind: z.literal("property"), propertyHoldingId: z.uuid() })
		.strict(),
	z
		.object({
			kind: z.literal("corporate-asset"),
			corporateAssetId: z.uuid(),
		})
		.strict(),
	z
		.object({
			kind: z.literal("intellectual-property"),
			intellectualPropertyRightId: z.uuid(),
		})
		.strict(),
	z.object({ kind: z.literal("other"), description: boundedText }).strict(),
]);

function requireMoneyPair(
	value: { amount?: string; currencyCode?: string },
	ctx: z.RefinementCtx,
) {
	if ((value.amount === undefined) !== (value.currencyCode === undefined)) {
		ctx.addIssue({
			code: "custom",
			message: "Amount and currency must be provided together",
		});
	}
}

export const registerPropertyInputSchema = commandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		propertyType: z.string().trim().min(1).max(64),
		titleReference: z.string().trim().min(1).max(200),
		propertyDescription: boundedText,
		ownershipPercentage: decimal,
		acquisitionDate: z.iso.date(),
		tenureType: z.string().trim().min(1).max(64).optional(),
		valuationReference: evidence.optional(),
	})
	.strict();

export const updatePropertyInputSchema = existingContext
	.extend({
		propertyDescription: boundedText.optional(),
		ownershipPercentage: decimal.optional(),
		tenureType: z.string().trim().min(1).max(64).nullable().optional(),
		valuationReference: evidence.nullable().optional(),
	})
	.strict();

export const disposePropertyInputSchema = existingContext
	.extend({
		disposalDate: z.iso.date(),
		reason: boundedText,
		evidenceReference: evidence,
	})
	.strict();

export const registerCorporateAssetInputSchema = commandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		assetCategory: z.string().trim().min(1).max(64),
		identifier: z.string().trim().min(1).max(200).optional(),
		description: boundedText,
		custodianPartyId: z.uuid().optional(),
		acquisitionDate: z.iso.date(),
	})
	.strict();

export const updateCorporateAssetInputSchema = existingContext
	.extend({
		description: boundedText.optional(),
		custodianPartyId: z.uuid().nullable().optional(),
	})
	.strict();

export const terminateCorporateAssetInputSchema = existingContext
	.extend({
		effectiveDate: z.iso.date(),
		reason: boundedText,
		evidenceReference: evidence,
	})
	.strict();

export const registerIntellectualPropertyInputSchema = commandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		rightType: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(2).max(3),
		applicationNumber: z.string().trim().min(1).max(200).optional(),
		registrationNumber: z.string().trim().min(1).max(200).optional(),
		ownerPartyId: z.uuid(),
		filingDate: z.iso.date().optional(),
		grantDate: z.iso.date().optional(),
		expiryDate: z.iso.date().optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (!value.applicationNumber && !value.registrationNumber) {
			ctx.addIssue({
				code: "custom",
				message: "Application or registration number is required",
			});
		}
	});

export const updateIntellectualPropertyInputSchema = existingContext
	.extend({
		ownerPartyId: z.uuid().optional(),
		grantDate: z.iso.date().nullable().optional(),
		expiryDate: z.iso.date().nullable().optional(),
	})
	.strict();

export const renewIntellectualPropertyInputSchema = existingContext
	.extend({
		renewalDate: z.iso.date(),
		newExpiryDate: z.iso.date(),
		evidenceReference: evidence,
	})
	.strict();

export const terminateIntellectualPropertyInputSchema = existingContext
	.extend({
		effectiveDate: z.iso.date(),
		reason: boundedText,
		evidenceReference: evidence,
	})
	.strict();

export const registerInsurancePolicyInputSchema = commandContext
	.extend({
		policyNumber: z.string().trim().min(1).max(100),
		insurerPartyId: z.uuid(),
		coveredSubject: ca4SubjectSchema,
		effectiveFrom: z.iso.date(),
		effectiveTo: z.iso.date().optional(),
		limitAmount: decimal.optional(),
		currencyCode: z.string().trim().length(3).optional(),
		documentReference: evidence,
	})
	.strict()
	.superRefine((value, ctx) => {
		requireMoneyPair(
			{ amount: value.limitAmount, currencyCode: value.currencyCode },
			ctx,
		);
	});

export const updateInsurancePolicyInputSchema = existingContext
	.extend({
		coveredSubject: ca4SubjectSchema.optional(),
		limitAmount: decimal.nullable().optional(),
		currencyCode: z.string().trim().length(3).nullable().optional(),
		documentReference: evidence.optional(),
	})
	.strict();

export const renewInsurancePolicyInputSchema = existingContext
	.extend({
		renewalDate: z.iso.date(),
		newEffectiveTo: z.iso.date(),
		limitAmount: decimal.optional(),
		currencyCode: z.string().trim().length(3).optional(),
		documentReference: evidence,
		evidenceReference: evidence,
	})
	.strict()
	.superRefine((value, ctx) => {
		requireMoneyPair(
			{ amount: value.limitAmount, currencyCode: value.currencyCode },
			ctx,
		);
	});

export const cancelInsurancePolicyInputSchema = existingContext
	.extend({
		cancellationDate: z.iso.date(),
		reason: boundedText,
		evidenceReference: evidence,
	})
	.strict();

export const registerChargeInputSchema = commandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		chargeType: z.string().trim().min(1).max(64),
		securedPartyId: z.uuid(),
		affectedSubject: ca4SubjectSchema,
		amount: decimal.optional(),
		currencyCode: z.string().trim().length(3).optional(),
		priorityRank: z.number().int().positive(),
		createdDate: z.iso.date(),
		evidenceReference: evidence,
	})
	.strict()
	.superRefine((value, ctx) => {
		requireMoneyPair(
			{ amount: value.amount, currencyCode: value.currencyCode },
			ctx,
		);
	});

export const amendChargeInputSchema = existingContext
	.extend({
		variationDate: z.iso.date(),
		amount: decimal.nullable().optional(),
		currencyCode: z.string().trim().length(3).nullable().optional(),
		priorityRank: z.number().int().positive().optional(),
		evidenceReference: evidence,
	})
	.strict();

export const releaseChargeInputSchema = existingContext
	.extend({
		releasedDate: z.iso.date(),
		reason: boundedText,
		evidenceReference: evidence,
	})
	.strict();

export const getCa4EntityInputSchema = entityQueryContext.strict();
export const listCa4EntitiesInputSchema = queryContext.strict();
export const listCa4EntitiesAsOfInputSchema = queryContext
	.extend({ asOf: z.iso.date() })
	.strict();
export const listCa4EntitiesExpiringInputSchema = queryContext
	.extend({ from: z.iso.date(), to: z.iso.date() })
	.strict();
