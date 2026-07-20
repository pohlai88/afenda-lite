"use server";

import { randomUUID } from "node:crypto";
import { reserveStock, type StockReservation } from "@afenda/inventory";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { revalidateInventoryPaths } from "@/app/actions/revalidate-inventory-paths";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReserveStockActionData = {
	reservation: StockReservation;
};

export type ReserveStockActionState =
	ActionResult<ReserveStockActionData> | null;

const reserveStockFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	warehouseId: z.string().uuid(),
	itemId: z.string().uuid(),
	quantity: z.string().trim().min(1),
	idempotencyKey: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.optional()
		.transform((value) => value ?? `reserve:${randomUUID()}`),
});

/**
 * Reserve available stock — one-shot reservation create.
 */
export async function reserveStockAction(
	_prev: ReserveStockActionState,
	formData: FormData,
): Promise<ReserveStockActionState> {
	return runOperatorPermissionAction({
		path: "reserveStockAction",
		permission: "inventory.reservation.create",
		safeMessage: "Could not reserve stock. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reserveStockFormSchema, {
				code: formData.get("code"),
				warehouseId: formData.get("warehouseId"),
				itemId: formData.get("itemId"),
				quantity: formData.get("quantity"),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid code, warehouse, item, quantity, and idempotency key.",
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
					idempotencyKey: parsed.data.idempotencyKey,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidateInventoryPaths();
			return { ok: true, data: { reservation: mapped.data } };
		},
	});
}
