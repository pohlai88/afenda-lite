"use server";

import { confirmPick, type DeliveryPick } from "@afenda/fulfillment";
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

export type ConfirmPickActionData = { pick: DeliveryPick };
export type ConfirmPickActionState = ActionResult<ConfirmPickActionData> | null;

const confirmPickFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	deliveryLineId: z.string().uuid(),
	quantityPicked: z.coerce.number().positive(),
	reservationId: z
		.union([z.string().uuid(), z.literal(""), z.undefined()])
		.transform((value) => (value === undefined || value === "" ? undefined : value)),
});

export async function confirmPickAction(
	_prev: ConfirmPickActionState,
	formData: FormData,
): Promise<ConfirmPickActionState> {
	return runOperatorPermissionAction({
		path: "confirmPickAction",
		permission: "fulfillment.picking.confirm",
		safeMessage: "Could not confirm pick. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(confirmPickFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
				deliveryLineId: formData.get("deliveryLineId"),
				quantityPicked: formData.get("quantityPicked"),
				reservationId: formData.get("reservationId"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid delivery, line, version, and picked quantity (reservation optional).",
					parsed.details,
				);
			}
			const result = await confirmPick(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `pick:${correlationId}`,
					...parsed.data,
				},
				createFulfillmentCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/fulfillment");
			revalidatePath("/client/fulfillment");
			return { ok: true, data: { pick: mapped.data } };
		},
	});
}
