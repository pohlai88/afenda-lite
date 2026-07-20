"use server";

import {
	allocateCustomerReceipt,
	type CustomerAllocation,
} from "@afenda/receivables";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AllocateCustomerReceiptActionData = {
	allocation: CustomerAllocation;
};
export type AllocateCustomerReceiptActionState =
	ActionResult<AllocateCustomerReceiptActionData> | null;

const optionalUuid = z
	.union([z.string().uuid(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);
const schema = z.object({
	invoiceId: z.string().uuid(),
	amount: z.coerce.number().positive(),
	paymentId: optionalUuid,
});

export async function allocateCustomerReceiptAction(
	_prev: AllocateCustomerReceiptActionState,
	formData: FormData,
): Promise<AllocateCustomerReceiptActionState> {
	return runOperatorPermissionAction({
		path: "allocateCustomerReceiptAction",
		permission: "receivables.manage",
		safeMessage:
			"Could not allocate customer receipt. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				amount: formData.get("amount"),
				paymentId: formData.get("paymentId") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, amount, and payment reference.",
					parsed.details,
				);
			}
			const result = await allocateCustomerReceipt(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					...parsed.data,
				},
				createReceivablesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/receivables");
			revalidatePath("/client/receivables");
			return { ok: true, data: { allocation: mapped.data } };
		},
	});
}
