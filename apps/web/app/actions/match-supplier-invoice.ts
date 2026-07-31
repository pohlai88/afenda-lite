"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { matchSupplierInvoice, type SupplierInvoice } from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import { parseSchema } from "@/modules/platform/schemas/common";

export type MatchSupplierInvoiceActionState = ActionResult<{
	invoice: SupplierInvoice;
}> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	purchaseOrderId: z.string().uuid(),
	goodsReceiptId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function matchSupplierInvoiceAction(
	_prev: MatchSupplierInvoiceActionState,
	formData: FormData,
): Promise<MatchSupplierInvoiceActionState> {
	return await runOperatorPermissionAction({
		path: "matchSupplierInvoiceAction",
		permission: "payables.manage",
		safeMessage:
			"Could not match supplier invoice. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				purchaseOrderId: formData.get("purchaseOrderId"),
				goodsReceiptId: formData.get("goodsReceiptId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid invoice, purchase order, goods receipt, and version.",
				});
			}
			const mapped = mapPackageResult(
				await matchSupplierInvoice(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePayablesPaths();
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
