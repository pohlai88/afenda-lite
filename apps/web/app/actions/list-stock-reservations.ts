"use server";

import {
	listStockReservations,
	type StockReservation,
} from "@afenda/inventory";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export type ListStockReservationsActionData = {
	reservations: StockReservation[];
};

/**
 * List stock reservations — `inventory.movement.read` (console query gate).
 */
export async function listStockReservationsAction(): Promise<
	ActionResult<ListStockReservationsActionData>
> {
	return runOperatorPermissionAction({
		path: "listStockReservationsAction",
		permission: "inventory.movement.read",
		safeMessage:
			"Could not list stock reservations. Try again or contact an admin.",
		execute: async (session) => {
			const result = await listStockReservations(
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
			return { ok: true, data: { reservations: mapped.data } };
		},
	});
}
