"use server";

import { createDraftDelivery, type Delivery } from "@afenda/fulfillment";
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

export type CreateDraftDeliveryActionData = { delivery: Delivery };
export type CreateDraftDeliveryActionState =
	ActionResult<CreateDraftDeliveryActionData> | null;

const optionalUuid = z
	.union([z.string().uuid(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);
const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value === "" ? undefined : value));

const createDraftDeliveryFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	salesOrderId: optionalUuid,
	warehouseId: z.string().uuid(),
	shipToPartyId: optionalUuid,
	shipToPartyCode: optionalText(64),
	shipToPartyName: optionalText(300),
});

export async function createDraftDeliveryAction(
	_prev: CreateDraftDeliveryActionState,
	formData: FormData,
): Promise<CreateDraftDeliveryActionState> {
	return runOperatorPermissionAction({
		path: "createDraftDeliveryAction",
		permission: "fulfillment.manage",
		safeMessage: "Could not create delivery. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createDraftDeliveryFormSchema, {
				code: formData.get("code"),
				salesOrderId: formData.get("salesOrderId") ?? undefined,
				warehouseId: formData.get("warehouseId"),
				shipToPartyId: formData.get("shipToPartyId") ?? undefined,
				shipToPartyCode: formData.get("shipToPartyCode") ?? undefined,
				shipToPartyName: formData.get("shipToPartyName") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid delivery code, warehouse, and shipping party.",
					parsed.details,
				);
			}
			const result = await createDraftDelivery(
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
