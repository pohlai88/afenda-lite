"use server";

import {
	addPurchaseOrderLine,
	type PurchaseOrderLine,
} from "@afenda/purchasing";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddPurchaseOrderLineActionData = {
	line: PurchaseOrderLine;
};

export type AddPurchaseOrderLineActionState =
	ActionResult<AddPurchaseOrderLineActionData> | null;

const addPurchaseOrderLineFormSchema = z.object({
	orderId: z.string().uuid(),
	itemId: z.string().uuid(),
	quantity: z.coerce.number().positive(),
	unitPrice: z.coerce.number().nonnegative(),
	discountAmount: z
		.union([z.coerce.number().nonnegative(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
	taxClassification: z
		.union([z.string().trim().min(1).max(64), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
});

/**
 * Purchase order line add — session org stamp + `purchasing.order.update`.
 */
export async function addPurchaseOrderLineAction(
	_prev: AddPurchaseOrderLineActionState,
	formData: FormData,
): Promise<AddPurchaseOrderLineActionState> {
	return runOperatorPermissionAction({
		path: "addPurchaseOrderLineAction",
		permission: "purchasing.order.update",
		safeMessage:
			"Could not add purchase order line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addPurchaseOrderLineFormSchema, {
				orderId: formData.get("orderId"),
				itemId: formData.get("itemId"),
				quantity: formData.get("quantity"),
				unitPrice: formData.get("unitPrice"),
				discountAmount: formData.get("discountAmount") ?? undefined,
				taxClassification: formData.get("taxClassification") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order, item, quantity, unit price, and optional line commercial fields.",
					parsed.details,
				);
			}

			const result = await addPurchaseOrderLine(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `line:${correlationId}:${parsed.data.orderId}:${parsed.data.itemId}`,
					orderId: parsed.data.orderId,
					itemId: parsed.data.itemId,
					quantity: parsed.data.quantity,
					unitPrice: parsed.data.unitPrice,
					discountAmount: parsed.data.discountAmount,
					taxClassification: parsed.data.taxClassification,
				},
				createPurchasingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/purchasing");
			revalidatePath("/client/purchasing");
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
