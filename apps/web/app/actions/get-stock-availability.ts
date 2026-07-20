"use server";

import { getStockAvailability, type StockBalance } from "@afenda/inventory";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetStockAvailabilityActionData = {
	balances: StockBalance[];
};

/**
 * Get stock availability — `inventory.read`.
 */
export async function getStockAvailabilityAction(
	input: unknown = {},
): Promise<ActionResult<GetStockAvailabilityActionData>> {
	return runOperatorPermissionAction({
		path: "getStockAvailabilityAction",
		permission: "inventory.read",
		safeMessage:
			"Could not load stock availability. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(
				z.object({
					warehouseId: z.string().uuid().optional(),
					itemId: z.string().uuid().optional(),
				}),
				input ?? {},
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid optional warehouse or item filters.",
					parsed.details,
				);
			}

			const result = await getStockAvailability(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					warehouseId: parsed.data.warehouseId,
					itemId: parsed.data.itemId,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { balances: mapped.data } };
		},
	});
}
