"use server";

import { closePurchaseOrder, type PurchaseOrder } from "@afenda/purchasing";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ClosePurchaseOrderActionData = {
	order: PurchaseOrder;
};

export type ClosePurchaseOrderActionState =
	ActionResult<ClosePurchaseOrderActionData> | null;

const closePurchaseOrderFormSchema = z.object({
	orderId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

/**
 * Purchase order close (posted only) — terminates remaining commitment + `purchasing.order.close`.
 */
export async function closePurchaseOrderAction(
	_prev: ClosePurchaseOrderActionState,
	formData: FormData,
): Promise<ClosePurchaseOrderActionState> {
	return runOperatorPermissionAction({
		path: "closePurchaseOrderAction",
		permission: "purchasing.order.close",
		safeMessage:
			"Could not close purchase order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(closePurchaseOrderFormSchema, {
				orderId: formData.get("orderId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order and expected version.",
					parsed.details,
				);
			}

			const result = await closePurchaseOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `close:${correlationId}:${parsed.data.orderId}`,
					orderId: parsed.data.orderId,
					expectedVersion: parsed.data.expectedVersion,
				},
				createPurchasingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/purchasing");
			revalidatePath("/client/purchasing");
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
