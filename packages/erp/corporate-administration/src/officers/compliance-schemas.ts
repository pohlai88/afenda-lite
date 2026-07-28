import { z } from "zod";

import {
	legalCompanyIdSchema,
	officerAppointmentIdSchema,
	officerConflictDisclosureIdSchema,
	officerDeclarationIdSchema,
	officerDisqualificationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../kernel/brands";
import { canonicalDateSchema } from "../kernel/dates";

const codeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const sourceDocumentIdSchema = z.string().trim().min(1).max(128);
const referenceSchema = z.string().trim().min(1).max(128);
const maskedSummarySchema = z.string().trim().min(1).max(512);
const reasonSchema = z.string().trim().min(1).max(512);

export const officerDeclarationTypeSchema = z.enum([
	"consent",
	"eligibility",
	"interest",
	"independence",
	"fit_and_proper",
	"related_party",
]);
export const officerDeclarationStatusSchema = z.enum([
	"active",
	"superseded",
	"expired",
]);
export const officerDisqualificationStatusSchema = z.enum(["active", "ended"]);
export const conflictMatterTypeSchema = z.enum([
	"meeting",
	"resolution",
	"transaction",
	"corporate_action",
]);
export const conflictDisclosureStatusSchema = z.enum([
	"disclosed",
	"recused",
	"cleared",
]);

export const officerDeclarationSchema = z
	.object({
		id: officerDeclarationIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		officerAppointmentId: officerAppointmentIdSchema,
		declarationType: officerDeclarationTypeSchema,
		status: officerDeclarationStatusSchema,
		effectiveFrom: canonicalDateSchema,
		expiresOn: canonicalDateSchema.nullable(),
		sensitiveDetailRef: referenceSchema.nullable(),
		maskedSummary: maskedSummarySchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		supersededAt: z.coerce.date().nullable(),
		supersededByDeclarationId: officerDeclarationIdSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.expiresOn === null || value.effectiveFrom < value.expiresOn,
		{ path: ["expiresOn"], message: "expiresOn must follow effectiveFrom" },
	)
	.refine(
		(value) =>
			value.sensitiveDetailRef !== null || value.maskedSummary !== null,
		{
			path: ["maskedSummary"],
			message: "maskedSummary or sensitiveDetailRef is required",
		},
	)
	.readonly();

export const officerDisqualificationSchema = z
	.object({
		id: officerDisqualificationIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		officerAppointmentId: officerAppointmentIdSchema,
		reasonCode: codeSchema,
		authorityReference: referenceSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		status: officerDisqualificationStatusSchema,
		endReason: reasonSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.effectiveTo === null || value.effectiveFrom < value.effectiveTo,
		{ path: ["effectiveTo"], message: "effectiveTo must follow effectiveFrom" },
	)
	.readonly();

export const conflictDisclosureSchema = z
	.object({
		id: officerConflictDisclosureIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		officerAppointmentId: officerAppointmentIdSchema,
		matterType: conflictMatterTypeSchema,
		matterId: referenceSchema,
		conflictTypeCode: codeSchema,
		status: conflictDisclosureStatusSchema,
		sensitiveDetailRef: referenceSchema.nullable(),
		maskedSummary: maskedSummarySchema.nullable(),
		disclosedAt: z.coerce.date(),
		recusalRecordedAt: z.coerce.date().nullable(),
		recusalReason: reasonSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.sensitiveDetailRef !== null || value.maskedSummary !== null,
		{
			path: ["maskedSummary"],
			message: "maskedSummary or sensitiveDetailRef is required",
		},
	)
	.readonly();

export const recordOfficerDeclarationInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		declarationType: officerDeclarationTypeSchema,
		effectiveFrom: canonicalDateSchema,
		expiresOn: canonicalDateSchema.nullable().optional(),
		sensitiveDetailRef: referenceSchema.nullable().optional(),
		maskedSummary: maskedSummarySchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedAppointmentVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) => value.expiresOn == null || value.effectiveFrom < value.expiresOn,
		{ path: ["expiresOn"], message: "expiresOn must follow effectiveFrom" },
	)
	.refine(
		(value) => value.sensitiveDetailRef != null || value.maskedSummary != null,
		{
			path: ["maskedSummary"],
			message: "maskedSummary or sensitiveDetailRef is required",
		},
	)
	.readonly();

export const supersedeOfficerDeclarationInputSchema = z
	.object({
		officerDeclarationId: officerDeclarationIdSchema,
		supersededByDeclarationId: officerDeclarationIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) => value.officerDeclarationId !== value.supersededByDeclarationId,
		{
			path: ["supersededByDeclarationId"],
			message: "declaration cannot supersede itself",
		},
	)
	.readonly();

export const recordOfficerDisqualificationInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		reasonCode: codeSchema,
		authorityReference: referenceSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable().optional(),
		expectedAppointmentVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) =>
			value.effectiveTo == null || value.effectiveFrom < value.effectiveTo,
		{ path: ["effectiveTo"], message: "effectiveTo must follow effectiveFrom" },
	)
	.readonly();

export const endOfficerDisqualificationInputSchema = z
	.object({
		officerDisqualificationId: officerDisqualificationIdSchema,
		endedOn: canonicalDateSchema,
		reason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const discloseConflictInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		matterType: conflictMatterTypeSchema,
		matterId: referenceSchema,
		conflictTypeCode: codeSchema,
		sensitiveDetailRef: referenceSchema.nullable().optional(),
		maskedSummary: maskedSummarySchema.nullable().optional(),
		disclosedAt: z.coerce.date(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedAppointmentVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) => value.sensitiveDetailRef != null || value.maskedSummary != null,
		{
			path: ["maskedSummary"],
			message: "maskedSummary or sensitiveDetailRef is required",
		},
	)
	.readonly();

export const recordRecusalInputSchema = z
	.object({
		conflictDisclosureId: officerConflictDisclosureIdSchema,
		recusalReason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const getOfficerEligibilityAsOfInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		asOf: canonicalDateSchema,
	})
	.strict()
	.readonly();

export const listExpiringDeclarationsInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		windowDays: z.number().int().positive().max(366),
		declarationType: officerDeclarationTypeSchema.optional(),
	})
	.strict()
	.readonly();

export const listActiveDisqualificationsInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		officerAppointmentId: officerAppointmentIdSchema.optional(),
	})
	.strict()
	.readonly();

export const listConflictsForMatterInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		matterType: conflictMatterTypeSchema,
		matterId: referenceSchema,
		includeCleared: z.boolean().optional(),
	})
	.strict()
	.readonly();
