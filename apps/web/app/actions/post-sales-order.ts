"use server";

import { postOrder, type SalesOrder } from "@afenda/sales";
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

export type PostSalesOrderActionData = {
	order: SalesOrder;
};

export type PostSalesOrderActionState =
	ActionResult<PostSalesOrderActionData> | null;

const postSalesOrderFormSchema = z.object({
	orderId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

/**
 * Sales order post — freeze snapshots + `sales.manage`.
 */
export async function postSalesOrderAction(
	_prev: PostSalesOrderActionState,
	formData: FormData,
): Promise<PostSalesOrderActionState> {
	return runOperatorPermissionAction({
		path: "postSalesOrderAction",
		permission: "sales.manage",
		safeMessage: "Could not post sales order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(postSalesOrderFormSchema, {
				orderId: formData.get("orderId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order and expected version.",
					parsed.details,
				);
			}

			const result = await postOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					orderId: parsed.data.orderId,
					expectedVersion: parsed.data.expectedVersion,
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
