"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { postSalesOrder, type SalesOrder } from "@afenda/sales";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface PostSalesOrderActionData {
	order: SalesOrder;
}

export type PostSalesOrderActionState =
	ActionResult<PostSalesOrderActionData> | null;

const postSalesOrderFormSchema = z.object({
	orderId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	taxTotal: z
		.union([z.coerce.number().nonnegative(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : String(value),
		),
});

/**
 * Sales order post — freeze snapshots + `sales.order.post`.
 */
export async function postSalesOrderAction(
	_prev: PostSalesOrderActionState,
	formData: FormData,
): Promise<PostSalesOrderActionState> {
	return await runOperatorPermissionAction({
		path: "postSalesOrderAction",
		permission: "sales.order.post",
		safeMessage: "Could not post sales order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(postSalesOrderFormSchema, {
				orderId: formData.get("orderId"),
				expectedVersion: formData.get("expectedVersion"),
				taxTotal: formData.get("taxTotal") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid order, expected version, and optional tax total.",
				});
			}

			const result = await postSalesOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `post:${correlationId}:${parsed.data.orderId}`,
					orderId: parsed.data.orderId,
					expectedVersion: parsed.data.expectedVersion,
					taxTotal: parsed.data.taxTotal,
				},
				createSalesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/sales");
			revalidatePath("/client/sales");
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
