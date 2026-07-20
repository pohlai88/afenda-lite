"use server";

import { createStockMovement, type StockMovement } from "@afenda/inventory";
import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateStockMovementActionData = {
	movement: StockMovement;
};

export type CreateStockMovementActionState =
	ActionResult<CreateStockMovementActionData> | null;

const optionalTextField = z
	.union([z.string().trim().max(512), z.literal(""), z.undefined()])
	.transform((value) => (value === undefined || value === "" ? undefined : value));

function formValue(value: FormDataEntryValue | null): string | undefined {
	return typeof value === "string" && value !== "" ? value : undefined;
}

const createStockMovementFormSchema = z.discriminatedUnion("movementType", [
	z.object({
		code: z.string().trim().min(1).max(64),
		movementType: z.literal("receipt"),
		source: z.enum(["opening_balance", "receiving"]).default("opening_balance"),
		warehouseId: z.string().uuid(),
		fromWarehouseId: z.undefined().optional(),
		toWarehouseId: z.undefined().optional(),
		adjustmentReasonCode: z.undefined().optional(),
		adjustmentNote: z.undefined().optional(),
	}),
	z.object({
		code: z.string().trim().min(1).max(64),
		movementType: z.literal("issue"),
		source: z.literal("fulfillment"),
		warehouseId: z.string().uuid(),
		fromWarehouseId: z.undefined().optional(),
		toWarehouseId: z.undefined().optional(),
		adjustmentReasonCode: z.undefined().optional(),
		adjustmentNote: z.undefined().optional(),
	}),
	z.object({
		code: z.string().trim().min(1).max(64),
		movementType: z.literal("transfer"),
		source: z.literal("transfer"),
		warehouseId: z.undefined().optional(),
		fromWarehouseId: z.string().uuid(),
		toWarehouseId: z.string().uuid(),
		adjustmentReasonCode: z.undefined().optional(),
		adjustmentNote: z.undefined().optional(),
	}),
	z.object({
		code: z.string().trim().min(1).max(64),
		movementType: z.literal("adjustment"),
		source: z.literal("manual_adjustment"),
		warehouseId: z.string().uuid(),
		fromWarehouseId: z.undefined().optional(),
		toWarehouseId: z.undefined().optional(),
		adjustmentReasonCode: z.string().trim().min(1).max(64),
		adjustmentNote: optionalTextField,
	}),
]);

/**
 * Inventory draft stock movement create — session org stamp + governed create or
 * adjustment permission.
 */
export async function createStockMovementAction(
	_prev: CreateStockMovementActionState,
	formData: FormData,
): Promise<CreateStockMovementActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	try {
		const parsed = parseSchema(createStockMovementFormSchema, {
			code: formData.get("code"),
			movementType: formData.get("movementType"),
			source: formValue(formData.get("source")),
			warehouseId: formValue(formData.get("warehouseId")),
			fromWarehouseId: formValue(formData.get("fromWarehouseId")),
			toWarehouseId: formValue(formData.get("toWarehouseId")),
			adjustmentReasonCode: formValue(formData.get("adjustmentReasonCode")),
			adjustmentNote: formValue(formData.get("adjustmentNote")),
		});
		if (!parsed.success) {
			return actionFail(
				"VALIDATION_ERROR",
				"Enter a valid movement code, source, and warehouse fields.",
				parsed.details,
			);
		}

		const permission =
			parsed.data.movementType === "adjustment"
				? "inventory.adjustment.post"
				: "inventory.movement.create";
		const permissionDenied = await forbidUnlessPermission(session, permission);
		if (permissionDenied) {
			return permissionDenied;
		}

		const idempotencyKey =
			correlationId.length > 0 ? `create:${correlationId}` : randomUUID();

		const result = await createStockMovement(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				idempotencyKey,
				code: parsed.data.code,
				movementType: parsed.data.movementType,
				source: parsed.data.source,
				warehouseId: parsed.data.warehouseId,
				fromWarehouseId: parsed.data.fromWarehouseId,
				toWarehouseId: parsed.data.toWarehouseId,
				adjustmentReasonCode: parsed.data.adjustmentReasonCode,
				adjustmentNote: parsed.data.adjustmentNote,
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
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "createStockMovementAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not create stock movement. Try again or contact an admin.",
			correlationId,
		);
	}
}
