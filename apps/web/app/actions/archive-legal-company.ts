"use server";

import {
	archiveLegalCompany,
	CA_PERMISSION_COMPANY_ARCHIVE,
	type CaLegalCompany,
} from "@afenda/corporate-administration";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import {
	caEffectiveAtFromFormDate,
	caLegalCompanyIdSchema,
} from "@/lib/erp/corporate-administration-action-schemas";
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
	legalCompanyId: caLegalCompanyIdSchema,
	expectedVersion: z.coerce.number().int().positive(),
	effectiveDate: z.string().date(),
	reason: z.string().trim().min(1).max(2000),
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
			const result = await archiveLegalCompany(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `archive:${parsed.data.legalCompanyId}:${parsed.data.expectedVersion}`,
					legalCompanyId: parsed.data.legalCompanyId,
					expectedVersion: parsed.data.expectedVersion,
					effectiveAt: caEffectiveAtFromFormDate(parsed.data.effectiveDate),
					reasonCode: "operator_archive",
					reason: parsed.data.reason,
					evidenceDocumentReference: parsed.data.evidenceReference,
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
