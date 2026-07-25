"use server";

import {
	CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
	retireCompanyIdentifier,
	type CaCompanyIdentifier,
} from "@afenda/corporate-administration";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type RetireCompanyIdentifierActionData = {
	identifier: CaCompanyIdentifier;
};
export type RetireCompanyIdentifierActionState =
	ActionResult<RetireCompanyIdentifierActionData> | null;

const retireCompanyIdentifierFormSchema = z.object({
	legalCompanyId: z.string().uuid(),
	companyIdentifierId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	effectiveTo: z.string().date(),
});

export async function retireCompanyIdentifierAction(
	_prev: RetireCompanyIdentifierActionState,
	formData: FormData,
): Promise<RetireCompanyIdentifierActionState> {
	return runOperatorPermissionAction({
		path: "retireCompanyIdentifierAction",
		permission: CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
		safeMessage:
			"Could not retire company identifier. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(retireCompanyIdentifierFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				companyIdentifierId: formData.get("companyIdentifierId"),
				expectedVersion: formData.get("expectedVersion"),
				effectiveTo: formData.get("effectiveTo"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid retirement date for the identifier.",
					parsed.details,
				);
			}
			const commandPayload = {
				legalCompanyId: parsed.data.legalCompanyId,
				companyIdentifierId: parsed.data.companyIdentifierId,
				expectedVersion: parsed.data.expectedVersion,
				effectiveTo: parsed.data.effectiveTo,
			};
			const result = await retireCompanyIdentifier(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `retire-id:${parsed.data.companyIdentifierId}:${parsed.data.expectedVersion}`,
					...commandPayload,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/corporate-administration");
			revalidatePath("/client/corporate-administration");
			return { ok: true, data: { identifier: mapped.data } };
		},
	});
}
