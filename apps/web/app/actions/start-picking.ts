"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type Delivery, startPicking } from "@afenda/fulfillment";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface StartPickingActionData {
	delivery: Delivery;
}
export type StartPickingActionState =
	ActionResult<StartPickingActionData> | null;

const startPickingFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function startPickingAction(
	_prev: StartPickingActionState,
	formData: FormData,
): Promise<StartPickingActionState> {
	return await runOperatorPermissionAction({
		path: "startPickingAction",
		permission: "fulfillment.picking.confirm",
		safeMessage: "Could not start picking. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(startPickingFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid delivery and expected version.",
				});
			}
			const result = await startPicking(
				{
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `pick-start:${correlationId}`,
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
