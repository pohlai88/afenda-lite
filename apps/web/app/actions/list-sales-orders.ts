"use server";

import type { Result as ActionResult } from "@afenda/errors";
import { listSalesOrders, type SalesOrder } from "@afenda/sales";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";

export interface ListSalesOrdersActionData {
	orders: SalesOrder[];
}

/**
 * Sales order list — session org stamp + `sales.order.list`.
 */
export async function listSalesOrdersAction(input?: {
	page?: number;
	pageSize?: number;
	status?: SalesOrder["status"];
}): Promise<ActionResult<ListSalesOrdersActionData>> {
	return await runOperatorPermissionAction({
		path: "listSalesOrdersAction",
		permission: "sales.order.list",
		safeMessage: "Could not list sales orders. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const result = await listSalesOrders(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					page: input?.page,
					pageSize: input?.pageSize,
					status: input?.status,
				},
				createSalesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { orders: mapped.data.items } };
		},
	});
}
