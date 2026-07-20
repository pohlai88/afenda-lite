"use server";

import {
	createDraftSupplierCreditNote,
	type SupplierInvoice,
} from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
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
	return runOperatorPermissionAction({
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
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid credit note code, supplier, and currency.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await createDraftSupplierCreditNote(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePayablesPaths();
			return { ok: true, data: { creditNote: mapped.data } };
		},
	});
}
