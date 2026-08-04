"use server";

import {
	appointOfficer,
	appointOfficerInputSchema,
	recordOfficerQualification,
	recordOfficerQualificationInputSchema,
	removeOfficer,
	removeOfficerInputSchema,
	resignOfficer,
	resignOfficerInputSchema,
} from "@afenda/corporate-administration";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";

import { defineFormDataAction } from "@/app/actions/_runtime/define-form-data-action";
import { createCorporateAdministrationOfficerDependencies } from "@/lib/erp/corporate-administration-command-options";

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
	return await defineFormDataAction({
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
		dependencies: createCorporateAdministrationOfficerDependencies(),
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted officer data is invalid",
			}),
		revalidate: revalidateOfficerRoutes,
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
	return await defineFormDataAction({
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
		dependencies: createCorporateAdministrationOfficerDependencies(),
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted officer data is invalid",
			}),
		revalidate: revalidateOfficerRoutes,
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
	return await defineFormDataAction({
		operationId: "resignOfficer",
		path: "resignOfficerAction",
		safeMessage: "Could not record the officer resignation.",
		formData,
		schema: resignOfficerInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
		dependencies: createCorporateAdministrationOfficerDependencies(),
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted officer data is invalid",
			}),
		revalidate: revalidateOfficerRoutes,
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
	return await defineFormDataAction({
		operationId: "removeOfficer",
		path: "removeOfficerAction",
		safeMessage: "Could not record the officer removal.",
		formData,
		schema: removeOfficerInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
		dependencies: createCorporateAdministrationOfficerDependencies(),
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted officer data is invalid",
			}),
		revalidate: revalidateOfficerRoutes,
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
