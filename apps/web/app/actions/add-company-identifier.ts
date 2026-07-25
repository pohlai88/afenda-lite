"use server";

import {
	addCompanyIdentifier,
	CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
	type CaCompanyIdentifier,
} from "@afenda/corporate-administration";
import {
	buildCompanyIdentifierIdempotencyMaterial,
	isTaxIdentifierType,
} from "@afenda/corporate-administration/normalization";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createCorporateAdministrationCommandOptions } from "@/lib/erp/corporate-administration-command-options";
import {
	caLegalCompanyIdSchema,
	optionalFormUuidSchema,
} from "@/lib/erp/corporate-administration-action-schemas";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddCompanyIdentifierActionData = {
	identifier: CaCompanyIdentifier;
};
export type AddCompanyIdentifierActionState =
	ActionResult<AddCompanyIdentifierActionData> | null;

const addCompanyIdentifierFormSchema = z.object({
	legalCompanyId: caLegalCompanyIdSchema,
	identifierType: z.string().trim().min(1).max(100),
	identifierValue: z.string().trim().min(1).max(500),
	jurisdictionCountryId: optionalFormUuidSchema,
	authorityPartyId: optionalFormUuidSchema,
	effectiveFrom: z.string().date(),
});

export async function addCompanyIdentifierAction(
	_prev: AddCompanyIdentifierActionState,
	formData: FormData,
): Promise<AddCompanyIdentifierActionState> {
	return runOperatorPermissionAction({
		path: "addCompanyIdentifierAction",
		permission: CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
		safeMessage:
			"Could not add company identifier. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addCompanyIdentifierFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				identifierType: formData.get("identifierType"),
				identifierValue: formData.get("identifierValue"),
				jurisdictionCountryId:
					formData.get("jurisdictionCountryId") ?? undefined,
				authorityPartyId: formData.get("authorityPartyId") ?? undefined,
				effectiveFrom: formData.get("effectiveFrom"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid identifier type, value, and effective date.",
					parsed.details,
				);
			}
			if (isTaxIdentifierType(parsed.data.identifierType)) {
				return actionFail(
					"VALIDATION_ERROR",
					"Tax registrations belong in master data, not corporate identifiers.",
				);
			}
			const idempotencyMaterial = buildCompanyIdentifierIdempotencyMaterial({
				legalCompanyId: parsed.data.legalCompanyId,
				identifierType: parsed.data.identifierType,
				identifierValue: parsed.data.identifierValue,
			});
			const result = await addCompanyIdentifier(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: idempotencyMaterial.idempotencyKey,
					legalCompanyId: parsed.data.legalCompanyId,
					identifierType: idempotencyMaterial.identifierType,
					identifierValue: parsed.data.identifierValue,
					jurisdictionCountryId: parsed.data.jurisdictionCountryId,
					authorityPartyId: parsed.data.authorityPartyId,
					effectiveFrom: parsed.data.effectiveFrom,
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
