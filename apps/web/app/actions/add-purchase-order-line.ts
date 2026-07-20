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
});

/**
 * Purchase order line add — session org stamp + `purchasing.manage`.
 */
export async function addPurchaseOrderLineAction(
	_prev: AddPurchaseOrderLineActionState,
	formData: FormData,
): Promise<AddPurchaseOrderLineActionState> {
	return runOperatorPermissionAction({
		path: "addPurchaseOrderLineAction",
		permission: "purchasing.manage",
		safeMessage:
			"Could not add purchase order line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addPurchaseOrderLineFormSchema, {
				orderId: formData.get("orderId"),
				itemId: formData.get("itemId"),
				quantity: formData.get("quantity"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order, item, and positive quantity.",
					parsed.details,
				);
			}

			const result = await addPurchaseOrderLine(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					orderId: parsed.data.orderId,
					itemId: parsed.data.itemId,
					quantity: parsed.data.quantity,
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
