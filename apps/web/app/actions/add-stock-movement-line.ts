"use server";

import {
	addStockMovementLine,
	type StockMovementLine,
} from "@afenda/inventory";
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

export type AddStockMovementLineActionData = {
	line: StockMovementLine;
};

export type AddStockMovementLineActionState =
	ActionResult<AddStockMovementLineActionData> | null;

const addStockMovementLineFormSchema = z.object({
	movementId: z.string().uuid(),
	itemId: z.string().uuid(),
	quantity: z.string().trim().min(1),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

/**
 * Add line to draft stock movement — `inventory.movement.create`.
 */
export async function addStockMovementLineAction(
	_prev: AddStockMovementLineActionState,
	formData: FormData,
): Promise<AddStockMovementLineActionState> {
	return runOperatorPermissionAction({
		path: "addStockMovementLineAction",
		permission: "inventory.movement.create",
		safeMessage:
			"Could not add stock movement line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addStockMovementLineFormSchema, {
				movementId: formData.get("movementId"),
				itemId: formData.get("itemId"),
				quantity: formData.get("quantity"),
				expectedVersion: formData.get("expectedVersion"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid movement, item, quantity, and expected version.",
					parsed.details,
				);
			}

			const result = await addStockMovementLine(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					movementId: parsed.data.movementId,
					itemId: parsed.data.itemId,
					quantity: parsed.data.quantity,
					expectedVersion: parsed.data.expectedVersion,
					idempotencyKey: parsed.data.idempotencyKey,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidateInventoryPaths();
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
