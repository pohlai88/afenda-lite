"use server";

import {
	allocateSupplierPayment,
	type SupplierAllocation,
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

export type AllocateSupplierPaymentActionState = ActionResult<{
	allocation: SupplierAllocation;
}> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	amount: z.coerce.number().positive(),
	paymentId: z.string().uuid(),
});

export async function allocateSupplierPaymentAction(
	_prev: AllocateSupplierPaymentActionState,
	formData: FormData,
): Promise<AllocateSupplierPaymentActionState> {
	return runOperatorPermissionAction({
		path: "allocateSupplierPaymentAction",
		permission: "payables.manage",
		safeMessage:
			"Could not allocate supplier payment. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				amount: formData.get("amount"),
				paymentId: formData.get("paymentId"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, amount, and payment.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await allocateSupplierPayment(
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
			return { ok: true, data: { allocation: mapped.data } };
		},
	});
}
