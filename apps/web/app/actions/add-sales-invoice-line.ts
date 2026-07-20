"use server";

import {
	addSalesInvoiceLine,
	type SalesInvoiceLine,
} from "@afenda/receivables";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddSalesInvoiceLineActionData = { line: SalesInvoiceLine };
export type AddSalesInvoiceLineActionState =
	ActionResult<AddSalesInvoiceLineActionData> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	itemId: z.string().uuid(),
	description: z.string().trim().min(1).max(512),
	quantity: z.coerce.number().positive(),
	unitPrice: z.coerce.number().positive(),
});

export async function addSalesInvoiceLineAction(
	_prev: AddSalesInvoiceLineActionState,
	formData: FormData,
): Promise<AddSalesInvoiceLineActionState> {
	return runOperatorPermissionAction({
		path: "addSalesInvoiceLineAction",
		permission: "receivables.manage",
		safeMessage:
			"Could not add sales invoice line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				itemId: formData.get("itemId"),
				description: formData.get("description"),
				quantity: formData.get("quantity"),
				unitPrice: formData.get("unitPrice"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, item, quantity, and unit price.",
					parsed.details,
				);
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
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/receivables");
			revalidatePath("/client/receivables");
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
