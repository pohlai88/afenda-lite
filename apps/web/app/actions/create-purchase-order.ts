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
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase()),
	exchangeRate: z
		.union([z.coerce.number().nonnegative(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : String(value),
		),
});

/**
 * Purchasing draft order create — session org stamp + `purchasing.order.create`.
 */
export async function createPurchaseOrderAction(
	_prev: CreatePurchaseOrderActionState,
	formData: FormData,
): Promise<CreatePurchaseOrderActionState> {
	return runOperatorPermissionAction({
		path: "createPurchaseOrderAction",
		permission: "purchasing.order.create",
		safeMessage:
			"Could not create purchase order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPurchaseOrderFormSchema, {
				code: formData.get("code"),
				partyId: formData.get("partyId"),
				paymentTermId: formData.get("paymentTermId") ?? undefined,
				warehouseId: formData.get("warehouseId") ?? undefined,
				currencyCode: formData.get("currencyCode"),
				exchangeRate: formData.get("exchangeRate") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order code, party, currency, and optional commercial fields.",
					parsed.details,
				);
			}

			const result = await createDraftPurchaseOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `create:${correlationId}`,
					code: parsed.data.code,
					partyId: parsed.data.partyId,
					paymentTermId: parsed.data.paymentTermId,
					warehouseId: parsed.data.warehouseId,
					currencyCode: parsed.data.currencyCode,
					exchangeRate: parsed.data.exchangeRate,
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
