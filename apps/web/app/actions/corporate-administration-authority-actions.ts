"use server";

import {
	amendAuthorityMandate,
	amendAuthorityMandateInputSchema,
	grantAuthorityMandate,
	grantAuthorityMandateInputSchema,
	revokeAuthorityMandate,
	revokeAuthorityMandateInputSchema,
} from "@afenda/corporate-administration";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";

import { defineFormDataAction } from "@/app/actions/_runtime/define-form-data-action";
import { createCorporateAdministrationAuthorityDependencies } from "@/lib/erp/corporate-administration-command-options";

export type AuthorityMandateActionResult = Readonly<{
	authorityMandateId: string;
	status: string;
	version: number;
}>;

export async function grantAuthorityMandateAction(
	formData: FormData,
): Promise<ActionResult<AuthorityMandateActionResult>> {
	return await defineFormDataAction({
		operationId: "grantAuthorityMandate",
		path: "grantAuthorityMandateAction",
		safeMessage: "Could not grant the authority mandate.",
		formData,
		schema: grantAuthorityMandateInputSchema,
		normalize: (values) =>
			coerceBooleans(
				coerceNumbers(
					omitEmpty(values, [
						"holderPartyId",
						"holderOfficerAppointmentId",
						"grantingResolutionId",
						"monetaryLimitAmount",
						"monetaryLimitCurrencyCode",
						"jurisdictionCode",
						"effectiveTo",
					]),
					["expectedCompanyVersion"],
				),
				["protectedAuthority"],
			),
		dependencies: createCorporateAdministrationAuthorityDependencies(),
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted authority mandate data is invalid",
			}),
		revalidate: revalidateAuthorityRoutes,
		execute: grantAuthorityMandate,
		project: projectAuthorityMandate,
	});
}

export async function amendAuthorityMandateAction(
	formData: FormData,
): Promise<ActionResult<AuthorityMandateActionResult>> {
	return await defineFormDataAction({
		operationId: "amendAuthorityMandate",
		path: "amendAuthorityMandateAction",
		safeMessage: "Could not amend the authority mandate.",
		formData,
		schema: amendAuthorityMandateInputSchema,
		normalize: (values) =>
			coerceNumbers(
				omitEmpty(values, [
					"monetaryLimitAmount",
					"monetaryLimitCurrencyCode",
					"jurisdictionCode",
					"effectiveTo",
				]),
				["expectedVersion"],
			),
		dependencies: createCorporateAdministrationAuthorityDependencies(),
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted authority mandate data is invalid",
			}),
		revalidate: revalidateAuthorityRoutes,
		execute: amendAuthorityMandate,
		project: projectAuthorityMandate,
	});
}

export async function revokeAuthorityMandateAction(
	formData: FormData,
): Promise<ActionResult<AuthorityMandateActionResult>> {
	return await defineFormDataAction({
		operationId: "revokeAuthorityMandate",
		path: "revokeAuthorityMandateAction",
		safeMessage: "Could not revoke the authority mandate.",
		formData,
		schema: revokeAuthorityMandateInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
		dependencies: createCorporateAdministrationAuthorityDependencies(),
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted authority mandate data is invalid",
			}),
		revalidate: revalidateAuthorityRoutes,
		execute: revokeAuthorityMandate,
		project: projectAuthorityMandate,
	});
}

export async function grantAuthorityMandateFormAction(
	_previousState: ActionResult<AuthorityMandateActionResult> | null,
	formData: FormData,
) {
	return await grantAuthorityMandateAction(formData);
}

export async function amendAuthorityMandateFormAction(
	_previousState: ActionResult<AuthorityMandateActionResult> | null,
	formData: FormData,
) {
	return await amendAuthorityMandateAction(formData);
}

export async function revokeAuthorityMandateFormAction(
	_previousState: ActionResult<AuthorityMandateActionResult> | null,
	formData: FormData,
) {
	return await revokeAuthorityMandateAction(formData);
}

function projectAuthorityMandate(
	mandate: Readonly<{ id: string; status: string; version: number }>,
): AuthorityMandateActionResult {
	return {
		authorityMandateId: mandate.id,
		status: mandate.status,
		version: mandate.version,
	};
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

function coerceBooleans(
	values: Record<string, unknown>,
	keys: readonly string[],
): Record<string, unknown> {
	const normalized: Record<string, unknown> = { ...values };
	for (const key of keys) {
		const value = normalized[key];
		if (value === "" || value === undefined) {
			delete normalized[key];
			continue;
		}
		normalized[key] = value === "true";
	}
	return normalized;
}

function revalidateAuthorityRoutes(organizationSlug: string): void {
	revalidatePath("/client/corporate-administration");
	revalidatePath("/admin/corporate-administration");
	revalidatePath(`/o/${organizationSlug}/corporate/companies`);
}
