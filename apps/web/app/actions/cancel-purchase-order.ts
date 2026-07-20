"use server";

import { cancelPurchaseOrder, type PurchaseOrder } from "@afenda/purchasing";
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

export type CancelPurchaseOrderActionData = {
	order: PurchaseOrder;
};

export type CancelPurchaseOrderActionState =
	ActionResult<CancelPurchaseOrderActionData> | null;

const cancelPurchaseOrderFormSchema = z.object({
	orderId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

/**
 * Purchase order cancel (draft only) — optimistic version + `purchasing.order.cancel`.
 */
export async function cancelPurchaseOrderAction(
	_prev: CancelPurchaseOrderActionState,
	formData: FormData,
): Promise<CancelPurchaseOrderActionState> {
	return runOperatorPermissionAction({
		path: "cancelPurchaseOrderAction",
		permission: "purchasing.order.cancel",
		safeMessage:
			"Could not cancel purchase order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelPurchaseOrderFormSchema, {
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

			const result = await cancelPurchaseOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `cancel:${correlationId}:${parsed.data.orderId}`,
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
