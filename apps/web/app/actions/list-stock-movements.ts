"use server";

import { listStockMovements, type StockMovement } from "@afenda/inventory";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export type ListStockMovementsActionData = {
	movements: StockMovement[];
};

/**
 * List stock movements — `inventory.read`.
 */
export async function listStockMovementsAction(): Promise<
	ActionResult<ListStockMovementsActionData>
> {
	return runOperatorPermissionAction({
		path: "listStockMovementsAction",
		permission: "inventory.read",
		safeMessage:
			"Could not list stock movements. Try again or contact an admin.",
		execute: async (session) => {
			const result = await listStockMovements(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					pageSize: 50,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { movements: mapped.data } };
		},
	});
}
