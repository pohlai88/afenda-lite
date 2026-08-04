"use server";

import { randomUUID } from "node:crypto";
import {
	corporateAdministrationPermissionFor,
	setCompanyJurisdictionProfile,
} from "@afenda/corporate-administration";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/_runtime/run-member-permission-action";
import {
	createCorporateAdministrationCommandOptions,
	createCorporateAdministrationLegalCompanyDependencies,
} from "@/lib/erp/corporate-administration-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const setCompanyJurisdictionProfileActionSchema = z.object({
	legalCompanyId: z.string().trim().uuid(),
	jurisdictionCountryCode: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^[A-Z]{2}$/),
	entityType: z
		.string()
		.trim()
		.min(1)
		.max(64)
		.regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/),
	effectiveFrom: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/),
	effectiveTo: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	expectedCompanyVersion: z.coerce.number().int().nonnegative(),
	sourceReference: z.string().trim().min(1).max(256),
	idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export async function setCompanyJurisdictionProfileAction(
	formData: FormData,
): Promise<ActionResult<{ jurisdictionProfileId: string }>> {
	return await runMemberPermissionAction({
		path: "setCompanyJurisdictionProfileAction",
		permission: corporateAdministrationPermissionFor(
			"setCompanyJurisdictionProfile",
		),
		safeMessage: "Could not set jurisdiction profile.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(setCompanyJurisdictionProfileActionSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				jurisdictionCountryCode: formData.get("jurisdictionCountryCode"),
				entityType: formData.get("entityType"),
				effectiveFrom: formData.get("effectiveFrom"),
				effectiveTo: emptyToUndefined(formData.get("effectiveTo")),
				expectedCompanyVersion: formData.get("expectedCompanyVersion"),
				sourceReference: formData.get("sourceReference"),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await setCompanyJurisdictionProfile(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					jurisdictionCountryCode: parsed.data.jurisdictionCountryCode,
					entityType: parsed.data.entityType,
					effectiveRange: {
						from: parsed.data.effectiveFrom,
						to: parsed.data.effectiveTo ?? null,
					},
					recordedAt: new Date().toISOString(),
					sourceReference: parsed.data.sourceReference,
					expectedCompanyVersion: parsed.data.expectedCompanyVersion,
				},
				createCorporateAdministrationCommandOptions({
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: parsed.data.idempotencyKey ?? randomUUID(),
				}),
				createCorporateAdministrationLegalCompanyDependencies(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}

			revalidatePath("/client/corporate-administration");
			revalidatePath("/admin/corporate-administration");
			return {
				ok: true,
				data: {
					jurisdictionProfileId: mapped.data.jurisdictionProfileId,
				},
			};
		},
	});
}

export async function setCompanyJurisdictionProfileFormAction(
	_previousState: ActionResult<{ jurisdictionProfileId: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ jurisdictionProfileId: string }> | null> {
	return await setCompanyJurisdictionProfileAction(formData);
}

function emptyToUndefined(
	value: FormDataEntryValue | null,
): string | undefined {
	if (typeof value !== "string") {
		return;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}
