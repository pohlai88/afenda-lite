"use server";

import {
	createDraftSalesInvoice,
	type SalesInvoice,
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

export type CreateDraftSalesInvoiceActionData = { invoice: SalesInvoice };
export type CreateDraftSalesInvoiceActionState =
	ActionResult<CreateDraftSalesInvoiceActionData> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	customerId: z.string().uuid(),
	customerCode: z.string().trim().min(1).max(64),
	customerName: z.string().trim().min(1).max(256),
	currencyCode: z.string().trim().length(3),
});

export async function createDraftSalesInvoiceAction(
	_prev: CreateDraftSalesInvoiceActionState,
	formData: FormData,
): Promise<CreateDraftSalesInvoiceActionState> {
	return runOperatorPermissionAction({
		path: "createDraftSalesInvoiceAction",
		permission: "receivables.manage",
		safeMessage:
			"Could not create sales invoice. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				customerId: formData.get("customerId"),
				customerCode: formData.get("customerCode"),
				customerName: formData.get("customerName"),
				currencyCode: formData.get("currencyCode"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, customer, and currency.",
					parsed.details,
				);
			}
			const result = await createDraftSalesInvoice(
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
