"use server";

import { type GoodsReceipt, reverseGoodsReceipt } from "@afenda/receiving";
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

export type ReverseGoodsReceiptActionData = { receipt: GoodsReceipt };
export type ReverseGoodsReceiptActionState =
	ActionResult<ReverseGoodsReceiptActionData> | null;

const reverseGoodsReceiptFormSchema = z.object({
	receiptId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	reason: z.string().trim().min(1).max(2000),
});

export async function reverseGoodsReceiptAction(
	_prev: ReverseGoodsReceiptActionState,
	formData: FormData,
): Promise<ReverseGoodsReceiptActionState> {
	return runOperatorPermissionAction({
		path: "reverseGoodsReceiptAction",
		permission: "receiving.receipt.reverse",
		safeMessage:
			"Could not reverse goods receipt. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reverseGoodsReceiptFormSchema, {
				receiptId: formData.get("receiptId"),
				expectedVersion: formData.get("expectedVersion"),
				reason: formData.get("reason"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid receipt, version, and reverse reason.",
					parsed.details,
				);
			}
			const result = await reverseGoodsReceipt(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `reverse:${correlationId}:${parsed.data.receiptId}`,
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
