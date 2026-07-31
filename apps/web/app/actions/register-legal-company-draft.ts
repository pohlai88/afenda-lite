"use server";

import { randomUUID } from "node:crypto";
import { registerLegalCompanyDraft } from "@afenda/corporate-administration";
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

const registerLegalCompanyDraftActionSchema = z.object({
	companyCode: z.string().trim().min(1).max(64),
	displayName: z.string().trim().min(1).max(256),
	masterDataPartyId: z.string().trim().uuid(),
	homeJurisdictionCountryCode: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^[A-Z]{2}$/),
	idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export async function registerLegalCompanyDraftAction(
	formData: FormData,
): Promise<ActionResult<{ legalCompanyId: string }>> {
	return await runMemberPermissionAction({
		path: "registerLegalCompanyDraftAction",
		permission: "corporate_administration.company.manage",
		safeMessage: "Could not register legal company draft.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(registerLegalCompanyDraftActionSchema, {
				companyCode: formData.get("companyCode"),
				displayName: formData.get("displayName"),
				masterDataPartyId: formData.get("masterDataPartyId"),
				homeJurisdictionCountryCode: formData.get(
					"homeJurisdictionCountryCode",
				),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}

			const result = await registerLegalCompanyDraft(
				{
					companyCode: parsed.data.companyCode,
					displayName: parsed.data.displayName,
					masterDataPartyId: parsed.data.masterDataPartyId,
					homeJurisdictionCountryCode: parsed.data.homeJurisdictionCountryCode,
					sourceReference: `web:${correlationId}`,
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
				data: { legalCompanyId: mapped.data.legalCompanyId },
			};
		},
	});
}

export async function registerLegalCompanyDraftFormAction(
	_previousState: ActionResult<{ legalCompanyId: string }> | null,
	formData: FormData,
): Promise<ActionResult<{ legalCompanyId: string }> | null> {
	return await registerLegalCompanyDraftAction(formData);
}
