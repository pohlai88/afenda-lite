"use server";

import { randomUUID } from "node:crypto";

import {
	appointOfficer,
	appointOfficerInputSchema,
	type CorporateAdministrationCommandId,
	type CorporateAdministrationCommandOptions,
	corporateAdministrationPermissionFor,
	recordOfficerQualification,
	recordOfficerQualificationInputSchema,
	removeOfficer,
	removeOfficerInputSchema,
	resignOfficer,
	resignOfficerInputSchema,
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
	createCorporateAdministrationOfficerDependencies,
} from "@/lib/erp/corporate-administration-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const actionMetadataSchema = z
	.object({
		organizationSlug: z
			.string()
			.trim()
			.min(1)
			.max(128)
			.regex(/^[a-z0-9][a-z0-9-]*$/),
		idempotencyKey: z.string().trim().min(1).max(128).optional(),
	})
	.strict();

type OfficerDependencies = ReturnType<
	typeof createCorporateAdministrationOfficerDependencies
>;

type OfficerCommand<TPayload, TResult> = (
	payload: TPayload,
	options: CorporateAdministrationCommandOptions,
	dependencies: OfficerDependencies,
) => Promise<Result<TResult>>;

export type OfficerAppointmentActionResult = Readonly<{
	officerAppointmentId: string;
	status: string;
	version: number;
}>;

export type OfficerQualificationActionResult = Readonly<{
	officerQualificationId: string;
	verificationStatus: string;
}>;

export async function appointOfficerAction(
	formData: FormData,
): Promise<ActionResult<OfficerAppointmentActionResult>> {
	return await runOfficerAction({
		operationId: "appointOfficer",
		path: "appointOfficerAction",
		safeMessage: "Could not appoint the officer.",
		formData,
		schema: appointOfficerInputSchema,
		normalize: (values) =>
			coerceNumbers(
				omitEmpty(values, ["appointingAuthorityId", "effectiveTo"]),
				["expectedOfficeVersion"],
			),
		execute: appointOfficer,
		project: (appointment) => ({
			officerAppointmentId: appointment.id,
			status: appointment.status,
			version: appointment.version,
		}),
	});
}

export async function recordOfficerQualificationAction(
	formData: FormData,
): Promise<ActionResult<OfficerQualificationActionResult>> {
	return await runOfficerAction({
		operationId: "recordOfficerQualification",
		path: "recordOfficerQualificationAction",
		safeMessage: "Could not record the officer qualification.",
		formData,
		schema: recordOfficerQualificationInputSchema,
		normalize: (values) =>
			coerceNumbers(
				omitEmpty(values, ["referenceNumber", "validTo", "verifiedAt"]),
				["expectedAppointmentVersion"],
			),
		execute: recordOfficerQualification,
		project: (qualification) => ({
			officerQualificationId: qualification.id,
			verificationStatus: qualification.verificationStatus,
		}),
	});
}

export async function resignOfficerAction(
	formData: FormData,
): Promise<ActionResult<OfficerAppointmentActionResult>> {
	return await runOfficerAction({
		operationId: "resignOfficer",
		path: "resignOfficerAction",
		safeMessage: "Could not record the officer resignation.",
		formData,
		schema: resignOfficerInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
		execute: resignOfficer,
		project: (appointment) => ({
			officerAppointmentId: appointment.id,
			status: appointment.status,
			version: appointment.version,
		}),
	});
}

export async function removeOfficerAction(
	formData: FormData,
): Promise<ActionResult<OfficerAppointmentActionResult>> {
	return await runOfficerAction({
		operationId: "removeOfficer",
		path: "removeOfficerAction",
		safeMessage: "Could not record the officer removal.",
		formData,
		schema: removeOfficerInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
		execute: removeOfficer,
		project: (appointment) => ({
			officerAppointmentId: appointment.id,
			status: appointment.status,
			version: appointment.version,
		}),
	});
}

export async function appointOfficerFormAction(
	_previousState: ActionResult<OfficerAppointmentActionResult> | null,
	formData: FormData,
) {
	return await appointOfficerAction(formData);
}

export async function recordOfficerQualificationFormAction(
	_previousState: ActionResult<OfficerQualificationActionResult> | null,
	formData: FormData,
) {
	return await recordOfficerQualificationAction(formData);
}

export async function resignOfficerFormAction(
	_previousState: ActionResult<OfficerAppointmentActionResult> | null,
	formData: FormData,
) {
	return await resignOfficerAction(formData);
}

export async function removeOfficerFormAction(
	_previousState: ActionResult<OfficerAppointmentActionResult> | null,
	formData: FormData,
) {
	return await removeOfficerAction(formData);
}

async function runOfficerAction<TPayload, TResult, TProjection>(input: {
	operationId: Extract<
		CorporateAdministrationCommandId,
		| "appointOfficer"
		| "recordOfficerQualification"
		| "resignOfficer"
		| "removeOfficer"
	>;
	path: string;
	safeMessage: string;
	formData: FormData;
	schema: z.ZodType<TPayload>;
	normalize: (
		values: Record<string, FormDataEntryValue>,
	) => Record<string, unknown>;
	execute: OfficerCommand<TPayload, TResult>;
	project: (result: TResult) => TProjection;
}): Promise<ActionResult<TProjection>> {
	return await runMemberPermissionAction({
		path: input.path,
		permission: corporateAdministrationPermissionFor(input.operationId),
		safeMessage: input.safeMessage,
		execute: async (session, correlationId) => {
			const values = formDataObject(input.formData);
			const metadata = parseSchema(actionMetadataSchema, {
				organizationSlug: values.organizationSlug,
				idempotencyKey: optionalString(values.idempotencyKey),
			});
			const payload = parseSchema(
				input.schema,
				input.normalize(withoutActionMetadata(values)),
			);
			if (!(metadata.success && payload.success)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted officer data is invalid",
				});
			}

			const result = await input.execute(
				payload.data,
				createCorporateAdministrationCommandOptions({
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: metadata.data.idempotencyKey ?? randomUUID(),
				}),
				createCorporateAdministrationOfficerDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateOfficerRoutes(metadata.data.organizationSlug);
			return errorResult.ok(input.project(mapped.data));
		},
	});
}

function formDataObject(
	formData: FormData,
): Record<string, FormDataEntryValue> {
	return Object.fromEntries(
		Array.from(formData.entries()).filter(
			([key]) => !key.startsWith("$ACTION_"),
		),
	);
}

function withoutActionMetadata(
	values: Record<string, FormDataEntryValue>,
): Record<string, FormDataEntryValue> {
	const {
		organizationSlug: _organizationSlug,
		idempotencyKey: _key,
		...payload
	} = values;
	return payload;
}

function optionalString(value: FormDataEntryValue | undefined) {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Optional strict-schema fields must be absent, not empty strings. */
function omitEmpty(
	values: Record<string, FormDataEntryValue>,
	keys: readonly string[],
): Record<string, FormDataEntryValue> {
	const normalized: Record<string, FormDataEntryValue> = { ...values };
	for (const key of keys) {
		if (normalized[key] === "") {
			delete normalized[key];
		}
	}
	return normalized;
}

function coerceNumbers(
	values: Record<string, FormDataEntryValue>,
	keys: readonly string[],
): Record<string, unknown> {
	const normalized: Record<string, unknown> = { ...values };
	for (const key of keys) {
		const value = normalized[key];
		if (value === "" || value === undefined) {
			delete normalized[key];
			continue;
		}
		normalized[key] = Number(value);
	}
	return normalized;
}

function revalidateOfficerRoutes(organizationSlug: string): void {
	revalidatePath("/client/corporate-administration");
	revalidatePath("/admin/corporate-administration");
	revalidatePath(`/o/${organizationSlug}/corporate/companies`);
}
