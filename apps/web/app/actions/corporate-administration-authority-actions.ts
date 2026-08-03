"use server";

import { randomUUID } from "node:crypto";

import {
	amendAuthorityMandate,
	amendAuthorityMandateInputSchema,
	type CorporateAdministrationCommandId,
	type CorporateAdministrationCommandOptions,
	corporateAdministrationPermissionFor,
	grantAuthorityMandate,
	grantAuthorityMandateInputSchema,
	revokeAuthorityMandate,
	revokeAuthorityMandateInputSchema,
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
	createCorporateAdministrationAuthorityDependencies,
	createCorporateAdministrationCommandOptions,
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

type AuthorityDependencies = ReturnType<
	typeof createCorporateAdministrationAuthorityDependencies
>;

type AuthorityCommand<TPayload, TResult> = (
	payload: TPayload,
	options: CorporateAdministrationCommandOptions,
	dependencies: AuthorityDependencies,
) => Promise<Result<TResult>>;

export type AuthorityMandateActionResult = Readonly<{
	authorityMandateId: string;
	status: string;
	version: number;
}>;

export async function grantAuthorityMandateAction(
	formData: FormData,
): Promise<ActionResult<AuthorityMandateActionResult>> {
	return await runAuthorityAction({
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
		execute: grantAuthorityMandate,
		project: projectAuthorityMandate,
	});
}

export async function amendAuthorityMandateAction(
	formData: FormData,
): Promise<ActionResult<AuthorityMandateActionResult>> {
	return await runAuthorityAction({
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
		execute: amendAuthorityMandate,
		project: projectAuthorityMandate,
	});
}

export async function revokeAuthorityMandateAction(
	formData: FormData,
): Promise<ActionResult<AuthorityMandateActionResult>> {
	return await runAuthorityAction({
		operationId: "revokeAuthorityMandate",
		path: "revokeAuthorityMandateAction",
		safeMessage: "Could not revoke the authority mandate.",
		formData,
		schema: revokeAuthorityMandateInputSchema,
		normalize: (values) => coerceNumbers(values, ["expectedVersion"]),
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

async function runAuthorityAction<TPayload, TResult, TProjection>(input: {
	operationId: Extract<
		CorporateAdministrationCommandId,
		"grantAuthorityMandate" | "amendAuthorityMandate" | "revokeAuthorityMandate"
	>;
	path: string;
	safeMessage: string;
	formData: FormData;
	schema: z.ZodType<TPayload>;
	normalize: (
		values: Record<string, FormDataEntryValue>,
	) => Record<string, unknown>;
	execute: AuthorityCommand<TPayload, TResult>;
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
					publicMessage: "The submitted authority mandate data is invalid",
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
				createCorporateAdministrationAuthorityDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidateAuthorityRoutes(metadata.data.organizationSlug);
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
