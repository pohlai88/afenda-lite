import { z } from "zod";

import {
	companyActivityIdSchema,
	companyFinancialYearIdSchema,
	companyIdentifierIdSchema,
	companyLegalFormHistoryIdSchema,
	companyNameIdSchema,
	legalCompanyIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../kernel/brands";
import { canonicalDateSchema, canonicalInstantSchema } from "../kernel/dates";
import { effectiveRangeSchema } from "../kernel/effective-range";
import {
	cursorPaginationSchema,
	opaqueCursorSchema,
} from "../kernel/pagination";

const nameSchema = z.string().trim().min(1).max(256);
const companyCodeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const normalizedCompanyCodeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const countryCodeSchema = z
	.string()
	.trim()
	.regex(/^[A-Z]{2}$/, "Country code must be ISO-3166 alpha-2");
const entityTypeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
export const companyIdentifierAuthoritySchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const sourceReferenceSchema = z.string().trim().min(1).max(256);
const languageCodePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

export const companyNameTypeSchema = z.enum([
	"legal",
	"former",
	"translated",
	"trading",
]);

export const companyNameStatusSchema = z.enum([
	"active",
	"superseded",
	"retired",
]);

export const companyLegalFormStatusSchema = z.enum(["active", "superseded"]);

const forbiddenCompanyIdentifierTypes = new Set([
	"tax",
	"vat",
	"gst",
	"sales_tax",
	"service_tax",
	"income_tax",
	"withholding_tax",
	"tax_registration",
]);

const nonTaxCompanyIdentifierTypeSchema = z.enum([
	"company_registration",
	"registry_number",
	"business_registration",
	"foreign_registration",
	"legal_entity_identifier",
	"statistical_identifier",
	"industry_identifier",
	"other_non_tax_identifier",
]);

export const companyIdentifierTypeSchema = z
	.string()
	.trim()
	.superRefine((value, context) => {
		if (forbiddenCompanyIdentifierTypes.has(value)) {
			context.addIssue({
				code: "custom",
				message: "Tax identifiers are owned by Master Data tax registration.",
			});
		}
	})
	.pipe(nonTaxCompanyIdentifierTypeSchema);

export const companyIdentifierStatusSchema = z.enum([
	"active",
	"superseded",
	"retired",
]);

export const companyActivityClassificationSchema = z.enum([
	"registered_object",
	"regulated",
	"operational",
]);

export const companyActivityTypeSchema = companyActivityClassificationSchema;

export const companyActivityStatusSchema = z.enum(["active", "ended"]);

export const languageCodeSchema = z
	.string()
	.trim()
	.min(2)
	.max(8)
	.regex(languageCodePattern, "Language code must be BCP-47 language/region");

export const effectivePeriodSchema = effectiveRangeSchema;

export const correctionReasonSchema = z.string().trim().min(1).max(512);

export const sourceDocumentReferenceSchema = sourceReferenceSchema;

export const sourceEvidenceSchema = sourceDocumentReferenceSchema;

export const financialYearEndSchema = z
	.object({
		month: z.number().int().min(1).max(12),
		day: z.number().int().min(1).max(31),
	})
	.strict()
	.readonly();

const financialYearCalendarFields = {
	fiscalYearStartMonth: z.number().int().min(1).max(12),
	fiscalYearStartDay: z.number().int().min(1).max(31),
	reportingCurrencyCode: z
		.string()
		.trim()
		.regex(/^[A-Z]{3}$/),
} as const;

export const financialYearCalendarSchema = z
	.object(financialYearCalendarFields)
	.strict()
	.superRefine(validateFinancialYearCalendar)
	.readonly();

const commandEffectivePeriodFields = {
	effectiveFrom: canonicalDateSchema,
	effectiveTo: canonicalDateSchema.nullable().optional(),
} as const;

function validateCommandEffectivePeriod(
	value: { effectiveFrom: string; effectiveTo?: string | null },
	context: z.RefinementCtx,
): void {
	if (value.effectiveTo !== undefined && value.effectiveTo !== null) {
		if (value.effectiveTo <= value.effectiveFrom) {
			context.addIssue({
				code: "custom",
				path: ["effectiveTo"],
				message: "Effective end date must be after effective start date",
			});
		}
	}
}

function validateFinancialYearCalendar(
	value: { fiscalYearStartMonth: number; fiscalYearStartDay: number },
	context: z.RefinementCtx,
): void {
	const lastDay = new Date(2000, value.fiscalYearStartMonth, 0).getDate();
	if (value.fiscalYearStartDay > lastDay) {
		context.addIssue({
			code: "custom",
			path: ["fiscalYearStartDay"],
			message: "Financial year day is invalid for the selected month",
		});
	}
}

const companyNameObjectSchema = z.object({
	id: companyNameIdSchema,
	organizationId: organizationIdSchema,
	legalCompanyId: legalCompanyIdSchema,
	nameType: companyNameTypeSchema,
	languageCode: languageCodeSchema,
	displayName: nameSchema,
	normalizedName: nameSchema,
	effectiveFrom: canonicalDateSchema,
	effectiveTo: canonicalDateSchema.nullable(),
	recordedAt: z.coerce.date(),
	recordedBy: userIdSchema,
	sourceDocumentId: sourceDocumentReferenceSchema.nullable(),
	correctionReason: correctionReasonSchema.nullable(),
	status: companyNameStatusSchema,
	supersedesId: companyNameIdSchema.nullable(),
	supersededAt: z.coerce.date().nullable(),
	retiredAt: z.coerce.date().nullable(),
	version: z.number().int().nonnegative(),
});

export const companyNameSchema = companyNameObjectSchema.readonly();

const companyLegalFormObjectSchema = z.object({
	id: companyLegalFormHistoryIdSchema,
	organizationId: organizationIdSchema,
	legalCompanyId: legalCompanyIdSchema,
	jurisdictionCode: countryCodeSchema,
	legalFormCode: entityTypeSchema,
	entityTypeCode: entityTypeSchema,
	effectiveFrom: canonicalDateSchema,
	effectiveTo: canonicalDateSchema.nullable(),
	recordedAt: z.coerce.date(),
	recordedBy: userIdSchema,
	sourceDocumentId: sourceDocumentReferenceSchema.nullable(),
	correctionReason: correctionReasonSchema.nullable(),
	status: companyLegalFormStatusSchema,
	supersedesId: companyLegalFormHistoryIdSchema.nullable(),
	supersededAt: z.coerce.date().nullable(),
	version: z.number().int().nonnegative(),
});

export const companyLegalFormSchema = companyLegalFormObjectSchema.readonly();

const companyIdentifierObjectSchema = z.object({
	id: companyIdentifierIdSchema,
	organizationId: organizationIdSchema,
	legalCompanyId: legalCompanyIdSchema,
	identifierType: companyIdentifierTypeSchema,
	jurisdictionCode: countryCodeSchema,
	issuingAuthorityCode: entityTypeSchema,
	identifierValue: z.string().trim().min(1).max(128),
	normalizedIdentifierValue: z.string().trim().min(1).max(128),
	effectiveFrom: canonicalDateSchema,
	effectiveTo: canonicalDateSchema.nullable(),
	recordedAt: z.coerce.date(),
	recordedBy: userIdSchema,
	sourceDocumentId: sourceDocumentReferenceSchema.nullable(),
	correctionReason: correctionReasonSchema.nullable(),
	status: companyIdentifierStatusSchema,
	supersedesId: companyIdentifierIdSchema.nullable(),
	supersededAt: z.coerce.date().nullable(),
	retiredAt: z.coerce.date().nullable(),
	version: z.number().int().nonnegative(),
});

export const companyIdentifierSchema = companyIdentifierObjectSchema.readonly();

const companyFinancialYearObjectSchema = z.object({
	id: companyFinancialYearIdSchema,
	organizationId: organizationIdSchema,
	legalCompanyId: legalCompanyIdSchema,
	fiscalYearStartMonth: z.number().int().min(1).max(12),
	fiscalYearStartDay: z.number().int().min(1).max(31),
	reportingCurrencyCode: z
		.string()
		.trim()
		.regex(/^[A-Z]{3}$/),
	effectiveFrom: canonicalDateSchema,
	effectiveTo: canonicalDateSchema.nullable(),
	recordedAt: z.coerce.date(),
	recordedBy: userIdSchema,
	sourceDocumentId: sourceDocumentReferenceSchema,
	correctionReason: correctionReasonSchema.nullable(),
	status: z.literal("active"),
	version: z.number().int().nonnegative(),
});

export const companyFinancialYearSchema =
	companyFinancialYearObjectSchema.readonly();

const companyActivityObjectSchema = z.object({
	id: companyActivityIdSchema,
	organizationId: organizationIdSchema,
	legalCompanyId: legalCompanyIdSchema,
	activityCode: entityTypeSchema,
	classification: companyActivityClassificationSchema,
	jurisdictionCode: countryCodeSchema,
	regulatorCode: entityTypeSchema.nullable(),
	description: z.string().trim().min(1).max(512),
	effectiveFrom: canonicalDateSchema,
	effectiveTo: canonicalDateSchema.nullable(),
	recordedAt: z.coerce.date(),
	recordedBy: userIdSchema,
	sourceDocumentId: sourceDocumentReferenceSchema,
	status: companyActivityStatusSchema,
	version: z.number().int().nonnegative(),
});

export const companyActivitySchema = companyActivityObjectSchema.readonly();

const companyJurisdictionProfileObjectSchema = z.object({
	jurisdictionProfileId: z.uuid(),
	organizationId: organizationIdSchema,
	legalCompanyId: legalCompanyIdSchema,
	jurisdictionCountryCode: countryCodeSchema,
	entityType: entityTypeSchema,
	effectiveRange: effectiveRangeSchema,
	recordedAt: canonicalInstantSchema,
	recordedByUserId: userIdSchema,
	sourceReference: sourceReferenceSchema,
	supersededAt: canonicalInstantSchema.nullable(),
	supersededByProfileId: z.uuid().nullable(),
	version: z.number().int().nonnegative(),
});

export const companyJurisdictionProfileSchema =
	companyJurisdictionProfileObjectSchema.readonly();

const legalCompanyProfileObjectSchema = z.object({
	displayName: nameSchema,
	registeredName: nameSchema.optional(),
	shortName: z.string().trim().min(1).max(128).optional(),
	sourceReference: sourceReferenceSchema,
});

export const legalCompanyProfileSchema =
	legalCompanyProfileObjectSchema.readonly();

const legalCompanyObjectSchema = z.object({
	organizationId: organizationIdSchema,
	legalCompanyId: legalCompanyIdSchema,
	companyCode: companyCodeSchema,
	normalizedCompanyCode: normalizedCompanyCodeSchema,
	masterDataPartyId: z.string().trim().min(1).max(128),
	homeJurisdictionCountryCode: countryCodeSchema,
	state: z.literal("draft"),
	profile: legalCompanyProfileSchema,
	currentJurisdictionProfile: companyJurisdictionProfileSchema.nullable(),
	createdByUserId: userIdSchema,
	updatedByUserId: userIdSchema,
	createdAt: canonicalInstantSchema,
	updatedAt: canonicalInstantSchema,
	version: z.number().int().nonnegative(),
});

export const legalCompanySchema = legalCompanyObjectSchema.readonly();

export const legalCompanyListItemSchema = legalCompanyObjectSchema
	.pick({
		organizationId: true,
		legalCompanyId: true,
		companyCode: true,
		normalizedCompanyCode: true,
		masterDataPartyId: true,
		homeJurisdictionCountryCode: true,
		state: true,
		profile: true,
		version: true,
	})
	.extend({
		jurisdictionCountryCode: countryCodeSchema.nullable(),
		entityType: entityTypeSchema.nullable(),
	})
	.readonly();

export const legalCompanyListPageSchema = z
	.object({
		items: z.array(legalCompanyListItemSchema).readonly(),
		nextCursor: opaqueCursorSchema.nullable(),
	})
	.readonly();

export const companyJurisdictionProfileTimelineEntrySchema =
	companyJurisdictionProfileObjectSchema
		.extend({
			kind: z.literal("jurisdiction_profile"),
		})
		.readonly();

export const legalCompanyTimelineEntrySchema = z
	.discriminatedUnion("kind", [
		z
			.object({
				kind: z.literal("profile"),
				legalCompanyId: legalCompanyIdSchema,
				recordedAt: canonicalInstantSchema,
				version: z.number().int().nonnegative(),
				profile: legalCompanyProfileSchema,
			})
			.readonly(),
		companyJurisdictionProfileTimelineEntrySchema,
	])
	.readonly();

export const updateLegalCompanyProfileInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		expectedVersion: z.number().int().nonnegative(),
		profile: legalCompanyProfileSchema,
	})
	.strict()
	.readonly();

export const registerLegalCompanyDraftInputSchema = z
	.object({
		companyCode: companyCodeSchema,
		displayName: nameSchema,
		masterDataPartyId: z.string().trim().min(1).max(128),
		homeJurisdictionCountryCode: countryCodeSchema,
		sourceReference: sourceReferenceSchema,
	})
	.strict()
	.readonly();

export const setCompanyJurisdictionProfileInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		jurisdictionCountryCode: countryCodeSchema,
		entityType: entityTypeSchema,
		effectiveRange: effectiveRangeSchema,
		recordedAt: canonicalInstantSchema,
		sourceReference: sourceReferenceSchema,
		expectedCompanyVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

const companyJurisdictionProfileReplacementSchema = z
	.object({
		jurisdictionCountryCode: countryCodeSchema,
		entityType: entityTypeSchema,
		effectiveRange: effectiveRangeSchema,
		recordedAt: canonicalInstantSchema,
		sourceReference: sourceReferenceSchema,
	})
	.strict()
	.readonly();

export const supersedeCompanyJurisdictionProfileInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		jurisdictionProfileId: z.uuid(),
		replacement: companyJurisdictionProfileReplacementSchema,
		expectedProfileVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

export const addCompanyNameInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		nameType: companyNameTypeSchema,
		languageCode: languageCodeSchema,
		displayName: nameSchema,
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceDocumentReferenceSchema.nullable().optional(),
		correctionReason: correctionReasonSchema.optional(),
		expectedCompanyVersion: z.number().int().nonnegative(),
	})
	.strict()
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

const companyNameReplacementSchema = z
	.object({
		nameType: companyNameTypeSchema,
		languageCode: languageCodeSchema,
		displayName: nameSchema,
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceDocumentReferenceSchema,
		correctionReason: correctionReasonSchema,
	})
	.strict()
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

export const supersedeCompanyNameInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		companyNameId: companyNameIdSchema,
		replacement: companyNameReplacementSchema,
		expectedNameVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

export const retireCompanyNameInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		companyNameId: companyNameIdSchema,
		retiredAt: canonicalInstantSchema,
		retirementReason: correctionReasonSchema,
		sourceDocumentId: sourceDocumentReferenceSchema.nullable().optional(),
		expectedNameVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

export const setCompanyLegalFormInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		legalFormCode: entityTypeSchema,
		jurisdictionCode: countryCodeSchema,
		entityTypeCode: entityTypeSchema,
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceDocumentReferenceSchema,
		correctionReason: correctionReasonSchema.optional(),
		expectedCompanyVersion: z.number().int().nonnegative(),
	})
	.strict()
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

const companyLegalFormReplacementSchema = z
	.object({
		legalFormCode: entityTypeSchema,
		jurisdictionCode: countryCodeSchema,
		entityTypeCode: entityTypeSchema,
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceDocumentReferenceSchema,
		correctionReason: correctionReasonSchema,
	})
	.strict()
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

export const supersedeCompanyLegalFormInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		companyLegalFormHistoryId: companyLegalFormHistoryIdSchema,
		replacement: companyLegalFormReplacementSchema,
		expectedLegalFormVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

export const registerCompanyIdentifierInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		identifierType: companyIdentifierTypeSchema,
		jurisdictionCode: countryCodeSchema,
		issuingAuthorityCode: companyIdentifierAuthoritySchema,
		identifierValue: z.string().trim().min(1).max(128),
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceEvidenceSchema,
		correctionReason: correctionReasonSchema.optional(),
		expectedCompanyVersion: z.number().int().nonnegative(),
	})
	.strict()
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

const companyIdentifierReplacementSchema = z
	.object({
		identifierType: companyIdentifierTypeSchema,
		jurisdictionCode: countryCodeSchema,
		issuingAuthorityCode: companyIdentifierAuthoritySchema,
		identifierValue: z.string().trim().min(1).max(128),
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceEvidenceSchema,
		correctionReason: correctionReasonSchema,
	})
	.strict()
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

export const supersedeCompanyIdentifierInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		companyIdentifierId: companyIdentifierIdSchema,
		replacement: companyIdentifierReplacementSchema,
		expectedIdentifierVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

export const retireCompanyIdentifierInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		companyIdentifierId: companyIdentifierIdSchema,
		retiredAt: canonicalInstantSchema,
		retirementReason: correctionReasonSchema,
		expectedIdentifierVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

export const setCompanyFinancialYearInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		...financialYearCalendarFields,
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceEvidenceSchema,
		correctionReason: correctionReasonSchema.optional(),
		expectedCompanyVersion: z.number().int().nonnegative(),
	})
	.strict()
	.superRefine(validateFinancialYearCalendar)
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

export const registerCompanyActivityInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		activityCode: entityTypeSchema,
		classification: companyActivityClassificationSchema,
		jurisdictionCode: countryCodeSchema,
		regulatorCode: entityTypeSchema.nullable().optional(),
		description: z.string().trim().min(1).max(512),
		...commandEffectivePeriodFields,
		sourceDocumentId: sourceEvidenceSchema,
		expectedCompanyVersion: z.number().int().nonnegative(),
	})
	.strict()
	.superRefine(validateCommandEffectivePeriod)
	.readonly();

export const endCompanyActivityInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		companyActivityId: companyActivityIdSchema,
		endedAt: canonicalDateSchema,
		endReason: correctionReasonSchema,
		expectedActivityVersion: z.number().int().nonnegative(),
	})
	.strict()
	.readonly();

export const getLegalCompanyInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		knownAt: canonicalInstantSchema.optional(),
	})
	.strict()
	.readonly();

export const listLegalCompaniesInputSchema = z
	.object({
		asOf: canonicalDateSchema.optional(),
		knownAt: canonicalInstantSchema.optional(),
		pagination: cursorPaginationSchema.optional(),
	})
	.strict()
	.readonly();

export const findCompanyJurisdictionProfileAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		knownAt: canonicalInstantSchema.optional(),
	})
	.strict()
	.readonly();

export const listCompanyNamesInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		nameType: companyNameTypeSchema.optional(),
		languageCode: languageCodeSchema.optional(),
		activeAt: canonicalDateSchema.optional(),
		includeFormer: z.boolean().optional(),
		cursor: opaqueCursorSchema.optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();

export const findCompanyNameAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		nameType: companyNameTypeSchema,
		languageCode: languageCodeSchema,
		asOf: canonicalDateSchema,
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();

export const findCompanyLegalFormAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		jurisdictionCode: countryCodeSchema.optional(),
		asOf: canonicalDateSchema,
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();

export const listCompanyIdentifiersInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		identifierType: companyIdentifierTypeSchema.optional(),
		jurisdictionCode: countryCodeSchema.optional(),
		authorityCode: companyIdentifierAuthoritySchema.optional(),
		issuingAuthorityCode: companyIdentifierAuthoritySchema.optional(),
		activeAt: canonicalDateSchema.optional(),
		includeRetired: z.boolean().optional(),
		cursor: opaqueCursorSchema.optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();

export const findCompanyIdentifierAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		identifierType: companyIdentifierTypeSchema,
		jurisdictionCode: countryCodeSchema.optional(),
		authorityCode: companyIdentifierAuthoritySchema.optional(),
		issuingAuthorityCode: companyIdentifierAuthoritySchema.optional(),
		asOf: canonicalDateSchema,
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();

export const findCompanyFinancialYearAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();

export const listCompanyActivitiesAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		activityType: companyActivityClassificationSchema.optional(),
		classification: companyActivityClassificationSchema.optional(),
		classificationSystem: entityTypeSchema.optional(),
		jurisdictionCode: countryCodeSchema.optional(),
		regulatorCode: entityTypeSchema.optional(),
		primaryOnly: z.boolean().optional(),
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();

export const getLegalCompanyTimelineInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		knownAt: canonicalInstantSchema.optional(),
	})
	.strict()
	.readonly();
