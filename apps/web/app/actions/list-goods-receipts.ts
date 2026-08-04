"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type GoodsReceipt, listGoodsReceipts } from "@afenda/receiving";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ListGoodsReceiptsActionData {
	receipts: GoodsReceipt[];
}

const listGoodsReceiptsActionSchema = z
	.object({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z.enum(["draft", "posted", "cancelled"]).optional(),
		sourceType: z.enum(["purchase_order"]).optional(),
	})
	.optional();

export async function listGoodsReceiptsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: GoodsReceipt["status"];
	sourceType?: GoodsReceipt["sourceType"];
}): Promise<ActionResult<ListGoodsReceiptsActionData>> {
	return await runOperatorPermissionAction({
		path: "listGoodsReceiptsAction",
		permission: "receiving.receipt.read",
		safeMessage:
			"Could not list goods receipts. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(listGoodsReceiptsActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid goods receipt filters.",
				});
			}
			const result = await listGoodsReceipts(
				{
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
				},
				createReceivingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { receipts: mapped.data } };
		},
	});
}
