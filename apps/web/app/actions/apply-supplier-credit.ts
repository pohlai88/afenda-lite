"use server";

import { applySupplierCredit, type SupplierAllocation } from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ApplySupplierCreditActionState = ActionResult<{
	allocation: SupplierAllocation;
}> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	creditNoteId: z.string().uuid(),
	amount: z.coerce.number().positive(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

export async function applySupplierCreditAction(
	_prev: ApplySupplierCreditActionState,
	formData: FormData,
): Promise<ApplySupplierCreditActionState> {
	return runOperatorPermissionAction({
		path: "applySupplierCreditAction",
		permission: "payables.manage",
		safeMessage:
			"Could not apply supplier credit. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				creditNoteId: formData.get("creditNoteId"),
				amount: formData.get("amount"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, credit note, amount, and idempotency key.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await applySupplierCredit(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePayablesPaths();
			return { ok: true, data: { allocation: mapped.data } };
		},
	});
}
