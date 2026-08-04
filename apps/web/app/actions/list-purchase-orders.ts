"use server";

import type { Result as ActionResult } from "@afenda/errors";
import { listPurchaseOrders, type PurchaseOrder } from "@afenda/purchasing";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";

export interface ListPurchaseOrdersActionData {
	orders: PurchaseOrder[];
}

/**
 * Purchase order list — session org stamp + `purchasing.order.list`.
 */
export async function listPurchaseOrdersAction(input?: {
	page?: number;
	pageSize?: number;
	status?: PurchaseOrder["status"];
}): Promise<ActionResult<ListPurchaseOrdersActionData>> {
	return await runOperatorPermissionAction({
		path: "listPurchaseOrdersAction",
		permission: "purchasing.order.list",
		safeMessage:
			"Could not list purchase orders. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const result = await listPurchaseOrders(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					page: input?.page,
					pageSize: input?.pageSize,
					status: input?.status,
				},
				createPurchasingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { orders: mapped.data } };
		},
	});
}
