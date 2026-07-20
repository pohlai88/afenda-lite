"use server";

import { type Delivery, postDelivery } from "@afenda/fulfillment";
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

export type PostDeliveryActionData = { delivery: Delivery };
export type PostDeliveryActionState =
	ActionResult<PostDeliveryActionData> | null;

const postDeliveryFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postDeliveryAction(
	_prev: PostDeliveryActionState,
	formData: FormData,
): Promise<PostDeliveryActionState> {
	return runOperatorPermissionAction({
		path: "postDeliveryAction",
		permission: "fulfillment.manage",
		safeMessage: "Could not post delivery. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(postDeliveryFormSchema, {
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
			const result = await postDelivery(
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
