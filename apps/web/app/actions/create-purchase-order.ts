"use server";

import {
	createDraftPurchaseOrder,
	type PurchaseOrder,
} from "@afenda/purchasing";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreatePurchaseOrderActionData = {
	order: PurchaseOrder;
};

export type CreatePurchaseOrderActionState =
	ActionResult<CreatePurchaseOrderActionData> | null;

const createPurchaseOrderFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	partyId: z.string().uuid(),
	paymentTermId: z
		.union([z.string().uuid(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
	warehouseId: z
		.union([z.string().uuid(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
});

/**
 * Purchasing draft order create — session org stamp + `purchasing.manage`.
 */
export async function createPurchaseOrderAction(
	_prev: CreatePurchaseOrderActionState,
	formData: FormData,
): Promise<CreatePurchaseOrderActionState> {
	return runOperatorPermissionAction({
		path: "createPurchaseOrderAction",
		permission: "purchasing.manage",
		safeMessage:
			"Could not create purchase order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPurchaseOrderFormSchema, {
				code: formData.get("code"),
				partyId: formData.get("partyId"),
				paymentTermId: formData.get("paymentTermId") ?? undefined,
				warehouseId: formData.get("warehouseId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order code, party, and optional payment term or warehouse.",
					parsed.details,
				);
			}

			const result = await createDraftPurchaseOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					partyId: parsed.data.partyId,
					paymentTermId: parsed.data.paymentTermId,
					warehouseId: parsed.data.warehouseId,
				},
				createPurchasingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/purchasing");
			revalidatePath("/client/purchasing");
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
