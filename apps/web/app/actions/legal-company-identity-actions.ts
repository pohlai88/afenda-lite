"use server";

import { randomUUID } from "node:crypto";

import {
	addCompanyName,
	corporateAdministrationPermissionFor,
	endCompanyActivity,
	registerCompanyActivity,
	registerCompanyIdentifier,
	retireCompanyIdentifier,
	retireCompanyName,
	setCompanyFinancialYear,
	setCompanyLegalForm,
	supersedeCompanyIdentifier,
	supersedeCompanyLegalForm,
	supersedeCompanyName,
} from "@afenda/corporate-administration";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/_runtime/run-member-permission-action";
import {
	createCorporateAdministrationCommandOptions,
	createCorporateAdministrationCompanyDependencies,
} from "@/lib/erp/corporate-administration-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const legalCompanyIdSchema = z.string().trim().uuid();
const companyNameIdSchema = z.string().trim().uuid();
const companyLegalFormHistoryIdSchema = z.string().trim().uuid();
const companyIdentifierIdSchema = z.string().trim().uuid();
const companyActivityIdSchema = z.string().trim().uuid();
const dateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/);
const instantSchema = z.string().trim().datetime({ offset: true });
const nameTypeSchema = z.enum(["legal", "former", "translated", "trading"]);
const languageCodeSchema = z
	.string()
	.trim()
	.min(2)
	.max(8)
	.regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const codeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
const countryCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(/^[A-Z]{2}$/);
const authorityCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.min(1)
	.max(64)
	.regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/);
const identifierTypeSchema = z.enum([
	"company_registration",
	"registry_number",
	"business_registration",
	"foreign_registration",
	"legal_entity_identifier",
	"statistical_identifier",
	"industry_identifier",
	"other_non_tax_identifier",
]);
const activityTypeSchema = z.enum([
	"registered_object",
	"regulated",
	"operational",
]);
const sourceDocumentIdSchema = z.string().trim().min(1).max(256);
const correctionReasonSchema = z.string().trim().min(1).max(512);
const approvalRequestIdSchema = z.string().uuid().brand("ApprovalRequestId");
const approvalDecisionIdSchema = z.string().uuid().brand("ApprovalDecisionId");
type ApprovalRequestId = z.infer<typeof approvalRequestIdSchema>;
type ApprovalDecisionId = z.infer<typeof approvalDecisionIdSchema>;
type OptionalCanonicalField = "correctionReason";

const legalCompanyIdentityActionMetadataSchema = {
	organizationSlug: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.regex(/^[a-z0-9][a-z0-9-]*$/),
	idempotencyKey: z.string().trim().min(1).max(128).optional(),
	approvalRequestId: approvalRequestIdSchema.optional(),
	approvalDecisionId: approvalDecisionIdSchema.optional(),
} as const;

const optionalDateSchema = z.preprocess(
	emptyStringToUndefined,
	dateSchema.optional(),
);
const optionalSourceDocumentIdSchema = z.preprocess(
	emptyStringToUndefined,
	sourceDocumentIdSchema.optional(),
);
const optionalCorrectionReasonSchema = z.preprocess(
	emptyStringToUndefined,
	correctionReasonSchema.optional(),
);

function optionalCanonicalString<K extends OptionalCanonicalField>(
	key: K,
	value: string | undefined,
): Record<K, string> | Record<string, never> {
	return value === undefined ? {} : ({ [key]: value } as Record<K, string>);
}

const addCompanyNameActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		nameType: nameTypeSchema,
		languageCode: languageCodeSchema,
		displayName: z.string().trim().min(1).max(256),
		effectiveFrom: dateSchema,
		effectiveTo: optionalDateSchema,
		sourceDocumentId: optionalSourceDocumentIdSchema,
		correctionReason: optionalCorrectionReasonSchema,
		expectedCompanyVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const supersedeCompanyNameActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		companyNameId: companyNameIdSchema,
		expectedNameVersion: z.coerce.number().int().nonnegative(),
		replacement: z
			.object({
				nameType: nameTypeSchema,
				languageCode: languageCodeSchema,
				displayName: z.string().trim().min(1).max(256),
				effectiveFrom: dateSchema,
				effectiveTo: optionalDateSchema,
				sourceDocumentId: sourceDocumentIdSchema,
				correctionReason: correctionReasonSchema,
			})
			.strict(),
	})
	.strict();

const retireCompanyNameActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		companyNameId: companyNameIdSchema,
		retiredAt: instantSchema,
		retirementReason: correctionReasonSchema,
		sourceDocumentId: optionalSourceDocumentIdSchema,
		expectedNameVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const setCompanyLegalFormActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		legalFormCode: codeSchema,
		jurisdictionCode: countryCodeSchema,
		entityTypeCode: codeSchema,
		effectiveFrom: dateSchema,
		effectiveTo: optionalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		correctionReason: optionalCorrectionReasonSchema,
		expectedCompanyVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const supersedeCompanyLegalFormActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		companyLegalFormHistoryId: companyLegalFormHistoryIdSchema,
		expectedLegalFormVersion: z.coerce.number().int().nonnegative(),
		replacement: z
			.object({
				legalFormCode: codeSchema,
				jurisdictionCode: countryCodeSchema,
				entityTypeCode: codeSchema,
				effectiveFrom: dateSchema,
				effectiveTo: optionalDateSchema,
				sourceDocumentId: sourceDocumentIdSchema,
				correctionReason: correctionReasonSchema,
			})
			.strict(),
	})
	.strict();

const registerCompanyIdentifierActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		identifierType: identifierTypeSchema,
		jurisdictionCode: countryCodeSchema,
		issuingAuthorityCode: authorityCodeSchema,
		identifierValue: z.string().trim().min(1).max(128),
		effectiveFrom: dateSchema,
		effectiveTo: optionalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		correctionReason: optionalCorrectionReasonSchema,
		expectedCompanyVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const supersedeCompanyIdentifierActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		companyIdentifierId: companyIdentifierIdSchema,
		expectedIdentifierVersion: z.coerce.number().int().nonnegative(),
		replacement: z
			.object({
				identifierType: identifierTypeSchema,
				jurisdictionCode: countryCodeSchema,
				issuingAuthorityCode: authorityCodeSchema,
				identifierValue: z.string().trim().min(1).max(128),
				effectiveFrom: dateSchema,
				effectiveTo: optionalDateSchema,
				sourceDocumentId: sourceDocumentIdSchema,
				correctionReason: correctionReasonSchema,
			})
			.strict(),
	})
	.strict();

const retireCompanyIdentifierActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		companyIdentifierId: companyIdentifierIdSchema,
		retiredAt: instantSchema,
		retirementReason: correctionReasonSchema,
		expectedIdentifierVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const setCompanyFinancialYearActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
		fiscalYearStartDay: z.coerce.number().int().min(1).max(31),
		reportingCurrencyCode: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/),
		effectiveFrom: dateSchema,
		effectiveTo: optionalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		correctionReason: optionalCorrectionReasonSchema,
		expectedCompanyVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const registerCompanyActivityActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		activityCode: codeSchema,
		classification: activityTypeSchema,
		jurisdictionCode: countryCodeSchema,
		regulatorCode: z.preprocess(emptyStringToUndefined, codeSchema.optional()),
		description: z.string().trim().min(1).max(512),
		effectiveFrom: dateSchema,
		effectiveTo: optionalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

const endCompanyActivityActionSchema = z
	.object({
		...legalCompanyIdentityActionMetadataSchema,
		legalCompanyId: legalCompanyIdSchema,
		companyActivityId: companyActivityIdSchema,
		endedAt: dateSchema,
		endReason: correctionReasonSchema,
		expectedActivityVersion: z.coerce.number().int().nonnegative(),
	})
	.strict();

export async function addCompanyNameAction(
	formData: FormData,
): Promise<ActionResult<{ companyNameId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "addCompanyNameAction",
		permission: corporateAdministrationPermissionFor("addCompanyName"),
		safeMessage: "Could not add company name.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				addCompanyNameActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await addCompanyName(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					nameType: parsed.data.nameType,
					languageCode: parsed.data.languageCode,
					displayName: parsed.data.displayName,
					effectiveFrom: parsed.data.effectiveFrom,
					effectiveTo: parsed.data.effectiveTo ?? null,
					sourceDocumentId: parsed.data.sourceDocumentId ?? null,
					...optionalCanonicalString(
						"correctionReason",
						parsed.data.correctionReason,
					),
					expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: { companyNameId: mapped.data.id, version: mapped.data.version },
			};
		},
	});
}

export async function supersedeCompanyNameAction(
	formData: FormData,
): Promise<ActionResult<{ companyNameId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "supersedeCompanyNameAction",
		permission: corporateAdministrationPermissionFor("supersedeCompanyName"),
		safeMessage: "Could not supersede company name.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				supersedeCompanyNameActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await supersedeCompanyName(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					companyNameId: parsed.data.companyNameId,
					expectedNameVersion: parsed.data.expectedNameVersion,
					replacement: {
						nameType: parsed.data.replacement.nameType,
						languageCode: parsed.data.replacement.languageCode,
						displayName: parsed.data.replacement.displayName,
						effectiveFrom: parsed.data.replacement.effectiveFrom,
						effectiveTo: parsed.data.replacement.effectiveTo ?? null,
						sourceDocumentId: parsed.data.replacement.sourceDocumentId,
						correctionReason: parsed.data.replacement.correctionReason,
					},
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: { companyNameId: mapped.data.id, version: mapped.data.version },
			};
		},
	});
}

export async function retireCompanyNameAction(
	formData: FormData,
): Promise<ActionResult<{ companyNameId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "retireCompanyNameAction",
		permission: corporateAdministrationPermissionFor("retireCompanyName"),
		safeMessage: "Could not retire company name.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				retireCompanyNameActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await retireCompanyName(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					companyNameId: parsed.data.companyNameId,
					retiredAt: parsed.data.retiredAt,
					retirementReason: parsed.data.retirementReason,
					sourceDocumentId: parsed.data.sourceDocumentId ?? null,
					expectedNameVersion: parsed.data.expectedNameVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: { companyNameId: mapped.data.id, version: mapped.data.version },
			};
		},
	});
}

export async function setCompanyLegalFormAction(
	formData: FormData,
): Promise<ActionResult<{ legalFormHistoryId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "setCompanyLegalFormAction",
		permission: corporateAdministrationPermissionFor("setCompanyLegalForm"),
		safeMessage: "Could not set company legal form.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				setCompanyLegalFormActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await setCompanyLegalForm(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					legalFormCode: parsed.data.legalFormCode,
					jurisdictionCode: parsed.data.jurisdictionCode,
					entityTypeCode: parsed.data.entityTypeCode,
					effectiveFrom: parsed.data.effectiveFrom,
					effectiveTo: parsed.data.effectiveTo ?? null,
					sourceDocumentId: parsed.data.sourceDocumentId,
					...optionalCanonicalString(
						"correctionReason",
						parsed.data.correctionReason,
					),
					expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					legalFormHistoryId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function supersedeCompanyLegalFormAction(
	formData: FormData,
): Promise<ActionResult<{ legalFormHistoryId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "supersedeCompanyLegalFormAction",
		permission: corporateAdministrationPermissionFor(
			"supersedeCompanyLegalForm",
		),
		safeMessage: "Could not supersede company legal form.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				supersedeCompanyLegalFormActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await supersedeCompanyLegalForm(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					companyLegalFormHistoryId: parsed.data.companyLegalFormHistoryId,
					expectedLegalFormVersion: parsed.data.expectedLegalFormVersion,
					replacement: {
						legalFormCode: parsed.data.replacement.legalFormCode,
						jurisdictionCode: parsed.data.replacement.jurisdictionCode,
						entityTypeCode: parsed.data.replacement.entityTypeCode,
						effectiveFrom: parsed.data.replacement.effectiveFrom,
						effectiveTo: parsed.data.replacement.effectiveTo ?? null,
						sourceDocumentId: parsed.data.replacement.sourceDocumentId,
						correctionReason: parsed.data.replacement.correctionReason,
					},
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					legalFormHistoryId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function registerCompanyIdentifierAction(
	formData: FormData,
): Promise<ActionResult<{ companyIdentifierId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "registerCompanyIdentifierAction",
		permission: corporateAdministrationPermissionFor(
			"registerCompanyIdentifier",
		),
		safeMessage: "Could not register company identifier.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				registerCompanyIdentifierActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await registerCompanyIdentifier(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					identifierType: parsed.data.identifierType,
					jurisdictionCode: parsed.data.jurisdictionCode,
					issuingAuthorityCode: parsed.data.issuingAuthorityCode,
					identifierValue: parsed.data.identifierValue,
					effectiveFrom: parsed.data.effectiveFrom,
					effectiveTo: parsed.data.effectiveTo ?? null,
					sourceDocumentId: parsed.data.sourceDocumentId,
					...optionalCanonicalString(
						"correctionReason",
						parsed.data.correctionReason,
					),
					expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					companyIdentifierId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function supersedeCompanyIdentifierAction(
	formData: FormData,
): Promise<ActionResult<{ companyIdentifierId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "supersedeCompanyIdentifierAction",
		permission: corporateAdministrationPermissionFor(
			"supersedeCompanyIdentifier",
		),
		safeMessage: "Could not supersede company identifier.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				supersedeCompanyIdentifierActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await supersedeCompanyIdentifier(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					companyIdentifierId: parsed.data.companyIdentifierId,
					expectedIdentifierVersion: parsed.data.expectedIdentifierVersion,
					replacement: {
						identifierType: parsed.data.replacement.identifierType,
						jurisdictionCode: parsed.data.replacement.jurisdictionCode,
						issuingAuthorityCode: parsed.data.replacement.issuingAuthorityCode,
						identifierValue: parsed.data.replacement.identifierValue,
						effectiveFrom: parsed.data.replacement.effectiveFrom,
						effectiveTo: parsed.data.replacement.effectiveTo ?? null,
						sourceDocumentId: parsed.data.replacement.sourceDocumentId,
						correctionReason: parsed.data.replacement.correctionReason,
					},
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					companyIdentifierId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function retireCompanyIdentifierAction(
	formData: FormData,
): Promise<ActionResult<{ companyIdentifierId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "retireCompanyIdentifierAction",
		permission: corporateAdministrationPermissionFor("retireCompanyIdentifier"),
		safeMessage: "Could not retire company identifier.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				retireCompanyIdentifierActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await retireCompanyIdentifier(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					companyIdentifierId: parsed.data.companyIdentifierId,
					retiredAt: parsed.data.retiredAt,
					retirementReason: parsed.data.retirementReason,
					expectedIdentifierVersion: parsed.data.expectedIdentifierVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					companyIdentifierId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function setCompanyFinancialYearAction(
	formData: FormData,
): Promise<ActionResult<{ companyFinancialYearId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "setCompanyFinancialYearAction",
		permission: corporateAdministrationPermissionFor("setCompanyFinancialYear"),
		safeMessage: "Could not set company financial year.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				setCompanyFinancialYearActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await setCompanyFinancialYear(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					fiscalYearStartMonth: parsed.data.fiscalYearStartMonth,
					fiscalYearStartDay: parsed.data.fiscalYearStartDay,
					reportingCurrencyCode: parsed.data.reportingCurrencyCode,
					effectiveFrom: parsed.data.effectiveFrom,
					effectiveTo: parsed.data.effectiveTo ?? null,
					sourceDocumentId: parsed.data.sourceDocumentId,
					...optionalCanonicalString(
						"correctionReason",
						parsed.data.correctionReason,
					),
					expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					companyFinancialYearId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function registerCompanyActivityAction(
	formData: FormData,
): Promise<ActionResult<{ companyActivityId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "registerCompanyActivityAction",
		permission: corporateAdministrationPermissionFor("registerCompanyActivity"),
		safeMessage: "Could not register company activity.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				registerCompanyActivityActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await registerCompanyActivity(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					activityCode: parsed.data.activityCode,
					classification: parsed.data.classification,
					jurisdictionCode: parsed.data.jurisdictionCode,
					regulatorCode: parsed.data.regulatorCode ?? null,
					description: parsed.data.description,
					effectiveFrom: parsed.data.effectiveFrom,
					effectiveTo: parsed.data.effectiveTo ?? null,
					sourceDocumentId: parsed.data.sourceDocumentId,
					expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					companyActivityId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function endCompanyActivityAction(
	formData: FormData,
): Promise<ActionResult<{ companyActivityId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "endCompanyActivityAction",
		permission: corporateAdministrationPermissionFor("endCompanyActivity"),
		safeMessage: "Could not end company activity.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				endCompanyActivityActionSchema,
				formDataToStrictObject(formData),
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await endCompanyActivity(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					companyActivityId: parsed.data.companyActivityId,
					endedAt: parsed.data.endedAt,
					endReason: parsed.data.endReason,
					expectedActivityVersion: parsed.data.expectedActivityVersion,
				},
				createCommandOptions(parsed.data, session, correlationId),
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateLegalCompanyIdentityRoutes(
				parsed.data.organizationSlug,
				parsed.data.legalCompanyId,
			);
			return {
				ok: true,
				data: {
					companyActivityId: mapped.data.id,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function addCompanyNameFormAction(
	_previousState: ActionResult<{
		companyNameId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{ companyNameId: string; version: number }> | null> {
	return await addCompanyNameAction(formData);
}

export async function supersedeCompanyNameFormAction(
	_previousState: ActionResult<{
		companyNameId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{ companyNameId: string; version: number }> | null> {
	return await supersedeCompanyNameAction(formData);
}

export async function retireCompanyNameFormAction(
	_previousState: ActionResult<{
		companyNameId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{ companyNameId: string; version: number }> | null> {
	return await retireCompanyNameAction(formData);
}

export async function setCompanyLegalFormFormAction(
	_previousState: ActionResult<{
		legalFormHistoryId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	legalFormHistoryId: string;
	version: number;
}> | null> {
	return await setCompanyLegalFormAction(formData);
}

export async function supersedeCompanyLegalFormFormAction(
	_previousState: ActionResult<{
		legalFormHistoryId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	legalFormHistoryId: string;
	version: number;
}> | null> {
	return await supersedeCompanyLegalFormAction(formData);
}

export async function registerCompanyIdentifierFormAction(
	_previousState: ActionResult<{
		companyIdentifierId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	companyIdentifierId: string;
	version: number;
}> | null> {
	return await registerCompanyIdentifierAction(formData);
}

export async function supersedeCompanyIdentifierFormAction(
	_previousState: ActionResult<{
		companyIdentifierId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	companyIdentifierId: string;
	version: number;
}> | null> {
	return await supersedeCompanyIdentifierAction(formData);
}

export async function retireCompanyIdentifierFormAction(
	_previousState: ActionResult<{
		companyIdentifierId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	companyIdentifierId: string;
	version: number;
}> | null> {
	return await retireCompanyIdentifierAction(formData);
}

export async function setCompanyFinancialYearFormAction(
	_previousState: ActionResult<{
		companyFinancialYearId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	companyFinancialYearId: string;
	version: number;
}> | null> {
	return await setCompanyFinancialYearAction(formData);
}

export async function registerCompanyActivityFormAction(
	_previousState: ActionResult<{
		companyActivityId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	companyActivityId: string;
	version: number;
}> | null> {
	return await registerCompanyActivityAction(formData);
}

export async function endCompanyActivityFormAction(
	_previousState: ActionResult<{
		companyActivityId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{
	companyActivityId: string;
	version: number;
}> | null> {
	return await endCompanyActivityAction(formData);
}

function createCommandOptions(
	input: {
		idempotencyKey?: string | undefined;
		approvalRequestId?: ApprovalRequestId | undefined;
		approvalDecisionId?: ApprovalDecisionId | undefined;
	},
	session: { orgId: string; userId: string },
	correlationId: string,
) {
	return {
		...createCorporateAdministrationCommandOptions({
			organizationId: session.orgId,
			actorUserId: session.userId,
			correlationId,
			idempotencyKey: input.idempotencyKey ?? randomUUID(),
		}),
		...(input.approvalRequestId === undefined
			? {}
			: { approvalRequestId: input.approvalRequestId }),
		...(input.approvalDecisionId === undefined
			? {}
			: { approvalDecisionId: input.approvalDecisionId }),
	};
}

function revalidateLegalCompanyIdentityRoutes(
	organizationSlug: string,
	legalCompanyId: string,
): void {
	revalidatePath(
		`/o/${organizationSlug}/corporate/companies/${legalCompanyId}/identity`,
	);
	revalidatePath(
		`/o/${organizationSlug}/corporate/companies/${legalCompanyId}/overview`,
	);
}

function formDataToStrictObject(formData: FormData): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	for (const [key, value] of formData.entries()) {
		if (key.startsWith("$ACTION_")) {
			continue;
		}
		setFormValue(output, key, value);
	}
	return output;
}

function setFormValue(
	target: Record<string, unknown>,
	key: string,
	value: FormDataEntryValue,
): void {
	const scalar = typeof value === "string" ? value : value.name;
	const [head, ...tail] = key.split(".");
	if (head === undefined || head.length === 0) {
		return;
	}
	if (tail.length === 0) {
		target[head] = scalar;
		return;
	}
	const existing = target[head];
	const child =
		typeof existing === "object" &&
		existing !== null &&
		!Array.isArray(existing)
			? (existing as Record<string, unknown>)
			: {};
	target[head] = child;
	setFormValue(child, tail.join("."), scalar);
}

function emptyStringToUndefined(value: unknown): unknown {
	if (typeof value !== "string") {
		return value;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}
