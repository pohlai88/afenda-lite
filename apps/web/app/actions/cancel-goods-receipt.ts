"use server";

import { cancelGoodsReceipt, type GoodsReceipt } from "@afenda/receiving";
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

export type CancelGoodsReceiptActionData = { receipt: GoodsReceipt };
export type CancelGoodsReceiptActionState =
	ActionResult<CancelGoodsReceiptActionData> | null;

const cancelGoodsReceiptFormSchema = z.object({
	receiptId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function cancelGoodsReceiptAction(
	_prev: CancelGoodsReceiptActionState,
	formData: FormData,
): Promise<CancelGoodsReceiptActionState> {
	return runOperatorPermissionAction({
		path: "cancelGoodsReceiptAction",
		permission: "receiving.receipt.cancel",
		safeMessage:
			"Could not cancel goods receipt. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelGoodsReceiptFormSchema, {
				receiptId: formData.get("receiptId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid receipt and expected version.",
					parsed.details,
				);
			}
			const result = await cancelGoodsReceipt(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `cancel:${correlationId}:${parsed.data.receiptId}`,
					...parsed.data,
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
