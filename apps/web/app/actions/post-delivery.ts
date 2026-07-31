"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type Delivery, postDelivery } from "@afenda/fulfillment";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface PostDeliveryActionData {
	delivery: Delivery;
}
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
	return await runOperatorPermissionAction({
		path: "postDeliveryAction",
		permission: "fulfillment.delivery.post",
		safeMessage: "Could not post delivery. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(postDeliveryFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid delivery and expected version.",
				});
			}
			const result = await postDelivery(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `post:${correlationId}`,
					...parsed.data,
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
