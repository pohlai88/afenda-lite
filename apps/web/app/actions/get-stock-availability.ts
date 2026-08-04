"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	getStockAvailability,
	type StockAvailability,
} from "@afenda/inventory";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface GetStockAvailabilityActionData {
	availability: StockAvailability[];
}

/**
 * Get stock availability — `inventory.availability.read`.
 */
export async function getStockAvailabilityAction(
	input: unknown = {},
): Promise<ActionResult<GetStockAvailabilityActionData>> {
	return await runOperatorPermissionAction({
		path: "getStockAvailabilityAction",
		permission: "inventory.availability.read",
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
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid optional warehouse or item filters.",
				});
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
			return { ok: true, data: { availability: mapped.data } };
		},
	});
}
