"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	type CustomerAllocation,
	reverseCustomerReceiptApplication,
} from "@afenda/receivables";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReverseCustomerReceiptApplicationActionState = ActionResult<{
	allocation: CustomerAllocation;
}> | null;

const schema = z.object({
	allocationId: z.string().uuid(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

export async function reverseCustomerReceiptApplicationAction(
	_prev: ReverseCustomerReceiptApplicationActionState,
	formData: FormData,
): Promise<ReverseCustomerReceiptApplicationActionState> {
	return await runOperatorPermissionAction({
		path: "reverseCustomerReceiptApplicationAction",
		permission: "receivables.receipt_application.reverse",
		safeMessage:
			"Could not reverse customer receipt application. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				allocationId: formData.get("allocationId"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid receipt application and idempotency key.",
				});
			}
			const mapped = mapPackageResult(
				await reverseCustomerReceiptApplication(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
					},
					createReceivablesCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/receivables");
			revalidatePath("/client/receivables");
			return { ok: true, data: { allocation: mapped.data } };
		},
	});
}
