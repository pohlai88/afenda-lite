"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	addSalesInvoiceLine,
	type SalesInvoiceLine,
} from "@afenda/receivables";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface AddSalesInvoiceLineActionData {
	line: SalesInvoiceLine;
}
export type AddSalesInvoiceLineActionState =
	ActionResult<AddSalesInvoiceLineActionData> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	itemId: z.string().uuid(),
	itemCode: z.string().trim().min(1).max(64),
	itemName: z.string().trim().min(1).max(256),
	description: z.string().trim().min(1).max(512),
	quantity: z.coerce.number().positive(),
	unitPrice: z.coerce.number().positive(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

export async function addSalesInvoiceLineAction(
	_prev: AddSalesInvoiceLineActionState,
	formData: FormData,
): Promise<AddSalesInvoiceLineActionState> {
	return await runOperatorPermissionAction({
		path: "addSalesInvoiceLineAction",
		permission: "receivables.invoice.update",
		safeMessage:
			"Could not add sales invoice line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				itemId: formData.get("itemId"),
				itemCode: formData.get("itemCode"),
				itemName: formData.get("itemName"),
				description: formData.get("description"),
				quantity: formData.get("quantity"),
				unitPrice: formData.get("unitPrice"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid invoice, item, quantity, and unit price.",
				});
			}
			const result = await addSalesInvoiceLine(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					...parsed.data,
				},
				createReceivablesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/receivables");
			revalidatePath("/client/receivables");
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
