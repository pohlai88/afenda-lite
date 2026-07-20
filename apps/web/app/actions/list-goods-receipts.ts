"use server";

import { type GoodsReceipt, listGoodsReceipts } from "@afenda/receiving";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ListGoodsReceiptsActionData = { receipts: GoodsReceipt[] };

const listGoodsReceiptsActionSchema = z
	.object({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z.enum(["draft", "posted", "cancelled"]).optional(),
		sourceType: z
			.enum([
				"purchase_order",
				"expected_receipt",
				"return_shipment",
				"unplanned",
			])
			.optional(),
	})
	.optional();

export async function listGoodsReceiptsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: GoodsReceipt["status"];
	sourceType?: GoodsReceipt["sourceType"];
}): Promise<ActionResult<ListGoodsReceiptsActionData>> {
	return runOperatorPermissionAction({
		path: "listGoodsReceiptsAction",
		permission: "receiving.read",
		safeMessage:
			"Could not list goods receipts. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(listGoodsReceiptsActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid goods receipt filters.",
					parsed.details,
				);
			}
			const result = await listGoodsReceipts(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					...parsed.data,
				},
				createReceivingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { receipts: mapped.data } };
		},
	});
}
