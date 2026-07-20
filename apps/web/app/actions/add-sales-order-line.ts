"use server";

import { addSalesOrderLine, type SalesOrderLine } from "@afenda/sales";
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
	expectedVersion: z.coerce.number().int().positive(),
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
 * Sales order line add — session org stamp + `sales.order.update` + OCC.
 */
export async function addSalesOrderLineAction(
	_prev: AddSalesOrderLineActionState,
	formData: FormData,
): Promise<AddSalesOrderLineActionState> {
	return runOperatorPermissionAction({
		path: "addSalesOrderLineAction",
		permission: "sales.order.update",
		safeMessage:
			"Could not add sales order line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addSalesOrderLineFormSchema, {
				orderId: formData.get("orderId"),
				expectedVersion: formData.get("expectedVersion"),
				itemId: formData.get("itemId"),
				quantity: formData.get("quantity"),
				unitPrice: formData.get("unitPrice"),
				discountAmount: formData.get("discountAmount") ?? undefined,
				taxClassification: formData.get("taxClassification") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order, expected version, item, quantity, unit price, and optional line commercial fields.",
					parsed.details,
				);
			}

			const result = await addSalesOrderLine(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `line:${correlationId}:${parsed.data.orderId}:${parsed.data.itemId}`,
					orderId: parsed.data.orderId,
					expectedVersion: parsed.data.expectedVersion,
					itemId: parsed.data.itemId,
					quantity: parsed.data.quantity,
					unitPrice: parsed.data.unitPrice,
					discountAmount: parsed.data.discountAmount,
					taxClassification: parsed.data.taxClassification,
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
