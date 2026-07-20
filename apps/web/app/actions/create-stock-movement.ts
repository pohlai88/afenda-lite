"use server";

import { createStockMovement, type StockMovement } from "@afenda/inventory";
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

export type CreateStockMovementActionData = {
	movement: StockMovement;
};

export type CreateStockMovementActionState =
	ActionResult<CreateStockMovementActionData> | null;

const createStockMovementFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	movementType: z.enum([
		"receipt",
		"issue",
		"transfer",
		"adjustment",
		"reservation",
		"reservation_release",
	]),
	warehouseId: z
		.union([z.string().uuid(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
	fromWarehouseId: z
		.union([z.string().uuid(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
	toWarehouseId: z
		.union([z.string().uuid(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
});

/**
 * Inventory draft stock movement create — session org stamp + `inventory.manage`.
 */
export async function createStockMovementAction(
	_prev: CreateStockMovementActionState,
	formData: FormData,
): Promise<CreateStockMovementActionState> {
	return runOperatorPermissionAction({
		path: "createStockMovementAction",
		permission: "inventory.manage",
		safeMessage:
			"Could not create stock movement. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createStockMovementFormSchema, {
				code: formData.get("code"),
				movementType: formData.get("movementType"),
				warehouseId: formData.get("warehouseId") ?? undefined,
				fromWarehouseId: formData.get("fromWarehouseId") ?? undefined,
				toWarehouseId: formData.get("toWarehouseId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid movement code, type, and warehouse fields.",
					parsed.details,
				);
			}

			const result = await createStockMovement(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					movementType: parsed.data.movementType,
					warehouseId: parsed.data.warehouseId,
					fromWarehouseId: parsed.data.fromWarehouseId,
					toWarehouseId: parsed.data.toWarehouseId,
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
