"use server";

import {
	addCompanyIdentifier,
	CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
	createCorporateAdministrationRequestFingerprint,
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

export type AddCompanyIdentifierActionData = {
	identifier: CaCompanyIdentifier;
};
export type AddCompanyIdentifierActionState =
	ActionResult<AddCompanyIdentifierActionData> | null;

const addCompanyIdentifierFormSchema = z.object({
	legalCompanyId: z.string().uuid(),
	identifierType: z.string().trim().min(1).max(64),
	identifierValue: z.string().trim().min(1).max(200),
	jurisdictionCode: z
		.union([z.string().trim().min(1).max(16), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
	issuingAuthority: z
		.union([z.string().trim().min(1).max(200), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
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
				jurisdictionCode: formData.get("jurisdictionCode") ?? undefined,
				issuingAuthority: formData.get("issuingAuthority") ?? undefined,
				effectiveFrom: formData.get("effectiveFrom"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid identifier type, value, and effective date.",
					parsed.details,
				);
			}
			const commandPayload = {
				legalCompanyId: parsed.data.legalCompanyId,
				identifierType: parsed.data.identifierType,
				identifierValue: parsed.data.identifierValue,
				jurisdictionCode: parsed.data.jurisdictionCode,
				issuingAuthority: parsed.data.issuingAuthority,
				effectiveFrom: parsed.data.effectiveFrom,
			};
			const idempotencyKey = `id:${parsed.data.legalCompanyId}:${parsed.data.identifierType}:${parsed.data.identifierValue}`;
			const result = await addCompanyIdentifier(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey,
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
			return { ok: true, data: { identifier: mapped.data } };
		},
	});
}
