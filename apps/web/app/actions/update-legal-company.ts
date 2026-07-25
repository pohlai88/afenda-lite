"use server";

import {
	CA_PERMISSION_COMPANY_UPDATE,
	type CaLegalCompany,
	updateLegalCompany,
} from "@afenda/corporate-administration";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	caLegalCompanyIdSchema,
	nullableFormUuidSchema,
} from "@/lib/erp/corporate-administration-action-schemas";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type UpdateLegalCompanyActionData = { company: CaLegalCompany };
export type UpdateLegalCompanyActionState =
	ActionResult<UpdateLegalCompanyActionData> | null;

const nullableText = z
	.union([z.string().trim().min(1), z.literal("")])
	.transform((value) => (value === "" ? null : value));

const updateLegalCompanyFormSchema = z.object({
	legalCompanyId: caLegalCompanyIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	code: z.string().trim().min(1).max(100).optional(),
	legalPartyId: z.string().uuid().optional(),
	jurisdictionCountryId: nullableFormUuidSchema,
	legalFormCode: nullableText.optional(),
	legalFormNameSnapshot: nullableText.optional(),
	incorporationDate: z
		.union([z.string().date(), z.literal("")])
		.optional()
		.transform((value) => (value === "" ? null : value)),
	commencementDate: z
		.union([z.string().date(), z.literal("")])
		.optional()
		.transform((value) => (value === "" ? null : value)),
	fiscalYearEndMonth: z.coerce.number().int().min(1).max(12).optional(),
	fiscalYearEndDay: z.coerce.number().int().min(1).max(31).optional(),
});

export async function updateLegalCompanyAction(
	_prev: UpdateLegalCompanyActionState,
	formData: FormData,
): Promise<UpdateLegalCompanyActionState> {
	return runOperatorPermissionAction({
		path: "updateLegalCompanyAction",
		permission: CA_PERMISSION_COMPANY_UPDATE,
		safeMessage:
			"Could not update legal company. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateLegalCompanyFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				expectedVersion: formData.get("expectedVersion"),
				code: formData.get("code") || undefined,
				legalPartyId: formData.get("legalPartyId") || undefined,
				jurisdictionCountryId:
					formData.get("jurisdictionCountryId") ?? undefined,
				legalFormCode: formData.get("legalFormCode") ?? undefined,
				legalFormNameSnapshot:
					formData.get("legalFormNameSnapshot") ?? undefined,
				incorporationDate: formData.get("incorporationDate") ?? undefined,
				commencementDate: formData.get("commencementDate") ?? undefined,
				fiscalYearEndMonth: formData.get("fiscalYearEndMonth") || undefined,
				fiscalYearEndDay: formData.get("fiscalYearEndDay") || undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid company profile fields.",
					parsed.details,
				);
			}
			const result = await updateLegalCompany(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `update:${parsed.data.legalCompanyId}:${parsed.data.expectedVersion}`,
					...parsed.data,
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
