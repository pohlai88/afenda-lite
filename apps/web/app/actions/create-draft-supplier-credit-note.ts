"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	createDraftSupplierCreditNote,
	type SupplierInvoice,
} from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateDraftSupplierCreditNoteActionState = ActionResult<{
	creditNote: SupplierInvoice;
}> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	supplierId: z.string().uuid(),
	supplierCode: z.string().trim().min(1).max(64),
	supplierName: z.string().trim().min(1).max(256),
	currencyCode: z.string().trim().length(3),
});

export async function createDraftSupplierCreditNoteAction(
	_prev: CreateDraftSupplierCreditNoteActionState,
	formData: FormData,
): Promise<CreateDraftSupplierCreditNoteActionState> {
	return await runOperatorPermissionAction({
		path: "createDraftSupplierCreditNoteAction",
		permission: "payables.manage",
		safeMessage:
			"Could not create draft supplier credit note. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				supplierId: formData.get("supplierId"),
				supplierCode: formData.get("supplierCode"),
				supplierName: formData.get("supplierName"),
				currencyCode: formData.get("currencyCode"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid credit note code, supplier, and currency.",
				});
			}
			const mapped = mapPackageResult(
				await createDraftSupplierCreditNote(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePayablesPaths();
			return { ok: true, data: { creditNote: mapped.data } };
		},
	});
}
