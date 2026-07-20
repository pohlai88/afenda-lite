"use server";

import { createDraftGoodsReceipt, type GoodsReceipt } from "@afenda/receiving";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import { revalidateReceivingPaths } from "@/lib/erp/receiving-revalidate";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateGoodsReceiptActionData = { receipt: GoodsReceipt };
export type CreateGoodsReceiptActionState =
	ActionResult<CreateGoodsReceiptActionData> | null;

const createGoodsReceiptFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	purchaseOrderId: z.string().uuid(),
	warehouseId: z.string().uuid(),
	notes: z
		.string()
		.trim()
		.max(2000)
		.optional()
		.transform((value) => (value === "" ? undefined : value)),
});

export async function createGoodsReceiptAction(
	_prev: CreateGoodsReceiptActionState,
	formData: FormData,
): Promise<CreateGoodsReceiptActionState> {
	return runOperatorPermissionAction({
		path: "createGoodsReceiptAction",
		permission: "receiving.receipt.create",
		safeMessage:
			"Could not create goods receipt. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createGoodsReceiptFormSchema, {
				code: formData.get("code"),
				purchaseOrderId: formData.get("purchaseOrderId"),
				warehouseId: formData.get("warehouseId"),
				notes: formData.get("notes") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid receipt code, purchase order, and warehouse.",
					parsed.details,
				);
			}

			const result = await createDraftGoodsReceipt(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `create:${correlationId}`,
					code: parsed.data.code,
					source: {
						kind: "purchase_order",
						purchaseOrderId: parsed.data.purchaseOrderId,
					},
					warehouseId: parsed.data.warehouseId,
					notes: parsed.data.notes,
				},
				createReceivingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidateReceivingPaths();
			return { ok: true, data: { receipt: mapped.data } };
		},
	});
}
