"use server";

import {
	DELIVERY_STATUSES,
	type Delivery,
	listDeliveries,
} from "@afenda/fulfillment";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ListDeliveriesActionData = { deliveries: Delivery[] };

const listDeliveriesActionSchema = z
	.object({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z.enum(DELIVERY_STATUSES).optional(),
		warehouseId: z.string().uuid().optional(),
		salesOrderId: z.string().uuid().optional(),
	})
	.optional();

export async function listDeliveriesAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Delivery["status"];
	warehouseId?: string;
	salesOrderId?: string;
}): Promise<ActionResult<ListDeliveriesActionData>> {
	return runOperatorPermissionAction({
		path: "listDeliveriesAction",
		permission: "fulfillment.read",
		safeMessage: "Could not list deliveries. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(listDeliveriesActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid delivery filters.",
					parsed.details,
				);
			}
			const result = await listDeliveries(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					...parsed.data,
				},
				createFulfillmentCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { deliveries: mapped.data } };
		},
	});
}
