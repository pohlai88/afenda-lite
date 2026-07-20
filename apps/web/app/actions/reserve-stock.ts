"use server";

import { reserveStock, type StockMovement } from "@afenda/inventory";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReserveStockActionData = {
	movement: StockMovement;
};

export type ReserveStockActionState =
	ActionResult<ReserveStockActionData> | null;

const reserveStockFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	warehouseId: z.string().uuid(),
	itemId: z.string().uuid(),
	quantity: z.string().trim().min(1),
});

/**
 * Reserve available stock — one-shot create+post + `inventory.manage`.
 */
export async function reserveStockAction(
	_prev: ReserveStockActionState,
	formData: FormData,
): Promise<ReserveStockActionState> {
	return runOperatorPermissionAction({
		path: "reserveStockAction",
		permission: "inventory.manage",
		safeMessage: "Could not reserve stock. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reserveStockFormSchema, {
				code: formData.get("code"),
				warehouseId: formData.get("warehouseId"),
				itemId: formData.get("itemId"),
				quantity: formData.get("quantity"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid code, warehouse, item, and quantity.",
					parsed.details,
				);
			}

			const result = await reserveStock(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					warehouseId: parsed.data.warehouseId,
					itemId: parsed.data.itemId,
					quantity: parsed.data.quantity,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/inventory");
			revalidatePath("/client/inventory");
			return { ok: true, data: { movement: mapped.data } };
		},
	});
}
