"use server";

import { getStockMovementById, type StockMovement } from "@afenda/inventory";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetStockMovementActionData = {
	movement: StockMovement | null;
};

/**
 * Get stock movement by id — `inventory.read`.
 */
export async function getStockMovementAction(
	input: unknown,
): Promise<ActionResult<GetStockMovementActionData>> {
	return runOperatorPermissionAction({
		path: "getStockMovementAction",
		permission: "inventory.read",
		safeMessage:
			"Could not load stock movement. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(
				z.object({
					id: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid stock movement id.",
					parsed.details,
				);
			}

			const result = await getStockMovementById(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					id: parsed.data.id,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { movement: mapped.data } };
		},
	});
}
