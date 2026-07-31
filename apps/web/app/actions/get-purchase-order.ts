"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { getPurchaseOrderById, type PurchaseOrder } from "@afenda/purchasing";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";

export interface GetPurchaseOrderActionData {
	order: PurchaseOrder;
}

/**
 * Purchase order get — session org stamp + `purchasing.order.read`.
 */
export async function getPurchaseOrderAction(
	orderId: string,
): Promise<ActionResult<GetPurchaseOrderActionData>> {
	return await runOperatorPermissionAction({
		path: "getPurchaseOrderAction",
		permission: "purchasing.order.read",
		safeMessage:
			"Could not load purchase order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const result = await getPurchaseOrderById(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					id: orderId,
				},
				createPurchasingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			if (mapped.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Purchase order not found",
				});
			}
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
