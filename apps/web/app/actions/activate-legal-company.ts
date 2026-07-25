"use server";

import {
	activateLegalCompany,
	CA_PERMISSION_COMPANY_ACTIVATE,
	createCorporateAdministrationRequestFingerprint,
	type CaLegalCompany,
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

export type ActivateLegalCompanyActionData = { company: CaLegalCompany };
export type ActivateLegalCompanyActionState =
	ActionResult<ActivateLegalCompanyActionData> | null;

const activateLegalCompanyFormSchema = z.object({
	legalCompanyId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	effectiveDate: z.string().trim().min(1),
});

export async function activateLegalCompanyAction(
	_prev: ActivateLegalCompanyActionState,
	formData: FormData,
): Promise<ActivateLegalCompanyActionState> {
	return runOperatorPermissionAction({
		path: "activateLegalCompanyAction",
		permission: CA_PERMISSION_COMPANY_ACTIVATE,
		safeMessage:
			"Could not activate legal company. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(activateLegalCompanyFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				expectedVersion: formData.get("expectedVersion"),
				effectiveDate: formData.get("effectiveDate"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid activation fields.",
					parsed.details,
				);
			}
			const commandPayload = {
				legalCompanyId: parsed.data.legalCompanyId,
				expectedVersion: parsed.data.expectedVersion,
				effectiveDate: parsed.data.effectiveDate,
			};
			const result = await activateLegalCompany(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `activate:${parsed.data.legalCompanyId}:${parsed.data.expectedVersion}`,
					requestFingerprint:
						createCorporateAdministrationRequestFingerprint(commandPayload),
					...commandPayload,
				},
				createCorporateAdministrationCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/corporate-administration");
			revalidatePath("/client/corporate-administration");
			return { ok: true, data: { company: mapped.data } };
		},
	});
}
