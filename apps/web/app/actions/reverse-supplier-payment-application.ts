"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	reverseSupplierPaymentApplication,
	type SupplierAllocation,
} from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReverseSupplierPaymentApplicationActionState = ActionResult<{
	allocations: SupplierAllocation[];
}> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
	idempotencyKey: z.string().trim().min(1).max(128),
});

export async function reverseSupplierPaymentApplicationAction(
	_prev: ReverseSupplierPaymentApplicationActionState,
	formData: FormData,
): Promise<ReverseSupplierPaymentApplicationActionState> {
	return await runOperatorPermissionAction({
		path: "reverseSupplierPaymentApplicationAction",
		permission: "payables.manage",
		safeMessage:
			"Could not reverse supplier payment application. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
				idempotencyKey: formData.get("idempotencyKey"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payment and idempotency key.",
				});
			}
			const mapped = mapPackageResult(
				await reverseSupplierPaymentApplication(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePayablesPaths();
			return { ok: true, data: { allocations: mapped.data } };
		},
	});
}
