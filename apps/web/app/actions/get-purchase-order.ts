"use server";

import { getPurchaseOrderById, type PurchaseOrder } from "@afenda/purchasing";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";

export type GetPurchaseOrderActionData = {
	order: PurchaseOrder;
};

/**
 * Purchase order get — session org stamp + `purchasing.read`.
 */
export async function getPurchaseOrderAction(
	orderId: string,
): Promise<ActionResult<GetPurchaseOrderActionData>> {
	return runOperatorPermissionAction({
		path: "getPurchaseOrderAction",
		permission: "purchasing.read",
		safeMessage:
			"Could not load purchase order. Try again or contact an admin.",
		execute: async (session) => {
			const result = await getPurchaseOrderById(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					id: orderId,
				},
				createPurchasingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			if (mapped.data === null) {
				return actionFail("NOT_FOUND", "Purchase order not found");
			}
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
