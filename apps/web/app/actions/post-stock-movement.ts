"use server";

import { postStockMovement, type StockMovement } from "@afenda/inventory";
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

export type PostStockMovementActionData = {
	movement: StockMovement;
};

export type PostStockMovementActionState =
	ActionResult<PostStockMovementActionData> | null;

const postStockMovementFormSchema = z.object({
	movementId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

/**
 * Post draft stock movement — apply ledger/balance + `inventory.movement.post`.
 */
export async function postStockMovementAction(
	_prev: PostStockMovementActionState,
	formData: FormData,
): Promise<PostStockMovementActionState> {
	return runOperatorPermissionAction({
		path: "postStockMovementAction",
		permission: "inventory.movement.post",
		safeMessage:
			"Could not post stock movement. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(postStockMovementFormSchema, {
				movementId: formData.get("movementId"),
				expectedVersion: formData.get("expectedVersion"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid movement, expected version, and idempotency key.",
					parsed.details,
				);
			}

			const result = await postStockMovement(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					movementId: parsed.data.movementId,
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
			return { ok: true, data: { movement: mapped.data } };
		},
	});
}
