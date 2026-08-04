"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	applySupplierPayment,
	type SupplierAllocation,
} from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ApplySupplierPaymentActionState = ActionResult<{
	allocation: SupplierAllocation;
}> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	amount: z.coerce.number().positive(),
	paymentId: z.string().uuid(),
	paymentApplicationInstructionId: z.string().uuid(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

export async function applySupplierPaymentAction(
	_prev: ApplySupplierPaymentActionState,
	formData: FormData,
): Promise<ApplySupplierPaymentActionState> {
	return await runOperatorPermissionAction({
		path: "applySupplierPaymentAction",
		permission: "payables.manage",
		safeMessage:
			"Could not apply supplier payment. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				amount: formData.get("amount"),
				paymentId: formData.get("paymentId"),
				paymentApplicationInstructionId: formData.get(
					"paymentApplicationInstructionId",
				),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid invoice, amount, payment, instruction, and idempotency key.",
				});
			}
			const mapped = mapPackageResult(
				await applySupplierPayment(
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
			return { ok: true, data: { allocation: mapped.data } };
		},
	});
}
