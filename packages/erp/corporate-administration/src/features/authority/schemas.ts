import { z } from "zod";

function isNullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

import {
	authorityMandateIdSchema,
	legalCompanyIdSchema,
	officerAppointmentIdSchema,
	organizationIdSchema,
	resolutionIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import {
	canonicalDecimalSchema,
	decimalInputSchema,
} from "../../kernel/decimals";
import { opaqueCursorSchema } from "../../kernel/pagination";

const descriptionSchema = z.string().trim().min(1).max(2048);
const reasonSchema = z.string().trim().min(1).max(512);
const sourceDocumentIdSchema = z.string().trim().min(1).max(128);
const partyIdSchema = z.string().trim().min(1).max(128);
const currencyCodeSchema = z
	.string()
	.trim()
	.regex(/^[A-Z]{3}$/);
const jurisdictionCodeSchema = z
	.string()
	.trim()
	.regex(/^[A-Z]{2}$/);

export const authorityMandateTypeSchema = z.enum([
	"signing_authority",
	"bank_mandate",
	"power_of_attorney",
	"delegated_authority",
	"other",
]);
export const authorityGrantedByTypeSchema = z.enum([
	"board_resolution",
	"shareholder_resolution",
	"statutory_office",
	"power_of_attorney",
]);
export const authorityMandateStatusSchema = z.enum([
	"active",
	"revoked",
	"expired",
]);

function hasExactlyOneHolder(value: {
	holderPartyId?: string | null | undefined;
	holderOfficerAppointmentId?: string | null | undefined;
}): boolean {
	return (
		isNullish(value.holderPartyId) !==
		isNullish(value.holderOfficerAppointmentId)
	);
}

function hasPairedMonetaryLimit(value: {
	monetaryLimitAmount?: string | null | undefined;
	monetaryLimitCurrencyCode?: string | null | undefined;
}): boolean {
	return (
		isNullish(value.monetaryLimitAmount) ===
		isNullish(value.monetaryLimitCurrencyCode)
	);
}

export const authorityMandateSchema = z
	.object({
		id: authorityMandateIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		mandateType: authorityMandateTypeSchema,
		holderPartyId: partyIdSchema.nullable(),
		holderOfficerAppointmentId: officerAppointmentIdSchema.nullable(),
		grantedByType: authorityGrantedByTypeSchema,
		grantingResolutionId: resolutionIdSchema.nullable(),
		scopeDescription: descriptionSchema,
		monetaryLimitAmount: canonicalDecimalSchema.nullable(),
		monetaryLimitCurrencyCode: currencyCodeSchema.nullable(),
		jurisdictionCode: jurisdictionCodeSchema.nullable(),
		protectedAuthority: z.boolean(),
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		status: authorityMandateStatusSchema,
		revocationReason: reasonSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(hasExactlyOneHolder, {
		path: ["holderPartyId"],
		message: "Exactly one mandate holder reference is required",
	})
	.refine(hasPairedMonetaryLimit, {
		path: ["monetaryLimitCurrencyCode"],
		message: "Monetary limit amount and currency must be set together",
	})
	.readonly();

export const authorityMandateListPageSchema = z
	.object({
		items: z.array(authorityMandateSchema).readonly(),
		nextCursor: opaqueCursorSchema.nullable(),
	})
	.readonly();

export const grantAuthorityMandateInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		mandateType: authorityMandateTypeSchema,
		holderPartyId: partyIdSchema.nullable().optional(),
		holderOfficerAppointmentId: officerAppointmentIdSchema
			.nullable()
			.optional(),
		grantedByType: authorityGrantedByTypeSchema,
		grantingResolutionId: resolutionIdSchema.nullable().optional(),
		scopeDescription: descriptionSchema,
		monetaryLimitAmount: decimalInputSchema.nullable().optional(),
		monetaryLimitCurrencyCode: currencyCodeSchema.nullable().optional(),
		jurisdictionCode: jurisdictionCodeSchema.nullable().optional(),
		protectedAuthority: z.boolean().optional(),
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.number().int().positive(),
	})
	.strict()
	.refine(hasExactlyOneHolder, {
		path: ["holderPartyId"],
		message: "Exactly one mandate holder reference is required",
	})
	.refine(hasPairedMonetaryLimit, {
		path: ["monetaryLimitCurrencyCode"],
		message: "Monetary limit amount and currency must be set together",
	})
	.refine(
		(value) =>
			isNullish(value.effectiveTo) || value.effectiveFrom < value.effectiveTo,
		{
			path: ["effectiveTo"],
			message: "effectiveTo must follow effectiveFrom",
		},
	)
	.readonly();

export const amendAuthorityMandateInputSchema = z
	.object({
		authorityMandateId: authorityMandateIdSchema,
		scopeDescription: descriptionSchema,
		monetaryLimitAmount: decimalInputSchema.nullable().optional(),
		monetaryLimitCurrencyCode: currencyCodeSchema.nullable().optional(),
		jurisdictionCode: jurisdictionCodeSchema.nullable().optional(),
		effectiveTo: canonicalDateSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.refine(hasPairedMonetaryLimit, {
		path: ["monetaryLimitCurrencyCode"],
		message: "Monetary limit amount and currency must be set together",
	})
	.readonly();

export const revokeAuthorityMandateInputSchema = z
	.object({
		authorityMandateId: authorityMandateIdSchema,
		revokedOn: canonicalDateSchema,
		reason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const listAuthorityMandatesAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		mandateType: authorityMandateTypeSchema.optional(),
		holderPartyId: partyIdSchema.optional(),
		cursor: opaqueCursorSchema.optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
	})
	.strict()
	.readonly();

export const getAuthorityMandateInputSchema = z
	.object({ authorityMandateId: authorityMandateIdSchema })
	.strict()
	.readonly();
