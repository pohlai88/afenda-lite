"use server";

import { addOrderLine, type SalesOrderLine } from "@afenda/sales";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddSalesOrderLineActionData = {
	line: SalesOrderLine;
};

export type AddSalesOrderLineActionState =
	ActionResult<AddSalesOrderLineActionData> | null;

const addSalesOrderLineFormSchema = z.object({
	orderId: z.string().uuid(),
	itemId: z.string().uuid(),
	quantity: z.coerce.number().positive(),
});

/**
 * Sales order line add — session org stamp + `sales.manage`.
 */
export async function addSalesOrderLineAction(
	_prev: AddSalesOrderLineActionState,
	formData: FormData,
): Promise<AddSalesOrderLineActionState> {
	return runOperatorPermissionAction({
		path: "addSalesOrderLineAction",
		permission: "sales.manage",
		safeMessage:
			"Could not add sales order line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addSalesOrderLineFormSchema, {
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

			const result = await addOrderLine(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					orderId: parsed.data.orderId,
					itemId: parsed.data.itemId,
					quantity: parsed.data.quantity,
				},
				createSalesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/sales");
			revalidatePath("/client/sales");
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
