"use server";

import { randomUUID } from "node:crypto";

import {
	activateLegalEstablishment,
	type CorporateAdministrationCommandId,
	closeLegalEstablishment,
	corporateAdministrationPermissionFor,
	endPremise,
	registerLegalEstablishment,
	registerPremise,
	setRegisteredAddress,
	suspendLegalEstablishment,
	updateLegalEstablishment,
} from "@afenda/corporate-administration";
import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import {
	createCorporateAdministrationCommandOptions,
	createCorporateAdministrationCompanyDependencies,
} from "@/lib/erp/corporate-administration-command-options";

import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().trim().uuid();
const dateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/);
const textSchema = z.string().trim().min(1).max(256);
const sourceDocumentIdSchema = z.string().trim().min(1).max(128);
const expectedVersionSchema = z.coerce.number().int().positive();
const optionalDateSchema = z.preprocess(
	emptyToUndefined,
	dateSchema.optional(),
);
const optionalEstablishmentIdSchema = z.preprocess(
	emptyToUndefined,
	uuidSchema.optional(),
);

const registerSchema = z
	.object({
		legalCompanyId: uuidSchema,
		establishmentType: z.enum([
			"branch",
			"representative_office",
			"foreign_registration",
			"other",
		]),
		jurisdictionCode: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{2}$/),
		registrationIdentifier: textSchema,
		displayName: textSchema,
		registeredFrom: dateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: expectedVersionSchema,
	})
	.strict();

const updateSchema = z
	.object({
		legalEstablishmentId: uuidSchema,
		displayName: textSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: expectedVersionSchema,
	})
	.strict();

const transitionSchema = z
	.object({
		legalEstablishmentId: uuidSchema,
		effectiveFrom: dateSchema,
		reason: z.string().trim().min(1).max(512),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: expectedVersionSchema,
	})
	.strict();

const addressSchema = z
	.object({
		legalCompanyId: uuidSchema,
		legalEstablishmentId: optionalEstablishmentIdSchema,
		addressType: z.enum([
			"registered_office",
			"service_address",
			"place_of_business",
		]),
		sourcePartyAddressId: uuidSchema,
		effectiveFrom: dateSchema,
		effectiveTo: optionalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: expectedVersionSchema,
	})
	.strict();

const premiseSchema = z
	.object({
		legalCompanyId: uuidSchema,
		legalEstablishmentId: optionalEstablishmentIdSchema,
		premiseType: z.enum(["office", "warehouse", "operational_site", "other"]),
		displayName: textSchema,
		sourcePartyAddressId: uuidSchema,
		effectiveFrom: dateSchema,
		effectiveTo: optionalDateSchema,
		sourceDocumentId: sourceDocumentIdSchema,
		expectedCompanyVersion: expectedVersionSchema,
	})
	.strict();

const endPremiseSchema = z
	.object({
		premiseId: uuidSchema,
		endedOn: dateSchema,
		reason: z.string().trim().min(1).max(512),
		sourceDocumentId: sourceDocumentIdSchema,
		expectedVersion: expectedVersionSchema,
	})
	.strict();

type VersionedResult = Readonly<{ id: string; version: number }>;

export async function registerLegalEstablishmentAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "registerLegalEstablishment",
		path: "registerLegalEstablishmentAction",
		safeMessage: "Could not register the legal establishment.",
		schema: registerSchema,
		formData,
		execute: registerLegalEstablishment,
	});
}

export async function updateLegalEstablishmentAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "updateLegalEstablishment",
		path: "updateLegalEstablishmentAction",
		safeMessage: "Could not update the legal establishment.",
		schema: updateSchema,
		formData,
		execute: updateLegalEstablishment,
	});
}

export async function activateLegalEstablishmentAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "activateLegalEstablishment",
		path: "activateLegalEstablishmentAction",
		safeMessage: "Could not activate the legal establishment.",
		schema: transitionSchema,
		formData,
		execute: activateLegalEstablishment,
	});
}

export async function suspendLegalEstablishmentAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "suspendLegalEstablishment",
		path: "suspendLegalEstablishmentAction",
		safeMessage: "Could not suspend the legal establishment.",
		schema: transitionSchema,
		formData,
		execute: suspendLegalEstablishment,
	});
}

export async function closeLegalEstablishmentAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "closeLegalEstablishment",
		path: "closeLegalEstablishmentAction",
		safeMessage: "Could not close the legal establishment.",
		schema: transitionSchema,
		formData,
		execute: closeLegalEstablishment,
	});
}

export async function setRegisteredAddressAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "setRegisteredAddress",
		path: "setRegisteredAddressAction",
		safeMessage: "Could not set the statutory address.",
		schema: addressSchema,
		formData,
		execute: setRegisteredAddress,
	});
}

export async function registerPremiseAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "registerPremise",
		path: "registerPremiseAction",
		safeMessage: "Could not register the premise.",
		schema: premiseSchema,
		formData,
		execute: registerPremise,
	});
}

export async function endPremiseAction(
	formData: FormData,
): Promise<ActionResult<VersionedResult>> {
	return await runEstablishmentAction({
		operationId: "endPremise",
		path: "endPremiseAction",
		safeMessage: "Could not end the premise.",
		schema: endPremiseSchema,
		formData,
		execute: endPremise,
	});
}

export async function registerLegalEstablishmentFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await registerLegalEstablishmentAction(formData);
}

export async function updateLegalEstablishmentFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await updateLegalEstablishmentAction(formData);
}

export async function activateLegalEstablishmentFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await activateLegalEstablishmentAction(formData);
}

export async function suspendLegalEstablishmentFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await suspendLegalEstablishmentAction(formData);
}

export async function closeLegalEstablishmentFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await closeLegalEstablishmentAction(formData);
}

export async function setRegisteredAddressFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await setRegisteredAddressAction(formData);
}

export async function registerPremiseFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await registerPremiseAction(formData);
}

export async function endPremiseFormAction(
	_previous: ActionResult<VersionedResult> | null,
	formData: FormData,
) {
	return await endPremiseAction(formData);
}

async function runEstablishmentAction<TSchema extends z.ZodTypeAny>(input: {
	operationId: Extract<
		CorporateAdministrationCommandId,
		| "registerLegalEstablishment"
		| "updateLegalEstablishment"
		| "activateLegalEstablishment"
		| "suspendLegalEstablishment"
		| "closeLegalEstablishment"
		| "setRegisteredAddress"
		| "registerPremise"
		| "endPremise"
	>;
	path: string;
	safeMessage: string;
	schema: TSchema;
	formData: FormData;
	execute: (
		payload: z.output<TSchema>,
		options: ReturnType<typeof createCorporateAdministrationCommandOptions>,
		dependencies: ReturnType<
			typeof createCorporateAdministrationCompanyDependencies
		>,
	) => Promise<Result<Readonly<{ id: string; version: number }>>>;
}): Promise<ActionResult<VersionedResult>> {
	return await runMemberPermissionAction({
		path: input.path,
		permission: corporateAdministrationPermissionFor(input.operationId),
		safeMessage: input.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(input.schema, formDataObject(input.formData));
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			const requestedIdempotencyKey = input.formData.get("idempotencyKey");
			const options = createCorporateAdministrationCommandOptions({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				idempotencyKey:
					typeof requestedIdempotencyKey === "string" &&
					requestedIdempotencyKey.trim().length > 0
						? requestedIdempotencyKey.trim()
						: randomUUID(),
			});
			const result = await input.execute(
				parsed.data,
				options,
				createCorporateAdministrationCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/client/corporate-administration");
			return {
				ok: true,
				data: { id: mapped.data.id, version: mapped.data.version },
			};
		},
	});
}

function formDataObject(
	formData: FormData,
): Record<string, FormDataEntryValue> {
	return Object.fromEntries(
		Array.from(formData.entries()).filter(
			([key]) => !key.startsWith("$ACTION_") && key !== "idempotencyKey",
		),
	);
}

function emptyToUndefined(value: unknown): unknown {
	return typeof value === "string" && value.trim().length === 0
		? undefined
		: value;
}
