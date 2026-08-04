"use server";

import { randomUUID } from "node:crypto";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { cancelStockMovement, type StockMovement } from "@afenda/inventory";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { revalidateInventoryPaths } from "@/app/actions/revalidate-inventory-paths";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface CancelStockMovementActionData {
	movement: StockMovement;
}

export type CancelStockMovementActionState =
	ActionResult<CancelStockMovementActionData> | null;

const cancelStockMovementFormSchema = z.object({
	movementId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.optional()
		.transform((value) => value ?? `cancel:${randomUUID()}`),
});

export async function cancelStockMovementAction(
	_prev: CancelStockMovementActionState,
	formData: FormData,
): Promise<CancelStockMovementActionState> {
	return await runOperatorPermissionAction({
		path: "cancelStockMovementAction",
		permission: "inventory.movement.cancel",
		safeMessage:
			"Could not cancel stock movement. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelStockMovementFormSchema, {
				movementId: formData.get("movementId"),
				expectedVersion: formData.get("expectedVersion"),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid movement, expected version, and idempotency key.",
				});
			}
			const result = await cancelStockMovement(
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
