"use server";

import {
	CA_PERMISSION_COMPANY_NAME_MANAGE,
	endCompanyName,
	type CaCompanyName,
} from "@afenda/corporate-administration";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	caCompanyNameIdSchema,
	caLegalCompanyIdSchema,
} from "@/lib/erp/corporate-administration-action-schemas";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type EndCompanyNameActionData = { name: CaCompanyName };
export type EndCompanyNameActionState =
	ActionResult<EndCompanyNameActionData> | null;

const endCompanyNameFormSchema = z.object({
	legalCompanyId: caLegalCompanyIdSchema,
	companyNameId: caCompanyNameIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	effectiveTo: z.string().date(),
	reason: z.string().trim().min(1).max(2000),
});

export async function endCompanyNameAction(
	_prev: EndCompanyNameActionState,
	formData: FormData,
): Promise<EndCompanyNameActionState> {
	return runOperatorPermissionAction({
		path: "endCompanyNameAction",
		permission: CA_PERMISSION_COMPANY_NAME_MANAGE,
		safeMessage: "Could not end company name. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(endCompanyNameFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				companyNameId: formData.get("companyNameId"),
				expectedVersion: formData.get("expectedVersion"),
				effectiveTo: formData.get("effectiveTo"),
				reason: formData.get("reason"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid end date and reason for the company name.",
					parsed.details,
				);
			}
			const result = await endCompanyName(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `end-name:${parsed.data.companyNameId}:${parsed.data.expectedVersion}`,
					companyNameId: parsed.data.companyNameId,
					expectedVersion: parsed.data.expectedVersion,
					effectiveTo: parsed.data.effectiveTo,
					reason: parsed.data.reason,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/corporate-administration");
			revalidatePath("/client/corporate-administration");
			return { ok: true, data: { name: mapped.data } };
		},
	});
}
