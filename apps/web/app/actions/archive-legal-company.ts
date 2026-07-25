"use server";

import {
	archiveLegalCompany,
	CA_PERMISSION_COMPANY_ARCHIVE,
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

export type ArchiveLegalCompanyActionData = { company: CaLegalCompany };
export type ArchiveLegalCompanyActionState =
	ActionResult<ArchiveLegalCompanyActionData> | null;

const archiveLegalCompanyFormSchema = z.object({
	legalCompanyId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	effectiveDate: z.string().date(),
	reason: z.string().trim().min(1).max(500).optional(),
	evidenceReference: z.string().trim().min(1).max(500).optional(),
});

export async function archiveLegalCompanyAction(
	_prev: ArchiveLegalCompanyActionState,
	formData: FormData,
): Promise<ArchiveLegalCompanyActionState> {
	return runOperatorPermissionAction({
		path: "archiveLegalCompanyAction",
		permission: CA_PERMISSION_COMPANY_ARCHIVE,
		safeMessage:
			"Could not archive legal company. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(archiveLegalCompanyFormSchema, {
				legalCompanyId: formData.get("legalCompanyId"),
				expectedVersion: formData.get("expectedVersion"),
				effectiveDate: formData.get("effectiveDate"),
				reason: formData.get("reason") || undefined,
				evidenceReference: formData.get("evidenceReference") || undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid archive date.",
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
			const result = await archiveLegalCompany(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `archive:${parsed.data.legalCompanyId}:${parsed.data.expectedVersion}`,
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
