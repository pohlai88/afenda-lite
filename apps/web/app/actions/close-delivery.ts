"use server";

import { closeDelivery, type Delivery } from "@afenda/fulfillment";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CloseDeliveryActionData = { delivery: Delivery };
export type CloseDeliveryActionState =
	ActionResult<CloseDeliveryActionData> | null;

const closeDeliveryFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function closeDeliveryAction(
	_prev: CloseDeliveryActionState,
	formData: FormData,
): Promise<CloseDeliveryActionState> {
	return runOperatorPermissionAction({
		path: "closeDeliveryAction",
		permission: "fulfillment.delivery.close",
		safeMessage: "Could not close delivery. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(closeDeliveryFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid delivery and expected version.",
					parsed.details,
				);
			}
			const result = await closeDelivery(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `close:${correlationId}`,
					...parsed.data,
				},
				createFulfillmentCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/fulfillment");
			revalidatePath("/client/fulfillment");
			return { ok: true, data: { delivery: mapped.data } };
		},
	});
}
