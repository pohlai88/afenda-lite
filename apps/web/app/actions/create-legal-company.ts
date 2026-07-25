"use server";

import {
	CA_PERMISSION_COMPANY_CREATE,
	type CaLegalCompany,
	createLegalCompany,
} from "@afenda/corporate-administration";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { optionalFormUuidSchema } from "@/lib/erp/corporate-administration-action-schemas";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateLegalCompanyActionData = { company: CaLegalCompany };
export type CreateLegalCompanyActionState =
	ActionResult<CreateLegalCompanyActionData> | null;

const createLegalCompanyFormSchema = z.object({
	code: z.string().trim().min(1).max(100),
	legalEntityDimensionId: z.string().uuid(),
	legalPartyId: optionalFormUuidSchema,
});

export async function createLegalCompanyAction(
	_prev: CreateLegalCompanyActionState,
	formData: FormData,
): Promise<CreateLegalCompanyActionState> {
	return runOperatorPermissionAction({
		path: "createLegalCompanyAction",
		permission: CA_PERMISSION_COMPANY_CREATE,
		safeMessage:
			"Could not create legal company. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createLegalCompanyFormSchema, {
				code: formData.get("code"),
				legalEntityDimensionId: formData.get("legalEntityDimensionId"),
				legalPartyId: formData.get("legalPartyId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid company code and legal entity dimension.",
					parsed.details,
				);
			}
			const idempotencyKey = `create:${parsed.data.code}:${session.orgId}`;
			const result = await createLegalCompany(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey,
					code: parsed.data.code,
					legalEntityDimensionId: parsed.data.legalEntityDimensionId,
					legalPartyId: parsed.data.legalPartyId,
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
