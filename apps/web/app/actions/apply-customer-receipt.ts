"use server";

import {
	applyCustomerReceipt,
	type CustomerAllocation,
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

export type ApplyCustomerReceiptActionData = {
	allocation: CustomerAllocation;
};
export type ApplyCustomerReceiptActionState =
	ActionResult<ApplyCustomerReceiptActionData> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
	paymentApplicationInstructionId: z.string().uuid(),
	salesInvoiceId: z.string().uuid(),
	amount: z.coerce.number().positive(),
	expectedInvoiceVersion: z.coerce.number().int().positive(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

export async function applyCustomerReceiptAction(
	_prev: ApplyCustomerReceiptActionState,
	formData: FormData,
): Promise<ApplyCustomerReceiptActionState> {
	return runOperatorPermissionAction({
		path: "applyCustomerReceiptAction",
		permission: "receivables.receipt.apply",
		safeMessage:
			"Could not apply customer receipt. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
				paymentApplicationInstructionId: formData.get(
					"paymentApplicationInstructionId",
				),
				salesInvoiceId: formData.get("salesInvoiceId"),
				amount: formData.get("amount"),
				expectedInvoiceVersion: formData.get("expectedInvoiceVersion"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid payment, instruction, sales invoice, amount, version, and idempotency key.",
					parsed.details,
				);
			}
			const mapped = mapPackageResult(
				await applyCustomerReceipt(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createReceivablesCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/receivables");
			revalidatePath("/client/receivables");
			return { ok: true, data: { allocation: mapped.data } };
		},
	});
}
