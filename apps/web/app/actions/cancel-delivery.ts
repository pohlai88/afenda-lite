"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { cancelDelivery, type Delivery } from "@afenda/fulfillment";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface CancelDeliveryActionData {
	delivery: Delivery;
}
export type CancelDeliveryActionState =
	ActionResult<CancelDeliveryActionData> | null;

const cancelDeliveryFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function cancelDeliveryAction(
	_prev: CancelDeliveryActionState,
	formData: FormData,
): Promise<CancelDeliveryActionState> {
	return await runOperatorPermissionAction({
		path: "cancelDeliveryAction",
		permission: "fulfillment.delivery.cancel",
		safeMessage: "Could not cancel delivery. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelDeliveryFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid delivery and expected version.",
				});
			}
			const result = await cancelDelivery(
				{
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `cancel:${correlationId}`,
				},
				createFulfillmentCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/fulfillment");
			revalidatePath("/client/fulfillment");
			return { ok: true, data: { delivery: mapped.data } };
		},
	});
}
