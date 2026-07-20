"use server";

import { createDraftOrder, type SalesOrder } from "@afenda/sales";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateSalesOrderActionData = {
	order: SalesOrder;
};

export type CreateSalesOrderActionState =
	ActionResult<CreateSalesOrderActionData> | null;

const createSalesOrderFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	partyId: z.string().uuid(),
	paymentTermId: z
		.union([z.string().uuid(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
});

/**
 * Sales draft order create — session org stamp + `sales.manage`.
 */
export async function createSalesOrderAction(
	_prev: CreateSalesOrderActionState,
	formData: FormData,
): Promise<CreateSalesOrderActionState> {
	return runOperatorPermissionAction({
		path: "createSalesOrderAction",
		permission: "sales.manage",
		safeMessage: "Could not create sales order. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createSalesOrderFormSchema, {
				code: formData.get("code"),
				partyId: formData.get("partyId"),
				paymentTermId: formData.get("paymentTermId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid order code, party, and optional payment term.",
					parsed.details,
				);
			}

			const result = await createDraftOrder(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					partyId: parsed.data.partyId,
					paymentTermId: parsed.data.paymentTermId,
				},
				createSalesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/sales");
			revalidatePath("/client/sales");
			return { ok: true, data: { order: mapped.data } };
		},
	});
}
