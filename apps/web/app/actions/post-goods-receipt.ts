"use server";

import { type GoodsReceipt, postGoodsReceipt } from "@afenda/receiving";
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

export type PostGoodsReceiptActionData = { receipt: GoodsReceipt };
export type PostGoodsReceiptActionState =
	ActionResult<PostGoodsReceiptActionData> | null;

const postGoodsReceiptFormSchema = z.object({
	receiptId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postGoodsReceiptAction(
	_prev: PostGoodsReceiptActionState,
	formData: FormData,
): Promise<PostGoodsReceiptActionState> {
	return runOperatorPermissionAction({
		path: "postGoodsReceiptAction",
		permission: "receiving.receipt.post",
		safeMessage: "Could not post goods receipt. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(postGoodsReceiptFormSchema, {
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
			const result = await postGoodsReceipt(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `post:${correlationId}:${parsed.data.receiptId}`,
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
