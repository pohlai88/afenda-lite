"use server";

import {
	CA_PERMISSION_COMPANY_SUSPEND,
	createCorporateAdministrationRequestFingerprint,
	type CaLegalCompany,
	suspendLegalCompany,
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

export type SuspendLegalCompanyActionData = { company: CaLegalCompany };
export type SuspendLegalCompanyActionState =
	ActionResult<SuspendLegalCompanyActionData> | null;

const suspendLegalCompanyFormSchema = z.object({
	legalCompanyId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	effectiveDate: z.string().date(),
	reason: z.string().trim().min(1).max(500),
	evidenceReference: z.string().trim().min(1).max(500).optional(),
});

export async function suspendLegalCompanyAction(
	_prev: SuspendLegalCompanyActionState,
	formData: FormData,
): Promise<SuspendLegalCompanyActionState> {
	return runOperatorPermissionAction({
		path: "suspendLegalCompanyAction",
		permission: CA_PERMISSION_COMPANY_SUSPEND,
		safeMessage:
			"Could not suspend legal company. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(suspendLegalCompanyFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				expectedVersion: formData.get("expectedVersion"),
				effectiveDate: formData.get("effectiveDate"),
				reason: formData.get("reason"),
				evidenceReference: formData.get("evidenceReference") || undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a suspension date and reason.",
					parsed.details,
				);
			}
			const commandPayload = {
				legalCompanyId: parsed.data.legalCompanyId,
				expectedVersion: parsed.data.expectedVersion,
				effectiveDate: parsed.data.effectiveDate,
				reason: parsed.data.reason,
				evidenceReference: parsed.data.evidenceReference,
			};
			const result = await suspendLegalCompany(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `suspend:${parsed.data.legalCompanyId}:${parsed.data.expectedVersion}`,
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
