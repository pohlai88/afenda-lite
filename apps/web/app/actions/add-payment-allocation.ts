"use server";

import { addPaymentAllocation, type PaymentAllocation } from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddPaymentAllocationActionState = ActionResult<{
	allocation: PaymentAllocation;
}> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
	targetType: z.enum(["receivable", "payable"]),
	targetId: z.string().uuid(),
	amount: z.coerce.number().positive(),
});

export async function addPaymentAllocationAction(
	_prev: AddPaymentAllocationActionState,
	formData: FormData,
): Promise<AddPaymentAllocationActionState> {
	return runOperatorPermissionAction({
		path: "addPaymentAllocationAction",
		permission: "payments.manage",
		safeMessage:
			"Could not add payment allocation. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
				targetType: formData.get("targetType"),
				targetId: formData.get("targetId"),
				amount: formData.get("amount"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid payment, allocation target, and amount.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await addPaymentAllocation(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...parsed.data,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/payments");
			revalidatePath("/client/payments");
			return { ok: true, data: { allocation: mapped.data } };
		},
	});
}
