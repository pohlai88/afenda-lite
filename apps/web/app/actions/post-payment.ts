"use server";

import { type Payment, postPayment } from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type PostPaymentActionState = ActionResult<{ payment: Payment }> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postPaymentAction(
	_prev: PostPaymentActionState,
	formData: FormData,
): Promise<PostPaymentActionState> {
	return runOperatorPermissionAction({
		path: "postPaymentAction",
		permission: "payments.manage",
		safeMessage: "Could not post payment. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid payment and expected version.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await postPayment(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
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
