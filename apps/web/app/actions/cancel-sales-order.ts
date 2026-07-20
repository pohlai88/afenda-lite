"use server";

import { cancelSalesOrder, type SalesOrder } from "@afenda/sales";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CancelSalesOrderActionData = {
	order: SalesOrder;
};

export type CancelSalesOrderActionState =
	ActionResult<CancelSalesOrderActionData> | null;

const cancelSalesOrderFormSchema = z.object({
	orderId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

/**
 * Sales order cancel — optimistic version + `sales.order.cancel`.
 */
export async function cancelSalesOrderAction(
	_prev: CancelSalesOrderActionState,
	formData: FormData,
): Promise<CancelSalesOrderActionState> {
	return runOperatorPermissionAction({
		path: "cancelSalesOrderAction",
		permission: "sales.order.cancel",
		safeMessage: "Could not cancel sales order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelSalesOrderFormSchema, {
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

			const result = await cancelSalesOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `cancel:${correlationId}:${parsed.data.orderId}`,
					orderId: parsed.data.orderId,
					expectedVersion: parsed.data.expectedVersion,
				},
				createSalesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/sales");
			revalidatePath("/client/sales");
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
