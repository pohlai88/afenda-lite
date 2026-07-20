"use server";

import {
	addSupplierInvoiceLine,
	type SupplierInvoiceLine,
} from "@afenda/payables";
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
	return runOperatorPermissionAction({
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
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, item, quantity, and unit price.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await addSupplierInvoiceLine(
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
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
