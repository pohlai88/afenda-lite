import { z } from "zod";

import {
	legalCompanyIdSchema,
	officerAppointmentIdSchema,
	officerQualificationIdSchema,
	organizationIdSchema,
	statutoryOfficeIdSchema,
	userIdSchema,
} from "../kernel/brands";
import { canonicalDateSchema } from "../kernel/dates";

const codeSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const displayTextSchema = z.string().trim().min(1).max(256);
const descriptionSchema = z.string().trim().min(1).max(2048);
const reasonSchema = z.string().trim().min(1).max(512);
const sourceDocumentIdSchema = z.string().trim().min(1).max(128);
const partyIdSchema = z.string().trim().min(1).max(128);
const documentIdSchema = z.string().trim().min(1).max(128);

export const statutoryOfficeStatusSchema = z.enum(["active", "retired"]);
export const officerAppointmentMethodSchema = z.enum([
	"board_resolution",
	"shareholder_resolution",
	"statutory_filing",
	"delegated_authority",
	"court_order",
	"other",
]);
export const officerAppointingAuthorityTypeSchema = z.enum([
	"governance_body",
	"shareholder_body",
	"statutory_authority",
	"court",
	"delegated_role",
	"other",
]);
export const officerAppointmentStatusSchema = z.enum([
	"active",
	"resigned",
	"removed",
	"ended",
]);
export const officerQualificationVerificationStatusSchema = z.enum([
	"pending",
	"verified",
	"rejected",
	"expired",
]);

export const statutoryOfficeSchema = z
	.object({
		id: statutoryOfficeIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		officeTypeCode: codeSchema,
		jurisdictionCode: z
			.string()
			.trim()
			.regex(/^[A-Z]{2}$/),
		displayName: displayTextSchema,
		description: descriptionSchema.nullable(),
		required: z.boolean(),
		minimumHolders: z.number().int().positive(),
		maximumHolders: z.number().int().positive().nullable(),
		vacancyGraceDays: z.number().int().nonnegative(),
		protectedRole: z.boolean(),
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		status: statutoryOfficeStatusSchema,
		retirementReason: reasonSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) =>
			value.maximumHolders === null ||
			value.maximumHolders >= value.minimumHolders,
		{ path: ["maximumHolders"], message: "maximumHolders is below minimum" },
	)
	.readonly();

export const officerAppointmentSchema = z
	.object({
		id: officerAppointmentIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		statutoryOfficeId: statutoryOfficeIdSchema,
		officerPartyId: partyIdSchema,
		appointmentMethod: officerAppointmentMethodSchema,
		appointingAuthorityType: officerAppointingAuthorityTypeSchema,
		appointingAuthorityId: z.string().trim().min(1).max(128).nullable(),
		consentDocumentId: documentIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		status: officerAppointmentStatusSchema,
		endReason: reasonSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.readonly();

export const officerQualificationSchema = z
	.object({
		id: officerQualificationIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		officerAppointmentId: officerAppointmentIdSchema,
		qualificationTypeCode: codeSchema,
		issuer: displayTextSchema,
		referenceNumber: z.string().trim().min(1).max(128).nullable(),
		validFrom: canonicalDateSchema,
		validTo: canonicalDateSchema.nullable(),
		verificationStatus: officerQualificationVerificationStatusSchema,
		verifiedAt: z.coerce.date().nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		version: z.number().int().positive(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(value) => value.validTo === null || value.validFrom < value.validTo,
		{
			path: ["validTo"],
			message: "validTo must follow validFrom",
		},
	)
	.readonly();

export const defineStatutoryOfficeInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		officeTypeCode: codeSchema,
		jurisdictionCode: z
			.string()
			.trim()
			.regex(/^[A-Z]{2}$/),
		displayName: displayTextSchema,
		description: descriptionSchema.nullable().optional(),
		required: z.boolean(),
		minimumHolders: z.number().int().positive(),
		maximumHolders: z.number().int().positive().nullable().optional(),
		vacancyGraceDays: z.number().int().nonnegative(),
		protectedRole: z.boolean().optional(),
		effectiveFrom: canonicalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) =>
			value.maximumHolders == null ||
			value.maximumHolders >= value.minimumHolders,
		{ path: ["maximumHolders"], message: "maximumHolders is below minimum" },
	)
	.readonly();

export const appointOfficerInputSchema = z
	.object({
		statutoryOfficeId: statutoryOfficeIdSchema,
		officerPartyId: partyIdSchema,
		appointmentMethod: officerAppointmentMethodSchema,
		appointingAuthorityType: officerAppointingAuthorityTypeSchema,
		appointingAuthorityId: z
			.string()
			.trim()
			.min(1)
			.max(128)
			.nullable()
			.optional(),
		consentDocumentId: documentIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable().optional(),
		expectedOfficeVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) =>
			value.effectiveTo == null || value.effectiveFrom < value.effectiveTo,
		{
			path: ["effectiveTo"],
			message: "effectiveTo must follow effectiveFrom",
		},
	)
	.readonly();

export const amendOfficerAppointmentInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		appointmentMethod: officerAppointmentMethodSchema,
		appointingAuthorityType: officerAppointingAuthorityTypeSchema,
		appointingAuthorityId: z
			.string()
			.trim()
			.min(1)
			.max(128)
			.nullable()
			.optional(),
		consentDocumentId: documentIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable().optional(),
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) =>
			value.effectiveTo == null || value.effectiveFrom < value.effectiveTo,
		{
			path: ["effectiveTo"],
			message: "effectiveTo must follow effectiveFrom",
		},
	)
	.readonly();

export const recordOfficerQualificationInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		qualificationTypeCode: codeSchema,
		issuer: displayTextSchema,
		referenceNumber: z.string().trim().min(1).max(128).nullable().optional(),
		validFrom: canonicalDateSchema,
		validTo: canonicalDateSchema.nullable().optional(),
		verificationStatus: officerQualificationVerificationStatusSchema,
		verifiedAt: z.coerce.date().nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedAppointmentVersion: z.number().int().positive(),
	})
	.strict()
	.refine((value) => value.validTo == null || value.validFrom < value.validTo, {
		path: ["validTo"],
		message: "validTo must follow validFrom",
	})
	.refine(
		(value) =>
			value.verificationStatus !== "verified" || value.verifiedAt != null,
		{ path: ["verifiedAt"], message: "verifiedAt is required when verified" },
	)
	.readonly();

export const resignOfficerInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		resignedOn: canonicalDateSchema,
		reason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const removeOfficerInputSchema = z
	.object({
		officerAppointmentId: officerAppointmentIdSchema,
		removedOn: canonicalDateSchema,
		reason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const listRequiredStatutoryOfficesInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		jurisdictionCode: z
			.string()
			.trim()
			.regex(/^[A-Z]{2}$/)
			.optional(),
		includeOptional: z.boolean().optional(),
	})
	.strict()
	.readonly();

export const listOfficersAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		statutoryOfficeId: statutoryOfficeIdSchema.optional(),
		officerPartyId: partyIdSchema.optional(),
	})
	.strict()
	.readonly();

export const getOfficerAppointmentInputSchema = z
	.object({ officerAppointmentId: officerAppointmentIdSchema })
	.strict()
	.readonly();

export const getOfficerVacancyStatusInputSchema = z
	.object({
		statutoryOfficeId: statutoryOfficeIdSchema,
		asOf: canonicalDateSchema,
	})
	.strict()
	.readonly();
