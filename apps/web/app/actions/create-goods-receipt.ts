"use server";

import { createDraftGoodsReceipt, type GoodsReceipt } from "@afenda/receiving";
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

export type CreateGoodsReceiptActionData = { receipt: GoodsReceipt };
export type CreateGoodsReceiptActionState =
	ActionResult<CreateGoodsReceiptActionData> | null;

const optionalUuid = z
	.union([z.string().uuid(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);

const createGoodsReceiptFormSchema = z
	.object({
		code: z.string().trim().min(1).max(64),
		sourceType: z.enum([
			"purchase_order",
			"expected_receipt",
			"return_shipment",
			"unplanned",
		]),
		sourceId: optionalUuid,
		warehouseId: z.string().uuid(),
		notes: z
			.string()
			.trim()
			.max(2000)
			.optional()
			.transform((value) => (value === "" ? undefined : value)),
	})
	.superRefine((value, ctx) => {
		if (value.sourceType === "purchase_order" && value.sourceId === undefined) {
			ctx.addIssue({
				code: "custom",
				message: "Source id is required for purchase order receipts.",
				path: ["sourceId"],
			});
		}
	});

export async function createGoodsReceiptAction(
	_prev: CreateGoodsReceiptActionState,
	formData: FormData,
): Promise<CreateGoodsReceiptActionState> {
	return runOperatorPermissionAction({
		path: "createGoodsReceiptAction",
		permission: "receiving.manage",
		safeMessage:
			"Could not create goods receipt. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createGoodsReceiptFormSchema, {
				code: formData.get("code"),
				sourceType: formData.get("sourceType"),
				sourceId: formData.get("sourceId") ?? undefined,
				warehouseId: formData.get("warehouseId"),
				notes: formData.get("notes") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid receipt code, source, and warehouse.",
					parsed.details,
				);
			}

			const result = await createDraftGoodsReceipt(
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
			return { ok: true, data: { receipt: mapped.data } };
		},
	});
}
