"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	issueSupplierCreditNote,
	type SupplierInvoice,
} from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import { parseSchema } from "@/modules/platform/schemas/common";

export type IssueSupplierCreditNoteActionState = ActionResult<{
	creditNote: SupplierInvoice;
}> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	supplierId: z.string().uuid(),
	supplierCode: z.string().trim().min(1).max(64),
	supplierName: z.string().trim().min(1).max(256),
	currencyCode: z.string().trim().length(3),
	amount: z.coerce.number().positive(),
	itemId: z.string().uuid(),
	description: z.string().trim().min(1).max(512).optional(),
});

export async function issueSupplierCreditNoteAction(
	_prev: IssueSupplierCreditNoteActionState,
	formData: FormData,
): Promise<IssueSupplierCreditNoteActionState> {
	return await runOperatorPermissionAction({
		path: "issueSupplierCreditNoteAction",
		permission: "payables.manage",
		safeMessage:
			"Could not issue supplier credit note. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				supplierId: formData.get("supplierId"),
				supplierCode: formData.get("supplierCode"),
				supplierName: formData.get("supplierName"),
				currencyCode: formData.get("currencyCode"),
				amount: formData.get("amount"),
				itemId: formData.get("itemId"),
				description: formData.get("description") || undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid credit note, supplier, item, currency, and amount.",
				});
			}
			const mapped = mapPackageResult(
				await issueSupplierCreditNote(
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
