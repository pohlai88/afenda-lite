"use server";

import { listPurchaseOrders, type PurchaseOrder } from "@afenda/purchasing";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export type ListPurchaseOrdersActionData = {
	orders: PurchaseOrder[];
};

/**
 * Purchase order list — session org stamp + `purchasing.read`.
 */
export async function listPurchaseOrdersAction(input?: {
	page?: number;
	pageSize?: number;
	status?: PurchaseOrder["status"];
}): Promise<ActionResult<ListPurchaseOrdersActionData>> {
	return runOperatorPermissionAction({
		path: "listPurchaseOrdersAction",
		permission: "purchasing.read",
		safeMessage:
			"Could not list purchase orders. Try again or contact an admin.",
		execute: async (session) => {
			const result = await listPurchaseOrders(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
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
