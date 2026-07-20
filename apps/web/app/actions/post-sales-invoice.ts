"use server";

import { postSalesInvoice, type SalesInvoice } from "@afenda/receivables";
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

export type PostSalesInvoiceActionData = { invoice: SalesInvoice };
export type PostSalesInvoiceActionState =
	ActionResult<PostSalesInvoiceActionData> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postSalesInvoiceAction(
	_prev: PostSalesInvoiceActionState,
	formData: FormData,
): Promise<PostSalesInvoiceActionState> {
	return runOperatorPermissionAction({
		path: "postSalesInvoiceAction",
		permission: "receivables.manage",
		safeMessage: "Could not post sales invoice. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice and expected version.",
					parsed.details,
				);
			}
			const result = await postSalesInvoice(
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
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
