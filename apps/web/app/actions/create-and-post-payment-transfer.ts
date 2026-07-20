"use server";

import { randomUUID } from "node:crypto";
import { createAndPostPaymentTransfer, type Payment } from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateAndPostPaymentTransferActionState = ActionResult<{
	outgoing: Payment;
	incoming: Payment;
}> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	fromPaymentAccountId: z.string().uuid(),
	toPaymentAccountId: z.string().uuid(),
	amount: z.coerce.number().positive(),
	currencyCode: z.string().trim().length(3),
	reference: z.string().trim().max(256).optional(),
});

export async function createAndPostPaymentTransferAction(
	_prev: CreateAndPostPaymentTransferActionState,
	formData: FormData,
): Promise<CreateAndPostPaymentTransferActionState> {
	return runOperatorPermissionAction({
		path: "createAndPostPaymentTransferAction",
		permission: "payments.transfer.create",
		safeMessage:
			"Could not post payment transfer. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const postingDenied = await forbidUnlessPermission(
				session,
				"payments.transfer.post",
			);
			if (postingDenied) return postingDenied;
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				fromPaymentAccountId: formData.get("fromPaymentAccountId"),
				toPaymentAccountId: formData.get("toPaymentAccountId"),
				amount: formData.get("amount"),
				currencyCode: formData.get("currencyCode"),
				reference: formData.get("reference"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid transfer details.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await createAndPostPaymentTransfer(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						idempotencyKey: randomUUID(),
						...parsed.data,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/payments");
			revalidatePath("/client/payments");
			return { ok: true, data: mapped.data };
		},
	});
}
