"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { postSalesInvoice, type SalesInvoice } from "@afenda/receivables";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface PostSalesInvoiceActionData {
	invoice: SalesInvoice;
}
export type PostSalesInvoiceActionState =
	ActionResult<PostSalesInvoiceActionData> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

export async function postSalesInvoiceAction(
	_prev: PostSalesInvoiceActionState,
	formData: FormData,
): Promise<PostSalesInvoiceActionState> {
	return await runOperatorPermissionAction({
		path: "postSalesInvoiceAction",
		permission: "receivables.invoice.post",
		safeMessage: "Could not post sales invoice. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				expectedVersion: formData.get("expectedVersion"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid invoice and expected version.",
				});
			}
			const result = await postSalesInvoice(
				{
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
				},
				createReceivablesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/receivables");
			revalidatePath("/client/receivables");
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
