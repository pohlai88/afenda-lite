"use server";

import { randomUUID } from "node:crypto";
import { updateLegalCompanyProfile } from "@afenda/corporate-administration";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import {
	createCorporateAdministrationCommandOptions,
	createCorporateAdministrationLegalCompanyDependencies,
} from "@/lib/erp/corporate-administration-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const updateLegalCompanyProfileActionSchema = z.object({
	legalCompanyId: z.string().trim().uuid(),
	expectedVersion: z.coerce.number().int().nonnegative(),
	displayName: z.string().trim().min(1).max(256),
	registeredName: z.string().trim().min(1).max(256).optional(),
	shortName: z.string().trim().min(1).max(128).optional(),
	sourceReference: z.string().trim().min(1).max(256),
	idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export async function updateLegalCompanyProfileAction(
	formData: FormData,
): Promise<ActionResult<{ legalCompanyId: string; version: number }>> {
	return await runMemberPermissionAction({
		path: "updateLegalCompanyProfileAction",
		permission: "corporate_administration.company.manage",
		safeMessage: "Could not update legal company profile.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateLegalCompanyProfileActionSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				expectedVersion: formData.get("expectedVersion"),
				displayName: formData.get("displayName"),
				registeredName: emptyToUndefined(formData.get("registeredName")),
				shortName: emptyToUndefined(formData.get("shortName")),
				sourceReference: formData.get("sourceReference"),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await updateLegalCompanyProfile(
				{
					legalCompanyId: parsed.data.legalCompanyId,
					expectedVersion: parsed.data.expectedVersion,
					profile: {
						displayName: parsed.data.displayName,
						...(parsed.data.registeredName === undefined
							? {}
							: { registeredName: parsed.data.registeredName }),
						...(parsed.data.shortName === undefined
							? {}
							: { shortName: parsed.data.shortName }),
						sourceReference: parsed.data.sourceReference,
					},
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
					legalCompanyId: mapped.data.legalCompanyId,
					version: mapped.data.version,
				},
			};
		},
	});
}

export async function updateLegalCompanyProfileFormAction(
	_previousState: ActionResult<{
		legalCompanyId: string;
		version: number;
	}> | null,
	formData: FormData,
): Promise<ActionResult<{ legalCompanyId: string; version: number }> | null> {
	return await updateLegalCompanyProfileAction(formData);
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
