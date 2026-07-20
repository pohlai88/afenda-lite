"use server";

import { randomUUID } from "node:crypto";
import { createReversalMovement, type StockMovement } from "@afenda/inventory";
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

export type CreateReversalMovementActionData = {
	movement: StockMovement;
};

export type CreateReversalMovementActionState =
	ActionResult<CreateReversalMovementActionData> | null;

const createReversalMovementFormSchema = z.object({
	movementId: z.string().uuid(),
	code: z.string().trim().min(1).max(64),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.optional()
		.transform((value) => value ?? `reversal:${randomUUID()}`),
});

export async function createReversalMovementAction(
	_prev: CreateReversalMovementActionState,
	formData: FormData,
): Promise<CreateReversalMovementActionState> {
	return runOperatorPermissionAction({
		path: "createReversalMovementAction",
		permission: "inventory.movement.post",
		safeMessage:
			"Could not create reversal movement. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createReversalMovementFormSchema, {
				movementId: formData.get("movementId"),
				code: formData.get("code"),
				expectedVersion: formData.get("expectedVersion"),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid movement, reversal code, expected version, and idempotency key.",
					parsed.details,
				);
			}
			const result = await createReversalMovement(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					movementId: parsed.data.movementId,
					code: parsed.data.code,
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
