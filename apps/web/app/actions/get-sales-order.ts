"use server";

import { getOrderById, type SalesOrder } from "@afenda/sales";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";

export type GetSalesOrderActionData = {
	order: SalesOrder;
};

/**
 * Sales order get — session org stamp + `sales.read`.
 */
export async function getSalesOrderAction(
	orderId: string,
): Promise<ActionResult<GetSalesOrderActionData>> {
	return runOperatorPermissionAction({
		path: "getSalesOrderAction",
		permission: "sales.read",
		safeMessage: "Could not load sales order. Try again or contact an admin.",
		execute: async (session) => {
			const result = await getOrderById(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					id: orderId,
				},
				createSalesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			if (mapped.data === null) {
				return actionFail("NOT_FOUND", "Sales order not found");
			}
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
