"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	addSupplierInvoiceLine,
	type SupplierInvoiceLine,
} from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddSupplierInvoiceLineActionState = ActionResult<{
	line: SupplierInvoiceLine;
}> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	itemId: z.string().uuid(),
	description: z.string().trim().min(1).max(512),
	quantity: z.coerce.number().positive(),
	unitPrice: z.coerce.number().positive(),
});

export async function addSupplierInvoiceLineAction(
	_prev: AddSupplierInvoiceLineActionState,
	formData: FormData,
): Promise<AddSupplierInvoiceLineActionState> {
	return await runOperatorPermissionAction({
		path: "addSupplierInvoiceLineAction",
		permission: "payables.manage",
		safeMessage:
			"Could not add supplier invoice line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				itemId: formData.get("itemId"),
				description: formData.get("description"),
				quantity: formData.get("quantity"),
				unitPrice: formData.get("unitPrice"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid invoice, item, quantity, and unit price.",
				});
			}
			const mapped = mapPackageResult(
				await addSupplierInvoiceLine(
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
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
