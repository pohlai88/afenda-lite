"use server";

import {
	addCompanyName,
	CA_PERMISSION_COMPANY_NAME_MANAGE,
	type CaCompanyName,
} from "@afenda/corporate-administration";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	caLegalCompanyIdSchema,
	CA_COMPANY_NAME_TYPE_VALUES,
} from "@/lib/erp/corporate-administration-action-schemas";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddCompanyNameActionData = { name: CaCompanyName };
export type AddCompanyNameActionState =
	ActionResult<AddCompanyNameActionData> | null;

const addCompanyNameFormSchema = z.object({
	legalCompanyId: caLegalCompanyIdSchema,
	nameType: z.enum(CA_COMPANY_NAME_TYPE_VALUES),
	displayName: z.string().trim().min(1).max(500),
	effectiveFrom: z.string().date(),
});

export async function addCompanyNameAction(
	_prev: AddCompanyNameActionState,
	formData: FormData,
): Promise<AddCompanyNameActionState> {
	return runOperatorPermissionAction({
		path: "addCompanyNameAction",
		permission: CA_PERMISSION_COMPANY_NAME_MANAGE,
		safeMessage: "Could not add company name. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addCompanyNameFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				nameType: formData.get("nameType"),
				displayName: formData.get("displayName"),
				effectiveFrom: formData.get("effectiveFrom"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid name type, display name, and effective date.",
					parsed.details,
				);
			}
			const idempotencyKey = `name:${parsed.data.legalCompanyId}:${parsed.data.nameType}:${parsed.data.displayName}`;
			const result = await addCompanyName(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey,
					legalCompanyId: parsed.data.legalCompanyId,
					nameType: parsed.data.nameType,
					displayName: parsed.data.displayName,
					effectiveFrom: parsed.data.effectiveFrom,
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
