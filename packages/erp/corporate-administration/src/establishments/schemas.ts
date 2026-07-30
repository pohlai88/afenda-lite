import { z } from "zod";

function isNullish(value: unknown): value is null | undefined {
	return value === null || value === undefined;
}

import {
	establishmentStatusHistoryIdSchema,
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
	organizationIdSchema,
	premiseIdSchema,
	registeredAddressIdSchema,
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
const reasonSchema = z.string().trim().min(1).max(512);
const sourceDocumentIdSchema = z.string().trim().min(1).max(128);

export const legalEstablishmentTypeSchema = z.enum([
	"branch",
	"representative_office",
	"foreign_registration",
	"other",
]);

export const legalEstablishmentStatusSchema = z.enum([
	"registered",
	"active",
	"suspended",
	"closed",
]);

export const registeredAddressTypeSchema = z.enum([
	"registered_office",
	"service_address",
	"place_of_business",
]);

export const premiseTypeSchema = z.enum([
	"office",
	"warehouse",
	"operational_site",
	"other",
]);

export const statutoryAddressSnapshotSchema = z
	.object({
		sourcePartyAddressId: z.string().uuid(),
		line1: z.string().trim().min(1).max(256),
		line2: z.string().trim().min(1).max(256).nullable(),
		city: z.string().trim().min(1).max(128),
		region: z.string().trim().min(1).max(128).nullable(),
		postalCode: z.string().trim().min(1).max(32).nullable(),
		countryCode: z.string().regex(/^[A-Z]{2}$/),
	})
	.strict()
	.readonly();

export const legalEstablishmentSchema = z
	.object({
		id: legalEstablishmentIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		establishmentType: legalEstablishmentTypeSchema,
		jurisdictionCode: z.string().regex(/^[A-Z]{2}$/),
		registrationIdentifier: displayTextSchema,
		normalizedRegistrationIdentifier: codeSchema,
		displayName: displayTextSchema,
		currentStatus: legalEstablishmentStatusSchema,
		registeredFrom: canonicalDateSchema,
		createdAt: z.coerce.date(),
		createdBy: userIdSchema,
		updatedAt: z.coerce.date(),
		updatedBy: userIdSchema,
		version: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const establishmentStatusHistorySchema = z
	.object({
		id: establishmentStatusHistoryIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		legalEstablishmentId: legalEstablishmentIdSchema,
		status: legalEstablishmentStatusSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		reason: reasonSchema.nullable(),
		sourceDocumentId: sourceDocumentIdSchema,
		version: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const registeredAddressSchema = z
	.object({
		id: registeredAddressIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		legalEstablishmentId: legalEstablishmentIdSchema.nullable(),
		addressType: registeredAddressTypeSchema,
		address: statutoryAddressSnapshotSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		version: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const premiseSchema = z
	.object({
		id: premiseIdSchema,
		organizationId: organizationIdSchema,
		legalCompanyId: legalCompanyIdSchema,
		legalEstablishmentId: legalEstablishmentIdSchema.nullable(),
		premiseType: premiseTypeSchema,
		displayName: displayTextSchema,
		address: statutoryAddressSnapshotSchema,
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable(),
		recordedAt: z.coerce.date(),
		recordedBy: userIdSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		status: z.enum(["active", "ended"]),
		version: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const registerLegalEstablishmentInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		establishmentType: legalEstablishmentTypeSchema,
		jurisdictionCode: z.string().regex(/^[A-Z]{2}$/),
		registrationIdentifier: displayTextSchema,
		displayName: displayTextSchema,
		registeredFrom: canonicalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const updateLegalEstablishmentInputSchema = z
	.object({
		legalEstablishmentId: legalEstablishmentIdSchema,
		displayName: displayTextSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

const transitionInputFields = {
	legalEstablishmentId: legalEstablishmentIdSchema,
	effectiveFrom: canonicalDateSchema,
	reason: reasonSchema,
	sourceDocumentId: sourceDocumentIdSchema,
	expectedVersion: z.number().int().positive(),
} as const;

export const activateLegalEstablishmentInputSchema = z
	.object(transitionInputFields)
	.strict()
	.readonly();
export const suspendLegalEstablishmentInputSchema = z
	.object(transitionInputFields)
	.strict()
	.readonly();
export const closeLegalEstablishmentInputSchema = z
	.object(transitionInputFields)
	.strict()
	.readonly();

export const setRegisteredAddressInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		legalEstablishmentId: legalEstablishmentIdSchema.nullable().optional(),
		addressType: registeredAddressTypeSchema,
		sourcePartyAddressId: z.string().uuid(),
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) =>
			isNullish(value.effectiveTo) || value.effectiveFrom < value.effectiveTo,
		{ path: ["effectiveTo"], message: "effectiveTo must follow effectiveFrom" },
	)
	.readonly();

export const registerPremiseInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		legalEstablishmentId: legalEstablishmentIdSchema.nullable().optional(),
		premiseType: premiseTypeSchema,
		displayName: displayTextSchema,
		sourcePartyAddressId: z.string().uuid(),
		effectiveFrom: canonicalDateSchema,
		effectiveTo: canonicalDateSchema.nullable().optional(),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: z.number().int().positive(),
	})
	.strict()
	.refine(
		(value) =>
			isNullish(value.effectiveTo) || value.effectiveFrom < value.effectiveTo,
		{ path: ["effectiveTo"], message: "effectiveTo must follow effectiveFrom" },
	)
	.readonly();

export const endPremiseInputSchema = z
	.object({
		premiseId: premiseIdSchema,
		endedOn: canonicalDateSchema,
		reason: reasonSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: z.number().int().positive(),
	})
	.strict()
	.readonly();

export const getLegalEstablishmentInputSchema = z
	.object({ legalEstablishmentId: legalEstablishmentIdSchema })
	.strict()
	.readonly();
export const listLegalEstablishmentsAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		asOf: canonicalDateSchema,
		knownAt: z.coerce.date().optional(),
		status: legalEstablishmentStatusSchema.optional(),
	})
	.strict()
	.readonly();
export const findRegisteredAddressAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		legalEstablishmentId: legalEstablishmentIdSchema.nullable().optional(),
		addressType: registeredAddressTypeSchema,
		asOf: canonicalDateSchema,
		knownAt: z.coerce.date().optional(),
	})
	.strict()
	.readonly();
export const listPremisesAsOfInputSchema = z
	.object({
		legalCompanyId: legalCompanyIdSchema,
		legalEstablishmentId: legalEstablishmentIdSchema.optional(),
		asOf: canonicalDateSchema,
		knownAt: z.coerce.date().optional(),
		premiseType: premiseTypeSchema.optional(),
	})
	.strict()
	.readonly();
