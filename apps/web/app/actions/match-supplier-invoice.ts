"use server";

import { matchSupplierInvoice, type SupplierInvoice } from "@afenda/payables";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
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
	return runOperatorPermissionAction({
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
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, purchase order, goods receipt, and version.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await matchSupplierInvoice(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPayablesCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/payables");
			revalidatePath("/client/payables");
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
