"use server";

import { addDeliveryLine, type DeliveryLine } from "@afenda/fulfillment";
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

export type AddDeliveryLineActionData = { line: DeliveryLine };
export type AddDeliveryLineActionState =
	ActionResult<AddDeliveryLineActionData> | null;

const optionalPositiveQuantity = z
	.union([z.coerce.number().positive(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);
const optionalUuid = z
	.union([z.string().uuid(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);
const addDeliveryLineFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	itemId: z.string().uuid(),
	quantityOrdered: optionalPositiveQuantity,
	quantityToDeliver: z.coerce.number().positive(),
	salesOrderLineId: optionalUuid,
});

export async function addDeliveryLineAction(
	_prev: AddDeliveryLineActionState,
	formData: FormData,
): Promise<AddDeliveryLineActionState> {
	return runOperatorPermissionAction({
		path: "addDeliveryLineAction",
		permission: "fulfillment.manage",
		safeMessage: "Could not add delivery line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(addDeliveryLineFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
				itemId: formData.get("itemId"),
				quantityOrdered: formData.get("quantityOrdered") ?? undefined,
				quantityToDeliver: formData.get("quantityToDeliver"),
				salesOrderLineId: formData.get("salesOrderLineId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid delivery, version, item, and positive quantity.",
					parsed.details,
				);
			}
			const result = await addDeliveryLine(
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
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
