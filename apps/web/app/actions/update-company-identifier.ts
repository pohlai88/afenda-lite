"use server";

import {
	CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
	type CaCompanyIdentifier,
	updateCompanyIdentifier,
} from "@afenda/corporate-administration";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	caCompanyIdentifierIdSchema,
	caLegalCompanyIdSchema,
	optionalFormUuidSchema,
} from "@/lib/erp/corporate-administration-action-schemas";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type UpdateCompanyIdentifierActionData = {
	identifier: CaCompanyIdentifier;
};
export type UpdateCompanyIdentifierActionState =
	ActionResult<UpdateCompanyIdentifierActionData> | null;

const updateCompanyIdentifierFormSchema = z.object({
	legalCompanyId: caLegalCompanyIdSchema,
	companyIdentifierId: caCompanyIdentifierIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	identifierValue: z
		.union([z.string().trim().min(1).max(500), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
	jurisdictionCountryId: optionalFormUuidSchema,
	authorityPartyId: optionalFormUuidSchema,
});

export async function updateCompanyIdentifierAction(
	_prev: UpdateCompanyIdentifierActionState,
	formData: FormData,
): Promise<UpdateCompanyIdentifierActionState> {
	return runOperatorPermissionAction({
		path: "updateCompanyIdentifierAction",
		permission: CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
		safeMessage:
			"Could not update company identifier. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateCompanyIdentifierFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				companyIdentifierId: formData.get("companyIdentifierId"),
				expectedVersion: formData.get("expectedVersion"),
				identifierValue: formData.get("identifierValue") ?? undefined,
				jurisdictionCountryId:
					formData.get("jurisdictionCountryId") ?? undefined,
				authorityPartyId: formData.get("authorityPartyId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid identifier update fields.",
					parsed.details,
				);
			}
			const idempotencyKey = `upd-id:${parsed.data.companyIdentifierId}:${parsed.data.expectedVersion}`;
			const result = await updateCompanyIdentifier(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey,
					companyIdentifierId: parsed.data.companyIdentifierId,
					expectedVersion: parsed.data.expectedVersion,
					identifierValue: parsed.data.identifierValue,
					jurisdictionCountryId: parsed.data.jurisdictionCountryId,
					authorityPartyId: parsed.data.authorityPartyId,
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
