"use server";

import { addGoodsReceiptLine, type GoodsReceiptLine } from "@afenda/receiving";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddGoodsReceiptLineActionData = { line: GoodsReceiptLine };
export type AddGoodsReceiptLineActionState =
	ActionResult<AddGoodsReceiptLineActionData> | null;

const optionalPositiveQuantity = z
	.union([z.coerce.number().positive(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);
const optionalUuid = z
	.union([z.string().uuid(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);

const addGoodsReceiptLineFormSchema = z.object({
	receiptId: z.string().uuid(),
	itemId: z.string().uuid(),
	quantityOrdered: optionalPositiveQuantity,
	quantityReceived: z.coerce.number().positive(),
	purchaseOrderLineId: optionalUuid,
});

export async function addGoodsReceiptLineAction(
	_prev: AddGoodsReceiptLineActionState,
	formData: FormData,
): Promise<AddGoodsReceiptLineActionState> {
	return runOperatorPermissionAction({
		path: "addGoodsReceiptLineAction",
		permission: "receiving.manage",
		safeMessage:
			"Could not add goods receipt line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addGoodsReceiptLineFormSchema, {
				receiptId: formData.get("receiptId"),
				itemId: formData.get("itemId"),
				quantityOrdered: formData.get("quantityOrdered") ?? undefined,
				quantityReceived: formData.get("quantityReceived"),
				purchaseOrderLineId: formData.get("purchaseOrderLineId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid receipt, item, and positive received quantity.",
					parsed.details,
				);
			}

			const result = await addGoodsReceiptLine(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					...parsed.data,
				},
				createReceivingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/receiving");
			revalidatePath("/client/receiving");
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
