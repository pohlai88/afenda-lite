"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type Delivery, getDeliveryById } from "@afenda/fulfillment";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface GetDeliveryActionData {
	delivery: Delivery;
}

const getDeliverySchema = z.string().uuid();

export async function getDeliveryAction(
	deliveryId: string,
): Promise<ActionResult<GetDeliveryActionData>> {
	return await runOperatorPermissionAction({
		path: "getDeliveryAction",
		permission: "fulfillment.delivery.read",
		safeMessage: "Could not load delivery. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(getDeliverySchema, deliveryId);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid delivery id.",
				});
			}
			const result = await getDeliveryById(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					id: parsed.data,
				},
				createFulfillmentCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			if (mapped.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Delivery not found",
				});
			}
			return { ok: true, data: { delivery: mapped.data } };
		},
	});
}
