"use server";

import { type Delivery, getDeliveryById } from "@afenda/fulfillment";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetDeliveryActionData = { delivery: Delivery };

const getDeliverySchema = z.string().uuid();

export async function getDeliveryAction(
	deliveryId: string,
): Promise<ActionResult<GetDeliveryActionData>> {
	return runOperatorPermissionAction({
		path: "getDeliveryAction",
		permission: "fulfillment.read",
		safeMessage: "Could not load delivery. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(getDeliverySchema, deliveryId);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid delivery id.",
					parsed.details,
				);
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
			if (!mapped.ok) return mapped;
			if (mapped.data === null) {
				return actionFail("NOT_FOUND", "Delivery not found");
			}
			return { ok: true, data: { delivery: mapped.data } };
		},
	});
}
