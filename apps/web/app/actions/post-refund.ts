"use server";

import { randomUUID } from "node:crypto";
import { type Payment, postRefund } from "@afenda/payments";
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

export type PostRefundActionState = ActionResult<{ payment: Payment }> | null;

const optionalReference = z.preprocess(
	(value) => (value === "" ? undefined : value),
	z.string().trim().min(1).max(256).optional(),
);
const schema = z.object({
	code: z.string().trim().min(1).max(64),
	originalPaymentId: z.string().uuid(),
	paymentAccountId: z.string().uuid(),
	refundSource: z.enum(["customer_payment", "customer_credit", "manual"]),
	amount: z.coerce.number().positive(),
	reference: optionalReference,
});

export async function postRefundAction(
	_prev: PostRefundActionState,
	formData: FormData,
): Promise<PostRefundActionState> {
	return runOperatorPermissionAction({
		path: "postRefundAction",
		permission: "payments.refund.create",
		safeMessage: "Could not post refund. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const postingDenied = await forbidUnlessPermission(session, "payments.refund.post");
			if (postingDenied) return postingDenied;
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				originalPaymentId: formData.get("originalPaymentId"),
				paymentAccountId: formData.get("paymentAccountId"),
				refundSource: formData.get("refundSource"),
				amount: formData.get("amount"),
				reference: formData.get("reference"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid refund code, original payment, and amount.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await postRefund(
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
			return { ok: true, data: { payment: mapped.data } };
		},
	});
}
