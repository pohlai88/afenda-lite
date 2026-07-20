"use server";

import { type PurchaseOrder, postPurchaseOrder } from "@afenda/purchasing";
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

export type PostPurchaseOrderActionData = {
	order: PurchaseOrder;
};

export type PostPurchaseOrderActionState =
	ActionResult<PostPurchaseOrderActionData> | null;

const postPurchaseOrderFormSchema = z.object({
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
 * Purchase order post — freeze snapshots + `purchasing.order.post`.
 */
export async function postPurchaseOrderAction(
	_prev: PostPurchaseOrderActionState,
	formData: FormData,
): Promise<PostPurchaseOrderActionState> {
	return runOperatorPermissionAction({
		path: "postPurchaseOrderAction",
		permission: "purchasing.order.post",
		safeMessage:
			"Could not post purchase order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(postPurchaseOrderFormSchema, {
				orderId: formData.get("orderId"),
				expectedVersion: formData.get("expectedVersion"),
				taxTotal: formData.get("taxTotal") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order, expected version, and optional tax total.",
					parsed.details,
				);
			}

			const result = await postPurchaseOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `post:${correlationId}:${parsed.data.orderId}`,
					orderId: parsed.data.orderId,
					expectedVersion: parsed.data.expectedVersion,
					taxTotal: parsed.data.taxTotal,
				},
				createPurchasingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/purchasing");
			revalidatePath("/client/purchasing");
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
