"use server";

import { type GoodsReceipt, getGoodsReceiptById } from "@afenda/receiving";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetGoodsReceiptActionData = { receipt: GoodsReceipt };

const getGoodsReceiptSchema = z.string().uuid();

export async function getGoodsReceiptAction(
	receiptId: string,
): Promise<ActionResult<GetGoodsReceiptActionData>> {
	return runOperatorPermissionAction({
		path: "getGoodsReceiptAction",
		permission: "receiving.receipt.read",
		safeMessage: "Could not load goods receipt. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(getGoodsReceiptSchema, receiptId);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid goods receipt id.",
					parsed.details,
				);
			}
			const result = await getGoodsReceiptById(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					id: parsed.data,
				},
				createReceivingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			if (mapped.data === null) {
				return actionFail("NOT_FOUND", "Goods receipt not found");
			}
			return { ok: true, data: { receipt: mapped.data } };
		},
	});
}
