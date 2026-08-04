"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { confirmPack, type DeliveryPack } from "@afenda/fulfillment";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ConfirmPackActionData {
	pack: DeliveryPack;
}
export type ConfirmPackActionState = ActionResult<ConfirmPackActionData> | null;

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value === "" ? undefined : value));
const confirmPackFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	packageCode: optionalText(128),
	notes: optionalText(2000),
});

export async function confirmPackAction(
	_prev: ConfirmPackActionState,
	formData: FormData,
): Promise<ConfirmPackActionState> {
	return await runOperatorPermissionAction({
		path: "confirmPackAction",
		permission: "fulfillment.packing.confirm",
		safeMessage: "Could not confirm pack. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(confirmPackFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
				packageCode: formData.get("packageCode") ?? undefined,
				notes: formData.get("notes") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid delivery, version, package code, and notes.",
				});
			}
			const result = await confirmPack(
				{
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `pack:${correlationId}`,
				},
				createFulfillmentCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/fulfillment");
			revalidatePath("/client/fulfillment");
			return { ok: true, data: { pack: mapped.data } };
		},
	});
}
