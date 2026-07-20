"use server";

import { issueCreditNote, type SalesInvoice } from "@afenda/receivables";
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

export type IssueCreditNoteActionData = { creditNote: SalesInvoice };
export type IssueCreditNoteActionState =
	ActionResult<IssueCreditNoteActionData> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	customerId: z.string().uuid(),
	customerCode: z.string().trim().min(1).max(64),
	customerName: z.string().trim().min(1).max(256),
	currencyCode: z.string().trim().length(3),
	amount: z.coerce.number().positive(),
});

export async function issueCreditNoteAction(
	_prev: IssueCreditNoteActionState,
	formData: FormData,
): Promise<IssueCreditNoteActionState> {
	return runOperatorPermissionAction({
		path: "issueCreditNoteAction",
		permission: "receivables.manage",
		safeMessage: "Could not issue credit note. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				customerId: formData.get("customerId"),
				customerCode: formData.get("customerCode"),
				customerName: formData.get("customerName"),
				currencyCode: formData.get("currencyCode"),
				amount: formData.get("amount"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid credit note, customer, currency, and amount.",
					parsed.details,
				);
			}
			const result = await issueCreditNote(
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
			return { ok: true, data: { creditNote: mapped.data } };
		},
	});
}
