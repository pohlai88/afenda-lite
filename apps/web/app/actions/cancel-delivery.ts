"use server";

import { cancelDelivery, type Delivery } from "@afenda/fulfillment";
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

export type CancelDeliveryActionData = { delivery: Delivery };
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
	return runOperatorPermissionAction({
		path: "cancelDeliveryAction",
		permission: "fulfillment.manage",
		safeMessage: "Could not cancel delivery. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelDeliveryFormSchema, {
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
			const result = await cancelDelivery(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
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
