"use server";

import {
	CA_PERMISSION_COMPANY_IDENTIFIER_MANAGE,
	createCorporateAdministrationRequestFingerprint,
	type CaCompanyIdentifier,
	updateCompanyIdentifier,
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

export type UpdateCompanyIdentifierActionData = {
	identifier: CaCompanyIdentifier;
};
export type UpdateCompanyIdentifierActionState =
	ActionResult<UpdateCompanyIdentifierActionData> | null;

const updateCompanyIdentifierFormSchema = z.object({
	legalCompanyId: z.string().uuid(),
	companyIdentifierId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	identifierValue: z
		.union([z.string().trim().min(1).max(200), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
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
				jurisdictionCode: formData.get("jurisdictionCode") ?? undefined,
				issuingAuthority: formData.get("issuingAuthority") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid identifier update fields.",
					parsed.details,
				);
			}
			const commandPayload = {
				legalCompanyId: parsed.data.legalCompanyId,
				companyIdentifierId: parsed.data.companyIdentifierId,
				expectedVersion: parsed.data.expectedVersion,
				identifierValue: parsed.data.identifierValue,
				jurisdictionCode: parsed.data.jurisdictionCode,
				issuingAuthority: parsed.data.issuingAuthority,
			};
			const idempotencyKey = `upd-id:${parsed.data.companyIdentifierId}:${parsed.data.expectedVersion}`;
			const result = await updateCompanyIdentifier(
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
